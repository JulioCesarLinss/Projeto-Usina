import * as destinatarioModel from '../models/destinatarioModel.js';
import * as comunicacaoModel from '../models/comunicacaoModel.js';
import { ValidationError, NotFoundError, DatabaseError } from '../utils/appError.js';

export const adicionarDestinatario = async (req, res, next) => {
  try {
    const { comunicacao_id, usuario_id, departamento_id } = req.body;

    if (!comunicacao_id || !usuario_id && !departamento_id) {
      throw new ValidationError('Campos obrigatórios', 'CAMPOS_OBRIGATORIOS', []);
    }

    // verifica se a comunicação existe
    let comunicacao;
    try {
      comunicacao = await comunicacaoModel.buscarCIporID(comunicacao_id);
    } catch (err) {
      throw new DatabaseError('Erro ao buscar comunicação', 'ERRO_BUSCAR_COMUNICACAO');
    }

    if (!comunicacao) {
      throw new NotFoundError('Comunicação não encontrada', 'COMUNICACAO_NAO_ENCONTRADA');
    }

    try {
      await destinatarioModel.adicionarDestinatario(comunicacao_id, usuario_id, departamento_id);
    } catch (err) {
      throw new DatabaseError('Erro ao adicionar destinatário', 'ERRO_ADICIONAR_DESTINATARIO');
    }

    res.status(201).json({
      sucesso: true,
      mensagem: 'Destinatário adicionado com sucesso'
    });

  } catch (err) {
    next(err);
  }
};

export const listarDestinatariosPorCI = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 20;

    if (!id || isNaN(id)) {
      throw new ValidationError('ID inválido', 'ID_INVALIDO', [{ mensagem: 'ID deve ser um número' }]);
    }

    let destinatarios;
    try {
      destinatarios = await destinatarioModel.listarDestinatariosPorCI(id, pagina, limite);
    } catch (err) {
      throw new DatabaseError('Erro ao listar destinatários', 'ERRO_LISTAR_DESTINATARIOS');
    }

    res.status(200).json({
      sucesso: true,
      dados: destinatarios,
      paginacao: { pagina, limite, total: destinatarios.length }
    });

  } catch (err) {
    next(err);
  }
};

export const verificarDestinatario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usuario_id = req.usuario.id;

    if (!id || isNaN(id)) {
      throw new ValidationError('ID inválido', 'ID_INVALIDO', [{ mensagem: 'ID deve ser um número' }]);
    }

    let destinatario;
    try {
      destinatario = await destinatarioModel.verificarDestinatario(id, usuario_id);
    } catch (err) {
      throw new DatabaseError('Erro ao verificar destinatário', 'ERRO_VERIFICAR_DESTINATARIO');
    }

    res.status(200).json({
      sucesso: true,
      destinatario: destinatario ? true : false
    });

  } catch (err) {
    next(err);
  }
};