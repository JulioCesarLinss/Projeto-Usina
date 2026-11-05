import express from 'express';
import * as reuniaoController from '../controllers/reuniaoController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, reuniaoController.listar);
router.post('/', verificarToken, reuniaoController.criar);
router.get('/:id', verificarToken, reuniaoController.detalhe);
router.put('/:id', verificarToken, reuniaoController.atualizar);
router.post('/:id/cancelar', verificarToken, reuniaoController.cancelar);
router.post('/:id/responder', verificarToken, reuniaoController.responder);

export default router;
