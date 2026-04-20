import connection from '../config/db.js';

const criarUsuario = (nome,email,senha,cargo_id,departamento_id) => {
    const sql = 'INSERT INTO usuario (nome,email,senha,cargo_id,departamento_id) VALUES (?,?,?,?,?)';
    connection.query(sql,[nome,email,senha,cargo_id,departamento_id]);
}

