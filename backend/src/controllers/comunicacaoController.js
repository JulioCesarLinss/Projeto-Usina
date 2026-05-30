import * as comunicacaoModel from '../models/comunicacaoModel.js';
import * as notificacaoModel from '../models/notificacaoModel.js';
import * as destinatarioModel from '../models/destinatarioModel.js';
import * as anexoModel from '../models/anexoModel.js';
import { ValidationError, NotFoundError, DatabaseError } from '../utils/appError.js';

export const criarCI = async (req, res, next) => {
  try {
    const { titulo, estado, descricao, departamento_id, destinatarios } = req.body;
    const usuario_id = req.usuario.id;
    const data_hora = new Date();

    if (!titulo || !descricao || !departamento_id) {
      throw new ValidationError('Campos obrigatórios', 'CAMPOS_OBRIGATORIOS', []);
    }

    const estadoFinal = estado || 'rascunho';

    if (!['rascunho', 'enviada'].includes(estadoFinal)) {
      throw new ValidationError('Estado inválido', 'ESTADO_INVALIDO', []);
    }

    let resultado;
    try {
      resultado = await comunicacaoModel.criarComunicacao(titulo, data_hora, estadoFinal, descricao, usuario_id, departamento_id);
    } catch (err) {
      throw new DatabaseError('Erro ao criar comunicação', 'ERRO_CRIAR_COMUNICACAO');
    }

    // cria notificação automaticamente após criar a CI
    if (destinatarios && destinatarios.length > 0) {
    for (const dest of destinatarios) {
        await destinatarioModel.adicionarDestinatario(resultado.insertId, dest.usuario_id, dest.departamento_id);
        await notificacaoModel.criarNotificacao(
        `Nova C.I recebida: ${titulo}`,
        dest.usuario_id,
        resultado.insertId
        );
        }
    }

    res.status(201).json({
      sucesso: true,
      mensagem: 'Comunicação criada com sucesso',
      dados: { id: resultado.insertId, titulo, estado: estadoFinal }
    });

  } catch (err) {
    next(err);
  }
};

export const buscarCIporID = async (req, res, next) => {
    try{
        const { id } = req.params;
        if (!id || isNaN(id)){
            throw new ValidationError(
                'ID inválido',
                'ID_INVALIDO',
                [{mensagem: 'ID deve ser um número'}]
            );
        }
        let comunicacao;
        try{
            comunicacao = await comunicacaoModel.buscarCIporID(id);
        }catch (err){
            throw new DatabaseError(
                'Erro ao buscar comunicação',
                'ERRO_BUSCAR_COMUNICACAO'
            );
        }
        if (!comunicacao){
            throw new NotFoundError(
                'Comunicação não encontrada',
                'COMUNICAÇÃO_NAO_ENCONTRADA',
            );
        }
        res.status(200).json({
            sucesso: true,
            dados: comunicacao
        });
    } catch (err) {
        next(err);
    }
};

export const listarComunicacaoRecebidas = async (req,res,next) =>{
    try{
        const pagina = parseInt(req.query.pagina) || 1;
        const limite = parseInt(req.query.limite) || 20;
        const departamento_id = req.usuario.departamento_id;

        if (pagina < 1 || limite < 1){
            throw new ValidationError(
                'Página e limite maiores que 0',
                'PAGINACAO_INVALIDA',
                []
            );
        }

        // gerente (2) e master (1) veem CIs de todos os departamentos
        const verTodos = req.usuario.cargo_id <= 2;

        let comunicacao;
        try{
            comunicacao = await comunicacaoModel.listarCIRecebidas(
                departamento_id,
                pagina,
                limite,
                verTodos
            );
        }catch(err){
            throw new DatabaseError(
                'Erro ao listar comunicações',
                'ERRO_LISTAR_COMUNICACOES'
            );
        }

        res.status(200).json({
            sucesso: true,
            dados: comunicacao,
            paginacao: {
                pagina,
                limite,
                total: comunicacao.length
            }
        });
    }catch(err){
        next(err);
    }
};

export const listarComunicacaoEnviadas = async (req,res,next) =>{
    try{
        const pagina = parseInt(req.query.pagina) || 1;
        const limite = parseInt(req.query.limite) || 20;
        const usuario_id = req.usuario.id;

        if (pagina < 1 || limite < 1){
            throw new ValidationError(
                'Página e limite maiores que 0',
                'PAGINACAO_INVALIDA',
                []
            );
        }

        let comunicacao;
        try{
            comunicacao = await comunicacaoModel.listarCIEnviadas(
                usuario_id,
                pagina,
                limite
            );
        }catch(err){
            throw new DatabaseError(
                'Erro ao listar comunicações',
                'ERRO_LISTAR_COMUNICACOES'
            );
        }

        res.status(200).json({
            sucesso: true,
            dados: comunicacao,
            paginacao: {
                pagina,
                limite,
                total: comunicacao.length
            }
        });
    }catch(err){
        next(err);
    }
};

export const arquivarComunicacao = async (req, res, next) =>{
    try{
        const { id } = req.params;
        if (!id || isNaN(id)){
            throw new ValidationError(
                'ID inválido',
                'ID_INVALIDO',
                [{mensagem: 'ID deve ser um número'}]
            );
        }
        let comunicacaoExistente;

        try{
            comunicacaoExistente = await comunicacaoModel.buscarCIporID(id);
        }catch(err){
            throw new DatabaseError(
                'Erro ao buscar comunicação',
                'ERRO_BUSCAR_COMUNICACAO'
            );
        }

        if(!comunicacaoExistente){
            throw new NotFoundError(
                'Comunicação não encontrada',
                'COMUNICACAO_NAO_ENCONTRADA'
            );
        }

        try{
            await comunicacaoModel.arquivarCI(id);
        }catch(err){
            throw new DatabaseError(
                'Erro ao arquivar CI',
                'ERRO_ARQUIVAR_CI'
            );
        }
        res.status(200).json({
                sucesso: true,
                mensagem: 'Comunicação arquivada com sucesso',
                dados: {id}
            });
    }catch(err){
        next(err);
    }
};

export const listarAnexosCI = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id || isNaN(id)) {
            throw new ValidationError('ID inválido', 'ID_INVALIDO', [{ mensagem: 'ID deve ser um número' }]);
        }
        const anexos = await anexoModel.listarAnexosPorCI(id);
        res.status(200).json({ sucesso: true, dados: anexos });
    } catch (err) {
        next(err);
    }
};