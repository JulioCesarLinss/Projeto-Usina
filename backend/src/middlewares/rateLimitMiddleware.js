import jwt from 'jsonwebtoken';

// Limites de requisições (em memória).
// Numa empresa, vários computadores costumam sair pelo MESMO IP público. Por isso:
//  • o limite geral conta por USUÁRIO logado (token válido) e só usa o IP para quem não está logado;
//  • o login conta tentativas por CONTA (e-mail) + IP, com um teto geral por IP bem mais alto.
// Os valores podem ser ajustados pelo .env sem mudar o código.

const requestCounts = new Map();
const loginAttempts = new Map();

const num = (v, padrao) => parseInt(v) > 0 ? parseInt(v) : padrao;
const LIMITE_POR_USUARIO_MIN = num(process.env.RATE_LIMIT_USUARIO, 120);  // por usuário logado, por minuto
const LIMITE_POR_IP_MIN = num(process.env.RATE_LIMIT_IP, 600);            // por IP sem login, por minuto
const LOGIN_POR_CONTA = num(process.env.RATE_LOGIN_CONTA, 5);             // por e-mail + IP, a cada 15 min
const LOGIN_POR_IP = num(process.env.RATE_LOGIN_IP, 300);                 // teto por IP, a cada 15 min

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

// usuário do token (só se a assinatura for válida, para ninguém inventar ids e fugir do limite)
const usuarioDoToken = (req) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ') || !process.env.JWT_SECRET) return null;
  try {
    const { id } = jwt.verify(auth.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
    return id || null;
  } catch {
    return null;
  }
};

// conta uma requisição na chave; devolve os segundos de espera se passou do limite
const contar = (mapa, chave, max, windowMs) => {
  const now = Date.now();
  const record = mapa.get(chave);
  if (!record || now > record.resetTime) {
    mapa.set(chave, { count: 1, resetTime: now + windowMs });
    return 0;
  }
  record.count++;
  return record.count > max ? Math.ceil((record.resetTime - now) / 1000) : 0;
};

export const rateLimiter = (options = {}) => {
  const { windowMs = 60000 } = options;

  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();

    const usuarioId = usuarioDoToken(req);
    const espera = usuarioId
      ? contar(requestCounts, 'u:' + usuarioId, LIMITE_POR_USUARIO_MIN, windowMs)
      : contar(requestCounts, 'ip:' + getClientIP(req), LIMITE_POR_IP_MIN, windowMs);

    if (espera) {
      return res.status(429).json({
        sucesso: false,
        tipo: 'rate-limit',
        erro: 'Muitas requisições. Tente novamente em instantes.',
        codigo: 'RATE_LIMIT_EXCEDIDO',
        retryAfter: espera
      });
    }
    next();
  };
};

export const loginRateLimiter = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();

  const ip = getClientIP(req);
  const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 150);
  const windowMs = 15 * 60 * 1000;

  // teto geral do IP (protege contra tentar muitas contas diferentes)
  const esperaIP = contar(loginAttempts, 'ip:' + ip, LOGIN_POR_IP, windowMs);
  // tentativas na mesma conta, a partir do mesmo IP
  const esperaConta = email ? contar(loginAttempts, `conta:${ip}:${email}`, LOGIN_POR_CONTA, windowMs) : 0;
  const espera = Math.max(esperaIP, esperaConta);

  if (espera) {
    return res.status(429).json({
      sucesso: false,
      tipo: 'rate-limit',
      erro: `Muitas tentativas. Aguarde ${Math.ceil(espera / 60)} minuto(s).`,
      codigo: 'LOGIN_BLOQUEADO',
      retryAfter: espera
    });
  }
  next();
};

export const registrarFalhaLogin = (req) => {
  if (process.env.NODE_ENV === 'test') return;

  const ip = getClientIP(req);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const record = loginAttempts.get('ip:' + ip);
  if (record && now <= record.resetTime) {
    record.count = Math.min(record.count + 1, LOGIN_POR_IP);
  } else {
    loginAttempts.set('ip:' + ip, { count: 2, resetTime: now + windowMs });
  }
};
