import { processarArquivo } from '../services/uploadService.js';

export const uploadFile = (req, res, next) => {

  try {

   
    if (!req.file || req.file.size === 0) {
      throw new Error('Arquivo vazio');
    }

  
    console.log({
      usuario: req.usuario.id,
      arquivo: req.file.filename,
      tamanho: req.file.size,
      data: new Date()
    });

    const arquivo = processarArquivo(req.file);

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Arquivo enviado com sucesso',
      arquivo
    });

  } catch (err) {
    next(err);
  }
};