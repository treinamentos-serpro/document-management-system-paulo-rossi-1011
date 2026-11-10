const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

function createServiceError(code, statusCode, message) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function sanitizeOriginalName(originalName) {
  const baseName = path.basename(originalName.replace(/\\/g, '/'));
  const sanitizedName = baseName.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return sanitizedName || 'document';
}

function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
    mimeType: document.mimeType,
  };
}

function createDocumentService(repository) {
  return {
    async uploadDocument(file, ownerHeader) {
      if (!file) {
        throw createServiceError('FILE_REQUIRED', 400, 'Envie um arquivo.');
      }

      const document = {
        id: randomUUID(),
        originalName: sanitizeOriginalName(file.originalname),
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner: String(ownerHeader || 'demo-user').trim().slice(0, 100) || 'demo-user',
        mimeType: file.mimetype || 'application/octet-stream',
        storageName: file.filename,
      };

      try {
        repository.save(document);
      } catch (error) {
        await fs.unlink(file.path).catch(() => {});
        throw createServiceError('STORAGE_ERROR', 500, 'Não foi possível salvar o documento.');
      }

      return toPublicDocument(document);
    },

    listDocuments() {
      return repository.findAll().map(toPublicDocument);
    },

    async getDocumentForDownload(id) {
      const document = repository.findById(id);
      if (!document) {
        throw createServiceError('DOCUMENT_NOT_FOUND', 404, 'Documento não encontrado.');
      }

      const filePath = repository.getFilePath(document.storageName);
      try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
          throw Object.assign(new Error('O caminho não é um arquivo.'), { code: 'ENOENT' });
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw createServiceError('DOCUMENT_NOT_FOUND', 404, 'Documento não encontrado.');
        }
        throw createServiceError('STORAGE_ERROR', 500, 'Não foi possível ler o documento.');
      }

      return { document: toPublicDocument(document), filePath };
    },
  };
}

module.exports = { createDocumentService };