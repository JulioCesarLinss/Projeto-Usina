import express from 'express';
import * as departamentoController from '../controllers/departamentoController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/listar', verificarToken, departamentoController.listarDepartamentos);
router.get('/stats', verificarToken, departamentoController.listarDepartamentosComStats);
router.get('/:id/comunicacoes', verificarToken, departamentoController.listarCIsPorDepartamento);

export default router;