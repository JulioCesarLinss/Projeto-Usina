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

export const contarCIRecebidas = async (departamento_id, usuario_id, verTodos = false) => {
  const sql = verTodos
    ? 'SELECT COUNT(*) AS total FROM comunicacao WHERE usuario_id != ?'
    : 'SELECT COUNT(*) AS total FROM comunicacao WHERE departamento_id = ? AND usuario_id != ?';
  const params = verTodos ? [usuario_id] : [departamento_id, usuario_id];
  const [results] = await pool.query(sql, params);
  return results[0].total;
};

export const listarCIRecebidas = async (departamento_id, usuario_id, pagina = 1, limite = 20, verTodos = false) => {
  const offset = (pagina - 1) * limite;
  // exclui CIs criadas pelo próprio usuário — essas ficam só na aba "enviadas"
  // verTodos = true para gerente e master (veem todos os departamentos)
  const sql = verTodos
    ? 'SELECT * FROM comunicacao WHERE usuario_id != ? LIMIT ? OFFSET ?'
    : 'SELECT * FROM comunicacao WHERE departamento_id = ? AND usuario_id != ? LIMIT ? OFFSET ?';
  const params = verTodos ? [usuario_id, limite, offset] : [departamento_id, usuario_id, limite, offset];
  const [results] = await pool.query(sql, params);
  return results;
};

export const contarCIEnviadas = async (usuario_id) => {
  const [results] = await pool.query('SELECT COUNT(*) AS total FROM comunicacao WHERE usuario_id = ?', [usuario_id]);
  return results[0].total;
};

export const listarCIEnviadas = async (usuario_id, pagina = 1, limite = 20) => {
  const offset = (pagina - 1) * limite;
  const sql = 'SELECT * FROM comunicacao WHERE usuario_id = ? LIMIT ? OFFSET ?';
  const [results] = await pool.query(sql, [usuario_id, limite, offset]);
  return results;
};

export const arquivarCI = async (id) => {
  const sql = "UPDATE comunicacao SET estado = 'arquivada' WHERE id = ?";
  const [result] = await pool.query(sql, [id]);
  return result;
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
