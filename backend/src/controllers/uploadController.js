import { AppError } from '../utils/appError.js';
import { processarArquivo } from '../services/uploadService.js';
import * as anexoModel from '../models/anexoModel.js';

export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Arquivo vazio não é permitido', 400, 'upload', 'ARQUIVO_VAZIO');
    }

    if (req.file.size === 0) {
      throw new AppError('Arquivo vazio não é permitido', 400, 'upload', 'ARQUIVO_VAZIO');
    }

    const comunicacao_id = req.body.comunicacao_id;
    if (!comunicacao_id) {
      throw new AppError('comunicacao_id é obrigatório', 400, 'upload', 'CI_ID_AUSENTE');
    }

    const resultado = processarArquivo(req.file);
    await anexoModel.salvarAnexo(
      comunicacao_id,
      resultado.nome,
      resultado.caminho,
      resultado.tipo,
      resultado.tamanho
    );

    return res.status(200).json({ sucesso: true, dados: resultado });
  } catch (err) {
    next(err);
  }
};