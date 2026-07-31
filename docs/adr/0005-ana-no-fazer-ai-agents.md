---
status: accepted
date: 2026-07-30
---

# Ana roda no fazer.ai agents; n8n aposentado; roadmap reconstituído ao estágio de viabilidade

A Ana deixa de ser um conjunto de workflows n8n e passa a viver na plataforma **fazer.ai agents** (tenant `vitta-tech`, agente id 1), que concentra prompt, ferramentas nativas (kanban, tags, handoff, notas), base de conhecimento e o vínculo com as inboxes do Chatwoot. Os workflows "Ana" e "Desliga Ana" do n8n foram desativados em 30/jul/2026 (os subworkflows ficam inertes sem o fluxo principal); o export completo permanece em `ana/workflows/` como acervo e rota de retorno de emergência.

Junto com a troca de plataforma, o roadmap foi **reconstituído ao estágio inicial**: o anterior (trilhas A a G, grafo de dependências, trilho da receita) foi arquivado intacto em `roadmap/arquivo/`, e o novo mostra só o estágio de **testes de viabilidade sem Global Health** (série V) mais o bloco Pendente (GH1: sessão de desenho de valor das APIs GH; OV1: protocolo da ouvidoria).

## Contexto

- O onboarding do fazer.ai agents foi concluído em 29/jul/2026 com E2E aprovado: o SOP do n8n foi traduzido para a plataforma, e o bot do Telegram (SaoMatheusBot) ficou vinculado ao agente novo via Chatwoot.
- Com n8n e fazer.ai agents ligados ao mesmo bot, qualquer teste ficava ambíguo (quem respondeu?) e havia risco de resposta dupla.
- O roadmap antigo cresceu em torno da integração MV/Global Health, que está parada em dependências externas; o Pedro pediu um recomeço enxuto ("estágio muito inicial, com o que a gente já tem"), com a GH como pendente explícito.
- Decisões do grilling de 30/jul/2026 registradas no CONTEXT.md: modelo `gpt-5-mini` para os testes, planilha lida ao vivo via tools HTTP em abas publicadas (nunca a `6_Ouvidoria_Log`), critério de pronto = Roteiro de cenários.

## Opções consideradas

| Opção | Veredito |
|---|---|
| Continuar no n8n e evoluir lá | Descartada: a migração para a plataforma já estava feita e aprovada; manter dois cérebros duplica manutenção |
| Rodar n8n e fazer.ai agents em paralelo (transição longa) | Descartada: mesmo bot, respostas ambíguas, testes inválidos |
| **fazer.ai agents como único cérebro, n8n desativado** | **Escolhida**: um cérebro só, observabilidade nativa (Chatwoot + Langfuse), retorno possível em minutos religando os workflows |

## Consequências

- A "visão" dos testes passa a ser: conversas no Chatwoot (`chatwoot.mala-ia.cloud`), raciocínio e custo por resposta no Langfuse (`langfuse.hospitalsaomatheus.cloud`).
- As leituras da planilha do Google (a antiga `Get_Consultas`) precisam ser recriadas como tools HTTP na plataforma (tarefas V3/V4).
- `ana/workflows/` congela como acervo do n8n: não há mais re-export a manter.
- O roadmap anterior em `roadmap/arquivo/` guarda os textos prontos da Global Health e do analista de TI; a fase GH recomeça pela tarefa pendente GH1 (sessão de desenho de valor), sem herdar a estrutura antiga.
- `CLAUDE.md` e a skill `/check` passaram a descrever a nova estrutura (bloco `DADOS` do mapa, checagem da instância fazer.ai em vez do drift do n8n).
