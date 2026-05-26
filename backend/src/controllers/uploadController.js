import { AppError } from '../utils/appError.js';
import { processarArquivo } from '../services/uploadService.js';

export const uploadFile = (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Arquivo vazio não é permitido', 400, 'upload', 'ARQUIVO_VAZIO');
    }

    if (req.file.size === 0) {
      throw new AppError('Arquivo vazio não é permitido', 400, 'upload', 'ARQUIVO_VAZIO');
    }

    const resultado = processarArquivo(req.file);
    return res.status(200).json({ sucesso: true, dados: resultado });
  } catch (err) {
    next(err);
  }
};