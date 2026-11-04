import pool from '../config/db.js';

// Entram no relatório as C.I.s que chegaram aos destinatários:
// arquivada é uma C.I. enviada que já cumpriu o papel, então também conta.
const ESTADOS_ENVIADOS = "('enviada', 'arquivada')";

// A taxa de leitura é por destinatário: confirmações ÷ pessoas que deviam ler.
// Só contam confirmações de quem está na lista de destinatários da C.I.
export const resumo = async (periodo = 30) => {
  const [[{ total_cis }]] = await pool.query(`
    SELECT COUNT(*) AS total_cis
    FROM comunicacao c
    WHERE c.estado IN ${ESTADOS_ENVIADOS}
      AND c.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
  `, [periodo]);

  // uma linha por C.I.: quantas pessoas deviam ler e quantas confirmaram
  const [porCI] = await pool.query(`
    SELECT d.comunicacao_id,
           COUNT(DISTINCT d.usuario_id) AS destinatarios,
           COUNT(DISTINCT cl.usuario_id) AS lidas
    FROM comunicacao c
    INNER JOIN destinatario d ON d.comunicacao_id = c.id
    LEFT JOIN confirmacao_leitura cl
      ON cl.comunicacao_id = d.comunicacao_id AND cl.usuario_id = d.usuario_id
    WHERE c.estado IN ${ESTADOS_ENVIADOS}
      AND c.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY d.comunicacao_id
  `, [periodo]);

  const total = parseInt(total_cis) || 0;
  const destinatarios = porCI.reduce((s, r) => s + Number(r.destinatarios), 0);
  const lidas = porCI.reduce((s, r) => s + Number(r.lidas), 0);
  return {
    total_cis: total,
    total_destinatarios: destinatarios,
    total_lidas: lidas,
    total_pendentes: destinatarios - lidas,
    cis_todas_lidas: porCI.filter(r => Number(r.lidas) === Number(r.destinatarios)).length,
    taxa_leitura: destinatarios > 0 ? Math.round((lidas / destinatarios) * 100) : 0,
    media_por_dia: (total / periodo).toFixed(1)
  };
};

// enviadas: C.I.s escritas por funcionários do setor.
// recebidas, lidas e pendentes: pelo setor de quem recebeu (não pelo setor escolhido na C.I.).
export const porDepartamento = async (periodo = 30) => {
  const [rows] = await pool.query(`
    SELECT dep.id, dep.nome,
      (SELECT COUNT(*) FROM comunicacao c
       INNER JOIN usuario u ON u.id = c.usuario_id
       WHERE c.estado IN ${ESTADOS_ENVIADOS} AND u.departamento_id = dep.id
         AND c.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ) AS enviadas,
      COALESCE(r.recebidas, 0) AS recebidas,
      COALESCE(r.destinatarios, 0) AS destinatarios,
      COALESCE(r.lidas, 0) AS lidas
    FROM departamento dep
    LEFT JOIN (
      SELECT u.departamento_id,
             COUNT(DISTINCT c.id) AS recebidas,
             COUNT(DISTINCT d.comunicacao_id, d.usuario_id) AS destinatarios,
             COUNT(DISTINCT cl.comunicacao_id, cl.usuario_id) AS lidas
      FROM comunicacao c
      INNER JOIN destinatario d ON d.comunicacao_id = c.id
      INNER JOIN usuario u ON u.id = d.usuario_id
      LEFT JOIN confirmacao_leitura cl
        ON cl.comunicacao_id = d.comunicacao_id AND cl.usuario_id = d.usuario_id
      WHERE c.estado IN ${ESTADOS_ENVIADOS}
        AND c.data_hora >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY u.departamento_id
    ) r ON r.departamento_id = dep.id
    ORDER BY dep.nome
  `, [periodo, periodo]);

  return rows.map(d => {
    const destinatarios = Number(d.destinatarios);
    const lidas = Number(d.lidas);
    return {
      id: d.id,
      nome: d.nome,
      enviadas: Number(d.enviadas),
      recebidas: Number(d.recebidas),
      lidas,
      pendentes: destinatarios - lidas,
      taxa_leitura: destinatarios > 0 ? Math.round((lidas / destinatarios) * 100) : 0
    };
  });
};

// Últimos 6 meses, incluindo o atual; meses sem C.I. aparecem com zero.
export const evolucaoMensal = async () => {
  const [rows] = await pool.query(`
    SELECT DATE_FORMAT(data_hora, '%Y-%m') AS mes, COUNT(*) AS total
    FROM comunicacao
    WHERE estado IN ${ESTADOS_ENVIADOS}
      AND data_hora >= DATE_FORMAT(NOW() - INTERVAL 5 MONTH, '%Y-%m-01')
    GROUP BY mes
  `);
  const porMes = Object.fromEntries(rows.map(r => [r.mes, Number(r.total)]));

  const meses = [];
  const hoje = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    meses.push({ mes, total: porMes[mes] || 0 });
  }
  return meses;
};
