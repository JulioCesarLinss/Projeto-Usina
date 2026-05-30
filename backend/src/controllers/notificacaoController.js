import * as notificacaoModel from '../models/notificacaoModel.js';
import { ValidationError, NotFoundError, DatabaseError } from '../utils/appError.js';

export const criarNotificacao = async (req, res, next) => {
  try {
    const { mensagem, usuario_id, comunicacao_id } = req.body;

    if (!mensagem || !usuario_id || !comunicacao_id) {
      throw new ValidationError('Campos obrigatórios', 'CAMPOS_OBRIGATORIOS', []);
    }

    let resultado;
    try {
      resultado = await notificacaoModel.criarNotificacao(mensagem, usuario_id, comunicacao_id);
    } catch (err) {
      throw new DatabaseError('Erro ao criar notificação', 'ERRO_CRIAR_NOTIFICACAO');
    }

    res.status(201).json({
      sucesso: true,
      mensagem: 'Notificação criada com sucesso',
      dados: { id: resultado.insertId }
    });

  } catch (err) {
    next(err);
  }
};

export const listarNotificacoes = async (req, res, next) => {
  try {
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 20;
    const usuario_id = req.usuario.id;

    if (pagina < 1 || limite < 1) {
      throw new ValidationError('Página e limite maiores que 0', 'PAGINACAO_INVALIDA', []);
    }

    let notificacoes;
    try {
      notificacoes = await notificacaoModel.listarNotificacoes(usuario_id, pagina, limite);
    } catch (err) {
      throw new DatabaseError('Erro ao listar notificações', 'ERRO_LISTAR_NOTIFICACOES');
    }

    res.status(200).json({
      sucesso: true,
      dados: notificacoes,
      paginacao: { pagina, limite, total: notificacoes.length }
    });

  } catch (err) {
    next(err);
  }
};

export const marcarComoLida = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usuario_id = req.usuario.id;

    if (!id || isNaN(id)) {
      throw new ValidationError('ID inválido', 'ID_INVALIDO', [{ mensagem: 'ID deve ser um número' }]);
    }

    try {
      await notificacaoModel.marcarComoLida(id, usuario_id);
    } catch (err) {
      throw new DatabaseError('Erro ao marcar notificação', 'ERRO_MARCAR_NOTIFICACAO');
    }

    res.status(200).json({ sucesso: true, mensagem: 'Notificação marcada como lida' });

  } catch (err) {
    next(err);
  }
};

export const marcarPorComunicacao = async (req, res, next) => {
  try {
    const { comunicacao_id } = req.params;
    const usuario_id = req.usuario.id;
    if (!comunicacao_id || isNaN(comunicacao_id)) {
      throw new ValidationError('ID inválido', 'ID_INVALIDO', []);
    }
    await notificacaoModel.marcarPorComunicacao(comunicacao_id, usuario_id);
    res.status(200).json({ sucesso: true, mensagem: 'Notificação da CI marcada como lida' });
  } catch (err) {
    next(err);
  }
};

export const marcarTodasComoLidas = async (req, res, next) => {
  try {
    const usuario_id = req.usuario.id;

    try {
      await notificacaoModel.marcarTodasComoLidas(usuario_id);
    } catch (err) {
      throw new DatabaseError('Erro ao marcar notificações', 'ERRO_MARCAR_NOTIFICACOES');
    }

    res.status(200).json({ sucesso: true, mensagem: 'Todas notificações marcadas como lidas' });

  } catch (err) {
    next(err);
  }
};