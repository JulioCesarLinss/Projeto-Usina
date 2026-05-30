import pool from '../config/db.js';

export const salvarAnexo = async (comunicacao_id, nome, caminho, tipo, tamanho) => {
  const [resultado] = await pool.execute(
    'INSERT INTO anexo (comunicacao_id, nome, caminho, tipo_arquivo, tamanho) VALUES (?, ?, ?, ?, ?)',
    [comunicacao_id, nome, caminho, tipo, String(tamanho)]
  );
  return resultado;
};

export const listarAnexosPorCI = async (comunicacao_id) => {
  const [rows] = await pool.execute(
    'SELECT * FROM anexo WHERE comunicacao_id = ?',
    [comunicacao_id]
  );
  return rows;
};
