import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import pool from './src/config/db.js';
import usuarioRoutes from './src/routes/usuarioRoutes.js';
import comunicacaoRoutes from './src/routes/comunicacaoRoutes.js';
import confirmacaoRoutes from './src/routes/confirmacaoLeituraRoutes.js';
import uploadRoutes from './src/routes/uploadRoutes.js';
import { handleError, asyncHandler } from './src/middlewares/errorMiddleware.js';
import { securityHeaders } from './src/middlewares/securityHeadersMiddleware.js';
import { rateLimiter } from './src/middlewares/rateLimitMiddleware.js';
import { sanitizeInputs, validateContentType } from './src/middlewares/sanitizeMiddleware.js';
import { auditMiddleware } from './src/middlewares/auditMiddleware.js';

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

// 3º — Limita requisições por IP
// Máximo 100 requisições por minuto por IP
app.use(rateLimiter({ windowMs: 60000, max: 100 }));

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

// ==================== ROTAS DA APLICAÇÃO ====================
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/comunicacoes', comunicacaoRoutes);
app.use('/api/comunicacoes', confirmacaoRoutes);
app.use('/api/upload', uploadRoutes);

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
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📡 API disponível em http://localhost:${PORT}/api`);
});
