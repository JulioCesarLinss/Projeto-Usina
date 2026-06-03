import pool from '../config/db.js';

// listarLogs — busca logs com filtros opcionais: usuario, tipo de ação e intervalo de datas.
// Faz JOIN com usuario para retornar o nome junto com cada registro.
export const listarLogs = async ({
  usuario_id,
  departamento_id,
  acao,
  nome,
  data_inicio,
  data_fim,
  pagina = 1,
  limite = 20
}) => {
  const offset = (pagina - 1) * limite;
  const conditions = [];
  const params = [];

  if (usuario_id) {
    conditions.push('l.usuario_id = ?');
    params.push(usuario_id);
  }

  if (departamento_id) {
    conditions.push('u.departamento_id = ?');
    params.push(departamento_id);
  }

  if (acao) {
    conditions.push('l.acao_realizada LIKE ?');
    params.push(`%${acao}%`);
  }

  if (nome) {
    conditions.push('u.nome LIKE ?');
    params.push(`%${nome}%`);
  }

  if (data_inicio) {
    conditions.push('l.data_hora >= ?');
    params.push(data_inicio);
  }

  if (data_fim) {
    conditions.push('l.data_hora <= ?');
    params.push(data_fim + ' 23:59:59');
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql = `
    SELECT
      l.id,
      l.acao_realizada,
      l.data_hora,
      l.ip_usuario,
      l.comunicacao_id,
      u.nome AS usuario_nome
    FROM logs_sistema l
    INNER JOIN usuario u ON l.usuario_id = u.id
    ${where}
    ORDER BY l.data_hora DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limite, offset);

  const [results] = await pool.query(sql, params);
  return results;
};

// contarLogs — retorna o total de registros para paginação correta no frontend.
export const contarLogs = async ({ usuario_id, departamento_id, acao, nome, data_inicio, data_fim }) => {
  const conditions = [];
  const params = [];

  if (usuario_id) { conditions.push('l.usuario_id = ?'); params.push(usuario_id); }
  if (departamento_id) { conditions.push('u.departamento_id = ?'); params.push(departamento_id); }
  if (acao) { conditions.push('l.acao_realizada LIKE ?'); params.push(`%${acao}%`); }
  if (nome) { conditions.push('u.nome LIKE ?'); params.push(`%${nome}%`); }
  if (data_inicio) { conditions.push('l.data_hora >= ?'); params.push(data_inicio); }
  if (data_fim) { conditions.push('l.data_hora <= ?'); params.push(data_fim + ' 23:59:59'); }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const sql = `SELECT COUNT(*) AS total FROM logs_sistema l INNER JOIN usuario u ON l.usuario_id = u.id ${where}`;
  const [results] = await pool.query(sql, params);
  return results[0].total;
};
