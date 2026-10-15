---
status: accepted
date: 2026-08-26
---

# ADR-0025: a cobertura de convênio vem da agenda online, não de tabela curada

- **Data:** 26/ago/2026
- **Estado:** aceita
- **Contexto de origem:** sessão do dia em que a massa de homologação apareceu (V31) e a vitrine de horários da V15 foi destravada.

## Contexto

Até hoje a Ana respondia "o convênio X cobre a especialidade Y?" lendo uma tabela curada à mão pela
secretária, no módulo `/admin/dados-atendimento` do app do hospital, via a tool 4
`consultar_convenios_especialidade` (`GET /api/ana/convenios`).

Com a agenda de Cardiologia publicada na homologação da Global Health, ficou provado que a própria
API da GH responde essa pergunta, filtrada por especialidade:

```
GET /convenios?idItemAgendamento=1843&size=100   -> 200, 32 convênios
GET /convenios?idItemAgendamento=1               -> 200, 0
GET /convenios?idItemAgendamento=1842            -> 200, 0
GET /convenios?idItemAgendamento=999999          -> 200, 0
GET /convenios                (sem o parâmetro)  -> 200, 0
```

A lista é escopada pelo item agendável. Não é uma lista geral do hospital: é a lista de quem é aceito
naquela especialidade. O mesmo vale para `GET /prestadores?idItemAgendamento=`.

As duas fontes já divergiam. A tabela curada tinha **Amil**, **Golden Cross** e **Hapvida**; nenhum dos
três aparece nos 32 convênios da agenda de Cardiologia. Uma das duas estava mentindo ao paciente, e a
que decide se o agendamento acontece é a da agenda.

## Decisão

**A agenda online da Global Health passa a ser a fonte única de cobertura de convênio por especialidade.**

1. A tool 4 `consultar_convenios_especialidade` sai do grant do agente 1. A definição fica preservada,
   como foi feito com a tool 7 no ADR-0014.
2. A Seção 3.2 do prompt (`ana/prompt/bloco-orquestradora.md`) passa a rodar os dois primeiros elos da
   cadeia da Seção 2.3.1 e a decidir por três casos:
   - **convênio na lista** → a Ana segue a cadeia e entrega horário, igual ao fluxo particular, com a
     tag `agendamento-convenio`. O portal não é citado.
   - **convênio fora da lista** → não atendemos aquele convênio naquela especialidade; oferecer particular.
   - **especialidade não publicada na agenda** (`conteudo` vazio, item bloqueado ou falha) → não afirmar
     nem negar a cobertura; `search_knowledge` só para saber se o convênio é aceito no hospital em geral,
     e mandar ao portal, como era antes.
3. A tabela de convênios por especialidade some do app do hospital, junto com o endpoint
   `GET /api/ana/convenios`. Prompt de execução em `ana/api-hospital/pedido-espelho-gh.md`.
4. No lugar dela, uma tela **somente leitura** que espelha ao vivo o que a Global Health publica
   (o Espelho da Global Health), com o token de homologação no backend e nada gravado em banco.

## Consequências

**Ganhos**

- Uma verdade só. A divergência entre a tabela e a agenda deixa de existir por construção.
- Morre uma classe inteira de bug: o caso "convênio aceito mas cobertura não detalhada" (a dor da v6.6)
  não existe mais, porque ou o convênio está na lista ou não está.
- O paciente de convênio ganha horário na conversa. Antes ele só recebia o link do portal.

**Perdas, assumidas**

- A coluna `observacao` da tabela curada não tem equivalente na Global Health. Texto como
  "Cobre consultas. Exames de alta complexidade sujeitos a autorização." deixa de ser dito.
  Por isso o prompt do app manda dumpar a tabela antes do drop: o texto é conteúdo escrito por gente e
  perdê-lo é irreversível. Se fizer falta, volta como uma tabela só de observação, e só depois de fazer
  falta de verdade. Guardar "por precaução" é o caminho de volta para a divergência que este ADR mata.
- A cobertura passa a depender da disponibilidade da API da Global Health. O Caso 3 é a rede de
  segurança: sem resposta da agenda, o comportamento antigo (portal) continua valendo.

**Ressalvas honestas registradas**

- Só existe **uma** especialidade publicada na homologação (id 1843). O escopo por item foi provado
  pelo negativo (id diferente devolve zero), não pela comparação entre duas especialidades reais.
  Publicar um segundo item no Painel fecha essa prova.
- Por decisão do Pedro, a homologação é tratada como se fosse produção. A conferência das duas listas
  em produção fica para quando a virada de ambiente for pauta.

## Alternativa descartada

Espelhar os convênios da Global Health de volta para o app do hospital, criando uma cópia sincronizada.
Descartada por duas razões: a API da GH **não tem endpoint de escrita de convênio** (só
`GET /convenios`, `GET /convenios/{id}/planos` e `GET .../subPlanos`), e uma cópia sincronizada é
exatamente o mecanismo que produziu a divergência que este ADR está consertando.

## Pergunta aberta que nasce daqui

`GET /convenios/{idConvenio}/planos` devolve muitos planos para convênio real (Unimed Do Brasil veio
com 10 na primeira página, e mais páginas atrás). Hoje a Ana escolhe o primeiro plano sem perguntar ao
paciente. Nos testes desta sessão o `idPlano` **não** alterou os horários devolvidos, mas isso foi
medido numa base com uma agenda só. A pergunta "o `idPlano` filtra a disponibilidade, e o que fazer
quando o paciente não sabe o plano dele?" entra em `ana/api-mv/perguntas-global-health.md`.
