function createDocumentController(service) {
  return {
    async upload(req, res, next) {
      try {
        const document = await service.uploadDocument(req.file, req.get('X-User-Id'));
        res.status(201).json({ document });
      } catch (error) {
        next(error);
      }
    },

    list(req, res, next) {
      try {
        res.status(200).json({ documents: service.listDocuments() });
      } catch (error) {
        next(error);
      }
    },

    async download(req, res, next) {
      try {
        const { document, filePath } = await service.getDocumentForDownload(req.params.id);
        res.type(document.mimeType);
        res.download(filePath, document.originalName, (error) => {
          if (!error) return;
          if (res.headersSent) {
            res.destroy(error);
            return;
          }

          const storageError = new Error('Não foi possível ler o documento.');
          storageError.code = 'STORAGE_ERROR';
          storageError.statusCode = 500;
          next(storageError);
        });
      } catch (error) {
        next(error);
      }
    },
  };
}

module.exports = { createDocumentController };