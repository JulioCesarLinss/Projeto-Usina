import express from 'express';
import * as comunicacaoController from '../controllers/comunicacaoController.js';
import { verificarToken, verificarAdmin, verificarGerente } from '../middlewares/authMiddleware.js';
import { verificarAcessoCI, bloquearAdminConteudo } from '../middlewares/acessoCIMiddleware.js';
import * as aprovacaoController from '../controllers/aprovacaoController.js';

const router = express.Router();

router.post('/criar', verificarToken, comunicacaoController.criarCI);
router.get('/recebidas', verificarToken, comunicacaoController.listarComunicacaoRecebidas);
router.get('/enviadas', verificarToken, comunicacaoController.listarComunicacaoEnviadas);
// rota de busca com filtros — deve vir antes de /:id para não ser interceptada
router.get('/buscar', verificarToken, bloquearAdminConteudo, comunicacaoController.buscarCIsComFiltros);
// fluxo de aprovação do gerente (rotas fixas antes de /:id)
router.get('/aprovacoes', verificarToken, aprovacaoController.listarAprovacoes);
router.post('/:id/aprovar', verificarToken, aprovacaoController.aprovar);
router.post('/:id/solicitar-ajustes', verificarToken, aprovacaoController.solicitarAjustes);
router.get('/:id/comentarios', verificarToken, verificarAcessoCI, aprovacaoController.listarComentarios);
router.post('/:id/comentarios', verificarToken, verificarAcessoCI, aprovacaoController.comentar);
router.get('/minhas', verificarToken, comunicacaoController.listarMinhasCIs);
router.get('/rascunhos', verificarToken, comunicacaoController.listarRascunhos);
router.put('/:id', verificarToken, comunicacaoController.atualizarCI);
router.delete('/:id/rascunho', verificarToken, comunicacaoController.deletarRascunho);
router.get('/arquivadas', verificarToken, bloquearAdminConteudo, comunicacaoController.listarCIsArquivadas);
router.post('/:id/arquivar', verificarToken, verificarGerente, comunicacaoController.arquivarComunicacao);
router.get('/:id/anexos', verificarToken, verificarAcessoCI, comunicacaoController.listarAnexosCI);
router.get('/:id/destinatarios', verificarToken, verificarAcessoCI, comunicacaoController.listarDestinatariosCI);
router.get('/:id', verificarToken, verificarAcessoCI, comunicacaoController.buscarCIporID);

export default router;