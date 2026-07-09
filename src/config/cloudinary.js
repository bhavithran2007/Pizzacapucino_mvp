const cloudinary = require('cloudinary').v2;
const env = require('./env');

const isConfigured = Boolean(env.cloudinaryUrl || (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret));

if (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret
  });
}
// If CLOUDINARY_URL is set instead, the SDK picks it up from the environment automatically.

/**
 * Uploads an in-memory file buffer (from multer memoryStorage) to Cloudinary
 * and returns the public HTTPS URL to store in the database.
 */
function uploadMenuImageBuffer(file) {
  if (!isConfigured) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET) in your environment.'
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'pizzacapucino/menu',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        return resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
}

module.exports = { uploadMenuImageBuffer, isCloudinaryConfigured: isConfigured };
