import * as logModel from '../models/logModel.js';
import { DatabaseError } from '../utils/appError.js';

// listarAuditoria — retorna os logs do sistema com filtros e paginação.
// Restrito a gerente e master pelo middleware na rota.
export const listarAuditoria = async (req, res, next) => {
  try {
    const { usuario_id, acao, data_inicio, data_fim, pagina, limite } = req.query;

    const filtros = {
      usuario_id: usuario_id || null,
      acao: acao || null,
      data_inicio: data_inicio || null,
      data_fim: data_fim || null,
      pagina: parseInt(pagina) || 1,
      limite: parseInt(limite) || 20
    };

    let logs, total;

    try {
      [logs, total] = await Promise.all([
        logModel.listarLogs(filtros),
        logModel.contarLogs(filtros)
      ]);
    } catch (err) {
      throw new DatabaseError('Erro ao buscar logs', 'ERRO_BUSCAR_LOGS');
    }

    res.status(200).json({
      sucesso: true,
      dados: logs,
      paginacao: {
        pagina: filtros.pagina,
        limite: filtros.limite,
        total
      }
    });
  } catch (err) {
    next(err);
  }
};
