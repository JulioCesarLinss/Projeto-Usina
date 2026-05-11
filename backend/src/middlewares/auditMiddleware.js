import pool from '../config/db.js';

// Descobre o IP real do usuário
// O x-forwarded-for existe pois às vezes o usuário passa por um intermediário
export const getClientIP = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    'unknown'
  );
};

// Grava uma linha no banco com o que aconteceu, quando, quem fez e de onde
export const registrarLog = async (usuarioId, acao, ip) => {
  try {
    const sql = `
      INSERT INTO logs_sistema (acao_realizada, data_hora, usuario_id, ip_usuario)
      VALUES (?, NOW(), ?, ?)
    `;
    await pool.query(sql, [
      acao.substring(0, 150),
      usuarioId,
      ip.substring(0, 45)
    ]);
  } catch (err) {
    // Se o log falhar a aplicação continua normalmente
    // O log nunca pode derrubar o sistema
    console.error('Erro ao registrar log:', err.message);
  }
};

// Monitora todas as requisições automaticamente
export const auditMiddleware = (req, res, next) => {
  const ip = getClientIP(req);

  // Espera a resposta ser enviada antes de gravar
  // Assim não atrasa a resposta para o usuário
  res.on('finish', async () => {
    const usuarioId = req.usuario?.id || null;
    const statusCode = res.statusCode;

    // Só loga alterações e acessos negados
    // GET normais não precisam ser logados
    const shouldLog =
      req.method !== 'GET' ||
      statusCode === 401 ||
      statusCode === 403 ||
      statusCode === 429;

    // Health check acontece o tempo todo, não precisa logar
    if (!shouldLog || req.path.includes('/health')) return;

    // Alerta no console quando alguém é bloqueado
    if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
      console.warn(
        `ACESSO NEGADO: ip=${ip} rota=${req.path} status=${statusCode}`
      );
    }

    if (usuarioId) {
      const acao = `${req.method} ${req.path} | status=${statusCode}`;
      await registrarLog(usuarioId, acao, ip);
    }
  });

  next();
};