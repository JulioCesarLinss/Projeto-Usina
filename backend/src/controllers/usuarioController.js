import bcrypt from 'bcrypt';
import { criarUsuario, buscarEmail, buscarId, listarUsuarios, atualizarUsuario, deletarUsuario} from '../models/usuarioModel.js';
import jwt from 'jsonwebtoken';

const cadastrarUsuario = async (req, res) => {
    try {
        const { nome, email, senha, cargo_id, departamento_id } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ mensagem: 'Campos obrigatórios' });
        }

        const usuarioExistente = await buscarEmail(email);

        if (usuarioExistente) {
            return res.status(400).json({ mensagem: 'Email já cadastrado' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const resultado = await criarUsuario(
            nome, email, senhaHash, cargo_id, departamento_id
        );

        res.status(201).json({
            mensagem: 'Usuário cadastrado com sucesso',
            id: resultado.insertId
        });

    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuarioExistente = await buscarEmail(email);
        if (!usuarioExistente) {
            return res.status(401).json({ mensagem: 'Email não cadastrado' });
        }
        const senhaCorreta = await bcrypt.compare(senha, usuarioExistente.senha);
        if (!senhaCorreta) {
            return res.status(401).json({ mensagem: 'Senha incorreta' });
        }
        const token = jwt.sign(
            { id: usuarioExistente.id, cargo_id: usuarioExistente.cargo_id },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.status(200).json({ mensagem: 'Login realizado com sucesso', token });

    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
}

const buscarUsuario = async(req, res) => {
    try {
        const { id } = req.params;
        const usuario = await buscarId(id);
        if (!usuario) {
            return res.status(404).json({ mensagem: 'ID inexistente' });
        }
        const { senha, ...usuarioSemSenha } = usuario;
        return res.status(200).json({ usuario: usuarioSemSenha });

    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
}
const listarUsuariosController = async(req, res) => {
    try {
        const usuarios = await listarUsuarios();
        const usuariosSemSenha = usuarios.map(({ senha, ...resto }) => resto);
        return res.status(200).json({ usuarios: usuariosSemSenha });
    } catch(err) {
        res.status(500).json({ erro: err.message });
    }
}

const atualizarUsuarioController = async(req,res) => {
    try{
        const { id } = req.params;
        const {nome, email, senha, cargo_id, departamento_id } = req.body;
        const usuario = await buscarId(id);
        if(!usuario){
            return res.status(404).json({mensagem: "Usuário não existe"})
        }
        if (email){
            const emailExistente = await buscarEmail(email);
            if(emailExistente && emailExistente.id !== parseInt(id)){
                return res.status(400).json({mensagem: 'Email já cadastrado'});
        }
        }
        let senhaFinal = usuario.senha;
        if (senha) {
            senhaFinal = await bcrypt.hash(senha, 10);
        }
        await atualizarUsuario(id,nome,email,senhaFinal,cargo_id,departamento_id);
        return res.status(200).json({mensagem: "Usuário atualizado"});
    }catch(err){
        res.status(500).json({erro: err.message});
    }
}

const deletarUsuarioController = async(req,res) => {
    try{
        const { id } = req.params;
        const deletar = await deletarUsuario(id);
         return res.status(200).json({mensagem: "usuario deletado"});
    }catch(err){
        res.status(500).json({erro: err.message});
    }
}

export { cadastrarUsuario, login, buscarUsuario, listarUsuariosController, atualizarUsuarioController, deletarUsuarioController};