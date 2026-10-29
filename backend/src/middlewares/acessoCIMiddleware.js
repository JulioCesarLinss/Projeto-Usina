import * as comunicacaoModel from '../models/comunicacaoModel.js';
import * as destinatarioModel from '../models/destinatarioModel.js';
import { AuthorizationError, NotFoundError } from '../utils/appError.js';

// Regra de acesso ao CONTEÚDO de uma C.I.
// - Administrador (cargo 1) NUNCA lê conteúdo; só vê histórico/metadados.
// - Autor sempre acessa.
// - Rascunho: somente o autor.
// - Destinatário acessa.
// - Gerente/supervisor (cargo 2 ou 3) acessa se for do departamento da C.I.
//   ou de um departamento destinatário.
export const podeAcessarConteudoCI = (usuario, ci, destinatarios) => {
  if (usuario.cargo_id === 1) return false;
  if (ci.usuario_id === usuario.id) return true;
  // fases privadas: rascunho e aprovação — só autor e o gerente em cujo nome sai a C.I.
  if (['rascunho', 'aguardando_aprovacao', 'ajustes_solicitados'].includes(ci.estado))
    return ci.em_nome_de_id === usuario.id;
  if (destinatarios.some(d => d.usuario_id === usuario.id)) return true;
  if (usuario.cargo_id <= 3) {
    if (usuario.departamento_id === ci.departamento_id) return true;
    if (destinatarios.some(d => d.departamento_id === usuario.departamento_id)) return true;
  }
  return false;
};

// Usado em listagens que devolvem título/descrição das C.I.s
export const bloquearAdminConteudo = (req, res, next) => {
  if (req.usuario && req.usuario.cargo_id === 1)
    return next(new AuthorizationError(
      'Administradores não têm acesso ao conteúdo das comunicações',
      'ADMIN_SEM_ACESSO_CONTEUDO'
    ));
  next();
};

export const verificarAcessoCI = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return next(); // o controller devolve ID_INVALIDO

    const ci = await comunicacaoModel.buscarCIporID(id);
    if (!ci) throw new NotFoundError('Comunicação não encontrada', 'COMUNICACAO_NAO_ENCONTRADA');

    const destinatarios = await destinatarioModel.listarDestinatariosPorCI(id);
    if (!podeAcessarConteudoCI(req.usuario, ci, destinatarios)) {
      const admin = req.usuario.cargo_id === 1;
      throw new AuthorizationError(
        admin ? 'Administradores não têm acesso ao conteúdo das comunicações' : 'Sem permissão para esta comunicação',
        admin ? 'ADMIN_SEM_ACESSO_CONTEUDO' : 'ACESSO_NEGADO'
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};
