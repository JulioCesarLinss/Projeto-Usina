import connection from '../config/db.js';

const criarUsuario = (nome,email,senha,cargo_id,departamento_id) => {
    return new Promise((resolve, reject)=>{
        const sql = 'INSERT INTO usuario (nome,email,senha,cargo_id,departamento_id) VALUES (?,?,?,?,?)';
        
        connection.query(sql, [nome,email,senha,cargo_id,departamento_id], (err, result)=>{
            if(err) reject(err);
            else resolve(result);
        });
    });
}

const buscarEmail = (email)=>{
    return new Promise((resolve,reject)=>{
        const sql = 'SELECT * FROM usuario WHERE email = ?'
        connection.query(sql,[email],(err,result)=>{
            if(err){
                reject(err);
            }
            else{
                resolve(result[0]);
            }
        });
    });
}

const buscarId = (id) =>{
    return new Promise((resolve,reject)=>{
        const sql = 'SELECT * FROM usuario WHERE id = ?'
        connection.query(sql,[id],(err,result)=>{
            if(err){
                reject(err);
            }
            else{
                resolve(result[0]);
            }
        });
    });
}

const listarUsuarios = () =>{
    return new Promise((resolve,reject)=>{
        const sql = 'SELECT * FROM usuario'
        connection.query(sql, (err, results)=>{
            if(err) reject(err);
            else resolve(results);
        });
    });
}

const atualizarUsuario = (id, nome, email, senha, cargo_id, departamento_id) =>{
    return new Promise((resolve,reject)=>{
        const sql = 'UPDATE usuario SET nome = ?, email = ?, senha = ?, cargo_id = ?, departamento_id = ? WHERE id = ?';
        connection.query(sql, [nome, email, senha, cargo_id, departamento_id, id], (err, results)=>{
            if(err) reject(err);
            else resolve(results);
        });
    });
}

const deletarUsuario = (id)=>{
    return new Promise((resolve,reject)=>{
        const sql = 'DELETE FROM usuario WHERE id = ?';
        connection.query(sql, [id], (err, results)=>{
            if(err) reject(err);
            else resolve(results);
        });
    });
}

export { criarUsuario, buscarEmail, bucarId, listarUsuarios, atualizarUsuario, deletarUsuario };