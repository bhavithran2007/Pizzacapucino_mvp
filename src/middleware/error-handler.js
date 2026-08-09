const { ZodError } = require('zod');
const AppError = require('../utils/app-error');

function notFound(req, res) {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      message: 'Route not found.'
    });
  }

  return res.status(404).send('Page not found.');
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed.',
      details: error.flatten()
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details || null
    });
  }

  console.error(error);

  return res.status(500).json({
    message: 'Something went wrong on the server.'
  });
}

module.exports = {
  errorHandler,
  notFound
};
