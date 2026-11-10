import DownloadButton from './DownloadButton.jsx';

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(value));
}

export default function DocumentList({ documents, isLoading }) {
  if (isLoading) return <p className="list-state" role="status">Carregando documentos...</p>;

  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state-mark" aria-hidden="true">0</span>
        <p>Nenhum documento por aqui.</p>
      </div>
    );
  }

  return (
    <>
      <div className="list-caption">
        <span>{String(documents.length).padStart(2, '0')} ITENS</span>
        <span>ORDENADOS POR DATA</span>
      </div>
      <ul className="document-list">
        {documents.map((document) => (
          <li className="document-row" key={document.id}>
            <span className="document-type" aria-hidden="true">
              {(document.originalName.split('.').pop() || 'DOC').slice(0, 4).toUpperCase()}
            </span>
            <div className="document-info">
              <strong title={document.originalName}>{document.originalName}</strong>
              <span>{formatFileSize(document.size)} <span aria-hidden="true">·</span> {formatUploadDate(document.uploadedAt)}</span>
            </div>
            <DownloadButton document={document} />
          </li>
        ))}
      </ul>
    </>
  );
}