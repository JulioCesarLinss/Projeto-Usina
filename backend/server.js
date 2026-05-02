import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import pool from './src/config/db.js';
import usuarioRoutes from './src/routes/usuarioRoutes.js';
import { handleError, asyncHandler } from './src/middlewares/errorMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    sucesso: true, 
    mensagem: 'Servidor online',
    versao: '1.0.0'
  });
});

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


app.use('/api/usuarios', usuarioRoutes);


app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    tipo: 'nao-encontrado',
    erro: 'Rota não encontrada',
    codigo: 'ROTA_NAO_ENCONTRADA',
    caminho: req.path
  });
});

app.use(handleError);


app.listen(PORT, () => {
  console.log(` Servidor rodando em http://localhost:${PORT}`);
  console.log(` API disponível em http://localhost:${PORT}/api`);
});