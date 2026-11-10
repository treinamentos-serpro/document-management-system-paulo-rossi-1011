const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const storageDirectory = path.join(os.tmpdir(), `dms-test-${process.pid}`);
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '1024';
const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await fs.rm(storageDirectory, { recursive: true, force: true });
});

test('o app backend é exportado', () => {
  assert.equal(typeof app, 'function');
});

test('faz upload, lista e baixa um documento', async () => {
  const initialList = await fetch(`${baseUrl}/documents`);
  assert.equal(initialList.status, 200);
  assert.deepEqual(await initialList.json(), { documents: [] });

  const form = new FormData();
  form.append('file', new Blob(['conteudo do documento'], { type: 'text/plain' }), 'documento.txt');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-teste' },
    body: form,
  });

  assert.equal(uploadResponse.status, 201);
  const { document } = await uploadResponse.json();
  assert.equal(document.originalName, 'documento.txt');
  assert.equal(document.owner, 'usuario-teste');
  assert.equal(document.size, Buffer.byteLength('conteudo do documento'));
  assert.equal(Object.hasOwn(document, 'storageName'), false);

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.deepEqual((await listResponse.json()).documents, [document]);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.equal(downloadResponse.status, 200);
  assert.equal(await downloadResponse.text(), 'conteudo do documento');
  assert.match(downloadResponse.headers.get('content-disposition'), /documento\.txt/);
});

test('retorna erros claros para uploads e documentos inválidos', async () => {
  const emptyForm = new FormData();
  const missingFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: emptyForm,
  });
  assert.equal(missingFileResponse.status, 400);
  assert.equal((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

  const invalidTypeForm = new FormData();
  invalidTypeForm.append('file', new Blob(['x']), 'program.exe');
  const invalidTypeResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: invalidTypeForm,
  });
  assert.equal(invalidTypeResponse.status, 415);
  assert.equal((await invalidTypeResponse.json()).error.code, 'INVALID_FILE_TYPE');

  const oversizedForm = new FormData();
  oversizedForm.append('file', new Blob(['x'.repeat(1025)], { type: 'text/plain' }), 'large.txt');
  const oversizedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: oversizedForm,
  });
  assert.equal(oversizedResponse.status, 413);
  assert.equal((await oversizedResponse.json()).error.code, 'FILE_TOO_LARGE');

  const missingDocumentResponse = await fetch(`${baseUrl}/documents/id-inexistente/download`);
  assert.equal(missingDocumentResponse.status, 404);
  assert.equal((await missingDocumentResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');
});
