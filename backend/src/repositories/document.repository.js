const path = require('node:path');

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
      if (!filePath.startsWith(`${resolvedStorageDirectory}${path.sep}`)) {
        throw new Error('Nome de armazenamento inválido.');
      }
      return filePath;
    },
  };
}

module.exports = { createDocumentRepository };