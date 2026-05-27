import express from 'express';
import * as destinatarioController from '../controllers/destinatarioController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/adicionar', verificarToken, destinatarioController.adicionarDestinatario);
router.get('/:id/listar', verificarToken, destinatarioController.listarDestinatariosPorCI);
router.get('/:id/verificar', verificarToken, destinatarioController.verificarDestinatario);

export default router;