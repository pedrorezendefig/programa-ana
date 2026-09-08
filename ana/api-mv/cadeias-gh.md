# Cadeias da API GH (homologação): as histórias encadeadas e o que cada uma prova

> Documento de referência da página **Cadeias** do Ana OS (`os/cadeias.html`). Uma cadeia é uma
> sequência de chamadas em que a resposta de um elo alimenta o seguinte, contando uma história
> real do hospital. Diferente da bancada (endpoint solto), a cadeia prova o encadeamento.
> Ambiente: SOMENTE homologação (`dem.agenda.globalhealth.mv`). Produção jamais.

## Por que cadeias

Uma resposta 200 solta não prova nada: mock devolve 200. O que prova um sistema vivo é a
**consequência encadeada**: o que eu crio num POST aparece no GET seguinte; o id que um GET
devolve é aceito pelo POST dependente; um dado incompleto é recusado com a regra de negócio
certa. As seis cadeias abaixo cobrem os **22 endpoints** do catálogo da API de agendamento
WhatsApp (Mapa das APIs do Ana OS); os elos que a GH-19 seca aparecem como bloqueados e
destravam sozinhos quando a massa for publicada. Na página, cada elo executado expõe por
clique o **payload enviado** (método, path, query, body) e a **resposta crua**; os dados
mocados de escrita são regenerados aleatoriamente a cada execução (CPF, telefone, nascimento,
sexo), sempre com o nome-prefixo `TESTE DEMO ANA VITTA`.

## Cadeia A: paciente novo chega pelo WhatsApp

A prova de criação com releitura. Executável hoje, de ponta a ponta.

| Elo | Chamada | O que prova |
|---|---|---|
| A1 | `GET /pessoas?cpf=<sintético>` | Fotografia do antes: 0 encontrados |
| A2 | `POST /pessoas` (nome TESTE DEMO ANA VITTA) | A API aceita o cadastro e devolve o id na hora |
| A3 | `GET /pessoas?cpf=<o mesmo>` | O cadastro que não existia segundos antes agora volta completo |
| A4 | `GET /pessoas?telefone=<o mesmo>` | O caminho da Ana no WhatsApp: achar o paciente pelo número que conversa |
| A5 | `GET /agendamentos?cpf=<o mesmo>&tipoAgendamento=CONSULTA` | Coerência: paciente novo tem histórico vazio (200 com lista vazia é o certo) |

Regras da demo: CPF **sempre sintético** (gerado com dígito verificador válido, nunca real),
nome sempre `TESTE DEMO ANA VITTA`. Não existe DELETE de pessoas na API: cada execução deixa
1 cadastro de teste no banco SaaS da GH (inofensivo por definição; o sonda vive lá desde julho).

## Cadeia B: paciente conhecido (o sonda)

Persistência: o que foi criado há um mês continua lá.

| Elo | Chamada | O que prova |
|---|---|---|
| B1 | `GET /pessoas?cpf=66301102770` | O paciente-sonda (id 1681, criado 07/jul) volta íntegro |
| B2 | `GET /carteiras?cpf=<sonda>` | 200 com lista vazia: nunca criamos carteira para ele (coerente) |
| B3 | `GET /agendamentos?cpf=<sonda>` | 200 com lista vazia: nunca finalizamos agendamento (coerente) |

## Cadeia C: convênio e carteiras (a árvore inteira, e a API validando)

O fluxo certo: `GET /convenios` → `GET /convenios/{id}/planos` → `.../subPlanos` →
`POST /carteiras` → `DELETE /carteiras/{id}`. Hoje a raiz está **seca** (GH-19), então os
níveis da árvore ficam bloqueados e a cadeia prova que a API **valida de verdade**:

| Elo | Chamada | Estado hoje |
|---|---|---|
| C1 | `GET /convenios` | 200 com lista vazia (massa não publicada: GH-19) |
| C2 | `GET /convenios/{idConvenio}/planos` | Bloqueado: sem idConvenio real |
| C3 | `GET .../planos/{idPlano}/subPlanos` | Bloqueado: sem idPlano real |
| C4 | `POST /carteiras` deliberadamente incompleto | **HTTP 417** com a regra de negócio: `nrCarteira é obrigatório.` Um mock aceitaria qualquer coisa |
| C5 | `DELETE /carteiras/{id}` | Bloqueado: sem carteira criada não há id para excluir |

Achado de campo (06/ago/2026): o campo se chama **`nrCarteira`** (não `numeroCarteira`), e o
formato de erro é o `{"mensagens":[{"tipo":"ERROR",...}]}` já visto no smoke de 07/jul.

Segundo achado de validação (06/ago/2026, no `POST /pessoas`): **o nome não pode conter
números** (HTTP 417 "O nome da pessoa não pode conter números."). Por isso a variação dos
nomes de teste da página usa o alfabeto fonético (TESTE DEMO ANA VITTA ALFA, BRAVO, ...),
nunca sufixo numérico. Relevante para a Ana em produção: nome vindo do WhatsApp precisa de
sanitização antes do cadastro.

## Cadeia D: agendar consulta (a vitrine, bloqueada no elo 1)

O fluxo completo da documentação: especialidade → prestadores → convênio → horários →
instruções e tipo → finalização.

| Elo | Chamada | Estado em 26/ago/2026 |
|---|---|---|
| D1 | `GET /consultas?pesquisa=CARDIOLOGIA` | **OK**: item `1843, Consulta Cardiologica`, `bloqueado: false` |
| D2 | `GET /prestadores?idItemAgendamento=1843` | **OK**: 4 prestadores (21 Amanda, 51 Charles, 140 Norvandia, 160 Ricardo) |
| D3 | `GET /convenios?idItemAgendamento=1843&size=100` | **OK**: 32 convênios, `Particular` no id 3 |
| D3b | `GET /convenios/3/planos?idItemAgendamento=1843` | **OK**: Particular Apartamento (2), Particular Enfermaria (1) |
| D4 | `GET /agendas/v2` com os **três** ids | **OK**: 4 horários, 3 agendas (990, 994, 1010), 2 dias (27 e 28/08) |
| D5 | `GET /horarios/{id}/instrucoes` | Nunca exercitado; agora tem idHorario real para tentar |
| D6 | `GET /consultas/tipos?idAgenda=1010` | Nunca exercitado; agora tem idAgenda real para tentar |
| D7 | `POST /horarios/agendar` (a finalização) | Nunca roda da página; é onde a Prova no banco e a GH-18 vivem |

**A cadeia D destravou em 26/ago/2026 (V31), e não foi a Global Health que destravou.** A agenda de
Cardiologia já estava cadastrada; o que faltava era o botão do médico ligado na tela
`Agenda > Itens Agendamento` do Painel de Controle de homologação. Prova de que o botão é o mecanismo:
o D2 devolve exatamente os prestadores que estão ligados na tela, e nenhum dos desligados. Provado duas
vezes no mesmo dia: com dois botões ligados a API devolvia 2 prestadores e 2 horários; o Pedro ligou
Norvandia (140) e Ricardo (160) na tela e a API passou a devolver **4 prestadores, 4 horários, 3 agendas
e 2 dias**, sem nenhuma outra mudança. Charles (51) segue publicado e **sem horário livre**: estar na
tela publica o médico, ter horário depende da escala no SoulMV.

### O contrato do D4, medido a duro

- `/agendas/v2` exige os **três** parâmetros: `idItemAgendamento`, `idConvenio` e `idPlano`. Faltando
  qualquer um, HTTP 500 "Erro interno". Com o parâmetro presente mas **vazio**, 500 igual.
- **Id inexistente NÃO dá erro.** `idConvenio=999` ou `idPlano=999` responde HTTP 200 com
  `agendas: []`, indistinguível de "sem horário livre". A única defesa é nunca chamar com id que não
  veio do elo anterior.
- Opcionais que funcionam: `idPrestador` e `dataInicial`. A janela padrão é de 14 dias
  (`diasPesquisados: 14`), com `dataPaginaSeguinte` para avançar.
- Resposta aninhada: `agendas[]` → `prestadores[]` → `horarios[]`.

### O D3 responde cobertura, e isso virou decisão (ADR-0025)

`GET /convenios` é escopado pelo item agendável, ou seja, pela especialidade:

```
idItemAgendamento=1843     -> 32 convênios
idItemAgendamento=1        -> 0
idItemAgendamento=1842     -> 0
idItemAgendamento=999999   -> 0
(sem o parâmetro)          -> 0
```

Por isso a Ana deixou de ler a tabela curada do app do hospital para responder cobertura de convênio:
a agenda online é a fonte, e as duas já divergiam (a tabela tinha Amil, Golden Cross e Hapvida, que a
agenda de Cardiologia não tem). Ver `docs/adr/0025-cobertura-de-convenio-vem-da-agenda-online.md`.

## Cadeia E: agendar exame (triagem, instruções e anexos)

O que o exame tem que a consulta não tem: triagem que pode **impedir** o agendamento
(`impedeRealizacao = S` escala para humano), preparo, e anexos que sobem para o S3 da GH.

| Elo | Chamada | Estado hoje |
|---|---|---|
| E1 | `GET /exames` | 200 com lista vazia (GH-19): sem `idExame`, nada a jusante |
| E2 | `GET /exames/perguntas` | Bloqueado: exige idExame |
| E3 | `GET /exames/instrucaoGeral` | Bloqueado: exige idExame |
| E4 | `POST /anexos/agendamento` (anexos exigidos) | Bloqueado: exige o contexto do agendamento |
| E5 | `POST /anexos/upload` | Bloqueado: escrita no SaaS GH, exige anexo exigido e URL pública |
| E6 | `POST /horarios/agendar` | Nunca roda da página (finalização) |

## Cadeia F: gerir o que foi agendado

| Elo | Chamada | Estado hoje |
|---|---|---|
| F1 | `GET /agendamentos?cpf&tipoAgendamento=CONSULTA` | Roda ao vivo; enum exige CAIXA ALTA (minúsculo = 500) |
| F2 | `GET /agendamentos/{id}` | Bloqueado: lista vazia, sem id para detalhar |
| F3 | `POST /horarios/reagendar` | Nunca roda da página (finalização, grava no Oracle) |
| F4 | `DELETE /agendamentos/{id}` (cancelar) | Nunca roda da página (finalização, grava no Oracle) |

## Evidência empírica de 06/ago/2026 (rodada pela sessão, ao vivo)

- Auth e leitura OK: sonda encontrada em ~640ms; `GET /agendamentos` 200.
- Catálogo AINDA vazio: `/consultas`, `/exames`, `/convenios`, `/prestadores` com `conteudo: []`.
- `/agendas/v2` e `/consultas/tipos` sem parâmetros de elo anterior: HTTP 500.
- Cadeia A completa: CPF sintético 31560741449 criado como **id 1685** (`TESTE CADEIA ANA VITTA`),
  relido por CPF e por telefone no segundo seguinte; agendamentos do novo vazios como esperado.
- Cadeia C: 417 `nrCarteira é obrigatório.` ao POST incompleto.
- Placar: 9 chamadas OK, 2 vazios esperados, 1 recusa correta, 1 cadeia bloqueada por pendência externa.
- Pacientes de teste nossos na homolog: 1681 (sonda, 07/jul), 1685 (cadeia via sessão, 06/ago),
  1686 (ensaio da página no Chrome, 06/ago) e 1688 (prova do fix do nome sem números, 06/ago).

## Redesenho de 08/set/2026: elo a elo, com a conversa da Ana ao lado (ADR-0027)

A página passou a responder "como a Ana achou isso" e não só "funcionou". Cada elo tem botão próprio
("Rodar elo"), o contexto da cadeia sobrevive entre cliques (o elo 4 só destrava com os três ids dos
elos 1 a 3), a **entrada** lista cada campo com o valor, de qual elo veio e por quê, e a **saída**
lista o que segue e para qual elo. A coluna direita de cada elo é a **conversa da Ana pareada**:
paciente, ferramentas chamadas (selo de origem; "não tem" onde a Ana não pode chamar) e a mensagem
dela, montada com a resposta real quando dá (a lista numerada do `/agendas/v2`). Elos "só conversa"
cobrem o que sai da Global Health (preço na API do Hospital, handoff). Os quatro elos da Seção 2.3.1
são funções compartilhadas entre a Cadeia C (convênio pelo nome, ADR-0025) e a Cadeia D (particular).

### A conversa real que a Cadeia D reproduz (Telegram, 08/set/2026, conversa 148 na plataforma)

| Turno | Chamada | Entrada | Saída que seguiu |
|---|---|---|---|
| 11:31 | `consultar_precos_consultas` (API do Hospital) | `especialidade=Cardiologia` | R$ 380 |
| 11:32 | `buscar_paciente_por_cpf` | CPF do Pedro | vazio (sem cadastro; a Ana seguiu) |
| 11:33 | `consultar_especialidades_agenda` | `pesquisa=CARDIOLOGIA` | `id 1843` Consulta Cardiologica |
| 11:33 | `consultar_convenios_agenda` | `idItemAgendamento=1843` (size 100) | 33 convênios; escolhido `Particular` id 3 |
| 11:33 | `consultar_planos_convenio` | `idConvenio=3`, `idItemAgendamento=1843` | `Particular Apartamento` id 2 (o primeiro) |
| 11:33 | `consultar_horarios_livres` | `1843`, `3`, `2` | 3 horários, janela 24/09 a 07/10 (14 dias, padrão da GH) |

Cinco chamadas à Global Health, uma à API do Hospital, uma nativa (`assign_label`), 21 segundos entre
a primeira e a última do turno de agenda. A janela de 14 dias não é escolha da Ana: a tool 9 não manda
data, a GH decide (`diasPesquisados: 14`, `dataPaginaSeguinte` para avançar). O plano id 2 é a regra
da tool 14 ("o primeiro da lista"), não uma escolha do paciente.

### Estado dos endpoints em 08/set/2026 (medido pela página e por sonda direta)

- `/consultas?pesquisa=CARDIOLOGIA`: OK, item 1843. `ORTOPEDIA`: vazio (só Cardiologia publicada).
- `/prestadores?idItemAgendamento=1843`: 4 publicados (21 Amanda, 51 Charles, 140 Norvandia, 160 Ricardo).
- `/convenios?idItemAgendamento=1843&size=100`: **33** (o registro de 26/ago dizia 32). Duas linhas com
  `particular = true`: `Particular` (3) e `Funcionario` (46). A descrição da tool 13 fala "a linha" no singular.
- `/convenios/3/planos`: Particular Apartamento (2, ordem 1), Particular Enfermaria (1). `subPlanos`: vazio.
- `/agendas/v2` com os três ids: 3 horários (Norvandia 24/09 09:28 e 29/09 08:16; Amanda 25/09 08:56).
- `/consultas/tipos?idAgenda=1772`: OK, CONSULTA SUBSEQUENTE (15) e PRIMEIRA CONSULTA (1). Primeira vez exercitado com id real.
- `/horarios/44585/instrucoes`: **HTTP 500 com idHorario real** ("Erro interno"). Achado novo: endpoint quebrado
  ou sem instrução cadastrada. Pergunta para a Global Health.
- `/exames` (com e sem `pesquisa`): vazio. A agenda de exames está como a de Cardiologia estava antes de 26/ago:
  falta cadastrar no Soul TST e ligar no Painel GH.
- `/agendamentos?cpf=<sonda>&tipoAgendamento=CONSULTA`: vazio (nunca finalizamos).

### Perguntas em aberto que a página deixa à mostra

1. Por que a janela do `/agendas/v2` começa em 24/09 e não hoje? Antecedência mínima do Painel, ou primeiro dia com vaga? (GH)
2. O `/horarios/{id}/instrucoes` deveria responder algo com id real? (GH)
3. Plano padrão do particular: perguntar ao paciente (Apartamento ou Enfermaria) ou fixar? (programa; hoje "o primeiro da lista")
4. Trocar na tool 13 "a linha cujo campo particular é verdadeiro" por "a linha de nome Particular" (Funcionario também tem a marca).

## Prova da finalização, 08/set/2026: a API recusa agendar com qualquer convênio (HTTP 417)

Ato deliberado, autorizado pelo Pedro na sessão de 08/set, rodado pelo proxy `/api/gh` do Ana OS (o
mesmo caminho da Bancada), na homologação, com o paciente-sonda (66301102770, id 1681). Primeira vez
que o `POST /horarios/agendar` foi chamado neste programa.

Cadeia montada ao vivo antes da escrita: item 1843 → convênio Particular 3 → plano Apartamento 2 →
`/agendas/v2` com 3 horários → `/consultas/tipos?idAgenda=1772` com PRIMEIRA CONSULTA (id 1).
Foto do antes: `GET /agendamentos?cpf=<sonda>&tipoAgendamento=CONSULTA` vazio.

| Tentativa | Convênio / plano | Horário | Resultado |
|---|---|---|---|
| 1 | Particular (3) / Apartamento (2) | 44585, Norvandia 24/09 09:28 | **417** "Não é possível agendar com o convênio escolhido" |
| 2 | Particular (3) / Enfermaria (1) | 44585 | **417**, mesma mensagem |
| 3 | Unimed Do Brasil (8) / Alfa (1), `nrCarteira` 1234567890 | 44585 | **417**, mesma mensagem |

Foto do depois: lista continua vazia. Nada foi gravado. Não houve o que cancelar.

O que isso diz: **todos os campos obrigatórios do body a cadeia já produz** (`cpf`, `idItemAgendamento`,
`idConvenio`, `idPlano`, `idHorario`, `idTipoMarcacao`; `idSubPlano` nulo porque o Particular não tem;
`nrCarteira` só para convênio; `respostas` e `anexos` só para exame). O bloqueio não é dado que falta,
é configuração do lado da Global Health ou do Soul: o `/agendas/v2` oferece o horário para o convênio e
o `/horarios/agendar` recusa o mesmo convênio. Hipótese principal, lida no tutorial oficial da MV (`tutorial-agenda-online-gh.pdf`, pág. 3): as agendas de
Cardiologia do Soul TST **não têm convênio na aba Convênio** do Cadastro de Agendas, e a flag "Exibir agendas
que não tem convênio associado" do Backoffice GH faz o `/agendas/v2` mostrar horário mesmo assim; a finalização
exige o vínculo e recusa. A correção é no Soul (analista de TI): adicionar PARTICULAR e UNIMED DO BRASIL na aba
Convênio das agendas, com plano permitindo atendimento Ambulatorial e a empresa do hospital cadastrada no plano.
Virou a pergunta 24 de `perguntas-global-health.md` e o Passo 0 de `prompt-agendamento-fim-a-fim.md`.

Armadilha encontrada no mesmo dia: no Painel GH, dentro da agenda (Itens Agendamento > Consulta Cardiologica >
agenda da Norvandia), a aba **"Convênios e planos" é uma lista de PROIBIDOS** ("serão proibidos para esta agenda").
O Pedro adicionou Particular e Unimed ali achando que era o De/Para, e removeu em seguida. Essa lista precisa ficar vazia.
