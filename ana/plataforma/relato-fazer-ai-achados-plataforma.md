# Relato consolidado para a equipe da fazer.ai: achados de plataforma do Programa Ana

Conferido em 12/out/2026 (issue #12, antes V10). Instância: tenant `vitta-tech`, agente "Ana (Hospital São Matheus)", id 1.

## Versões

| Produto | Versão no ar (lida hoje) | Onde foi lida |
|---|---|---|
| fazer.ai agents | **1.15.0** | `GET /api/health` da instância |
| Chatwoot Pro | **4.17.0-fazer-ai-pro.129** | `GET /api` do Chatwoot |
| fazer.ai agents, última publicada | v1.42.0 (12/out) | releases do repo público `fazer-ai/agents` |

Os achados foram vistos entre 06 e 14/ago, com a instância na 1.4.1 ou anterior (no dia 06/ago o número não foi registrado). A instância subiu para a 1.15.0 em 08/set. A conferência de hoje foi só leitura: configuração do agente, ferramentas e grants pelo MCP, logs de execução desde 08/set e o código-fonte das tags v1.15.0 e v1.42.0 do repo público. Nenhuma ferramenta foi criada ou alterada para re-testar; onde o re-teste ao vivo exigiria escrita, isso está dito.

## Resumo

| # | Achado | Estado em 12/out | Pedido |
|---|---|---|---|
| 1 | Mensagem final descartada em turno com `resolve_conversation` | Não reproduzido desde 26/ago; a fonte tem o modo diferido; resta um caminho sem ele | Confirmar o caminho dos turnos de follow-up |
| 2 | `input_schema` em JSON Schema padrão vira campo-fantasma | Corrigido na fonte (1.4.1 em diante); sem re-teste ao vivo | Nenhum; registro |
| 3 | Body só interpola com nome de campo idêntico à chave, falha silenciosa | **Persiste para linhas antigas, inclusive na v1.42.0**; causa raiz localizada | Migrar ou avisar sobre bodies legados |
| 4 | Output de ferramenta HTTP cortado em 4.000 caracteres fixos | Fixo na 1.15.0; configurável por ferramenta desde a v1.36.0 | Nenhum; atualização é nossa |
| 5 | `reasoning_effort` no `modelConfig` | Entregue (1.5.0 e 1.6.0), em uso | Nenhum; agradecimento |
| 6 | Build novo do chatwoot-pro (hotfix V8) | Resolvido na `.112`; instância na `.129` sem hotfix | Nenhum; registro |
| 7 | Lista de inboxes dessincronizada | Corrigido com `instance_sync_inboxes` | Só registro |

---

## 1. Mensagem final descartada em turno com `resolve_conversation`

**Versão em que foi visto:** a que rodava em 06/ago (1.4.1 ou anterior).

**Passos de reprodução (06/ago):**
1. Agente com a native `resolve_conversation` nos grants, canal pela inbox de API do Chatwoot.
2. Conversa em que o paciente encerra (cenário "convênio não aceito": ele recusa o particular e se despede).
3. No mesmo turno o modelo escreve a despedida e chama `resolve_conversation`.

**Esperado:** a despedida chega ao paciente e a conversa fica resolvida em seguida.

**Observado:** a conversa foi resolvida e a despedida não foi entregue. Contornamos tirando a ferramenta dos grants.

**Estado em 12/out:**
- Em 26/ago religamos a ferramenta e a bateria pela inbox de API **não reproduziu** o defeito: a despedida chegou antes do resolve. Ela segue nos grants hoje.
- O código da v1.15.0 (`src/graph/tools/native.ts`, `TurnState.resolveRequested`) aplica o resolve em modo diferido, depois da entrega da resposta final, e o comentário descreve exatamente o nosso sintoma (o toggle imediato fazia a re-checagem pós-geração ler "resolvida" como tomada humana e descartar a resposta).
- O mesmo arquivo diz que, sem `turnState` (turnos de nudge/follow-up, playground, contexto montado à mão), o resolve continua imediato.
- Nenhum erro com "resolv" nos logs de execução desde 20/ago.
- **Sem re-teste ao vivo nesta conferência** (precisaria abrir conversa real).

**Pedido:** confirmar se um turno de follow-up que chama `resolve_conversation` ainda pode perder a mensagem final pelo caminho imediato. Se puder, estender o modo diferido a esse caminho. Se não, podem dar o achado por encerrado.

## 2. `input_schema` em JSON Schema padrão vira campo-fantasma

**Versão em que foi visto:** a que rodava em 06/ago (V12), anterior à normalização.

**Passos de reprodução (06/ago):**
1. Criar uma ferramenta HTTP GET com `input_schema` em JSON Schema padrão, por exemplo `{"type":"object","properties":{"cpf":{"type":"string"}},"required":["cpf"]}`, e query `{"cpf":"{{cpf}}"}`.
2. Chamar a ferramenta num turno em que o modelo informa o CPF.

**Esperado:** o campo `cpf` exposto ao modelo e interpolado na query.

**Observado:** o schema foi gravado cru; as chaves do próprio JSON Schema viraram campos, o `cpf` que o modelo mandou se perdeu, a query saiu vazia e a API destino recusou com 417. Passamos a usar o formato compacto nativo (`{campo: {type, required, description}}`), que é o que as 14 ferramentas usam hoje.

**Estado em 12/out:** corrigido na fonte. `src/modules/tool-definitions/normalize.ts` já existe na tag v1.4.1 e, na v1.15.0, converte JSON Schema para o mapa compacto em toda borda de escrita e de novo na montagem da ferramenta (linhas antigas se curam sozinhas). A descrição da `tool_create` servida pelo MCP da instância confirma que JSON Schema padrão é aceito e convertido. **Sem re-teste ao vivo** (exigiria criar ferramenta, o que esta conferência não faz).

**Pedido:** nenhum. Fica como registro; se quiserem, confirmem em que versão a normalização entrou.

## 3. Body de ferramenta HTTP só interpola quando o nome do campo é idêntico à chave do JSON

**Versão em que foi visto:** 1.4.1 (07/ago na V14; re-testado em 12/ago, persistia).

**Passos de reprodução:**
1. Criar uma ferramenta POST com `input_schema` `{"data_nascimento": {"type":"string","required":true}}` e body como mapa simples, sem `mode`: `{"dataNascimento": "{{data_nascimento}}"}`.
2. Chamar a ferramenta com o modelo informando a data.

**Esperado:** o request sai com `{"dataNascimento": "1985-03-12"}`.

**Observado:** o request sai com a chave do nome do campo (`data_nascimento`) e sem `dataNascimento`. Com a API da Global Health a falha apareceu como 417 (campo obrigatório ausente). Com uma API que aceita campo ausente (NocoDB, ferramenta de ouvidoria em 12/ago) a falha foi **silenciosa**: HTTP 200 e linha gravada vazia. Contornamos renomeando os campos do `input_schema` para ficarem idênticos às chaves.

**Causa raiz, lida na fonte da v1.15.0** (`src/graph/tools/http.ts`, `parseBody`): só `{"mode":"kv","rows":[...]}` e `{"mode":"raw","raw":"..."}` são tratados como template. Qualquer outro objeto cai no modo legado `fields`, que ignora o template inteiro e monta o JSON a partir dos nomes dos campos do `input_schema`. Por isso "funciona" só quando campo e chave coincidem.

**Estado em 12/out:**
- A descrição da `tool_create` servida pelo MCP da instância diz que um body "objeto com chaves próprias" agora é **recusado** na escrita. A borda de escrita do MCP, então, foi fechada.
- Mas o `parseBody` é o mesmo na v1.42.0, e a normalização de `normalize.ts` não converte nem sinaliza body legado. Linhas gravadas antes continuam rodando no modo legado sem aviso. **Confirmado ao vivo hoje (leitura):** as nossas ferramentas 7 (`cadastrar_paciente`) e 11 (`registrar_ouvidoria`) estão gravadas com body em mapa simples, sem `mode`, e só funcionam porque renomeamos os campos.
- **Sem re-teste ao vivo** da recusa na escrita nem do caminho pela tela (exigiria criar ou alterar ferramenta).

**Pedido:**
1. Tratar o body legado como o `input_schema` já é tratado: na montagem da ferramenta, converter o mapa simples `{chave: "{{campo}}"}` para `kv`; ou, no mínimo, registrar aviso no log de execução e no `agent_config_health` quando houver chave de body que não seja nome de campo.
2. Confirmar que a recusa vale também para o `tool_update` e para a API REST e a tela, não só para o `tool_create` do MCP.

## 4. Output de ferramenta HTTP cortado em 4.000 caracteres fixos

**Versão em que foi visto:** 1.4.1 (14/ago, V21; medido de novo na bancada em 18/ago).

**Passos de reprodução:**
1. Ferramenta HTTP GET cuja resposta tem cerca de 5.400 caracteres (tabela de consultas particulares em ordem alfabética).
2. Perguntar o preço de um item que fica depois do caractere 4.000 (Urologia).

**Esperado:** o modelo recebe a resposta inteira, ou o limite é configurável por ferramenta e o corte é sinalizado.

**Observado:** o corpo foi cortado em 4.000 caracteres (`maxResponseChars` com default fixo em `src/graph/tools/http.ts`, sem env e sem configuração por ferramenta). O modelo não via o fim da tabela e entrou em loop: 10 chamadas da mesma ferramenta no turno (o teto de `limits.maxToolCalls`) e nenhum preço. Contornamos do lado do servidor de origem (filtro por termo e resposta resumida), e desde 19/ago nenhuma resposta nossa passa do teto.

**Estado em 12/out:**
- Na v1.15.0 o limite segue fixo (`MODEL_RESPONSE_CHAR_LIMIT = 4000` em `src/modules/tool-definitions/response-template.ts`), mas já existem o template de resposta (`output_schema`, renderizado antes do corte, #460) e o registro do corte no log de execução.
- A **v1.36.0** (01/out, issue #1016, PR #1017) tornou o limite configurável por ferramenta, de 500 a 20.000 caracteres. É exatamente o que íamos pedir.
- Nenhum aviso de corte nos logs da instância desde 08/set.

**Pedido:** nenhum. A ação é nossa: subir a instância para 1.36.0 ou posterior.

## 5. `reasoning_effort` no `modelConfig`

**Versão em que foi visto:** 1.4.1 (12/ago, ADR-0013 do programa). Com `gpt-5.6-luna` e ferramentas, a OpenAI recusava (`400 Function tools with reasoning_effort are not supported ... set reasoning_effort to 'none'`). O MCP aceitava gravar o campo, mas o cliente não o repassava.

**Estado em 12/out:** entregue. A 1.5.0 passou a rodar a família gpt-5.6 com `reasoning_effort: none` e a 1.6.0 expôs `reasoningEffort` por agente. **Confirmado ao vivo hoje (leitura):** `modelConfig` da Ana com `gpt-5.6-luna` e `reasoningEffort: none`, rodando desde 08/set.

**Pedido:** nenhum. Agradecimento.

## 6. Build novo do chatwoot-pro (hotfix V8)

**Contexto:** desde 29/jul rodávamos um hotfix local para o 500 em `/agent_bots` e `/labels` chamados por token de API (`Current.account` nulo).

**Estado em 12/out:** resolvido. A release `.112` corrigiu; em 08/set subimos para `4.17.0-fazer-ai-pro.129` sem hotfix e `/agent_bots`, `/labels`, `/inboxes` e `/automation_rules` responderam 200 por token. Versão `.129` conferida hoje no `/api` do Chatwoot.

**Pedido:** nenhum. O pedido de build novo fica obsoleto.

## 7. Registro: lista de inboxes dessincronizada

Em 06/ago a lista de inboxes da plataforma divergia do Chatwoot. Corrigido na hora com `instance_sync_inboxes`. Sem reincidência conhecida. Só registro, sem pedido.

---

## O que de fato pedimos

1. **Body legado (achado 3):** converter ou sinalizar body em mapa simples nas linhas já gravadas, e confirmar a recusa em todas as bordas de escrita.
2. **`resolve_conversation` (achado 1):** confirmar se o caminho imediato dos turnos de follow-up ainda descarta a mensagem final.

Nada disso trava a Ana hoje: os dois têm contorno em uso.

---

### Nota interna (não enviar)

- Re-confirmados nesta conferência: 3 (persiste para linhas legadas, as tools 7 e 11 estão nesse formato), 4 (fixo na 1.15.0, configurável na 1.36.0), 5 (em uso), 6 (Chatwoot `.129`, sem hotfix).
- Sem re-teste ao vivo: 1 (só fonte e logs), 2 (só fonte), a recusa de body na escrita (só pela descrição do MCP).
- A instância está na 1.15.0 e a última publicada é a 1.42.0. Subir para 1.36.0 ou posterior encerra o achado 4 do nosso lado.
