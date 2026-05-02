import express from 'express';
import * as usuarioController from '../controllers/usuarioController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();


router.post('/cadastro', usuarioController.cadastrarUsuario);

router.post('/login', usuarioController.login);


router.get('/', verificarToken, usuarioController.listarUsuarios);

router.get('/:id', verificarToken, usuarioController.buscarUsuario);

router.put('/:id', verificarToken, usuarioController.atualizarUsuario);

router.delete('/:id', verificarToken, usuarioController.deletarUsuario);

export default router;
