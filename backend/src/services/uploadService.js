export const processarArquivo = (file) => {
    if (!file) { throw new Error('Arquivo não fornecido'); }
    const tiposPermitidos = {
        'application/pdf': 'pdf',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'image/png': 'png'
    };
    const tipo = tiposPermitidos[file.mimetype] || 'desconhecido';
    return {
        id: file.filename,
        nome: file.originalname,
        tipo: tipo,
        tamanho: file.size,
        caminho: `/uploads/${file.filename}`,
        mimeType: file.mimetype,
        dataUpload: new Date().toISOString()
    };
};