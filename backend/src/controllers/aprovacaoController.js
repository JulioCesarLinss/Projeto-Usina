import * as comunicacaoModel from '../models/comunicacaoModel.js';
import * as comentarioModel from '../models/comentarioModel.js';
import * as notificacaoModel from '../models/notificacaoModel.js';
import * as aprovacaoService from '../services/aprovacaoService.js';
import { ValidationError, NotFoundError, AuthorizationError, ConflictError } from '../utils/appError.js';
import { registrarLog, getClientIP } from '../middlewares/auditMiddleware.js';

const carregarCI = async (id) => {
  if (!id || isNaN(id)) throw new ValidationError('ID inválido', 'ID_INVALIDO', []);
  const ci = await comunicacaoModel.buscarCIporID(id);
  if (!ci) throw new NotFoundError('Comunicação não encontrada', 'COMUNICACAO_NAO_ENCONTRADA');
  return ci;
};

// só o gerente indicado, e só enquanto a C.I. aguarda aprovação
const exigirGerenteAprovador = (ci, usuario) => {
  if (ci.em_nome_de_id !== usuario.id)
    throw new AuthorizationError('Apenas o gerente indicado pode decidir sobre esta C.I.', 'ACESSO_NEGADO');
  if (ci.estado !== 'aguardando_aprovacao')
    throw new ConflictError('Esta C.I. não está aguardando aprovação', 'CI_NAO_AGUARDA_APROVACAO');
};

const validarTexto = (texto, obrigatorio) => {
  const t = typeof texto === 'string' ? texto.trim() : '';
  if (obrigatorio && t.length < 3)
    throw new ValidationError('Escreva o que deseja que seja alterado', 'TEXTO_OBRIGATORIO', []);
  if (t.length > 2000)
    throw new ValidationError('Texto muito longo (máx. 2000 caracteres)', 'TEXTO_LONGO', []);
  return t;
};

// POST /:id/aprovar — "li e estou de acordo": libera o envio em nome do gerente
export const aprovar = async (req, res, next) => {
  try {
    const ci = await carregarCI(req.params.id);
    exigirGerenteAprovador(ci, req.usuario);
    const texto = validarTexto(req.body?.texto, false);

    const assinatura = `${req.usuario.id}-${ci.id}-${Date.now()}`;
    const r = await comunicacaoModel.aprovarCI(ci.id, req.usuario.id, assinatura);
    if (r.affectedRows === 0)
      throw new ConflictError('Esta C.I. já foi decidida', 'CI_NAO_AGUARDA_APROVACAO');

    await comentarioModel.criarComentario(ci.id, req.usuario.id, 'aprovacao', texto || 'Aprovada');
    await aprovacaoService.notificarDestinatarios(ci.id, ci.titulo);
    await notificacaoModel.criarNotificacao(`Sua C.I. foi aprovada e enviada: ${ci.titulo}`, ci.usuario_id, ci.id);
    await registrarLog(req.usuario.id, 'Aprovação de C.I', getClientIP(req), ci.id);
    await registrarLog(ci.usuario_id, 'Envio de C.I', getClientIP(req), ci.id);

    res.status(200).json({ sucesso: true, mensagem: 'C.I. aprovada e enviada', dados: { id: ci.id, estado: 'enviada' } });
  } catch (err) { next(err); }
};

// POST /:id/solicitar-ajustes — devolve ao autor com o que deve ser modificado
export const solicitarAjustes = async (req, res, next) => {
  try {
    const ci = await carregarCI(req.params.id);
    exigirGerenteAprovador(ci, req.usuario);
    const texto = validarTexto(req.body?.texto, true);

    await comunicacaoModel.definirEstado(ci.id, 'ajustes_solicitados');
    await comentarioModel.criarComentario(ci.id, req.usuario.id, 'solicitacao_ajuste', texto);
    await notificacaoModel.criarNotificacao(`Ajustes solicitados na C.I.: ${ci.titulo}`, ci.usuario_id, ci.id);
    await registrarLog(req.usuario.id, 'Solicitação de ajustes em C.I', getClientIP(req), ci.id);

    res.status(200).json({ sucesso: true, mensagem: 'Ajustes solicitados ao autor', dados: { id: ci.id, estado: 'ajustes_solicitados' } });
  } catch (err) { next(err); }
};

// GET /:id/comentarios — (acesso já validado por verificarAcessoCI)
export const listarComentarios = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new ValidationError('ID inválido', 'ID_INVALIDO', []);
    const [comentarios, versoes] = await Promise.all([
      comentarioModel.listarComentarios(id),
      comunicacaoModel.listarVersoes(id)
    ]);
    res.status(200).json({ sucesso: true, dados: comentarios, versoes });
  } catch (err) { next(err); }
};

// POST /:id/comentarios — conversa entre autor e gerente durante a aprovação
export const comentar = async (req, res, next) => {
  try {
    const ci = await carregarCI(req.params.id);
    const ehAutor = ci.usuario_id === req.usuario.id;
    const ehGerente = ci.em_nome_de_id === req.usuario.id;
    if (!ehAutor && !ehGerente)
      throw new AuthorizationError('Sem permissão para comentar', 'ACESSO_NEGADO');
    if (!['aguardando_aprovacao', 'ajustes_solicitados'].includes(ci.estado))
      throw new ConflictError('Comentários só são permitidos durante a aprovação', 'COMENTARIO_FORA_DA_APROVACAO');

    const texto = validarTexto(req.body?.texto, true);
    await comentarioModel.criarComentario(ci.id, req.usuario.id, 'comentario', texto);
    const outro = ehAutor ? ci.em_nome_de_id : ci.usuario_id;
    await notificacaoModel.criarNotificacao(`Novo comentário na C.I.: ${ci.titulo}`, outro, ci.id);

    res.status(201).json({ sucesso: true, mensagem: 'Comentário registrado' });
  } catch (err) { next(err); }
};

// GET /aprovacoes — pendências do usuário logado
export const listarAprovacoes = async (req, res, next) => {
  try {
    const [para_aprovar, minhas_em_aprovacao] = await Promise.all([
      comunicacaoModel.listarParaAprovar(req.usuario.id),
      comunicacaoModel.listarMinhasEmAprovacao(req.usuario.id)
    ]);
    res.status(200).json({ sucesso: true, dados: { para_aprovar, minhas_em_aprovacao } });
  } catch (err) { next(err); }
};
