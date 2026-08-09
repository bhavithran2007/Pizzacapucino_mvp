const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const asyncHandler = require('../utils/async-handler');
const reservationService = require('../services/reservation.service');

const router = express.Router();

const reservationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many booking requests. Please try again in a few minutes.'
  }
});

const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many lookup requests. Please try again later.'
  }
});

const occasionValues = ['NONE', 'BIRTHDAY', 'ANNIVERSARY', 'BUSINESS_MEETING', 'FAMILY_DINNER', 'OTHER'];
const reservationTypeValues = ['TABLE_ONLY', 'TABLE_WITH_PREORDER'];

const trueBoolean = z.preprocess(
  (value) => value === true || value === 'true' || value === '1' || value === 'on',
  z.literal(true)
);

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format.');
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format.');

const availabilitySchema = z.object({
  branchId: z.string().trim().min(1),
  date: dateSchema,
  arrivalTime: timeSchema,
  endTime: timeSchema,
  guestCount: z.coerce.number().int().min(1).max(50)
});

const reservationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  mobileNumber: z.string().trim().min(8).max(20),
  altMobileNumber: z.union([z.string().trim().min(8).max(20), z.literal('')]).optional(),
  email: z.string().trim().email().max(120),
  guestCount: z.coerce.number().int().min(1).max(50),
  branchId: z.string().trim().min(1),
  date: dateSchema,
  arrivalTime: timeSchema,
  endTime: timeSchema,
  specialRequests: z.union([z.string().trim().max(1000), z.literal('')]).optional(),
  occasion: z.enum(occasionValues).default('NONE'),
  reservationType: z.enum(reservationTypeValues),
  policyAccepted: trueBoolean,
  items: z
    .array(
      z.object({
        menuItemId: z.string().trim().min(1),
        quantity: z.coerce.number().int().min(1).max(20)
      })
    )
    .max(25)
    .optional()
    .default([])
});

router.get(
  '/bootstrap',
  asyncHandler(async (req, res) => {
    const data = await reservationService.getPublicBootstrapData();
    res.json(data);
  })
);

router.get(
  '/menu',
  asyncHandler(async (req, res) => {
    const items = await reservationService.listAvailableMenuItems();
    res.json({
      items
    });
  })
);

router.get(
  '/availability',
  asyncHandler(async (req, res) => {
    const query = availabilitySchema.parse(req.query);
    const availability = await reservationService.getAvailability(query);
    res.json(availability);
  })
);

router.post(
  '/reservations',
  reservationLimiter,
  asyncHandler(async (req, res) => {
    const payload = reservationSchema.parse(req.body);
    const reservation = await reservationService.createReservation({
      ...payload,
      altMobileNumber: payload.altMobileNumber || null,
      specialRequests: payload.specialRequests || null
    });

    res.status(201).json({
      message: 'Reservation created successfully.',
      reservation
    });
  })
);

router.get(
  '/reservations/:bookingCode',
  lookupLimiter,
  asyncHandler(async (req, res) => {
    const params = z
      .object({
        bookingCode: z.string().trim().min(3).max(20)
      })
      .parse(req.params);
    const query = z
      .object({
        phone: z.string().trim().min(8).max(20)
      })
      .parse(req.query);
    const reservation = await reservationService.lookupReservation(params.bookingCode, query.phone);
    res.json({
      reservation
    });
  })
);

module.exports = router;
