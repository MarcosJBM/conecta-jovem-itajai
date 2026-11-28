# Validação da Sprint 5

## TS01 — Responsividade no Chrome

Ambiente local com Chrome 158.0.8127.37 (headless), macOS, frontend Vite, API Express e PostgreSQL em schema isolado. A verificação automatizada via Playwright usou larguras de 360, 375, 390, 600, 767, 768, 1024 e 1440 px, com altura de 900 px.

| Área | Cenários |
| --- | --- |
| Acesso | Login, cadastro do jovem e cadastro de empresa |
| Jovem | Perfil com formulário de formação aberto, menu e mural de vagas, detalhes da vaga, busca e detalhes com título extenso, candidaturas com histórico expandido |
| Empresa | Formulário de criação de vaga, paginação das vagas, consulta de candidato e currículo enviado |
| Administração | Solicitação de empresa com razão social extensa e painel de análise |

O teste comparou a largura do documento com a área útil da janela e verificou os limites horizontais dos controles visíveis. Com os dados sintéticos de nomes longos, houve 22 ocorrências de estouro entre o mural, os detalhes da vaga e a análise administrativa. Em 360 px, um título sem espaços acrescentou até 1208 px à largura da página. O botão de análise também excedia a largura disponível.

Após permitir a quebra dos títulos e do texto do botão, os 96 cenários (12 por largura) passaram sem estouro horizontal ou controles fora da área útil.

## TS06 — Acessibilidade dos fluxos essenciais

A auditoria usou axe-core 4.14.1 no Chrome, em 360 e 1440 px. Foram executadas as regras automatizadas com rótulos WCAG 2.0 A/AA, 2.1 A/AA e 2.2 AA nos cenários da tabela acima. A verificação final cobriu 24 combinações de tela e largura e não encontrou violações nas regras executadas.

O teste por teclado mostrou que, ao selecionar **Minhas candidaturas** no menu móvel, o foco caía no corpo da página quando o link era ocultado. Agora o foco passa para a região principal. O painel ganhou o atalho **Pular para o conteúdo**, e Escape fecha o menu móvel e devolve o foco ao botão **Menu**.

Também foram verificados o login com formulário inválido, a associação da mensagem ao campo, o avanço e o retorno da paginação e a abertura do histórico com Enter. Os formulários passaram a anunciar os campos obrigatórios. Os controles compartilhados receberam indicadores de foco com a cor sólida, e cada histórico de status ganhou um rótulo que identifica a vaga.

## TS02 — Tempo de resposta dos fluxos principais

Medição local em macOS arm64, Node.js 24.21.0, frontend Vite, API Express e PostgreSQL 18. Foram usados um schema descartável, quatro contas sintéticas, 22 vagas, currículos estruturados e candidaturas com histórico. O login usou BCrypt com fator 12. A meta do M1 foi aplicada a cada amostra, com limite de 2000 ms.

A primeira rodada mediu 15 execuções sequenciais por operação, da requisição através do proxy Vite até o recebimento e a leitura do JSON. Cada envio e mudança de status usou uma candidatura diferente.

| Operação HTTP | Mediana (ms) | Máximo (ms) |
| --- | ---: | ---: |
| Login | 207 | 215 |
| Pesquisa de vagas | 7 | 10 |
| Envio de candidatura | 8 | 13 |
| Consulta de candidatos | 5 | 8 |
| Consulta do currículo enviado | 4 | 5 |
| Atualização de status | 5 | 9 |
| Consulta do histórico e notificações | 7 | 9 |

A segunda rodada mediu três execuções por operação no Chrome, a 1440 × 900 px. O cronômetro começou no acionamento do controle e parou quando o resultado ficou visível. A abertura do histórico inclui navegar para **Minhas candidaturas** e expandir o evento da vaga recém-atualizada.

| Operação no Chrome | Mediana (ms) | Máximo (ms) |
| --- | ---: | ---: |
| Login | 309 | 312 |
| Pesquisa de vagas | 47 | 49 |
| Envio de candidatura | 123 | 124 |
| Consulta de candidatos | 45 | 117 |
| Consulta do currículo enviado | 49 | 50 |
| Atualização de status | 50 | 51 |
| Abertura do histórico | 95 | 189 |

Todas as amostras ficaram abaixo do limite. Nenhuma operação exigiu ajuste de desempenho neste cenário. A validação cobre execução local sequencial com dados sintéticos. O teste de carga fica na Sprint 6.
