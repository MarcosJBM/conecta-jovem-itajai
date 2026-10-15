# Conecta Jovem Itajaí

Monorepo da plataforma Conecta Jovem Itajaí, organizado com Turborepo e PNPM.

## Tecnologias

- Node.js 24
- PNPM 12
- Turborepo
- React + Vite + TypeScript
- Express + TypeScript
- Prisma ORM 7
- PostgreSQL 18 via Docker Compose

## Estrutura

```text
.
├── apps
│   ├── api        # API Express
│   └── web        # Frontend React/Vite
├── packages
│   └── database   # Prisma Client e acesso ao PostgreSQL
├── compose.yaml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Pré-requisitos

- [Node.js 24](https://nodejs.org/)
- [PNPM 12](https://pnpm.io/installation)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Executando localmente

1. Instale as dependências:

   ```bash
   pnpm install
   ```

2. Crie o arquivo local de variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

3. Inicie o PostgreSQL:

   ```bash
   pnpm db:up
   ```

4. Gere o Prisma Client:

   ```bash
   pnpm db:generate
   ```

5. Aplique as migrations locais:

   ```bash
   pnpm db:migrate
   ```

6. Inicie frontend e backend:

   ```bash
   pnpm dev
   ```

O frontend estará disponível em <http://localhost:5173> e a API em
<http://localhost:3333>.

## Verificando os serviços

- API: `GET http://localhost:3333/health`
- PostgreSQL via Prisma: `GET http://localhost:3333/health/database`
- Status do banco: `pnpm db:status`
- Logs do banco: `pnpm db:logs`

Uma resposta `200` em `/health/database` confirma que a API, o Prisma e o
PostgreSQL estão se comunicando.

## Comandos

| Comando                  | Descrição                                               |
| ------------------------ | ------------------------------------------------------- |
| `pnpm dev`               | Executa frontend e backend em modo de desenvolvimento   |
| `pnpm build`             | Compila todos os workspaces                             |
| `pnpm typecheck`         | Verifica os tipos TypeScript                            |
| `pnpm db:up`             | Inicia o PostgreSQL                                     |
| `pnpm db:down`           | Encerra o PostgreSQL                                    |
| `pnpm db:reset`          | Encerra o PostgreSQL e remove os dados locais           |
| `pnpm db:generate`       | Gera o Prisma Client                                    |
| `pnpm db:migrate`        | Cria e aplica migrations no ambiente de desenvolvimento |
| `pnpm db:migrate:deploy` | Aplica migrations versionadas em outros ambientes       |
| `pnpm db:validate`       | Valida o schema do Prisma                               |
| `pnpm db:test`           | Valida a persistência dos perfis no PostgreSQL          |

## Padrão de commits

As mensagens de commit seguem o padrão
[Conventional Commits](https://www.conventionalcommits.org/):

```text
tipo(escopo opcional): descrição curta
```

Exemplos:

```text
feat(web): adiciona formulário de inscrição
fix(api): corrige validação de e-mail
docs: atualiza instruções de instalação
```

Os tipos mais comuns são `feat`, `fix`, `docs`, `refactor`, `test`, `chore`,
`build` e `ci`. O hook `commit-msg` valida o padrão automaticamente. Ele é
configurado pelo Husky ao executar `pnpm install`.

## Variáveis de ambiente

O arquivo `.env.example` documenta todas as variáveis necessárias. O arquivo
`.env` contém valores locais e não deve ser versionado.

| Variável            | Uso                               |
| ------------------- | --------------------------------- |
| `DATABASE_URL`      | Conexão utilizada pelo Prisma     |
| `POSTGRES_DB`       | Nome do banco criado pelo Compose |
| `POSTGRES_USER`     | Usuário do PostgreSQL             |
| `POSTGRES_PASSWORD` | Senha local do PostgreSQL         |
| `POSTGRES_PORT`     | Porta publicada pelo container    |
| `API_PORT`          | Porta HTTP da API                 |

## Encerrando o ambiente

```bash
pnpm db:down
```

Para também apagar os dados locais do PostgreSQL:

```bash
pnpm db:reset
```

## Cadastro de empresa

O formulário inicial do frontend cria a conta da empresa e sua solicitação de validação em um único envio para `POST /companies`. Não exige login anterior nem conta separada de representante. O backend define o perfil `COMPANY` e o estado inicial `PENDING`.

Campos obrigatórios: `email`, `password`, `cnpj`, `legalName` (razão social), `city`, `state` (UF), `contactName`, `contactRole` e `phone`. `tradeName` (nome fantasia) é opcional. A senha exige pelo menos 8 caracteres e até 72 bytes UTF-8, limite do BCrypt. Telefone contém DDD e 10 ou 11 dígitos. E-mail é normalizado para minúsculas; CNPJ, para maiúsculas sem máscara. E-mail e CNPJ são únicos.

O cálculo dos dígitos verificadores aceita CNPJ numérico e alfanumérico conforme o [manual da Receita Federal](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf). Essa validação detecta erros de formato; a consulta cadastral será feita manualmente pelo ADMIN no site da Receita.

Exemplo de requisição (dados fictícios):

```json
{
  "email": "empresa@example.com",
  "password": "senha-de-exemplo",
  "cnpj": "12.ABC.345/01DE-35",
  "legalName": "Empresa de Exemplo",
  "city": "Itajaí",
  "state": "SC",
  "contactName": "Responsável de exemplo",
  "contactRole": "RH",
  "phone": "47999991234"
}
```

Resposta `201`: `{ "company": { "id": "...", "userId": "...", "validation": { "id": "...", "status": "PENDING" } }, "message": "..." }`.
Erros de entrada retornam `400` e `fields`; duplicidade retorna `409` com o campo em conflito; erros inesperados retornam `500`. Senha e hash não são retornados. Conta, perfil e solicitação são criados atomicamente.

### Arquitetura do cadastro

```text
HTTP controller + Zod
→ factory
→ RegisterCompanyUseCase
→ CompaniesRepository
→ PrismaCompaniesRepository
→ PostgreSQL
```

O caso de uso recebe repositório e hasher por construtor. O adaptador Prisma faz a escrita aninhada atômica e traduz conflitos de unicidade, inclusive em requisições concorrentes. Há repositório em memória para testes. Erros HTTP são tratados no middleware centralizado; os endpoints de saúde existentes foram preservados.

A migration `20261015000000_company_registration` adiciona os dados empresariais e a tabela de validações. As colunas novas do perfil aceitam nulo para preservar perfis antigos, criados antes desta funcionalidade; todo novo cadastro pela API exige os campos definidos. O banco exige motivo não vazio quando o estado é `REJECTED`.

Para usar no ambiente local já configurado:

```bash
pnpm db:migrate:deploy
pnpm dev
```

O Vite encaminha `/api/companies` para `/companies` na porta `API_PORT` do arquivo `.env` (3333 por padrão). Em publicação, o servidor web deverá encaminhar `/api/*` à API removendo o prefixo `/api`.

### Verificações

```bash
pnpm --filter @conecta/api test
pnpm --filter @conecta/api typecheck
pnpm --filter @conecta/web typecheck
pnpm --filter @conecta/api build
pnpm --filter @conecta/web build
```

O teste HTTP em memória cobre obrigatórios, CNPJ numérico/alfanumérico, conflitos, normalização, senha BCrypt e status pendente. O teste E2E usa HTTP, Prisma e um PostgreSQL separado; não utilize o banco de desenvolvimento. O nome do banco de teste deve terminar em `_test`.

```bash
# Configure uma conexão exclusiva para testes antes destes comandos.
export TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost:PORT/conecta_registration_test'
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @conecta/database db:migrate:deploy
pnpm --filter @conecta/api test:e2e
```

O E2E verifica concorrência, rollback de criação, hash persistido, solicitação pendente, motivo obrigatório na rejeição e exclusão em cascata. Remove os próprios registros ao terminar.

### Próximas etapas acordadas

A listagem e os detalhes para o ADMIN, a consulta manual e as ações de aprovar/rejeitar serão implementadas em etapa própria. Os estados persistidos são `PENDING`, `APPROVED` e `REJECTED`, com campos para responsável e data da análise e motivo de rejeição. A restrição de perfil ADMIN será aplicada no futuro caso de uso de análise.

Não há upload de documentos ou consulta automática de CNPJ. Exibição do resultado e motivo para a empresa, correção e reenvio com a mesma conta ficam para depois, assim como a definição das permissões da empresa pendente.
