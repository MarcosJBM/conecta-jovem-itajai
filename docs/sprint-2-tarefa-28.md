# Sprint 2 — dados profissionais e completude do currículo

Data de execução: 21/10/2026. Responsável: Marcos Juan Botene Martins (@MarcosJBM).

Issue: [#28 — Modelar os dados profissionais e a completude do currículo](https://github.com/MarcosJBM/conecta-jovem-itajai/issues/28).

Branch: `codex/28-resume-data-model`, baseada em `staging`.

Situação desta entrega: implementada e testada na branch; revisão e integração em `staging` são etapas separadas. Não representa conclusão das tarefas de API/interface nem da sprint completa.

## Entrega e rastreabilidade

| Referência | Evidência implementada |
| --- | --- |
| US03 / RF03 / UC03 | Modelo `Resume` associado ao perfil de jovem, com coleções de habilidades, formações e experiências; nenhum dado cadastral duplicado. |
| RN02 refinada | `getResumeCompleteness` exige dados cadastrais obrigatórios e ao menos uma habilidade; formação, experiência e complemento opcionais. Retorna campos pendentes. |
| Currículo incompleto | Coleções vazias são permitidas; validação de conteúdo e cálculo de completude são separados. Não exige PDF ou upload. |
| Integridade | Um currículo por jovem, chaves estrangeiras e exclusão em cascata; nomes obrigatórios e períodos mensais coerentes em domínio e constraints SQL. |
| Privacidade | Projeção explícita com nome, cidade/UF, celular e dados profissionais; sem CPF, nascimento ou endereço completo. |
| Compatibilidade | Migration aditiva; preserva perfis antigos e não cria informações fictícias. Lista de campos obrigatórios é compartilhada com a validação cadastral existente. |

Formação inclui instituição, curso, nível e início/fim ou indicação de andamento. Experiência inclui cargo, organização, início/fim ou atividade atual e descrição opcional. Períodos usam `YYYY-MM`. O fim pode ser igual ao início; atividades em andamento não recebem fim. Habilidades são nomes com até 100 caracteres; entradas vazias e nomes duplicados após remoção de espaços nas extremidades e comparação sem distinção de maiúsculas são rejeitados pelo domínio.

O vínculo e as exclusões por proprietário foram verificados no banco. A autorização HTTP e o repositório que limitará as operações ao jovem autenticado serão implementados na #29; esta entrega não afirma que endpoints de currículo já existem.

## Verificações realizadas

| Verificação | Resultado em 21/10/2026 |
| --- | --- |
| Testes unitários da API (`test:unit`) | 115 testes aprovados em 10 arquivos, incluindo as regras de currículo. |
| Regressão E2E da API (`test:e2e`) | 18 testes aprovados em 2 arquivos; migrations reais aplicadas pelo fluxo existente. |
| Persistência e migration (`test:resume`) | 7 testes aprovados: teste principal e 6 subtestes. |
| Typecheck da API e build do banco/API | Aprovados. |
| ESLint da API e Prettier | Aprovados. |
| Validação do schema Prisma | Aprovada. |
| Verificação de whitespace do diff | Aprovada. |

O teste de persistência aplica todas as migrations anteriores em schema exclusivo, insere dois perfis no formato antigo (incluindo campos nulos), aplica a nova migration e compara os registros anteriores/depois. Em seguida verifica rascunho vazio, unicidade de currículo, referências inexistentes, rollback de escrita aninhada inválida, dados obrigatórios, cronologia, alterações/exclusões e preservação dos dados do outro jovem.

Os testes de banco usaram o PostgreSQL local já em execução, com `TEST_DATABASE_URL` fornecida somente ao processo de teste e schemas temporários removidos ao final. Não foi alterado o arquivo `.env` nem aplicada a migration no schema de desenvolvimento. Os testes HTTP exigiram permissão para abrir portas locais; a primeira execução restrita falhou por `listen EPERM`, e a execução com essa permissão passou integralmente. O driver PostgreSQL emitiu aviso de depreciação durante o teste de persistência, sem falhas nos testes.

## Como reproduzir

Configure uma `TEST_DATABASE_URL` de PostgreSQL local/de testes, conforme `.env.example`. Execute:

```bash
pnpm --filter @conecta/database test:resume
pnpm --filter @conecta/api test:unit
pnpm --filter @conecta/api test:e2e
pnpm --filter @conecta/api typecheck
pnpm --filter @conecta/api lint
pnpm --filter @conecta/api format:check
pnpm --filter @conecta/database db:validate
pnpm --filter @conecta/api build
```

`test:resume` compila o pacote de banco e gera o Prisma Client antes de executar o teste. Requer acesso ao PostgreSQL; `test:unit` não requer banco. Os E2E e o teste de persistência removem apenas os próprios schemas exclusivos.

## Limites e continuidade

A tarefa #29 implementará repositórios, casos de uso e contratos HTTP do currículo. A #30 entregará edição/visualização na interface. Ainda não há alteração de dados pessoais, PDF, upload, candidaturas ou aplicação de RN02 na candidatura; estas funcionalidades não foram declaradas concluídas.

O [registro de mudanças](registro-de-mudancas.md) mantém a comparação com o PDF e a cronologia de decisões. A criação do planejamento ocorreu em 20/10; o desenvolvimento desta tarefa ocorreu em 21/10. O marco acadêmico original continua registrado, sem retroagir a execução.
