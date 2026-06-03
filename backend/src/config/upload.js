import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../utils/appError.js';

fs.mkdirSync('uploads/fotos', { recursive: true });

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_FILENAME_LENGTH = 120;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg'
];
const FORBIDDEN_EXTENSIONS = ['.exe'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => {
    const nome = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${Date.now()}-${nome}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (file.originalname.length > MAX_FILENAME_LENGTH) {
      return cb(new AppError('Nome do arquivo muito grande não é permitido', 400, 'upload', 'NOME_ARQUIVO_GRANDE'));
    }

    if (FORBIDDEN_EXTENSIONS.includes(ext)) {
      return cb(new AppError('Arquivos .exe não são permitidos', 400, 'upload', 'EXTENSAO_PROIBIDA'));
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new AppError('Apenas PDF e Excel são permitidos para upload', 400, 'upload', 'TIPO_ARQUIVO_INVALIDO'));
    }

    cb(null, true);
  }
});

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
  return (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown');
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
      return res.status(429).json({ sucesso: false, tipo: 'rate-limit', erro: 'Muitas requisições. Tente novamente em instantes.', codigo: 'RATE_LIMIT_EXCEDIDO', retryAfter });
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
    return res.status(429).json({ sucesso: false, tipo: 'rate-limit', erro: `Muitas tentativas. Aguarde ${Math.ceil(retryAfter / 60)} minuto(s).`, codigo: 'LOGIN_BLOQUEADO', retryAfter });
  }
  next();
};

export const uploadRateLimit = rateLimiter({ windowMs: 1 * 60 * 1000, max: 20 });

export default upload;

const uploadFoto = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/fotos'),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `foto-${req.params.id}-${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype)) {
      return cb(new AppError('Apenas JPG e PNG são permitidos', 400, 'upload', 'TIPO_INVALIDO'));
    }
    cb(null, true);
  }
});
export const uploadFotoMiddleware = uploadFoto.single('foto');
