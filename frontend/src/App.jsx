import { useEffect, useRef, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments, uploadDocument } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [listError, setListError] = useState('');
  const listRequestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++listRequestId.current;
    listDocuments({ signal: controller.signal })
      .then((result) => {
        if (requestId === listRequestId.current) setDocuments(result);
      })
      .catch((error) => {
        if (error.name !== 'AbortError' && requestId === listRequestId.current) {
          setListError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && requestId === listRequestId.current) {
          setIsLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  async function handleUpload(file) {
    const document = await uploadDocument(file);
    listRequestId.current += 1;
    setListError('');
    setIsLoading(false);
    setIsRefreshing(false);
    setDocuments((currentDocuments) => (
      currentDocuments.some((currentDocument) => currentDocument.id === document.id)
        ? currentDocuments
        : [document, ...currentDocuments]
    ));
  }

  async function handleRefresh() {
    const requestId = ++listRequestId.current;
    setIsRefreshing(true);
    setListError('');
    try {
      const result = await listDocuments();
      if (requestId === listRequestId.current) setDocuments(result);
    } catch (error) {
      if (requestId === listRequestId.current) setListError(error.message);
    } finally {
      if (requestId === listRequestId.current) setIsRefreshing(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>ARQUIVO<span className="brand-dot">.</span></span>
        </a>
        <div className="storage-indicator">
          <span className="status-light" aria-hidden="true" />
          STORAGE LOCAL
        </div>
      </header>

      <section className="page-heading" id="inicio">
        <div>
          <p className="eyebrow">DOCUMENT MANAGEMENT SYSTEM</p>
          <h1>Seus documentos,<br />em ordem.</h1>
        </div>
        <p className="heading-note">Biblioteca de arquivos<br />da sessão atual</p>
      </section>

      <section className="workspace" aria-label="Gerenciamento de documentos">
        <aside className="upload-column">
          <UploadComponent onUpload={handleUpload} />
          <div className="local-note">
            <span className="local-note-mark" aria-hidden="true">i</span>
            <p>Os arquivos ficam neste servidor. O catálogo é reiniciado quando o serviço reinicia.</p>
          </div>
        </aside>

        <section className="documents-column" aria-labelledby="documents-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">BIBLIOTECA</p>
              <h2 id="documents-title">Documentos</h2>
            </div>
            <button
              className="icon-button refresh-button"
              type="button"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              aria-label="Atualizar lista de documentos"
              title="Atualizar lista"
            >
              <span aria-hidden="true">↻</span>
            </button>
          </div>

          {listError && (
            <div className="notice notice-error" role="alert">
              <span>{listError}</span>
              <button type="button" onClick={handleRefresh} disabled={isRefreshing}>
                Tentar novamente
              </button>
            </div>
          )}

          {listError && documents.length === 0 ? (
            <p className="list-state" role="status">A lista está indisponível.</p>
          ) : (
            <DocumentList documents={documents} isLoading={isLoading} />
          )}
        </section>
      </section>

      <footer className="page-footer">
        <span>DMS <span aria-hidden="true">/</span> MVP</span>
        <span>METADADOS EM MEMÓRIA</span>
      </footer>
    </main>
  );
}
