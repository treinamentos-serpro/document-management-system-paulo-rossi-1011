---
description: Implementa um requisito específico do DMS conforme a especificação e valida a mudança.
name: implementar-requisito-dms
argument-hint: ID do requisito ou descrição do comportamento a implementar
agent: agent
---

# Implementar requisito do DMS

Implemente somente o requisito `${input:requisito:ID ou descrição do requisito}` definido na [especificação do DMS](../../docs/specs/dms-spec.md).

Antes de editar:

- Consulte a especificação, as instruções do projeto em `.github/copilot-instructions.md` e o código relacionado.
- Identifique os módulos e testes existentes que controlam esse comportamento; não recrie camadas que já existam.
- Se o requisito depender de uma decisão não definida pela especificação, explicite a dúvida antes de assumir um comportamento incompatível.

Durante a implementação:

- Mantenha as mudanças limitadas ao requisito informado e aos testes necessários.
- No backend, respeite o fluxo `routes -> controllers -> services -> repositories` e mantenha as regras de negócio independentes de Express.
- Preserve o armazenamento local via Multer `diskStorage` e os metadados em memória; não adicione armazenamento externo.
- No frontend, siga os componentes existentes e use o cliente de API via `fetch` com o prefixo `/api`.
- Use JavaScript e as dependências já presentes. Evite abstrações, arquivos e refatorações sem relação com o requisito.
- Trate erros nos limites apropriados e não exponha detalhes internos ao usuário.

Validação:

- Adicione ou atualize testes para os critérios de aceite e os casos de erro relevantes.
- Execute os testes ou o build mais específico para os arquivos alterados.
- Se a validação falhar, corrija a causa relacionada à mudança e execute-a novamente.

Ao concluir, resuma o comportamento implementado, os arquivos alterados e os comandos de validação executados. Não implemente outros requisitos.