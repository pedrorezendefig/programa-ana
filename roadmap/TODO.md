# TODO — Programa Ana: guia de execução até o final

> Fonte de verdade operacional do projeto. O `roadmap/index.html` conta a história para gestão; este arquivo guia o trabalho dia a dia. Cada tarefa tem **ID estável**, **dono**, **dependências**, e uma ficha de detalhe com contexto, passos e critério de pronto. A seção "Fronteira de agora" diz o que está desbloqueado neste momento e é reescrita a cada avanço.
>
> **Para atualizar este arquivo e receber orientação: digite `/check` numa sessão Claude Code aberta neste diretório.** A skill local lê o TODO, o git, o diretório e o n8n, reescreve a fronteira e devolve os próximos passos com sugestões.

**Status:** `[ ]` a fazer · `[~]` em curso · `[x]` feito · `[!]` bloqueada
**Donos:** **(P)** Pedro · **(C)** Claude (sessões) · **(E)** Externo (hospital, Global Health, jurídico)

---

## Fronteira de agora (07/jul/2026: base MV explorada e digerida; C2 fechada; banco conectado parece HOMOLOG)

Pedro rodou os 3 pacotes no DBeaver (manhã de 07/jul); CSVs renomeados e organizados em `ana/api-mv/resultados/` (estrutura no git, amostras fora). Digestão entregue: `ana/api-mv/dicionario-colunas.md` (dicionário das 13 tabelas, diagrama escala → agenda → slot → atendimento → desfecho, classificação proposta dos motivos de alta, 6 perguntas para o analista). Achados que mudam o jogo: (1) owner canônico `DBAMV`; (2) o banco conectado aparenta ser HOMOLOGAÇÃO (`ATENDIME` com 29 linhas, `PACIENTE` com 2.499, atividade fresca): ótimo para smoke test ponta a ponta da GH, mas a Fase 3 (E1) exigirá a base de PRODUÇÃO; (3) `ATENDIME_GLOBAL_HEALTH` existe e está VAZIA (por isso a query 3.4 não retornou nada); (4) `MOT_ALT` real confirma o filtro de desfecho, com a armadilha dos motivos 63/64 (tipo `A`, mas óbito de RN/fetal: luto); (5) `NR_CPF` é NUMBER na interface GH (LPAD 11 obrigatório em qualquer cruzamento). Smoke test D1 EXECUTADO à tarde, da sessão: token válido, API funcional (leitura e ESCRITA: `POST /pessoas` criou o paciente-sonda id 1681, CPF `66301102770`), mas catálogos de homolog VAZIOS (nada publicado para o canal) e `tipoAgendamento` só aceita caixa alta (minúsculo = 500). Registro e queries de verificação: `ana/api-mv/smoke-test-gh.md`. Conexão direta da sessão ao Oracle documentada (`ana/api-mv/conexao-oracle.md` + `scripts/query-mv.py`): falta o Pedro colar as credenciais Oracle no `.env`. A3 em validação; LGPD segue adiada.

| # | Tarefa | Dono | Por que agora |
|---|---|---|---|
| A3 | Validação do hotfix: smoke test do Pedro ("estou com dor no peito" em contato de teste) + bateria sintética de ~15 mensagens + revisão das conversas reais por 2-3 dias | P+C | Hotfix entrou NO AR em 06/jul às 17h56 (aplicado via REST, versão ativa confirmada); falta provar que se comporta |
| A5 | Migrar token Chatwoot para Credential do n8n + rotacionar | P | Destrava o re-export dos workflows (A4); produção agora diverge do export antigo em `ana/workflows/` |
| C6 | Levar as 6 perguntas do `dicionario-colunas.md` ao analista de TI (a nº 1: este banco é homolog? onde vive a produção?) | P→E | A leitura do modelo está pronta; falta o carimbo de quem conhece a operação, e a produção é pré-condição da Fase 3 |
| D1 | Smoke test RODADO (07/jul, API funcional). Agora: queries de verificação no Oracle (paciente-sonda `66301102770`), credenciais Oracle no `.env` (conexão direta) e pedir à GH massa de homolog publicada (GH-19) + token de PRODUÇÃO + rate limit | P→E | A API está de pé, mas sem massa não há como exercitar T2-T7; o que falta é externo e tem lead time |
| B2 | Revisar os 8 artefatos do ultracode e ratificar decisões com o Felipe | P+C | Destrava D2, D3 e E3; síntese em `roadmap/relatorio-pesquisa.md` |

---

## Árvore de dependências

```mermaid
flowchart TD
    subgraph TA["Trilha A · Hotfix (agora)"]
        A1["A1 (C) Redigir hotfix"] --> A2["A2 (P) Aplicar no n8n"]
        A2 --> A3["A3 (P+C) Validação em sombra"]
        A5["A5 (P) Token Chatwoot vira Credential + rotação"] --> A4["A4 (C) Re-export + commit"]
        A3 --> A4
    end

    subgraph TB["Trilha B · Ultracode (rodando)"]
        B1["B1 (E) Sessão em execução"] --> B2["B2 (P+C) Revisar 8 artefatos"]
        B2 --> B3["B3 (C) SOP v2 absorve hotfix"]
    end
    A1 --> B3

    subgraph TC["Trilha C · Banco MV (curva de aprendizado)"]
        C1["C1 (E) Credencial read-only + conexão"] --> C2["C2 (C) Explorar: VPN direta ou pacotes de query"]
        C2 --> C3["C3 (C) Dicionário de colunas + diagrama do fluxo"]
        C3 --> C4["C4 (C) Mapear DESFECHO (ATENDIME/MOTIVO_ALTA)"]
        C3 --> C6["C6 (P) Validar leitura com o analista"]
        C5["C5 (C+P) Power BI SCMA (opcional)"]
    end

    subgraph TD1["Trilha D · Integração MV"]
        D1["D1 (E) Token GH + rate limit · CRÍTICO"] --> D2["D2 (C) Construir subfluxos MVP"]
        B2 --> D2
        B2 --> D3["D3 (C) Classificador de urgência"]
        D4["D4 (P) Etapa + tags novas no Kanban"] --> D5
        D2 --> D5["D5 (P+C) Homologação com checklist"]
        D3 --> D5
        D5 --> D6["D6 (P+C) Canário por inbox"] --> D7["D7 (P) Produção"] --> D8["D8 (P) Termo de Entregável +R$ 2k"]
    end
    C3 -.valida desenho.-> D2

    subgraph TE["Trilha E · Pós-atendimento"]
        C4 --> E1["E1 (E) Fonte MV com desfecho"]
        E2["E2 (E) Base legal LGPD"] --> E4
        B2 --> E3["E3 (C+P) Template utility + teste de classificação"]
        E1 --> E4["E4 (P+C) POC eletivo 250 a 1000/dia"]
        E3 --> E4
        E4 --> E5["E5 (C) Camada analítica"] --> E6["E6 (P+E) Relatórios, dono e ritual semanal"]
        E4 --> E7["E7 (C+P) GMB: respostas a avaliações (backlog)"]
    end

    subgraph TG["Trilha G · Ana no canal principal (pós-D7)"]
        G1["G1 (P→E) Descobrir conexão do número/WABA"] --> G2["G2 (E+P) Migrar o número para o Chatwoot"]
        G2 --> G3["G3 (E) Treinar atendentes no Chatwoot"]
        G3 --> G4["G4 (P+C) Sombra com casos reais"]
        G4 --> G5["G5 (P+C) Autônomo + canário real (estanca a fila)"]
        G5 --> G6["G6 (P+C+E) Reforma Chatwoot + KPIs (§4/§5)"]
    end
    D7 --> G2
    G1 --> E3
    G5 -.canal principal estável.-> E4
```

Leituras da árvore:
- **Caminho crítico até a receita (+R$ 2k):** D1 → D2 → D5 → D6 → D7 → D8. Tudo começa no token GH; por isso D1 se pede HOJE.
- **Trilhas A, B e C são independentes entre si**: hotfix, pesquisa e banco andam em paralelo total.
- **C alimenta E**: sem mapear o desfecho no banco (C4), a Trilha E não tem filtro seguro (E1).
- **B2 é o pivô**: a revisão dos artefatos do ultracode destrava a construção (D2, D3) e o template (E3).
- **G realiza o valor do programa**: a integração termina no canal de teste; a fila do WhatsApp real só é atacada quando G migra o número (pós-D7). E3 depende de G1 (a WABA precisa ser conhecida) e E4 do canal migrado e estável (G5).

---

## Trilha A — Hotfix do prompt (agora)

| ID | St | Tarefa | Dono | Depende de |
|---|---|---|---|---|
| A1 | `[x]` | Redigir `Ana_System_Prompt.md` v1.1 (bloco crítico completo) | C | nada |
| A2 | `[x]` | Aplicar no nó `Agente IA Hospital` do n8n | P | A1 |
| A3 | `[~]` | Validação em sombra por período curto | P+C | A2 |
| A4 | `[ ]` | Re-exportar workflows para `ana/workflows/` e commitar | C | A3, A5 |
| A5 | `[ ]` | Migrar token Chatwoot para Credential + rotacionar | P | nada |

### A1 · Redigir o hotfix (v1.1 do prompt)

**Contexto:** o prompt em produção tem lacunas apontadas pelo briefing do diretor e confirmadas na análise de 03/jul. A mais grave: paciente com sinal de emergência ("dor no peito") hoje cai na regra "não orientar sobre sintoma" e fica sem direcionamento ao PS.

**Escopo exato da edição (nada além disso):**
1. **Nova Regra Global 1 + seção de urgência no topo do SOP:** detectar sinais de emergência (dor no peito, falta de ar, sangramento intenso, desmaio, convulsão, sinais de AVC, dor abdominal severa, febre muito alta em bebê, trauma, autoagressão, risco iminente à vida) e responder imediatamente: orientar PS presencial 24h (Adulto, Pediátrico, Ortopédico) ou SAMU 192, com endereço; sem diagnosticar, sem agendar, sem fluxo comercial, sem coletar lead. Na dúvida, orientar o PS (falso-positivo é aceitável, falso-negativo não).
2. **Regra Global 6 reescrita:** Ana se apresenta como assistente virtual quando perguntada, nunca nega ser IA, nunca expõe detalhes técnicos internos (fluxos, ferramentas, funil, lógica). Ajustar a resposta padrão "você é um robô?" para ficar coerente.
3. **Regra de exclusão ouvidoria↔comercial:** ao aplicar a tag `ouvidoria`, o modo comercial morre para a thread (sem ancoragem de valor, sem oferta particular, sem aquecimento) até o fluxo de ouvidoria encerrar. Agendamento pedido no meio da queixa vira novo fluxo depois do acolhimento completo.
4. **Guardrails jurídicos da ouvidoria (Seção 7):** trocar a mensagem de acolhimento ("Lamento muito que sua experiência não tenha sido a que você merecia" pressupõe culpa) por acolhimento do sentimento sem validar a acusação; nunca admitir falha do hospital; nunca prometer providência específica; nunca dar parecer sobre conduta; nunca desencorajar registro formal.
5. **Ajustes menores:** acentuação nas Seções 3.2 e 7.3; conectar a tag `fora-horario` na Seção 10; acionar a etapa `EM ATENDIMENTO — ANA` na Seção 1.1 (após identificar o motivo); na Seção 8.4, aplicar tag `prontuario` e registrar a dúvida de status em vez de sumir do CRM.

**Passos:** editar `ana/prompt/Ana_System_Prompt.md` → gerar diff comentado para revisão do Pedro → ajustar pelo feedback → commit.

**Pronto quando:** diff aprovado pelo Pedro; blocos de mensagem respeitam o limite de 320 caracteres; numeração das Regras Globais íntegra de 1 a 11; nenhuma tag/etapa referenciada fora da tabela de ferramentas.

**Referências:** `ana/briefings/Briefing...md` (I.1 a I.7), decisões do grilling de 03/jul e, principalmente, `ana/prompt/Ana_System_Prompt_v2.md`: o preâmbulo do v2 mapeia exatamente os blocos do hotfix (Fase 0) a portar para o prompt de produção, já revisados pelas melhores práticas da pesquisa (inclui a saudação "assistente virtual" exigida pela CFM 2.454/2026 e o texto fixo de urgência com CVV 188). O trabalho de A1 vira: extrair o delta Fase 0 do v2, não redigir do zero.

### A2 · Aplicar no n8n

**Contexto:** o systemMessage do nó é uma expressão n8n: começa com `=` e injeta data/hora e PERÍODO_FDS via `{{ }}`. Colar errado quebra a injeção.

**Passos:** abrir o workflow `Ana` (id `mwboSUbv8n4TBwPf`) → nó `Agente IA Hospital` → substituir o systemMessage preservando o `=` inicial e as expressões `{{ }}` → salvar → enviar mensagem de teste num contato de teste. Alternativa sem toque manual (preferida pelo Pedro em 04/jul): Pedro gera API key no n8n (Settings > n8n API em `n8nia.mala-ia.cloud`) e Claude aplica via REST (`PUT /api/v1/workflows/{id}`). Verificado em 04/jul: o MCP do n8n conectado à sessão é somente leitura/execução e o token dele retorna 401 na API REST; a API key é o único caminho automático.

**Pronto quando:** mensagem de teste responde com o comportamento novo (ex.: "estou com dor no peito" retorna orientação de PS/SAMU imediatamente).

### A3 · Validação em sombra

**Contexto:** o briefing recomenda rodar com revisão humana antes de considerar o hotfix entregue, para calibrar tom com casos reais (III.3.2).

**Passos:** definir janela (2 a 3 dias úteis); durante a janela, revisar diariamente as conversas reais no Chatwoot com foco em: disparos de urgência (todos corretos?), ouvidoria (acolhimento sem admissão de culpa?), comercial (tom consultivo?); rodar bateria sintética de ~15 mensagens de teste cobrindo: urgência clara, urgência ambígua ("dor de cabeça forte"), "você é um robô?", reclamação que vira pedido de agendamento, preço de cirurgia, contato fora de horário.

**Pronto quando:** bateria sintética 100% correta e nenhum incidente na janela de conversas reais.

### A4 · Re-export e commit

**Passos:** exportar `Ana.json` (e qualquer subfluxo alterado) → sobrescrever em `ana/workflows/` → conferir que `ana/prompt/Ana_System_Prompt.md` e o nó estão idênticos → commit.

**Pronto quando:** `git diff` limpo entre prompt do repo e prompt do nó; exports sem nenhum token em texto puro (depende de A5).

### A5 · Token Chatwoot vira Credential + rotação

**Contexto:** o `api_access_token` do Chatwoot está hardcoded nos nós HTTP de vários workflows e no histórico deste git (local). Enquanto isso não for limpo, o repo não pode ir para nenhum remote.

**Passos:** no n8n, criar Credential (Header Auth `api_access_token`) → apontar todos os nós HTTP do Chatwoot para a credencial (workflows: Ana, Desliga Ana, Atualizar_lead, Aplicar_tag, Escalar_humano, Agendamento_convenio, Registrar_reclamacao) → gerar novo token no Chatwoot e revogar o antigo → testar os fluxos.

**Pronto quando:** grep por token nos exports novos retorna vazio e o token antigo está revogado.

---

## Trilha B — Pesquisa ultracode

| ID | St | Tarefa | Dono | Depende de |
|---|---|---|---|---|
| B1 | `[x]` | Sessão ultracode concluída (03/jul): 8 artefatos commitados | E | nada |
| B2 | `[ ]` | Revisar os 8 artefatos, decidir o que entra, commitar | P+C | B1 |
| B3 | `[ ]` | Consolidar SOP v2 (hotfix + agendamento + pesquisa) | C | A1, B2 |

### B1 · Sessão concluída (03/jul/2026)

**Todos os 8 artefatos entregues e commitados:** `ana/prompt/Ana_System_Prompt_v2.md`, `pos-atendimento/viabilidade-webchat.md`, `docs/adr/0003-base-de-conhecimento.md`, `pos-atendimento/templates-meta.md`, `docs/06-spec-classificador-urgencia.md`, `pos-atendimento/arquitetura-analitica.md`, `ana/api-mv/perguntas-global-health.md`, `roadmap/relatorio-pesquisa.md` (+ roadmap visual e queries da Trilha C atualizados).

**Achados que mudam o plano** (detalhe no relatório): fim da janela grátis da Meta em 01/out/2026; CFM 2.454/2026 exige comunicar o uso de IA (~ago/2026); CPF em texto livre conflita com a policy da Meta; D1 grave no desenho do T2 (convênio particular tem id próprio); desfecho no MV vive em `MOT_ALT` (`TP_MOT_ALTA='O'` = óbito); webchat por link reprovado; fator utility vs marketing é ~9x.

### B2 · Revisão dos artefatos

**Ordem de leitura sugerida:** `relatorio-pesquisa.md` primeiro (síntese), depois `viabilidade-webchat.md` (resposta para o Felipe), depois os specs na ordem em que serão usados (classificador → templates → analítica → ADR base de conhecimento).

**Critérios de aceite por artefato:** afirmações de custo/política com fonte e data; recomendação clara (não um "depende" genérico); acionável sem retrabalho (specs com entradas/saídas definidas).

**Pronto quando:** cada artefato marcado como aceito, aceito-com-ajustes ou rejeitado; decisões registradas (ADR se irreversível); commit; fronteira atualizada (D2, D3 e E3 possivelmente destravadas).

### B3 · SOP v2 consolidado

**Contexto:** o v2 do ultracode nasce do prompt antigo; o hotfix (A1) entra em produção antes. Consolidar = aplicar no v2 qualquer ajuste que a validação em sombra (A3) tiver ensinado, e garantir que o v2 contém o hotfix inteiro.

**Pronto quando:** `Ana_System_Prompt_v2.md` é um superconjunto verificado do v1.1 + seções de agendamento; vira o texto que sobe na Fase D5.

---

## Trilha C — Banco MV (curva de aprendizado)

| ID | St | Tarefa | Dono | Depende de |
|---|---|---|---|---|
| C1 | `[x]` | Credencial Oracle read-only + dados de conexão + schema | P→E | nada |
| C2 | `[x]` | Explorar estrutura (VPN direta ou pacotes de query) | C | C1 |
| C3 | `[~]` | Dicionário de colunas + diagrama do fluxo de agendamento | C | C2 |
| C4 | `[~]` | Mapear onde vive o DESFECHO e como filtrar | C | C3 |
| C5 | `[ ]` | (Opcional) Varredura do Power BI módulo SCMA | C+P | navegador aberto |
| C6 | `[ ]` | Validar leitura do modelo com o analista de TI | P | C3 |

### C1 · Credencial e conexão

**Fechada em 06/jul:** Pedro confirmou que a conexão do DBeaver é Oracle (login/senha funcionando). As duas pendências restantes (confirmar que ATENDIME e as tabelas de agendamento vivem nesse banco; descobrir o owner/schema canônico) são exatamente o que a query 1.1 do Pacote 1 responde: viraram o primeiro passo de C2.

**Cuidado:** credencial NUNCA entra no repo. Guardar em variável de ambiente local ou keychain; a sessão Claude usa em memória.

### C2 · Exploração

**Fechada em 07/jul:** Pedro rodou os Pacotes 1, 2 e 3 no DBeaver; CSVs renomeados pela convenção e organizados (estrutura em `resultados/`, no git; amostras com dado de paciente em `resultados/amostras/`, fora do git). A 3.4 retornou 0 linhas porque `ATENDIME_GLOBAL_HEALTH` está vazia neste banco (achado, não erro).

**Caminho preferido:** VPN ligada no Mac → `pip install oracledb` (modo thin, sem client Oracle) → testar conexão → rodar os Pacotes 1 e 2 de `ana/api-mv/queries-exploracao.md` direto da sessão, iterando conforme os resultados.
**Fallback:** Pedro (ou o analista) roda os pacotes no SQL Developer/DBeaver e cola os resultados na sessão.

**Pronto quando:** resultados dos dois pacotes salvos em `ana/api-mv/resultados/` (CSV ou md) e commitados.

### C3 · Dicionário de colunas + diagrama

**Passos:** a partir dos resultados de C2, gerar `ana/api-mv/dicionario-colunas.md` (colunas, tipos, comentários, FKs das 8 tabelas + ATENDIME) e um diagrama mermaid do fluxo: escala → item de agendamento → agenda central → horário do paciente.

**Pronto quando:** o diagrama explica, com colunas reais, como um agendamento feito pela API aparece no banco (cruzando com `ATENDIME_GLOBAL_HEALTH`).

**Status 07/jul:** entregue em `ana/api-mv/dicionario-colunas.md` (dicionário das 13 tabelas, diagrama do fluxo, leituras operacionais para D2, 6 perguntas para o analista). Falta para fechar: a validação empírica do cruzamento com `ATENDIME_GLOBAL_HEALTH` (tabela vazia; depende do smoke test D1) e o carimbo do analista (C6).

### C4 · Mapear o desfecho

**Contexto:** é a pré-condição da Fase 3 inteira (briefing II.2/II.3). Sem saber distinguir "alta melhorado" de "óbito" no banco, não há disparo seguro.

**Passos:** estrutura de `ATENDIME` (tipo de atendimento, motivo de alta, datas) + `MOT_ALT` (nome no MV clássico; `MOTIVO_ALTA` como fallback; classificar cada motivo como benigno/adverso/óbito) + `PACIENTE_OBITO`; a pesquisa ultracode já deixou a query candidata pronta com 3 sinais redundantes de óbito em `ana/api-mv/perguntas-global-health.md` (seção de hipóteses): validar contra o banco real.

**Pronto quando:** a query candidata roda e o analista confirma a semântica dos motivos de alta (C6).

**Status 07/jul:** catálogo real de `MOT_ALT` digerido (28 motivos, tipos A/D/T/O confirmados); classificação proposta por bucket (disparo ok / avaliar / nunca) no `dicionario-colunas.md`, incluindo a armadilha 63/64 (tipo `A` com óbito de RN/fetal: a exclusão tem que ser por código, não só por tipo). Pendente: confirmação semântica com o analista (C6) e acesso à base de PRODUÇÃO (o banco conectado parece homolog; sem produção não há E1).

### C5 · Power BI (módulo SCMA)

**Passos:** Pedro abre o Chrome com a extensão ativa → Claude navega no link público do relatório → módulo SCMA → filtro de esquema em MVBIKE e MVINTEGRA → extrair páginas, KPIs e nomes de medidas para `ana/api-mv/powerbi-scma.md`.

**Valor:** ver quais indicadores a gestão já acompanha (bom para desenhar o relatório do pós-atendimento na mesma língua).

---

## Trilha D · Integração MV

| ID | St | Tarefa | Dono | Depende de |
|---|---|---|---|---|
| D1 | `[~]` | Token GH: homolog RECEBIDO (06/jul); falta prod + rate limit | P→E | nada |
| D2 | `[ ]` | Construir subfluxos MVP (T6→T1→T2→T5→T7) | C | D1, B2 |
| D3 | `[ ]` | Classificador de urgência antes do agente | C | B2 |
| D4 | `[ ]` | Etapa `FALHA AGENDAMENTO — FILA` + tags novas no Kanban | P | nada |
| D5 | `[ ]` | Homologação com checklist completo | P+C | D2, D3, D4 |
| D6 | `[ ]` | Canário por inbox | P+C | D5 |
| D7 | `[ ]` | Produção | P | D6 |
| D8 | `[ ]` | Termo de Entregável da Ana (+R$ 2.000/mês) | P | D7 |

### D1 · Token Global Health

**Status 06/jul:** token de homologação recebido e salvo em `.env` na raiz do repo (`GH_TOKEN_HOMOLOG`, fora do git via .gitignore). **Falta pedir** (via contato do hospital com a GH): token de produção (`whatsapp.agenda.globalhealth.mv/rest/whatsapp`); limite de chamadas simultâneas e rate limit; contato técnico para dúvidas da integração.

**Smoke test homolog (sub-passo novo, grilling de 06/jul):** antes de construir D2, chamar com o `GH_TOKEN_HOMOLOG` os endpoints documentados em `ana/api-mv/` (começando pelos de leitura: identificação de paciente e disponibilidade) e registrar em `ana/api-mv/resultados/` o que respondeu (shape do payload, erros, latência). Objetivo: provar que as tools conseguem falar com a API do MV como documentada, antes de qualquer construção.

**Executado em 07/jul (da sessão):** registro completo em `ana/api-mv/smoke-test-gh.md`. Auth OK, leitura OK, escrita OK (`POST /pessoas` criou id 1681, CPF-sonda `66301102770`; lookup por telefone confirmado). Catálogos de consultas/exames vazios (massa não publicada: pergunta GH-19); `tipoAgendamento` só aceita `CONSULTA`/`EXAME` em caixa alta (minúsculo = 500: achado para o T6); formato de erro extra `{"mensagens":[...]}` fora da doc. Pendências: queries de verificação no Oracle (no próprio doc) e massa de homolog com a GH.

**Pronto quando:** smoke test registrado (pelo menos um endpoint de leitura respondendo com payload real de homologação); os dois tokens guardados como Credential no n8n (`GH Token (Homolog)` / `GH Token (Prod)`, header `Token`) e o rate limit documentado em `ana/api-mv/perguntas-global-health.md`. (O `.env` local é ponte até as Credentials existirem no n8n.)

### D2 · Subfluxos MVP

**Escopo:** T6 `Listar_agendamentos` → T1 `Identificar_paciente` → T2 `Buscar_disponibilidade` → T5 `Efetivar_agendamento` → T7 `Remarcar_ou_cancelar`, conforme specs nó a nó de `docs/02-arquitetura-agendamento.md` §4 (T3/T4 ficam para uma etapa posterior da integração). Inclui: estado em `custom_attributes.agendamento_estado` (ler/gravar/limpar), TTL de 24h, mapa número→ID, prefixos-sinal, confirmação em 3 camadas nos subfluxos de escrita, `onError: continueRegularOutput` em todo nó HTTP, e limpeza do estado no `/reset`.

**Passos:** construir cada subfluxo → testar isolado com `Execute Workflow` + pinData contra homologação → plugar os 5 nós `toolWorkflow` no agente → subir SOP v2 → testar ponta a ponta.

**Pronto quando:** os 5 subfluxos passam nos testes isolados E o fluxo ponta a ponta agenda, lista, remarca e cancela em homologação.

**Pré-verificação:** confirmar que a credencial Chatwoot em uso escreve `custom_attributes` (doc 05, pré-requisito 0).

### D3 · Classificador de urgência

**Contexto:** segunda camada da defesa (a primeira é a Regra 1 do hotfix). Spec vem do ultracode (`docs/06-spec-classificador-urgencia.md`).

**Forma esperada:** nó de classificação binária antes do `Agente IA Hospital` (modelo pequeno/rápido); se urgência, resposta padrão de PS/SAMU sai na hora, sem passar pelo agente; registrar o caso (tag) para auditoria.

**Pronto quando:** conjunto de teste (frases de urgência reais e ambíguas, incluindo gírias e erros de digitação) roda com zero falso-negativo, e a latência adicionada por mensagem é aceitável (medir).

### D4 · Kanban e tags

**Passos:** criar a etapa `FALHA AGENDAMENTO — FILA` no board; criar tags `agendado-bot`, `remarcacao`, `cancelamento`; atualizar a descrição da tool `Atualizar_lead` (ela injeta a lista de etapas do board por expressão: conferir que a nova etapa aparece).

**Escopo congelado (grilling de 06/jul):** aditivo mínimo, só o que os subfluxos do v2 exigem para funcionar; nenhum rename, nenhuma reforma de estrutura ou de estados, tudo validado com o Pedro na aplicação. A reforma completa do Chatwoot (documento-mestre §4) mora em G6, pós-fase de testes.

### D5 · Homologação

**Checklist (docs/05 §4):** caso feliz das 6 jornadas; os 7 fallbacks (`BLOQUEADO:`, `BLOQUEIO_EXAME:`, `SEM_HORARIOS`, `NAO_AGENDADO:`, `ERRO_API`, `ERRO_ANEXO`, `NUMERO_INVALIDO`); guardrails (efetivar sem confirmado=true barrado pelo nó-gate; CPF ≠ 11 dígitos não avança; estado limpo após efetivar; `/reset` limpa estado; LLM não emite ID que não veio de tool).

**Pronto quando:** checklist 100% verde, com evidências anotadas.

### D6 · Canário

**Passos:** habilitar para um subconjunto (uma inbox ou horário restrito); acompanhar diariamente: taxa `agendado-bot` vs `FALHA AGENDAMENTO — FILA`, reclamações, conversas travadas.

**Pronto quando:** período definido (sugestão: 1 semana) sem incidente grave e taxa de falha aceitável.

### D7 · Produção

**Passos:** trocar `GH_BASE_URL` para produção + credencial prod → smoke test → comunicar equipe humana (o fallback continua sendo deles) → monitorar primeira semana.

**Pronto quando:** primeiro agendamento real confirmado dentro do MV pelo hospital.

### D8 · Termo de Entregável

**Passos:** emitir o Termo (1 a 2 páginas: o que foi entregue, valor que destrava) usando a esteira de `contrato/` → assinatura → mensalidade passa de R$ 6.000 para R$ 8.000.

**Antes de assinar:** fechar F3 (dimensionar manutenção recorrente).

---

## Trilha E · Pós-atendimento

| ID | St | Tarefa | Dono | Depende de |
|---|---|---|---|---|
| E1 | `[ ]` | Fonte MV: atendidos com serviço, data, setor/profissional e DESFECHO | E | C4 |
| E2 | `[ ]` | Base legal LGPD do contato proativo (ADIADA 06/jul: retomar antes de E4) | P→E | nada |
| E3 | `[ ]` | Template utility de abertura + teste de classificação | C+P | B2 |
| E4 | `[ ]` | POC eletivo (250 a 1.000/dia, opt-out, métricas) | P+C | E1, E2, E3 |
| E5 | `[ ]` | Camada analítica (banco, classificação auditada, agregação) | C | E4 |
| E6 | `[ ]` | Categorias com coordenadores + dono + ritual semanal | P+E | E5 |
| E7 | `[ ]` | GMB: rascunhos de resposta a avaliações (IA + aprovação humana) | C+P | E4 (backlog) |

### E1 · Fonte de dados com desfecho

**Contexto:** decisão fechada do briefing (II.3): a fonte vem do MV, nunca de lista solta de telefones. A query candidata nasce em C4; aqui ela vira rotina (export diário/semanal ou leitura direta) com o TI do hospital.

**Pronto quando:** extração de um dia real validada: só eletivo, só desfecho benigno, com os campos para personalizar o template.

### E2 · Base legal LGPD

**Adiada em 06/jul por decisão do Pedro:** a direção não prioriza LGPD nesta fase de desenvolvimento/testes. A tarefa NÃO está cancelada: ela é pré-condição dura do disparo em massa (E4) e o lead time do jurídico é longo; reabrir assim que a Fase 3 entrar no horizonte (o mais tardar junto com E3).

**Pergunta ao jurídico:** o termo de atendimento assinado autoriza contato proativo por WhatsApp para pesquisa de satisfação? Se não: qual o caminho (ajuste do termo para novos pacientes? legítimo interesse documentado? opt-in na alta?).

**Insumo da pesquisa (03/jul):** o guia da ANPD veda legítimo interesse para dado sensível, e o disparo revela vínculo com serviço de saúde: o caminho seguro é consentimento específico no termo, nomeando hospital + canal WhatsApp + finalidade. Isso resolve simultaneamente o opt-in exigido pela Meta (papel assinado é canal aceito). Levar junto: a decisão documentada sobre coleta de CPF em texto livre (conflita com a policy da Meta) e a pauta CFM 2.454/2026 (avaliação de risco + Comissão de IA até ~ago/2026). Perguntas prontas na seção f.4 do draft de compliance, resumidas no `roadmap/relatorio-pesquisa.md`.

**Pronto quando:** base legal documentada por escrito (guardar em `pos-atendimento/`).

### E3 · Template de abertura

**Contexto:** a diferença entre utility (US$ 0,0068 a 0,008) e marketing (US$ 0,0625) é ~9x no custo de 25 a 35 mil disparos/mês. A Meta reclassifica unilateralmente e em silêncio desde abr/2025; o texto precisa nascer transacional puro. Os 5 drafts prontos estão em `pos-atendimento/templates-meta.md`, com o processo de validação e o webhook `template_category_update` a assinar. Atenção ao bloqueante novo: opt-in válido exige o termo de balcão reescrito (nomear hospital + WhatsApp + finalidade), ver E2.

**Passos:** escolher draft → registrar template na Meta (via BSP) → disparar amostra pequena (dezenas) → verificar na fatura/painel como foi classificado e cobrado → medir taxa de resposta da amostra.

**Pronto quando:** template aprovado pela Meta E cobrado como utility na prática E taxa de resposta da amostra documentada.

### E4 · POC eletivo

**Escopo:** exame/cirurgia eletiva (~500/mês) + ambulatório (10 a 15 mil/mês), começando em 250 a 1.000/dia; opt-out em toda mensagem; ramificação por sentimento (nota alta → convite Google legítimo; neutra/negativa → captura de detalhe + fechamento de loop, casos graves roteados para ouvidoria).

**Métricas do POC:** taxa de resposta, taxa de conclusão da pesquisa, distribuição de NPS, custo real por resposta, opt-outs, reclamações sobre o próprio disparo.

**Pronto quando:** relatório do POC com as métricas e decisão de escala (ou ajuste).

### E5 · Camada analítica

**Conforme spec do ultracode** (`pos-atendimento/arquitetura-analitica.md`): armazenar cada resposta classificada (sentimento, setor, profissional, tema, data, serviço); classificação por IA com auditoria amostral (cuidado redobrado em atribuição nominal a profissional); agregação semanal/mensal com evolução no tempo.

### E6 · Categorias e ritual

**Contexto:** relatório sem dono vira PDF morto (briefing II.6). Categorias co-desenhadas com quem age; metodologia congelada para permitir análise evolutiva; ritual semanal (Gisele + coordenadores) com regra "categoria acima do limiar vira ação com responsável".

### E7 · Avaliações do Google Meu Negócio (backlog)

**Contexto:** Frente 4 estendida por decisão da direção (jul/2026, documento-mestre §7): rascunhos de resposta a avaliações do Google Meu Negócio gerados por IA, publicação só com aprovação humana obrigatória; para avaliações negativas valem os guardrails jurídicos da ouvidoria (não admitir culpa, não expor dado de paciente). Nada se constrói agora: registrada para não evaporar.

**Pré-requisitos quando ativar:** acesso ao perfil GMB do hospital; quem aprova (Gisele?); fluxo de publicação manual no início.

---

## Trilha G · Ana no canal principal (pós-D7)

> Nascida do grilling do documento-mestre (06/jul): a Ana opera num canal de TESTE (Chatwoot + Telegram); o WhatsApp oficial do hospital (~20 mil msgs/mês, fila de não respondidas crescendo +817/mês) vive no Kommo, só com humanos. Esta trilha realiza os Passos 1 e 2 do roadmap do diretor (documento-mestre §10) e é onde o valor do programa acontece. Sequência decidida: começa depois de D7 (integração MV provada no canal de teste). "Atacar a fila" = estancar o fluxo novo (toda mensagem nova passa a ter resposta); varredura retroativa das ~3.295 antigas seria tarefa nova, dependente de E2/E3 (base legal + template).

| ID | St | Tarefa | Dono | Depende de |
|---|---|---|---|---|
| G1 | `[ ]` | Descobrir como o número/WABA está conectado ao Kommo hoje | P→E | nada (lead time longo; perguntar cedo, num papo natural) |
| G2 | `[ ]` | Migrar o número para a API oficial plugada no Chatwoot | E+P | D7, G1 |
| G3 | `[ ]` | Treinar os atendentes no Chatwoot (eles são o transbordo) | E | G2 |
| G4 | `[ ]` | Sombra com casos reais (Ana em nota privada; atendente revisa e envia) | P+C | G3 |
| G5 | `[ ]` | Ativação autônoma + canário real; estancar a fila | P+C | G4 |
| G6 | `[ ]` | Reforma do Chatwoot + camada de KPIs (documento-mestre §4 e §5) | P+C+E | G5 |

### G1 · Descoberta da conexão do número

**Contexto:** ninguém do projeto sabe hoje se o número no Kommo usa WABA oficial (e via qual BSP) ou conexão não oficial; a resposta define caminho e prazo da migração (porte entre BSPs vs cadastro novo na Cloud API). Custo zero: perguntar ao hospital num papo natural. É também pré-requisito de E3 (o template da Meta se registra na WABA).

**Pronto quando:** documentado (tipo de conexão, BSP, dono da conta Meta Business, caminho de migração recomendado) em `pos-atendimento/` ou `ana/`.

### G2 a G5 · Migração, treinamento, sombra e ativação

**G2:** migrar o número para a API oficial plugada no Chatwoot; o histórico fica no Kommo (leitura); janela de cutover combinada com o hospital. **G3:** atendentes treinados no Chatwoot antes do cutover. **G4:** janela curta de sombra (dias): Ana rascunha em nota privada, atendente revisa e envia; calibra o tom com a população real de Bangu. **G5:** Ana autônoma na entrada, com transbordo; canário real por horário ou amostragem via n8n (um número = uma inbox); sucesso = fila de não respondidas para de crescer e a derivada vira negativa.

### G6 · Reforma do Chatwoot + KPIs (a espec adiada)

**Contexto:** o congelamento de 06/jul adiou a estrutura da seção 4 do documento-mestre (funil de 7 etapas, famílias de tags prefixadas, estados `pending`/`open`/`resolved`, SLA, atribuição automática no handoff) e os KPIs da seção 5 (Blocos A a D; regra de ouro: medir quem não foi atendido e separar mérito da Ana do humano). Discutir, configurar e homologar aqui, com o time já operando. Inclui: co-desenhar a família `tema:` com os coordenadores (casa com E6) e o watchdog de `PERDIDO` sem motivo. Avaliar na hora se parte da reforma antecede G3, para o time treinar já no board final.

---

## Trilha F — Contínuo

| ID | St | Tarefa | Dono | Quando |
|---|---|---|---|---|
| F1 | `[ ]` | Pauta com o Felipe: Regra 6 + veredito web-chat + proposta da Meta da Ana | P | após A2 e B2 |
| F2 | `[~]` | Manter exports, TODO, roadmap e memória sincronizados | C | sempre (via /check) |
| F3 | `[ ]` | Dimensionar manutenção recorrente no contrato (III.2.8) | P | antes de D8 |

### F1 · Comunicação com o Felipe

Três assuntos prontos para pauta: (1) Regra 6: recomendação dele acatada e implementada, com o racional (política Meta 2026 + contradição interna do prompt antigo); (2) ideia do web-chat: levar o veredito da pesquisa com números, incluindo a correção da premissa (reativo já é grátis) e o atalho do widget Chatwoot; (3) Meta da Ana: propor ancorar o KPI de desempenho (hoje indefinido no contrato) no limiar que o documento-mestre dele já sugere (§10, Passo 5: escala com resolução autônoma ≥70% nos fluxos de rotina), fechando a redação junto com o Termo do D8.

### F3 · Manutenção recorrente

**Contexto:** briefing III.2.8: a economia de folha não é total; quando a GH muda a API, entra convênio novo, ou a Meta muda regra, há carga de engenharia. Estimar horas/mês típicas e refletir no contrato (a mensalidade da Ana já cobre? precisa de cláusula?). Fechar antes de assinar o Termo (D8) para não pactuar manutenção de graça.

**Nota do grilling (06/jul):** alinhar também o gatilho do D8: pela letra atual, "em produção" se cumpre com o MV operante no canal de teste; a percepção de valor do Felipe mora no canal principal (Trilha G). Pactuar explicitamente qual marco destrava os +R$ 2.000 antes de emitir o Termo.

---

## Concluído (log)

- `[x]` 03/jul: Repo git + reorganização por domínio + README (Fase 0)
- `[x]` 03/jul: Glossário do domínio no CONTEXT.md
- `[x]` 03/jul: Meta-prompt do ultracode (`roadmap/prompt-sessao-ultracode.md`) + disparo da sessão
- `[x]` 03/jul: Roadmap visual (`roadmap/index.html`)
- `[x]` 03/jul: Dicionário de tabelas MV destilado da planilha do TI (`ana/api-mv/dicionario-tabelas-mv.md`)
- `[x]` 03/jul: Decisões do grilling registradas (hotfix primeiro, urgência 2 camadas, Regra 6, ultracode = pesquisa+SOP+specs)
- `[x]` 03/jul: Skill local `/check` criada (`.claude/skills/check/`)
- `[x]` 03/jul: Sessão ultracode concluída: 8 artefatos commitados (69 agentes, verificação adversarial); síntese e 8 decisões recomendadas em `roadmap/relatorio-pesquisa.md`; roadmap visual e queries da Trilha C (MOT_ALT) atualizados
- `[x]` 04/jul: `roadmap/pesquisa-ultracode.html` removido a pedido do Pedro (conteúdo preservado no histórico git e em `relatorio-pesquisa.md`; nenhum arquivo o referenciava)
- `[x]` 04/jul: Verificado que a produção do n8n não contém o hotfix (updatedAt 28/mai em todos os workflows; export do repo sem bloco de urgência) e que não há drift produção vs `ana/workflows/`
- `[x]` 06/jul: C1 fechada: conexão DBeaver confirmada como Oracle; owner/schema vira a query 1.1 do Pacote 1 (C2)
- `[x]` 06/jul: Token de homologação da Global Health recebido; salvo em `.env` local (fora do git), `.gitignore` atualizado (`.env`, `tokens/`)
- `[x]` 06/jul: A1 concluída: `Ana_System_Prompt.md` v1.1 redigido (Regra 1 + Seção 0 de urgência com SAMU/CVV, Regra 6 assistente virtual + saudação CFM 2.454, Regra 12 + Seção 7 com guardrails jurídicos, 8.4 rastreável, tag fora-horario, acentuação 3.2/7.3, linha CRÍTICA na tabela de prioridades)
- `[x]` 06/jul: A2 concluída às 17h56: hotfix aplicado em produção via REST (API key do Pedro, `PUT /api/v1/workflows/mwboSUbv8n4TBwPf`); prompt do nó verificado idêntico ao do repo e `versionId == activeVersionId` (versão ativa é a nova). API key salva no `.env`. Pendente: re-export para `ana/workflows/` após A5 (o export antigo agora diverge da produção, esperado)
- `[x]` 06/jul: Grilling do documento-mestre do diretor: topologia dos canais revelada (Ana no Telegram de teste; WhatsApp real no Kommo), congelamento do Chatwoot na fase de testes, Trilha G criada (canal principal, pós-D7), smoke test GH virou sub-passo de D1, E7 (avaliações GMB) registrada, ganchos contratuais em F1/F3, headers de trilha sem "Fase N"; CONTEXT.md atualizado com os termos novos
- `[x]` 07/jul: C2 fechada: Pacotes 1-3 rodados no DBeaver, CSVs renomeados e organizados (estrutura em `resultados/`, amostras fora do git). C3 entregue: `ana/api-mv/dicionario-colunas.md` (dicionário das 13 tabelas, diagrama do fluxo, classificação proposta dos motivos de alta, 6 perguntas C6). Achados: owner `DBAMV`; banco conectado aparenta ser HOMOLOG (ATENDIME=29, PACIENTE=2.499); `ATENDIME_GLOBAL_HEALTH` vazia; CPF NUMBER na interface GH; motivos 63/64 = luto que `TP_MOT_ALTA` não captura; no-show em `TP_PRESENCA_FALTA`; contato real = DDD separado + celular 9-10 dígitos
- `[x]` 07/jul: Smoke test GH homolog executado da sessão (D1 parcial): token válido (~500-800ms/chamada); `POST /pessoas` grava e relê (paciente-sonda id 1681, CPF `66301102770`; lookup por telefone OK); catálogos de consultas/exames VAZIOS (massa não publicada); `tipoAgendamento` exige caixa alta (minúsculo = 500); registro + queries de verificação em `ana/api-mv/smoke-test-gh.md`; perguntas GH-18..21 registradas; conexão direta ao Oracle documentada (`conexao-oracle.md` + `scripts/query-mv.py`, aguardando credenciais no `.env`)
