import pool from '../config/db.js';

export const criarComunicacao = async (titulo, data_hora, estado, descricao, usuario_id, departamento_id) => {
  const sql = 'INSERT INTO comunicacao (titulo, data_hora, estado, descricao, usuario_id, departamento_id) VALUES (?, ?, ?, ?, ?, ?)';
  const [result] = await pool.query(sql, [titulo, data_hora, estado, descricao, usuario_id, departamento_id]);
  return result;
};

export const buscarCIporID = async (id) => {
  const sql = 'SELECT id, titulo, data_hora, estado, descricao, usuario_id, departamento_id FROM comunicacao WHERE id = ?';
  const [results] = await pool.query(sql, [id]);
  return results[0];
};

export const listarCIRecebidas = async (departamento_id, pagina = 1, limite = 20) => {
  const offset = (pagina - 1) * limite;
  const sql = 'SELECT * FROM comunicacao WHERE departamento_id = ? LIMIT ? OFFSET ?';
  const [results] = await pool.query(sql, [departamento_id, limite, offset]);
  return results;
};

export const listarCIEnviadas = async (usuario_id, pagina = 1, limite = 20) => {
  const offset = (pagina - 1) * limite;
  const sql = 'SELECT * FROM comunicacao WHERE usuario_id = ? LIMIT ? OFFSET ?';
  const [results] = await pool.query(sql, [usuario_id, limite, offset]);
  return results;
};

export const arquivarCI = async (id) => {
  const sql = "UPDATE comunicacao SET estado = 'arquivada' WHERE id = ?";
  const [result] = await pool.query(sql, [id]);
  return result;
};
