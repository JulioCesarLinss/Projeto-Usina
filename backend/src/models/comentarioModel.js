import pool from '../config/db.js';

export const criarComentario = async (comunicacao_id, usuario_id, tipo, texto) => {
  const [result] = await pool.query(
    'INSERT INTO comentario_comunicacao (comunicacao_id, usuario_id, tipo, texto, data_hora) VALUES (?, ?, ?, ?, NOW())',
    [comunicacao_id, usuario_id, tipo, texto]
  );
  return result;
};

export const listarComentarios = async (comunicacao_id) => {
  const [rows] = await pool.query(
    `SELECT cc.id, cc.tipo, cc.texto, cc.data_hora, cc.usuario_id, u.nome AS usuario_nome
     FROM comentario_comunicacao cc INNER JOIN usuario u ON u.id = cc.usuario_id
     WHERE cc.comunicacao_id = ? ORDER BY cc.data_hora ASC, cc.id ASC`, [comunicacao_id]);
  return rows;
};
