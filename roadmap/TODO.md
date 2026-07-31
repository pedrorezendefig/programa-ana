# TODO - Programa Ana: testes de viabilidade no fazer.ai agents

> Verdade **narrativa** do estágio atual. O espelho de **dados** é `os/dados/roadmap.json`, renderizado pela home do **Ana OS** (`python3 os/server.py` e abrir `localhost:8777`; ADR-0007). Regra de sempre: ao mudar um status aqui, mude lá (e vice-versa).
>
> O roadmap anterior (trilhas A a G, PENDENCIAS.md, mapa antigo, relatório do ultracode) está **intacto em `roadmap/arquivo/`**: é história e acervo de consulta (os textos prontos para a Global Health e para o analista de TI moram lá), não é fronteira de trabalho.

**Status:** `[ ]` a fazer · `[~]` em curso · `[x]` feito · `[!]` bloqueada
**Donos:** **(P)** Pedro · **(C)** Claude (sessões) · **(E)** Externo

---

## Estado (31/jul/2026)

A Ana foi migrada do n8n para a plataforma **fazer.ai agents** (onboarding 29/jul, E2E aprovado): agente id 1 no tenant `vitta-tech`, modo teste, prompt completo do SOP, ferramentas nativas (kanban, tags, handoff, notas), KB "Base Hospital São Matheus". As inboxes do Chatwoot vinculadas são o **bot do Telegram (SaoMatheusBot)** e a inbox de API "Ana E2E". Observabilidade: conversas no Chatwoot, raciocínio e custo por resposta no Langfuse.

O grilling de 30/jul definiu o estágio: **provar viabilidade sem Global Health**, com `gpt-5-mini` e as tabelas oficiais lidas ao vivo do **NocoDB** (a base editável do negócio, que substituiu o Google Sheets: ADR-0006). O critério de pronto do estágio é o **Roteiro de cenários** (V5/V6). Integração MV/Global Health é pendente explícito (GH1), a discutir em sessão própria.

O segundo grilling de 30/jul (noite) abriu a frente **Ana OS** (ADR-0007): o portal `localhost:8777` vira o cockpit único do programa (pasta `os/` na raiz, visual do DESIGN.md), absorvendo o roadmap (este mapa.html aposenta ao final), com faixa de Ideias editável pela UI, Mapa das APIs por tema (puxa a metade "catálogo e viabilidade" da GH1), diagrama de arquitetura e Biblioteca de docs. Tarefas OS1..OS5 abaixo.

## Tarefas do estágio

| ID | St | Tarefa | Dono | Depende de |
|---|---|---|---|---|
| V1 | `[x]` | Desativar os workflows "Ana" e "Desliga Ana" no n8n | C | nada |
| V2 | `[x]` | Trocar o modelo do agente para `gpt-5-mini` | C | nada |
| V3 | `[x]` | Subir o NocoDB (base editável do negócio) com as 4 tabelas importadas | C | nada |
| V4 | `[x]` | Criar as tools HTTP das tabelas, conceder à Ana e provar no playground | C | V3 |
| V5 | `[x]` | Escrever o Roteiro de cenários (~10 cenários) | C+P | nada |
| V6 | `[ ]` | Rodar o roteiro no Telegram, conferindo Chatwoot e Langfuse | P+C | V4, V5 |
| V7 | `[ ]` | Revogar o token Cloudflare usado no onboarding | P | nada |
| V8 | `[ ]` | Resolver o hotfix temporário do Chatwoot (cobrar fix upstream; reaplicar se o 500 voltar) | P+C | nada |
| V9 | `[ ]` | Dar acesso de edição do NocoDB ao usuário de negócio (convite + passo a passo de edição) | P | V3 |
| OS1 | `[x]` | Ana OS: fundação (`os/`, server estendido, design system Aaply, dados em JSON) | C | nada |
| OS2 | `[x]` | Ana OS: páginas novas (home/cockpit, Mapa das APIs, Arquitetura, Biblioteca) | C | OS1 |
| OS3 | `[x]` | Ana OS: redesign das 6 páginas do playground (bancada, roteiro, atlas, absorção, insights, tst) | C | OS1 |
| OS4 | `[x]` | Ana OS: fumaça por página (bancada chama API, roteiro executa, atlas lê CSV, roadmap grava) | C+P | OS2, OS3 |
| OS5 | `[x]` | Ana OS: arquivamento e limpeza (mapa.html aposenta, playground/ sai, CLAUDE.md e /check atualizados) | C | OS4 |

### OS1..OS5 · Ana OS no ar `[x]`
Feitas em 30/jul/2026, na mesma sessão do grilling (ADR-0007). O cockpit vive em `os/` (`python3 os/server.py`, `localhost:8777`): home com roadmap (estágio + Pendente + Ideias editáveis pela UI, única rota de escrita do server, restrita a `os/dados/roadmap.json`), painel de aplicações, Mapa das APIs com selos de testabilidade (leitura de catálogo / escrita no SaaS GH / finalização com prova no banco), diagrama de arquitetura, bancada e roteiro (homolog), Atlas e Absorção (retrato da produção), Conexão TST e Biblioteca (allowlist de .md; `dados-locais/` e `amostras/` bloqueados). Visual: `os/DESIGN.md` (Aaply), fontes locais, tema claro. Fumaça: 10 páginas 200, allowlist bloqueando `.env` e traversal, escrita validada com backup, conferência visual no Chrome. Pendência menor: a prova viva no Oracle TST aguarda a VPN voltar (sem conexão desde 13/jul); as queries ficam em modo copiar. Arquivados sem perda: `roadmap/arquivo/mapa-mesa-30jul2026.html` e `ana/api-mv/arquivo/` (playground-pre-os/, prompt-playground-api, smoke-test-gh, queries-exploracao).

### V1 · Desativar o n8n `[x]`
Feito em 30/jul/2026 via API. O fazer.ai agents é o único cérebro respondendo o bot do Telegram. Os 5 subworkflows que seguiam ativos (Aplicar_tag, Escalar_humano, Registrar_reclamacao, Atualizar_lead, Agendamento_convenio) são filhos do fluxo principal e ficam inertes sem ele. Export preservado em `ana/workflows/`; religar é questão de minutos se preciso. Em 31/jul o serviço n8n inteiro foi **parado no Coolify** a pedido do Pedro (uuid `s14ks3o3u65xafg114cwimnq`; a URL pública devolve 503, e isso é esperado): liberou RAM na KVM4; religar = `start` no mesmo serviço.

### V2 · Modelo `gpt-5-mini` `[x]`
Feito em 30/jul/2026 (antes: `gpt-5.2`). Preços por 1M tokens: $0.25 input / $2.00 output, contra $1.75 / $14.00 do gpt-5.2. Decisão e pesquisa citada no grilling de 30/jul (não existe "gpt-5.2-mini"; a geração 5.6 usa sol/terra/luna e o tier mini dela custa mais que o gpt-5.2). Se o mini degradar no roteiro, voltar é uma linha.

### V3 · NocoDB no ar com as 4 tabelas `[x]`
Feito em 30/jul/2026, substituindo o plano original de publicar abas do Google Sheets (decisão registrada no ADR-0006: o Sheets saiu da equação; o compartilhamento público expunha a `6_Ouvidoria_Log`, e o negócio ganha uma tela própria). Serviço `nocodb-base-ana` no Coolify (projeto fazer.ai agents), HTTPS com Let's Encrypt: `https://nocodb-ucc0hkwgqdsa38p5xrwa1x0h.31.97.29.32.sslip.io`. Base "Base Ana" com as tabelas `1_Consultas_Particulares` (10), `2_Exames` (10), `3_Cirurgias_Estimativas` (3) e `4_Convenios_Especialidade` (20 registros), importadas dos xlsx que o Pedro depositou (snapshot commitável em `ana/base-conhecimento/`; xlsx brutos com dado pessoal em `dados-locais/`, fora do git). Admin: conta criada pelo Pedro. RAM da VPS segue folgada (~10,4 de 16 GB usados com tudo rodando).

### V4 · Tools HTTP na plataforma `[x]`
Feito em 30/jul/2026. Quatro tools na plataforma (`consultar_precos_consultas`, `consultar_exames`, `consultar_cirurgias_estimativas`, `consultar_convenios_especialidade`) lendo **shared views públicas somente leitura** do NocoDB (sem segredo na tool; escrita continua exigindo login). Prompt do agente ganhou a seção "Tabelas Oficiais" com regra de precedência sobre a `search_knowledge`. Ajuste obrigatório de sandbox: `gpt-5-mini` não aceita temperature 0.3, agora roda com o padrão 1. Prova no playground: pergunta de cardiologia → tool chamada → "R$ 380,00" + diferenciais + tag `particular-aquecido`, no script exato da Seção 2.3.

### V5 · Roteiro de cenários `[x]`
Feito em 30/jul/2026: `roadmap/roteiro-cenarios.md`. 10 cenários principais (urgência bloqueante, particular ponta a ponta, convênio, ouvidoria com guardrails, LGPD de resultado de exame, robô, saudação, CPF inválido, desistência) + 2 condicionais (fora de horário, Regra 13). Cada um com a etapa/tag esperada no Chatwoot e as ferramentas esperadas no Langfuse, e a tabela de registro dos resultados no fim.

### V6 · Rodar o roteiro
**Contexto:** Pedro roda os cenários no bot do Telegram; a cada um, confere no Chatwoot (etapa e tag certas) e no Langfuse (ferramentas chamadas, custo).
**Pronto quando:** todos os cenários passarem com `gpt-5-mini`. Falhas viram ajuste de prompt/ferramenta e o roteiro roda de novo.

### V9 · Acesso de edição para o negócio
**Contexto:** o NocoDB é a tela onde o usuário de negócio edita valores, diferenciais e cobertura (grid estilo planilha). Falta o Pedro convidar quem edita (Base Ana > Members, papel Editor) e passar o passo a passo básico. Mudança salva na tabela vale na resposta seguinte da Ana, sem redeploy.
**Pronto quando:** ao menos um usuário de negócio (ou o próprio Pedro no papel) editar um valor e a Ana responder o valor novo.
**Adiada em 31/jul por decisão do Pedro:** por enquanto só ele edita; o convite ao negócio fica para bem depois.

### V7 · Revogar token Cloudflare
Pendência de segurança do onboarding de 29/jul: o token de API usado para criar os DNS (agents/langfuse/coolify) ainda está ativo. Revogar no painel da Cloudflare. **Adiada em 31/jul por decisão do Pedro:** o token ainda vai ser usado; revogar só quando não houver mais uso previsto.

### V8 · Hotfix do Chatwoot
A correção de 1 linha aplicada dentro do container do Chatwoot (regressão da versão .111: 500 em /agent_bots e /labels via token) **evapora no próximo redeploy**. Cobrar o fix upstream (bug report já enviado) e, se o 500 voltar, reaplicar. Detalhe em `bug-report-fazer-ai.md`.

## Pendente (dívidas conscientes, sem detalhamento até serem puxadas)

| ID | Tarefa | Nota |
|---|---|---|
| GH1 | Sessão de desenho: onde as APIs Global Health entram no fluxo da Ana (metade restante) | A metade "catálogo e viabilidade" foi puxada pelo Mapa das APIs (OS2, ADR-0007); resta o desenho de fluxo em sessão dedicada. Acervo em `roadmap/arquivo/` e no Ana OS |
| OV1 | Sistema de protocolo da ouvidoria | Hoje o SOP proíbe inventar protocolo; decidir o mecanismo quando for a hora |

## Log

- **31/jul/2026:** serviço n8n parado no Coolify (a pedido do Pedro, via MCP): 503 na URL pública é proposital; religar é um `start`. Instância fazer.ai conferida no check (gpt-5-mini, modo teste, inboxes Telegram + API vinculadas). Fronteira do estágio: rodar a V6.
- **30/jul/2026 (5):** frente Ana OS executada inteira (OS1..OS5): cockpit no ar em `localhost:8777` com redesign Aaply completo, Mapa das APIs, Arquitetura, Biblioteca e Ideias editáveis. mapa.html aposentado para `roadmap/arquivo/`; playground antigo em `ana/api-mv/arquivo/playground-pre-os/`; CLAUDE.md e /check atualizados para o espelho `os/dados/roadmap.json`.
- **30/jul/2026 (4):** segundo grilling do dia abre a frente Ana OS (ADR-0007, decisões no CONTEXT.md): o portal absorve o roadmap, redesign completo no DESIGN.md (Aaply), faixa de Ideias editável pela UI, Mapa das APIs, Arquitetura e Biblioteca. Nascem OS1..OS5; GH1 reformulada (metade puxada).
- **30/jul/2026 (3):** V3 e V4 concluídas pelo caminho NocoDB (ADR-0006): Google Sheets abandonado como fonte, NocoDB no Coolify com HTTPS, 4 tools de tabela criadas e provadas no playground com `gpt-5-mini` (temperature ajustada para 1, exigência do modelo). Nasce a V9 (acesso de edição do negócio). V6 totalmente destravada: falta só rodar o roteiro no Telegram.
- **30/jul/2026 (2):** V5 concluída: `roadmap/roteiro-cenarios.md` escrito a partir do SOP real da instância.
- **30/jul/2026:** grilling redefine o programa para o estágio de testes de viabilidade (decisões no CONTEXT.md e no ADR-0005). Roadmap anterior arquivado em `roadmap/arquivo/`. V1 (n8n desativado) e V2 (`gpt-5-mini`) executadas na própria sessão. Nasce este TODO e o mapa novo.
- **29/jul/2026:** onboarding fazer.ai agents concluído, E2E aprovado (detalhe na memória da sessão e em `bug-report-fazer-ai.md`).
