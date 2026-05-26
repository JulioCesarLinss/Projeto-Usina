import express from 'express';
import * as notificacaoController from '../controllers/notificacaoController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/listar', verificarToken, notificacaoController.listarNotificacoes);
router.patch('/:id/lida', verificarToken, notificacaoController.marcarComoLida);
router.patch('/todas-lidas', verificarToken, notificacaoController.marcarTodasComoLidas);

export default router;