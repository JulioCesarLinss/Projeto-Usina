import pool from '../config/db.js';

export const adicionarDestinatario = async (comunicacao_id, usuario_id, departamento_id) => {
  const sql = 'INSERT INTO destinatario (comunicacao_id, usuario_id, departamento_id) VALUES (?, ?, ?)';
  const [result] = await pool.query(sql, [comunicacao_id, usuario_id, departamento_id]);
  return result;
};

export const listarDestinatariosPorCI = async (comunicacao_id, pagina = 1, limite = 20) => {
  const offset = (pagina - 1) * limite;
  const sql = 'SELECT * FROM destinatario WHERE comunicacao_id = ? LIMIT ? OFFSET ?';
  const [results] = await pool.query(sql, [comunicacao_id, limite, offset]);
  return results;
};

export const verificarDestinatario = async (comunicacao_id, usuario_id) => {
  const sql = 'SELECT * FROM destinatario WHERE comunicacao_id = ? AND usuario_id = ?';
  const [results] = await pool.query(sql, [comunicacao_id, usuario_id]);
  return results[0];
};