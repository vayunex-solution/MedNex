'use strict';

module.exports = (req, res, next) => {
  // 1. Content Security Policy (CSP)
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none';");

  // 2. HTTP Strict Transport Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // 3. X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');

  // 4. Referrer-Policy
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');

  // 5. X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 6. Permissions-Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');

  // 7. Cross-Origin-Opener-Policy (COOP) - Disabled to allow standard cross-domain operations
  // res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // 8. Cross-Origin-Embedder-Policy (COEP) - Disabled to allow standard cross-domain operations
  // res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');

  // 9. Cross-Origin-Resource-Policy (CORP)
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  next();
};
