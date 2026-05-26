import multer from 'multer';
import { AppError, ValidationError, DatabaseError } from '../utils/appError.js';

export const handleError = (err, req, res, next) => {
  console.error('ERRO:', {
    tipo: err.tipo || err.code || 'desconhecido',
    mensagem: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  if (err instanceof multer.MulterError) {
    let mensagem = 'Erro ao realizar upload';
    let codigo = 'ERRO_UPLOAD';
    let status = 400;

    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        mensagem = 'Tamanho de arquivo maior que 15MB não é permitido';
        codigo = 'UPLOAD_TAMANHO_EXCEDIDO';
        status = 413;
        break;
      case 'LIMIT_UNEXPECTED_FILE':
      case 'LIMIT_FILE_COUNT':
        mensagem = 'Apenas um arquivo é permitido por upload';
        codigo = 'UPLOAD_ARQUIVO_EXCEDIDO';
        break;
      default:
        mensagem = err.message || 'Erro ao realizar upload';
        codigo = 'ERRO_UPLOAD';
    }

    return res.status(status).json({
      sucesso: false,
      tipo: 'upload',
      erro: mensagem,
      codigo: codigo
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      sucesso: false,
      tipo: err.tipo,
      erro: err.message,
      codigo: err.codigo,
      ...(err.erros && { erros: err.erros })
    });
  }

  if (err.code && /^ER_|^PROTOCOL_/.test(err.code)) {
    console.error(' ERRO DE BANCO:', err.code, err.sqlMessage);

    const errosBanco = {
      'ER_DUP_ENTRY': {
        mensagem: 'Registro duplicado no banco de dados',
        codigo: 'REGISTRO_DUPLICADO'
      },
      'ER_NO_REFERENCED_ROW': {
        mensagem: 'Referência inválida no banco de dados',
        codigo: 'REFERENCIA_INVALIDA'
      },
      'ER_ACCESS_DENIED_ERROR': {
        mensagem: 'Erro de autenticação no banco de dados',
        codigo: 'ERRO_AUTENTICACAO_BANCO'
      },
      'PROTOCOL_CONNECTION_LOST': {
        mensagem: 'Conexão com banco de dados perdida',
        codigo: 'CONEXAO_PERDIDA'
      },
      'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR': {
        mensagem: 'Banco de dados indisponível',
        codigo: 'BANCO_INDISPONIVEL'
      }
    };

    const erroBanco = errosBanco[err.code] || {
      mensagem: 'Erro ao comunicar com banco de dados',
      codigo: 'ERRO_BANCO_DESCONHECIDO'
    };

    return res.status(500).json({
      sucesso: false,
      tipo: 'banco',
      erro: erroBanco.mensagem,
      codigo: erroBanco.codigo,
      ...(process.env.NODE_ENV === 'development' && { 
        detalhes: err.sqlMessage || err.message 
      })
    });
  }

  if (err.array && typeof err.array === 'function') {
    const erros = err.array().map(e => ({
      campo: e.param,
      mensagem: e.msg,
      valor: e.value
    }));

    return res.status(400).json({
      sucesso: false,
      tipo: 'validacao',
      erro: 'Dados inválidos',
      codigo: 'VALIDACAO_FALHOU',
      erros: erros
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      sucesso: false,
      tipo: 'autenticacao',
      erro: 'Token inválido',
      codigo: 'TOKEN_INVALIDO'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      sucesso: false,
      tipo: 'autenticacao',
      erro: 'Token expirado',
      codigo: 'TOKEN_EXPIRADO'
    });
  }

  console.error(' ERRO NÃO TRATADO:', err);

  const statusCode = err.statusCode || 500;
  const mensagem = process.env.NODE_ENV === 'production' 
    ? 'Erro interno do servidor' 
    : err.message;

  res.status(statusCode).json({
    sucesso: false,
    tipo: 'interno',
    erro: mensagem,
    codigo: 'ERRO_INTERNO',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      detalhes: err.message
    })
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};
