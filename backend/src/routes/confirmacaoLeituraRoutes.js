import express from 'express';
import * as confirmacaoController from '../controllers/confirmacaoLeituraController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/:id/confirmar', verificarToken, confirmacaoController.confirmarLeitura);
router.get('/:id/confirmacoes', verificarToken, confirmacaoController.listarConfirmacoesPorCI);

export default router;