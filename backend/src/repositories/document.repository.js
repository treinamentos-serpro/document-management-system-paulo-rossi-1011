const path = require('node:path');
const fs = require('node:fs/promises');

function createDocumentRepository(storageDirectory) {
  const documents = new Map();
  const resolvedStorageDirectory = path.resolve(storageDirectory);

  return {
    save(document) {
      documents.set(document.id, document);
      return document;
    },

    findAll() {
      return Array.from(documents.values()).sort(
        (first, second) => Date.parse(second.uploadedAt) - Date.parse(first.uploadedAt),
      );
    },

    findById(id) {
      return documents.get(id) || null;
    },

    getFilePath(storageName) {
      const filePath = path.resolve(resolvedStorageDirectory, storageName);
      const relativePath = path.relative(resolvedStorageDirectory, filePath);
      if (
        !relativePath
        || relativePath === '..'
        || relativePath.startsWith(`..${path.sep}`)
        || path.isAbsolute(relativePath)
      ) {
        throw new Error('Nome de armazenamento inválido.');
      }
      return filePath;
    },

    getFileStats(storageName) {
      return fs.stat(this.getFilePath(storageName));
    },

    async removeFile(storageName) {
      try {
        await fs.unlink(this.getFilePath(storageName));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    },
  };
}

module.exports = { createDocumentRepository };