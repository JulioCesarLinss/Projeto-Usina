import { ValidationError, AuthorizationError } from '../utils/appError.js';
import * as reuniaoModel from '../models/reuniaoModel.js';

// supervisor (3), gerente (2) e secretário (5) marcam reuniões; os demais só participam
export const PODE_ORGANIZAR = [2, 3, 5];
const DURACAO_MAX_MIN = 12 * 60;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const exigirOrganizador = (usuario) => {
  if (!PODE_ORGANIZAR.includes(usuario.cargo_id))
    throw new AuthorizationError('Apenas supervisores, gerentes e secretários podem marcar reuniões', 'SEM_PERMISSAO_REUNIAO');
};

// "agora" no fuso do sistema (DB_TIMEZONE, padrão Brasília), como 'AAAA-MM-DD HH:MM'
const agoraNoFuso = () => {
  const tz = /^[+-]\d{2}:\d{2}$/.test(process.env.DB_TIMEZONE || '') ? process.env.DB_TIMEZONE : '-03:00';
  const [h, m] = tz.slice(1).split(':').map(Number);
  const offsetMin = (tz[0] === '-' ? -1 : 1) * (h * 60 + m);
  return new Date(Date.now() + offsetMin * 60000).toISOString().slice(0, 16).replace('T', ' ');
};

const minutos = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

const texto = (v, max) => (typeof v === 'string' ? v.trim() : '').slice(0, max);

// valida e normaliza os dados do formulário de reunião
export const validarDados = (body) => {
  const titulo = texto(body.titulo, 150);
  const descricao = texto(body.descricao, 2000) || null;
  const { data, hora_inicio, hora_fim, modalidade } = body;

  if (titulo.length < 3) throw new ValidationError('Informe o assunto da reunião', 'TITULO_OBRIGATORIO', []);
  if (!DATA_RE.test(data || '') || isNaN(new Date(data)))
    throw new ValidationError('Data inválida', 'DATA_INVALIDA', []);
  if (!HORA_RE.test(hora_inicio || '') || !HORA_RE.test(hora_fim || ''))
    throw new ValidationError('Horário inválido (use HH:MM)', 'HORA_INVALIDA', []);
  const duracao = minutos(hora_fim) - minutos(hora_inicio);
  if (duracao <= 0) throw new ValidationError('O horário de término deve ser depois do início', 'PERIODO_INVALIDO', []);
  if (duracao > DURACAO_MAX_MIN) throw new ValidationError('A reunião pode durar no máximo 12 horas', 'PERIODO_INVALIDO', []);

  if (!['presencial', 'online'].includes(modalidade))
    throw new ValidationError('Escolha presencial ou online', 'MODALIDADE_INVALIDA', []);
  let local = null, link = null;
  if (modalidade === 'presencial') {
    local = texto(body.local, 200);
    if (local.length < 2) throw new ValidationError('Informe o local da reunião', 'LOCAL_OBRIGATORIO', []);
  } else {
    link = texto(body.link, 500);
    if (!/^https?:\/\/[^\s<>"']+$/i.test(link))
      throw new ValidationError('Informe um link válido, começando com https://', 'LINK_INVALIDO', []);
  }

  return {
    titulo, descricao, modalidade, local, link,
    inicio: `${data} ${hora_inicio}`,
    fim: `${data} ${hora_fim}`
  };
};

export const exigirFuturo = (inicio) => {
  if (inicio <= agoraNoFuso())
    throw new ValidationError('A reunião precisa ser marcada para um horário futuro', 'REUNIAO_NO_PASSADO', []);
};

// convidados: só usuários ativos da mesma usina; o organizador não convida a si mesmo
export const resolverParticipantes = async (ids, organizador) => {
  const lista = [...new Set((Array.isArray(ids) ? ids : []).map(Number).filter(n => Number.isInteger(n) && n > 0))]
    .filter(id => id !== organizador.id);
  const validos = await reuniaoModel.filtrarConvidaveis(lista, organizador.usina_id);
  if (validos.length === 0)
    throw new ValidationError('Escolha pelo menos um convidado', 'SEM_CONVIDADOS', []);
  return validos;
};

// "12/11 às 14:30" para as notificações
export const quando = (inicio) => {
  const [d, h] = inicio.split(' ');
  const [, m, dia] = d.split('-');
  return `${dia}/${m} às ${h.slice(0, 5)}`;
};
