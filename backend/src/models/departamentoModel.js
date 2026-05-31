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


export const listarDepartamentosComStats = async () => {
  const sql = `
    SELECT d.id, d.nome, d.descricao,
      (SELECT COUNT(DISTINCT c.id) FROM comunicacao c
       INNER JOIN usuario u ON u.id = c.usuario_id
       WHERE c.estado = 'enviada'
         AND (c.departamento_id = d.id OR u.departamento_id = d.id)
      ) AS total_cis,
      (SELECT COUNT(DISTINCT c.id) FROM comunicacao c
       INNER JOIN usuario u ON u.id = c.usuario_id
       WHERE c.estado = 'enviada' AND DATE(c.data_hora) = CURDATE()
         AND (c.departamento_id = d.id OR u.departamento_id = d.id)
      ) AS cis_hoje
    FROM departamento d
    ORDER BY d.nome`;
  const [results] = await pool.query(sql);
  return results;
};

export const listarCIsPorDepartamento = async (departamento_id, pagina = 1, limite = 15, busca = '') => {
  const offset = (pagina - 1) * limite;
  const buscaLike = `%${busca}%`;
  const buscaClause = busca
    ? `AND (c.titulo LIKE ? OR u.nome LIKE ? OR CONCAT('CI-', LPAD(c.id, 4, '0')) LIKE ? OR DATE_FORMAT(c.data_hora, '%d/%m/%Y') LIKE ?)`
    : '';
  const buscaParams = busca ? [buscaLike, buscaLike, buscaLike, buscaLike] : [];
  const sql = `
    SELECT DISTINCT c.*,
      u.nome AS usuario_nome,
      (SELECT COUNT(*) FROM confirmacao_leitura cl WHERE cl.comunicacao_id = c.id) AS total_lidas,
      (SELECT COUNT(*) FROM destinatario d WHERE d.comunicacao_id = c.id) AS total_destinatarios,
      CASE WHEN c.departamento_id = ? THEN 'recebida' ELSE 'enviada' END AS tipo_relacao
    FROM comunicacao c
    INNER JOIN usuario u ON u.id = c.usuario_id
    WHERE c.estado = 'enviada'
      AND (
        c.departamento_id = ?
        OR EXISTS (SELECT 1 FROM usuario ue WHERE ue.id = c.usuario_id AND ue.departamento_id = ?)
      )
      ${buscaClause}
    ORDER BY c.data_hora DESC
    LIMIT ? OFFSET ?`;
  const [results] = await pool.query(sql, [departamento_id, departamento_id, departamento_id, ...buscaParams, limite, offset]);
  return results;
};

export const contarCIsPorDepartamento = async (departamento_id, busca = '') => {
  const buscaLike = `%${busca}%`;
  const buscaClause = busca
    ? `AND (c.titulo LIKE ? OR u.nome LIKE ? OR CONCAT('CI-', LPAD(c.id, 4, '0')) LIKE ? OR DATE_FORMAT(c.data_hora, '%d/%m/%Y') LIKE ?)`
    : '';
  const buscaParams = busca ? [buscaLike, buscaLike, buscaLike, buscaLike] : [];
  const sql = `
    SELECT COUNT(DISTINCT c.id) AS total FROM comunicacao c
    INNER JOIN usuario u ON u.id = c.usuario_id
    WHERE c.estado = 'enviada'
      AND (
        c.departamento_id = ?
        OR EXISTS (SELECT 1 FROM usuario ue WHERE ue.id = c.usuario_id AND ue.departamento_id = ?)
      )
      ${buscaClause}`;
  const [results] = await pool.query(sql, [departamento_id, departamento_id, ...buscaParams]);
  return results[0].total;
};