import pool from '../config/db.js';

export const criarUsuario = async (nome, email, senha, cargo_id, departamento_id) => {
  const sql = 'INSERT INTO usuario (nome, email, senha, cargo_id, departamento_id) VALUES (?, ?, ?, ?, ?)';
  const [result] = await pool.query(sql, [nome, email, senha, cargo_id, departamento_id]);
  return result;
};

export const buscarEmail = async (email) => {
  const sql = 'SELECT id, nome, email, cargo_id, departamento_id FROM usuario WHERE email = ?';
  const [results] = await pool.query(sql, [email]);
  return results[0];
};

export const buscarSenhaEmail = async (email) => {
  const sql = 'SELECT id, nome, email, senha, cargo_id, departamento_id FROM usuario WHERE email = ?';
  const [results] = await pool.query(sql, [email]);
  return results[0];
};

export const buscarId = async (id) => {
  const sql = 'SELECT id, nome, email, cargo_id, departamento_id FROM usuario WHERE id = ?';
  const [results] = await pool.query(sql, [id]);
  return results[0];
};

export const listarUsuarios = async (pagina = 1, limite = 20) => {
  const offset = (pagina - 1) * limite;
  const sql = 'SELECT id, nome, email, cargo_id, departamento_id FROM usuario LIMIT ? OFFSET ?';
  const [results] = await pool.query(sql, [limite, offset]);
  return results;
};

export const listarTodos = async () => {
  const sql = 'SELECT id, nome, email, cargo_id, departamento_id FROM usuario';
  const [results] = await pool.query(sql);
  return results;
};

export const atualizarUsuario = async (id, nome, email, cargo_id, departamento_id) => {
  const sql = 'UPDATE usuario SET nome = ?, email = ?, cargo_id = ?, departamento_id = ? WHERE id = ?';
  const [result] = await pool.query(sql, [nome, email, cargo_id, departamento_id, id]);
  return result;
};

export const atualizarSenha = async (id, novaSenha) => {
  const sql = 'UPDATE usuario SET senha = ? WHERE id = ?';
  const [result] = await pool.query(sql, [novaSenha, id]);
  return result;
};

export const deletarUsuario = async (id) => {
  const sql = 'DELETE FROM usuario WHERE id = ?';
  const [result] = await pool.query(sql, [id]);
  return result;
};