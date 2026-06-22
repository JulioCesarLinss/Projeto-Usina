import * as departamentoModel from '../models/departamentoModel.js';
import { DatabaseError, ValidationError } from '../utils/appError.js';

export const listarDepartamentos = async (req, res, next) => {
  try {
    let departamentos;
    try {
      departamentos = await departamentoModel.listarDepartamentos();
    } catch (err) {
      throw new DatabaseError('Erro ao listar departamentos', 'ERRO_LISTAR_DEPARTAMENTOS');
    }
    res.status(200).json({ sucesso: true, dados: departamentos });
  } catch (err) {
    next(err);
  }
};

export const listarDepartamentosComStats = async (req, res, next) => {
  try {
    const departamentos = await departamentoModel.listarDepartamentosComStats();
    res.status(200).json({ sucesso: true, dados: departamentos });
  } catch (err) {
    next(err);
  }
};

export const criarDepartamento = async (req, res, next) => {
  try {
    const { nome, descricao } = req.body;
    if (!nome || nome.trim().length < 2)
      throw new ValidationError('Nome do departamento obrigatório (mínimo 2 caracteres)', 'NOME_INVALIDO', []);
    await departamentoModel.criarDepartamento(nome.trim(), (descricao || '').trim());
    res.status(201).json({ sucesso: true, mensagem: 'Departamento criado com sucesso' });
  } catch (err) {
    next(err);
  }
};

export const deletarDepartamento = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) throw new ValidationError('ID inválido', 'ID_INVALIDO', []);
    const dept = await departamentoModel.buscarDepartamentoporID(id);
    if (!dept) throw new ValidationError('Departamento não encontrado', 'NAO_ENCONTRADO', []);
    await departamentoModel.deletarDepartamento(id);
    res.status(200).json({ sucesso: true, mensagem: 'Departamento excluído com sucesso' });
  } catch (err) {
    next(err);
  }
};

export const listarCIsPorDepartamento = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) throw new ValidationError('ID inválido', 'ID_INVALIDO', []);
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 15;
    const busca = (req.query.busca || '').trim();
    const [cis, total] = await Promise.all([
      departamentoModel.listarCIsPorDepartamento(id, pagina, limite, busca),
      departamentoModel.contarCIsPorDepartamento(id, busca)
    ]);
    res.status(200).json({ sucesso: true, dados: cis, paginacao: { pagina, limite, total } });
  } catch (err) {
    next(err);
  }
};