import express from 'express';
import * as relatorioController from '../controllers/relatorioController.js';
import { verificarToken, verificarGerente } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/resumo',           verificarToken, verificarGerente, relatorioController.getResumo);
router.get('/por-departamento', verificarToken, verificarGerente, relatorioController.getPorDepartamento);
router.get('/evolucao-mensal',  verificarToken, verificarGerente, relatorioController.getEvolucaoMensal);

export default router;
