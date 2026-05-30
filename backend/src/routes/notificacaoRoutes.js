import express from 'express';
import * as notificacaoController from '../controllers/notificacaoController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/listar', verificarToken, notificacaoController.listarNotificacoes);
router.patch('/todas-lidas', verificarToken, notificacaoController.marcarTodasComoLidas);
router.patch('/ci/:comunicacao_id/lida', verificarToken, notificacaoController.marcarPorComunicacao);
router.patch('/:id/lida', verificarToken, notificacaoController.marcarComoLida);

export default router;