---
status: accepted
date: 2026-07-03
---

# Base de conhecimento da Ana: Sheets como UI de edição, Postgres como runtime

A base de conhecimento da Ana (valores particulares, diferenciais, convênios, estimativas de cirurgia; hoje 4 tools `googleSheetsTool` lendo a planilha `Base_Ana_HospitalSaoMatheus_CONSOLIDADA`) **permanece editável como planilha, mas sai da rota crítica de runtime na fase MV**. O padrão adotado: um workflow agendado no n8n sincroniza as 4 abas para 4 tabelas no Postgres que já existe no stack (Coolify), e as 4 tools viram `postgresTool` com busca filtrada (`unaccent` + `ILIKE` via `$fromAI`, com fallback para dump completo quando o filtro não casar). Na fase Central de Comando, o CRUD da Central substitui o Sheets como superfície de edição, apontando para as mesmas tabelas, e o sync é desligado. Plano B permanente se a Central atrasar: NocoDB self-hosted projetando UI de planilha sobre o mesmo Postgres.

## Contexto

- Requisito duro do cliente: alguém do hospital, não técnico, edita valores/diferenciais/convênios como se fosse planilha.
- As 4 tools estão em typeVersion 4.7 e retornam TODAS as linhas que casam com o filtro (confirmado no código-fonte do node: a doc diz "first match", mas isso vale só para versões < 4.5). Get_Cirurgias e Get_Convenios não têm filtro nenhum e retornam a aba crua. O padrão dump-tudo se confirma para as 4 tools.
- Quota do Google Sheets API (fonte oficial, página de 29/mai/2026): 300 leituras/min por projeto, 60/min por usuário. Como o n8n usa uma única credencial Google, o teto efetivo da Ana é 60/min (elevável sob pedido). No volume estimado (volume real a medir; faixa de trabalho 2 a 35 mil conversas/mês com 1 a 2 tool calls cada), a média fica em ~1 a 4 leituras/min com picos de 15 a 20/min: **quota não é o risco dominante hoje**.
- Os riscos reais do Sheets na rota crítica: latência por chamada (0,5 a 3s em relatos de comunidade, contra <10ms num SELECT local; sem benchmark oficial), timeouts/429 esporádicos virando resposta degradada, e a cobrança de excedente de quota que o Google anunciou para "later in 2026" (sem tabela de preço publicada até 03/jul/2026).
- Custo de tokens do dump-tudo: o input do gpt-5.2 custa US$ 1,75/M tokens (confirmado no OpenRouter e no preço padrão da OpenAI; US$ 0,875 é o preço da Batch API, inaplicável a chat em tempo real). Com abas de ~100 linhas (~6k tokens/dump) e 70 mil chamadas/mês, o dump-tudo custaria ~US$ 735 a 1.470/mês só de input. Medir o tamanho real das abas é a medição número 1.
- O Postgres já é órgão vital do stack (memória, fila, lock, log de tool calls: 15+ nós no `Ana.json`). Migrar o runtime para ele não adiciona peça nova de infraestrutura, e o node Postgres do n8n funciona como AI tool (Select/Execute Query com `$fromAI`), confirmado na doc oficial.

## Opções consideradas

| Opção | Edição p/ leigo | Runtime | Custo | Veredito |
|---|---|---|---|---|
| Sheets puro (atual) | Ótima | 0,5-3s, Google na rota crítica, excedente cobrado em 2026 | zero hoje | OK agora; ruim no crescimento |
| **Sheets → sync → Postgres** | Ótima (continua na planilha) | <10ms, local | zero | **Escolhida (fase MV)** |
| **Postgres + Central de Comando** | Boa (CRUD sob medida, com auditoria) | <10ms | dentro do Entregável do Site | **Alvo final (fase Central)** |
| NocoDB sobre o Postgres | Muito boa (planilha real; Postgres/MySQL no core OSS; SQL Server e Oracle são Enterprise) | <10ms | zero licença, 1 container | Plano B se a Central atrasar |
| Supabase | Boa (Table Editor, mas UI de admin de banco) | baixa | Free pausa após 1 semana de inatividade; Pro US$ 25/mês | Descartada: segundo Postgres redundante |
| Baserow | Muito boa | baixa | zero licença, ~2GB RAM | Descartada: não projeta UI sobre Postgres existente (desde a 1.29 há data sync com PostgreSQL, mas é cópia, não projeção; viraria segunda fonte de verdade) |
| Airtable | Excelente | média (SaaS) | US$ 20/usuário/mês | Descartada: custo + preços hospitalares fora do stack |
| n8n Data Tables | Péssima (editor do n8n) | baixa | zero | Descartada como UI |
| RAG vetorial/embeddings | n/a | n/a | n/a | Descartado: fuzzy matching onde se exige exatidão de preço; o "RAG" correto para tabela é SQL filtrado |

## Plano em fases

- **Fase 0 (agora, junto do hotfix):** não migrar nada. Ativar Retry on Fail nos 4 nós; adicionar filtro `Ativo = S` em Get_Cirurgias/Get_Convenios se as abas tiverem a coluna; medir tamanho das abas (linhas/tokens por dump), duração dos nós de Sheets nos logs e tool calls por conversa.
- **Fase MV (1 a 2 dias, junto da integração de agendamento):** 4 tabelas no Postgres + workflow de sync agendado (TTL 10 min, upsert; botão "sincronizar agora" opcional via n8n Form) + trocar as tools para `postgresTool` com `unaccent + ILIKE` e regra de fallback no prompt (resultado vazio → repetir sem filtro antes de negar disponibilidade). O hospital continua editando a mesma planilha.
- **Fase Central:** CRUD das 4 tabelas na Central de Comando (frente Lucas/Rib); desligar o sync; Sheets vira backup. A Ana não muda nada (já lê do Postgres). Pré-requisito técnico: a fase MV concluída, senão a Central teria que escrever no Sheets via API do Google (pior dos mundos).

## Consequências

- O requisito de edição leiga é preservado em todas as fases (planilha → planilha → CRUD da Central), com zero treinamento na transição da fase MV.
- O runtime da Ana nunca fica acoplado ao cronograma da frente do site: se a Central atrasar, o sync continua; se atrasar demais, NocoDB entra como ponte.
- Trade-offs assumidos: staleness de até 10 min entre edição e Ana (aceitável para preços; o botão de sync cobre correção urgente); risco de falso negativo do filtro que não casa (mitigado por normalização + fallback dump + monitoramento dos logs de tool call).
- Gatilhos que antecipam a fase MV da base mesmo sem a integração de agendamento: alguma aba passar de ~200-300 linhas (~10k tokens/dump); custo mensal de input atribuível aos dumps passar de ~US$ 100-200; caso observado de preço/convênio trocado entre linhas.

## Fontes principais (acesso 03/jul/2026)

developers.google.com/workspace/sheets/api/limits (quotas; cobrança de excedente "later in 2026"; página de 29/mai/2026) · docs.n8n.io (node Postgres como AI tool; `$fromAI`; Data Tables) · github.com/n8n-io/n8n `readOperation.ts` (default de filtro v4.5+) · nocodb.com/docs (external data source: Postgres/MySQL no OSS) · baserow.io (data sync PostgreSQL desde 1.29) · supabase.com/pricing (Free pausa em 1 semana) · airtable.com/pricing (Team US$ 20/usuário/mês) · openrouter.ai/openai/gpt-5.2 + pricing OpenAI (US$ 1,75/M input, 400k contexto).
