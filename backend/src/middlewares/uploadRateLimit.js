import rateLimit from 'express-rate-limit';

export const uploadRateLimit = rateLimit({

  windowMs: 1 * 60 * 1000,

  max: 20,

  message: {
    sucesso: false,
    tipo: 'upload',
    erro: 'Muitas tentativas de upload',
    codigo: 'RATE_LIMIT_UPLOAD'
  }
});