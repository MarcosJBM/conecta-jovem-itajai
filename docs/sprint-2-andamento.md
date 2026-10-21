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
