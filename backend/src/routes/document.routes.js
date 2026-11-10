const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const { createDocumentController } = require('../controllers/document.controller');
const { createDocumentRepository } = require('../repositories/document.repository');
const { createDocumentService } = require('../services/document.service');

const projectRoot = path.resolve(__dirname, '../../..');
const storageDirectory = process.env.STORAGE_DIR
  ? path.resolve(projectRoot, process.env.STORAGE_DIR)
  : path.resolve(__dirname, '../../storage');
const maxFileSizeBytes = Number(process.env.MAX_FILE_SIZE_BYTES || 10485760);
const maxStorageBytes = Number(process.env.MAX_STORAGE_BYTES || 2147483648);
const allowedExtensions = (process.env.ALLOWED_FILE_EXTENSIONS || '.pdf,.doc,.docx,.txt,.rtf')
  .split(',')
  .map((extension) => extension.trim().toLowerCase())
  .filter(Boolean)
  .map((extension) => (extension.startsWith('.') ? extension : `.${extension}`));

if (!Number.isSafeInteger(maxFileSizeBytes) || maxFileSizeBytes <= 0) {
  throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
}
if (!Number.isSafeInteger(maxStorageBytes) || maxStorageBytes <= 0) {
  throw new Error('MAX_STORAGE_BYTES deve ser um inteiro positivo.');
}
if (allowedExtensions.length === 0) {
  throw new Error('ALLOWED_FILE_EXTENSIONS deve conter pelo menos uma extensão.');
}

const mimeTypesByExtension = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword', 'application/octet-stream'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream',
  ],
  '.txt': ['text/plain'],
  '.rtf': ['application/rtf', 'text/rtf', 'application/x-rtf'],
};

const repository = createDocumentRepository(storageDirectory);
const service = createDocumentService(repository);
const controller = createDocumentController(service);
const router = express.Router();
let reservedStorageBytes = 0;

async function getStorageUsage() {
  try {
    const entries = await fs.readdir(storageDirectory, { withFileTypes: true });
    const fileStats = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map((entry) => fs.stat(path.join(storageDirectory, entry.name))),
    );
    return fileStats.reduce((total, stats) => total + stats.size, 0);
  } catch (error) {
    if (error.code === 'ENOENT') return 0;
    throw error;
  }
}

async function reserveStorage(req, res, next) {
  const contentLength = Number(req.get('content-length'));
  const reservationBytes = Number.isSafeInteger(contentLength) && contentLength > 0
    ? Math.min(contentLength, maxFileSizeBytes)
    : maxFileSizeBytes;

  try {
    const storageUsage = await getStorageUsage();
    if (storageUsage + reservedStorageBytes + reservationBytes > maxStorageBytes) {
      res.status(507).json({
        error: {
          code: 'STORAGE_LIMIT_REACHED',
          message: 'O armazenamento local atingiu o limite configurado.',
        },
      });
      return;
    }

    reservedStorageBytes += reservationBytes;
    let reservationReleased = false;
    const releaseReservation = () => {
      if (reservationReleased) return;
      reservedStorageBytes -= reservationBytes;
      reservationReleased = true;
    };
    res.once('finish', releaseReservation);
    res.once('close', releaseReservation);
    next();
  } catch (error) {
    next(error);
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      fs.mkdir(storageDirectory, { recursive: true })
        .then(() => callback(null, storageDirectory))
        .catch(() => {
          const error = new Error('Não foi possível acessar o armazenamento local.');
          error.code = 'STORAGE_ERROR';
          error.statusCode = 500;
          callback(error);
        });
    },
    filename(req, file, callback) {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: maxFileSizeBytes, files: 1 },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = mimeTypesByExtension[extension];
    if (
      !allowedExtensions.includes(extension)
      || (allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype))
    ) {
      const error = new Error('Tipo de arquivo não permitido.');
      error.code = 'INVALID_FILE_TYPE';
      error.statusCode = 415;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

router.post('/upload', reserveStorage, upload.single('file'), controller.upload);
router.get('/documents', controller.list);
router.get('/documents/:id/download', controller.download);

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  let code = error.code;
  let statusCode = error.statusCode;
  let message = error.message;

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      code = 'FILE_TOO_LARGE';
      statusCode = 413;
      message = 'O arquivo excede o tamanho máximo permitido.';
    } else {
      code = 'INVALID_UPLOAD';
      statusCode = 400;
      message = 'A requisição de upload é inválida.';
    }
  }

  if (!statusCode || !code) {
    code = ['ENOSPC', 'EACCES', 'EROFS', 'ENOENT'].includes(error.code)
      ? 'STORAGE_ERROR'
      : 'INTERNAL_ERROR';
    statusCode = 500;
    message = code === 'STORAGE_ERROR'
      ? 'Não foi possível acessar o armazenamento local.'
      : 'Ocorreu um erro interno.';
  }

  res.status(statusCode).json({ error: { code, message } });
});

module.exports = router;