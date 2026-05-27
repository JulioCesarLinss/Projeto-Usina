import * as departamentoModel from '../models/departamentoModel.js';
import { DatabaseError } from '../utils/appError.js';

export const listarDepartamentos = async (req, res, next) => {
  try {
    let departamentos;
    try {
      departamentos = await departamentoModel.listarDepartamentos();
    } catch (err) {
      throw new DatabaseError('Erro ao listar departamentos', 'ERRO_LISTAR_DEPARTAMENTOS');
    }

    res.status(200).json({
      sucesso: true,
      dados: departamentos
    });

  } catch (err) {
    next(err);
  }
};