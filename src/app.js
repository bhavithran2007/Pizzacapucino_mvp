const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const apiRoutes = require('./routes');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error-handler');
const { requireAdminPage, resolveAdminFromRequest } = require('./middleware/auth');

const app = express();
const projectRoot = path.resolve(__dirname, '..');

const allowedOrigins = env.corsOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS.'));
    },
    credentials: true
  })
);

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/assets', express.static(path.join(projectRoot, 'assets')));
app.use('/admin-assets', express.static(path.join(projectRoot, 'admin', 'assets')));
// Menu images are uploaded to Cloudinary (see src/config/cloudinary.js) and
// served from Cloudinary's CDN, so there's no local /uploads static route
// needed anymore — this avoids losing images on every free-tier redeploy.

app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

app.get('/menu.html', (req, res) => {
  res.sendFile(path.join(projectRoot, 'menu.html'));
});

app.get('/aboutus.html', (req, res) => {
  res.sendFile(path.join(projectRoot, 'aboutus.html'));
});

app.get('/reserve.html', (req, res) => {
  res.sendFile(path.join(projectRoot, 'reserve.html'));
});

app.get('/admin/login', async (req, res, next) => {
  try {
    const admin = await resolveAdminFromRequest(req);

    if (admin) {
      return res.redirect('/admin');
    }

    return res.sendFile(path.join(projectRoot, 'admin', 'login.html'));
  } catch (error) {
    return next(error);
  }
});

app.get('/admin', requireAdminPage, (req, res) => {
  res.sendFile(path.join(projectRoot, 'admin', 'index.html'));
});

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
