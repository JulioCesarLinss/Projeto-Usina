import pool from '../config/db.js';

// datas sempre devolvidas como texto 'AAAA-MM-DD HH:MM' (sem conversão de fuso no caminho)
const CAMPOS = `
  r.id, r.titulo, r.descricao, r.modalidade, r.local, r.link, r.estado,
  DATE_FORMAT(r.inicio, '%Y-%m-%d %H:%i') AS inicio,
  DATE_FORMAT(r.fim, '%Y-%m-%d %H:%i') AS fim,
  r.organizador_id, o.nome AS organizador_nome`;

export const criar = async (d, participantes) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO reuniao (titulo, descricao, inicio, fim, modalidade, local, link, organizador_id, usina_id, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [d.titulo, d.descricao, d.inicio, d.fim, d.modalidade, d.local, d.link, d.organizador_id, d.usina_id]
    );
    await conn.query('INSERT INTO reuniao_participante (reuniao_id, usuario_id) VALUES ?',
      [participantes.map(uid => [r.insertId, uid])]);
    await conn.commit();
    return r.insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Atualiza a reunião e a lista de convidados. Quem continua convidado mantém a resposta,
// a menos que a data/hora tenha mudado (aí todos voltam para "pendente").
// Retorna os ids dos convidados novos e dos removidos.
export const atualizar = async (id, d, participantes, mudouHorario) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE reuniao SET titulo = ?, descricao = ?, inicio = ?, fim = ?, modalidade = ?, local = ?, link = ?
         ${mudouHorario ? ', lembrete_enviado_em = NULL' : ''}
       WHERE id = ?`,
      [d.titulo, d.descricao, d.inicio, d.fim, d.modalidade, d.local, d.link, id]
    );
    const [atuais] = await conn.query('SELECT usuario_id FROM reuniao_participante WHERE reuniao_id = ?', [id]);
    const antes = new Set(atuais.map(a => a.usuario_id));
    const depois = new Set(participantes);
    const novos = participantes.filter(uid => !antes.has(uid));
    const removidos = [...antes].filter(uid => !depois.has(uid));

    if (removidos.length)
      await conn.query('DELETE FROM reuniao_participante WHERE reuniao_id = ? AND usuario_id IN (?)', [id, removidos]);
    if (novos.length)
      await conn.query('INSERT INTO reuniao_participante (reuniao_id, usuario_id) VALUES ?', [novos.map(uid => [id, uid])]);
    if (mudouHorario)
      await conn.query("UPDATE reuniao_participante SET resposta = 'pendente', respondido_em = NULL WHERE reuniao_id = ?", [id]);

    await conn.commit();
    return { novos, removidos, mantidos: participantes.filter(uid => antes.has(uid)) };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const cancelar = async (id) => {
  const [r] = await pool.query("UPDATE reuniao SET estado = 'cancelada' WHERE id = ? AND estado = 'agendada'", [id]);
  return r.affectedRows;
};

export const buscarPorId = async (id) => {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS}, r.usina_id, (r.inicio <= NOW()) AS ja_comecou
     FROM reuniao r INNER JOIN usuario o ON o.id = r.organizador_id
     WHERE r.id = ?`, [id]);
  return rows[0];
};

// reuniões do período em que o usuário é organizador ou convidado,
// com a resposta dele e as contagens de presença
export const listarDoPeriodo = async (usuario_id, inicio, fim) => {
  const [rows] = await pool.query(
    `SELECT ${CAMPOS}, (r.inicio <= NOW()) AS ja_comecou,
            meu.resposta AS minha_resposta,
            (SELECT COUNT(*) FROM reuniao_participante p WHERE p.reuniao_id = r.id) AS total_convidados,
            (SELECT COUNT(*) FROM reuniao_participante p WHERE p.reuniao_id = r.id AND p.resposta = 'vou') AS total_vou,
            (SELECT COUNT(*) FROM reuniao_participante p WHERE p.reuniao_id = r.id AND p.resposta = 'nao_vou') AS total_nao_vou
     FROM reuniao r
     INNER JOIN usuario o ON o.id = r.organizador_id
     LEFT JOIN reuniao_participante meu ON meu.reuniao_id = r.id AND meu.usuario_id = ?
     WHERE r.inicio >= ? AND r.inicio < ? + INTERVAL 1 DAY
       AND (r.organizador_id = ? OR meu.usuario_id IS NOT NULL)
     ORDER BY r.inicio`,
    [usuario_id, inicio, fim, usuario_id]);
  return rows;
};

export const listarParticipantes = async (id) => {
  const [rows] = await pool.query(
    `SELECT p.usuario_id, u.nome, dep.nome AS departamento_nome, p.resposta
     FROM reuniao_participante p
     INNER JOIN usuario u ON u.id = p.usuario_id
     LEFT JOIN departamento dep ON dep.id = u.departamento_id
     WHERE p.reuniao_id = ?
     ORDER BY (p.resposta = 'vou') DESC, u.nome`, [id]);
  return rows;
};

export const ehParticipante = async (id, usuario_id) => {
  const [rows] = await pool.query(
    'SELECT resposta FROM reuniao_participante WHERE reuniao_id = ? AND usuario_id = ?', [id, usuario_id]);
  return rows[0] || null;
};

export const responder = async (id, usuario_id, resposta) => {
  const [r] = await pool.query(
    `UPDATE reuniao_participante SET resposta = ?, respondido_em = ${resposta === 'pendente' ? 'NULL' : 'NOW()'}
     WHERE reuniao_id = ? AND usuario_id = ?`,
    [resposta, id, usuario_id]);
  return r.affectedRows;
};

export const idsParticipantes = async (id, excluirNaoVou = false) => {
  const [rows] = await pool.query(
    `SELECT usuario_id FROM reuniao_participante WHERE reuniao_id = ? ${excluirNaoVou ? "AND resposta <> 'nao_vou'" : ''}`, [id]);
  return rows.map(r => r.usuario_id);
};

// só usuários ativos da mesma usina podem ser convidados
export const filtrarConvidaveis = async (usuario_ids, usina_id) => {
  if (!usuario_ids.length) return [];
  const [rows] = await pool.query(
    'SELECT id FROM usuario WHERE id IN (?) AND ativo = 1 AND usina_id = ?', [usuario_ids, usina_id]);
  return rows.map(r => r.id);
};
