import express from 'express';
import * as departamentoController from '../controllers/departamentoController.js';
import { verificarToken, verificarGerente } from '../middlewares/authMiddleware.js';
import { bloquearAdminConteudo } from '../middlewares/acessoCIMiddleware.js';

const router = express.Router();

router.get('/listar', verificarToken, departamentoController.listarDepartamentos);
router.get('/stats', verificarToken, departamentoController.listarDepartamentosComStats);
router.get('/:id/comunicacoes', verificarToken, bloquearAdminConteudo, departamentoController.listarCIsPorDepartamento);
router.post('/', verificarToken, verificarGerente, departamentoController.criarDepartamento);
router.delete('/:id', verificarToken, verificarGerente, departamentoController.deletarDepartamento);

export default router;