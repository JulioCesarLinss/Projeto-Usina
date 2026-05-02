import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as usuarioModel from '../models/usuarioModel.js';
import * as usuarioService from '../services/usuarioService.js';
import { 
  ValidationError, 
  ConflictError, 
  NotFoundError,
  AuthenticationError,
  DatabaseError
} from '../utils/appError.js';

export const cadastrarUsuario = async (req, res, next) => {
  try {
    const { nome, email, senha, cargo_id, departamento_id } = req.body;

    const errosValidacao = usuarioService.validarDadosCadastro(nome, email, senha, cargo_id, departamento_id);
    if (errosValidacao.length > 0) {
      throw new ValidationError(
        'Dados inválidos',
        'VALIDACAO_CADASTRO',
        errosValidacao.map(msg => ({ mensagem: msg }))
      );
    }

    const usuarioExistente = await usuarioModel.buscarEmail(email);
    if (usuarioExistente) {
      throw new ConflictError(
        'Email já cadastrado',
        'EMAIL_DUPLICADO'
      );
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    let resultado;
    try {
      resultado = await usuarioModel.criarUsuario(
        nome, email, senhaHash, cargo_id, departamento_id
      );
    } catch (err) {
      throw new DatabaseError(
        'Erro ao criar usuário',
        'ERRO_CRIAR_USUARIO'
      );
    }

    res.status(201).json({
      sucesso: true,
      mensagem: 'Usuário cadastrado com sucesso',
      dados: {
        id: resultado.insertId,
        nome,
        email
      }
    });

  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, senha } = req.body;

    
    if (!email || !senha) {
      throw new ValidationError(
        'Email e senha são obrigatórios',
        'EMAIL_SENHA_OBRIGATORIO',
        [{ mensagem: 'Email e senha são obrigatórios' }]
      );
    }

    let usuario;
    try {
      usuario = await usuarioModel.buscarSenhaEmail(email);
    } catch (err) {
      throw new DatabaseError(
        'Erro ao buscar usuário',
        'ERRO_BUSCAR_USUARIO'
      );
    }

    if (!usuario) {
      throw new AuthenticationError(
        'Email ou senha incorretos',
        'CREDENCIAIS_INVALIDAS'
      );
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      throw new AuthenticationError(
        'Email ou senha incorretos',
        'CREDENCIAIS_INVALIDAS'
      );
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET não configurada');
      throw new Error('Erro ao gerar token');
    }

    const token = jwt.sign(
      { id: usuario.id, cargo_id: usuario.cargo_id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '8h' }
    );

    res.status(200).json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso',
      dados: {
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          cargo_id: usuario.cargo_id,
          departamento_id: usuario.departamento_id
        }
      }
    });

  } catch (err) {
    next(err);
  }
};

export const buscarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      throw new ValidationError(
        'ID inválido',
        'ID_INVALIDO',
        [{ mensagem: 'ID deve ser um número' }]
      );
    }

    let usuario;
    try {
      usuario = await usuarioModel.buscarId(id);
    } catch (err) {
      throw new DatabaseError(
        'Erro ao buscar usuário',
        'ERRO_BUSCAR_USUARIO'
      );
    }

    if (!usuario) {
      throw new NotFoundError(
        'Usuário não encontrado',
        'USUARIO_NAO_ENCONTRADO'
      );
    }

    res.status(200).json({
      sucesso: true,
      dados: usuario
    });

  } catch (err) {
    next(err);
  }
};


export const listarUsuarios = async (req, res, next) => {
  try {
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 20;

    if (pagina < 1 || limite < 1) {
      throw new ValidationError(
        'Página e limite devem ser maiores que 0',
        'PAGINACAO_INVALIDA',
        [{ mensagem: 'Página: minimum 1', valor: pagina }, { mensagem: 'Limite: minimum 1', valor: limite }]
      );
    }

    let usuarios;
    try {
      usuarios = await usuarioModel.listarUsuarios(pagina, limite);
    } catch (err) {
      throw new DatabaseError(
        'Erro ao listar usuários',
        'ERRO_LISTAR_USUARIOS'
      );
    }

    res.status(200).json({
      sucesso: true,
      dados: usuarios,
      paginacao: {
        pagina,
        limite,
        total: usuarios.length
      }
    });

  } catch (err) {
    next(err);
  }
};


export const atualizarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, email, cargo_id, departamento_id } = req.body;

    if (!id || isNaN(id)) {
      throw new ValidationError(
        'ID inválido',
        'ID_INVALIDO',
        [{ mensagem: 'ID deve ser um número' }]
      );
    }

    // Validar dados
    const errosValidacao = usuarioService.validarDadosAtualizacao(nome, email, cargo_id, departamento_id);
    if (errosValidacao.length > 0) {
      throw new ValidationError(
        'Dados inválidos',
        'VALIDACAO_ATUALIZACAO',
        errosValidacao.map(msg => ({ mensagem: msg }))
      );
    }

    let usuarioExistente;
    try {
      usuarioExistente = await usuarioModel.buscarId(id);
    } catch (err) {
      throw new DatabaseError(
        'Erro ao buscar usuário',
        'ERRO_BUSCAR_USUARIO'
      );
    }

    if (!usuarioExistente) {
      throw new NotFoundError(
        'Usuário não encontrado',
        'USUARIO_NAO_ENCONTRADO'
      );
    }

    if (email && email !== usuarioExistente.email) {
      const emailEmUso = await usuarioModel.buscarEmail(email);
      if (emailEmUso) {
        throw new ConflictError(
          'Email já cadastrado',
          'EMAIL_DUPLICADO'
        );
      }
    }

    let resultado;
    try {
      resultado = await usuarioModel.atualizarUsuario(id, nome, email, cargo_id, departamento_id);
    } catch (err) {
      throw new DatabaseError(
        'Erro ao atualizar usuário',
        'ERRO_ATUALIZAR_USUARIO'
      );
    }

    if (resultado.affectedRows === 0) {
      throw new Error('Falha ao atualizar usuário');
    }

    res.status(200).json({
      sucesso: true,
      mensagem: 'Usuário atualizado com sucesso',
      dados: {
        id,
        nome,
        email,
        cargo_id,
        departamento_id
      }
    });

  } catch (err) {
    next(err);
  }
};


export const deletarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      throw new ValidationError(
        'ID inválido',
        'ID_INVALIDO',
        [{ mensagem: 'ID deve ser um número' }]
      );
    }

    let usuarioExistente;
    try {
      usuarioExistente = await usuarioModel.buscarId(id);
    } catch (err) {
      throw new DatabaseError(
        'Erro ao buscar usuário',
        'ERRO_BUSCAR_USUARIO'
      );
    }

    if (!usuarioExistente) {
      throw new NotFoundError(
        'Usuário não encontrado',
        'USUARIO_NAO_ENCONTRADO'
      );
    }

    let resultado;
    try {
      resultado = await usuarioModel.deletarUsuario(id);
    } catch (err) {
      throw new DatabaseError(
        'Erro ao deletar usuário',
        'ERRO_DELETAR_USUARIO'
      );
    }

    if (resultado.affectedRows === 0) {
      throw new Error('Falha ao deletar usuário');
    }

    res.status(200).json({
      sucesso: true,
      mensagem: 'Usuário deletado com sucesso',
      dados: { id }
    });

  } catch (err) {
    next(err);
  }
};