import express from 'express';
import * as usuarioController from '../controllers/usuarioController.js';
import {
  verificarToken,
  verificarAdmin,
  verificarGerente,
  verificarProprioOuAdmin
} from '../middlewares/authMiddleware.js';
import { loginRateLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

// ==================== ROTAS PÚBLICAS ====================

// Login — tem rate limit, máximo 5 tentativas a cada 15 minutos
router.post('/login', loginRateLimiter, usuarioController.login);

// ==================== ROTAS AUTENTICADAS ====================
// Só acessa quem estiver logado com token válido

// Logout — cancela o token imediatamente
router.post('/logout', verificarToken, usuarioController.logout);

// Cadastro — apenas gerente ou master podem criar usuários
// Fluxo: gerente cria o usuário com cargo correto → usuário troca a senha depois
router.post('/cadastro', verificarToken, verificarGerente, usuarioController.cadastrarUsuario);

// Listar todos os usuários — apenas gerente ou master
router.get('/', verificarToken, verificarGerente, usuarioController.listarUsuarios);

// Listar usuários de um departamento — usado no formulário de nova CI
router.get('/departamento/:id', verificarToken, usuarioController.listarPorDepartamento);

// Buscar usuário por ID — qualquer usuário logado pode ver
router.get('/:id', verificarToken, usuarioController.buscarUsuario);

// Atualizar usuário — só o próprio usuário ou admin pode editar
router.put('/:id', verificarToken, verificarProprioOuAdmin, usuarioController.atualizarUsuario);

// Deletar usuário — só admin pode deletar
router.delete('/:id', verificarToken, verificarAdmin, usuarioController.deletarUsuario);

export default router;
