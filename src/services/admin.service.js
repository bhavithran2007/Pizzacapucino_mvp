const {
  NotificationType,
  PaymentStatus,
  ReservationStatus
} = require('@prisma/client');
const prisma = require('../config/prisma');
const AppError = require('../utils/app-error');
const slugify = require('../utils/slugify');
const { sendEmail } = require('./email.service');
const {
  getSettingsBundle,
  updateSettingsBundle
} = require('./setting.service');
const {
  createAdminNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} = require('./notification.service');

const COUNTABLE_RESERVATION_STATUSES = {
  notIn: [ReservationStatus.REJECTED]
};

const ACTIVE_RESERVATION_STATUSES = {
  notIn: [ReservationStatus.REJECTED, ReservationStatus.CANCELLED]
};

function buildTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return new Date(`${year}-${month}-${day}T00:00:00`);
}

function toNumber(value) {
  return Number(value || 0);
}

function formatDateTime(value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(value));
}

function timeOnly(value) {
  return value ? new Date(value).toTimeString().slice(0, 5) : null;
}

function startOfDayFromString(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function startOfWeek(date) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfWeek(date) {
  return endOfDay(addDays(startOfWeek(date), 6));
}

function startOfMonth(date) {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfMonth(date) {
  const value = new Date(date);
  value.setMonth(value.getMonth() + 1, 0);
  return endOfDay(value);
}

function groupBy(items, keyGetter) {
  return items.reduce((map, item) => {
    const key = keyGetter(item);

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(item);
    return map;
  }, new Map());
}

function serializeReservationListItem(reservation) {
  return {
    id: reservation.id,
    bookingCode: reservation.bookingCode,
    customerName: reservation.customer.fullName,
    phone: reservation.customer.mobileNumber,
    email: reservation.customer.email,
    guests: reservation.guestCount,
    branchName: reservation.branch.name,
    branchId: reservation.branch.id,
    reservationDate: formatDate(reservation.serviceDate),
    arrivalTime: timeOnly(reservation.startAt),
    endTime: timeOnly(reservation.endAt),
    reservationType: reservation.reservationType,
    paymentStatus: reservation.paymentStatus,
    bookingStatus: reservation.status,
    createdAt: formatDateTime(reservation.createdAt),
    subtotal: toNumber(reservation.subtotal),
    advanceDue: toNumber(reservation.advanceDue),
    advancePaid: toNumber(reservation.advancePaid),
    itemCount: reservation.items.length
  };
}

function serializeReservationDetails(reservation) {
  return {
    ...serializeReservationListItem(reservation),
    altPhone: reservation.customer.altMobileNumber,
    occasion: reservation.occasion,
    specialRequests: reservation.specialRequests,
    manualPaymentNote: reservation.manualPaymentNote,
    approvedAt: formatDateTime(reservation.approvedAt),
    rejectedAt: formatDateTime(reservation.rejectedAt),
    cancelledAt: formatDateTime(reservation.cancelledAt),
    completedAt: formatDateTime(reservation.completedAt),
    branch: {
      id: reservation.branch.id,
      name: reservation.branch.name,
      phone: reservation.branch.phone,
      addressLine1: reservation.branch.addressLine1,
      addressLine2: reservation.branch.addressLine2,
      city: reservation.branch.city,
      state: reservation.branch.state,
      totalTables: reservation.branch.totalTables,
      totalSeats: reservation.branch.totalSeats,
      opensAt: reservation.branch.opensAt,
      closesAt: reservation.branch.closesAt
    },
    items: reservation.items.map((item) => ({
      id: item.id,
      itemName: item.itemNameSnapshot,
      quantity: item.quantity,
      itemPrice: toNumber(item.itemPriceSnapshot),
      subtotal: toNumber(item.subtotal)
    })),
    payments: reservation.payments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      method: payment.method,
      status: payment.status,
      amount: toNumber(payment.amount),
      advancePercentage: payment.advancePercentage,
      paidAt: formatDateTime(payment.paidAt),
      verifiedAt: formatDateTime(payment.verifiedAt),
      instructions: payment.instructions,
      transactionRef: payment.transactionRef
    }))
  };
}

function serializeMenuItem(item) {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    slug: item.slug,
    description: item.description,
    category: item.category,
    price: toNumber(item.price),
    imageUrl: item.imageUrl,
    dietaryType: item.dietaryType,
    isFeatured: item.isFeatured,
    isAvailable: item.isAvailable,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function serializePaymentItem(payment) {
  return {
    id: payment.id,
    reservationId: payment.reservationId,
    bookingCode: payment.reservation.bookingCode,
    customerName: payment.reservation.customer.fullName,
    customerEmail: payment.reservation.customer.email,
    customerPhone: payment.reservation.customer.mobileNumber,
    branchName: payment.reservation.branch.name,
    provider: payment.provider,
    method: payment.method,
    status: payment.status,
    amount: toNumber(payment.amount),
    advancePercentage: payment.advancePercentage,
    createdAt: formatDateTime(payment.createdAt),
    paidAt: formatDateTime(payment.paidAt),
    verifiedAt: formatDateTime(payment.verifiedAt),
    transactionRef: payment.transactionRef,
    instructions: payment.instructions
  };
}

function serializeOrderItem(reservation) {
  return {
    reservationId: reservation.id,
    bookingCode: reservation.bookingCode,
    customerName: reservation.customer.fullName,
    branchName: reservation.branch.name,
    reservationDate: formatDate(reservation.serviceDate),
    arrivalTime: timeOnly(reservation.startAt),
    bookingStatus: reservation.status,
    paymentStatus: reservation.paymentStatus,
    subtotal: toNumber(reservation.subtotal),
    advanceDue: toNumber(reservation.advanceDue),
    advancePaid: toNumber(reservation.advancePaid),
    balanceDue: toNumber(reservation.balanceDue),
    items: reservation.items.map((item) => ({
      id: item.id,
      itemName: item.itemNameSnapshot,
      quantity: item.quantity,
      subtotal: toNumber(item.subtotal)
    }))
  };
}

async function maybeSendReservationEmail(type, reservation) {
  if (!reservation.customer?.email) {
    return { skipped: true, reason: 'missing-customer-email' };
  }

  const settings = await getSettingsBundle();

  if (type === 'booking_confirmation' && settings.notifications?.sendBookingConfirmationEmail === false) {
    return { skipped: true, reason: 'booking-confirmation-disabled' };
  }

  if (type === 'payment_update' && settings.notifications?.sendPaymentEmails === false) {
    return { skipped: true, reason: 'payment-email-disabled' };
  }

  if (
    ['approved', 'rejected', 'cancelled', 'completed'].includes(type) &&
    settings.notifications?.sendStatusEmails === false
  ) {
    return { skipped: true, reason: 'status-email-disabled' };
  }

  const branchName = reservation.branch?.name || 'your selected branch';
  const visitDate = formatDate(reservation.serviceDate);
  const visitTime = `${timeOnly(reservation.startAt)}-${timeOnly(reservation.endAt)}`;

  const templates = {
    booking_confirmation: {
      subject: `Booking received: ${reservation.bookingCode}`,
      title: 'Reservation received successfully',
      bodyLines: [
        `Booking ID: ${reservation.bookingCode}`,
        `Branch: ${branchName}`,
        `Date: ${visitDate}`,
        `Time: ${visitTime}`,
        `Guests: ${reservation.guestCount}`,
        `Payment status: ${reservation.paymentStatus}`
      ]
    },
    approved: {
      subject: `Booking approved: ${reservation.bookingCode}`,
      title: 'Your reservation has been approved',
      bodyLines: [
        `Booking ID: ${reservation.bookingCode}`,
        `Branch: ${branchName}`,
        `Date: ${visitDate}`,
        `Time: ${visitTime}`,
        'We look forward to hosting you.'
      ]
    },
    rejected: {
      subject: `Booking update: ${reservation.bookingCode}`,
      title: 'Your reservation could not be approved',
      bodyLines: [
        `Booking ID: ${reservation.bookingCode}`,
        `Branch: ${branchName}`,
        'Please contact the restaurant to choose another slot.'
      ]
    },
    cancelled: {
      subject: `Booking cancelled: ${reservation.bookingCode}`,
      title: 'Your reservation has been cancelled',
      bodyLines: [
        `Booking ID: ${reservation.bookingCode}`,
        `Branch: ${branchName}`,
        'If this was unexpected, please call the restaurant directly.'
      ]
    },
    completed: {
      subject: `Booking completed: ${reservation.bookingCode}`,
      title: 'Thank you for visiting Pizza Capucino',
      bodyLines: [
        `Booking ID: ${reservation.bookingCode}`,
        'We appreciate your visit and hope to see you again soon.'
      ]
    },
    payment_update: {
      subject: `Payment update: ${reservation.bookingCode}`,
      title: 'Your booking payment status has been updated',
      bodyLines: [
        `Booking ID: ${reservation.bookingCode}`,
        `Payment status: ${reservation.paymentStatus}`,
        `Advance paid: INR ${toNumber(reservation.advancePaid).toFixed(2)}`
      ]
    }
  };

  const template = templates[type];

  if (!template) {
    return { skipped: true, reason: 'missing-template' };
  }

  return sendEmail({
    to: reservation.customer.email,
    subject: template.subject,
    title: template.title,
    bodyLines: template.bodyLines
  });
}

async function createReservationSideEffects(reservation, type, title, message, metadata = null) {
  await Promise.all([
    createAdminNotifications({
      title,
      message,
      type,
      reservationId: reservation.id,
      metadata
    }),
    maybeSendReservationEmail(
      type === NotificationType.PAYMENT_UPDATE
        ? 'payment_update'
        : type === NotificationType.NEW_BOOKING
          ? 'booking_confirmation'
          : String(reservation.status || '').toLowerCase(),
      reservation
    ).catch(() => null)
  ]);
}

async function getDashboardSummary(adminId = null) {
  const today = buildTodayDate();

  const [
    totalReservations,
    todayBookings,
    pendingReservations,
    approvedReservations,
    cancelledReservations,
    pendingPayments,
    revenueCollected,
    branchCounts,
    recentReservations,
    branches,
    ordersCount,
    unreadNotifications
  ] = await Promise.all([
    prisma.reservation.count({
      where: {
        status: COUNTABLE_RESERVATION_STATUSES
      }
    }),
    prisma.reservation.count({
      where: {
        serviceDate: today,
        status: ACTIVE_RESERVATION_STATUSES
      }
    }),
    prisma.reservation.count({
      where: {
        status: ReservationStatus.PENDING
      }
    }),
    prisma.reservation.count({
      where: {
        status: ReservationStatus.APPROVED
      }
    }),
    prisma.reservation.count({
      where: {
        status: ReservationStatus.CANCELLED
      }
    }),
    prisma.payment.count({
      where: {
        status: {
          in: [PaymentStatus.PENDING, PaymentStatus.AWAITING_CONFIRMATION]
        }
      }
    }),
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.PAID
      },
      _sum: {
        amount: true
      }
    }),
    prisma.reservation.groupBy({
      by: ['branchId'],
      where: {
        status: COUNTABLE_RESERVATION_STATUSES
      },
      _count: {
        branchId: true
      }
    }),
    prisma.reservation.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 6,
      include: {
        customer: true,
        branch: true,
        items: true
      }
    }),
    prisma.branch.findMany({
      orderBy: {
        name: 'asc'
      }
    }),
    prisma.reservation.count({
      where: {
        items: {
          some: {}
        }
      }
    }),
    prisma.notification.count({
      where: {
        ...(adminId ? { adminId } : {}),
        isRead: false
      }
    })
  ]);

  const branchCountMap = new Map(branchCounts.map((item) => [item.branchId, item._count.branchId]));

  return {
    cards: {
      todayBookings,
      pendingReservations,
      approvedReservations,
      cancelledReservations,
      revenueCollected: toNumber(revenueCollected._sum.amount),
      pendingPayments,
      totalReservations,
      preorderOrders: ordersCount,
      unreadNotifications
    },
    branchReservations: branches.map((branch) => ({
      branchId: branch.id,
      branchName: branch.name,
      reservationCount: branchCountMap.get(branch.id) || 0,
      totalSeats: branch.totalSeats,
      totalTables: branch.totalTables,
      isActive: branch.isActive
    })),
    recentReservations: recentReservations.map(serializeReservationListItem)
  };
}

function buildReservationWhereClause(filters) {
  const where = {};

  if (filters.search) {
    where.OR = [
      {
        bookingCode: {
          contains: filters.search
        }
      },
      {
        customer: {
          is: {
            fullName: {
              contains: filters.search
            }
          }
        }
      },
      {
        customer: {
          is: {
            mobileNumber: {
              contains: filters.search
            }
          }
        }
      },
      {
        customer: {
          is: {
            email: {
              contains: filters.search
            }
          }
        }
      }
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.branchId) {
    where.branchId = filters.branchId;
  }

  if (filters.paymentStatus) {
    where.paymentStatus = filters.paymentStatus;
  }

  if (filters.reservationType) {
    where.reservationType = filters.reservationType;
  }

  if (filters.date) {
    where.serviceDate = startOfDayFromString(filters.date);
  }

  return where;
}

function buildReservationOrderBy(sortBy, sortOrder) {
  const direction = sortOrder === 'asc' ? 'asc' : 'desc';

  switch (sortBy) {
    case 'serviceDate':
      return [{ serviceDate: direction }, { startAt: direction }];
    case 'guestCount':
      return [{ guestCount: direction }];
    case 'customerName':
      return [{ customer: { fullName: direction } }];
    case 'createdAt':
    default:
      return [{ createdAt: direction }];
  }
}

async function listReservations(filters) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 10));
  const skip = (page - 1) * limit;
  const where = buildReservationWhereClause(filters);
  const orderBy = buildReservationOrderBy(filters.sortBy, filters.sortOrder);

  const [items, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        customer: true,
        branch: true,
        items: true
      },
      orderBy,
      skip,
      take: limit
    }),
    prisma.reservation.count({ where })
  ]);

  return {
    items: items.map(serializeReservationListItem),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}

async function getReservationById(reservationId) {
  const reservation = await prisma.reservation.findUnique({
    where: {
      id: reservationId
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

  return serializeReservationDetails(reservation);
}

function buildStatusUpdateData(nextStatus) {
  const now = new Date();
  const data = {
    status: nextStatus
  };

  if (nextStatus === ReservationStatus.APPROVED) {
    data.approvedAt = now;
    data.rejectedAt = null;
    data.cancelledAt = null;
  }

  if (nextStatus === ReservationStatus.REJECTED) {
    data.rejectedAt = now;
  }

  if (nextStatus === ReservationStatus.CANCELLED) {
    data.cancelledAt = now;
  }

  if (nextStatus === ReservationStatus.COMPLETED) {
    data.completedAt = now;
  }

  return data;
}

async function updateReservationStatus(reservationId, nextStatus) {
  const reservation = await prisma.reservation.findUnique({
    where: {
      id: reservationId
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

  const updatedReservation = await prisma.reservation.update({
    where: {
      id: reservationId
    },
    data: buildStatusUpdateData(nextStatus),
    include: {
      customer: true,
      branch: true,
      items: true,
      payments: true
    }
  });

  await createReservationSideEffects(
    updatedReservation,
    NotificationType.BOOKING_STATUS,
    'Reservation status updated',
    `${updatedReservation.bookingCode} is now ${nextStatus.toLowerCase()}.`,
    { status: nextStatus }
  );

  return serializeReservationDetails(updatedReservation);
}

async function deleteReservation(reservationId) {
  const reservation = await prisma.reservation.findUnique({
    where: {
      id: reservationId
    }
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found.');
  }

  await prisma.$transaction([
    prisma.analyticsEvent.deleteMany({
      where: {
        reservationId
      }
    }),
    prisma.notification.deleteMany({
      where: {
        reservationId
      }
    }),
    prisma.payment.deleteMany({
      where: {
        reservationId
      }
    }),
    prisma.reservationItem.deleteMany({
      where: {
        reservationId
      }
    }),
    prisma.reservation.delete({
      where: {
        id: reservationId
      }
    })
  ]);

  return {
    success: true
  };
}

async function listBranches() {
  const [branches, reservationCounts] = await Promise.all([
    prisma.branch.findMany({
      orderBy: {
        name: 'asc'
      }
    }),
    prisma.reservation.groupBy({
      by: ['branchId'],
      where: {
        status: COUNTABLE_RESERVATION_STATUSES
      },
      _count: {
        branchId: true
      }
    })
  ]);

  const countMap = new Map(reservationCounts.map((item) => [item.branchId, item._count.branchId]));

  return branches.map((branch) => ({
    id: branch.id,
    code: branch.code,
    name: branch.name,
    phone: branch.phone,
    addressLine1: branch.addressLine1,
    addressLine2: branch.addressLine2,
    city: branch.city,
    state: branch.state,
    totalTables: branch.totalTables,
    totalSeats: branch.totalSeats,
    opensAt: branch.opensAt,
    closesAt: branch.closesAt,
    isActive: branch.isActive,
    reservationCount: countMap.get(branch.id) || 0
  }));
}

async function updateBranch(branchId, payload) {
  const branch = await prisma.branch.findUnique({
    where: {
      id: branchId
    }
  });

  if (!branch) {
    throw new AppError(404, 'Branch not found.');
  }

  const updatedBranch = await prisma.branch.update({
    where: {
      id: branchId
    },
    data: payload
  });

  return {
    id: updatedBranch.id,
    code: updatedBranch.code,
    name: updatedBranch.name,
    totalTables: updatedBranch.totalTables,
    totalSeats: updatedBranch.totalSeats,
    opensAt: updatedBranch.opensAt,
    closesAt: updatedBranch.closesAt,
    isActive: updatedBranch.isActive,
    phone: updatedBranch.phone
  };
}

function buildPaymentWhereClause(filters) {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.branchId) {
    where.reservation = {
      branchId: filters.branchId
    };
  }

  if (filters.search) {
    where.OR = [
      {
        transactionRef: {
          contains: filters.search
        }
      },
      {
        reservation: {
          is: {
            bookingCode: {
              contains: filters.search
            }
          }
        }
      },
      {
        reservation: {
          is: {
            customer: {
              is: {
                fullName: {
                  contains: filters.search
                }
              }
            }
          }
        }
      }
    ];
  }

  return where;
}

async function listPayments(filters) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 10));
  const skip = (page - 1) * limit;
  const where = buildPaymentWhereClause(filters);

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        reservation: {
          include: {
            customer: true,
            branch: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    }),
    prisma.payment.count({ where })
  ]);

  return {
    items: items.map(serializePaymentItem),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}

async function updatePaymentStatus(paymentId, payload, adminId) {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId
    },
    include: {
      reservation: {
        include: {
          customer: true,
          branch: true,
          items: true,
          payments: true
        }
      }
    }
  });

  if (!payment) {
    throw new AppError(404, 'Payment not found.');
  }

  const status = payload.status;
  const paidAt =
    status === PaymentStatus.PAID
      ? payload.paidAt
        ? new Date(payload.paidAt)
        : new Date()
      : null;
  const verifiedAt =
    status === PaymentStatus.PAID || status === PaymentStatus.FAILED || status === PaymentStatus.REFUNDED
      ? new Date()
      : null;

  const updatedPayment = await prisma.payment.update({
    where: {
      id: paymentId
    },
    data: {
      status,
      transactionRef: payload.transactionRef || null,
      paidAt,
      verifiedAt,
      verifiedByAdminId: verifiedAt ? adminId : null
    },
    include: {
      reservation: {
        include: {
          customer: true,
          branch: true,
          items: true,
          payments: true
        }
      }
    }
  });

  let reservationPaymentStatus = status;
  let advancePaid = updatedPayment.reservation.advancePaid;

  if (status === PaymentStatus.PAID) {
    advancePaid = toNumber(updatedPayment.amount);
  }

  if (status === PaymentStatus.REFUNDED || status === PaymentStatus.FAILED) {
    advancePaid = 0;
  }

  if (status === PaymentStatus.PENDING || status === PaymentStatus.AWAITING_CONFIRMATION) {
    reservationPaymentStatus = status;
  }

  const updatedReservation = await prisma.reservation.update({
    where: {
      id: updatedPayment.reservationId
    },
    data: {
      paymentStatus: reservationPaymentStatus,
      advancePaid,
      balanceDue: Math.max(toNumber(updatedPayment.reservation.subtotal) - advancePaid, 0)
    },
    include: {
      customer: true,
      branch: true,
      items: true,
      payments: true
    }
  });

  await createReservationSideEffects(
    updatedReservation,
    NotificationType.PAYMENT_UPDATE,
    'Payment status updated',
    `${updatedReservation.bookingCode} payment is now ${status.toLowerCase()}.`,
    { paymentId, status, transactionRef: payload.transactionRef || null }
  );

  return {
    payment: serializePaymentItem(updatedPayment),
    reservation: serializeReservationDetails(updatedReservation)
  };
}

async function listOrders(filters = {}) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 10));
  const skip = (page - 1) * limit;
  const where = {
    items: {
      some: {}
    }
  };

  if (filters.branchId) {
    where.branchId = filters.branchId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  const [items, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        customer: true,
        branch: true,
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    }),
    prisma.reservation.count({ where })
  ]);

  return {
    items: items.map(serializeOrderItem),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}

async function listMenuItems(filters = {}) {
  const where = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { category: { contains: filters.search } },
      { code: { contains: filters.search } }
    ];
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.isAvailable === true || filters.isAvailable === false) {
    where.isAvailable = filters.isAvailable;
  }

  const items = await prisma.menuItem.findMany({
    where,
    orderBy: [{ isFeatured: 'desc' }, { category: 'asc' }, { name: 'asc' }]
  });

  return items.map(serializeMenuItem);
}

function resolveMenuImageUrl(uploadedImageUrl, payload) {
  if (uploadedImageUrl) {
    return uploadedImageUrl;
  }

  return payload.imageUrl || null;
}

async function createMenuItem(payload, uploadedImageUrl) {
  const code = payload.code || slugify(payload.name).toUpperCase().replace(/-/g, '_');
  const slug = slugify(payload.slug || payload.name);

  if (!slug) {
    throw new AppError(400, 'Dish name is required to create a slug.');
  }

  const item = await prisma.menuItem.create({
    data: {
      code,
      name: payload.name,
      slug,
      description: payload.description || null,
      category: payload.category,
      price: payload.price,
      imageUrl: resolveMenuImageUrl(uploadedImageUrl, payload),
      dietaryType: payload.dietaryType,
      isFeatured: payload.isFeatured,
      isAvailable: payload.isAvailable
    }
  });

  return serializeMenuItem(item);
}

async function updateMenuItem(menuItemId, payload, uploadedImageUrl) {
  const existing = await prisma.menuItem.findUnique({
    where: {
      id: menuItemId
    }
  });

  if (!existing) {
    throw new AppError(404, 'Menu item not found.');
  }

  const item = await prisma.menuItem.update({
    where: {
      id: menuItemId
    },
    data: {
      code: payload.code || existing.code,
      name: payload.name,
      slug: slugify(payload.slug || payload.name),
      description: payload.description || null,
      category: payload.category,
      price: payload.price,
      imageUrl: uploadedImageUrl || payload.imageUrl || existing.imageUrl,
      dietaryType: payload.dietaryType,
      isFeatured: payload.isFeatured,
      isAvailable: payload.isAvailable
    }
  });

  return serializeMenuItem(item);
}

async function deleteMenuItem(menuItemId) {
  const existing = await prisma.menuItem.findUnique({
    where: {
      id: menuItemId
    }
  });

  if (!existing) {
    throw new AppError(404, 'Menu item not found.');
  }

  await prisma.$transaction([
    prisma.reservationItem.updateMany({
      where: {
        menuItemId
      },
      data: {
        menuItemId: null
      }
    }),
    prisma.menuItem.delete({
      where: {
        id: menuItemId
      }
    })
  ]);

  return {
    success: true
  };
}

async function getAnalytics(days = 14) {
  const safeDays = Math.min(90, Math.max(7, Number(days || 14)));
  const endDate = endOfDay(new Date());
  const startDate = addDays(buildTodayDate(), -(safeDays - 1));

  const [reservations, payments, branches, orderItems] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        branch: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    }),
    prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    }),
    prisma.branch.findMany({
      orderBy: {
        name: 'asc'
      }
    }),
    prisma.reservationItem.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })
  ]);

  const dayLabels = [];
  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    dayLabels.push(formatDate(cursor));
  }

  const reservationsPerDayMap = new Map(dayLabels.map((label) => [label, 0]));
  const revenuePerDayMap = new Map(dayLabels.map((label) => [label, 0]));
  const peakHoursMap = new Map(Array.from({ length: 24 }, (_, index) => [index, 0]));

  reservations.forEach((reservation) => {
    const label = formatDate(reservation.createdAt);
    reservationsPerDayMap.set(label, (reservationsPerDayMap.get(label) || 0) + 1);
    const hour = new Date(reservation.startAt).getHours();
    peakHoursMap.set(hour, (peakHoursMap.get(hour) || 0) + 1);
  });

  payments.forEach((payment) => {
    const label = formatDate(payment.paidAt || payment.createdAt);
    revenuePerDayMap.set(label, (revenuePerDayMap.get(label) || 0) + toNumber(payment.amount));
  });

  const branchCountsMap = new Map(branches.map((branch) => [branch.id, 0]));
  reservations.forEach((reservation) => {
    branchCountsMap.set(reservation.branchId, (branchCountsMap.get(reservation.branchId) || 0) + 1);
  });

  const popularDishGroups = Array.from(groupBy(orderItems, (item) => item.itemNameSnapshot).entries())
    .map(([itemName, items]) => ({
      itemName,
      quantity: items.reduce((total, item) => total + item.quantity, 0),
      revenue: items.reduce((total, item) => total + toNumber(item.subtotal), 0)
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  return {
    dateRangeDays: safeDays,
    reservationsPerDay: Array.from(reservationsPerDayMap.entries()).map(([label, count]) => ({ label, count })),
    revenuePerDay: Array.from(revenuePerDayMap.entries()).map(([label, amount]) => ({ label, amount })),
    reservationsPerBranch: branches.map((branch) => ({
      branchName: branch.name,
      count: branchCountsMap.get(branch.id) || 0
    })),
    popularDishes: popularDishGroups,
    peakBookingHours: Array.from(peakHoursMap.entries()).map(([hour, count]) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      count
    }))
  };
}

async function getCalendar(period = 'month', referenceDate, branchId) {
  const baseDate = referenceDate ? new Date(`${referenceDate}T00:00:00`) : new Date();
  let startDate = startOfMonth(baseDate);
  let endDate = endOfMonth(baseDate);

  if (period === 'day') {
    startDate = new Date(baseDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = endOfDay(baseDate);
  }

  if (period === 'week') {
    startDate = startOfWeek(baseDate);
    endDate = endOfWeek(baseDate);
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      serviceDate: {
        gte: startDate,
        lte: endDate
      },
      ...(branchId ? { branchId } : {})
    },
    include: {
      customer: true,
      branch: true,
      items: true
    },
    orderBy: [{ serviceDate: 'asc' }, { startAt: 'asc' }]
  });

  const grouped = Array.from(
    groupBy(reservations, (reservation) => formatDate(reservation.serviceDate)).entries()
  ).map(([dateLabel, items]) => ({
    dateLabel,
    reservations: items.map(serializeReservationListItem)
  }));

  return {
    period,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    groups: grouped
  };
}

async function getSettings() {
  return getSettingsBundle();
}

async function updateSettings(payload) {
  return updateSettingsBundle(payload);
}

module.exports = {
  deleteMenuItem,
  deleteReservation,
  getAnalytics,
  getCalendar,
  getDashboardSummary,
  getReservationById,
  getSettings,
  listBranches,
  listMenuItems,
  listNotifications,
  listOrders,
  listPayments,
  listReservations,
  markAllNotificationsRead,
  markNotificationRead,
  updateBranch,
  updateMenuItem,
  updatePaymentStatus,
  updateReservationStatus,
  updateSettings,
  createMenuItem
};
