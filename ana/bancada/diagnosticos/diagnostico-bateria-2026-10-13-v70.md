# Diagnóstico da bateria v70 (13/out/2026)

Bateria `v70` do prompt v7.0, três rodadas de `cenarios/capacidades.json` (29 cenários), rodadas de 06:42Z a 07:54Z. Modo leitura: nada foi aplicado no prompt, nas ferramentas ou nos cenários.

## Resumo

Placar: 27/29, 27/29 e 27/29. Nenhuma falha constante. Cinco cenários intermitentes, cada um falhou em uma rodada (C26-1 em duas): C03-1, C05-2, C09-1, C10-2 e C26-1. C10-1 e C10-3 melhoraram (falharam na rodada 3 da v69 e passaram nas três agora).

Padrão principal: duas das seis falhas nasceram fora da Ana (API do Hospital com 502 e 503 às 07:33Z; Global Health sem resposta em 10 s às 07:38Z) e o modelo tratou a indisponibilidade com uma frase que o cenário proíbe. Duas são o modelo pulando ou antecipando uma chamada já escrita (etiqueta `prontuario` não aplicada; `handoff_to_human` antes do paciente aceitar). Uma é cenário rígido demais (C03-1 proíbe a palavra "vendemos" numa resposta correta). Uma é choque entre a regra 8.3 do prompt e o cenário C26-1 (a Ana orientou no turno 1 e, mandada a não repetir, ficou calada no turno 2).

Ressalva de método: a bateria rodou em dois modelos. A sessão da #20 trocou o agente para `gpt-6-luna` às 07:24:32Z. Rodada 1 inteira e a rodada 2 até o C24-1 rodaram no `gpt-5.6-luna`; o fim da rodada 2 (C26-1, C27-1, C27-2, C29-1) e a rodada 3 inteira rodaram no `gpt-6-luna`. A cópia `conversas-v70-rodada2/C05-1.json` é a conversa #530 da fumaça daquela sessão, não a #508 da rodada (o log da rodada tem a #508, que passou).

## Tabela

| Cenário | R1 | R2 | R3 | Classe | Causa em uma linha |
|---|---|---|---|---|---|
| C03-1 Recusar fora do escopo | falhou | passou | passou | intermitente | Resposta certa ("Não vendemos plano de saúde") contém a palavra proibida "vendemos"; cenário rígido demais. |
| C05-2 Preço de consulta (último item) | passou | passou | falhou | intermitente | API do Hospital respondeu 502 e 503; a Ana foi para o caminho de indisponível e não aplicou `particular-aquecido`. Infra mais modelo. |
| C09-1 Cobertura de convênio | passou | passou | falhou | intermitente | `consultar_convenios_agenda` sem resposta em 10 s; a Ana foi para o Caso 3 mas escreveu "não consegui confirmar" em vez do modelo literal. Infra mais modelo. |
| C10-2 Exame fora da tabela | passou | falhou | passou | intermitente | Perguntou "posso encaminhar?" e chamou `kanban_move_card` e `handoff_to_human` no mesmo turno, sem esperar o aceite. A regra 6.B não diz para esperar; a 6.A diz. |
| C26-1 Prontuário | falhou | falhou | passou | intermitente | R1: zero chamadas, sem etiqueta `prontuario`. R2: orientou tudo no turno 1 e, no turno 2, chamou `skip_reply` (regra 8.3 manda não repetir); o cenário exige o e-mail no turno 2. |
| C10-1 Exame fora da tabela | passou | passou | passou | melhorou | Falhou na rodada 3 da v69. |
| C10-3 Exame fora da tabela | passou | passou | passou | melhorou | Falhou na rodada 3 da v69. |
| Outros 22 cenários | passou | passou | passou | constante (passa) | |

## Evidências

### C03-1, rodada 1 (gpt-5.6-luna)

- Turno 1, paciente: "vocês vendem plano de saúde?"
- Veio: "Não vendemos plano de saúde. O hospital atende por convênios cadastrados e também oferece atendimento particular."
- Esperado pelo cenário: recusa educada sem a palavra "vendemos" nem "nosso plano".
- Ferramentas: nenhuma exigida; handoff false, ok.
- Leitura: a resposta cumpre a intenção do cenário. A lista `nao_contem` proíbe a forma natural de negar.

### C05-2, rodada 3 (gpt-6-luna)

- Turno 1, paciente: "quanto custa a consulta de urologia?"
- Veio: "Não consegui confirmar o valor da consulta de urologia agora. Nossa equipe pode verificar para você no próximo expediente. Posso encaminhar sua solicitação?"
- Esperado: "R$ 350" (último item da tabela) e etiqueta `particular-aquecido`.
- Ferramentas no trace: `consultar_precos_consultas`, `assign_label`, `consultar_precos_consultas`, `assign_label`. Etiquetas no fim: a etiqueta "em atendimento" da Ana e "fora-horario".
- Logs da plataforma (conversa 522 da plataforma, 07:33Z): `consultar_precos_consultas` com `especialidade` devolveu HTTP 502; a repetição sem filtro devolveu HTTP 503. Dois minutos antes (conversa 521) a mesma ferramenta devolveu 675 chars com status ok. O `smoke-hospital.py` às 08:0xZ passou nas tabelas (666 chars, folga de 3.334). A API oscilou.
- Leitura: a mensagem de indisponível é a prevista na Regra 13. O que falhou da Ana foi a etiqueta `particular-aquecido`, que o prompt pede quando o paciente pergunta preço, com ou sem valor.

### C09-1, rodada 3 (gpt-6-luna)

- Turno 1, paciente: "meu convênio é a Unimed, vocês cobrem cardiologia?"
- Veio: "A Unimed do Brasil é aceita no hospital, mas não consegui confirmar a cobertura para cardiologia agora. Você pode tentar agendar pelo portal: [portal]. Se aparecer alguma questão de cobertura, me avisa que a equipe te ajuda."
- Esperado: com a GH fora, o modelo literal do Caso 3 (portal, sem negar nem narrar a verificação). O cenário proíbe "não consegui confirmar".
- Ferramentas: `kanban_move_card`, `consultar_especialidades_agenda` (ok, 134 chars), `consultar_convenios_agenda` (erro: "the provider did not answer within 10s"), `kanban_move_card`, `assign_label` (`agendamento-convenio`, ok), `search_knowledge`. Raia pelo trace: AGUARDANDO CONFIRMAÇÃO. Ordem e etiqueta certas.
- Leitura: a GH caiu (o C14-1 da mesma rodada também recebeu "a agenda online não me retornou horários"). A Ana seguiu o Caso 3 inteiro, mas trocou o modelo por uma paráfrase que narra a verificação, o que a própria seção proíbe sem listar essa frase.

### C10-2, rodada 2 (gpt-5.6-luna)

- Turno 1, paciente: "quanto custa a ressonância magnética?"
- Veio: "Não encontrei o valor da ressonância magnética nas informações disponíveis. Posso encaminhar sua solicitação à equipe para confirmar o preço e a disponibilidade?"
- Esperado: a mesma pergunta, mas sem handoff (confere `handoff: false`).
- Ferramentas: `consultar_exames`, `kanban_move_card`, `handoff_to_human`.
- Leitura: a regra 6.B diz só "oferecer encaminhar à equipe". A 6.A, irmã dela, diz "perguntar se pode encaminhar; se o paciente aceitar, seguir a 2.4A". Sem o "se aceitar", o modelo fez a pergunta e a escalada no mesmo turno.

### C26-1, rodada 1 (gpt-5.6-luna)

- Turno 1, paciente: "preciso pegar meu prontuário médico". Veio: orientação completa do 8.2 (e-mail e documentos) mais "Posso te ajudar com mais alguma coisa?".
- Turno 2, paciente: "é para uso pessoal". Veio: a mesma orientação de novo, com o e-mail.
- Esperado: etiqueta `prontuario` (confere `etiquetas`), e-mail no turno 2, sem handoff.
- Ferramentas: nenhuma nos dois turnos ("trace: 0 chamada(s)").
- Leitura: o texto passa; faltou a chamada `assign_label` que a 8.1 manda fazer "ao identificar que o paciente quer solicitar prontuário". Modelo pulando chamada já escrita, o padrão da #19.

### C26-1, rodada 2 (turno 2 no gpt-6-luna)

- Turno 1: orientação completa do 8.2, sem perguntar a finalidade. Ferramentas: `kanban_move_card`, `assign_label`, `search_knowledge`.
- Turno 2, paciente: "é para uso pessoal". Veio: nada em 150 s. Ferramentas: `skip_reply`.
- Esperado: e-mail no turno 2 e a pergunta de encerramento.
- Leitura: a 8.3 diz "dar a orientação do 8.2 uma vez só (sem repetir a mesma orientação no turno seguinte)". Como a Ana já tinha dado tudo no turno 1, no turno 2 obedeceu e calou. O cenário foi escrito supondo que a orientação vem depois da finalidade. O prompt não diz em que turno perguntar a finalidade.

## Pacote de mudanças (proposta, nada aplicado)

1. **Cenário C03-1** (`ana/bancada/cenarios/capacidades.json`, turno 1, `nao_contem`): tirar `"vendemos"`, deixar só `"nosso plano"`. Pedido do Pedro nesta sessão (13/out), anotado para aplicar depois da bateria. Mata a falha da rodada 1 sem mexer no prompt.

2. **Prompt, Seção 6.B (valor de exame particular)**, no lugar de "Se o valor não estiver na tabela (Regra 13): não estimar; oferecer encaminhar à equipe.":
   > Se o valor não estiver na tabela (Regra 13): não informar valor nenhum. Dizer que a equipe confirma o valor e a disponibilidade e perguntar se pode encaminhar. Só se o paciente aceitar, seguir a Seção 2.4A. Não executar `kanban_move_card` para fila humana nem `handoff_to_human` antes da resposta do paciente.
   Mesma frase para a 6.C (estimativa de cirurgia), que hoje diz só "oferecer conectar com a equipe". Mata o C10-2 e protege C10-1, C10-3 e C08.

3. **Prompt, Seção 8.1 (prontuário)**, logo após a linha da etiqueta:
   > No turno em que o pedido de prontuário aparece: executar `assign_label` com tag `prontuario` ANTES da mensagem, e perguntar a finalidade em uma pergunta só ("é para você mesmo, para seguro ou INSS, para um processo judicial, ou para um familiar?"). Não dar a orientação do 8.2 antes de saber a finalidade. A orientação vai no turno em que a finalidade aparece, uma vez só, e termina com a pergunta de encerramento da Seção 11. Nunca `skip_reply` numa resposta do paciente sobre finalidade.
   Alinha o prompt ao que o C26-1 espera (finalidade no turno 1, e-mail no turno 2) e fecha a brecha do `skip_reply`. Alternativa menor: deixar o prompt e aceitar no cenário que o turno 2 traga só a pergunta de encerramento. Recomendo a primeira: a tabela 8.1 só faz sentido se a finalidade for perguntada.

4. **Prompt, Seção 3.2, Caso 3 (agenda sem resposta)**, somar à lista de proibidos: "não consegui confirmar", "não consegui verificar", "não deu para confirmar". E uma linha: "O modelo abaixo é literal: não acrescentar ressalva sobre a cobertura." Mata a forma do C09-1 quando a GH cair de novo. A GH caindo em si não é do prompt.

5. **Prompt, Seção 6.A (valor de consulta particular)**: "A etiqueta `particular-aquecido` vai no mesmo turno em que o paciente pergunta o preço, antes da mensagem, com ou sem valor na tabela e mesmo quando a ferramenta falhar." Mata a parte da Ana no C05-2. Vale conferir se a 6.B e a 6.C precisam da mesma frase para as etiquetas delas.

6. **Fora do prompt, para registro:** a API do Hospital devolveu 502 e 503 às 07:33Z e voltou sozinha; a GH passou de 10 s às 07:38Z. O `smoke-hospital.py` desta manhã reprova só `convenios-especialidade` (HTTP 404), rota que nenhum cenário da bateria usa. E a regra "uma rodada por vez" do ritual vale entre sessões: a fumaça da #20 sobrescreveu a cópia do C05-1 da rodada 2.

7. **Próxima bateria:** rodar as três rodadas no `gpt-6-luna` do começo ao fim, para ter a primeira medida limpa do prompt v7.0 no modelo adotado. Esta v70 é meia a meia.

## Riscos para os cenários que passam

- Mudança 2: cenários C06-2, C06-3 (valor de exame com item na tabela) e C08-1, C08-2 (estimativa com item) não mudam, porque a frase só vale quando a tabela não traz o item. Risco baixo. C10-1 e C10-3 passam a depender do modelo não escalar antes do aceite, que é o que já fazem hoje.
- Mudança 3: C26-1 passa a exigir a pergunta de finalidade no turno 1; o cenário não confere o texto do turno 1, só do turno 2. Se o paciente der a finalidade já na primeira mensagem ("preciso do prontuário para o INSS"), a orientação vai no turno 1 e o encerramento segue; nenhum cenário cobre isso hoje, vale um cenário novo. Risco: o prompt ganha mais uma pergunta obrigatória; manter "uma pergunta por mensagem".
- Mudança 4: C09-2 e C20-1 usam a mesma seção e passaram nas três rodadas com o template; a lista de proibidos não os atinge. C14-1 com a GH fora usa outra mensagem (2.4A). Risco baixo.
- Mudança 5: C05-1 e C05-3 já aplicam a etiqueta hoje; a frase só reforça. Risco baixo.
- Mudança 1: nenhum outro cenário usa "vendemos". Risco nulo.
- Risco geral: o prompt v7.0 está em 63.689 chars; a #25 quer comprimir. Cada frase nova aqui deve entrar junto com a compressão, não antes.
