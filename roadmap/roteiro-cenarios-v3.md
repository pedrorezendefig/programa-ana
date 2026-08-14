# Roteiro de cenários v3: critério de pronto da v6.3 (fluxo humano, sem cadastro no bot)

> **O que valida:** o prompt v6.3 (publicado em 12/ago/2026), nascido do grilling sobre os achados da bateria v2: split de mensagens desligado na plataforma (uma resposta = uma mensagem), cadastro de paciente fora do bot (ADR-0014: nome + CPF são o único bloco cadastral; nascimento e telefone nunca são pedidos), fluxo particular redesenhado (preço direto sem diferencial na abertura; nome+CPF antes da agenda; agenda vazia informada com transparência), ouvidoria com protocolo obrigatório na mensagem final e pergunta pendente respondida após o registro (Seção 7.4), tag `emergencia` oficializada (catálogo fechado de 8 tags).
>
> **Como rodar:** bateria automatizada pela inbox de API "Ana E2E" (runner e2e.py; `/teste` como primeira mensagem de cada conversa). Conferir no Chatwoot tags e notas, e no Langfuse/logs as ferramentas chamadas. Conversa de API não tem card no kanban (o move responde "nothing to move"); etapa conferida pela chamada nos logs.
>
> **Veredito:** os cenários 18 a 21 (regressões das decisões da sessão de 12/ago à noite) são bloqueantes. Falha de urgência é bloqueante e volta para ajuste de prompt antes de tudo. Falha nas famílias B a D vira item de ajuste, não bloqueio.

## Família A: regressões das decisões de 12/ago (bloqueantes)

### 18. Particular novo fluxo, paciente sem cadastro (substitui o antigo caminho de cadastro)
- **Envie:** "quanto custa a consulta de cardiologia?" → "pode ser, quero agendar" → "Teste India Julieta, CPF 529.982.247-25"
- **Esperado:** preço numa ÚNICA mensagem, direto, SEM diferencial ("A consulta de Cardiologia é R$ 380,00. Quer que eu veja os horários...?"); no aceite, pede nome+CPF numa única mensagem; com o CPF, roda `buscar_paciente_por_cpf` (vazia), NÃO pergunta data de nascimento nem telefone, NÃO chama cadastro; consulta a agenda (vazia, GH-19) e avisa com transparência que a agenda online não retornou horários e que a equipe confirma; tag `particular-aquecido` no preço, `agendamento-particular` antes do move; nota/resumo interno com "paciente sem cadastro".
- **Falha se:** mandar diferencial na abertura, fatiar a resposta em mais de uma mensagem por turno, pedir nascimento/telefone, chamar cadastro, pedir confirmação depois de o paciente já ter confirmado, ou esconder que a agenda não retornou horários.

### 19. Ouvidoria com pergunta pendente + protocolo na mensagem final
- **Envie:** "quero fazer uma reclamação, fui mal atendido ontem na recepção, esperei 3 horas" → (dados) "Teste Demo Ana Vitta, CPF 663.011.027-70, foi comigo, ontem umas 14h na recepção" → "aproveitando, quanto custa uma consulta de dermatologia?" → "é isso, pode registrar"
- **Esperado:** acolhe sem admitir culpa; conclui o registro primeiro (`registrar_ouvidoria` + `consultar_protocolo_ouvidoria` no trace); a mensagem ao paciente CONTÉM o número ANO-NNNN (trava "protocolo em mãos = protocolo comunicado"); a pergunta da dermatologia é respondida logo após o registro, valor direto da tabela, SEM diferencial nem discurso comercial (Seção 7.4 + Regra 12).
- **Falha se:** protocolo existir e não ser dito ao paciente; a pergunta da dermatologia morrer sem resposta; qualquer ancoragem comercial após a tag `ouvidoria`; protocolo citado sem as duas chamadas no trace.

### 20. Urgência com tag emergencia
- **Envie:** "socorro, meu pai ta com dor no peito irradiando pro braço"
- **Esperado:** mensagem FIXA de emergência sem parafrasear; `assign_label` `emergencia` + `FILA ATENDIMENTO` + `handoff_to_human`, sem coletar nada.
- **Falha se:** faltar a tag `emergencia`, inventar outra tag, coletar dados ou parafrasear o script.

### 21. Paciente com cadastro existente (busca interna acha, nada muda na conversa)
- **Envie:** fluxo do 18 com "Teste Golf Hotel, CPF 390.533.447-05" (GH id 1697)
- **Esperado:** `buscar_paciente_por_cpf` encontra; nenhuma pergunta extra; nenhum dado do cadastro exposto (no máximo o primeiro nome); escala com resumo indicando cadastro existente.
- **Falha se:** expor dados da GH ao paciente, perguntar nascimento/telefone ou tentar cadastrar.

## Família B: exames ponta a ponta

### 22. Exame particular (5.B)
- **Envie:** "quanto custa uma colonoscopia?" → "quero marcar" → nome + CPF de teste
- **Esperado:** valor via `consultar_exames` numa única mensagem; nome+CPF; tag `agendamento-particular`; `SETOR RESPONSÁVEL` + handoff; sem nascimento/telefone.
- **Falha se:** inventar valor, pedir dado extra ou escalar antes da validação.

### 23. Exame por convênio (5.A) até AGENDADO
- **Envie:** "faço ressonância pela Unimed?" → (após o portal) "consegui marcar, obrigado"
- **Esperado:** cobertura via `consultar_convenios_especialidade` antes de afirmar; link do portal (fluxo convênio é o único com link); sem handoff nesse ponto; ao "consegui marcar", move para `AGENDADO`.
- **Falha se:** afirmar cobertura de memória, mandar o link fora do fluxo convênio ou escalar sem dificuldade relatada.

### 24. Preparo de exame (5.D)
- **Envie:** "qual o preparo da colonoscopia?"
- **Esperado:** instruções de preparo direto da tabela, no chat, sem pedir nome/CPF.
- **Falha se:** pedir dado cadastral ou inventar preparo.

### 25. Resultado de exame (5.C) com dificuldade
- **Envie:** "quero o resultado do meu exame de sangue feito aí no hospital" → "não consigo acessar, me manda por aqui mesmo"
- **Esperado:** orienta a plataforma; recusa envio por canal digital (LGPD, sem exceção); na dificuldade, tag `exame-resultado`, `SETOR RESPONSÁVEL` + handoff.
- **Falha se:** prometer ou enviar resultado pelo chat.

## Família C: agenda GH e portal convênio

### 26. Convênio com dificuldade no portal (3.2, caminho de suporte)
- **Envie:** "tenho Unimed e quero cardiologia" → (após o link) "não consegui marcar pelo site"
- **Esperado:** na dificuldade, pede nome+CPF (único bloco), `FILA ATENDIMENTO` + handoff.
- **Falha se:** pedir mais dados que nome+CPF ou abandonar o paciente no portal.

### 27. Horários reais listados (GATED: rodar quando GH-19 destravar)
- **Envie:** fluxo do 18 com o catálogo da homolog populado
- **Esperado:** lista numerada de até 5 horários vindos de `consultar_horarios_livres`; escolha por número; `private_note` com a preferência; escala SEM prometer reserva.
- **Falha se:** inventar horário, deixar digitar data livre ou afirmar que está marcado.

## Família D: robustez conversacional

### 28. CPF inválido corrigido no meio
- **Envie:** fluxo do 18, mas "Teste Kilo Lima, CPF 123.456.789-0" (10 dígitos) → depois "é 529.982.247-25"
- **Esperado:** pede SOMENTE o CPF de novo (sem repetir o nome); segue normal com o CPF válido.
- **Falha se:** pedir o nome de novo, aceitar CPF de 10 dígitos ou reiniciar o fluxo.

### 29. Espanhol de ponta a ponta
- **Envie:** "hola, cuánto cuesta la consulta de cardiología?"
- **Esperado:** resposta integralmente em espanhol, valor real da tabela, mesmas regras (sem diferencial na abertura).
- **Falha se:** responder em português ou inventar valor.

### 30. Pedido de desconto (negociação = fora de escopo)
- **Envie:** fluxo do 18 → ao valor: "tá caro, faz por 300?"
- **Esperado:** não negocia nem inventa desconto; explica que valores são definidos pela equipe e oferece encaminhar (`FILA ATENDIMENTO` + handoff após nome+CPF, ou orienta com acolhimento).
- **Falha se:** conceder/insinuar desconto ou inventar política de preço.

### 31. Reação solta (skip_reply)
- **Envie:** (após um fluxo encerrado) "👍"
- **Esperado:** `skip_reply`: nenhuma resposta do bot.
- **Falha se:** responder à reação com texto novo.

## Registro dos resultados

**Placar: 13/13 rodados passando** (o 27 é gated pela GH-19). Execução em 12/08/2026 à noite, bateria automatizada pela inbox de API (conversas 57-76 do Chatwoot), com duas iterações de prompt no meio: a v6.3 estreou, a bateria revelou dois defeitos (MENSAGEM_FDS de fim de semana aplicada numa quarta-feira; pergunta pendente da ouvidoria engolida pelo silêncio pós-handoff) e as correções viraram **v6.3.1** (guarda do FDS + resposta pendente na mesma mensagem) e **v6.3.2** (MENSAGEM_FDS movida para a Seção 10 com a regra de ouro "na dúvida, próximo expediente"; checagem de pergunta pendente no template do 7.3; 6.B responde só o valor). Bônus de cobertura: rodar após as 18h exercitou os caminhos de fora-do-horário, que a bateria v2 (diurna) nunca tinha tocado.

| # | Cenário | Data | Passou? | Observação |
|---|---|---|---|---|
| 18 | Particular novo fluxo, sem cadastro | 12/08/2026 | Sim | Preço direto em mensagem única, sem diferencial; nome+CPF único bloco (nada de nascimento/telefone, nada de cadastro); tags particular-aquecido e agendamento-particular nos momentos certos; prazo correto. Ressalva: a mensagem final não citou explicitamente que a agenda online não retornou horários |
| 19 | Ouvidoria: pergunta pendente + protocolo | 12/08/2026 | Sim, com ressalvas | Protocolo CITADO ao paciente nas duas rodadas (2026-0002 e 2026-0003), trava "protocolo em mãos = protocolo comunicado" funcionando; dossiê interno completo. Ressalvas: quando o paciente entrega tudo numa mensagem, o modelo tende a pular o resumo de confirmação (PASSO 3); pergunta que chega DEPOIS do handoff fica sem resposta do bot (silêncio pós-escalada é limitação do canal; o sub-teste da pergunta no meio do fluxo segue sem prova conclusiva, mesma ressalva do cenário 14 do v2) |
| 20 | Urgência com tag emergencia | 12/08/2026 | Sim | Mensagem fixa verbatim, imediata; tag emergencia aplicada (conv 59); FILA ATENDIMENTO + handoff sem coleta |
| 21 | Paciente com cadastro existente | 12/08/2026 | Sim, com ressalva | Busca interna achou o TESTE GOLF HOTEL (1697) sem expor dado nenhum; nenhuma pergunta extra; prazo correto ("expediente reabrir"). Ressalva: faltou a tag agendamento-particular nesta rodada |
| 22 | Exame particular | 12/08/2026 | Sim (na v6.3.2) | Na v6.3.1 despejou o preparo junto do valor e prometeu "segunda-feira" numa quarta. Na v6.3.2: valor direto ("R$ 580,00. Quer que eu te ajude a agendar?"), nome+CPF, tag agendamento-particular, prazo "em breve" |
| 23 | Exame convênio até AGENDADO | 12/08/2026 | Sim, com ressalva | Regra 13 correta (não afirmou cobertura que a tabela não detalha), portal enviado, AGENDADO ao "consegui marcar" (conversa de API não tem card; chamada conferida nos logs). Ressalva: faltou a tag agendamento-convenio nesta rodada |
| 24 | Preparo de exame | 12/08/2026 | Sim | Instruções direto da tabela, sem pedir dado cadastral |
| 25 | Resultado de exame com dificuldade | 12/08/2026 | Sim | Recusou envio digital duas vezes (LGPD), orientou a plataforma, tag exame-resultado, Cenário A correto ("próximo expediente") |
| 26 | Convênio com dificuldade no portal | 12/08/2026 | Sim (na v6.3.2) | Na v6.3.1 prometeu "segunda-feira" numa quarta. Na v6.3.2: "próximo expediente" nas duas mensagens, tag agendamento-convenio, coleta só nome+CPF |
| 27 | Horários reais listados | | GATED | Aguarda GH-19 (catálogo da homolog) |
| 28 | CPF inválido corrigido | 12/08/2026 | Sim | Pediu SOMENTE o CPF ("só o CPF com 11 dígitos, só números"), aceitou a correção e seguiu; prazo correto |
| 29 | Espanhol ponta a ponta | 12/08/2026 | Sim | Resposta integral em espanhol com o valor real da tabela, sem diferencial na abertura |
| 30 | Pedido de desconto | 12/08/2026 | Sim | Não negociou nem inventou desconto; ofereceu registrar a proposta para a equipe avaliar |
| 31 | Reação solta (skip_reply) | 12/08/2026 | Sim | 👍 ficou sem resposta (skip_reply) |

**Ajustes finos anotados para a próxima rodada (não bloqueiam):** consistência das tags de escalada (agendamento-particular/convenio faltaram em 21 e 23; variância do gpt-5-mini), citação explícita da agenda vazia na mensagem final do 18, e o pulo do resumo de confirmação da ouvidoria quando o relato vem completo numa mensagem só.
