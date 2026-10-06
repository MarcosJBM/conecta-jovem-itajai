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

5. Inicie frontend e backend:

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

| Comando            | Descrição                                             |
| ------------------ | ----------------------------------------------------- |
| `pnpm dev`         | Executa frontend e backend em modo de desenvolvimento |
| `pnpm build`       | Compila todos os workspaces                           |
| `pnpm typecheck`   | Verifica os tipos TypeScript                          |
| `pnpm db:up`       | Inicia o PostgreSQL                                   |
| `pnpm db:down`     | Encerra o PostgreSQL                                  |
| `pnpm db:reset`    | Encerra o PostgreSQL e remove os dados locais         |
| `pnpm db:generate` | Gera o Prisma Client                                  |
| `pnpm db:validate` | Valida o schema do Prisma                             |

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
