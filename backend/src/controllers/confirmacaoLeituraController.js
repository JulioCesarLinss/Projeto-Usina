import * as confirmacaoModel from '../models/confirmacaoLeituraModel.js';
import * as comunicacaoModel from '../models/comunicacaoModel.js';
import { ValidationError, NotFoundError, ConflictError, DatabaseError } from '../utils/appError.js';
import { registrarLog, getClientIP } from '../middlewares/auditMiddleware.js';

export const confirmarLeitura = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usuario_id = req.usuario.id;

    if (!id || isNaN(id)) {
      throw new ValidationError(
        'ID inválido',
        'ID_INVALIDO',
        [{ mensagem: 'ID deve ser um número' }]
      );
    }

    // verifica se a comunicação existe
    let comunicacao;
    try {
      comunicacao = await comunicacaoModel.buscarCIporID(id);
    } catch (err) {
      throw new DatabaseError('Erro ao buscar comunicação', 'ERRO_BUSCAR_COMUNICACAO');
    }

    if (!comunicacao) {
      throw new NotFoundError('Comunicação não encontrada', 'COMUNICACAO_NAO_ENCONTRADA');
    }

    // verifica se já confirmou
    const jaConfirmou = await confirmacaoModel.buscarConfirmacao(id, usuario_id);
    if (jaConfirmou) {
      throw new ConflictError('Leitura já confirmada', 'LEITURA_JA_CONFIRMADA');
    }

    // registra a confirmação
    try {
      await confirmacaoModel.confirmarLeitura(id, usuario_id);
    } catch (err) {
      throw new DatabaseError('Erro ao confirmar leitura', 'ERRO_CONFIRMAR_LEITURA');
    }

    await registrarLog(usuario_id, 'CI_LEITURA_CONFIRMADA', getClientIP(req), parseInt(id));

    res.status(201).json({
      sucesso: true,
      mensagem: 'Leitura confirmada com sucesso'
    });

  } catch (err) {
    next(err);
  }
};

export const listarConfirmacoesPorCI = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      throw new ValidationError(
        'ID inválido',
        'ID_INVALIDO',
        [{ mensagem: 'ID deve ser um número' }]
      );
    }

    let confirmacoes;
    try {
      confirmacoes = await confirmacaoModel.listarConfirmacoesPorCI(id);
    } catch (err) {
      throw new DatabaseError('Erro ao listar confirmações', 'ERRO_LISTAR_CONFIRMACOES');
    }

    res.status(200).json({
      sucesso: true,
      dados: confirmacoes,
      total: confirmacoes.length
    });

  } catch (err) {
    next(err);
  }
};