import pool from '../config/db.js';

export const criarNotificacao = async (mensagem, usuario_id, comunicacao_id) => {
  const data_hora = new Date();
  const sql = 'INSERT INTO notificacoes (mensagem, data_hora, usuario_id, comunicacao_id) VALUES (?, ?, ?, ?)';
  const [result] = await pool.query(sql, [mensagem, data_hora, usuario_id, comunicacao_id]);
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