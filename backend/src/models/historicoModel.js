import pool from '../config/db.js';

// Histórico de C.I.s só com METADADOS (sem título nem descrição).
// Paginação por cursor (data_hora, id): custo constante em qualquer profundidade,
// diferente de OFFSET, que fica mais lento quanto mais fundo se navega.
export const listarHistorico = async ({
  usina_id, departamento_id, usuario_id, estado, data_inicio, data_fim, cursor, limite
}) => {
  const where = ["u.usina_id = ?", "c.estado <> 'rascunho'", 'c.data_hora >= ?'];
  const params = [usina_id, data_inicio];

  if (departamento_id) { where.push('c.departamento_id = ?'); params.push(departamento_id); }
  if (usuario_id) { where.push('c.usuario_id = ?'); params.push(usuario_id); }
  if (estado) { where.push('c.estado = ?'); params.push(estado); }
  if (data_fim) { where.push('c.data_hora <= ?'); params.push(`${data_fim} 23:59:59`); }
  if (cursor) {
    where.push('(c.data_hora < ? OR (c.data_hora = ? AND c.id < ?))');
    params.push(cursor.d, cursor.d, cursor.i);
  }

  const sql = `
    SELECT c.id, c.data_hora, DATE_FORMAT(c.data_hora, '%Y-%m-%d %H:%i:%s') AS cursor_data,
           c.estado, c.departamento_id, dep.nome AS departamento_nome,
           c.usuario_id, u.nome AS remetente_nome,
           (SELECT COUNT(*) FROM destinatario d WHERE d.comunicacao_id = c.id) AS total_destinatarios,
           (SELECT COUNT(*) FROM confirmacao_leitura cl WHERE cl.comunicacao_id = c.id) AS total_lidas
    FROM comunicacao c
    INNER JOIN usuario u ON u.id = c.usuario_id
    INNER JOIN departamento dep ON dep.id = c.departamento_id
    WHERE ${where.join(' AND ')}
    ORDER BY c.data_hora DESC, c.id DESC
    LIMIT ?`;
  params.push(limite + 1); // +1 para saber se existe próxima página
  const [rows] = await pool.query(sql, params);
  return rows;
};
