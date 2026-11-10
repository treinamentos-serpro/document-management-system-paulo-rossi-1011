import { useState } from 'react';

const ACCEPTED_FILES = '.pdf,.doc,.docx,.txt,.rtf';

export default function UploadComponent({ onUpload }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  function handleFileChange(event) {
    setFile(event.target.files?.[0] || null);
    setFeedback(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || isUploading) return;

    setIsUploading(true);
    setFeedback(null);
    try {
      await onUpload(file);
      setFile(null);
      event.currentTarget.reset();
      setFeedback({ type: 'success', message: 'Documento enviado.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="upload-panel" onSubmit={handleSubmit}>
      <div className="upload-panel-heading">
        <span className="upload-index">01</span>
        <h2>Novo arquivo</h2>
      </div>
      <label className={`file-picker${file ? ' has-file' : ''}`}>
        <input
          className="visually-hidden"
          type="file"
          accept={ACCEPTED_FILES}
          onChange={handleFileChange}
          aria-label="Selecionar arquivo"
        />
        <span className="file-picker-icon" aria-hidden="true">+</span>
        <span className="file-picker-copy">
          <strong>{file ? 'Arquivo selecionado' : 'Selecionar arquivo'}</strong>
          <span>{file ? file.name : 'PDF, DOC, DOCX, TXT ou RTF'}</span>
        </span>
        <span className="file-size-hint">ATÉ 10 MB</span>
      </label>
      <button className="primary-button" type="submit" disabled={!file || isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
        <span aria-hidden="true">↗</span>
      </button>
      {feedback && (
        <p className={`form-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </p>
      )}
    </form>
  );
}