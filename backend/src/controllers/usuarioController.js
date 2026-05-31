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

import { revogarToken } from '../middlewares/authMiddleware.js';
import { registrarLog, getClientIP } from '../middlewares/auditMiddleware.js';

export const cadastrarUsuario = async (req, res, next) => {
  try {
    const { nome, email, senha, cargo_id, departamento_id } = req.body;

    const errosValidacao = usuarioService.validarDadosCadastro(
      nome,
      email,
      senha,
      cargo_id,
      departamento_id
    );

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

    const senhaHash = await bcrypt.hash(senha, 12);

    let resultado;

    try {
      resultado = await usuarioModel.criarUsuario(
        nome,
        email,
        senhaHash,
        cargo_id,
        departamento_id
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

    // Sempre executa o bcrypt mesmo quando usuário não existe
    // Isso impede ataques por diferença de tempo de resposta
    const senhaFake =
      '$2b$12$invalido.hash.para.timing.safe.xxxxxxxxxxxxxxxxxxxxxx';

    const hashParaComparar = usuario
      ? usuario.senha
      : senhaFake;

    const senhaCorreta = await bcrypt.compare(
      senha,
      hashParaComparar
    );

    if (!usuario || !senhaCorreta) {
      throw new AuthenticationError(
        'Email ou senha incorretos',
        'CREDENCIAIS_INVALIDAS'
      );
    }

    // bloqueia login de usuários inativados pelo administrador
    if (usuario.ativo === 0) {
      throw new AuthenticationError(
        'Usuário inativo. Entre em contato com o administrador.',
        'USUARIO_INATIVO'
      );
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('Erro ao gerar token');
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        cargo_id: usuario.cargo_id,
        email: usuario.email,
        departamento_id: usuario.departamento_id
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRATION || '8h'
      }
    );

    const ip = getClientIP(req);

    await registrarLog(
      usuario.id,
      'LOGIN',
      ip
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
        []
      );
    }

    let usuarios;

    try {
      usuarios = await usuarioModel.listarUsuarios(
        pagina,
        limite
      );
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

    const {
      nome,
      email,
      senha,
      cargo_id,
      departamento_id
    } = req.body;

    if (!id || isNaN(id)) {
      throw new ValidationError(
        'ID inválido',
        'ID_INVALIDO',
        [{ mensagem: 'ID deve ser um número' }]
      );
    }

    const errosValidacao =
      usuarioService.validarDadosAtualizacao(
        nome,
        email,
        cargo_id,
        departamento_id
      );

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
      resultado = await usuarioModel.atualizarUsuario(
        id,
        nome,
        email,
        cargo_id,
        departamento_id
      );
    } catch (err) {
      throw new DatabaseError(
        'Erro ao atualizar usuário',
        'ERRO_ATUALIZAR_USUARIO'
      );
    }

    if (resultado.affectedRows === 0) {
      throw new Error('Falha ao atualizar usuário');
    }

    if (senha) {
      const senhaHash = await bcrypt.hash(senha, 12);

      await usuarioModel.atualizarSenha(
        id,
        senhaHash
      );
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

export const trocarSenhaUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { senhaAtual, senhaNova } = req.body;

    if (!senhaAtual || !senhaNova)
      throw new ValidationError('Preencha todos os campos', 'CAMPOS_OBRIGATORIOS', []);
    if (senhaNova.length < 8)
      throw new ValidationError('A nova senha deve ter no mínimo 8 caracteres', 'SENHA_CURTA', []);

    const usuario = await usuarioModel.buscarSenhaId(id);
    if (!usuario)
      throw new NotFoundError('Usuário não encontrado', 'USUARIO_NAO_ENCONTRADO');

    const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaCorreta)
      throw new AuthenticationError('Senha atual incorreta', 'SENHA_ATUAL_INCORRETA');

    const senhaHash = await bcrypt.hash(senhaNova, 12);
    await usuarioModel.atualizarSenha(id, senhaHash);

    res.status(200).json({ sucesso: true, mensagem: 'Senha alterada com sucesso' });
  } catch (err) {
    next(err);
  }
};

// soft delete — inativa o usuário sem remover do banco
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
      // inativarUsuario faz UPDATE ativo = 0 em vez de DELETE
      resultado = await usuarioModel.inativarUsuario(id);
    } catch (err) {
      throw new DatabaseError(
        'Erro ao inativar usuário',
        'ERRO_INATIVAR_USUARIO'
      );
    }

    if (resultado.affectedRows === 0) {
      throw new Error('Falha ao inativar usuário');
    }

    res.status(200).json({
      sucesso: true,
      mensagem: 'Usuário inativado com sucesso',
      dados: { id }
    });

  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    // Cancela o token para que não funcione mais
    // Mesmo que alguém tenha o token, não conseguirá mais usar
    if (req._token) {
      revogarToken(req._token);
    }

    const ip = getClientIP(req);
    await registrarLog(req.usuario.id, 'LOGOUT', ip);

    res.status(200).json({
      sucesso: true,
      mensagem: 'Logout realizado com sucesso'
    });

  } catch (err) {
    next(err);
  }
};

export const listarPorDepartamento = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) {
      return res.status(400).json({ sucesso: false, erro: 'ID de departamento inválido', codigo: 'ID_INVALIDO' });
    }
    const usuarios = await usuarioModel.listarPorDepartamento(id);
    res.status(200).json({ sucesso: true, dados: usuarios });
  } catch (err) {
    next(err);
  }
};