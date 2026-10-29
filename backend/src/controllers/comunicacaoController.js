import * as comunicacaoModel from '../models/comunicacaoModel.js';
import * as notificacaoModel from '../models/notificacaoModel.js';
import * as destinatarioModel from '../models/destinatarioModel.js';
import * as anexoModel from '../models/anexoModel.js';
import * as usuarioModel from '../models/usuarioModel.js';
import * as comentarioModel from '../models/comentarioModel.js';
import * as aprovacaoService from '../services/aprovacaoService.js';
import { ValidationError, NotFoundError, DatabaseError, AuthorizationError } from '../utils/appError.js';
import { registrarLog, getClientIP } from '../middlewares/auditMiddleware.js';

export const criarCI = async (req, res, next) => {
  try {
    const { titulo, estado, descricao, departamento_id, destinatarios, em_nome_de_id } = req.body;
    const usuario_id = req.usuario.id;
    const data_hora = new Date();

    if (!titulo || !descricao || !departamento_id) {
      throw new ValidationError('Campos obrigatórios', 'CAMPOS_OBRIGATORIOS', []);
    }

    const estadoPedido = estado || 'rascunho';
    if (!['rascunho', 'enviada'].includes(estadoPedido)) {
      throw new ValidationError('Estado inválido', 'ESTADO_INVALIDO', []);
    }

    // enviar "em nome de" um gerente exige a aprovação dele antes de qualquer envio
    const gerente = em_nome_de_id ? await aprovacaoService.validarGerente(em_nome_de_id, req.usuario) : null;
    const estadoFinal = (estadoPedido === 'enviada' && gerente) ? 'aguardando_aprovacao' : estadoPedido;

    let resultado;
    try {
      resultado = await comunicacaoModel.criarComunicacao(titulo, data_hora, estadoFinal, descricao, usuario_id, departamento_id, gerente ? gerente.id : null);
    } catch (err) {
      throw new DatabaseError('Erro ao criar comunicação', 'ERRO_CRIAR_COMUNICACAO');
    }

    if (estadoFinal === 'enviada') {
      await aprovacaoService.salvarDestinatarios(resultado.insertId, destinatarios, departamento_id, usuario_id);
      await aprovacaoService.notificarDestinatarios(resultado.insertId, titulo);
      await registrarLog(usuario_id, 'Envio de C.I', getClientIP(req), resultado.insertId);
    } else if (estadoFinal === 'aguardando_aprovacao') {
      await aprovacaoService.salvarDestinatarios(resultado.insertId, destinatarios, departamento_id, usuario_id);
      await notificacaoModel.criarNotificacao(`Aprovação pendente: ${titulo}`, gerente.id, resultado.insertId);
      await registrarLog(usuario_id, 'Envio para aprovação do gerente', getClientIP(req), resultado.insertId);
    }

    res.status(201).json({
      sucesso: true,
      mensagem: estadoFinal === 'aguardando_aprovacao'
        ? 'Comunicação enviada para aprovação do gerente'
        : 'Comunicação criada com sucesso',
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
        const filtro_departamento_id = req.query.departamento_filtro ? parseInt(req.query.departamento_filtro) : null;
        const apenasNaoLidas = req.query.nao_lida === '1';

        let comunicacao, total;
        try{
            [comunicacao, total] = await Promise.all([
                comunicacaoModel.listarCIRecebidas(departamento_id, req.usuario.id, pagina, limite, verTodos, filtro_departamento_id, apenasNaoLidas),
                comunicacaoModel.contarCIRecebidas(departamento_id, req.usuario.id, verTodos, filtro_departamento_id, apenasNaoLidas)
            ]);
        }catch(err){
            throw new DatabaseError(
                'Erro ao listar comunicações',
                'ERRO_LISTAR_COMUNICACOES'
            );
        }

        res.status(200).json({
            sucesso: true,
            dados: comunicacao,
            paginacao: { pagina, limite, total }
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

        const filtro_departamento_id = req.query.departamento_filtro ? parseInt(req.query.departamento_filtro) : null;
        let comunicacao, total;
        try{
            [comunicacao, total] = await Promise.all([
                comunicacaoModel.listarCIEnviadas(usuario_id, pagina, limite, filtro_departamento_id),
                comunicacaoModel.contarCIEnviadas(usuario_id, filtro_departamento_id)
            ]);
        }catch(err){
            throw new DatabaseError(
                'Erro ao listar comunicações',
                'ERRO_LISTAR_COMUNICACOES'
            );
        }

        res.status(200).json({
            sucesso: true,
            dados: comunicacao,
            paginacao: { pagina, limite, total }
        });
    }catch(err){
        next(err);
    }
};

export const listarCIsArquivadas = async (req, res, next) => {
  try {
    const { id: usuario_id, departamento_id } = req.usuario;
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 20;
    const [cis, total] = await Promise.all([
      comunicacaoModel.listarCIsArquivadas(usuario_id, departamento_id, pagina, limite),
      comunicacaoModel.contarCIsArquivadas(usuario_id, departamento_id)
    ]);
    res.status(200).json({ sucesso: true, dados: cis, paginacao: { pagina, limite, total } });
  } catch (err) { next(err); }
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
        await registrarLog(req.usuario.id, 'C.I Arquivada', getClientIP(req), parseInt(id));
        res.status(200).json({
                sucesso: true,
                mensagem: 'Comunicação arquivada com sucesso',
                dados: {id}
            });
    }catch(err){
        next(err);
    }
};

// buscarCIsComFiltros — recebe parâmetros via query string e repassa ao model buscarCIs.
// Respeita o nível do usuário: gerente/master veem tudo, demais só o próprio departamento.
export const buscarCIsComFiltros = async (req, res, next) => {
    try {
        const { busca, estado, data_inicio, data_fim, tipo, pagina, limite } = req.query;
        const verTodos = req.usuario.cargo_id <= 2;

        const resultado = await comunicacaoModel.buscarCIs({
            tipo: tipo || 'recebidas',
            departamento_id: req.usuario.departamento_id,
            usuario_id: req.usuario.id,
            verTodos,
            usina_id: req.usuario.usina_id,
            busca,
            estado,
            data_inicio,
            data_fim,
            pagina: parseInt(pagina) || 1,
            limite: parseInt(limite) || 20
        });

        res.status(200).json({
            sucesso: true,
            dados: resultado,
            paginacao: { pagina: parseInt(pagina) || 1, limite: parseInt(limite) || 20, total: resultado.length }
        });
    } catch (err) {
        next(err);
    }
};

// listarRascunhos — retorna os rascunhos do usuário logado para exibir na página Nova C.I
export const listarRascunhos = async (req, res, next) => {
  try {
    const rascunhos = await comunicacaoModel.listarRascunhos(req.usuario.id);
    res.status(200).json({ sucesso: true, dados: rascunhos });
  } catch (err) {
    next(err);
  }
};

export const deletarRascunho = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) throw new ValidationError('ID inválido', 'ID_INVALIDO', []);
    const result = await comunicacaoModel.deletarRascunho(id, req.usuario.id);
    if (result.affectedRows === 0)
      throw new ValidationError('Rascunho não encontrado ou sem permissão', 'NAO_ENCONTRADO', []);
    res.status(200).json({ sucesso: true, mensagem: 'Rascunho excluído' });
  } catch (err) {
    next(err);
  }
};

// atualizarCI — o AUTOR edita um rascunho ou uma C.I. com ajustes solicitados
// (pode manter, enviar ou reenviar para aprovação)
export const atualizarCI = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { titulo, descricao, departamento_id, estado, destinatarios, em_nome_de_id } = req.body;

    if (!id || isNaN(id)) throw new ValidationError('ID inválido', 'ID_INVALIDO', []);
    if (!titulo || !descricao || !departamento_id) throw new ValidationError('Campos obrigatórios', 'CAMPOS_OBRIGATORIOS', []);

    const ci = await comunicacaoModel.buscarCIporID(id);
    if (!ci) throw new NotFoundError('Comunicação não encontrada', 'COMUNICACAO_NAO_ENCONTRADA');
    if (ci.usuario_id !== req.usuario.id)
      throw new AuthorizationError('Somente o autor pode editar a C.I.', 'ACESSO_NEGADO');
    if (!['rascunho', 'ajustes_solicitados'].includes(ci.estado))
      throw new ValidationError('Esta C.I. não pode mais ser editada', 'CI_NAO_EDITAVEL', []);

    const estadoPedido = estado || 'rascunho';
    if (!['rascunho', 'enviada'].includes(estadoPedido))
      throw new ValidationError('Estado inválido', 'ESTADO_INVALIDO', []);

    const idGerente = em_nome_de_id !== undefined ? em_nome_de_id : ci.em_nome_de_id;
    const gerente = idGerente ? await aprovacaoService.validarGerente(idGerente, req.usuario) : null;
    const veioDeAjuste = ci.estado === 'ajustes_solicitados';

    // salvar sem enviar não faz uma C.I. em ajuste voltar a ser rascunho
    let estadoFinal = estadoPedido;
    if (estadoPedido === 'enviada') estadoFinal = gerente ? 'aguardando_aprovacao' : 'enviada';
    else if (veioDeAjuste) estadoFinal = 'ajustes_solicitados';

    // guarda o texto anterior para o gerente ver o que mudou
    if (veioDeAjuste) await comunicacaoModel.salvarVersaoAtual(id, req.usuario.id);

    await comunicacaoModel.atualizarCI(id, titulo, descricao, departamento_id, estadoFinal, gerente ? gerente.id : null);

    if (estadoFinal === 'enviada') {
      await aprovacaoService.salvarDestinatarios(parseInt(id), destinatarios, departamento_id, req.usuario.id);
      await aprovacaoService.notificarDestinatarios(parseInt(id), titulo);
      await registrarLog(req.usuario.id, 'Envio de C.I', getClientIP(req), parseInt(id));
    } else if (estadoFinal === 'aguardando_aprovacao') {
      await aprovacaoService.salvarDestinatarios(parseInt(id), destinatarios, departamento_id, req.usuario.id);
      if (veioDeAjuste)
        await comentarioModel.criarComentario(parseInt(id), req.usuario.id, 'reenvio', 'C.I. ajustada e reenviada para aprovação');
      await notificacaoModel.criarNotificacao(`Aprovação pendente: ${titulo}`, gerente.id, parseInt(id));
      await registrarLog(req.usuario.id, 'Envio para aprovação do gerente', getClientIP(req), parseInt(id));
    }

    res.status(200).json({ sucesso: true, mensagem: 'CI atualizada com sucesso', dados: { id, estado: estadoFinal } });
  } catch (err) {
    next(err);
  }
};

// listarMinhasCIs — histórico completo do usuário (enviadas + recebidas + arquivadas)
export const listarMinhasCIs = async (req, res, next) => {
  try {
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 10;
    const usuario_id = req.usuario.id;
    const departamento_id = req.usuario.departamento_id;
    const filtro_departamento_id = req.query.departamento_filtro ? parseInt(req.query.departamento_filtro) : null;
    const [comunicacoes, total] = await Promise.all([
      comunicacaoModel.listarMinhasCIs(usuario_id, departamento_id, pagina, limite, filtro_departamento_id),
      comunicacaoModel.contarMinhasCIs(usuario_id, departamento_id, filtro_departamento_id)
    ]);
    res.status(200).json({ sucesso: true, dados: comunicacoes, paginacao: { pagina, limite, total } });
  } catch (err) {
    next(err);
  }
};

export const listarDestinatariosCI = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) throw new ValidationError('ID inválido', 'ID_INVALIDO', []);

    const [ci, destinatarios] = await Promise.all([
      comunicacaoModel.buscarCIporID(id),
      destinatarioModel.listarDestinatariosPorCI(id)
    ]);

    let para_todos = false;
    if (ci && destinatarios.length > 0) {
      const usuariosDept = await usuarioModel.listarPorDepartamento(ci.departamento_id);
      // desconta o próprio remetente da contagem do departamento
      const totalDeptSemRemetente = usuariosDept.filter(u => u.id !== ci.usuario_id).length;
      para_todos = totalDeptSemRemetente > 0 && destinatarios.length >= totalDeptSemRemetente;
    }

    res.status(200).json({ sucesso: true, dados: destinatarios, para_todos });
  } catch (err) {
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