export function authMiddleware(apiKey) {
  return (req, res, next) => {
    if (!apiKey) return next();
    if (req.path === '/health' || req.path.startsWith('/admin')) return next();

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { message: 'Missing or invalid API key', type: 'authentication_error', code: null }
      });
    }

    const token = auth.slice(7);
    if (token !== apiKey) {
      return res.status(401).json({
        error: { message: 'Invalid API key', type: 'authentication_error', code: null }
      });
    }

    next();
  };
}

export function errorHandler(err, req, res, next) {
  console.error('Server error:', err);
  const status = err.status || 500;
  const type = status >= 500 ? 'server_error' : 'invalid_request_error';
  res.status(status).json({
    error: { message: err.message || 'Internal server error', type, code: err.code || null }
  });
}
