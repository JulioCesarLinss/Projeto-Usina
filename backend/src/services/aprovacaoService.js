import * as usuarioModel from '../models/usuarioModel.js';
import * as destinatarioModel from '../models/destinatarioModel.js';
import * as notificacaoModel from '../models/notificacaoModel.js';
import { ValidationError } from '../utils/appError.js';

// O gerente indicado precisa existir, estar ativo, ser gerente (cargo 2),
// da mesma usina de quem envia, e não ser o próprio remetente.
export const validarGerente = async (em_nome_de_id, remetente) => {
  const id = parseInt(em_nome_de_id);
  const gerente = id ? await usuarioModel.buscarId(id) : null;
  if (!gerente || gerente.ativo === 0 || gerente.cargo_id !== 2
      || gerente.usina_id !== remetente.usina_id || gerente.id === remetente.id) {
    throw new ValidationError('Gerente inválido para aprovação', 'GERENTE_INVALIDO', []);
  }
  return gerente;
};

// substitui os destinatários da C.I. (sem notificar ninguém)
export const salvarDestinatarios = async (ci_id, destinatarios, departamento_id, autor_id) => {
  let lista = destinatarios || [];
  if (lista.length === 0) {
    const usuariosDept = await usuarioModel.listarPorDepartamento(departamento_id);
    lista = usuariosDept.map(u => ({ usuario_id: u.id, departamento_id }));
  }
  await destinatarioModel.removerPorCI(ci_id);
  for (const dest of lista) {
    if (dest.usuario_id === autor_id) continue;
    await destinatarioModel.adicionarDestinatario(ci_id, dest.usuario_id, dest.departamento_id);
  }
};

// notifica quem já está salvo como destinatário
export const notificarDestinatarios = async (ci_id, titulo) => {
  const destinatarios = await destinatarioModel.listarDestinatariosPorCI(ci_id);
  for (const d of destinatarios) {
    await notificacaoModel.criarNotificacao(`Nova C.I recebida: ${titulo}`, d.usuario_id, ci_id);
  }
};
