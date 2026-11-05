import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import pool from './src/config/db.js';
import usuarioRoutes from './src/routes/usuarioRoutes.js';
import departamentoRoutes from './src/routes/departamentoRoutes.js';
import comunicacaoRoutes from './src/routes/comunicacaoRoutes.js';
import confirmacaoRoutes from './src/routes/confirmacaoLeituraRoutes.js';
import notificacaoRoutes from './src/routes/notificacaoRoutes.js';
import destinatarioRoutes from './src/routes/destinatarioRoutes.js';
import uploadRoutes from './src/routes/uploadRoutes.js';
import { baixarAnexoProtegido } from './src/controllers/uploadController.js';
import { verificarToken } from './src/middlewares/authMiddleware.js';
import auditoriaRoutes from './src/routes/auditoriaRoutes.js';
import relatorioRoutes from './src/routes/relatorioRoutes.js';
import historicoRoutes from './src/routes/historicoRoutes.js';
import { handleError, asyncHandler } from './src/middlewares/errorMiddleware.js';
import { securityHeaders } from './src/middlewares/securityHeadersMiddleware.js';
import { rateLimiter } from './src/middlewares/rateLimitMiddleware.js';
import { sanitizeInputs, validateContentType } from './src/middlewares/sanitizeMiddleware.js';
import { auditMiddleware } from './src/middlewares/auditMiddleware.js';
import { executarLembretesDePrazo, executarLembretesDeReuniao } from './src/services/lembreteService.js';
import reuniaoRoutes from './src/routes/reuniaoRoutes.js';
import { aplicarMigracoes } from './src/config/migracoes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1º — Aplica headers de segurança em TODAS as respostas
// Remove X-Powered-By, adiciona proteções contra clickjacking, XSS, etc
app.use(securityHeaders);

// 2º — Configura quem pode acessar a API
// Só aceita requisições do frontend autorizado
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  optionsSuccessStatus: 200
}));
app.options('*', cors());

// 3º — Limita requisições: por usuário logado (120/min) ou, sem login, por IP (600/min).
// Na empresa todos saem pelo mesmo IP, então o limite por IP sozinho bloquearia todo mundo.
// Ajustável no .env: RATE_LIMIT_USUARIO, RATE_LIMIT_IP, RATE_LOGIN_CONTA, RATE_LOGIN_IP
app.use(rateLimiter({ windowMs: 60000 }));

// 4º — Lê o corpo da requisição com limite de tamanho
// O limite de 1mb evita ataques de payload gigante
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5º — Monitora todas as requisições
// Grava no banco ações importantes e acessos negados
app.use(auditMiddleware);

// 6º — Bloqueia dados maliciosos
// Detecta SQL Injection e XSS antes de chegar no banco
app.use(sanitizeInputs);

// 7º — Valida formato dos dados
// Garante que só chegue JSON nas rotas que esperam JSON
app.use(validateContentType);

// ==================== ROTAS DE HEALTH CHECK ====================
// Verifica se o servidor está online — não precisa de autenticação
app.get('/api/health', (req, res) => {
  res.status(200).json({
    sucesso: true,
    mensagem: 'Servidor online',
    versao: '1.0.0'
  });
});

// Verifica se o banco de dados está conectado
app.get('/api/health/completo', asyncHandler(async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    res.status(200).json({
      sucesso: true,
      mensagem: 'Sistema operacional',
      status: {
        servidor: 'online',
        banco: 'conectado',
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(503).json({
      sucesso: false,
      mensagem: 'Serviço indisponível',
      status: {
        servidor: 'online',
        banco: 'desconectado',
        erro: err.message
      }
    });
  }
}));

// ==================== ARQUIVOS ESTÁTICOS ====================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Fotos de perfil continuam públicas (usadas em <img>/CSS, que não enviam token)
app.use('/uploads/fotos', express.static(path.join(__dirname, 'uploads', 'fotos')));
// Anexos de C.I. exigem login e permissão de leitura da C.I. correspondente
app.get('/uploads/:arquivo', verificarToken, baixarAnexoProtegido);

// ==================== ROTAS DA APLICAÇÃO ====================
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/comunicacoes', comunicacaoRoutes);
app.use('/api/comunicacoes', confirmacaoRoutes);
app.use('/api/notificacoes', notificacaoRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/destinatarios', destinatarioRoutes);
app.use('/api/departamentos', departamentoRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/historico', historicoRoutes);
app.use('/api/reunioes', reuniaoRoutes);

// ==================== ROTA NÃO ENCONTRADA ====================
app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    tipo: 'nao-encontrado',
    erro: 'Rota não encontrada',
    codigo: 'ROTA_NAO_ENCONTRADA'
  });
});

// ==================== TRATAMENTO DE ERROS ====================
app.use(handleError);

// ==================== INICIA O SERVIDOR ====================
// Antes de aceitar acessos, deixa o banco na versão que o código espera.
// Se uma migração falhar, o servidor não liga (evita rodar com o banco pela metade).
try {
  await aplicarMigracoes();
} catch (err) {
  console.error('❌ Erro ao aplicar migrações do banco:', err.message);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📡 API disponível em http://localhost:${PORT}/api`);
  iniciarLembretes();
});

// ==================== LEMBRETES AUTOMÁTICOS ====================
// Ao iniciar e depois a cada 5 minutos:
//  • prazo de leitura: avisa quem ainda não leu as C.I.s cujo prazo vence hoje;
//  • reuniões: avisa os convidados 1 hora antes do início.
// Cada aviso é disparado uma única vez (ver lembreteService).
const CINCO_MINUTOS = 5 * 60 * 1000;
function iniciarLembretes() {
  const rodar = async () => {
    try {
      const r = await executarLembretesDePrazo();
      if (r.lembrados > 0) console.log(`🔔 Lembretes de prazo: ${r.lembrados} pendente(s) em ${r.cis} C.I.(s)`);
    } catch (err) {
      console.error('Erro nos lembretes de prazo:', err.message);
    }
    try {
      const r = await executarLembretesDeReuniao();
      if (r.lembrados > 0) console.log(`🔔 Lembretes de reunião: ${r.lembrados} convidado(s) em ${r.reunioes} reunião(ões)`);
    } catch (err) {
      console.error('Erro nos lembretes de reunião:', err.message);
    }
  };
  rodar();
  setInterval(rodar, CINCO_MINUTOS);
}
