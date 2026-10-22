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

## #37 — documentação e rastreabilidade da entrega

O README apresenta os contratos HTTP atuais e os passos de execução com migrations. O registro de mudanças mantém a comparação com o PDF M1 e acrescenta o avanço de 21/10, preservando a redação histórica das decisões de 20/10. O desenvolvimento e as verificações foram executados em 21/10; os status de revisão não equivalem a integração concluída.

| História / requisito / caso de uso | Regras aplicadas | Issues | Evidência principal |
| --- | --- | --- | --- |
| US03 / RF03 / UC03 — perfil profissional e currículo | RN02 refinada: dados cadastrais obrigatórios + habilidade; formação/experiência opcionais | #28, #29, #30 | Modelos/migration, testes de completude e de API, interface de currículo, captura e teste no navegador |
| US09 / RF09 / UC09 — decisão administrativa | RN08 refinada: pendente/aprovada/rejeitada; motivo na rejeição e reenvio pela mesma conta | #31, #32; integração com #25 | Testes de permissões e decisões concorrentes, fluxo rejeitar/corrigir/aprovar e painel ADMIN |
| US10 / RF10 / UC10 — gestão das próprias vagas | RN01, RN04, RN06, RN09: aprovação, propriedade, prazo e trabalho formal | #33, #34, #35 | Migration, API, catálogo, teste de virada do prazo, interface e fluxo publicar/editar/encerrar |
| Qualidade e gerenciamento de mudanças | Rastreabilidade, testes pertinentes e registro real de datas/evidências | #36, #37 | Teste integrado, este relatório, capturas e registro de mudanças |

### Atualização posterior à revisão técnica

Foi detectada e corrigida a presença de IDs internos nos registros profissionais retornados pela API, que dificultava salvar novamente o currículo após recarregar formação/experiência. A projeção agora seleciona explicitamente apenas os campos do contrato. A correção foi aplicada também à branch da #29 e propagada às demais por merges normais, sem reescrever commits publicados.

A regressão unitária continuou com 120 testes aprovados; os dois E2E afetados (currículo e fluxo integrado) passaram novamente. O navegador confirmou adicionar formação/experiência, salvar, recarregar, salvar novamente e remover essas seções, preservando a habilidade. O resultado estruturado inclui esse roteiro adicional. Capturas foram feitas após aguardar o carregamento da listagem.

### Limites da entrega

- Edição de dados pessoais e de credenciais continua adiada; a informação cadastral é reaproveitada em leitura.
- Formação/experiência não são obrigatórias; a regra de completude não impõe escolaridade nem experiência prévia.
- Não há PDF, upload, consulta automática do CNPJ, estado empresarial de correção separado ou histórico permanente de análises.
- Busca pública, candidatura, acesso empresarial a candidatos, histórico de seleção e notificações permanecem nas próximas sprints.
- A validação de prazo prepara RN06; o bloqueio de candidatura propriamente dito será aplicado quando a candidatura existir.
- As verificações de interface em duas larguras e o teste por teclado não substituem uma auditoria integral de acessibilidade ou compatibilidade de navegadores.
- HTTPS real e hospedagem ficam para o fim, se o projeto for publicado. Não há declaração de disponibilidade de 99% nem de teste de carga nesta entrega.

### Revisão e integração

As PRs são encadeadas na ordem #28 → #29 → #30 → #31 → #32 → #33 → #34 → #35 → #36 → #37 para manter diffs separados e preservar evidências por tarefa. Isso não significa que frentes independentes possuam dependência funcional entre si: é a organização das branches desta execução individual.

A primeira PR é a [#38](https://github.com/MarcosJBM/conecta-jovem-itajai/pull/38), com destino `staging`. As seguintes apontam inicialmente para a branch anterior. Revisar na ordem; após integrar a base, alterar o destino da próxima para `staging`, conforme o fluxo de fechamento de issues já configurado. Nenhuma PR foi integrada em `staging` nesta entrega. A revisão por outro integrante prevista no PDF continua sendo uma pendência real, não substituída pela inspeção do assistente.

### PRs por tarefa

| Issue | PR | Base inicial |
| --- | --- | --- |
| [#28](https://github.com/MarcosJBM/conecta-jovem-itajai/issues/28) | [#38](https://github.com/MarcosJBM/conecta-jovem-itajai/pull/38) | `staging` |
| [#29](https://github.com/MarcosJBM/conecta-jovem-itajai/issues/29) | [#39](https://github.com/MarcosJBM/conecta-jovem-itajai/pull/39) | `codex/28-resume-data-model` |
| [#30](https://github.com/MarcosJBM/conecta-jovem-itajai/issues/30) | [#40](https://github.com/MarcosJBM/conecta-jovem-itajai/pull/40) | `codex/29-resume-api` |
| [#31](https://github.com/MarcosJBM/conecta-jovem-itajai/issues/31) | [#41](https://github.com/MarcosJBM/conecta-jovem-itajai/pull/41) | `codex/30-resume-interface` |
| [#32](https://github.com/MarcosJBM/conecta-jovem-itajai/issues/32) | [#42](https://github.com/MarcosJBM/conecta-jovem-itajai/pull/42) | `codex/31-company-review-api` |
| [#33](https://github.com/MarcosJBM/conecta-jovem-itajai/issues/33) | [#43](https://github.com/MarcosJBM/conecta-jovem-itajai/pull/43) | `codex/32-company-review-interface` |
| [#34](https://github.com/MarcosJBM/conecta-jovem-itajai/issues/34) | [#44](https://github.com/MarcosJBM/conecta-jovem-itajai/pull/44) | `codex/33-job-data-model` |
| [#35](https://github.com/MarcosJBM/conecta-jovem-itajai/issues/35) | [#45](https://github.com/MarcosJBM/conecta-jovem-itajai/pull/45) | `codex/34-job-management-api` |
| [#36](https://github.com/MarcosJBM/conecta-jovem-itajai/issues/36) | [#46](https://github.com/MarcosJBM/conecta-jovem-itajai/pull/46) | `codex/35-job-management-interface` |
| [#37](https://github.com/MarcosJBM/conecta-jovem-itajai/issues/37) | [#47](https://github.com/MarcosJBM/conecta-jovem-itajai/pull/47) | `codex/36-sprint-2-validation` |

Todas as issues permanecem abertas enquanto aguardam revisão e integração; as datas do quadro registram execução real em 21/10/2026.
