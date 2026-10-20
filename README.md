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
    libs/                          # Prisma compartilhado e BCrypt
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

O cadastro em `POST /users` aceita apenas `YOUTH`; `COMPANY` usa `POST /companies`. A criação pública de `ADMIN` retorna 403.
Email é normalizado para minúsculas e precisa ser único. A senha deve ter
no mínimo 6 caracteres, no máximo 72 bytes UTF-8 e é armazenada com BCrypt, por um
adaptador injetado. Nenhuma resposta inclui senha ou hash. O papel é imutável
nas atualizações; campos desconhecidos são rejeitados. PUT exige email e
senha; PATCH exige ao menos um dos dois. UUID inválido ou entrada inválida
retorna 400; recurso ausente, 404; duplicidade, 409. O handler também está
preparado para erros de domínio 401 e 403.

Para `YOUTH`, os campos de `youthProfile` são obrigatórios, exceto
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

O controle de acesso está descrito na seção de autenticação abaixo. Consultas
individuais exigem proprietário ou ADMIN; listagem, alteração de credenciais e
exclusão de usuários exigem ADMIN. O cadastro público de empresas foi separado
para impedir contas empresariais sem solicitação de validação.

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
paginação e proibição de cadastro ADMIN. O adaptador BCrypt e a validação do
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

## Cadastro de empresa

O formulário inicial do frontend cria a conta da empresa e sua solicitação de validação em um único envio para `POST /companies`. Não exige login anterior nem conta separada de representante. O backend define o perfil `COMPANY` e o estado inicial `PENDING`.

Campos obrigatórios: `email`, `password`, `cnpj`, `legalName` (razão social), `city`, `state` (UF), `contactName`, `contactRole` e `phone`. `tradeName` (nome fantasia) é opcional. A senha exige pelo menos 6 caracteres e até 72 bytes UTF-8, limite do BCrypt. Telefone contém DDD e 10 ou 11 dígitos. E-mail é normalizado para minúsculas; CNPJ, para maiúsculas sem máscara. E-mail e CNPJ são únicos.

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

O teste HTTP em memória cobre obrigatórios, CNPJ numérico/alfanumérico, conflitos, normalização, senha BCrypt e status pendente. Os testes E2E de jovens e empresas usam HTTP, Prisma e schemas exclusivos, criados e removidos automaticamente pelo setup compartilhado em TEST_DATABASE_URL. Prefira uma conexão exclusiva de testes.

```bash
# Configure uma conexão exclusiva para testes antes destes comandos.
export TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost:PORT/conecta_registration_test'
pnpm --filter @conecta/api test:e2e
```

O E2E verifica concorrência, rollback de criação, hash persistido, solicitação pendente, motivo obrigatório na rejeição e exclusão em cascata. Remove os próprios registros ao terminar.

### Situação e reenvio da empresa

A empresa pode fazer login mesmo pendente ou rejeitada. Sua página inicial mostra o estado atual, com atualização manual. Após rejeição, o motivo aparece junto ao formulário de correção dos dados empresariais. O botão “Salvar e solicitar nova análise” atualiza os dados pela mesma conta e retorna o cadastro para `PENDING`, limpando os campos da decisão anterior. Apenas empresas rejeitadas podem reenviar; a transação impede reenvios concorrentes e reverte todas as mudanças em caso de CNPJ duplicado.

A listagem administrativa e as ações de aprovar/rejeitar continuam para uma etapa própria. Não há upload, consulta automática de CNPJ nem listagem de vagas nesta entrega. Não é permitido alterar o CNPJ de um cadastro pendente ou aprovado pelo endpoint de reenvio.

## Autenticação, sessão e permissões

A entrada “Criar conta” oferece Jovem e Empresa, com formulários separados. Depois do cadastro, o frontend abre o login com confirmação de sucesso. O login é único para `YOUTH`, `COMPANY` e `ADMIN`, e restaura a sessão ao recarregar a página. O frontend usa rotas com hash (`#/login`, `#/cadastro`, `#/cadastro/jovem`, `#/cadastro/empresa`, `#/inicio`) e chamadas `/api/*` no mesmo domínio.

| Endpoint                      | Acesso                                        |
| ----------------------------- | --------------------------------------------- |
| `POST /users`                 | Público, somente cadastro YOUTH               |
| `POST /companies`             | Público, cria COMPANY e solicitação PENDING   |
| `POST /auth/login`            | Público, e-mail e senha; cria sessão          |
| `POST /auth/logout`           | Invalida a sessão atual e remove o cookie     |
| `GET /auth/me`                | Usuário autenticado: id, e-mail e perfil      |
| `GET /users`                  | ADMIN                                         |
| `GET /users/:id`              | Proprietário ou ADMIN                         |
| `PUT/PATCH/DELETE /users/:id` | ADMIN                                         |
| `GET /companies/me`           | COMPANY, apenas o próprio cadastro e situação |
| `POST /companies/me/resubmit` | COMPANY rejeitada, apenas o próprio cadastro  |

O login retorna `{ "user": { "id": "...", "email": "...", "role": "YOUTH" } }` e define o cookie `conecta_session`. O valor é um token aleatório de 32 bytes; o PostgreSQL guarda somente seu SHA-256, associado ao usuário e expiração. A sessão tem prazo fixo de 24 horas, sem renovação automática ou “lembrar de mim”. Tokens inválidos, expirados ou revogados retornam 401. O logout exclui o registro e limpa o cookie. Novo login troca a sessão do navegador; alterações de senha invalidam todas as sessões da conta. Outras sessões válidas do mesmo usuário continuam permitidas.

O cookie é `HttpOnly`, `SameSite=Lax`, `Path=/` e `Secure` em produção. Login, logout e escritas autenticadas exigem `X-Requested-With: Conecta`. Quando enviado, `Origin` deve coincidir com a origem da requisição. Não há CORS entre domínios; frontend e `/api` devem ser publicados na mesma origem. Senhas e tokens não são armazenados no localStorage. A API evita cache das respostas e nunca retorna hashes de senha.

Após dez falhas de login pelo mesmo IP, novas tentativas retornam 429 por até 15 minutos. Esse controle é em memória e destinado à execução em uma única instância; reiniciar a API limpa a contagem. Login desconhecido e senha incorreta retornam a mesma mensagem. Sessões expiradas são removidas ao serem usadas e também ao criar novas sessões.

Novas senhas, incluindo as de ADMIN e alterações, usam BCrypt com custo 12. Contas Scrypt antigas continuam podendo entrar; um login válido atualiza o hash para BCrypt e invalida sessões anteriores. Senhas legadas acima de 72 bytes não são truncadas nem convertidas automaticamente; continuam verificadas com Scrypt até uma alteração para uma senha compatível. Dados empresariais e pessoais são limitados pelos contratos de resposta e pelas permissões das rotas. As projeções gerais de usuários não expõem CPF, endereço ou contatos empresariais.

### Preparação do ADMIN

Forneça `ADMIN_EMAIL` e `ADMIN_PASSWORD` somente no ambiente do comando e execute:

```bash
pnpm --filter @conecta/api admin:create
```

Não há senha padrão ou credencial versionada. O comando exige senha com pelo menos 6 caracteres e até 72 bytes, grava BCrypt e recusa qualquer e-mail já cadastrado, sem promover ou sobrescrever usuários. O comando não é um endpoint HTTP.

### HTTPS em publicação

O projeto não inclui uma conta de hospedagem ou certificado. Publique o frontend e `/api` no mesmo domínio por meio de um proxy com TLS, redirecione HTTP para HTTPS no proxy e configure `NODE_ENV=production`. Configure `TRUST_PROXY_HOPS` com a quantidade real de proxies confiáveis (normalmente 1); a API deve ser acessível apenas pelo proxy. Não use esse valor se clientes externos puderem atingir diretamente a porta da API.

Em produção, a API recusa HTTP com 426, envia HSTS nas respostas HTTPS e emite apenas cookies Secure. O Vite e a execução local seguem em HTTP com `TRUST_PROXY_HOPS=0`. Os testes simulam HTTPS atrás de um proxy confiável e conferem os atributos do cookie; a configuração real de TLS depende do ambiente de hospedagem.

### Testes desta etapa

As suítes cobrem sessão opaca, prazo fixo, logout e rotação, autorização por perfil/proprietário, recusa de cadastro empresarial incompleto, compatibilidade Scrypt, BCrypt, complemento opcional, criação de ADMIN por comando, proteção contra escritas de outra origem e correção/reenvio de empresas. Os E2E continuam isolando cada arquivo em um schema exclusivo de `TEST_DATABASE_URL`.

## Padrões do frontend

Os arquivos de código usam kebab-case, inclusive componentes e testes (`data-form.tsx`, `company-dashboard.tsx`, `data-form.test.tsx`). As exports React continuam PascalCase. As regras para agentes estão no `AGENTS.md` da raiz e em `apps/web/AGENTS.md`; `check:names` também bloqueia nomes de componentes fora do padrão durante o build.

A interface utiliza [shadcn/ui](https://ui.shadcn.com/docs/installation/vite) e Tailwind CSS 4 com o plugin oficial do Vite. Os componentes oficiais ficam em `apps/web/src/components/ui`; o tema é definido por tokens em `index.css` e o layout usa classes Tailwind. `components.json` configura aliases e o helper local `cn` em `src/lib/utils.ts`.

Os formulários usam [React Hook Form](https://react-hook-form.com/) (`useForm` e `Controller`) para valores, validação ao sair do campo, erros da API e estado de submissão. Campos inválidos recebem mensagens acessíveis e foco; o formulário preserva valores quando o servidor retorna erro.

[Brazilian Utils](https://github.com/brazilian-utils/javascript) é utilizado pelo frontend e pela API para CPF, CNPJ, CEP, celular/telefone e UFs. O frontend aplica máscaras durante digitação, colagem e carregamento de dados existentes. O helper `src/lib/brazilian-data.ts` centraliza o uso da biblioteca. No backend, a validação acontece antes da normalização, evitando aceitar entradas inválidas apenas porque um parser removeu caracteres. CNPJ utiliza `version: 2`, preservando o suporte alfanumérico, e telefones usam a máscara com DDD (`nanp`). Números de celular usam o validador de celular; contatos empresariais aceitam telefone fixo ou celular. A lista de UFs vem de `getStates()`.

```bash
pnpm --filter @conecta/web check:names
pnpm --filter @conecta/web test:unit
pnpm --filter @conecta/web typecheck
pnpm --filter @conecta/web build
```

Os testes de formulário com Vitest/Testing Library cobrem máscaras digitadas/coladas, exclusão, campos predefinidos de correção, CNPJ alfanumérico, erros de validação e do servidor, aceite dos termos, senha mínima de 6 caracteres e prevenção de envio duplicado.
