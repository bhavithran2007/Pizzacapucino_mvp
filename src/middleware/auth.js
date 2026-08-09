const prisma = require('../config/prisma');
const env = require('../config/env');
const AppError = require('../utils/app-error');
const { sanitizeAdmin, verifyAdminToken } = require('../utils/auth');

function extractToken(req) {
  const authorization = req.headers.authorization;

  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.slice(7);
  }

  return req.cookies?.[env.adminCookieName];
}

async function resolveAdminFromRequest(req) {
  const token = extractToken(req);

  if (!token) {
    return null;
  }

  let payload;

  try {
    payload = verifyAdminToken(token);
  } catch (error) {
    return null;
  }

  const admin = await prisma.admin.findUnique({
    where: { id: payload.sub }
  });

  if (!admin || !admin.isActive) {
    return null;
  }

  req.admin = sanitizeAdmin(admin);
  req.auth = payload;

  return admin;
}

async function requireAdminApi(req, res, next) {
  const admin = await resolveAdminFromRequest(req);

  if (!admin) {
    return next(new AppError(401, 'Authentication required.'));
  }

  return next();
}

async function requireAdminPage(req, res, next) {
  const admin = await resolveAdminFromRequest(req);

  if (!admin) {
    return res.redirect('/admin/login');
  }

  return next();
}

module.exports = {
  requireAdminApi,
  requireAdminPage,
  resolveAdminFromRequest
};
