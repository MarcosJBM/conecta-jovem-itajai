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

2. Crie o arquivo local de variáveis de ambiente e preencha `POSTGRES_PASSWORD`
   e `DATABASE_URL` com valores locais:

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

## Arquitetura da API

```text
apps/api/
  src/
    app.ts                         # configura Express, sem abrir porta
    server.ts                      # inicia e encerra servidor e conexão
    env.ts                         # carrega e valida ambiente com Zod
    domain/
      entities/user.ts             # User, Profile e projeção pública
      enums/user-role.ts           # papéis independentes do Prisma
      types/                       # paginação e contrato de hash
    http/
      controllers/users/           # rotas, validação e controllers por ação
      errors/error-handler.ts      # tradução centralizada de erros
    use-cases/
      create-user.ts
      get-user.ts
      fetch-users.ts
      update-user.ts
      delete-user.ts
      validate-user.ts
      errors/                      # validação, conflito, 401, 403 e 404
      factories/                   # composição por operação
      users.spec.ts                # testes de negócio em memória
    repositories/
      users-repository.ts          # contrato de persistência
      prisma/                      # adaptador concreto
      in-memory/                   # persistência em memória para testes
    libs/                          # Prisma compartilhado e scrypt
    utils/test/                    # fixtures e lifecycle E2E isolado
  vitest.unit.config.ts
  vitest.e2e.config.ts
  tsconfig.test.json
packages/database/
  src/index.ts                     # cliente compartilhado, adapter PostgreSQL
  prisma/schema.prisma
  prisma/migrations/
  tests/users.integration.test.mjs # teste de persistência preexistente
```

O fluxo de uma requisição é:

```text
Route → Controller → Factory → Use Case → Repository Contract
                                            ↓
                                     Prisma Repository → Database
```

Controllers validam body, params e query com Zod, chamam uma factory e
serializam a resposta. Não fazem queries nem contêm regras de negócio.
Cada ação possui seu próprio caso de uso, com dependências recebidas pelo
construtor. O núcleo usa contratos e tipos próprios; não importa Express,
Zod ou tipos gerados pelo Prisma. Factories escolhem os adaptadores concretos.
Repositórios cuidam da persistência e traduzem conflitos de unicidade e
registros removidos concorrentemente para o contrato esperado pelo domínio.
Falhas desconhecidas chegam ao handler global, são registradas e retornam
uma mensagem genérica com status 500.

`User` é o agregado: `YouthProfile` e `CompanyProfile` dependem de sua
identidade, são criados junto com o usuário e removidos em cascata. O perfil do jovem contém também os dados pessoais e de endereço; não há CRUD
independente de perfis. A criação Prisma usa uma escrita aninhada atômica.
Novos agregados devem ter contratos e implementações próprios.

## Contrato HTTP de usuários

| Método | Rota                        | Resultado                                           |
| ------ | --------------------------- | --------------------------------------------------- |
| POST   | `/users`                    | 201, `{ user }`                                     |
| GET    | `/users/:id`                | 200, `{ user }`                                     |
| GET    | `/users?page=1&pageSize=20` | 200, `{ items, total, totalPages, page, pageSize }` |
| PUT    | `/users/:id`                | 200, substitui email e senha, `{ user }`            |
| PATCH  | `/users/:id`                | 200, altera email e/ou senha, `{ user }`            |
| DELETE | `/users/:id`                | 204, sem corpo                                      |

Exemplo de cadastro:

```json
{
  "email": "jovem@example.com",
  "password": "abcdef",
  "role": "YOUTH",
  "acceptedTerms": true,
  "youthProfile": {
    "firstName": "Ana",
    "lastName": "Silva",
    "birthDate": "2005-03-12",
    "phone": "(47) 99999-1234",
    "cpf": "529.982.247-25",
    "postalCode": "88301-000",
    "street": "Rua Central",
    "number": "123",
    "complement": "Casa",
    "neighborhood": "Centro",
    "city": "Itajaí",
    "state": "SC"
  }
}
```

Cadastro aceita `YOUTH` e `COMPANY`; criação pública de `ADMIN` retorna 403.
Email é normalizado para minúsculas e precisa ser único. A senha deve ter
no mínimo 6 caracteres e é armazenada com scrypt e salt aleatório, por um
adaptador injetado. Nenhuma resposta inclui senha ou hash. O papel é imutável
nas atualizações; campos desconhecidos são rejeitados. PUT exige email e
senha; PATCH exige ao menos um dos dois. UUID inválido ou entrada inválida
retorna 400; recurso ausente, 404; duplicidade, 409. O handler também está
preparado para erros de domínio 401 e 403.

Para `YOUTH`, todos os campos de `youthProfile` são obrigatórios, inclusive
complemento, e `acceptedTerms` deve ser `true`. O aceite é validado, sem
persistência de versão ou data. CPF é validado pelos dígitos verificadores e
armazenado sem máscara, com unicidade no banco. CPF duplicado retorna 409
com `CPF já cadastrado.`; e-mail duplicado retorna `E-mail já cadastrado.`.
CEP e celular são normalizados para números; celular brasileiro aceita DDD
e prefixo opcional +55. UF é validada e normalizada para maiúsculas.
A data usa `YYYY-MM-DD`, deve existir no calendário e não pode ser futura;
não há restrição de faixa etária. Campos ausentes retornam 400 com os caminhos
em `issues`; demais dados inválidos retornam 400 com mensagem explicativa.
O cadastro cria usuário e perfil atomicamente, sem etapa de aprovação para
jovens. Não realiza login nem envia e-mail de confirmação.

As respostas públicas preservam apenas identidade e timestamps do perfil,
sem expor seus dados pessoais e de endereço. A migration adiciona campos
anuláveis para preservar perfis anteriores; novos cadastros pela API exigem
todos os dados. Não há preenchimento fictício nem alteração dos dados legados.
O fluxo de aprovação de empresas será implementado separadamente.

Paginação aceita página inteira positiva e `pageSize` de 1 a 100 (padrão 20).
A ordenação é explícita por `createdAt ASC, id ASC`; consultas de registros
e total usam a mesma transação com `RepeatableRead`. Páginas além do total
retornam lista vazia. O repositório em memória usa a mesma ordenação, guarda
atualizações e devolve cópias para impedir mutações externas acidentais.

Não existiam login, sessões nem middleware de autenticação na base analisada.
Esses fluxos não foram inventados nesta migração. As rotas de consulta,
atualização e exclusão ainda não verificam identidade ou propriedade: antes
de disponibilizá-las publicamente, o próximo módulo deve implementar
autenticação e autorização por proprietário/administrador. Os erros 401/403
já têm tradução HTTP centralizada; isso não constitui controle de acesso.

## Ambiente e execução

Além das variáveis já descritas, `NODE_ENV` aceita `development`, `test` ou
`production` (padrão `development`), e `API_PORT` aceita inteiros entre 1 e
65535 (padrão 3333). `DATABASE_URL` é obrigatória e deve usar PostgreSQL.
O servidor e o adaptador Prisma usam os valores validados; não existe outra
instância de Prisma dentro da API. O adapter recebe explicitamente o schema
da URL, necessário para isolamento correto com Prisma 7.

`.env.example` contém placeholders, sem credenciais. Após preencher `.env`:

```bash
pnpm install
pnpm db:up
pnpm db:generate
pnpm db:migrate:deploy
pnpm dev
```

Para alterar o modelo, use `pnpm db:migrate` e versione a migration. Para
aplicar migrations já existentes, use `pnpm db:migrate:deploy`.
O TypeScript permanece estrito. Imports `#app/*` usam resolução nativa do
Node: condição `development` aponta para `src/*.ts` e produção para
`dist/*.js`, sem aliases que só funcionam no editor.

## Testes e verificações

```bash
pnpm format
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:e2e
pnpm build
```

Os scripts de formato e lint cobrem a API e suas configurações. Typecheck e
build cobrem todos os workspaces. Testes unitários executam sem PostgreSQL:
casos de uso recebem repositórios em memória e um hasher determinístico;
testam sucesso, armazenamento após mutações, conflitos, entradas inválidas,
paginação e proibição de cadastro ADMIN. O adaptador scrypt e a validação do
ambiente também possuem testes.

Para E2E, configure `TEST_DATABASE_URL` em `.env` com uma conexão PostgreSQL
local ou de testes que permita criar/remover schemas. Execute `pnpm db:up`
e `pnpm test:e2e`. Cada arquivo ganha um schema `test_<uuid>`, recebe as
migrations reais e limpa os usuários entre cenários. O teardown remove
somente esse schema e desconecta o cliente, inclusive após falha de setup.
O schema da URL original é sempre substituído pelo schema aleatório;
sem `TEST_DATABASE_URL`, os testes falham com uma instrução explícita.
Não há fallback silencioso para o banco de desenvolvimento ou produção,
nem dependência de links globais de um ambiente Vitest.

Os E2E usam Supertest com o app Express real, factories reais, Prisma e
PostgreSQL. Cobrem CRUD, perfis, hash, normalização, unicidade concorrente,
paginação, validações, erros 400/403/404/409/500 e os health checks.
`pnpm db:test` preserva o teste de persistência anterior, que usa
`DATABASE_URL` e remove os registros criados por ele. Use-o somente no
ambiente local/teste. Ele é independente da suíte E2E isolada.

## Como adicionar um módulo

1. Defina entidades e tipos próprios em `domain`, sem tipos Prisma ou HTTP.
2. Crie o contrato em `repositories` com operações de persistência.
3. Implemente adaptadores Prisma e em memória com a mesma semântica,
   incluindo ordenação, cópias e comportamento para recursos ausentes.
4. Crie um caso de uso por ação, injete contratos pelo construtor e valide
   as regras antes de escrever. Crie erros de domínio quando necessário.
5. Crie uma factory por caso de uso para compor os adaptadores.
6. Adicione schemas Zod, controllers e `routes.ts`; registre as rotas no app.
7. Teste regras com memória e fluxo HTTP com o schema E2E isolado, verificando
   o estado persistido e entradas que não devem causar alterações.
8. Atualize a documentação, versione migrations e execute as verificações.
