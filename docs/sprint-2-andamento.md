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
