import dotenv from 'dotenv';
import express from 'express';
import connection from './src/config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

connection.connect((err) => {
  if (err) {
    console.log('Erro ao conectar no banco:', err.message);
    return;
  }
  console.log('Banco de dados conectado com sucesso!');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});