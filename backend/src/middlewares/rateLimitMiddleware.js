const requestCounts = new Map();
const loginAttempts = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetTime) requestCounts.delete(key);
  }
  for (const [key, data] of loginAttempts.entries()) {
    if (now > data.resetTime) loginAttempts.delete(key);
  }
}, 5 * 60 * 1000);

const getClientIP = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    'unknown'
  );
};

export const rateLimiter = (options = {}) => {
  const { windowMs = 60000, max = 100 } = options;

  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();

    const ip = getClientIP(req);
    const now = Date.now();
    const record = requestCounts.get(ip);

    if (!record || now > record.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count++;
    if (record.count > max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return res.status(429).json({
        sucesso: false,
        tipo: 'rate-limit',
        erro: 'Muitas requisições. Tente novamente em instantes.',
        codigo: 'RATE_LIMIT_EXCEDIDO',
        retryAfter
      });
    }
    next();
  };
};

export const loginRateLimiter = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();

  const ip = getClientIP(req);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  record.count++;
  if (record.count > maxAttempts) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return res.status(429).json({
      sucesso: false,
      tipo: 'rate-limit',
      erro: `Muitas tentativas. Aguarde ${Math.ceil(retryAfter / 60)} minuto(s).`,
      codigo: 'LOGIN_BLOQUEADO',
      retryAfter
    });
  }
  next();
};

export const registrarFalhaLogin = (req) => {
  if (process.env.NODE_ENV === 'test') return;

  const ip = getClientIP(req);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const record = loginAttempts.get(ip);
  if (record && now <= record.resetTime) {
    record.count = Math.min(record.count + 1, 10);
  } else {
    loginAttempts.set(ip, { count: 2, resetTime: now + windowMs });
  }
};