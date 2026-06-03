export const processarArquivo = (file) => {
    if (!file) { throw new Error('Arquivo não fornecido'); }
    const tiposPermitidos = {
        'application/pdf': 'pdf',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg'
    };
    const tipo = tiposPermitidos[file.mimetype] || 'desconhecido';
    const nomeCorreto = Buffer.from(file.originalname, 'latin1').toString('utf8');
    return {
        id: file.filename,
        nome: nomeCorreto,
        tipo: tipo,
        tamanho: file.size,
        caminho: `/uploads/${file.filename}`,
        mimeType: file.mimetype,
        dataUpload: new Date().toISOString()
    };
};