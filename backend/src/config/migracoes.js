import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import pool from './db.js';

// ─────────────────────────────────────────────────────────────────────────────
// Migrações automáticas do banco
//
// Toda vez que o backend liga:
//   • banco vazio  → roda schema.sql + dados.sql e marca todas as migrações como feitas
//   • banco antigo → roda, em ordem, os backend/database/migracao_XX_*.sql ainda
//                    não registrados na tabela migracoes_aplicadas
//
// Regras para o grupo:
//   • mudou a estrutura do banco? crie um arquivo NOVO migracao_XX_descricao.sql
//     (XX = próximo número) e atualize também o schema.sql;
//   • nunca edite uma migração que já foi enviada: ela não roda de novo.
//
// A linha opcional "-- ja_aplicada_se: SELECT ..." no topo do arquivo serve para
// bancos criados antes deste sistema: se a consulta trouxer alguma linha, a migração
// é só registrada, sem rodar. Migrações novas não precisam dela.
// ─────────────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTA = path.resolve(__dirname, '../../database');
const PADRAO_MIGRACAO = /^migracao_\d+_.*\.sql$/;

// separa o arquivo em comandos: tira comentários, CREATE DATABASE e USE
// (o banco usado é sempre o do DB_NAME do .env)
const comandosDoArquivo = (sql) => sql
  .replace(/\r\n/g, '\n')
  .split('\n')
  .map(linha => linha.replace(/--.*$/, ''))
  .join('\n')
  .split(/;\s*(?:\n|$)/)
  .map(c => c.trim())
  .filter(c => c && !/^(USE|CREATE DATABASE)\s/i.test(c));

const rodarArquivo = async (conn, arquivo) => {
  const sql = fs.readFileSync(path.join(PASTA, arquivo), 'utf8');
  for (const comando of comandosDoArquivo(sql)) {
    try {
      await conn.query(comando);
    } catch (err) {
      throw new Error(`Falha em ${arquivo}: ${err.message}\n  Comando: ${comando.slice(0, 200)}`);
    }
  }
};

const consultaJaAplicada = (arquivo) => {
  const primeira = fs.readFileSync(path.join(PASTA, arquivo), 'utf8').split(/\r?\n/)[0];
  const m = primeira.match(/^--\s*ja_aplicada_se:\s*(.+)$/i);
  return m ? m[1].trim() : null;
};

const listarMigracoes = () => fs.readdirSync(PASTA)
  .filter(f => PADRAO_MIGRACAO.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

const registrar = (conn, arquivo) =>
  conn.query('INSERT IGNORE INTO migracoes_aplicadas (arquivo, aplicada_em) VALUES (?, NOW())', [arquivo]);

// Primeiro administrador, só quando ainda não existe nenhum e as variáveis
// ADMIN_NOME / ADMIN_EMAIL / ADMIN_SENHA estão no .env (nunca no código).
const criarAdminInicial = async (conn) => {
  const { ADMIN_NOME, ADMIN_EMAIL, ADMIN_SENHA } = process.env;
  const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM usuario WHERE cargo_id = 1');
  if (n > 0) return;
  if (!ADMIN_NOME || !ADMIN_EMAIL || !ADMIN_SENHA) {
    console.warn('⚠️  Nenhum administrador no banco. Defina ADMIN_NOME, ADMIN_EMAIL e ADMIN_SENHA no .env e reinicie para criar o primeiro.');
    return;
  }
  if (ADMIN_SENHA.length < 8) {
    console.warn('⚠️  ADMIN_SENHA precisa ter pelo menos 8 caracteres; administrador não criado.');
    return;
  }
  const departamento_id = parseInt(process.env.ADMIN_DEPARTAMENTO_ID) || 2;
  const usina_id = parseInt(process.env.ADMIN_USINA_ID) || 1;
  const hash = await bcrypt.hash(ADMIN_SENHA, 12);
  await conn.query(
    'INSERT INTO usuario (nome, email, senha, cargo_id, departamento_id, usina_id) VALUES (?, ?, ?, 1, ?, ?)',
    [ADMIN_NOME, ADMIN_EMAIL, hash, departamento_id, usina_id]
  );
  console.log(`👤 Administrador inicial criado: ${ADMIN_EMAIL} (pode remover ADMIN_SENHA do .env agora)`);
};

export const aplicarMigracoes = async () => {
  const conn = await pool.getConnection();
  try {
    // trava: se dois servidores ligarem juntos, só um aplica as migrações
    const [[{ ok }]] = await conn.query("SELECT GET_LOCK('cidigital_migracoes', 60) AS ok");
    if (ok !== 1) throw new Error('Não foi possível obter a trava das migrações');

    await conn.query(`CREATE TABLE IF NOT EXISTS migracoes_aplicadas (
      arquivo VARCHAR(150) PRIMARY KEY,
      aplicada_em DATETIME NOT NULL
    )`);

    const migracoes = listarMigracoes();
    const [[{ tabelas }]] = await conn.query(
      "SELECT COUNT(*) AS tabelas FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuario'"
    );

    if (tabelas === 0) {
      // banco vazio: o schema.sql já contém todas as migrações
      console.log('🗄️  Banco vazio: criando estrutura (schema.sql + dados.sql)...');
      await rodarArquivo(conn, 'schema.sql');
      await rodarArquivo(conn, 'dados.sql');
      for (const m of migracoes) await registrar(conn, m);
      console.log('🗄️  Banco criado.');
    } else {
      const [feitas] = await conn.query('SELECT arquivo FROM migracoes_aplicadas');
      const jaFeitas = new Set(feitas.map(r => r.arquivo));
      for (const m of migracoes) {
        if (jaFeitas.has(m)) continue;
        const verificacao = consultaJaAplicada(m);
        if (verificacao) {
          const [linhas] = await conn.query(verificacao);
          if (linhas.length > 0) {
            await registrar(conn, m);
            console.log(`🗄️  Migração já existente, registrada: ${m}`);
            continue;
          }
        }
        await rodarArquivo(conn, m);
        await registrar(conn, m);
        console.log(`🗄️  Migração aplicada: ${m}`);
      }
    }

    await criarAdminInicial(conn);
  } finally {
    await conn.query("SELECT RELEASE_LOCK('cidigital_migracoes')").catch(() => {});
    conn.release();
  }
};
