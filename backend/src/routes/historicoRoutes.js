import express from 'express';
import { listarHistorico } from '../controllers/historicoController.js';
import { verificarToken, verificarAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, verificarAdmin, listarHistorico);

export default router;
