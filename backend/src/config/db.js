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


const pool = mysql.createPool({
  host: process.env.DB_HOST,
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