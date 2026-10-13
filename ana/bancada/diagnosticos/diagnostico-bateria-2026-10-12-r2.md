# Diagnóstico da bateria v6.8, rodada 2 do diagnóstico (12/out/2026)

Só leitura. Nada foi aplicado: nenhuma escrita na plataforma, nenhum e2e, nenhum commit.

Fontes: prompt ao vivo (v6.8, 62.646 caracteres, idêntico a `ana/prompt/prompt-compilado.md`, modelo `gpt-5.6-luna` com `reasoningEffort: none`), os três logs `bateria-v68-rodada{1,2,3}.log`, as conversas em `conversas-v68-rodada{1,2,3}/`, 579 linhas de `/api/v1/logs` desde 22:20 UTC, as descrições das tools 8 e 13, o ADR-0013 e o `ana/plataforma/runbook-atualizacao.md`.

## Resumo

1. O pacote v6.8 funcionou onde a regra era só "fazer a chamada antes da mensagem": `particular-aquecido` em 15 de 15 turnos de preço; despedida do C29-1 em 3 de 3; Caso 3 completo em C09-1 e C20-1 em 6 de 6.
2. O que sobra é um padrão só: **depois de um erro de ferramenta, o modelo responde em texto e encerra o turno, pulando as chamadas que faltam.** A escalada particular depois do timeout da GH saiu em 5 de 9 turnos (C13-1, C14-1, C16-1 nas três rodadas). Foi tudo ou nada: quando o modelo seguiu depois do erro, fez as três chamadas; quando não seguiu, não fez nenhuma.
3. O C10-3 tem causa própria: a descrição da tool 8 manda o caso "nome de outra especialidade" para o PASSO A2, que é do fluxo particular, e não para o Caso 3 do convênio (classe b).
4. O C26-1 não é regressão do pacote: a Seção 8 está idêntica entre v6.7 e v6.8, e o turno que falhou não tem nenhuma chamada (P1 e P7 não alcançam esse caso). É intermitência com defeito antigo do prompt (a escalada da Seção 8.3 vem escrita depois do modelo).
5. Subir o `reasoningEffort` para `low` NÃO é a correção na raiz com o modelo atual: a OpenAI recusa function tools com reasoning diferente de `none` no `gpt-5.6-luna` em `/v1/chat/completions` (erro 400 medido, ADR-0013). Risco: a Ana muda em todo turno com ferramenta.

## Tabela

| Cenário | Rodada | Classe | Causa em uma linha |
|---|---|---|---|
| C10-3 | 1 e 3 | b (+ a) | A tool 8 manda "nome de outra especialidade" para o PASSO A2 (fluxo particular). O modelo copiou a frase do A2 ("a agenda online não retornou") e não fez o Caso 3 completo. |
| C14-1 | 1 | a (disparado por d) | `consultar_convenios_agenda` deu timeout; o modelo respondeu em texto e não fez `assign_label`, `kanban_move_card` nem `handoff_to_human`. |
| C16-1 | 3 | a (disparado por d) | Mesmo padrão do C14-1, rodada 1. |
| C27-1 | 2 | c | O endereço e o link do mapa estão no próprio prompt (Localização) e a Seção 9.1 deixa responder direto. Exigir `search_knowledge` vai além do prompt. |
| C26-1 | 3 | a (antigo, intermitente) | No turno 2, com a finalidade dita, só orientou de novo e não escalou. A Seção 8.3 ("Ao concluir o fluxo...") vem depois do modelo e não diz em que turno. Não é regressão do P1 nem do P7. |

Escondido pela mudança S7: o C13-1 "passou" nas três rodadas, mas escalou só na rodada 3 (convs 224 e 253 terminaram sem escalada, igual ao C14-1 R1 e ao C16-1 R3).

## Evidências

### C10-3 (rodada 1, conv 223; rodada 3, conv 281; rodada 2, conv 252 passou)
- As três rodadas: `consultar_especialidades_agenda` com `pesquisa` de 12 caracteres (DERMATOLOGIA), output de 134 caracteres, o mesmo de CARDIOLOGIA. É a "Consulta Cardiologica", que a busca por aproximação devolve.
- Descrição da tool 8 para esse caso: "Se o nome for de outra especialidade, trate como NÃO ENCONTRADO, pare a cadeia e siga o PASSO A2 da Seção 2.3.1." O PASSO A2 é do fluxo particular e tem o texto "a agenda online não retornou horários".
- Rodada 1 (223): chamadas `kanban_move_card` (20), `consultar_especialidades_agenda`, `search_knowledge`. Sem etiqueta, sem segundo card. Resposta: "...mas a agenda online não retornou dermatologia...", ou seja, a frase do A2.
- Rodada 3 (281): `kanban_move_card` (20), `consultar_especialidades_agenda`, `assign_label` (20, agendamento-convenio), `search_knowledge`. Faltou o `kanban_move_card` para AGUARDANDO CONFIRMAÇÃO.
- Rodada 2 (252): sequência completa, `assign_label` (20) e `kanban_move_card` (22).
- Contraste: C20-1 (PEDIATRIA, `conteudo` vazio) e C09-1 (timeout no segundo elo) fizeram o Caso 3 completo em 6 de 6. O caso que falha é o único em que a especialidade "vem", mas com outro nome, e é exatamente o caso que a tool 8 manda para o A2.

### C14-1 (rodada 1, conv 225)
- Turno 3, log: `set_custom_attribute` x2, `buscar_paciente_por_cpf` ok, `consultar_especialidades_agenda` ok, `consultar_convenios_agenda` às 22:30:49 com "the provider did not answer within 10s", depois `split` às 22:30:51. Nenhuma chamada depois do erro.
- Resposta em texto livre: "A agenda online não retornou horários agora. Nossa equipe vai entrar em contato..." Não é o modelo do A2 ("Prontinho, [nome]!...").
- Contraste com as escaladas certas (conv 227 e 254): depois do mesmo erro vieram `assign_label` (22 caracteres, agendamento-particular), `kanban_move_card` (14, FILA COMERCIAL) e `handoff_to_human` com `customerMessage` de 148 caracteres, que é o modelo do A2.
- Extra: no turno 2, `set_custom_attribute` com chave de 13 caracteres (`nome_completo`) e valor `string(0)`, ou seja, gravou o nome vazio antes de recebê-lo.

### C16-1 (rodada 3, conv 285)
- Turno 3: o mesmo quadro. `consultar_convenios_agenda` com timeout às 23:20:00, `split` às 23:20:04, nenhuma chamada depois. Resposta livre: "A agenda online não respondeu agora...".
- A raia AGUARDANDO CONFIRMAÇÃO vem do turno 1 (`kanban_move_card` 22, autorizado pela tabela do kanban: "Paciente recebeu valor").
- Extras de outras rodadas: na rodada 1 (227), `consultar_precos_consultas` deu HTTP 503 da API do Hospital às 22:32:06, e a Ana seguiu a Regra 13 (ofereceu encaminhar) e deu o preço no turno seguinte. Na rodada 2 (256), rodou a cadeia da agenda no turno 2, ANTES de nome e CPF, o que viola a Seção 2.3.1 ("A agenda só é consultada DEPOIS de nome e CPF validados").

### Escalada particular depois do timeout, nas três rodadas

| Conversa | Escalou? |
|---|---|
| C13-1 R1 (224) | não |
| C13-1 R2 (253) | não |
| C13-1 R3 (282) | sim |
| C14-1 R1 (225) | não |
| C14-1 R2 (254) | sim |
| C14-1 R3 (283) | sim |
| C16-1 R1 (227) | sim |
| C16-1 R2 (256) | sim |
| C16-1 R3 (285) | não |

5 de 9. Em todas as 9, o segundo elo deu timeout. O PASSO 4 da v6.8 já manda as três chamadas "inclusive depois do PASSO A2". A instrução está no prompt; o modelo não a executa depois do erro.

### C27-1 (rodada 2, conv 261)
- Log: só `debounce` e `split`, nenhuma ferramenta. Resposta: "Rua Silva Cardoso, 689, Bangu, Rio de Janeiro/RJ." Está certa.
- O prompt tem o dado: "Localização: Endereço: Rua Silva Cardoso, 689, Bangu, Rio de Janeiro/RJ; Link Google Maps: maps.app.goo.gl/T95BxBrVPiRKLtHq8". A Seção 9.1 diz "Ana Pode Responder Diretamente: Horários, localização...".

### C26-1 (rodada 3, conv 289; rodadas 1 e 2 passaram)
- Turno 1 (R3): `assign_label` (10, prontuario) e `search_knowledge` (3.886 caracteres). Resposta com a orientação completa (e-mail, documentos).
- Turno 2 (R3), log 23:23:03 a 23:23:06: só `debounce` e `split`. Repetiu a orientação; sem card, sem handoff.
- R1 (231) e R2 (260): turno 1 sem ferramenta; turno 2 com `assign_label`, `kanban_move_card` (17, SETOR RESPONSÁVEL) e `handoff_to_human`.
- Bateria anterior (v6.7, conv 202): turno 1 com `kanban_move_card` e `assign_label`, turno 2 com a escalada.
- Por que não é regressão: (1) a Seção 8 está idêntica entre v6.7 e v6.8 (diff vazio); (2) o P1 só mexe nos fluxos que exigem nome e CPF, e o prontuário não exige; (3) o P7 só restringe a ordem do `handoff_to_human`, e no turno que falhou não houve chamada nenhuma. Gatilho provável: a `search_knowledge` do turno 1 trouxe o processo inteiro, e o modelo tratou o turno 2 como mais uma dúvida.
- Defeito antigo do prompt: a tabela 8.1 diz para "uso pessoal" só "Processo padrão, orientar documentação e email", e a escalada fica no 8.3 ("Ao concluir o fluxo"), depois do modelo de mensagem e sem dizer em que turno.

## Pacote de mudanças, rodada 2 (proposta, nada aplicado)

### Q1. Prompt, Seção 2.4A, mensagem da escalada (C13-1, C14-1, C16-1), fonte `bloco-particular.md`
Esta é a lição de 21/ago aplicada aqui: no turno que escala, a mensagem ao paciente é o `customerMessage`. Uma resposta em texto livre fica proibida, e o próximo passo depois do erro passa a ter nome.

Antes:
```
Mensagem ao paciente, numa única mensagem:

Com horário escolhido no PASSO A3:
```
Depois:
```
Mensagem ao paciente: ela NÃO é uma resposta de texto. Vai inteira no campo `customerMessage` do `handoff_to_human` do PASSO 4 (depois do handoff o bot não fala mais). Responder em texto livre no turno da escalada, sem as três chamadas, é a falha mais comum deste fluxo: se um elo da agenda deu erro ou demorou, a próxima ação é o `assign_label` do PASSO 4, nunca uma resposta.

Com horário escolhido no PASSO A3:
```

### Q2. Tool 13 `consultar_convenios_agenda`, `description` (C13-1, C14-1, C16-1)
Acrescentar ao fim (1.009 vai a 1.314 caracteres; teto 2.000):
```
 Erro ou demora nesta chamada NÃO encerra o turno: no fluxo particular, chamar em seguida assign_label (agendamento-particular), kanban_move_card (FILA COMERCIAL) e handoff_to_human, com a mensagem do PASSO A2 no customerMessage (PASSO 4 da Seção 2.4A); no fluxo de convênio, seguir o Caso 3 da Seção 3.2.
```

### Q3. Tool 8 `consultar_especialidades_agenda`, `description` (C10-3)
1.427 vai a 1.611 caracteres.

Antes:
```
Se o nome for de outra especialidade, trate como NÃO ENCONTRADO, pare a cadeia e siga o PASSO A2 da Seção 2.3.1.
```
Depois:
```
Se o nome for de outra especialidade, trate como NÃO ENCONTRADO e pare a cadeia: no fluxo particular, PASSO A2 da Seção 2.3.1; no fluxo de convênio, Caso 3 da Seção 3.2 (portal, etiqueta agendamento-convenio e AGUARDANDO CONFIRMAÇÃO), sem dizer ao paciente que a especialidade não está na agenda.
```

### Q4. Prompt, Seção 8.3 (C26-1), fonte `bloco-orquestradora.md`
Antes:
```
Ao concluir o fluxo → executar `kanban_move_card` para `SETOR RESPONSÁVEL` → executar `handoff_to_human`.
```
Depois:
```
Assim que a finalidade for conhecida e a orientação do 8.2 já tiver sido dada (antes ou na mesma mensagem), no MESMO turno: `kanban_move_card` para `SETOR RESPONSÁVEL` → `handoff_to_human`, com a orientação do 8.2 no `customerMessage`. Turno de prontuário com a finalidade já dita nunca termina só com texto: orientar de novo sem escalar é falha.
```

### Q5. Cenário C27-1 (`ana/bancada/cenarios/capacidades.json`)
Antes, no turno: `"tools": ["search_knowledge"]`
Depois, no turno: tirar `tools` e pôr `"contem": ["Silva Cardoso"]`.

### Q6. Cenário C13-1 (recomendado, opcional)
A mudança S7 tirou o `handoff` do C13-1 e escondeu 2 escaladas puladas em 3 rodadas. Como o PASSO 4 agora manda escalar sempre, voltar o `confere` para `{"etiquetas": ["particular-aquecido", "agendamento-particular"], "raia": "FILA COMERCIAL", "handoff": true}`. Assim o C13-1 vira a segunda sonda do mesmo defeito, ao lado do C16-1.

## Tamanho do prompt

- v6.8 ao vivo: 62.646 caracteres.
- Com Q1 e Q4: 63.222 (Q1 +335, Q4 +241; mais 576 no total). Teto 100.000.
- Nenhum travessão novo.

## A camada do modelo: subir o `reasoningEffort` para `low`?

**Resposta: não como está. Com o `gpt-5.6-luna` é arriscado demais, e não é a primeira correção.**

1. **Bloqueio de API.** O ADR-0013 registra o erro medido: `400 Function tools with reasoning_effort are not supported for gpt-5.6-luna in /v1/chat/completions. To use function tools, use /v1/responses or set reasoning_effort to 'none'.` O runbook diz que a 1.5.0 da plataforma passou a rodar a família 5.6 com `none` justamente para as tools funcionarem. Se a plataforma 1.15.0 ainda usa `chat/completions`, `low` faz todo turno com ferramenta falhar com 400, e a Ana fica muda. Não confirmei se a 1.15.0 já usa a Responses API. Essa prova só sai num clone do agente no playground (`agent_clone` + `agent_playground`), que é escrita e depende do OK do Pedro.
2. **O diagnóstico aponta mesmo para o modelo.** Com `none`, o modelo não planeja os passos que faltam depois de um erro de ferramenta. O padrão tudo-ou-nada (5 de 9) é típico disso. Um modelo que raciocina ao menos um pouco tende a terminar listas de chamadas. A causa de fundo é da camada do modelo.
3. **Caminho alternativo de modelo:** `gpt-5-mini` com `reasoningEffort: low`. Ele aceita tools com reasoning no chat/completions e foi o modelo da Ana de julho a setembro. Custo: os tokens de raciocínio são cobrados como output, em cada passo do turno. Latência: alguns segundos a mais por chamada ao modelo. O turno 3 do fluxo particular tem 4 a 5 passos, além do timeout de 10 s da GH, e pode passar de 20 s. Exige a bateria inteira de novo, porque o tom e o seguimento dos modelos mudam.
4. **Ordem recomendada:** aplicar Q1 a Q5, que custam zero de latência, e rodar a bateria 3 vezes. Se a escalada depois do erro continuar abaixo de 9 em 9, testar a troca de modelo num clone pelo playground antes de mexer no agente 1.
5. **Exposição real:** o gatilho é o timeout do `/convenios` da GH de homologação. Em produção, sem esse timeout, o turno sem erro já escala bem. O risco real é menor que o da bancada, mas não é zero: qualquer erro de ferramenta no meio de uma cadeia reproduz o padrão (ver o 503 da API do Hospital no C16-1 R1).

## Riscos das mudanças para os cenários que passam

- **Q1:** só o fluxo particular, na escalada. Com horário escolhido (A3) a mensagem também passa a ir no `customerMessage`, que já é o comportamento certo. Risco baixo.
- **Q2:** pode levar o modelo a escalar quando o convênio do paciente simplesmente não está na lista (Caso 2), se ele ler "erro" de forma larga. O texto restringe a "erro ou demora nesta chamada". Risco baixo.
- **Q3:** só o caso "nome de outra especialidade". O C15-1 ("quem são os cardiologistas") não cai nesse caso. Risco baixo.
- **Q4:** C26-1. Risco: escalar prontuário no primeiro turno, quando a finalidade vem junto com o pedido. É o comportamento pedido pela tabela 8.1 e pelo 8.3. Risco baixo.
- **Q5 e Q6:** só mudam a régua dos próprios cenários.

## O que fica aceito como GH ou API do Hospital (classe d)

- `consultar_convenios_agenda` deu timeout em todas as 9 escaladas particulares e em todos os C09-1 da bateria, com a mesma mensagem: "the provider did not answer within 10s" (ex.: 22:30:49 conv 225, 22:33:20 conv 227, 22:54:07 conv 254, 23:20:00 conv 285). É o mesmo travamento do `/convenios` provado de manhã (HTTP 000 depois de 40 s).
- `consultar_precos_consultas` deu HTTP 503 uma vez (22:32:06, conv 227): é a API do Hospital, transitória. A Ana tratou certo pela Regra 13.

## Observações fora das falhas

- C14-1 R1, turno 2: `set_custom_attribute` gravou `nome_completo` vazio antes de receber o nome. Se repetir, apaga o nome de um paciente que volta. Vale uma linha no prompt ("nunca gravar valor vazio") na próxima rodada.
- C16-1 R2, turno 2: consultou a agenda antes de nome e CPF.
- C14-1 R2, turno 2, e C26-1 R2, turno 1: o texto saiu duplicado ou com uma frase extra colada ("...agendamento.Ótimo! Me passa..."; "...finalidade você precisa dele?Para solicitar..."). É o mesmo vazamento visto no C13-1 de manhã. Sintoma do modelo com `none` emitindo texto antes da chamada e de novo depois. Não reprova cenário, mas o paciente vê.
