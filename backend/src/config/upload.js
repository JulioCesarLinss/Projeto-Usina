import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const extensoesPermitidas = ['.pdf', '.xls', '.xlsx'];

const mimeTypesPermitidos = [
  'application/pdf',

  'application/vnd.ms-excel',

  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, 'storage/uploads');
  },

  filename: (req, file, cb) => {

   
    if (file.originalname.length > 120) {
      return cb(
        new Error('Nome do arquivo muito grande')
      );
    }

    
    const extensao = path.extname(
      file.originalname
    ).toLowerCase();

    if (!extensoesPermitidas.includes(extensao)) {
      return cb(
        new Error(
          'Apenas arquivos PDF e Excel são permitidos'
        )
      );
    }

    
    const nomeSeguro = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '');

    
    const nomeUnico =
      Date.now() +
      '-' +
      crypto.randomUUID() +
      path.extname(nomeSeguro);

    cb(null, nomeUnico);
  }
});

const fileFilter = (req, file, cb) => {

  // REGRA 10 - validar backend
  if (!mimeTypesPermitidos.includes(file.mimetype)) {
    return cb(
      new Error(
        'Apenas arquivos PDF e Excel são permitidos'
      )
    );
  }

  cb(null, true);
};

const upload = multer({

  storage,

  fileFilter,

  limits: {

    
    fieldSize: 1,

    
    files: 1,

    
    fileSize: 15 * 1024 * 1024
  }
});

export default upload;