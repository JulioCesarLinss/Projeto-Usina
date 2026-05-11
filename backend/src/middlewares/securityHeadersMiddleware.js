export const securityHeaders = (req, res, next ) => {
    res.setHeader('X-Frame-Options', 'DENY');

    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

   res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

   res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; connect-src 'self'; frame-ancestors 'none'");

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    res.removeHeader('X-Powered-By');

    if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }
  next();
};

