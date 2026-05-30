import express from 'express';
import { listarAuditoria } from '../controllers/auditoriaController.js';
import { verificarToken, verificarGerente } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Listagem de logs — restrito a gerente e master conforme permissões do sistema
router.get('/listar', verificarToken, verificarGerente, listarAuditoria);

export default router;
