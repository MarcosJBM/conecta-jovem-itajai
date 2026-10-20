<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->


## Convenções da aplicação

- Arquivos de código devem usar kebab-case, tanto na API quanto no web. Componentes React mantêm nomes PascalCase nas exports, mas seus arquivos usam kebab-case (ex.: `company-dashboard.tsx`).
- No web, usar componentes shadcn/ui de `components/ui` e Tailwind CSS. Não reintroduzir CSS de componentes ou controles nativos customizados quando existir um componente shadcn adequado.
- Formulários web usam React Hook Form para registro de campos, validações, erros e estado de submissão.
- Para dados brasileiros (CPF, CNPJ numérico/alfanumérico, CEP, telefone/celular e UF), utilizar `@brazilian-utils/brazilian-utils`. Não duplicar cálculos, listas de UFs ou expressões regulares já cobertos pela biblioteca. Validar também no backend, antes de normalizar dados.
- CPF, telefone com DDD e CEP devem ser formatados durante a digitação; a API persiste seus valores normalizados.
- Preservar os requisitos já definidos: senha mínima de 6 caracteres, complemento opcional e suporte a CNPJ alfanumérico.
