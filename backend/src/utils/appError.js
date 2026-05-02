
export class AppError extends Error {
  constructor(mensagem, statusCode, tipo, codigo = null) {
    super(mensagem);
    this.statusCode = statusCode;
    this.tipo = tipo; 
    this.codigo = codigo; 
  }
}

export class ValidationError extends AppError {
  constructor(mensagem, codigo = 'VALIDACAO_INVALIDA', erros = []) {
    super(mensagem, 400, 'validacao', codigo);
    this.erros = erros; // array de erros específicos
  }
}

export class DatabaseError extends AppError {
  constructor(mensagem = 'Erro ao comunicar com banco de dados', codigo = 'ERRO_BANCO') {
    super(mensagem, 500, 'banco', codigo);
  }
}

export class NotFoundError extends AppError {
  constructor(mensagem, codigo = 'NAO_ENCONTRADO') {
    super(mensagem, 404, 'nao-encontrado', codigo);
  }
}

export class ConflictError extends AppError {
  constructor(mensagem, codigo = 'CONFLITO') {
    super(mensagem, 409, 'conflito', codigo);
  }
}

export class AuthenticationError extends AppError {
  constructor(mensagem = 'Não autenticado', codigo = 'NAO_AUTENTICADO') {
    super(mensagem, 401, 'autenticacao', codigo);
  }
}

export class AuthorizationError extends AppError {
  constructor(mensagem = 'Sem permissão', codigo = 'NAO_AUTORIZADO') {
    super(mensagem, 403, 'autorizacao', codigo);
  }
}

export class InternalError extends AppError {
  constructor(mensagem = 'Erro interno do servidor', codigo = 'ERRO_INTERNO') {
    super(mensagem, 500, 'interno', codigo);
  }
}
