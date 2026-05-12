import express from 'express';
import * as usuarioController from '../controllers/usuarioController.js';
import {
  verificarToken,
  verificarAdmin,
  verificarProprioOuAdmin
} from '../middlewares/authMiddleware.js';
import { loginRateLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

// ==================== ROTAS PÚBLICAS ====================
// Qualquer pessoa pode acessar sem estar logada

// Cadastro de novo usuário
router.post('/cadastro', usuarioController.cadastrarUsuario);

// Login — tem rate limit, máximo 5 tentativas a cada 15 minutos
router.post('/login', loginRateLimiter, usuarioController.login);

// ==================== ROTAS AUTENTICADAS ====================
// Só acessa quem estiver logado com token válido

// Logout — cancela o token imediatamente
router.post('/logout', verificarToken, usuarioController.logout);

// Listar todos os usuários — qualquer usuário logado pode ver
router.get('/', verificarToken, usuarioController.listarUsuarios);

// Buscar usuário por ID — qualquer usuário logado pode ver
router.get('/:id', verificarToken, usuarioController.buscarUsuario);

// Atualizar usuário — só o próprio usuário ou admin pode editar
router.put('/:id', verificarToken, verificarProprioOuAdmin, usuarioController.atualizarUsuario);

// Deletar usuário — só admin pode deletar
router.delete('/:id', verificarToken, verificarAdmin, usuarioController.deletarUsuario);

export default router;
