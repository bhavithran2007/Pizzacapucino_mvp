const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(process.cwd(), '.env')
});

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/pizzacapucino_mvp',
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  adminCookieName: process.env.ADMIN_COOKIE_NAME || 'admin_token',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4000',
  restaurantName: process.env.RESTAURANT_NAME || 'Pizza Capucino',
  publicUpiQrUrl: process.env.PUBLIC_UPI_QR_URL || '',
  whatsappBookingNumber: process.env.WHATSAPP_BOOKING_NUMBER || '+918680986888',
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || ''
};

module.exports = env;
