const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const prisma = require('../config/prisma');
const env = require('../config/env');
const AppError = require('../utils/app-error');
const asyncHandler = require('../utils/async-handler');
const { requireAdminApi } = require('../middleware/auth');
const { sanitizeAdmin, signAdminToken } = require('../utils/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many login attempts. Please try again later.'
  }
});

const loginSchema = z.object({
  username: z.string().trim().min(3).max(60),
  password: z.string().min(8).max(100)
});

function authCookieOptions() {
  const isProduction = env.nodeEnv === 'production';

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 12 * 60 * 60 * 1000,
    path: '/'
  };
}

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const credentials = loginSchema.parse(req.body);
    const admin = await prisma.admin.findUnique({
      where: { username: credentials.username }
    });

    if (!admin || !admin.isActive) {
      throw new AppError(401, 'Invalid username or password.');
    }

    const passwordMatches = await bcrypt.compare(credentials.password, admin.passwordHash);

    if (!passwordMatches) {
      throw new AppError(401, 'Invalid username or password.');
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() }
    });

    const refreshedAdmin = await prisma.admin.findUnique({
      where: { id: admin.id }
    });

    const token = signAdminToken(refreshedAdmin);

    res.cookie(env.adminCookieName, token, authCookieOptions());
    res.json({
      message: 'Login successful.',
      token,
      admin: sanitizeAdmin(refreshedAdmin)
    });
  })
);

router.post('/logout', (req, res) => {
  res.clearCookie(env.adminCookieName, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });

  res.json({
    message: 'Logged out successfully.'
  });
});

router.get(
  '/me',
  requireAdminApi,
  asyncHandler(async (req, res) => {
    res.json({
      admin: req.admin
    });
  })
);

module.exports = router;
