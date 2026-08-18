---
status: accepted
date: 2026-08-18
amends: 0010, 0015
---

# O protocolo da ouvidoria vem do POST, e o elo com a conversa inverte de direção

Decisão do Pedro (18/ago/2026, sessão de grilling): na fase 2 do ADR-0015, a Ana passa a informar ao paciente o número que o `POST /api/ana/ouvidoria/protocolos` já devolve, em uma única chamada. A trava dura das DUAS chamadas (R2 grava, R3 lê), nascida na v6.2, é aposentada porque a causa dela desapareceu com a troca de fonte. Na mesma sessão, o campo `conversa_id` sai do body da tool 11 e o vínculo entre o índice e o dossiê passa a existir só na direção inversa.

## Contexto

- O ADR-0010 desenhou o protocolo na tabela `5_Ouvidoria_Protocolos` do NocoDB. Ali o POST devolvia apenas o `Id`: o campo `Protocolo` era coluna de fórmula, calculada depois da gravação. Ler de volta era o **único** caminho possível para ter o número.
- A trava dura da v6.2 ("a frase só pode ser enviada se `registrar_ouvidoria` E `consultar_protocolo_ouvidoria` tiverem sido de fato executadas") nasceu de uma alucinação real flagrada em 12/ago: em 1 de 4 provas o modelo pulou as duas chamadas e inventou "protocolo 2026-0123". A garantia que a trava dá não é o número de chamadas: é a exigência de que o número seja **cópia literal de um campo devolvido por ferramenta**.
- No Hospital Reuniões o número é gerado pelo banco (sequence + coluna gerada, migration `063`) e o endpoint devolve a linha inteira já gravada, com o campo `protocolo` pronto (`app/routers/ana.py`, `registrar_protocolo`). Um POST bem-sucedido já entrega tudo o que o R3 iria buscar.
- O `GET /api/ana/ouvidoria/protocolos/{protocolo}` consulta por ANO-NNNN, não por id, e não existe consulta por id nem listagem em `/api/ana/*`. A tool 12 não tem como continuar sendo o passo R3 sem receber do R2 o próprio número que ela iria confirmar.
- A tool 11 mandava `Conversa_Id: {{conversation_id}}` no body. A pesquisa no código-fonte da 1.4.1 (`ana/plataforma/pesquisa-contact-phone-http-tools.md`) mostra uma **lista fechada de 10 variáveis** de contexto interpoláveis no body, e `conversation_id` não está nela. Nome fora da lista vira string vazia em silêncio. Os 3 registros de teste do NocoDB saíram com `Conversa_Id` nulo por isso, e não por serem do playground: o achado da V19 estava certo no fato e errado na causa.
- A única variável da lista que serviria de identificador é `{{contact_phone}}`. Telefone é dado pessoal e violaria a invariante índice-não-dossiê (ADR-0010; ADR-0015 decisão 6).
- A tabela de produção nasceu vazia e a sequence em 1 (conferido em 18/ago). Os 3 protocolos do NocoDB (2026-0001 a 0003) são de teste da bateria v2 e o texto deles parece manifestação real: migrar as linhas encheria o painel `/ouvidoria` da diretoria de reclamações que nunca aconteceram.

## Decisão

1. **Uma chamada.** A Seção 7.3 passa a informar ao paciente o campo `protocolo` da resposta de `registrar_ouvidoria`. O PASSO R3 de leitura deixa de existir.
2. **Trava dura reancorada, não removida.** A regra continua, com o mesmo peso, mudando só a âncora: a frase "registrada com o protocolo" só pode ser enviada se `registrar_ouvidoria` foi de fato executada nesta conversa e o número for cópia literal do campo `protocolo` que ela devolveu. Sem esse campo, protocolo não existe e vale a mensagem sem número.
3. **Tool 12 muda de papel.** Deixa de ser passo do registro e vira consulta por ANO-NNNN, para o paciente que volta citando o número. Resposta mínima e segura: confirma que a manifestação existe, informa data de abertura e prazo, e escala para humano. A Ana **não** lê o resumo de volta e **não** informa o `status`: "respondido" no painel significa que a equipe interna fechou o caso, não que o paciente foi contatado, e dizer isso a quem nunca recebeu retorno é dano.
4. **O `conversa_id` sai do body.** Campo que sempre chegou vazio e lia como se funcionasse. A tool 11 manda `categoria`, `setor` e `resumo`.
5. **O elo índice-dossiê inverte.** Depois do registro, a Ana grava uma nota interna com o número do protocolo. Quem está no painel `/ouvidoria` lê o número e busca por ele no Chatwoot. A ponte vive dentro da conversa, não dentro do índice.
6. **Continuidade sem herança de teste.** Nenhuma das 3 linhas do NocoDB é migrada. Só a sequence é adiantada (`setval` para 3), então o primeiro registro real nasce `2026-0004`. Nenhum número se repete e o painel do hospital nasce limpo. O buraco 0001-0003 não tem dono real que possa consultá-lo.

## Considered options

- **Manter as duas chamadas por paridade e segurança:** rejeitado. O R3 leria de volta um número que o R2 já entregou, o que não protege contra invenção (a proteção é ser cópia literal de campo de ferramenta, e o R2 já satisfaz). Em troca, cria uma falha nova: R3 com 404 ou timeout depois de uma gravação bem-sucedida faria a Ana calar um número que existe no banco, violando a regra "protocolo em mãos = protocolo comunicado" da v6.3.
- **Migrar as 3 linhas de teste e rodar o `setval`:** rejeitado. Cumpre o ADR-0015 decisão 7 ao pé da letra, mas o painel é lido pela diretoria e pelas secretárias, e os resumos de teste ("paciente relata que esperou cerca de 3 horas na recepção") seriam lidos como manifestações reais. A decisão 7 fala em manter consultáveis os números **já informados a pacientes**; nenhum desses três foi.
- **Não fazer nada com a numeração:** rejeitado. A sequence nasce em 1 e o próximo registro real seria `2026-0001`, número já dito numa conversa da bateria.
- **Preencher `conversa_id` com `{{contact_phone}}`:** rejeitado. É a única variável da lista fechada que identifica alguém, e é justamente dado pessoal. Quebra a invariante índice-não-dossiê.
- **Tool 12 informando o `status` ao paciente:** rejeitado, ver decisão 3.

## Consequências

- A Seção 7.3 encurta: R1 nota do dossiê, R2 grava e já traz o número, R3 nota com o número, mensagem ao paciente. Uma chamada de rede a menos por registro e uma janela de falha a menos entre a gravação e a fala.
- Nasce a Seção 7.5 (paciente que volta com protocolo), fluxo que não existia no prompt.
- A regra "uma gravação por conversa" fica mais fácil de cumprir: em dúvida se gravou, a Ana consulta pelo próprio número que recebeu, nunca grava de novo.
- O `{{conversation_id}}` some do repertório: qualquer tool futura que precise ligar registro e conversa tem que usar a direção inversa ou uma variável da lista fechada de 10.
- O ADR-0010 fica emendado em dois pontos: o "condicional do `Conversa_Id`" que a V16 dera por resolvido a favor estava errado, e a leitura em duas etapas era artefato do NocoDB, não requisito de segurança.
- O `setval` é gesto manual do Pedro no SQL Editor do Supabase Studio. Não há caminho de API para ele em `/api/ana/*`, por desenho.
