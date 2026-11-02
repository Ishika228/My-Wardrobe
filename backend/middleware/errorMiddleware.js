/**
 * Middleware to handle 404 - Not Found routes
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Resource not found: ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Centralized error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Respect err.statusCode if specified on error, otherwise check res.statusCode or default to 500
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};
