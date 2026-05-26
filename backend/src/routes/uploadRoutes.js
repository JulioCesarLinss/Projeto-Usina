import express from 'express';

import { uploadArquivo } from '../middlewares/uploadMiddleware.js';

import { uploadRateLimit } from '../middlewares/uploadRateLimit.js';

import { verificarToken } from '../middlewares/authMiddleware.js';

import { uploadFile } from '../controllers/uploadController.js';

const router = express.Router();

router.post(
  '/',
  verificarToken,
  uploadRateLimit,
  uploadArquivo,
  uploadFile
);
export default router;