const config = require('../../config');

/**
 * 404 handler — attach before errorHandler
 */
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
}

/**
 * Central error handler
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const isDev = config.server.env === 'development';

  console.error(`[${new Date().toISOString()}] ERROR:`, err.message);
  if (isDev) console.error(err.stack);

  // Axios / network errors from ABR service
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return res.status(504).json({
      success: false,
      message: 'ABN Lookup service timed out. Please try again.',
    });
  }

  if (err.response?.status) {
    return res.status(502).json({
      success: false,
      message: 'ABN Lookup service returned an error.',
      ...(isDev && { upstream: err.response.status }),
    });
  }

  // ABR-level error messages (e.g. invalid GUID)
  if (err.message?.toLowerCase().includes('guid') ||
      err.message?.toLowerCase().includes('authentication')) {
    return res.status(401).json({
      success: false,
      message: 'ABN Lookup authentication failed. Check your GUID.',
    });
  }

  const status = err.status || 500;
  return res.status(status).json({
    success: false,
    message: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
}

module.exports = { notFound, errorHandler };
