import express from 'express';
import { listarAuditoria } from '../controllers/auditoriaController.js';
import { verificarToken, verificarSupervisorOuAcima } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Listagem de logs — admin e gerente veem tudo, supervisor vê só seu departamento
router.get('/listar', verificarToken, verificarSupervisorOuAcima, listarAuditoria);

export default router;
