import pool from '../config/db.js';

export const criarNotificacao = async (mensagem, usuario_id, comunicacao_id) => {
  const data_hora = new Date();
  const sql = 'INSERT INTO notificacoes (mensagem, data_hora, usuario_id, comunicacao_id) VALUES (?, ?, ?, ?)';
  const [result] = await pool.query(sql, [mensagem, data_hora, usuario_id, comunicacao_id]);
  return result;
};

// notificação de reunião para vários usuários de uma vez (um único INSERT)
export const criarNotificacoesReuniao = async (usuario_ids, mensagem, reuniao_id) => {
  if (!usuario_ids || usuario_ids.length === 0) return { affectedRows: 0 };
  const agora = new Date();
  const valores = usuario_ids.map(uid => [mensagem, agora, uid, reuniao_id]);
  const [result] = await pool.query(
    'INSERT INTO notificacoes (mensagem, data_hora, usuario_id, reuniao_id) VALUES ?', [valores]);
  return result;
};

export const listarNotificacoes = async (usuario_id, pagina = 1, limite = 20) => {
  const offset = (pagina - 1) * limite;
  const sql = 'SELECT * FROM notificacoes WHERE usuario_id = ? ORDER BY data_hora DESC LIMIT ? OFFSET ?';
  const [results] = await pool.query(sql, [usuario_id, limite, offset]);
  return results;
};

export const marcarComoLida = async (id, usuario_id) => {
  const sql = 'UPDATE notificacoes SET lida = TRUE WHERE id = ? AND usuario_id = ?';
  const [result] = await pool.query(sql, [id, usuario_id]);
  return result;
};

export const marcarTodasComoLidas = async (usuario_id) => {
  const sql = 'UPDATE notificacoes SET lida = TRUE WHERE usuario_id = ?';
  const [result] = await pool.query(sql, [usuario_id]);
  return result;
};

// marca como lida a notificação vinculada a uma CI específica
export const marcarPorComunicacao = async (comunicacao_id, usuario_id) => {
  const sql = 'UPDATE notificacoes SET lida = TRUE WHERE comunicacao_id = ? AND usuario_id = ?';
  const [result] = await pool.query(sql, [comunicacao_id, usuario_id]);
  return result;
};