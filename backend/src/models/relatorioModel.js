import pool from '../config/db.js';

export const resumo = async (periodo = 30) => {
  const [rows] = await pool.query(`
    SELECT
      COUNT(*) AS total_cis,
      SUM(CASE WHEN EXISTS (
        SELECT 1 FROM confirmacao_leitura cl WHERE cl.comunicacao_id = c.id
      ) THEN 1 ELSE 0 END) AS total_lidas,
      SUM(CASE WHEN NOT EXISTS (
        SELECT 1 FROM confirmacao_leitura cl WHERE cl.comunicacao_id = c.id
      ) THEN 1 ELSE 0 END) AS total_pendentes
    FROM comunicacao c
    WHERE c.estado = 'enviada'
      AND c.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
  `, [periodo]);
  const r = rows[0];
  const total = parseInt(r.total_cis) || 0;
  const lidas = parseInt(r.total_lidas) || 0;
  return {
    total_cis: total,
    total_lidas: lidas,
    total_pendentes: parseInt(r.total_pendentes) || 0,
    taxa_leitura: total > 0 ? Math.round((lidas / total) * 100) : 0,
    media_por_dia: total > 0 ? (total / periodo).toFixed(1) : '0.0'
  };
};

export const porDepartamento = async (periodo = 30) => {
  const [rows] = await pool.query(`
    SELECT
      d.id,
      d.nome,
      (SELECT COUNT(DISTINCT c.id) FROM comunicacao c
       INNER JOIN usuario u ON u.id = c.usuario_id
       WHERE c.estado = 'enviada' AND u.departamento_id = d.id
         AND c.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ) AS enviadas,
      (SELECT COUNT(DISTINCT c.id) FROM comunicacao c
       WHERE c.estado = 'enviada' AND c.departamento_id = d.id
         AND c.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ) AS recebidas,
      (SELECT COUNT(DISTINCT c.id) FROM comunicacao c
       WHERE c.estado = 'enviada' AND c.departamento_id = d.id
         AND c.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
         AND EXISTS (SELECT 1 FROM confirmacao_leitura cl WHERE cl.comunicacao_id = c.id)
      ) AS lidas,
      (SELECT COUNT(DISTINCT c.id) FROM comunicacao c
       WHERE c.estado = 'enviada' AND c.departamento_id = d.id
         AND c.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
         AND NOT EXISTS (SELECT 1 FROM confirmacao_leitura cl WHERE cl.comunicacao_id = c.id)
      ) AS pendentes
    FROM departamento d
    ORDER BY d.nome
  `, [periodo, periodo, periodo, periodo]);
  return rows;
};

export const evolucaoMensal = async () => {
  const [rows] = await pool.query(`
    SELECT
      DATE_FORMAT(data_hora, '%Y-%m') AS mes,
      COUNT(*) AS total
    FROM comunicacao
    WHERE estado = 'enviada'
      AND data_hora >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY mes
    ORDER BY mes ASC
  `);
  return rows;
};
