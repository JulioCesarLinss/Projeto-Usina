import { AppError } from '../utils/appError.js';
import { processarArquivo } from '../services/uploadService.js';
import * as anexoModel from '../models/anexoModel.js';
import * as comunicacaoModel from '../models/comunicacaoModel.js';
import * as destinatarioModel from '../models/destinatarioModel.js';
import { podeAcessarConteudoCI } from '../middlewares/acessoCIMiddleware.js';
import { AuthorizationError, NotFoundError } from '../utils/appError.js';
import path from 'path';
import { fileURLToPath } from 'url';

const pastaUploads = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads');

// Entrega um anexo somente a quem pode ler a C.I. dona dele
export const baixarAnexoProtegido = async (req, res, next) => {
  try {
    const arquivo = path.basename(req.params.arquivo);
    const anexo = await anexoModel.buscarAnexoPorCaminho(`/uploads/${arquivo}`);
    if (!anexo) throw new NotFoundError('Arquivo não encontrado', 'ARQUIVO_NAO_ENCONTRADO');

    const ci = await comunicacaoModel.buscarCIporID(anexo.comunicacao_id);
    const destinatarios = await destinatarioModel.listarDestinatariosPorCI(anexo.comunicacao_id);
    if (!ci || !podeAcessarConteudoCI(req.usuario, ci, destinatarios))
      throw new AuthorizationError('Sem permissão para este arquivo', 'ACESSO_NEGADO');

    res.sendFile(path.join(pastaUploads, arquivo));
  } catch (err) {
    next(err);
  }
};

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