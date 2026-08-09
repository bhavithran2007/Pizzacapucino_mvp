const {
  NotificationChannel,
  NotificationType,
  Occasion,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  ReservationStatus,
  ReservationType
} = require('@prisma/client');
const prisma = require('../config/prisma');
const AppError = require('../utils/app-error');
const { sendEmail } = require('./email.service');
const { createAdminNotifications } = require('./notification.service');
const { getSettingsBundle, getSettingValue: getStoredSettingValue } = require('./setting.service');
const { buildDateOnly, buildDateTime, formatDate, minutesToTime, parseTimeToMinutes } = require('../utils/time');

const DEFAULT_BOOKING_POLICY = {
  minimumGuests: 1,
  maximumGuests: 20,
  defaultReservationDurationMinutes: 120,
  cancellationHours: 4,
  advancePaymentPercentage: 50
};

const ACTIVE_RESERVATION_FILTER = {
  notIn: [ReservationStatus.REJECTED, ReservationStatus.CANCELLED]
};

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function phoneMatches(input, stored) {
  const a = normalizePhone(input);
  const b = normalizePhone(stored);

  if (!a || !b) {
    return false;
  }

  return a === b || a.endsWith(b) || b.endsWith(a);
}

function toNumber(value) {
  return Number(value || 0);
}

async function getSettingValue(key) {
  return getSettingValueFromStore(key);
}

async function getSettingValueFromStore(key) {
  return getStoredSettingValue(key);
}

async function getBookingPolicy() {
  const value = await getSettingValue('booking.policy');

  return {
    ...DEFAULT_BOOKING_POLICY,
    ...(value || {})
  };
}

async function getManualPaymentConfig() {
  const value = await getSettingValueFromStore('payments.manual_upi');
  const settings = await getSettingsBundle();

  return {
    provider: 'MANUAL_UPI_QR',
    qrImageUrl: settings.manualPayment?.qrImageUrl || '',
    whatsappNumber: settings.manualPayment?.whatsappNumber || '+918680986888',
    screenshotStoredOnServer: false,
    instructions:
      'Pay the advance amount using the QR code, then send the payment screenshot to our WhatsApp number.',
    ...(value || {})
  };
}

function validateBookingWindow({ date, arrivalTime, endTime, branch, bookingPolicy }) {
  const arrivalMinutes = parseTimeToMinutes(arrivalTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (arrivalMinutes === null || endMinutes === null) {
    throw new AppError(400, 'Please choose valid arrival and end times.');
  }

  if (endMinutes <= arrivalMinutes) {
    throw new AppError(400, 'End time must be later than arrival time.');
  }

  const openingMinutes = parseTimeToMinutes(branch.opensAt || '10:00');
  const closingMinutes = parseTimeToMinutes(branch.closesAt || '23:00');

  if (openingMinutes !== null && arrivalMinutes < openingMinutes) {
    throw new AppError(400, `Bookings for ${branch.name} start from ${branch.opensAt}.`);
  }

  if (closingMinutes !== null && endMinutes > closingMinutes) {
    throw new AppError(400, `Bookings for ${branch.name} must end by ${branch.closesAt}.`);
  }

  const arrivalAt = buildDateTime(date, arrivalTime);
  const endAt = buildDateTime(date, endTime);

  if (Number.isNaN(arrivalAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new AppError(400, 'Please choose a valid reservation date and time.');
  }

  if (arrivalAt <= new Date()) {
    throw new AppError(400, 'Please choose a future arrival time.');
  }

  const durationMinutes = endMinutes - arrivalMinutes;

  if (durationMinutes > 8 * 60) {
    throw new AppError(400, 'Reservations longer than 8 hours are not allowed in this MVP.');
  }

  if (durationMinutes < 30) {
    throw new AppError(400, 'Reservations must be at least 30 minutes long.');
  }

  return {
    arrivalAt,
    endAt,
    arrivalMinutes,
    endMinutes,
    durationMinutes,
    bookingPolicy
  };
}

function computeReservedSeatsForWindow(reservations, candidateStart, candidateEnd) {
  return reservations
    .filter((reservation) => reservation.startAt < candidateEnd && reservation.endAt > candidateStart)
    .reduce((total, reservation) => total + reservation.guestCount, 0);
}

function buildSuggestions({
  branch,
  serviceDate,
  reservations,
  requestedGuestCount,
  requestedStartMinutes,
  durationMinutes
}) {
  const suggestions = [];
  const openingMinutes = parseTimeToMinutes(branch.opensAt || '10:00') || 10 * 60;
  const closingMinutes = parseTimeToMinutes(branch.closesAt || '23:00') || 23 * 60;

  for (
    let candidateStartMinutes = Math.max(openingMinutes, requestedStartMinutes + 30);
    candidateStartMinutes + durationMinutes <= closingMinutes && suggestions.length < 3;
    candidateStartMinutes += 30
  ) {
    const candidateEndMinutes = candidateStartMinutes + durationMinutes;
    const candidateStart = buildDateTime(serviceDate, minutesToTime(candidateStartMinutes));
    const candidateEnd = buildDateTime(serviceDate, minutesToTime(candidateEndMinutes));
    const reservedSeats = computeReservedSeatsForWindow(reservations, candidateStart, candidateEnd);
    const remainingSeats = Math.max(branch.totalSeats - reservedSeats, 0);

    if (remainingSeats >= requestedGuestCount) {
      suggestions.push({
        arrivalTime: minutesToTime(candidateStartMinutes),
        endTime: minutesToTime(candidateEndMinutes),
        remainingSeats
      });
    }
  }

  return suggestions;
}

async function buildAvailabilityContext(client, payload) {
  const [branch, bookingPolicy] = await Promise.all([
    client.branch.findFirst({
      where: {
        id: payload.branchId,
        isActive: true
      }
    }),
    getBookingPolicy()
  ]);

  if (!branch) {
    throw new AppError(404, 'Selected branch could not be found.');
  }

  if (payload.guestCount < bookingPolicy.minimumGuests || payload.guestCount > bookingPolicy.maximumGuests) {
    throw new AppError(
      400,
      `Guest count must be between ${bookingPolicy.minimumGuests} and ${bookingPolicy.maximumGuests}.`
    );
  }

  const validatedWindow = validateBookingWindow({
    date: payload.date,
    arrivalTime: payload.arrivalTime,
    endTime: payload.endTime,
    branch,
    bookingPolicy
  });

  const serviceDate = buildDateOnly(payload.date);
  const reservations = await client.reservation.findMany({
    where: {
      branchId: branch.id,
      serviceDate,
      status: ACTIVE_RESERVATION_FILTER,
      startAt: {
        lt: validatedWindow.endAt
      },
      endAt: {
        gt: validatedWindow.arrivalAt
      }
    },
    select: {
      id: true,
      bookingCode: true,
      guestCount: true,
      startAt: true,
      endAt: true,
      status: true
    }
  });

  const reservedSeats = computeReservedSeatsForWindow(
    reservations,
    validatedWindow.arrivalAt,
    validatedWindow.endAt
  );
  const remainingSeats = Math.max(branch.totalSeats - reservedSeats, 0);
  const available = remainingSeats >= payload.guestCount;

  return {
    available,
    branch,
    bookingPolicy,
    reservations,
    remainingSeats,
    reservedSeats,
    serviceDate,
    suggestions: available
      ? []
      : buildSuggestions({
          branch,
          serviceDate: payload.date,
          reservations,
          requestedGuestCount: payload.guestCount,
          requestedStartMinutes: validatedWindow.arrivalMinutes,
          durationMinutes: validatedWindow.durationMinutes
        }),
    ...validatedWindow
  };
}

function serializeMenuItem(menuItem) {
  return {
    id: menuItem.id,
    code: menuItem.code,
    name: menuItem.name,
    slug: menuItem.slug,
    description: menuItem.description,
    category: menuItem.category,
    price: toNumber(menuItem.price),
    imageUrl: menuItem.imageUrl,
    dietaryType: menuItem.dietaryType,
    isFeatured: menuItem.isFeatured,
    isAvailable: menuItem.isAvailable
  };
}

function serializeReservation(reservation, manualPaymentConfig) {
  return {
    id: reservation.id,
    bookingCode: reservation.bookingCode,
    bookingStatus: reservation.status,
    paymentStatus: reservation.paymentStatus,
    reservationType: reservation.reservationType,
    customer: {
      fullName: reservation.customer.fullName,
      mobileNumber: reservation.customer.mobileNumber,
      altMobileNumber: reservation.customer.altMobileNumber,
      email: reservation.customer.email
    },
    branch: {
      id: reservation.branch.id,
      code: reservation.branch.code,
      name: reservation.branch.name,
      phone: reservation.branch.phone,
      addressLine1: reservation.branch.addressLine1,
      addressLine2: reservation.branch.addressLine2,
      city: reservation.branch.city,
      state: reservation.branch.state
    },
    reservationDate: formatDate(reservation.serviceDate),
    arrivalTime: reservation.startAt.toTimeString().slice(0, 5),
    endTime: reservation.endAt.toTimeString().slice(0, 5),
    guestCount: reservation.guestCount,
    occasion: reservation.occasion,
    specialRequests: reservation.specialRequests,
    subtotal: toNumber(reservation.subtotal),
    advanceDue: toNumber(reservation.advanceDue),
    advancePaid: toNumber(reservation.advancePaid),
    balanceDue: toNumber(reservation.balanceDue),
    createdAt: reservation.createdAt,
    items: reservation.items.map((item) => ({
      id: item.id,
      itemName: item.itemNameSnapshot,
      quantity: item.quantity,
      itemPrice: toNumber(item.itemPriceSnapshot),
      subtotal: toNumber(item.subtotal)
    })),
    paymentInstructions:
      reservation.reservationType === ReservationType.TABLE_WITH_PREORDER
        ? {
            provider: manualPaymentConfig.provider,
            whatsappNumber: manualPaymentConfig.whatsappNumber,
            qrImageUrl: manualPaymentConfig.qrImageUrl,
            screenshotStoredOnServer: false,
            instructions: manualPaymentConfig.instructions
          }
        : null
  };
}

async function getPublicBootstrapData() {
  const [branches, publicSettings, bookingPolicy, manualPaymentConfig] = await Promise.all([
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        totalTables: true,
        totalSeats: true,
        opensAt: true,
        closesAt: true
      }
    }),
    prisma.setting.findMany({
      where: { isPublic: true },
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
      select: {
        group: true,
        key: true,
        value: true
      }
    }),
    getBookingPolicy(),
    getManualPaymentConfig()
  ]);
  const settings = await getSettingsBundle();

  return {
    restaurantName: settings.restaurant?.name || 'Pizza Capucino',
    manualPayment: {
      provider: manualPaymentConfig.provider,
      qrImageUrl: manualPaymentConfig.qrImageUrl,
      whatsappNumber: manualPaymentConfig.whatsappNumber,
      screenshotStoredOnServer: false,
      instructions: manualPaymentConfig.instructions
    },
    bookingPolicy,
    branches,
    settings: publicSettings
  };
}

async function listAvailableMenuItems() {
  const menuItems = await prisma.menuItem.findMany({
    where: {
      isAvailable: true
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }]
  });

  return menuItems.map(serializeMenuItem);
}

async function getAvailability(payload) {
  const context = await buildAvailabilityContext(prisma, payload);

  return {
    available: context.available,
    branch: {
      id: context.branch.id,
      name: context.branch.name,
      totalSeats: context.branch.totalSeats,
      totalTables: context.branch.totalTables,
      opensAt: context.branch.opensAt,
      closesAt: context.branch.closesAt
    },
    requestedGuests: payload.guestCount,
    reservedSeats: context.reservedSeats,
    remainingSeats: context.remainingSeats,
    suggestions: context.suggestions,
    message: context.available
      ? 'Tables are available for the selected slot.'
      : 'No tables are available for the selected date and time.'
  };
}

async function generateNextBookingCode(client) {
  const latestReservation = await client.reservation.findFirst({
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      bookingCode: true
    }
  });

  const currentNumber = latestReservation?.bookingCode
    ? Number.parseInt(latestReservation.bookingCode.replace('BK-', ''), 10)
    : 0;

  return `BK-${String(Number.isNaN(currentNumber) ? 1 : currentNumber + 1).padStart(6, '0')}`;
}

async function createReservation(payload) {
  const manualPaymentConfig = await getManualPaymentConfig();
  const settings = await getSettingsBundle();

  const reservation = await prisma.$transaction(async (tx) => {
    const availability = await buildAvailabilityContext(tx, payload);

    if (!availability.available) {
      throw new AppError(409, 'No tables are available for the selected date and time.', {
        suggestions: availability.suggestions,
        remainingSeats: availability.remainingSeats
      });
    }

    const shouldPreorder = payload.reservationType === ReservationType.TABLE_WITH_PREORDER;
    const rawItems = shouldPreorder ? payload.items || [] : [];

    if (shouldPreorder && rawItems.length === 0) {
      throw new AppError(400, 'Please choose at least one dish for pre-order bookings.');
    }

    const requestedItemIds = [...new Set(rawItems.map((item) => item.menuItemId))];
    const menuItems = requestedItemIds.length
      ? await tx.menuItem.findMany({
          where: {
            id: {
              in: requestedItemIds
            },
            isAvailable: true
          }
        })
      : [];

    const menuById = new Map(menuItems.map((item) => [item.id, item]));

    if (requestedItemIds.length !== menuItems.length) {
      throw new AppError(400, 'One or more selected menu items are unavailable.');
    }

    const reservationItems = rawItems.map((item) => {
      const menuItem = menuById.get(item.menuItemId);
      const price = toNumber(menuItem.price);
      const subtotal = price * item.quantity;

      return {
        menuItemId: menuItem.id,
        itemNameSnapshot: menuItem.name,
        itemPriceSnapshot: price,
        quantity: item.quantity,
        subtotal
      };
    });

    const subtotal = reservationItems.reduce((total, item) => total + item.subtotal, 0);
    const advancePercentage = 0;
    const advanceDue = 0;
    const balanceDue = subtotal;

    const existingCustomer = await tx.customer.findFirst({
      where: {
        mobileNumber: payload.mobileNumber
      }
    });

    const customer = existingCustomer
      ? await tx.customer.update({
          where: { id: existingCustomer.id },
          data: {
            fullName: payload.fullName,
            altMobileNumber: payload.altMobileNumber || null,
            email: payload.email || null
          }
        })
      : await tx.customer.create({
          data: {
            fullName: payload.fullName,
            mobileNumber: payload.mobileNumber,
            altMobileNumber: payload.altMobileNumber || null,
            email: payload.email || null
          }
        });

    const bookingCode = await generateNextBookingCode(tx);
    const paymentStatus = PaymentStatus.NOT_REQUIRED;
    const paymentMethod = PaymentMethod.NONE;
    const manualPaymentNote = shouldPreorder ? 'Pay for pre-ordered items at the restaurant.' : null;

    const reservation = await tx.reservation.create({
      data: {
        bookingCode,
        customerId: customer.id,
        branchId: availability.branch.id,
        serviceDate: availability.serviceDate,
        startAt: availability.arrivalAt,
        endAt: availability.endAt,
        guestCount: payload.guestCount,
        reservationType: payload.reservationType,
        status: ReservationStatus.PENDING,
        paymentStatus,
        paymentMethod,
        occasion: payload.occasion || Occasion.NONE,
        specialRequests: payload.specialRequests || null,
        policyAccepted: true,
        subtotal,
        advanceDue,
        advancePaid: 0,
        balanceDue,
        manualPaymentNote,
        source: 'WEBSITE',
        items: reservationItems.length
          ? {
              create: reservationItems
            }
          : undefined,
        payments: false
          ? {
              create: [
                {
                  provider: PaymentProvider.MANUAL_UPI_QR,
                  method: PaymentMethod.MANUAL_UPI_QR,
                  status: PaymentStatus.AWAITING_CONFIRMATION,
                  amount: advanceDue,
                  advancePercentage,
                  currency: 'INR',
                  instructions: manualPaymentConfig.instructions,
                  proofRequested: true,
                  proofStored: false
                }
              ]
            }
          : undefined,
        analyticsEvents: {
          create: [
            {
              eventType: 'reservation.created',
              branchId: availability.branch.id,
              payload: {
                reservationType: payload.reservationType,
                guestCount: payload.guestCount,
                bookingCode
              }
            }
          ]
        }
      },
      include: {
        customer: true,
        branch: true,
        items: true,
        payments: true
      }
    });

    return reservation;
  });

  await createAdminNotifications({
    title: 'New reservation received',
    message: `${payload.fullName} created reservation ${reservation.bookingCode} for ${payload.guestCount} guests at ${reservation.branch.name}.`,
    type: NotificationType.NEW_BOOKING,
    reservationId: reservation.id,
    channel: NotificationChannel.DASHBOARD,
    metadata: {
      bookingCode: reservation.bookingCode,
      reservationType: reservation.reservationType,
      paymentStatus: reservation.paymentStatus
    }
  });

  if (settings.notifications?.sendBookingConfirmationEmail !== false && reservation.customer.email) {
    await sendEmail({
      to: reservation.customer.email,
      subject: `Booking received: ${reservation.bookingCode}`,
      title: 'Reservation received successfully',
      bodyLines: [
        `Booking ID: ${reservation.bookingCode}`,
        `Branch: ${reservation.branch.name}`,
        `Date: ${formatDate(reservation.serviceDate)}`,
        `Time: ${reservation.startAt.toTimeString().slice(0, 5)}-${reservation.endAt.toTimeString().slice(0, 5)}`,
        `Guests: ${reservation.guestCount}`,
        `Payment status: ${reservation.paymentStatus}`
      ]
    }).catch(() => null);
  }

  return serializeReservation(reservation, manualPaymentConfig);
}

async function lookupReservation(bookingCode, phoneNumber) {
  const reservation = await prisma.reservation.findUnique({
    where: {
      bookingCode
    },
    include: {
      customer: true,
      branch: true,
      items: true,
      payments: true
    }
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found.');
  }

  const matchesPrimary = phoneMatches(phoneNumber, reservation.customer.mobileNumber);
  const matchesAlternate = phoneMatches(phoneNumber, reservation.customer.altMobileNumber);

  if (!matchesPrimary && !matchesAlternate) {
    throw new AppError(403, 'The phone number does not match this booking.');
  }

  const manualPaymentConfig = await getManualPaymentConfig();

  return serializeReservation(reservation, manualPaymentConfig);
}

module.exports = {
  createReservation,
  getAvailability,
  getBookingPolicy,
  getPublicBootstrapData,
  listAvailableMenuItems,
  lookupReservation
};
