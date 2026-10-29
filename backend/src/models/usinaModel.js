import pool from '../config/db.js';

export const buscarPorId = async (id) => {
  const [rows] = await pool.query('SELECT id, nome, logo_url FROM usina WHERE id = ?', [id]);
  return rows[0];
};
