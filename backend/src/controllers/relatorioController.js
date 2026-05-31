import * as relatorioModel from '../models/relatorioModel.js';
import { DatabaseError } from '../utils/appError.js';

export const getResumo = async (req, res, next) => {
  try {
    const periodo = parseInt(req.query.periodo) || 30;
    const dados = await relatorioModel.resumo(periodo);
    res.status(200).json({ sucesso: true, dados });
  } catch (err) {
    next(new DatabaseError('Erro ao gerar resumo', 'ERRO_RELATORIO_RESUMO'));
  }
};

export const getPorDepartamento = async (req, res, next) => {
  try {
    const periodo = parseInt(req.query.periodo) || 30;
    const dados = await relatorioModel.porDepartamento(periodo);
    res.status(200).json({ sucesso: true, dados });
  } catch (err) {
    next(new DatabaseError('Erro ao gerar relatório por departamento', 'ERRO_RELATORIO_DEPTO'));
  }
};

export const getEvolucaoMensal = async (req, res, next) => {
  try {
    const dados = await relatorioModel.evolucaoMensal();
    res.status(200).json({ sucesso: true, dados });
  } catch (err) {
    next(new DatabaseError('Erro ao gerar evolução mensal', 'ERRO_RELATORIO_MENSAL'));
  }
};
