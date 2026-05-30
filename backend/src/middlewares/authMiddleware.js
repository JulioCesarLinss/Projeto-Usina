import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from '../utils/appError.js';

// Lista de tokens cancelados pelo logout
const tokenBlacklist = new Set();
const blacklistExpiry = new Map();

// Limpa tokens antigos da lista a cada hora
// Tokens expirados não precisam ficar na lista para sempre
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of blacklistExpiry.entries()) {
    if (now > expiry) {
      tokenBlacklist.delete(token);
      blacklistExpiry.delete(token);
    }
  }
}, 60 * 60 * 1000);

// Chamada no logout para cancelar o token imediatamente
export const revogarToken = (token) => {
  tokenBlacklist.add(token);
  // Fica na blacklist pelo mesmo tempo que o token duraria (8 horas)
  blacklistExpiry.set(token, Date.now() + 8 * 60 * 60 * 1000);
};

export const verificarToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader)
      throw new AuthenticationError('Token ausente', 'TOKEN_AUSENTE');

    const partes = authHeader.split(' ');
    if (partes.length !== 2 || partes[0] !== 'Bearer')
      throw new AuthenticationError(
        'Formato inválido. Use: Bearer <token>',
        'FORMATO_INVALIDO'
      );

    const token = partes[1];

    // Verifica se o token foi cancelado por logout
    if (tokenBlacklist.has(token))
      throw new AuthenticationError(
        'Token revogado. Faça login novamente',
        'TOKEN_REVOGADO'
      );

    // algorithms: ['HS256'] bloqueia o ataque "algorithm: none"
    // Sem isso um hacker criaria token sem assinatura e o sistema aceitaria
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });

    // Verifica se o token tem todos os campos necessários
    if (!decoded.id || !decoded.email || !decoded.cargo_id)
      throw new AuthenticationError('Token inválido', 'PAYLOAD_INVALIDO');

    // Guarda só o necessário — não expõe dados extras
    req.usuario = {
      id: decoded.id,
      email: decoded.email,
      cargo_id: decoded.cargo_id,
      departamento_id: decoded.departamento_id
    };

    // Guardado para uso no logout
    req._token = token;

    next();
  } catch (err) {
    if (err instanceof AuthenticationError) return next(err);
    if (err.name === 'JsonWebTokenError')
      return next(new AuthenticationError('Token inválido', 'TOKEN_INVALIDO'));
    if (err.name === 'TokenExpiredError')
      return next(new AuthenticationError('Token expirado', 'TOKEN_EXPIRADO'));
    next(err);
  }
};

// Verifica se o usuário é administrador (cargo_id === 1)
export const verificarAdmin = (req, res, next) => {
  try {
    if (!req.usuario)
      throw new AuthenticationError('Não autenticado', 'NAO_AUTENTICADO');

    if (req.usuario.cargo_id !== 1)
      throw new AuthorizationError('Apenas administradores', 'APENAS_ADMIN');

    next();
  } catch (err) {
    next(err);
  }
};

// Permite apenas gerente (cargo 2) e master (cargo 1)
export const verificarGerente = (req, res, next) => {
  try {
    if (!req.usuario)
      throw new AuthenticationError('Não autenticado', 'NAO_AUTENTICADO');
    if (req.usuario.cargo_id > 2)
      throw new AuthorizationError('Acesso restrito a gerentes ou administradores', 'ACESSO_NEGADO');
    next();
  } catch (err) {
    next(err);
  }
};

// Permite supervisor (cargo 3), gerente (cargo 2) e master (cargo 1)
export const verificarSupervisorOuAcima = (req, res, next) => {
  try {
    if (!req.usuario)
      throw new AuthenticationError('Não autenticado', 'NAO_AUTENTICADO');
    if (req.usuario.cargo_id > 3)
      throw new AuthorizationError('Acesso restrito a supervisores ou acima', 'ACESSO_NEGADO');
    next();
  } catch (err) {
    next(err);
  }
};

// Garante que usuário só edita a si mesmo, a menos que seja admin
export const verificarProprioOuAdmin = (req, res, next) => {
  try {
    if (!req.usuario)
      throw new AuthenticationError('Não autenticado', 'NAO_AUTENTICADO');

    const isProprioUsuario = req.usuario.id === parseInt(req.params.id);
    const isAdmin = req.usuario.cargo_id === 1;

    if (!isProprioUsuario && !isAdmin)
      throw new AuthorizationError(
        'Sem permissão para este recurso',
        'ACESSO_NEGADO'
      );

    next();
  } catch (err) {
    next(err);
  }
};