import express from 'express';
import * as comunicacaoController from '../controllers/comunicacaoController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/criar', verificarToken, comunicacaoController.criarCI);
router.get('/recebidas', verificarToken, comunicacaoController.listarComunicacaoRecebidas);
router.get('/enviadas', verificarToken, comunicacaoController.listarComunicacaoEnviadas);
router.post('/:id/arquivar', verificarToken, comunicacaoController.arquivarComunicacao);
router.get('/:id/anexos', verificarToken, comunicacaoController.listarAnexosCI);
router.get('/:id', verificarToken, comunicacaoController.buscarCIporID);

export default router;