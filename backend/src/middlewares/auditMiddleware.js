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

// Grava uma linha no banco com o que aconteceu, quando, quem fez e de onde.
// comunicacao_id é opcional — ações como login/logout não têm CI associada.
export const registrarLog = async (usuarioId, acao, ip, comunicacao_id = null) => {
  try {
    const sql = `
      INSERT INTO logs_sistema (acao_realizada, data_hora, usuario_id, ip_usuario, comunicacao_id)
      VALUES (?, NOW(), ?, ?, ?)
    `;
    await pool.query(sql, [
      acao.substring(0, 150),
      usuarioId,
      ip.substring(0, 45),
      comunicacao_id
    ]);
  } catch (err) {
    // Se o log falhar a aplicação continua normalmente
    // O log nunca pode derrubar o sistema
    console.error('Erro ao registrar log:', err.message);
  }
};

// Converte rota HTTP em mensagem legível para o admin
const traduzirAcao = (method, path, statusCode) => {
  if (statusCode === 401) return 'Acesso negado — token inválido';
  if (statusCode === 403) return 'Acesso negado — sem permissão';
  if (statusCode === 429) return 'Bloqueado por excesso de tentativas';
  if (method === 'POST' && path.includes('/login'))      return 'Login realizado';
  if (method === 'POST' && path.includes('/logout'))     return 'Logout realizado';
  if (method === 'POST' && path.includes('/cadastro'))   return 'Usuário cadastrado';
  if (method === 'POST' && path.includes('/criar'))      return 'CI criada';
  if (method === 'POST' && path.includes('/arquivar'))   return 'CI arquivada';
  if (method === 'POST' && path.includes('/confirmar'))  return 'Leitura de CI confirmada';
  if (method === 'POST' && path.includes('/upload'))     return 'Arquivo anexado';
  if (method === 'PUT'  && path.includes('/usuarios'))   return 'Dados de usuário atualizados';
  if (method === 'DELETE' && path.includes('/usuarios')) return 'Usuário inativado';
  if (method === 'PATCH' && path.includes('/todas-lidas')) return 'Notificações marcadas como lidas';
  if (method === 'PATCH' && path.includes('/lida'))      return 'Notificação marcada como lida';
  return `${method} ${path}`;
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
      const acao = traduzirAcao(req.method, req.path, statusCode);
      await registrarLog(usuarioId, acao, ip);
    }
  });

  next();
};