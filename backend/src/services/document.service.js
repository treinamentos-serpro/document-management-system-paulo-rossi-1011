const { randomUUID } = require('node:crypto');

function createDocumentService(
  documentRepository,
  { createId = randomUUID, now = () => new Date() } = {},
) {
  function createDocument(file, owner) {
    const document = {
      id: createId(),
      originalName: file.originalname,
      size: file.size,
      uploadedAt: now().toISOString(),
      owner,
    };

    return documentRepository.save(document);
  }

  function listDocuments(owner) {
    return documentRepository.findByOwner(owner);
  }

  function getDocumentById(id) {
    return documentRepository.findById(id);
  }

  return { createDocument, listDocuments, getDocumentById };
}

module.exports = createDocumentService;
