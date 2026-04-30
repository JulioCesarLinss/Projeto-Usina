import bcrypt from 'bcrypt';
import { criarUsuario, buscar_email } from '../models/usuarioModel.js';
import jwt from 'jsonwebtoken';

const cadastrarUsuario = async (req, res) => {
    try {
        const { nome, email, senha, cargo_id, departamento_id } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ mensagem: 'Campos obrigatórios' });
        }

        const usuarioExistente = await buscar_email(email);

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
        const usuarioExistente = await buscar_email(email);
        if (!usuarioExistente) {
            return res.status(400).json({ mensagem: 'Email não cadastrado' });
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