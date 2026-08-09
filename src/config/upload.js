const multer = require('multer');

// Free hosts like Render wipe local disk on every deploy/restart, so uploaded
// files are kept in memory here and pushed to Cloudinary (see cloudinary.js)
// instead of being written to disk. This keeps menu images working across
// redeploys without needing a paid persistent volume.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

module.exports = upload;
