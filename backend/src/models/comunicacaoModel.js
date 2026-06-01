import pool from '../config/db.js';

export const criarComunicacao = async (titulo, data_hora, estado, descricao, usuario_id, departamento_id) => {
  const sql = 'INSERT INTO comunicacao (titulo, data_hora, estado, descricao, usuario_id, departamento_id) VALUES (?, ?, ?, ?, ?, ?)';
  const [result] = await pool.query(sql, [titulo, data_hora, estado, descricao, usuario_id, departamento_id]);
  return result;
};

export const buscarCIporID = async (id) => {
  const sql = `
    SELECT c.id, c.titulo, c.data_hora, c.estado, c.descricao, c.usuario_id, c.departamento_id,
           u.nome AS usuario_nome
    FROM comunicacao c
    INNER JOIN usuario u ON c.usuario_id = u.id
    WHERE c.id = ?`;
  const [results] = await pool.query(sql, [id]);
  return results[0];
};

export const contarCIRecebidas = async (departamento_id, usuario_id, verTodos = false, filtro_departamento_id = null) => {
  const deptCond = filtro_departamento_id
    ? 'AND c.departamento_id = ?'
    : '';
  const deptParams = filtro_departamento_id ? [filtro_departamento_id] : [];
  // todos os cargos: só aparecem CIs onde o usuário é destinatário explícito
  const sql = `SELECT COUNT(*) AS total FROM comunicacao c
    INNER JOIN destinatario dest ON dest.comunicacao_id = c.id AND dest.usuario_id = ?
    WHERE c.usuario_id != ? AND c.estado = 'enviada' AND DATE(c.data_hora) = CURDATE()
    ${deptCond}`;
  const [results] = await pool.query(sql, [usuario_id, usuario_id, ...deptParams]);
  return results[0].total;
};

export const listarCIRecebidas = async (departamento_id, usuario_id, pagina = 1, limite = 20, verTodos = false, filtro_departamento_id = null) => {
  const offset = (pagina - 1) * limite;
  const deptCond = filtro_departamento_id
    ? 'AND c.departamento_id = ?'
    : '';
  const deptParams = filtro_departamento_id ? [filtro_departamento_id] : [];
  // todos os cargos: só mostra CIs onde o usuário é destinatário explícito
  const sql = `SELECT c.*, CASE WHEN cl.id IS NOT NULL THEN 1 ELSE 0 END AS lida
    FROM comunicacao c
    INNER JOIN destinatario dest ON dest.comunicacao_id = c.id AND dest.usuario_id = ?
    LEFT JOIN confirmacao_leitura cl ON cl.comunicacao_id = c.id AND cl.usuario_id = ?
    WHERE c.usuario_id != ? AND c.estado = 'enviada' AND DATE(c.data_hora) = CURDATE()
    ${deptCond}
    ORDER BY cl.id IS NOT NULL, c.data_hora DESC LIMIT ? OFFSET ?`;
  const [results] = await pool.query(sql, [usuario_id, usuario_id, usuario_id, ...deptParams, limite, offset]);
  return results;
};

export const contarCIEnviadas = async (usuario_id, filtro_departamento_id = null) => {
  const deptCond = filtro_departamento_id ? ' AND departamento_id = ?' : '';
  const params = filtro_departamento_id ? [usuario_id, filtro_departamento_id] : [usuario_id];
  const [results] = await pool.query(
    `SELECT COUNT(*) AS total FROM comunicacao WHERE usuario_id = ? AND estado = 'enviada' AND DATE(data_hora) = CURDATE()${deptCond}`,
    params
  );
  return results[0].total;
};

export const listarCIEnviadas = async (usuario_id, pagina = 1, limite = 20, filtro_departamento_id = null) => {
  const offset = (pagina - 1) * limite;
  const deptCond = filtro_departamento_id ? 'AND c.departamento_id = ?' : '';
  const params = filtro_departamento_id
    ? [usuario_id, filtro_departamento_id, limite, offset]
    : [usuario_id, limite, offset];
  const sql = `
    SELECT c.*,
      (SELECT COUNT(*) FROM confirmacao_leitura cl WHERE cl.comunicacao_id = c.id) AS total_lidas,
      (SELECT COUNT(*) FROM destinatario d WHERE d.comunicacao_id = c.id) AS total_destinatarios
    FROM comunicacao c
    WHERE c.usuario_id = ? AND c.estado = 'enviada' AND DATE(c.data_hora) = CURDATE() ${deptCond}
    ORDER BY c.data_hora DESC LIMIT ? OFFSET ?`;
  const [results] = await pool.query(sql, params);
  return results;
};

export const listarRascunhos = async (usuario_id) => {
  const sql = "SELECT * FROM comunicacao WHERE usuario_id = ? AND estado = 'rascunho' ORDER BY data_hora DESC";
  const [results] = await pool.query(sql, [usuario_id]);
  return results;
};

export const atualizarCI = async (id, titulo, descricao, departamento_id, estado) => {
  const sql = 'UPDATE comunicacao SET titulo = ?, descricao = ?, departamento_id = ?, estado = ?, data_hora = NOW() WHERE id = ?';
  const [result] = await pool.query(sql, [titulo, descricao, departamento_id, estado, id]);
  return result;
};

export const arquivarCI = async (id) => {
  const sql = "UPDATE comunicacao SET estado = 'arquivada' WHERE id = ?";
  const [result] = await pool.query(sql, [id]);
  return result;
};

export const listarCIsArquivadas = async (usuario_id, departamento_id, pagina = 1, limite = 20) => {
  const offset = (pagina - 1) * limite;
  const sql = `
    SELECT c.*, u.nome AS usuario_nome,
      (SELECT COUNT(*) FROM confirmacao_leitura cl WHERE cl.comunicacao_id = c.id) AS total_lidas,
      (SELECT COUNT(*) FROM destinatario d WHERE d.comunicacao_id = c.id) AS total_destinatarios
    FROM comunicacao c
    INNER JOIN usuario u ON u.id = c.usuario_id
    WHERE c.estado = 'arquivada'
      AND (c.usuario_id = ? OR c.departamento_id = ?)
    ORDER BY c.data_hora DESC
    LIMIT ? OFFSET ?`;
  const [results] = await pool.query(sql, [usuario_id, departamento_id, limite, offset]);
  return results;
};

export const contarCIsArquivadas = async (usuario_id, departamento_id) => {
  const sql = `SELECT COUNT(*) AS total FROM comunicacao c
    WHERE c.estado = 'arquivada' AND (c.usuario_id = ? OR c.departamento_id = ?)`;
  const [[row]] = await pool.query(sql, [usuario_id, departamento_id]);
  return row.total;
};

// listarMinhasCIs — histórico completo: todas as CIs enviadas ou recebidas pelo usuário
export const listarMinhasCIs = async (usuario_id, departamento_id, pagina = 1, limite = 20, filtro_departamento_id = null) => {
  const offset = (pagina - 1) * limite;
  if (filtro_departamento_id) {
    // filtro por dept: próprias CIs nesse dept (qualquer estado) + enviadas de outros nesse dept
    const sql = `
      SELECT DISTINCT c.*,
        CASE WHEN cl.id IS NOT NULL THEN 1 ELSE 0 END AS lida,
        (SELECT COUNT(*) FROM confirmacao_leitura cl2 WHERE cl2.comunicacao_id = c.id) AS total_lidas,
        (SELECT COUNT(*) FROM destinatario d WHERE d.comunicacao_id = c.id) AS total_destinatarios
      FROM comunicacao c
      LEFT JOIN confirmacao_leitura cl ON cl.comunicacao_id = c.id AND cl.usuario_id = ?
      WHERE c.departamento_id = ? AND (c.usuario_id = ? OR c.estado = 'enviada')
      ORDER BY c.data_hora DESC LIMIT ? OFFSET ?`;
    const [results] = await pool.query(sql, [usuario_id, filtro_departamento_id, usuario_id, limite, offset]);
    return results;
  }
  const sql = `
    SELECT DISTINCT c.*,
      CASE WHEN cl.id IS NOT NULL THEN 1 ELSE 0 END AS lida,
      (SELECT COUNT(*) FROM confirmacao_leitura cl2 WHERE cl2.comunicacao_id = c.id) AS total_lidas,
      (SELECT COUNT(*) FROM destinatario d WHERE d.comunicacao_id = c.id) AS total_destinatarios
    FROM comunicacao c
    LEFT JOIN confirmacao_leitura cl ON cl.comunicacao_id = c.id AND cl.usuario_id = ?
    WHERE c.usuario_id = ?
       OR (c.estado = 'enviada' AND (
         c.departamento_id = ?
         OR EXISTS (SELECT 1 FROM confirmacao_leitura cr WHERE cr.comunicacao_id = c.id AND cr.usuario_id = ?)
       ))
    ORDER BY c.data_hora DESC LIMIT ? OFFSET ?`;
  const [results] = await pool.query(sql, [usuario_id, usuario_id, departamento_id, usuario_id, limite, offset]);
  return results;
};

export const contarMinhasCIs = async (usuario_id, departamento_id, filtro_departamento_id = null) => {
  if (filtro_departamento_id) {
    const sql = `SELECT COUNT(DISTINCT c.id) AS total FROM comunicacao c
                 WHERE c.departamento_id = ? AND (c.usuario_id = ? OR c.estado = 'enviada')`;
    const [results] = await pool.query(sql, [filtro_departamento_id, usuario_id]);
    return results[0].total;
  }
  const sql = `SELECT COUNT(DISTINCT c.id) AS total FROM comunicacao c
               WHERE c.usuario_id = ?
                  OR (c.estado = 'enviada' AND (
                    c.departamento_id = ?
                    OR EXISTS (SELECT 1 FROM confirmacao_leitura cr WHERE cr.comunicacao_id = c.id AND cr.usuario_id = ?)
                  ))`;
  const [results] = await pool.query(sql, [usuario_id, departamento_id, usuario_id]);
  return results[0].total;
};

// buscarCIs — listagem de CIs com filtros opcionais: texto livre, estado, intervalo de datas e departamento.
// Usado quando o usuário aplica filtros ou digita na barra de pesquisa.
// tipo 'recebidas' filtra por departamento_id, tipo 'enviadas' filtra por usuario_id, tipo 'todas' sem restrição.
export const buscarCIs = async ({
  tipo = 'recebidas',
  departamento_id,
  usuario_id,
  verTodos = false,
  busca,
  estado,
  data_inicio,
  data_fim,
  pagina = 1,
  limite = 20
}) => {
  const offset = (pagina - 1) * limite;
  const conditions = [];
  const params = [];

  if (tipo === 'enviadas') {
    conditions.push('usuario_id = ?');
    params.push(usuario_id);
  } else if (tipo === 'recebidas' && !verTodos) {
    conditions.push('departamento_id = ?');
    params.push(departamento_id);
  }

  if (busca) {
    conditions.push('(titulo LIKE ? OR descricao LIKE ?)');
    params.push(`%${busca}%`, `%${busca}%`);
  }

  if (estado) {
    conditions.push('estado = ?');
    params.push(estado);
  }

  if (data_inicio) {
    conditions.push('data_hora >= ?');
    params.push(data_inicio);
  }
  if (data_fim) {
    conditions.push('data_hora <= ?');
    params.push(data_fim + ' 23:59:59');
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const sql = `SELECT * FROM comunicacao ${where} ORDER BY data_hora DESC LIMIT ? OFFSET ?`;
  params.push(limite, offset);

  const [results] = await pool.query(sql, params);
  return results;
};
