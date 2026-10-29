import * as historicoModel from '../models/historicoModel.js';
import { ValidationError, DatabaseError } from '../utils/appError.js';

const ESTADOS = ['enviada', 'arquivada'];
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const JANELA_PADRAO_DIAS = 30; // carregamento parcial: por padrão só os últimos 30 dias

const decodificarCursor = (raw) => {
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (typeof c.d !== 'string' || !Number.isInteger(c.i)) throw new Error();
    return c;
  } catch {
    throw new ValidationError('Cursor inválido', 'CURSOR_INVALIDO', []);
  }
};

// GET /api/historico — somente administrador. Nunca devolve título nem descrição.
export const listarHistorico = async (req, res, next) => {
  try {
    const { departamento_id, usuario_id, estado, data_inicio, data_fim, cursor } = req.query;
    const limite = Math.min(Math.max(parseInt(req.query.limite) || 30, 1), 100);

    if (estado && !ESTADOS.includes(estado))
      throw new ValidationError('Estado inválido', 'ESTADO_INVALIDO', []);
    if ((data_inicio && !DATA_RE.test(data_inicio)) || (data_fim && !DATA_RE.test(data_fim)))
      throw new ValidationError('Datas devem estar no formato AAAA-MM-DD', 'DATA_INVALIDA', []);

    const inicioPadrao = new Date(Date.now() - JANELA_PADRAO_DIAS * 86400000)
      .toISOString().slice(0, 10);

    let rows;
    try {
      rows = await historicoModel.listarHistorico({
        usina_id: req.usuario.usina_id,
        departamento_id: parseInt(departamento_id) || null,
        usuario_id: parseInt(usuario_id) || null,
        estado: estado || null,
        data_inicio: data_inicio || inicioPadrao,
        data_fim: data_fim || null,
        cursor: cursor ? decodificarCursor(cursor) : null,
        limite
      });
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      throw new DatabaseError('Erro ao buscar histórico', 'ERRO_BUSCAR_HISTORICO');
    }

    const temMais = rows.length > limite;
    const pagina = temMais ? rows.slice(0, limite) : rows;
    const ultimo = pagina[pagina.length - 1];
    const proximo_cursor = temMais
      ? Buffer.from(JSON.stringify({ d: ultimo.cursor_data, i: ultimo.id })).toString('base64url')
      : null;

    res.status(200).json({
      sucesso: true,
      dados: pagina.map(({ cursor_data, ...resto }) => resto),
      proximo_cursor,
      tem_mais: temMais,
      data_inicio: data_inicio || inicioPadrao
    });
  } catch (err) {
    next(err);
  }
};
