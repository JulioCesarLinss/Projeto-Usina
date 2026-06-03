import * as logModel from '../models/logModel.js';
import { DatabaseError } from '../utils/appError.js';

// listarAuditoria — retorna os logs do sistema com filtros e paginação.
// Admin e gerente veem todos os logs. Supervisor vê apenas logs do próprio departamento.
export const listarAuditoria = async (req, res, next) => {
  try {
    const { usuario_id, acao, nome, data_inicio, data_fim, pagina, limite } = req.query;
    const cargo = req.usuario.cargo_id;
    const departamento_id = req.usuario.departamento_id;

    const filtros = {
      // supervisor (cargo 3) fica restrito ao próprio departamento
      usuario_id: cargo === 3 ? null : (usuario_id || null),
      departamento_id: cargo === 3 ? departamento_id : null,
      acao: acao || null,
      nome: nome || null,
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
