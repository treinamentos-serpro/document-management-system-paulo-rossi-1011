const { test } = require('node:test');
const assert = require('node:assert/strict');
const createDocumentService = require('../src/services/document.service');

test('createDocument builds metadata and delegates persistence to the repository', () => {
  const savedDocuments = [];
  const documentRepository = {
    save(document) {
      savedDocuments.push(document);
      return document;
    },
  };
  const service = createDocumentService(documentRepository, {
    createId: () => 'document-1',
    now: () => new Date('2026-01-02T03:04:05.000Z'),
  });

  const document = service.createDocument(
    { originalname: 'report.pdf', size: 128 },
    'user-1',
  );

  assert.deepStrictEqual(document, {
    id: 'document-1',
    originalName: 'report.pdf',
    size: 128,
    uploadedAt: '2026-01-02T03:04:05.000Z',
    owner: 'user-1',
  });
  assert.deepStrictEqual(savedDocuments, [document]);
});

test('listDocuments and getDocumentById delegate to their repository operations', () => {
  const documents = [{ id: 'document-1', owner: 'user-1' }];
  const calls = [];
  const documentRepository = {
    findByOwner(owner) {
      calls.push(['findByOwner', owner]);
      return documents;
    },
    findById(id) {
      calls.push(['findById', id]);
      return documents[0];
    },
  };
  const service = createDocumentService(documentRepository);

  assert.strictEqual(service.listDocuments('user-1'), documents);
  assert.strictEqual(service.getDocumentById('document-1'), documents[0]);
  assert.deepStrictEqual(calls, [
    ['findByOwner', 'user-1'],
    ['findById', 'document-1'],
  ]);
});
