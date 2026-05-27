import express from 'express';
import * as departamentoController from '../controllers/departamentoController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/listar', verificarToken, departamentoController.listarDepartamentos);

export default router;