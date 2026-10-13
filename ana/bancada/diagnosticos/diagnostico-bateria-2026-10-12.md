# Diagnóstico da bateria de 12/out/2026 (capacidades, 19 de 29)

Só leitura. Nada foi aplicado: nenhum prompt_set, agent_update, tool_update, mensagem ou commit.

Fontes lidas: prompt ao vivo do agente 1 (v6.7, 60.838 caracteres, idêntico a `ana/prompt/prompt-compilado.md`), conversas gravadas em `ana/bancada/conversas/`, cenários em `ana/bancada/cenarios/capacidades.json`, logs da plataforma (`/api/v1/logs`, estágios tool, handoff e generate), grants do agente 1 (`agent_tools_get`), descrições das tools 1, 8, 9, 13 e 14, e GETs na GH de homologação.

## Achado principal

1. A GH de homologação trava no segundo elo da cadeia de horários (`/convenios`). Isso quebra a cadeia em C09-1, C13-1 e C16-1.
2. A cadeia quebrada expõe uma contradição do prompt: a trava do PASSO 4 (Seção 2.4A) proíbe o handoff sem `consultar_horarios_livres`, e o PASSO A1/A2 manda parar a cadeia no erro e escalar. No C13-1 ela obedeceu à trava (não escalou). No C16-1 obedeceu ao A2 (escalou pela metade).
3. Chamada de ferramenta escrita DEPOIS do modelo de mensagem é pulada: `particular-aquecido` (Seção 2.3), etiqueta e raia do Caso 3 (Seção 3.2), encerramento (Seção 11). É a mesma lição de 26/ago: a trava tem que ficar no ponto exato do erro.
4. Não existe trava no `handoff_to_human` que exija o card na fila antes (C14-1, C16-1).
5. Quatro cenários ficaram defasados com o ADR-0025 (pedem a tool 4, fora do grant). Dois contradizem o próprio `espere` (C13-1, C14-1).

## Tabela

| Cenário | Classe | Causa em uma linha |
|---|---|---|
| C02-1 | c | Seção 1.1 manda não chamar ferramenta em saudação genérica; o cenário cobra a raia EM ATENDIMENTO ANA. |
| C03-1 | c | "Vender plano de saúde" não está na lista "Fora do escopo" da Seção 1.2; a Ana respondeu pela KB, sem inventar. |
| C09-1 | c + d + b | Pede a tool 4 (fora do grant, ADR-0025); `/convenios` da GH deu timeout; a descrição da tool 13 manda a cobertura para a tool 4. |
| C09-2 | c | Sem especialidade, a Seção 3.1 manda perguntar a especialidade. Ela perguntou. O cenário espera a lista da tabela morta. |
| C20-1 | a + c | Caso 3 da Seção 3.2: pulou etiqueta `agendamento-convenio` e raia AGUARDANDO CONFIRMAÇÃO, e narrou "a agenda não publicou". Também pede a tool 4. |
| C10-3 | c (a latente) | Só reprovou por pedir a tool 4. Tem o mesmo defeito do Caso 3 (narrou, sem etiqueta, sem raia), que o cenário não confere. |
| C13-1 | a (+ c, + d) | Deu o preço sem `particular-aquecido`. Depois do timeout da GH, não escalou. O `handoff:false` do cenário contradiz a Seção 2.4A. |
| C14-1 | a + c | `handoff_to_human` no turno 2, antes do CPF; a conversa morreu. O `handoff:false` do cenário contradiz o próprio `espere`. |
| C16-1 | a (disparado por d) | Depois do timeout, escalou só com o handoff, sem `agendamento-particular` e sem FILA COMERCIAL. A raia final ficou AGUARDANDO CONFIRMAÇÃO, movida no turno 1. |
| C29-1 | a | A Seção 11 só cobre o fim depois da pergunta "Posso te ajudar com mais alguma coisa?". Despedida espontânea não tem regra. |
| C05-1 (manhã) | a | `particular-aquecido` intermitente: faltou em 3 de 6 turnos de preço (convs 172, 195, 196). |

Classes: (a) defeito da Ana no prompt; (b) configuração de ferramenta; (c) cenário errado ou exigente além do prompt; (d) dado da GH/MV que a homologação não tem.

## Evidências

### C02-1 (conv 178)
- Trace: nenhuma ferramenta no turno.
- Prompt, Seção 1.1: "Se a mensagem for uma saudação genérica ou não indicar nenhum motivo claro: responder de forma natural e aguardar o paciente informar o que precisa. Não chamar nenhuma ferramenta."
- Princípio de Movimentação: move só "Ao identificar o motivo do contato (Seção 1.1)".

### C03-1 (conv 179)
- Trace: só `search_knowledge` (output 3.717 chars).
- Seção 1.2, "Fora do escopo": orientação médica, medicamentos, negociação de valores, reclamação complexa, pedido de humano. Venda de plano não está na lista; "Informações sobre convênios" está DENTRO do escopo.
- Resposta da Ana: recusa correta ("não vende planos de saúde"), sem prometer nada.

### C09-1 (conv 190)
- Log 17:01:07 `consultar_especialidades_agenda` ok (134 chars, item 1843).
- Log 17:01:19 `consultar_convenios_agenda` nível warn, status error: "the provider did not answer within 10s".
- Grant do agente 1 (agent_tools_get): HTTP 1, 2, 3, 5, 6, 8, 9, 10, 11, 12, 13, 14. A tool 4 `consultar_convenios_especialidade` está fora.
- Descrição da tool 13 termina com: "Esta ferramenta NÃO responde se um convênio cobre uma especialidade: essa resposta vem da tabela oficial consultar_convenios_especialidade." Ferramenta que ela não tem. Resultado: improvisou "Não consegui confirmar a cobertura... posso encaminhar", fora dos três Casos da Seção 3.2. Pelo prompt, erro no segundo elo deveria cair no Caso 3 (portal + etiqueta + AGUARDANDO).
- Mesmo com a GH saudável, Amil não está na agenda de homologação (ADR-0025): seria Caso 2 (nega e oferece particular), sem etiqueta. Não reconferido hoje porque o endpoint trava.
- O `espere` ("ressalva da tabela: cobre consultas e exames...") é da tabela morta.

### C09-2 (conv 191)
- Trace: `kanban_move_card` (20 chars, EM ATENDIMENTO ANA) e `search_knowledge`.
- Resposta: "A Unimed é aceita... qual especialidade você precisa?"
- Seção 3.1: "Se o convênio já foi informado mas a especialidade não: 'Qual especialidade você precisa?...'". Seção 3.2: "Somente quando o paciente tiver informado convênio e especialidade". Comportamento correto.
- Nenhuma ferramenta da agenda lista especialidades por convênio: a pergunta do cenário não tem fonte depois do ADR-0025.

### C20-1 (conv 199)
- Log 17:12:37 `consultar_especialidades_agenda` output 64 chars. GET direto hoje: `consultas?pesquisa=PEDIATRIA` devolve `{"conteudo":[]}`. Logo, Caso 3.
- Trace do turno: `kanban_move_card` (20, EM ATENDIMENTO ANA), `set_custom_attribute`, `consultar_especialidades_agenda`, `search_knowledge`. Sem `assign_label`, sem segundo `kanban_move_card`.
- Prompt, Caso 3: a ordem "Executar `assign_label` com tag `agendamento-convenio` e `kanban_move_card` para `AGUARDANDO CONFIRMAÇÃO`." vem DEPOIS do modelo de mensagem.
- Resposta: "A agenda online não publicou Pediatria no momento..." viola "Proibido em todos os casos: narrar a verificação ou citar termos internos".

### C10-3 (conv 194)
- Log 17:03:52 `consultar_especialidades_agenda` com `pesquisa` de 12 chars (DERMATOLOGIA), output 134 chars, mesmo tamanho do de CARDIOLOGIA: é a "Consulta Cardiologica", o casamento por aproximação já documentado na tool 8. Ela tratou como não encontrado (certo) e foi ao portal.
- Narrou "a dermatologia não está publicada na agenda online" e não pôs etiqueta nem raia (mesmo defeito do C20-1, não conferido pelo cenário).
- Única conferência reprovada: tool 4.

### C13-1 (conv 195)
- Turno 1, log 17:04:34: só `kanban_move_card` (20) e `consultar_precos_consultas`. Sem `assign_label`.
- Turno 3: `set_custom_attribute` x2, `buscar_paciente_por_cpf` ok, `consultar_especialidades_agenda` ok, `consultar_convenios_agenda` timeout às 17:05:47. Depois disso, nenhuma escalada.
- Prompt, PASSO 4: "é PROIBIDO executar `handoff_to_human` sem que `consultar_horarios_livres` tenha sido executada nesta conversa". PASSO A1: "Qualquer elo que devolva lista vazia, item bloqueado ou erro interrompe a cadeia". As duas regras se contradizem quando o elo 2 falha.
- Turno 2 vazou texto: "Para prosseguir, preciso coletar nome completo e CPF.Ótimo! ...".
- Cenário: `confere.handoff:false` contradiz a Seção 2.4A, que escala no fim.

### C14-1 (conv 196)
- Log 17:06:53, turno 2: `handoff_to_human` com `customerMessage` de 98 chars, exatamente o modelo do PASSO 1 ("Ótimo! Me passa seu nome completo e CPF..."), reason de 181 chars. Sem `kanban_move_card` no turno.
- Log 17:06:54 handoff: `{"status": "open", "outcome": "ownership_lost"}`. Por isso o turno 3 ficou mudo (a plataforma não lê mais a conversa depois do handoff).
- Viola a Regra Global 11 e a trava do PASSO 4.
- Turno 1 também sem `particular-aquecido`.
- Cenário: `espere` diz "avisa... e passa para a equipe", mas `confere.handoff:false`.

### C16-1 (conv 198)
- Turno 1: `kanban_move_card` 20 (EM ATENDIMENTO ANA), `consultar_precos_consultas`, `kanban_move_card` 22 (AGUARDANDO CONFIRMAÇÃO; a tabela do kanban autoriza: "Paciente recebeu valor ou link"), `assign_label` 19 (particular-aquecido).
- Turno 3: `buscar_paciente_por_cpf` ok, `consultar_especialidades_agenda` ok, `consultar_convenios_agenda` timeout às 17:11:55, `handoff_to_human` às 17:11:58 com `customerMessage` de 148 chars (o modelo "sem horário" do PASSO A2). Sem `assign_label agendamento-particular`, sem `kanban_move_card FILA COMERCIAL`.
- Duas causas no prompt: a contradição do PASSO 4 (acima) e a frase ambígua da Seção 2.3 "As duas nunca são aplicadas juntas", lida como exclusão entre as etiquetas.

### C29-1 (conv 205)
- Turno 1: só `search_knowledge` (sem mover para EM ATENDIMENTO ANA).
- Turno 2 ("obrigado, era só isso"): nenhuma ferramenta. Resposta parecida com o modelo de despedida.
- Prompt, Seção 11: "Trava do `resolve_conversation`: a conversa só é marcada como resolvida quando as duas coisas aconteceram nesta conversa: a pergunta 'Posso te ajudar com mais alguma coisa?' foi feita, E o paciente respondeu". A pergunta nunca foi feita: o modelo não moveu o card nem resolveu. A despedida espontânea não tem regra.

### C05-1
- Manhã, conv 172 (16:46 UTC): só `consultar_precos_consultas`. Sem kanban, sem `assign_label`.
- Tarde, conv 181: `consultar_precos_consultas`, `kanban_move_card`, `assign_label`.
- Na bateria, os turnos de preço de consulta com valor: 172 sem etiqueta, 181 com, 182 com, 195 sem, 196 sem, 198 com. 3 de 6 falharam.
- Prompt, Seção 2.3: "Ao informar o preço: executar `assign_label` com tag `particular-aquecido`." vem DEPOIS do modelo de mensagem.

## Pacote de mudanças (proposta, nada aplicado)

Fonte do prompt: `ana/prompt/`. P1 e P7 em `nucleo-comum.md`; P2, P3 e P4 em `bloco-particular.md`; P5 e P6 em `bloco-orquestradora.md`. Depois, compilar e publicar. O pacote foi simulado numa cópia local do prompt ao vivo: cada âncora casa uma vez só, e nenhum travessão novo entra.

### P1. Regra Global 11

Antes:
```
11. **Nunca executar `kanban_move_card` ou `handoff_to_human` antes de ter nome completo e CPF coletados e validados**, nos fluxos que exigem esses dados.
```
Depois:
```
11. **Nunca mover o card para uma fila humana nem executar `handoff_to_human` antes de ter nome completo e CPF coletados e validados**, nos fluxos que exigem esses dados. Mover para a etapa de atendimento da Ana ou para `AGUARDANDO CONFIRMAÇÃO` não depende de dados.
```
(O resto da linha, com a exceção da Seção 0, fica igual.)

### P2. Seção 2.3 (o `particular-aquecido` vem antes da mensagem)

a) Antes:
```
Se a tabela trouxer o valor, responder numa única mensagem, direto e sem discurso de venda:
```
Depois:
```
Se a tabela trouxer o valor: ANTES de enviar a mensagem, neste mesmo turno, executar `assign_label` com tag `particular-aquecido`. É obrigatório toda vez que o valor de uma consulta é informado: mensagem com valor sem essa chamada no turno é falha. Depois, responder numa única mensagem, direto e sem discurso de venda:
```

b) Apagar a linha:
```
Ao informar o preço: executar `assign_label` com tag `particular-aquecido`.
```

c) Antes:
```
As duas nunca são aplicadas juntas.
```
Depois:
```
As duas entram em turnos diferentes, e a conversa que chega à escalada termina com as duas: `particular-aquecido` já aplicada nunca impede nem substitui a `agendamento-particular`.
```

### P3. Seção 2.4A, PASSO 1

Inserir logo depois do bloco do modelo "Ótimo! Me passa seu nome completo e CPF, por favor? Assim já deixo tudo pronto para o agendamento." e antes do "- PASSO 2":
```
O turno do PASSO 1 termina nesta pergunta: nenhum `kanban_move_card` para fila e nenhum `handoff_to_human` (Regra 11). A escalada só acontece no turno em que nome e CPF chegaram e foram validados.
```

### P4. Seção 2.4A, PASSO 4

Antes:
```
- PASSO 4 → **TRAVA DURA: é PROIBIDO executar `handoff_to_human` sem que `consultar_horarios_livres` tenha sido executada nesta conversa.** Antes de escalar, conferir: a cadeia da Seção 2.3.1 rodou nesta conversa? Se não rodou, rodar agora, e só escalar depois. Escalar sem ter consultado a agenda é falha grave. Com a cadeia rodada: executar `assign_label` com tag `agendamento-particular` → `kanban_move_card` para `FILA COMERCIAL` → `handoff_to_human` (resumo interno com: especialidade, valor informado, horário escolhido se houver, e se o paciente tem ou não cadastro no sistema).
```
Depois:
```
- PASSO 4 → **TRAVA DURA: é PROIBIDO executar `handoff_to_human` sem que a cadeia da Seção 2.3.1 tenha rodado nesta conversa.** A cadeia conta como rodada em dois casos: `consultar_horarios_livres` foi executada, OU um elo anterior devolveu vazio, bloqueado, erro ou demora (PASSO A2). Se a cadeia ainda não começou, rodar agora, e só escalar depois. Escalar sem ter tentado a agenda é falha grave. Com a cadeia rodada, a escalada é SEMPRE estas três chamadas, nesta ordem, no mesmo turno, sem pular nenhuma, inclusive depois do PASSO A2: (1) `assign_label` com tag `agendamento-particular`; (2) `kanban_move_card` para `FILA COMERCIAL`; (3) `handoff_to_human` (resumo interno com: especialidade, valor informado, horário escolhido se houver, e se o paciente tem ou não cadastro no sistema). Escalar só com o `handoff_to_human`, sem as duas primeiras, deixa o card fora da fila comercial: é falha grave.
```

### P5. Seção 3.2, Caso 3

a) Antes:
```
**Caso 3: a especialidade NÃO está publicada na agenda online (`conteudo` vazio, item bloqueado ou falha da ferramenta)** → a agenda online não sabe responder a cobertura. NÃO afirmar nem negar a cobertura da especialidade. Usar a `search_knowledge` só para saber se o convênio é aceito no hospital em geral, e mandar o paciente ao portal:
```
Depois:
```
**Caso 3: a agenda online não respondeu a cobertura** (`consultar_especialidades_agenda` sem item da especialidade pedida, item bloqueado, ou erro ou demora em `consultar_especialidades_agenda` ou em `consultar_convenios_agenda`) → NÃO afirmar nem negar a cobertura da especialidade, e NÃO trocar o portal por "posso encaminhar para a equipe". Neste mesmo turno, ANTES de enviar a mensagem, executar nesta ordem: (1) `search_knowledge`, só para saber se o convênio é aceito no hospital em geral (se não for, vale o bloco "Se o convênio não consta na base do hospital", no fim desta seção); (2) `assign_label` com tag `agendamento-convenio`; (3) `kanban_move_card` para `AGUARDANDO CONFIRMAÇÃO`. Depois, enviar o modelo abaixo, sem dizer que a especialidade não está publicada ou não aparece na agenda:
```

b) Apagar a linha que vem depois do modelo:
```
Executar `assign_label` com tag `agendamento-convenio` e `kanban_move_card` para `AGUARDANDO CONFIRMAÇÃO`.
```

### P6. Seção 11 (despedida espontânea)

Antes:
```
**Trava do `resolve_conversation`:** a conversa só é marcada como resolvida quando as duas coisas aconteceram nesta conversa: a pergunta "Posso te ajudar com mais alguma coisa?" foi feita, E o paciente respondeu que não precisa de mais nada (ou se despediu). Sem essa confirmação explícita dele, nunca chamar a ferramenta:
```
Depois:
```
**Despedida espontânea:** se o paciente encerrar por conta própria ("obrigado, era só isso", "só isso, valeu"), isso já é a resposta à pergunta: não perguntar de novo. No mesmo turno: a despedida, `kanban_move_card` para a etapa de encerramento resolvido da tabela e `resolve_conversation`.

**Trava do `resolve_conversation`:** a conversa só é marcada como resolvida quando o paciente disse, com as palavras dele, que não precisa de mais nada: respondendo à pergunta "Posso te ajudar com mais alguma coisa?" ou na despedida espontânea acima. Sem essa confirmação explícita dele, nunca chamar a ferramenta:
```
(O resto do parágrafo, com as proibições de escalada, AGUARDANDO CONFIRMAÇÃO e ouvidoria, fica igual.)

### P7. Ferramentas, `handoff_to_human` (trava universal)

Antes:
```
Escala a conversa para a equipe humana, com resumo do atendimento. Sempre executado após `kanban_move_card` para qualquer fila humana. Na urgência (Seção 0), executar imediatamente, em qualquer horário.
```
Depois:
```
Escala a conversa para a equipe humana, com resumo do atendimento. **Trava: nunca é a primeira nem a única chamada da escalada.** No mesmo turno, imediatamente antes, tem que ter rodado `kanban_move_card` para uma fila humana (e, nas Seções 2.4A e 5.B, `assign_label` com `agendamento-particular` antes do card). Faltando alguma, fazer a que falta primeiro. Na urgência (Seção 0), executar imediatamente, em qualquer horário, logo depois do card.
```
Todos os fluxos que escalam hoje (Seções 0, 1.2, 2.4A, 3.2, 4, 5.B, 5.C, 5.D, 6.C, 7.3, 7.5, 8, 9.2) já fazem o card antes do handoff: a trava não contradiz nenhum.

### F1. Tool 13 `consultar_convenios_agenda`, campo `description`

Tamanho: 938 vai a 1.009 caracteres (teto da plataforma: 2.000).

Trocar:
```
Nenhum convênio casou com o que o paciente disse, ou conteudo veio vazio: parar a cadeia e seguir o PASSO A2 da Seção 2.3.1, sem repetir a chamada.
```
por:
```
No fluxo particular, nenhuma linha com particular verdadeiro, conteudo vazio ou erro: parar a cadeia e seguir o PASSO A2 da Seção 2.3.1, sem repetir a chamada.
```

Trocar:
```
Esta ferramenta NÃO responde se um convênio cobre uma especialidade: essa resposta vem da tabela oficial consultar_convenios_especialidade.
```
por:
```
No fluxo de convênio, esta lista É a resposta de cobertura daquela especialidade (Seção 3.2): convênio do paciente na lista = Caso 1; fora da lista = Caso 2; erro, demora ou conteudo vazio = Caso 3.
```

### S1 a S8. Cenários em `ana/bancada/cenarios/capacidades.json`

Os testes manuais de origem em `os/dados/comparacao.json` também citam a tool 4 e os textos antigos (linhas 131, 512, 533, 998). Mudam junto, se for para manter os dois iguais.

- **S1 C02-1:** no turno, acrescentar `"tools_proibidas": ["kanban_move_card"]`. `confere` vira `{"handoff": false}`.
- **S2 C03-1:** trocar o turno por um item que está na lista da Seção 1.2:
  `{"envie": "qual remédio vocês recomendam pra dor de cabeça?", "espere": "Recusa educada, sem indicar remédio nenhum, e encaminhamento para a equipe.", "falha": "Indicar qualquer remédio ou dose.", "nao_contem": ["dipirona", "paracetamol", "ibuprofeno"]}`. `confere` fica igual (`FILA ATENDIMENTO`, `handoff: true`). Só passa em horário comercial (Regra 9).
- **S3 C09-1:** `envie` vira "meu convênio é a Unimed, vocês cobrem cardiologia?". `tools` vira `["consultar_especialidades_agenda", "consultar_convenios_agenda"]`. `nao_contem` vira `["não atendemos", "não consegui confirmar"]`. `espere` vira "Com a GH respondendo: cobertura confirmada e até 5 horários numerados. Com a GH fora: portal, sem negar a cobertura." `confere` vira `{"etiquetas": ["agendamento-convenio"], "handoff": false}`, sem raia (o Caso 1 não move o card; o Caso 3 move para AGUARDANDO).
- **S4 C09-2:** `tools` vira `["search_knowledge"]`. `espere` vira "Confirma que a Unimed é aceita e pergunta a especialidade, sem listar especialidades de memória." `confere` vira `{"handoff": false}`.
- **S5 C10-3:** `tools` vira `["consultar_especialidades_agenda", "search_knowledge"]`. Acrescentar `"publicada"` e `"agenda online"` ao `nao_contem`. `espere` vira "Que a Porto Seguro é atendida e o link do portal, sem negar nem afirmar a cobertura de dermatologia." `confere` vira `{"etiquetas": ["agendamento-convenio"], "raia": "AGUARDANDO CONFIRMAÇÃO", "handoff": false}`.
- **S6 C20-1:** `tools` vira `["consultar_especialidades_agenda", "search_knowledge"]`. Acrescentar `"nao_contem": ["publicada", "não publicou"]`. `confere` fica igual.
- **S7 C13-1:** `confere` vira `{"etiquetas": ["particular-aquecido"]}`, sem `handoff` (a Seção 2.4A escala no fim).
- **S8 C14-1:** `confere` vira `{"handoff": true}`, alinhado com o próprio `espere`.

C16-1, C29-1 e C05-1 não mudam: o prompt é que tem que mudar.

## Tamanho do prompt

- Antes: 60.838 caracteres.
- Depois do pacote: 62.644 caracteres (mais 1.806).
- Teto: 100.000. Sobram cerca de 37.000.
- Acréscimo por mudança: P1 +112, P2 +296 (a +228, b -77, c +145), P3 +198, P4 +318, P5 +354 (a +462, b -108), P6 +284, P7 +244.

## Riscos para os 19 que passam

- **P2:** o C05-3 (catálogo particular) pode passar a receber `particular-aquecido`. O cenário não confere etiqueta. Risco baixo.
- **P6:** a Ana pode resolver conversas a mais. As proibições (escalada, AGUARDANDO CONFIRMAÇÃO, ouvidoria) ficam intactas. Nenhum cenário que passa tem despedida. O C29-1 vai passar a chamar `resolve_conversation` na inbox de API. Risco baixo.
- **P7:** C01-1, C24-1 e C26-1 já fazem o card antes do handoff, e a urgência continua imediata. Risco baixo.
- **P1:** pode mover o card mais cedo nos fluxos de preço. Nenhum cenário que passa confere raia nesse ponto. Risco baixo.
- **P5 e F1:** só o fluxo de convênio. C27-2 ("quais convênios") usa a KB e não passa pelo Caso 3. C15-1 usa a agenda, mas não o fluxo de convênio. Risco baixo.
- **P3 e P4:** só a Seção 2.4A (C13, C14, C16).

## O que fica aceito como GH (classe d), com prova

- **`/rest/whatsapp/convenios?idItemAgendamento=1843` não responde.** Log: 3 timeouts, 17:01:19 (conv 190), 17:05:47 (conv 195), 17:11:55 (conv 198), todos "the provider did not answer within 10s". GET direto hoje: HTTP 000 depois de 40 s com `size=100`, e de novo depois de 25 s sem `size`. No mesmo minuto, `consultas?pesquisa=CARDIOLOGIA` respondeu em 0,6 s.
- **`/convenios/3/planos` (Particular) agora volta `{"conteudo": []}`.** Em agosto voltava os planos 2 e 1. Mesmo com o `/convenios` de pé, a cadeia particular morreria no terceiro elo.
- **`PEDIATRIA` volta `conteudo: []`.** `DERMATOLOGIA` volta a "Consulta Cardiologica" (casamento por aproximação). As duas não estão publicadas na homologação.
- **Amil fora da agenda de homologação.** Prova: ADR-0025. Não reconferido hoje porque o endpoint trava.

Consequência: enquanto o `/convenios` não voltar, nenhum cenário chega à lista de horários. Com o pacote aplicado, o caminho certo vira o Caso 3 (convênio) ou o PASSO A2 com escalada completa (particular).

## Observações fora das falhas

- C13-1, turno 2: vazou texto antes da mensagem ("Para prosseguir, preciso coletar nome completo e CPF.Ótimo! ..."), sem ferramenta no turno. Modelo ao vivo: `gpt-5.6-luna` com `reasoningEffort: none`. Vale vigiar.
- C03-1 e C29-1, turno 1: a Ana respondeu pela KB e não moveu o card para EM ATENDIMENTO ANA. Nenhum cenário confere isso hoje.
- O log de `generate` só traz o `systemPrompt`, não a resposta nem as chamadas. Para ver o raciocínio de um turno é preciso o Langfuse, e não há chave dele no `.env`.
