import express from 'express';
import * as confirmacaoController from '../controllers/confirmacaoLeituraController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';
import { verificarAcessoCI } from '../middlewares/acessoCIMiddleware.js';

const router = express.Router();

router.post('/:id/confirmar', verificarToken, verificarAcessoCI, confirmacaoController.confirmarLeitura);
router.get('/:id/confirmacoes', verificarToken, confirmacaoController.listarConfirmacoesPorCI);

export default router;