import pool from '../config/db.js';

// Notifica, numa única consulta, os destinatários que ainda não confirmaram a leitura.
// Retorna quantas pessoas foram lembradas.
export const lembrarPendentes = async (ci_id, mensagem) => {
  const [result] = await pool.query(
    `INSERT INTO notificacoes (mensagem, data_hora, usuario_id, comunicacao_id)
     SELECT ?, NOW(), d.usuario_id, d.comunicacao_id
     FROM destinatario d
     LEFT JOIN confirmacao_leitura cl
       ON cl.comunicacao_id = d.comunicacao_id AND cl.usuario_id = d.usuario_id
     WHERE d.comunicacao_id = ? AND cl.id IS NULL`,
    [mensagem, ci_id]
  );
  return result.affectedRows;
};

// Lembrete automático: C.I.s enviadas cujo prazo vence hoje (ou já venceu) e que
// ainda não receberam o lembrete. Cada C.I. é "reservada" antes de notificar,
// então rodar duas vezes (ou em dois servidores) não duplica o aviso.
export const executarLembretesDePrazo = async () => {
  const [cis] = await pool.query(
    `SELECT id, titulo FROM comunicacao
     WHERE estado = 'enviada' AND prazo_leitura IS NOT NULL
       AND prazo_leitura <= CURDATE() AND lembrete_enviado_em IS NULL`
  );

  let total = 0;
  for (const ci of cis) {
    const [reserva] = await pool.query(
      'UPDATE comunicacao SET lembrete_enviado_em = NOW() WHERE id = ? AND lembrete_enviado_em IS NULL',
      [ci.id]
    );
    if (reserva.affectedRows !== 1) continue;
    total += await lembrarPendentes(ci.id, `Prazo de leitura vence hoje: ${ci.titulo}`);
  }
  return { cis: cis.length, lembrados: total };
};

// Lembrete de reunião: 1 hora antes do início, para os convidados que não responderam
// "não vou" e para o organizador. Mesma "reserva" do prazo: cada reunião é avisada uma vez.
export const executarLembretesDeReuniao = async () => {
  const [reunioes] = await pool.query(
    `SELECT id, titulo, organizador_id, DATE_FORMAT(inicio, '%H:%i') AS hora FROM reuniao
     WHERE estado = 'agendada' AND lembrete_enviado_em IS NULL
       AND inicio > NOW() AND inicio <= NOW() + INTERVAL 1 HOUR`
  );

  let total = 0;
  for (const r of reunioes) {
    const [reserva] = await pool.query(
      'UPDATE reuniao SET lembrete_enviado_em = NOW() WHERE id = ? AND lembrete_enviado_em IS NULL', [r.id]);
    if (reserva.affectedRows !== 1) continue;
    const [res] = await pool.query(
      `INSERT INTO notificacoes (mensagem, data_hora, usuario_id, reuniao_id)
       SELECT ?, NOW(), p.usuario_id, p.reuniao_id FROM reuniao_participante p
       WHERE p.reuniao_id = ? AND p.resposta <> 'nao_vou'
       UNION ALL SELECT ?, NOW(), ?, ?`,
      [`Reunião em breve (${r.hora}): ${r.titulo}`, r.id, `Reunião em breve (${r.hora}): ${r.titulo}`, r.organizador_id, r.id]
    );
    total += res.affectedRows;
  }
  return { reunioes: reunioes.length, lembrados: total };
};

// lembrete manual: no máximo um por hora para cada C.I.
export const lembreteManualRecente = async (ci_id) => {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS n FROM logs_sistema
     WHERE comunicacao_id = ? AND acao_realizada = 'Lembrete de leitura'
       AND data_hora >= NOW() - INTERVAL 1 HOUR`,
    [ci_id]
  );
  return row.n > 0;
};
