import pool from '../config/db.js';

export const criarComunicacao = async (titulo, data_hora, estado, descricao, usuario_id, departamento_id, em_nome_de_id = null) => {
  const sql = 'INSERT INTO comunicacao (titulo, data_hora, estado, descricao, usuario_id, departamento_id, em_nome_de_id) VALUES (?, ?, ?, ?, ?, ?, ?)';
  const [result] = await pool.query(sql, [titulo, data_hora, estado, descricao, usuario_id, departamento_id, em_nome_de_id]);
  return result;
};

export const buscarCIporID = async (id) => {
  const sql = `
    SELECT c.id, c.titulo, c.data_hora, c.estado, c.descricao, c.usuario_id, c.departamento_id,
           c.em_nome_de_id, c.aprovado_por, c.aprovado_em,
           u.nome AS usuario_nome, u.foto_url AS usuario_foto,
           g.nome AS em_nome_de_nome
    FROM comunicacao c
    INNER JOIN usuario u ON c.usuario_id = u.id
    LEFT JOIN usuario g ON g.id = c.em_nome_de_id
    WHERE c.id = ?`;
  const [results] = await pool.query(sql, [id]);
  return results[0];
};

export const contarCIRecebidas = async (departamento_id, usuario_id, verTodos = false, filtro_departamento_id = null, apenasNaoLidas = false) => {
  const deptCond = filtro_departamento_id ? 'AND c.departamento_id = ?' : '';
  const deptParams = filtro_departamento_id ? [filtro_departamento_id] : [];
  const dateCond = apenasNaoLidas ? '' : 'AND DATE(c.data_hora) = CURDATE()';
  const naoLidaCond = apenasNaoLidas ? 'AND cl.id IS NULL' : '';
  const sql = `SELECT COUNT(*) AS total FROM comunicacao c
    INNER JOIN destinatario dest ON dest.comunicacao_id = c.id AND dest.usuario_id = ?
    LEFT JOIN confirmacao_leitura cl ON cl.comunicacao_id = c.id AND cl.usuario_id = ?
    WHERE c.usuario_id != ? AND c.estado = 'enviada'
    ${dateCond} ${deptCond} ${naoLidaCond}`;
  const [results] = await pool.query(sql, [usuario_id, usuario_id, usuario_id, ...deptParams]);
  return results[0].total;
};

export const listarCIRecebidas = async (departamento_id, usuario_id, pagina = 1, limite = 20, verTodos = false, filtro_departamento_id = null, apenasNaoLidas = false) => {
  const offset = (pagina - 1) * limite;
  const deptCond = filtro_departamento_id ? 'AND c.departamento_id = ?' : '';
  const deptParams = filtro_departamento_id ? [filtro_departamento_id] : [];
  const dateCond = apenasNaoLidas ? '' : 'AND DATE(c.data_hora) = CURDATE()';
  const naoLidaCond = apenasNaoLidas ? 'AND cl.id IS NULL' : '';
  const sql = `SELECT c.*, CASE WHEN cl.id IS NOT NULL THEN 1 ELSE 0 END AS lida
    FROM comunicacao c
    INNER JOIN destinatario dest ON dest.comunicacao_id = c.id AND dest.usuario_id = ?
    LEFT JOIN confirmacao_leitura cl ON cl.comunicacao_id = c.id AND cl.usuario_id = ?
    WHERE c.usuario_id != ? AND c.estado = 'enviada'
    ${dateCond} ${deptCond} ${naoLidaCond}
    ORDER BY c.data_hora DESC LIMIT ? OFFSET ?`;
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

export const deletarRascunho = async (id, usuario_id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM confirmacao_leitura WHERE comunicacao_id = ?', [id]);
    await conn.query('DELETE FROM destinatario WHERE comunicacao_id = ?', [id]);
    await conn.query('DELETE FROM anexo WHERE comunicacao_id = ?', [id]);
    await conn.query('DELETE FROM notificacoes WHERE comunicacao_id = ?', [id]);
    await conn.query('UPDATE logs_sistema SET comunicacao_id = NULL WHERE comunicacao_id = ?', [id]);
    const [result] = await conn.query(
      "DELETE FROM comunicacao WHERE id = ? AND usuario_id = ? AND estado = 'rascunho'",
      [id, usuario_id]
    );
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const atualizarCI = async (id, titulo, descricao, departamento_id, estado, em_nome_de_id = null) => {
  const sql = 'UPDATE comunicacao SET titulo = ?, descricao = ?, departamento_id = ?, estado = ?, em_nome_de_id = ?, data_hora = NOW() WHERE id = ?';
  const [result] = await pool.query(sql, [titulo, descricao, departamento_id, estado, em_nome_de_id, id]);
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
  limite = 20,
  usina_id = null
}) => {
  const offset = (pagina - 1) * limite;
  const conditions = [];
  const params = [];

  // rascunho é privado do autor; gerentes (verTodos) só veem C.I.s da própria usina
  conditions.push("(estado <> 'rascunho' OR usuario_id = ?)");
  params.push(usuario_id);
  if (verTodos && usina_id) {
    conditions.push('usuario_id IN (SELECT id FROM usuario WHERE usina_id = ?)');
    params.push(usina_id);
  }

  if (tipo === 'enviadas') {
    conditions.push('usuario_id = ?');
    params.push(usuario_id);
  } else if (!verTodos) {
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


// ---------- fluxo de aprovação ----------
export const definirEstado = async (id, estado) => {
  const [result] = await pool.query('UPDATE comunicacao SET estado = ? WHERE id = ?', [estado, id]);
  return result;
};

// só aprova se ainda estiver aguardando (evita aprovação dupla)
export const aprovarCI = async (id, gerente_id, assinatura) => {
  const [result] = await pool.query(
    `UPDATE comunicacao SET estado = 'enviada', aprovado_por = ?, aprovado_em = NOW(),
       assinatura_aprovacao = ?, data_hora = NOW()
     WHERE id = ? AND estado = 'aguardando_aprovacao'`,
    [gerente_id, assinatura, id]
  );
  return result;
};

export const listarParaAprovar = async (gerente_id) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.titulo, c.data_hora, c.estado, c.departamento_id, u.nome AS usuario_nome
     FROM comunicacao c INNER JOIN usuario u ON u.id = c.usuario_id
     WHERE c.em_nome_de_id = ? AND c.estado = 'aguardando_aprovacao'
     ORDER BY c.data_hora DESC LIMIT 100`, [gerente_id]);
  return rows;
};

export const listarMinhasEmAprovacao = async (usuario_id) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.titulo, c.data_hora, c.estado, c.departamento_id, g.nome AS gerente_nome
     FROM comunicacao c LEFT JOIN usuario g ON g.id = c.em_nome_de_id
     WHERE c.usuario_id = ? AND c.estado IN ('aguardando_aprovacao','ajustes_solicitados')
     ORDER BY c.data_hora DESC LIMIT 100`, [usuario_id]);
  return rows;
};

export const salvarVersaoAtual = async (id, usuario_id) => {
  await pool.query(
    `INSERT INTO comunicacao_versao (comunicacao_id, titulo, descricao, usuario_id, data_hora)
     SELECT id, titulo, descricao, ?, NOW() FROM comunicacao WHERE id = ?`, [usuario_id, id]);
};

export const listarVersoes = async (id) => {
  const [rows] = await pool.query(
    `SELECT v.id, v.titulo, v.descricao, v.data_hora, u.nome AS usuario_nome
     FROM comunicacao_versao v INNER JOIN usuario u ON u.id = v.usuario_id
     WHERE v.comunicacao_id = ? ORDER BY v.data_hora DESC`, [id]);
  return rows;
};
