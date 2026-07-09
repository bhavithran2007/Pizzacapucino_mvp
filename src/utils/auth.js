const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAdminToken(admin) {
  return jwt.sign(
    {
      sub: admin.id,
      role: admin.role,
      username: admin.username
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn
    }
  );
}

function verifyAdminToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function sanitizeAdmin(admin) {
  return {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    fullName: admin.fullName,
    role: admin.role,
    isActive: admin.isActive,
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt
  };
}

module.exports = {
  sanitizeAdmin,
  signAdminToken,
  verifyAdminToken
};
