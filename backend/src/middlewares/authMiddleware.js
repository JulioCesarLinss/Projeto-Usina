import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from '../utils/appError.js';

export const verificarToken = (req, res, next) => {
  try {
  
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new AuthenticationError(
        'Token ausente',
        'TOKEN_AUSENTE'
      );
    }

    const partes = authHeader.split(' ');
    if (partes.length !== 2 || partes[0] !== 'Bearer') {
      throw new AuthenticationError(
        'Formato de token inválido',
        'FORMATO_INVALIDO'
      );
    }

    const token = partes[1];

    if (!process.env.JWT_SECRET) {
      console.error(' JWT_SECRET não configurada');
      throw new Error('Erro ao verificar token');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Adicionar dados do usuário ao request
    req.usuario = decoded;
    
    next();

  } catch (err) {
    next(err);
  }
};

export const verificarAdmin = (req, res, next) => {
  try {
    if (!req.usuario) {
      throw new AuthenticationError(
        'Usuário não autenticado',
        'NAO_AUTENTICADO'
      );
    }

    if (req.usuario.cargo_id !== 1) {
      throw new AuthorizationError(
        'Permissão insuficiente',
        'NAO_AUTORIZADO'
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};
