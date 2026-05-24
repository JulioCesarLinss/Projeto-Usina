import express from 'express';
import * as comunicacaoController from '../controllers/comunicacaoController.js';

const router = express.Router();

router.post('/criar', comunicacaoController.criarCI);

router.get('/recebidas', comunicacaoController.listarComunicacaoRecebidas);

router.get('/enviadas', comunicacaoController.listarComunicacaoEnviadas);

router.post('/:id/arquivar', comunicacaoController.arquivarComunicacao);

router.get('/:id', comunicacaoController.buscarCIporID);

export default router;