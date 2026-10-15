# Índice dos ADRs por tema

Só `status: accepted` vale como decisão; `superseded` é histórico. Supersessão e emenda são bidirecionais e o CI `lint-adr` trava ADR fora do formato e ADR que não está neste índice.

## Fluxo de trabalho

| ADR | Status | Título |
|---|---|---|
| [0035](0035-o-programa-ana-adota-o-fluxo-do-iae-e-do-hospital.md) | accepted | O programa Ana adota o fluxo de trabalho do IAE e do Hospital |

## Contrato e comercial

| ADR | Status | Título |
|---|---|---|
| [0001](0001-arquitetura-dois-contratos.md) | superseded | Dois contratos autônomos com Anexo de Proteção de Dados (DPA) compartilhado |
| [0002](0002-consolidacao-contrato-unico.md) | accepted | Consolidação em um contrato único de Serviços Contínuos |
| [0026](0026-o-contrato-assina-na-minuta-do-hospital.md) | accepted | O contrato assina na minuta do hospital, com SLA enxuto e reajuste pelo IPCA |

## A Ana e a plataforma

| ADR | Status | Título |
|---|---|---|
| [0005](0005-ana-no-fazer-ai-agents.md) | accepted | Ana roda no fazer.ai agents; n8n aposentado; roadmap reconstituído ao estágio de viabilidade |
| [0012](0012-trio-logico-agentes.md) | accepted | A Ana vira um trio lógico (orquestradora, Particular, Ouvidoria) compilado num agente físico único |
| [0013](0013-modelo-universal-luna.md) | accepted | gpt-5.6-luna é o modelo padrão do tenant, trocado direto e sem gate |
| [0014](0014-cadastro-sai-do-bot.md) | accepted | Cadastro de paciente sai do bot: nome + CPF é o único bloco cadastral da conversa |
| [0024](0024-a-versao-do-chatwoot-e-decisao-do-programa.md) | accepted | A versão do Chatwoot é decisão do programa, não detalhe de infra |

## Base de dados e ouvidoria

| ADR | Status | Título |
|---|---|---|
| [0003](0003-base-de-conhecimento.md) | accepted | Base de conhecimento da Ana: Sheets como UI de edição, Postgres como runtime |
| [0006](0006-base-ana-nocodb.md) | accepted | A fonte de dados editável da Ana sai do Google Sheets e vira NocoDB self-hosted (Base Ana) |
| [0010](0010-protocolo-ouvidoria.md) | accepted | O protocolo da ouvidoria é um sequencial ANO-NNNN numa tabela própria do NocoDB, fora de qualquer shared view |
| [0015](0015-base-ana-migra-para-hospital-reunioes.md) | accepted | Base Ana migra do NocoDB para o Hospital Reuniões |
| [0016](0016-protocolo-vem-do-post.md) | accepted | O protocolo da ouvidoria vem do POST, e o elo com a conversa inverte de direção |

## Integração Global Health e MV

| ADR | Status | Título |
|---|---|---|
| [0009](0009-desenho-fluxo-gh.md) | accepted | A Ana fala com a Global Health por uma fachada de 7 ferramentas de agenda, não pelos 22 endpoints crus |
| [0023](0023-massa-propria-na-homolog.md) | accepted | A massa de homologação deixa de ser espera: criamos o catálogo de teste nós mesmos, com o tutorial da MV |
| [0025](0025-cobertura-de-convenio-vem-da-agenda-online.md) | accepted | A cobertura de convênio vem da agenda online, não de tabela curada |

## Ana OS e Retrato

| ADR | Status | Título |
|---|---|---|
| [0004](0004-fronteira-playground-atlas.md) | accepted | Playground vira portal único multi-página; fronteira de ambientes passa a ser por página |
| [0007](0007-ana-os.md) | accepted | Ana OS: o portal absorve o roadmap e vira o cockpit único do programa |
| [0008](0008-redesign-cockpit-grafo.md) | accepted | Redesign do Ana OS (referência refero) e grafo de execução com prompts copiáveis |
| [0011](0011-mesa-de-acao.md) | accepted | A home do Ana OS ganha a Mesa de ação: cards abertos agrupados por canal (dispare / comigo / aguardando), com ficha de hover e prompt por canal |
| [0017](0017-o-os-nao-guarda-o-que-muda.md) | accepted | As páginas do Ana OS não guardam o que a plataforma já sabe |
| [0018](0018-lingua-unica-da-origem-da-ferramenta.md) | accepted | Uma língua só para a origem da ferramenta, nas três páginas do cockpit |
| [0019](0019-cockpit-enxuto-sete-paginas-para-o-arquivo.md) | accepted | Cockpit enxuto: sete páginas saem de cena para o arquivo |
| [0028](0028-retrato-da-ana-e-o-os-de-cinco-abas-so-leitura.md) | accepted | O Retrato da Ana nasce para o diretor, e o Ana OS vira cinco abas só de leitura |
| [0029](0029-tudo-tem-link-e-o-retrato-veste-o-app-do-hospital.md) | accepted | Tudo tem link, e o Retrato da Ana veste o design system do app do hospital |
| [0030](0030-o-ana-os-e-uma-pagina-so-o-esqueleto-do-retrato-vestido-de-ledger.md) | accepted | O Ana OS é uma página só: o esqueleto do Retrato vestido de Ledger, com a camada de operação por cima |
| [0031](0031-o-roadmap-sai-dos-arquivos-e-vai-para-o-github.md) | accepted | O roadmap sai dos arquivos e vai para as Issues do GitHub; o Cockpit lê o `gh` |
| [0034](0034-o-menu-do-ana-os-vai-para-a-barra-lateral.md) | accepted | O menu do Ana OS vai para a barra lateral |

## Bancada e testes

| ADR | Status | Título |
|---|---|---|
| [0020](0020-testes-manuais-e-selo-no-cockpit-inteiro.md) | accepted | Testes manuais como decima pagina, e o selo de origem no cockpit inteiro |
| [0021](0021-teste-aponta-para-a-secao-do-prompt.md) | accepted | O teste aponta para a seção do prompt, e a página de Testes vira lista filtrável |
| [0022](0022-familias-da-bancada-explicadas-no-cockpit.md) | accepted | As famílias da bancada ganham página própria no cockpit |
| [0027](0027-cadeias-elo-a-elo-com-a-conversa-da-ana-ao-lado.md) | accepted | As Cadeias rodam elo a elo, e cada elo mostra a conversa da Ana ao lado |
| [0032](0032-a-bancada-da-migracao-sai-da-tela-e-o-os-ganha-o-player.md) | accepted | A bancada da migração sai da tela, os testes manuais viram cenários e o OS ganha o player |
| [0033](0033-a-bancada-ganha-um-painel-ao-vivo-no-claude-code.md) | accepted | A bancada ganha um painel ao vivo no Claude Code |
