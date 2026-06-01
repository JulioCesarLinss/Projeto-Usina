import express from 'express';
import * as usuarioController from '../controllers/usuarioController.js';
import { uploadFotoMiddleware } from '../config/upload.js';
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

// Cadastro — apenas administrador geral pode criar usuários
router.post('/cadastro', verificarToken, verificarAdmin, usuarioController.cadastrarUsuario);

// Listar todos os usuários — apenas administrador geral
router.get('/', verificarToken, verificarAdmin, usuarioController.listarUsuarios);

// Listar usuários de um departamento — usado no formulário de nova CI
router.get('/departamento/:id', verificarToken, usuarioController.listarPorDepartamento);

// Buscar usuário por ID — qualquer usuário logado pode ver
router.get('/:id', verificarToken, usuarioController.buscarUsuario);

// Trocar senha — só o próprio usuário pode trocar sua senha
router.put('/:id/senha', verificarToken, verificarProprioOuAdmin, usuarioController.trocarSenhaUsuario);

// Upload e remoção de foto de perfil
router.post('/:id/foto',   verificarToken, verificarProprioOuAdmin, uploadFotoMiddleware, usuarioController.uploadFotoPerfil);
router.delete('/:id/foto', verificarToken, verificarProprioOuAdmin, usuarioController.removerFotoPerfil);

// Atualizar usuário — só o próprio usuário ou admin pode editar
router.put('/:id', verificarToken, verificarProprioOuAdmin, usuarioController.atualizarUsuario);

// Deletar usuário — só admin pode deletar
router.delete('/:id', verificarToken, verificarAdmin, usuarioController.deletarUsuario);

export default router;
