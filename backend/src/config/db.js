import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();


const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(` ERRO: Variável de ambiente ${envVar} não está configurada`);
    process.exit(1);
  }
});


const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT) || 10;
const port = parseInt(process.env.DB_PORT) || 3306;

// cria o banco se ainda não existir (instalação nova: só precisa do .env).
// As tabelas são criadas depois pelas migrações automáticas (src/config/migracoes.js).
if (!/^[A-Za-z0-9_]+$/.test(process.env.DB_NAME)) {
  console.error(' ERRO: DB_NAME deve conter apenas letras, números e _');
  process.exit(1);
}
try {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || ''
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
  await conn.end();
} catch (err) {
  // sem permissão para criar bancos, segue: o teste de conexão abaixo mostra o erro real
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: connectionLimit,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});


try {
  const connection = await pool.getConnection();
  console.log(' Pool de conexões MySQL conectado com sucesso');
  connection.release();
} catch (err) {
  console.error('Erro ao conectar ao banco de dados:', err.message);
  process.exit(1);
}

export default pool;