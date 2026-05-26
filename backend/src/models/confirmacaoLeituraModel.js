import pool from '../config/db.js';

export const confirmarLeitura = async (comunicacao_id, usuario_id) => {
  const data_hora = new Date();
  const assinatura_digital = `${usuario_id}-${comunicacao_id}-${data_hora.getTime()}`;
  const sql = 'INSERT INTO confirmacao_leitura (data_hora, usuario_id, comunicacao_id, assinatura_digital) VALUES (?, ?, ?, ?)';
  try {
    const [result] = await pool.query(sql, [data_hora, usuario_id, comunicacao_id, assinatura_digital]);
    return result;
  } catch (err) {
    throw err;
  }
};

export const buscarConfirmacao = async (comunicacao_id, usuario_id) => {
    const sql = 'SELECT * FROM confirmacao_leitura WHERE comunicacao_id = ? AND usuario_id = ?';
    const [results] = await pool.query(sql, [comunicacao_id, usuario_id]);
    return results[0];
};

export const listarConfirmacoesPorCI = async (comunicacao_id) => {
  const sql = 'SELECT * FROM confirmacao_leitura WHERE comunicacao_id = ?';
  const [results] = await pool.query(sql, [comunicacao_id]);
  return results;
};