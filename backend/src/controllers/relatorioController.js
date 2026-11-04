import * as relatorioModel from '../models/relatorioModel.js';
import { DatabaseError } from '../utils/appError.js';

// período em dias, entre 1 e 365 (padrão 30)
const lerPeriodo = (valor) => Math.min(Math.max(parseInt(valor) || 30, 1), 365);

export const getResumo = async (req, res, next) => {
  try {
    const periodo = lerPeriodo(req.query.periodo);
    const dados = await relatorioModel.resumo(periodo);
    res.status(200).json({ sucesso: true, dados });
  } catch (err) {
    next(new DatabaseError('Erro ao gerar resumo', 'ERRO_RELATORIO_RESUMO'));
  }
};

export const getPorDepartamento = async (req, res, next) => {
  try {
    const periodo = lerPeriodo(req.query.periodo);
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
