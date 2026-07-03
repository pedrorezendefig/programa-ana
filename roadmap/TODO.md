# TODO — Programa Ana: guia de execução até o final

> Fonte de verdade operacional do projeto. O `roadmap/index.html` conta a história para gestão; este arquivo guia o trabalho. Cada tarefa tem ID estável, dono e dependências. A seção "Fronteira de agora" diz o que está desbloqueado neste momento; ela é reescrita a cada avanço.

**Status:** `[ ]` a fazer · `[~]` em curso · `[x]` feito · `[!]` bloqueada
**Donos:** **(P)** Pedro · **(C)** Claude (sessões) · **(E)** Externo (hospital, Global Health, jurídico)

---

## Fronteira de agora (03/jul/2026 · tudo abaixo pode andar em paralelo)

| # | Tarefa | Dono | Por que agora |
|---|---|---|---|
| A1 | Redigir o hotfix do prompt | C | Única tarefa técnica 100% desbloqueada; risco vivo em produção |
| C1 | Pedir credencial Oracle read-only ao analista | P | Destrava toda a Trilha C; mensagem pronta no chat da sessão |
| D1 | Pedir token GH (homolog + prod) + rate limit | P→E | CAMINHO CRÍTICO: lead time externo domina a Fase 1 |
| E2 | Abrir a pergunta LGPD com o jurídico do hospital | P→E | Lead time externo; trava o POC do pós-atendimento |
| B1 | Sessão ultracode rodando | E | Só aguardar e revisar quando terminar |
| C5 | (Opcional) Varredura do Power BI/SCMA via Chrome | C+P | A qualquer momento, com o navegador aberto |

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
        C5["C5 (C+P) Power BI SCMA (opcional)"]
    end

    subgraph TD1["Trilha D · Fase 1: integração MV"]
        D1["D1 (E) Token GH + rate limit · CRÍTICO"] --> D2["D2 (C) Construir subfluxos MVP"]
        B2 --> D2
        B2 --> D3["D3 (C) Classificador de urgência"]
        D4["D4 (P) Etapa + tags novas no Kanban"] --> D5
        D2 --> D5["D5 (P+C) Homologação com checklist"]
        D3 --> D5
        D5 --> D6["D6 (P+C) Canário por inbox"] --> D7["D7 (P) Produção"] --> D8["D8 (P) Termo de Entregável +R$ 2k"]
    end
    C3 -.valida desenho.-> D2

    subgraph TE["Trilha E · Fase 3: pós-atendimento"]
        C4 --> E1["E1 (E) Fonte MV com desfecho"]
        E2["E2 (E) Base legal LGPD"] --> E4
        B2 --> E3["E3 (C+P) Template utility + teste de classificação"]
        E1 --> E4["E4 (P+C) POC eletivo 250 a 1000/dia"]
        E3 --> E4
        E4 --> E5["E5 (C) Camada analítica"] --> E6["E6 (P+E) Relatórios, dono e ritual semanal"]
    end
    D7 -.mesmo número WhatsApp: rodar após estabilizar.-> E4
```

Leituras da árvore:
- **Caminho crítico até a receita (+R$ 2k):** D1 → D2 → D5 → D6 → D7 → D8. Tudo começa no token GH; por isso D1 se pede HOJE, mesmo com a construção ainda longe.
- **Trilhas A, B e C são independentes entre si**: hotfix, pesquisa e banco andam em paralelo total.
- **C alimenta E**: sem mapear o desfecho no banco (C4), a Fase 3 não tem filtro seguro (E1).
- **B2 é o pivô**: a revisão dos artefatos do ultracode destrava a construção (D2, D3) e o template (E3).

---

## Trilha A — Hotfix do prompt (agora)

| ID | St | Tarefa | Dono | Depende de |
|---|---|---|---|---|
| A1 | `[ ]` | Redigir `Ana_System_Prompt.md` v1.1: urgência como Regra Global 1, Regra 6 (assistente virtual), exclusão ouvidoria↔comercial, guardrails jurídicos, acentuação, tag `fora-horario`, etapa órfã, Seção 8.4 | C | nada |
| A2 | `[ ]` | Aplicar no nó `Agente IA Hospital` (colar manualmente ou via API key do n8n) | P | A1 |
| A3 | `[ ]` | Validação em sombra por período curto (tom da urgência e do comercial) | P+C | A2 |
| A4 | `[ ]` | Re-exportar workflows para `ana/workflows/` e commitar | C | A3, A5 |
| A5 | `[ ]` | Migrar token Chatwoot para Credential do n8n + rotacionar | P | nada |

## Trilha B — Pesquisa ultracode

| ID | St | Tarefa | Dono | Depende de |
|---|---|---|---|---|
| B1 | `[~]` | Sessão ultracode em execução (disparada em 03/jul) | E | nada |
| B2 | `[ ]` | Revisar os 8 artefatos, decidir o que entra, commitar | P+C | B1 |
| B3 | `[ ]` | Consolidar SOP v2 (hotfix + agendamento + achados da pesquisa) | C | A1, B2 |

## Trilha C — Banco MV (curva de aprendizado)

| ID | St | Tarefa | Dono | Depende de |
|---|---|---|---|---|
| C1 | `[ ]` | Credencial Oracle read-only + host/porta/service name + schema (MVBIKE? MVINTEGRA?) | P→E | nada |
| C2 | `[ ]` | Explorar estrutura: conexão direta (VPN + python-oracledb) ou Pacotes 1 e 2 de `ana/api-mv/queries-exploracao.md` | C | C1 |
| C3 | `[ ]` | Gerar `ana/api-mv/dicionario-colunas.md` + diagrama do fluxo de agendamento no banco | C | C2 |
| C4 | `[ ]` | Mapear onde vive o desfecho (`ATENDIME`, `MOTIVO_ALTA`, óbito) e como filtrar | C | C3 |
| C5 | `[ ]` | (Opcional) Varredura do Power BI módulo SCMA via Chrome: KPIs que a gestão já vê | C+P | navegador aberto |
| C6 | `[ ]` | Validar leitura do encadeamento com o analista de TI | P | C3 |

## Trilha D — Fase 1: integração MV

| ID | St | Tarefa | Dono | Depende de |
|---|---|---|---|---|
| D1 | `[ ]` | Token GH homolog + prod e limites de chamadas (pedir HOJE; caminho crítico) | P→E | nada |
| D2 | `[ ]` | Construir subfluxos MVP na ordem T6 → T1 → T2 → T5 → T7 (+ estado em `custom_attributes` + `/reset`) | C | D1, B2 |
| D3 | `[ ]` | Classificador de urgência antes do agente (spec vem do ultracode) | C | B2 |
| D4 | `[ ]` | Criar etapa `FALHA AGENDAMENTO — FILA` + tags `agendado-bot`, `remarcacao`, `cancelamento` no Kanban | P | nada |
| D5 | `[ ]` | Homologação: caso feliz, 7 fallbacks, guardrails de escrita (checklist do docs/05) | P+C | D2, D3, D4 |
| D6 | `[ ]` | Canário por inbox, acompanhando `agendado-bot` vs `FALHA AGENDAMENTO — FILA` | P+C | D5 |
| D7 | `[ ]` | Produção (portal e filas seguem como fallback) | P | D6 |
| D8 | `[ ]` | Termo de Entregável da Ana (+R$ 2.000/mês) | P | D7 |

## Trilha E — Fase 3: pós-atendimento

| ID | St | Tarefa | Dono | Depende de |
|---|---|---|---|---|
| E1 | `[ ]` | Fonte MV: atendidos com serviço, data, setor/profissional e DESFECHO | E | C4 |
| E2 | `[ ]` | Base legal LGPD do contato proativo (termo de atendimento) | P→E | nada |
| E3 | `[ ]` | Template utility de abertura + teste de classificação com amostra pequena | C+P | B2 |
| E4 | `[ ]` | POC só eletivo, 250 a 1.000/dia, opt-out, medindo resposta/custo/NPS | P+C | E1, E2, E3 (recomendado: após D7) |
| E5 | `[ ]` | Camada analítica: banco, classificação com auditoria amostral, agregação | C | E4 |
| E6 | `[ ]` | Categorias co-desenhadas com coordenadores + dono + ritual semanal | P+E | E5 |

## Trilha F — Contínuo

| ID | St | Tarefa | Dono | Quando |
|---|---|---|---|---|
| F1 | `[ ]` | Comunicar ao Felipe: Regra 6 implementada como recomendação + resposta sobre a ideia do web-chat (pós-pesquisa) | P | após A2 e B2 |
| F2 | `[~]` | Manter exports, TODO, roadmap e memória sincronizados a cada avanço | C | sempre |
| F3 | `[ ]` | Dimensionar manutenção recorrente no contrato (questão III.2.8 do briefing) | P | antes de D8 |

---

## Concluído (log)

- `[x]` 03/jul: Repo git + reorganização por domínio + README (Fase 0)
- `[x]` 03/jul: Glossário do domínio no CONTEXT.md
- `[x]` 03/jul: Meta-prompt do ultracode (`roadmap/prompt-sessao-ultracode.md`) + disparo da sessão
- `[x]` 03/jul: Roadmap visual (`roadmap/index.html`)
- `[x]` 03/jul: Dicionário de tabelas MV destilado da planilha do TI (`ana/api-mv/dicionario-tabelas-mv.md`)
- `[x]` 03/jul: Decisões do grilling registradas (hotfix primeiro, urgência 2 camadas, Regra 6, ultracode = pesquisa+SOP+specs)
