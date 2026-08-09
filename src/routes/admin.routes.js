const express = require('express');
const {
  DietaryType,
  PaymentStatus,
  ReservationStatus,
  ReservationType
} = require('@prisma/client');
const { z } = require('zod');
const asyncHandler = require('../utils/async-handler');
const adminService = require('../services/admin.service');
const upload = require('../config/upload');
const { uploadMenuImageBuffer } = require('../config/cloudinary');
const { requireAdminApi } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdminApi);

const reservationStatusValues = Object.values(ReservationStatus);
const paymentStatusValues = Object.values(PaymentStatus);
const reservationTypeValues = Object.values(ReservationType);
const dietaryTypeValues = Object.values(DietaryType);
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

const stringBoolean = z.preprocess(
  (value) => value === true || value === 'true' || value === '1' || value === 'on',
  z.boolean()
);

const reservationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  search: z.string().trim().max(120).optional().default(''),
  status: z.enum(reservationStatusValues).optional(),
  branchId: z.string().trim().optional(),
  paymentStatus: z.enum(paymentStatusValues).optional(),
  reservationType: z.enum(reservationTypeValues).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sortBy: z.enum(['createdAt', 'serviceDate', 'guestCount', 'customerName']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

const reservationStatusSchema = z.object({
  status: z.enum(reservationStatusValues)
});

const branchUpdateSchema = z.object({
  totalTables: z.coerce.number().int().min(0).max(500),
  totalSeats: z.coerce.number().int().min(0).max(2000),
  opensAt: timeSchema,
  closesAt: timeSchema,
  isActive: z.boolean(),
  phone: z.string().trim().max(25).nullable().optional()
});

const branchCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().max(20).optional(),
  addressLine1: z.string().trim().min(3).max(255),
  addressLine2: z.string().trim().max(255).optional().or(z.literal('')),
  city: z.string().trim().max(120).optional().or(z.literal('')),
  state: z.string().trim().max(120).optional().or(z.literal('')),
  phone: z.string().trim().max(25).optional().or(z.literal('')),
  totalTables: z.coerce.number().int().min(0).max(500),
  totalSeats: z.coerce.number().int().min(0).max(2000),
  opensAt: timeSchema,
  closesAt: timeSchema,
  isActive: stringBoolean.optional().default(true)
});

const paymentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  search: z.string().trim().max(120).optional().default(''),
  status: z.enum(paymentStatusValues).optional(),
  branchId: z.string().trim().optional()
});

const paymentUpdateSchema = z.object({
  status: z.enum(paymentStatusValues),
  transactionRef: z.string().trim().max(120).optional().or(z.literal('')),
  paidAt: z.string().datetime().optional()
});

const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  branchId: z.string().trim().optional(),
  status: z.enum(reservationStatusValues).optional()
});

const menuQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(''),
  category: z.string().trim().max(80).optional().default(''),
  isAvailable: z
    .preprocess(
      (value) => {
        if (value === undefined || value === '') {
          return undefined;
        }

        return value === true || value === 'true' || value === '1';
      },
      z.boolean().optional()
    )
    .optional()
});

const menuPayloadSchema = z.object({
  code: z.string().trim().max(30).optional().or(z.literal('')),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(150).optional().or(z.literal('')),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  category: z.string().trim().min(2).max(80),
  price: z.coerce.number().min(0),
  imageUrl: z.string().trim().max(500).optional().or(z.literal('')),
  dietaryType: z.enum(dietaryTypeValues),
  isFeatured: stringBoolean,
  isAvailable: stringBoolean
});

const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).optional().default(14)
});

const calendarQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).optional().default('month'),
  referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  branchId: z.string().trim().optional()
});

const settingsUpdateSchema = z.object({
  restaurant: z
    .object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(120),
      phone: z.string().trim().max(25),
      tagline: z.string().trim().max(180),
      logoUrl: z.string().trim().max(500),
      address: z.string().trim().max(255),
      googleMaps: z.string().trim().max(500),
      branchesExpected: z.coerce.number().int().min(1).max(20)
    })
    .optional(),
  bookingPolicy: z
    .object({
      minimumGuests: z.coerce.number().int().min(1).max(100),
      maximumGuests: z.coerce.number().int().min(1).max(500),
      advancePaymentPercentage: z.coerce.number().int().min(0).max(100),
      defaultReservationDurationMinutes: z.coerce.number().int().min(30).max(720),
      cancellationHours: z.coerce.number().int().min(0).max(168),
      operatingHoursStart: timeSchema,
      operatingHoursEnd: timeSchema
    })
    .optional(),
  manualPayment: z
    .object({
      provider: z.string().trim().max(40),
      qrImageUrl: z.string().trim().max(500),
      whatsappNumber: z.string().trim().max(25),
      screenshotStoredOnServer: z.boolean(),
      instructions: z.string().trim().max(500)
    })
    .optional(),
  smtp: z
    .object({
      host: z.string().trim().max(120),
      port: z.coerce.number().int().min(1).max(65535),
      secure: z.boolean(),
      user: z.string().trim().max(180),
      pass: z.string().trim().max(180),
      fromName: z.string().trim().max(120),
      fromEmail: z.string().trim().email().max(120)
    })
    .optional(),
  notifications: z
    .object({
      sendBookingConfirmationEmail: z.boolean(),
      sendStatusEmails: z.boolean(),
      sendPaymentEmails: z.boolean()
    })
    .optional()
});

const notificationsQuerySchema = z.object({
  unreadOnly: z
    .preprocess(
      (value) => value === true || value === 'true' || value === '1',
      z.boolean().optional().default(false)
    )
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12)
});

router.get(
  '/bootstrap-summary',
  asyncHandler(async (req, res) => {
    const summary = await adminService.getDashboardSummary(req.admin.id);

    res.json({
      admin: req.admin,
      stats: summary.cards,
      nextModules: ['completed build']
    });
  })
);

router.get(
  '/dashboard-summary',
  asyncHandler(async (req, res) => {
    const summary = await adminService.getDashboardSummary(req.admin.id);
    res.json(summary);
  })
);

router.get(
  '/reservations',
  asyncHandler(async (req, res) => {
    const query = reservationQuerySchema.parse(req.query);
    const reservations = await adminService.listReservations(query);
    res.json(reservations);
  })
);

router.get(
  '/reservations/:id',
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().trim().min(1) }).parse(req.params);
    const reservation = await adminService.getReservationById(params.id);
    res.json({ reservation });
  })
);

router.patch(
  '/reservations/:id/status',
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().trim().min(1) }).parse(req.params);
    const body = reservationStatusSchema.parse(req.body);
    const reservation = await adminService.updateReservationStatus(params.id, body.status);
    res.json({
      message: 'Reservation status updated.',
      reservation
    });
  })
);

router.delete(
  '/reservations/:id',
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().trim().min(1) }).parse(req.params);
    await adminService.deleteReservation(params.id);
    res.json({
      message: 'Reservation deleted successfully.'
    });
  })
);

router.get(
  '/branches',
  asyncHandler(async (req, res) => {
    const branches = await adminService.listBranches();
    res.json({
      branches
    });
  })
);

router.post(
  '/branches',
  asyncHandler(async (req, res) => {
    const body = branchCreateSchema.parse(req.body);
    const branch = await adminService.createBranch(body);
    res.status(201).json({
      message: 'Branch created successfully.',
      branch
    });
  })
);

router.patch(
  '/branches/:id',
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().trim().min(1) }).parse(req.params);
    const body = branchUpdateSchema.parse(req.body);
    const branch = await adminService.updateBranch(params.id, body);
    res.json({
      message: 'Branch updated successfully.',
      branch
    });
  })
);

router.delete(
  '/branches/:id',
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().trim().min(1) }).parse(req.params);
    await adminService.deleteBranch(params.id);
    res.json({
      message: 'Branch deleted successfully.'
    });
  })
);

router.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const query = paymentQuerySchema.parse(req.query);
    const payments = await adminService.listPayments(query);
    res.json(payments);
  })
);

router.patch(
  '/payments/:id',
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().trim().min(1) }).parse(req.params);
    const body = paymentUpdateSchema.parse(req.body);
    const result = await adminService.updatePaymentStatus(
      params.id,
      {
        ...body,
        transactionRef: body.transactionRef || null
      },
      req.admin.id
    );
    res.json({
      message: 'Payment updated successfully.',
      ...result
    });
  })
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const query = orderQuerySchema.parse(req.query);
    const orders = await adminService.listOrders(query);
    res.json(orders);
  })
);

router.get(
  '/menu',
  asyncHandler(async (req, res) => {
    const query = menuQuerySchema.parse(req.query);
    const items = await adminService.listMenuItems(query);
    res.json({ items });
  })
);

router.post(
  '/menu',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const body = menuPayloadSchema.parse(req.body);
    const imageUrl = req.file ? await uploadMenuImageBuffer(req.file) : null;
    const item = await adminService.createMenuItem(body, imageUrl);
    res.status(201).json({
      message: 'Menu item created successfully.',
      item
    });
  })
);

router.patch(
  '/menu/:id',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().trim().min(1) }).parse(req.params);
    const body = menuPayloadSchema.parse(req.body);
    const imageUrl = req.file ? await uploadMenuImageBuffer(req.file) : null;
    const item = await adminService.updateMenuItem(params.id, body, imageUrl);
    res.json({
      message: 'Menu item updated successfully.',
      item
    });
  })
);

router.delete(
  '/menu/:id',
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().trim().min(1) }).parse(req.params);
    await adminService.deleteMenuItem(params.id);
    res.json({
      message: 'Menu item deleted successfully.'
    });
  })
);

router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const query = analyticsQuerySchema.parse(req.query);
    const analytics = await adminService.getAnalytics(query.days);
    res.json(analytics);
  })
);

router.get(
  '/calendar',
  asyncHandler(async (req, res) => {
    const query = calendarQuerySchema.parse(req.query);
    const calendar = await adminService.getCalendar(query.period, query.referenceDate, query.branchId);
    res.json(calendar);
  })
);

router.get(
  '/settings',
  asyncHandler(async (req, res) => {
    const settings = await adminService.getSettings();
    res.json(settings);
  })
);

router.patch(
  '/settings',
  asyncHandler(async (req, res) => {
    const body = settingsUpdateSchema.parse(req.body);
    const settings = await adminService.updateSettings(body);
    res.json({
      message: 'Settings updated successfully.',
      settings
    });
  })
);

router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const query = notificationsQuerySchema.parse(req.query);
    const notifications = await adminService.listNotifications({
      adminId: req.admin.id,
      unreadOnly: query.unreadOnly,
      limit: query.limit
    });
    res.json(notifications);
  })
);

router.patch(
  '/notifications/:id/read',
  asyncHandler(async (req, res) => {
    const params = z.object({ id: z.string().trim().min(1) }).parse(req.params);
    await adminService.markNotificationRead(params.id);
    res.json({
      message: 'Notification marked as read.'
    });
  })
);

router.post(
  '/notifications/read-all',
  asyncHandler(async (req, res) => {
    await adminService.markAllNotificationsRead(req.admin.id);
    res.json({
      message: 'All notifications marked as read.'
    });
  })
);

module.exports = router;
