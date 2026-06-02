import pool from '../config/db.js';

export const criarUsuario = async (nome, email, senha, cargo_id, departamento_id) => {
  const sql = 'INSERT INTO usuario (nome, email, senha, cargo_id, departamento_id) VALUES (?, ?, ?, ?, ?)';
  const [result] = await pool.query(sql, [nome, email, senha, cargo_id, departamento_id]);
  return result;
};

export const buscarEmail = async (email) => {
  // busca independente do status ativo — usado para verificar duplicidade de e-mail
  const sql = 'SELECT id, nome, email, cargo_id, departamento_id FROM usuario WHERE email = ?';
  const [results] = await pool.query(sql, [email]);
  return results[0];
};

export const buscarSenhaEmail = async (email) => {
  const sql = 'SELECT id, nome, email, senha, cargo_id, departamento_id, foto_url, ativo FROM usuario WHERE email = ?';
  const [results] = await pool.query(sql, [email]);
  return results[0];
};

export const buscarId = async (id) => {
  const sql = 'SELECT id, nome, email, cargo_id, departamento_id, foto_url, ativo FROM usuario WHERE id = ?';
  const [results] = await pool.query(sql, [id]);
  return results[0];
};

export const atualizarFotoUrl = async (id, foto_url) => {
  const sql = 'UPDATE usuario SET foto_url = ? WHERE id = ?';
  const [result] = await pool.query(sql, [foto_url, id]);
  return result;
};

export const buscarSenhaId = async (id) => {
  const sql = 'SELECT id, senha FROM usuario WHERE id = ?';
  const [results] = await pool.query(sql, [id]);
  return results[0];
};

export const salvarCodigoRecuperacao = async (usuario_id, codigo, expira_em) => {
  await pool.query('DELETE FROM recuperacao_senha WHERE usuario_id = ?', [usuario_id]);
  const sql = 'INSERT INTO recuperacao_senha (usuario_id, codigo, expira_em, criado_em) VALUES (?, ?, ?, NOW())';
  const [result] = await pool.query(sql, [usuario_id, codigo, expira_em]);
  return result;
};

export const buscarRecuperacaoPorEmail = async (email) => {
  const sql = `
    SELECT r.id, r.codigo, r.expira_em, u.id AS usuario_id
    FROM recuperacao_senha r
    JOIN usuario u ON u.id = r.usuario_id
    WHERE u.email = ?
    ORDER BY r.criado_em DESC
    LIMIT 1
  `;
  const [results] = await pool.query(sql, [email]);
  return results[0];
};

export const buscarRecuperacaoPorUsuarioId = async (usuario_id) => {
  const sql = 'SELECT id, codigo, expira_em FROM recuperacao_senha WHERE usuario_id = ? ORDER BY criado_em DESC LIMIT 1';
  const [results] = await pool.query(sql, [usuario_id]);
  return results[0];
};

export const excluirRecuperacaoPorUsuarioId = async (usuario_id) => {
  const sql = 'DELETE FROM recuperacao_senha WHERE usuario_id = ?';
  const [result] = await pool.query(sql, [usuario_id]);
  return result;
};

export const listarUsuarios = async (pagina = 1, limite = 20) => {
  const offset = (pagina - 1) * limite;
  // filtra apenas usuários ativos
  const sql = 'SELECT id, nome, email, cargo_id, departamento_id, foto_url, ativo FROM usuario WHERE ativo = 1 LIMIT ? OFFSET ?';
  const [results] = await pool.query(sql, [limite, offset]);
  return results;
};

export const listarTodos = async () => {
  // filtra apenas usuários ativos
  const sql = 'SELECT id, nome, email, cargo_id, departamento_id FROM usuario WHERE ativo = 1';
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

export const inativarUsuario = async (id) => {
  // soft delete — marca como inativo sem remover do banco, preserva histórico de CIs
  const sql = 'UPDATE usuario SET ativo = 0 WHERE id = ?';
  const [result] = await pool.query(sql, [id]);
  return result;
};

export const listarPorDepartamento = async (departamento_id) => {
  // lista apenas usuários ativos do departamento
  const sql = 'SELECT id, nome, email FROM usuario WHERE departamento_id = ? AND ativo = 1';
  const [results] = await pool.query(sql, [departamento_id]);
  return results;
};
