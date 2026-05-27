import pool from '../config/db.js';

export const criarDepartamento = async (nome, descricao) => {
  const sql = 'INSERT INTO departamento (nome, descricao) VALUES (?, ?)';
  const [result] = await pool.query(sql, [nome, descricao]);
  return result;
};

export const buscarDepartamentoporID = async (id) => {
  const sql = 'SELECT id, nome, descricao FROM departamento WHERE id = ?';
  const [results] = await pool.query(sql, [id]);
  return results[0];
};

export const listarDepartamentos = async () => {
  const sql = 'SELECT id, nome, descricao FROM departamento';
  const [results] = await pool.query(sql);
  return results;
};


//acrescentar
//atualizarDepartamento → só admin pode editar
//deletarDepartamento → só admin pode deletar
//listarComContagem → lista departamentos com total de C.I.s (para o card lateral)