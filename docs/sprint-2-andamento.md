# Sprint 2 — execução das tarefas seguintes

Responsável: Marcos Juan Botene Martins (@MarcosJBM). Execução em 21/10/2026.
As entregas abaixo são implementações em branches separadas e aguardam revisão/integração. PRs encadeadas preservam a separação por tarefa sem fazer merge automático. O período acadêmico original e os refinamentos estão em [registro-de-mudancas.md](registro-de-mudancas.md).

## #29 — API do próprio currículo

- `GET /resumes/me` e `PUT /resumes/me`, somente YOUTH, proprietário obtido da sessão.
- Consulta retorna visualização restrita, completude, pendências e última atualização. Currículo inexistente aparece vazio, sem criar dados fictícios.
- Substituição atômica de habilidades/formações/experiências; bloqueio por perfil serializa salvamentos simultâneos. Contratos, adaptadores Prisma/em memória, casos de uso e factories separados.
- Validação estrutural estrita, cronologia, limites e normalização; sem edição cadastral, PDF ou upload. Limite HTTP ampliado para 256 KB para comportar as coleções limitadas pelo contrato.
- Evidências: 116 testes unitários da API aprovados; cenário E2E de currículo aprovado com dois salvamentos concorrentes, isolamento, permissões, remoção e preservação em entrada inválida. Typecheck e lint aprovados.
- O teste identificou e corrigiu uma consulta SQL que inicialmente não qualificava o schema; o bloqueio usa agora o schema configurado e identificador escapado, com userId parametrizado.

## #30 — interface do currículo

- Área do jovem com edição de habilidades, formação e experiência usando React Hook Form e coleções dinâmicas; dados pessoais somente em leitura.
- Visualização do currículo salvo, celular formatado, completude, carregamento, confirmação e erros sem perda de valores. Sem CPF/endereço completo.
- Testes verificam inclusão/remoção das seções opcionais, habilidade obrigatória quando adicionada, envio sem formação/experiência, preservação em falha, sessão expirada e prevenção de duplo envio.
- Evidências: 8 testes web aprovados (2 arquivos); typecheck, verificação de nomes e build aprovados. A validação no envio evita validações de blur concorrentes à remoção. Um teste adicional verifica remoção por teclado e preservação do item restante.

## #31 — API de análise empresarial

- Listagem paginada de solicitações pendentes, detalhes e decisão em `/admin/company-validations`, somente ADMIN.
- Rejeição exige justificativa; ADMIN e data são definidos no servidor. Compare-and-set transacional impede sobrescrever decisões concorrentes; não há documentos ou estado extra de correção.
- Evidências: 117 testes unitários aprovados; cenário E2E aprovado para permissões, paginação, decisões concorrentes e rejeição → correção/reenvio pela mesma conta → aprovação. Typecheck e lint aprovados.

## #32 — interface de análise empresarial

- Painel ADMIN com pendências paginadas, detalhes cadastrais, CNPJ/telefone formatados e link para consulta manual na Receita Federal.
- Formulário de aprovação/rejeição com justificativa obrigatória na rejeição, confirmação e atualização da lista. Conflitos e erros mantêm os valores e permitem atualizar a consulta.
- Evidências: testes de interface verificam justificativa, decisão, remoção da pendência e concorrência. Nenhum upload, consulta automática de CNPJ ou cadastro de segundo representante foi adicionado.

## #33 — modelo e regras de vagas

- Vaga vinculada à empresa com título, descrição, requisitos, cidade/UF, área, contratação, regime e prazo obrigatório. Criação diretamente aberta; sem rascunho/reabertura.
- Opções de contratação/regime/área centralizadas no domínio da API; a interface receberá o catálogo da API, sem lista duplicada. UF validada com Brazilian Utils.
- Disponibilidade calculada como aberta, vencida ou encerrada. Prazo por data, inclusivo até o fim do dia em `America/Sao_Paulo`, sem job agendado.
- Evidências: testes de domínio cobrem contratação/regime e limite exato de 23h59m59s999/00h em Brasília; teste de persistência verifica migration, campos, estado inicial e exclusão apenas das vagas da empresa removida. Migration aditiva, sem alteração de registros anteriores.

## #34 — API de gestão das próprias vagas

- Rotas em `/companies/me/jobs`: catálogo de opções, listagem paginada, detalhes, criação direta, substituição de dados e encerramento.
- Somente COMPANY pode acessar; criação/edição/encerramento exigem aprovação atual. Proprietário é obtido da sessão e não do corpo. Catálogo centralizado retornado à interface.
- Escritas verificam aprovação dentro da transação e bloqueiam edição de vaga vencida/encerrada; encerramento concorrente preserva a primeira decisão. Não há exclusão física, reabertura, pesquisa pública ou candidatura.
- Evidências: testes unitários de propriedade, permissões, alteração persistida e prazo; cenário E2E aprovado com entradas inválidas, paginação, acesso cruzado, concorrência e escrita de origem externa. Typecheck e lint aprovados.

## #35 — interface de gestão de vagas

- Empresa aprovada visualiza suas vagas e usa um formulário único para criar/publicar. Detalhes, edição e encerramento das vagas abertas estão disponíveis; vencidas/encerradas não oferecem edição ou reabertura.
- Campos de contratação e regime separados, catálogo recebido da API e UFs vindas de Brazilian Utils. React Hook Form, shadcn/ui e Tailwind; Textarea oficial adicionado pelo CLI e adaptado ao helper `cn` local, sem nova dependência.
- Mensagens de sucesso, erros por campo, valores preservados em falha, sessão expirada e bloqueio de envios repetidos. Pendentes/rejeitadas permanecem no fluxo empresarial anterior.
- Evidências: 13 testes web aprovados em 4 arquivos; nomes, typecheck e build aprovados. Casos incluem criação direta, falha de edição, encerramento e ausência de reabertura.

## #36 — validação integrada e evidências

Execução final em 21/10/2026:

| Verificação | Resultado |
| --- | --- |
| API — testes unitários | 120 aprovados, 14 arquivos |
| API — E2E com banco isolado | 23 aprovados, 7 arquivos |
| Frontend — testes de interface | 13 aprovados, 4 arquivos |
| Migration/persistência do currículo | 7 aprovados (principal e 6 subtestes) |
| Typecheck e lint da API | Aprovados |
| Formatação da API e verificação de nomes web | Aprovadas |
| Builds do banco, API e frontend | Aprovados |
| Navegador real — fluxo integrado | Aprovado |
| Telas em 360 e 1440 px | 8 capturas, sem overflow horizontal |
| Erros de página no navegador | Nenhum |

O E2E `sprint-two-flow.test.ts` verifica currículo sem formação/experiência, rejeição, correção/reenvio pela mesma conta, aprovação, publicação direta, edição e encerramento. O mesmo roteiro foi executado na interface com Chromium e dados fictícios; a recarga do navegador confirmou persistência do currículo. Há teste de remoção de campos por teclado na interface. As capturas foram inspecionadas visualmente.

Todos os testes de banco usaram schemas exclusivos do PostgreSQL local, removidos ao final. O arquivo `.env` e o schema de desenvolvimento não foram alterados. O aviso de depreciação do driver PostgreSQL persistiu sem falhas nos testes; não foram alteradas versões de dependências para ocultá-lo.

### Capturas de tela

| Tela | 360 px | 1440 px |
| --- | --- | --- |
| Currículo | [Captura](evidencias/sprint-2/curriculo-360.png) | [Captura](evidencias/sprint-2/curriculo-1440.png) |
| Análise empresarial | [Captura](evidencias/sprint-2/analise-empresa-360.png) | [Captura](evidencias/sprint-2/analise-empresa-1440.png) |
| Formulário da vaga | [Captura](evidencias/sprint-2/formulario-vaga-360.png) | [Captura](evidencias/sprint-2/formulario-vaga-1440.png) |
| Gestão das vagas | [Captura](evidencias/sprint-2/gestao-vagas-360.png) | [Captura](evidencias/sprint-2/gestao-vagas-1440.png) |

[Resultado estruturado da verificação visual](evidencias/sprint-2/verificacao-visual.json).

As capturas usam contas e dados de teste. Elas não comprovam publicação, disponibilidade de hospedagem ou auditoria integral de acessibilidade. Não houve revisão por outro integrante nem integração automática em staging.
