---
status: accepted
date: 2026-08-12
---

# gpt-5.6-luna é o modelo padrão do tenant, trocado direto e sem gate

Decisão do Pedro (12/ago/2026): a Ana (e todo agente futuro do tenant `vitta-tech`) passa a rodar **`gpt-5.6-luna`**, o tier econômico da família GPT-5.6 da OpenAI (Sol/Terra/Luna, lançada em 9/jul/2026). A troca é direta no `modelConfig` (sem fase de teste paralela), coerente com o apetite de risco do rollout do ADR-0012: o canal vivo é o Telegram de teste com gatilho `/teste`.

## Contexto (fatos verificados em fontes primárias, 12/ago/2026)

- Em 30/jul/2026 a OpenAI cortou o preço do Luna em 80%: **$0,20 input / $1,20 output por 1M tokens**, contra $0,25/$2,00 do gpt-5-mini atual (input -20%, output -40%). Contexto de 1M tokens, cutoff de conhecimento fev/2026 (o mini é mai/2024). Suporta function calling, structured outputs e prompt caching.
- O model id exato é `gpt-5.6-luna`. O alias `gpt-5.6` aponta para o Sol (tier caro); usar sempre o id completo.
- É modelo de raciocínio: tokens de raciocínio são cobrados como output, e o controle é `reasoning_effort` (none a max, default medium). A intenção do Pedro é rodar "sem reasoning" (effort none, o modo mais básico).
- A plataforma fazer.ai agents **não expõe `reasoning_effort`**: o `modelConfig` aceita só provider, model, credentialRef, baseURL e temperature (campo desconhecido é descartado na validação). O Luna vai rodar no comportamento default do chat/completions até a plataforma expor o campo.
- A plataforma já trata a família gpt-5* corretamente no ponto que derrubava o mini: descarta `temperature` para modelos de raciocínio antes de chamar a API.
- Risco documentado: há relato de a API recusar function tools com `reasoning_effort` explícito no chat/completions (a mensagem de erro manda usar a Responses API ou effort none). Com o campo ausente (caso da plataforma) o comportamento esperado é funcionar; a confirmação é empírica.

## Decisão e mitigação

1. Trocar `modelConfig.model` de `gpt-5-mini` para `gpt-5.6-luna` na Ana id 1 (mesma credencial, mesmo provider).
2. Imediatamente após a troca, rodar no playground um turno que force tool calling (busca por CPF, horários ou preços) e conferir no Langfuse a chamada e o custo.
3. Se a API recusar tools ou o custo por resposta subir de forma anômala (reasoning tokens no effort default), rollback de um comando para `gpt-5-mini`.
4. Disparar feature request à fazer.ai (canal já aberto por bug reports anteriores): expor `reasoning_effort` no `modelConfig`. Quando existir, fixar `none`.

## Resultado da execução (12/ago/2026)

O risco se materializou, literal. Com a plataforma já atualizada (1.4.1) e `modelConfig.model = gpt-5.6-luna`, o primeiro turno com tool no playground devolveu:

> `400 Function tools with reasoning_effort are not supported for gpt-5.6-luna in /v1/chat/completions. To use function tools, use /v1/responses or set reasoning_effort to 'none'.`

Rollback executado no ato para `gpt-5-mini`; smoke test pós-rollback saudável (tool call de preços + kanban + tag funcionando). O estado desta decisão passa a ser: **intenção mantida, execução bloqueada pela plataforma**. Caminhos para destravar, a decidir com o Pedro:

1. **Feature request à fazer.ai** (o caminho limpo): expor `reasoning_effort` no `modelConfig` ou migrar o cliente OpenAI para a Responses API. Sem prazo sob nosso controle.
2. **Proxy fino de modelo na VPS**: provider `openai-compatible` com `baseURL` apontando para um proxy local que injeta `reasoning_effort: "none"` e repassa para a OpenAI. Funciona hoje, mas põe a chave OpenAI trafegando por um serviço nosso e cria infraestrutura para manter.

Até um dos dois destravar, o tenant segue no `gpt-5-mini`.

### Segunda tentativa, via MCP (12/ago/2026, mais tarde)

Descoberta nova: pela rota MCP (`agent_update`), o `modelConfig` ACEITA e PERSISTE `reasoning_effort: "none"` (diferente da UI, que descarta o campo). Mas persistir não basta: o cliente OpenAI da plataforma não repassa o campo para a API, e o turno com tool no playground devolveu o mesmo 400. Ou seja, o bloqueio não é de validação de schema, é do request builder. Rollback para `gpt-5-mini` executado de novo; o campo persistido reforça o feature request (metade do caminho já existe no banco).

### Terceira tentativa: aplicado (08/set/2026)

A plataforma fazer.ai agents subiu de 1.4.1 para 1.15.0. A release 1.5.0 passou a rodar a família gpt-5.6 com `reasoning_effort: none` (fix #73) e a 1.6.0 expôs `reasoningEffort` por agente (#87). O `agent_update` via MCP aceitou `{"model":"gpt-5.6-luna","reasoningEffort":"none"}` e a fumaça com tools passou (preço e cadeia de 4 elos de horários, sem 400). A decisão deste ADR está em vigor; a bateria v3 no canal real é o critério para declarar estável.

### Comparação de modelos (13/out/2026, #20)

Três rodadas da bateria de capacidades (29 cenários, 37 turnos) por candidato, trocando só o `modelConfig` do agente 1. Tempo é o da etapa `generate` nos logs da plataforma; custo vem dos tokens somados pela plataforma por modelo, com os preços oficiais de 13/out/2026 (gpt-6-luna 0,10 / 0,01 / 0,50; gpt-5.6-luna 0,20 / 0,02 / 1,20; gpt-5-mini 0,25 / 0,025 / 2,00 por 1M de tokens, entrada / cache / saída).

| Modelo | Rodadas (de 29) | Modelo por turno | Custo por conversa |
|---|---|---|---|
| gpt-5.6-luna, none (em vigor) | 28, 28, 27 | 7,4 s | US$ 0,0023 |
| gpt-6-luna, none | 28, 29, 28 | 8,4 s | US$ 0,0014 |
| gpt-5-mini, low | fumaça passou; bateria interrompida pelo Pedro | sem medida | sem medida |

A plataforma 1.15.0 aceita `gpt-6-luna` com `reasoningEffort: none` sem ajuste (fumaça com tool sem 400). Das duas falhas do gpt-6-luna, uma foi do modelo (C29-1: `skip_reply` na despedida em vez de encerrar) e a outra foi infra (C13-1: API do Hospital 503 e GH sem resposta em 10 s). Detalhe e logs na issue #20.

**Decisão: pendente.** O agente 1 voltou para `gpt-5.6-luna` none (rollback conferido). O Pedro quer testar o gpt-5-mini low antes de decidir.

## Consequências

- "Modelo universal" vira regra do tenant: agente novo nasce com `gpt-5.6-luna` salvo decisão contrária registrada.
- A comparação de custo real (Langfuse, antes vs depois) fica como evidência da troca; se o effort default corroer a economia da tabela, a decisão volta à mesa com números.
- Referências de modelo espalhadas pelo repo (Circuito da Ana, CONTEXT.md, memória de sessão) passam a citar o gpt-5-mini como histórico, não como estado.
