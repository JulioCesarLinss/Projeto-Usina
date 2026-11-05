import * as reuniaoModel from '../models/reuniaoModel.js';
import * as notificacaoModel from '../models/notificacaoModel.js';
import * as reuniaoService from '../services/reuniaoService.js';
import { ValidationError, NotFoundError, AuthorizationError, ConflictError } from '../utils/appError.js';
import { registrarLog, getClientIP } from '../middlewares/auditMiddleware.js';

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

const carregar = async (id) => {
  if (!id || isNaN(id)) throw new ValidationError('ID inválido', 'ID_INVALIDO', []);
  const r = await reuniaoModel.buscarPorId(parseInt(id));
  if (!r) throw new NotFoundError('Reunião não encontrada', 'REUNIAO_NAO_ENCONTRADA');
  return r;
};

// organizador pode editar/cancelar enquanto a reunião estiver agendada e não tiver começado
const exigirOrganizadorDa = (r, usuario) => {
  if (r.organizador_id !== usuario.id)
    throw new AuthorizationError('Apenas quem marcou a reunião pode alterá-la', 'ACESSO_NEGADO');
  if (r.estado !== 'agendada') throw new ConflictError('Esta reunião foi cancelada', 'REUNIAO_CANCELADA');
  if (r.ja_comecou) throw new ConflictError('Esta reunião já começou ou já aconteceu', 'REUNIAO_PASSADA');
};

// GET /api/reunioes?inicio=AAAA-MM-DD&fim=AAAA-MM-DD — agenda do usuário no período
export const listar = async (req, res, next) => {
  try {
    const { inicio, fim } = req.query;
    if (!DATA_RE.test(inicio || '') || !DATA_RE.test(fim || ''))
      throw new ValidationError('Informe inicio e fim no formato AAAA-MM-DD', 'DATA_INVALIDA', []);
    const dias = (new Date(fim) - new Date(inicio)) / 864e5;
    if (isNaN(dias) || dias < 0 || dias > 62)
      throw new ValidationError('Período inválido (máximo de 62 dias)', 'PERIODO_INVALIDO', []);
    const dados = await reuniaoModel.listarDoPeriodo(req.usuario.id, inicio, fim);
    res.status(200).json({ sucesso: true, dados });
  } catch (err) { next(err); }
};

// GET /api/reunioes/:id — organizador ou convidado
export const detalhe = async (req, res, next) => {
  try {
    const r = await carregar(req.params.id);
    const ehOrganizador = r.organizador_id === req.usuario.id;
    const meu = ehOrganizador ? null : await reuniaoModel.ehParticipante(r.id, req.usuario.id);
    if (!ehOrganizador && !meu)
      throw new AuthorizationError('Você não foi convidado para esta reunião', 'ACESSO_NEGADO');
    const participantes = await reuniaoModel.listarParticipantes(r.id);
    res.status(200).json({
      sucesso: true,
      dados: { ...r, minha_resposta: meu?.resposta || null, eh_organizador: ehOrganizador, participantes }
    });
  } catch (err) { next(err); }
};

// POST /api/reunioes — supervisor, gerente ou secretário
export const criar = async (req, res, next) => {
  try {
    reuniaoService.exigirOrganizador(req.usuario);
    const dados = reuniaoService.validarDados(req.body);
    reuniaoService.exigirFuturo(dados.inicio);
    const participantes = await reuniaoService.resolverParticipantes(req.body.participantes, req.usuario);

    const id = await reuniaoModel.criar(
      { ...dados, organizador_id: req.usuario.id, usina_id: req.usuario.usina_id }, participantes);
    await notificacaoModel.criarNotificacoesReuniao(participantes,
      `Nova reunião: ${dados.titulo} — ${reuniaoService.quando(dados.inicio)}`, id);
    await registrarLog(req.usuario.id, 'Reunião marcada', getClientIP(req));

    res.status(201).json({ sucesso: true, mensagem: 'Reunião marcada e convidados avisados', dados: { id } });
  } catch (err) { next(err); }
};

// PUT /api/reunioes/:id — organizador edita ou remarca
export const atualizar = async (req, res, next) => {
  try {
    const r = await carregar(req.params.id);
    exigirOrganizadorDa(r, req.usuario);
    const dados = reuniaoService.validarDados(req.body);
    const mudouHorario = dados.inicio !== r.inicio || dados.fim !== r.fim;
    if (mudouHorario) reuniaoService.exigirFuturo(dados.inicio);
    const participantes = await reuniaoService.resolverParticipantes(req.body.participantes, req.usuario);

    const { novos, mantidos } = await reuniaoModel.atualizar(r.id, dados, participantes, mudouHorario);
    const quando = reuniaoService.quando(dados.inicio);
    await notificacaoModel.criarNotificacoesReuniao(novos, `Nova reunião: ${dados.titulo} — ${quando}`, r.id);
    await notificacaoModel.criarNotificacoesReuniao(mantidos,
      `${mudouHorario ? 'Reunião remarcada' : 'Reunião alterada'}: ${dados.titulo} — ${quando}`, r.id);
    await registrarLog(req.usuario.id, 'Reunião alterada', getClientIP(req));

    res.status(200).json({ sucesso: true, mensagem: 'Reunião atualizada e convidados avisados', dados: { id: r.id } });
  } catch (err) { next(err); }
};

// POST /api/reunioes/:id/cancelar — organizador
export const cancelar = async (req, res, next) => {
  try {
    const r = await carregar(req.params.id);
    exigirOrganizadorDa(r, req.usuario);
    if (!(await reuniaoModel.cancelar(r.id)))
      throw new ConflictError('Esta reunião já foi cancelada', 'REUNIAO_CANCELADA');
    const convidados = await reuniaoModel.idsParticipantes(r.id);
    await notificacaoModel.criarNotificacoesReuniao(convidados,
      `Reunião cancelada: ${r.titulo} — ${reuniaoService.quando(r.inicio)}`, r.id);
    await registrarLog(req.usuario.id, 'Reunião cancelada', getClientIP(req));
    res.status(200).json({ sucesso: true, mensagem: 'Reunião cancelada e convidados avisados' });
  } catch (err) { next(err); }
};

// POST /api/reunioes/:id/responder { resposta: 'vou' | 'nao_vou' } — convidado
export const responder = async (req, res, next) => {
  try {
    const { resposta } = req.body || {};
    if (!['vou', 'nao_vou'].includes(resposta))
      throw new ValidationError('Resposta inválida', 'RESPOSTA_INVALIDA', []);
    const r = await carregar(req.params.id);
    if (!(await reuniaoModel.ehParticipante(r.id, req.usuario.id)))
      throw new AuthorizationError('Você não foi convidado para esta reunião', 'ACESSO_NEGADO');
    if (r.estado !== 'agendada') throw new ConflictError('Esta reunião foi cancelada', 'REUNIAO_CANCELADA');
    if (r.ja_comecou) throw new ConflictError('Esta reunião já começou ou já aconteceu', 'REUNIAO_PASSADA');
    await reuniaoModel.responder(r.id, req.usuario.id, resposta);
    res.status(200).json({ sucesso: true, mensagem: resposta === 'vou' ? 'Presença confirmada' : 'Ausência registrada' });
  } catch (err) { next(err); }
};
