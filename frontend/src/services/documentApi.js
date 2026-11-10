const API_PREFIX = '/api';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, options);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Não foi possível conectar ao servidor.');
  }
  if (response.ok) return response;

  let message = 'Não foi possível concluir a operação.';
  try {
    const payload = await response.json();
    message = payload.error?.message || message;
  } catch {
    // Respostas sem JSON mantêm a mensagem genérica.
  }
  throw new Error(message);
}

export async function listDocuments({ signal } = {}) {
  const response = await request('/documents', { signal });
  const payload = await response.json();
  return payload.documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request('/upload', { method: 'POST', body: formData });
  const payload = await response.json();
  return payload.document;
}

export async function downloadDocument(id) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`);
  const contentDisposition = response.headers.get('content-disposition') || '';
  const encodedName = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const quotedName = contentDisposition.match(/filename="?([^";]+)"?/i)?.[1];
  let filename = quotedName;

  if (encodedName) {
    try {
      filename = decodeURIComponent(encodedName);
    } catch {
      filename = quotedName;
    }
  }

  return { blob: await response.blob(), filename: filename || 'documento' };
}