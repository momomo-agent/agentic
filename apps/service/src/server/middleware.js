export function errorHandler(err, req, res, next) {
  console.error('Server error:', err);
  const status = err.status || 500;
  const type = status >= 500 ? 'server_error' : 'invalid_request_error';
  res.status(status).json({
    error: { message: err.message || 'Internal server error', type, code: err.code || null }
  });
}
