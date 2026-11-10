# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web simples para enviar, listar e baixar documentos armazenados no filesystem local, com metadados mantidos em memória e sem autenticação nesta fase.

## 2. Escopo

### Dentro do escopo

- Envio de um documento por requisição.
- Listagem dos documentos disponíveis no processo atual.
- Download de um documento pelo identificador.
- Registro demonstrativo de um identificador de dono (`owner`), sem autenticação ou autorização.
- Interface web em React para selecionar, enviar, listar e baixar documentos.
- Exibição de estados de carregamento, sucesso e erro na interface, com mensagens em português.

### Fora do escopo

- Login, autenticação, autorização e isolamento de documentos por usuário.
- Armazenamento em nuvem, banco de dados ou qualquer serviço externo.
- Versionamento, edição, exclusão, busca, compartilhamento e pré-visualização de documentos.
- Persistência durável dos metadados e recuperação automática do catálogo após reinício.
- Upload de múltiplos arquivos em uma única requisição.

### Premissas e estado inicial

O backend atualmente expõe somente `GET /health`; os endpoints DMS descritos aqui são requisitos planejados. O MVP é adequado a uma única instância de backend: os arquivos permanecem no disco local, mas o catálogo em memória é perdido quando o processo reinicia. A aplicação não deve apresentar o campo `owner` como proteção de acesso.

## 3. Requisitos funcionais

| ID | Requisito | Critérios de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento. | A interface envia um arquivo em `multipart/form-data`; o backend valida a requisição, grava o conteúdo localmente e retorna os metadados com identificador único. Uma requisição sem arquivo ou com arquivo inválido retorna erro legível e não cria registro utilizável. |
| RF-02 | O usuário pode listar documentos. | A listagem retorna os metadados dos documentos registrados no processo atual, sem incluir caminhos físicos. Uma lista sem documentos retorna sucesso com coleção vazia. |
| RF-03 | O usuário pode baixar um documento pelo identificador. | Um identificador existente retorna os bytes do arquivo, como anexo e com nome original para download. Identificador desconhecido ou arquivo indisponível retorna `404`. |
| RF-04 | A aplicação informa o estado das operações. | A interface informa carregamento, conclusão ou erro de upload/listagem/download sem expor stack traces ou caminhos locais. |
| RF-05 | Cada documento mantém um dono demonstrativo. | O backend registra `owner` a partir do cabeçalho opcional `X-User-Id`, usando `demo-user` quando ausente. O valor é metadado fornecido pelo cliente, não identidade verificada. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | O conteúdo dos arquivos deve ser gravado somente no filesystem local, em `backend/storage` por padrão, usando Multer com `diskStorage`. Não utilizar armazenamento externo. |
| RNF-02 | Os metadados devem ser mantidos em memória nesta fase. Reiniciar o processo limpa o catálogo, mesmo que os arquivos continuem no disco. |
| RNF-03 | Configurações operacionais devem ser obtidas de variáveis de ambiente, com defaults documentados: `PORT=3000`, `STORAGE_DIR=backend/storage`, `MAX_FILE_SIZE_BYTES=10485760` (10 MiB) e `ALLOWED_FILE_EXTENSIONS=.pdf,.doc,.docx,.txt,.rtf`. |
| RNF-04 | O tipo de arquivo deve ser validado contra a allowlist configurada; a validação de extensão e o MIME informado pelo cliente não devem ser considerados prova de autenticidade do conteúdo. A implementação deve impor o limite de tamanho durante o recebimento. |
| RNF-05 | O nome físico salvo deve ser gerado pelo servidor a partir de identificador único, sem usar o nome original como caminho. O nome original deve ser preservado apenas como metadado e nome sugerido no download. |
| RNF-06 | O backend deve tratar erros de validação, filesystem e leitura de arquivo nos limites HTTP; respostas de erro não devem conter detalhes internos. |
| RNF-07 | A implementação deve usar JavaScript, Express, React, Vite e o runner nativo `node:test`, respeitando as dependências já declaradas sempre que possível. |
| RNF-08 | O backend deve seguir a Clean Architecture simples definida na seção 7. A comunicação frontend/backend deve usar `fetch` pelo proxy `/api` do Vite. |

Os valores de ambiente acima são defaults propostos para o MVP. Se uma variável não for definida, o backend deve usar o default correspondente. Uma configuração inválida deve falhar de forma explícita na inicialização ou ser rejeitada sem iniciar o servidor com limites inesperados.

## 5. Modelo de dados

Os metadados são mantidos em memória por um repositório durante a vida do processo. O objeto público não expõe o nome físico nem o caminho de armazenamento.

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único, preferencialmente UUID, usado nas rotas de listagem e download. |
| `originalName` | string | Nome original fornecido no upload, sanitizado para exibição e download. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora do upload em ISO 8601, preferencialmente UTC. |
| `owner` | string | Identificador demonstrativo recebido em `X-User-Id` ou `demo-user`; não autenticado. |
| `mimeType` | string | Tipo de mídia registrado para configurar o tipo de conteúdo no download, após validação. |
| `storageName` | string | Nome interno, único e gerado pelo servidor, usado pelo repositório para localizar o arquivo. Campo interno, nunca retornado pela API. |

Não há persistência dos metadados após reinício. O arquivo e o registro são tratados como uma única operação lógica: se a gravação falhar, nenhum metadado deve ser publicado; se o arquivo desaparecer ou ficar ilegível depois do upload, o download deve responder `404` sem expor o caminho local.

## 6. Contratos de API

### Convenções

- Rotas abaixo são caminhos recebidos pelo backend. O frontend usa o prefixo `/api`; o proxy Vite remove esse prefixo antes de encaminhar a requisição (por exemplo, `/api/documents` chega ao backend como `/documents`).
- Respostas JSON usam `Content-Type: application/json; charset=utf-8`.
- Os metadados públicos têm os campos `id`, `originalName`, `size`, `uploadedAt`, `owner` e `mimeType`. O campo interno `storageName` nunca é exposto.
- O cabeçalho opcional `X-User-Id` define somente o valor demonstrativo de `owner`. Não existe autenticação, filtragem ou autorização por esse valor; `GET /documents` retorna todos os registros do processo.
- Formato padrão de erro: `{ "error": { "code": "FILE_REQUIRED", "message": "Envie um arquivo." } }`. As mensagens são em português; os códigos são estáveis para tratamento pelo frontend.

### `POST /upload`

Recebe um arquivo por requisição usando `multipart/form-data`.

| Item | Contrato |
| --- | --- |
| Campo multipart | `file`, obrigatório e contendo exatamente um arquivo. |
| Cabeçalho opcional | `X-User-Id: <identificador>`; se ausente ou vazio, usar `demo-user`. |
| Sucesso | `201 Created`, corpo `{ "document": { ...metadados públicos } }`. |
| Arquivo ausente ou campo inválido | `400 Bad Request`, `FILE_REQUIRED` ou `INVALID_UPLOAD`. |
| Extensão ou tipo não permitido | `415 Unsupported Media Type`, `INVALID_FILE_TYPE`. |
| Tamanho acima do limite | `413 Payload Too Large`, `FILE_TOO_LARGE`. |
| Falha ao gravar arquivo | `500 Internal Server Error`, `STORAGE_ERROR`; não deixar registro parcial disponível. |

Exemplo de resposta de sucesso:

```json
{
  "document": {
    "id": "2ee391b4-9f4d-4c28-9b2b-a8528c26a3fc",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-11-10T12:00:00.000Z",
    "owner": "demo-user",
    "mimeType": "application/pdf"
  }
}
```

### `GET /documents`

Não recebe parâmetros de consulta no MVP.

| Item | Contrato |
| --- | --- |
| Sucesso | `200 OK`, corpo `{ "documents": [ ...metadados públicos ] }`. |
| Catálogo vazio | `200 OK`, corpo `{ "documents": [] }`. |
| Falha inesperada | `500 Internal Server Error`, `INTERNAL_ERROR`. |

A coleção é ordenada do upload mais recente para o mais antigo. Nenhum caminho físico é retornado.

### `GET /documents/:id/download`

| Item | Contrato |
| --- | --- |
| Sucesso | `200 OK`, bytes do arquivo, `Content-Type` correspondente ao tipo registrado e `Content-Disposition: attachment` com o nome original sanitizado. |
| Documento ou arquivo inexistente | `404 Not Found`, `DOCUMENT_NOT_FOUND`, em JSON. |
| Falha de leitura | `500 Internal Server Error`, `STORAGE_ERROR`, sem expor o caminho físico. |

O navegador deve tratar o corpo de sucesso como arquivo, não como JSON. O nome original não deve permitir injeção de cabeçalhos nem navegação para caminhos locais.

### Formato de erro

| Status | Código | Situação |
| --- | --- | --- |
| `400` | `FILE_REQUIRED` | Campo `file` ausente. |
| `400` | `INVALID_UPLOAD` | Multipart malformado ou quantidade de arquivos incompatível com o contrato. |
| `404` | `DOCUMENT_NOT_FOUND` | ID desconhecido ou arquivo local ausente. |
| `413` | `FILE_TOO_LARGE` | Arquivo ultrapassa `MAX_FILE_SIZE_BYTES`. |
| `415` | `INVALID_FILE_TYPE` | Arquivo não corresponde à allowlist configurada. |
| `500` | `STORAGE_ERROR` | Falha de gravação ou leitura no filesystem. |
| `500` | `INTERNAL_ERROR` | Falha inesperada, sem detalhes internos na resposta. |

## 7. Decisões arquiteturais

### Backend

Manter o fluxo de dependência `routes -> controllers -> services -> repositories`:

- `routes/`: registra os caminhos e encaminha a requisição ao controller; o middleware Multer é configurado para gravar em disco usando `diskStorage`.
- `controllers/`: interpreta parâmetros, arquivo e cabeçalhos, aplica validação básica de entrada e traduz resultado/erro em status e corpo HTTP.
- `services/`: aplica as regras de negócio de upload, listagem e download sem depender de Express.
- `repositories/`: persiste metadados em memória e resolve o nome interno do arquivo no diretório local.

Dependências externas e configuração devem ser passadas às camadas que as utilizam; regras de negócio não devem conhecer objetos HTTP. O diretório `backend/storage` deve ser criado quando necessário. O servidor continua expondo `GET /health`.

### Frontend

Usar componentes funcionais React e separar a página, componentes reutilizáveis e chamadas `fetch` em `components/`, `pages/` e `services/`, seguindo a estrutura existente. A experiência deve permitir selecionar um arquivo, enviar, atualizar/exibir a lista e baixar um item. Os estados de carregamento e falha devem ser explícitos; após upload bem-sucedido, atualizar a lista sem exigir recarga manual da página.

### Limitações assumidas

- `owner` é dado de demonstração controlado pelo cliente, não uma identidade confiável.
- Todos os documentos do catálogo são listados e baixáveis por quem alcança a aplicação; o MVP não oferece privacidade entre usuários.
- Metadados em memória tornam o catálogo específico de um processo e não durável. Não escalar para múltiplas instâncias nem reiniciar esperando que os metadados sejam reconstruídos automaticamente.
- Filesystem local é a única forma de armazenamento permitida nesta fase.

## 8. Plano de execução

As etapas abaixo descrevem trabalho futuro; não fazem parte da criação desta especificação.

1. Definir e validar leitura de variáveis de ambiente, defaults, diretório de storage e configuração do Multer com `diskStorage` e limite de tamanho.
2. Implementar repositório em memória e armazenamento local, com identificador e nome físico gerados pelo servidor.
3. Implementar serviços de upload, listagem e download com validação, mapeamento de erros e tratamento de arquivos ausentes.
4. Adicionar controllers e rotas para os três contratos, mantendo `GET /health` e as dependências no sentido definido pela Clean Architecture.
5. Escrever testes de backend com `node:test` para sucesso, arquivo ausente, tipo e tamanho inválidos, listagem vazia, download válido/inexistente e falhas de storage.
6. Implementar os serviços `fetch` do frontend e a interface para upload, listagem, estados de operação e download, usando o proxy `/api` do Vite.
7. Validar o fluxo integrado do navegador ao filesystem local, revisar mensagens e confirmar que os caminhos físicos não são expostos.
8. Documentar como executar backend e frontend, as variáveis de ambiente e as limitações de persistência do MVP.