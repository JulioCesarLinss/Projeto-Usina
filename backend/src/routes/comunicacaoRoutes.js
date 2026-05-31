import express from 'express';
import * as comunicacaoController from '../controllers/comunicacaoController.js';
import { verificarToken, verificarAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/criar', verificarToken, comunicacaoController.criarCI);
router.get('/recebidas', verificarToken, comunicacaoController.listarComunicacaoRecebidas);
router.get('/enviadas', verificarToken, comunicacaoController.listarComunicacaoEnviadas);
// rota de busca com filtros — deve vir antes de /:id para não ser interceptada
router.get('/buscar', verificarToken, comunicacaoController.buscarCIsComFiltros);
router.get('/minhas', verificarToken, comunicacaoController.listarMinhasCIs);
router.get('/rascunhos', verificarToken, comunicacaoController.listarRascunhos);
router.put('/:id', verificarToken, comunicacaoController.atualizarCI);
// arquivar é exclusivo do administrador geral
router.post('/:id/arquivar', verificarToken, verificarAdmin, comunicacaoController.arquivarComunicacao);
router.get('/:id/anexos', verificarToken, comunicacaoController.listarAnexosCI);
router.get('/:id/destinatarios', verificarToken, comunicacaoController.listarDestinatariosCI);
router.get('/:id', verificarToken, comunicacaoController.buscarCIporID);

export default router;