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

| Elo | Chamada | Estado hoje |
|---|---|---|
| D1 | `GET /consultas` (especialidades) | 200 com lista vazia: **sem `idConsulta`, nada a jusante anda** |
| D2 | `GET /prestadores` | Roda ao vivo; 200 com lista vazia (GH-19) |
| D3 | `GET /convenios` (+`/planos`) | Bloqueado por D1 (e vazio ele próprio) |
| D4 | `GET /agendas/v2` (horários livres) | Sem os ids dos elos anteriores devolve HTTP 500 "Erro interno" |
| D5 | `GET /horarios/{id}/instrucoes` | Bloqueado: sem horário escolhido |
| D6 | `GET /consultas/tipos?idAgenda` | Bloqueado: sem idAgenda a API devolve 500 (provado na sessão) |
| D7 | `POST /horarios/agendar` (a finalização) | Nunca roda da página; é onde a Prova no banco e a GH-18 vivem |

A cadeia D destrava no dia em que a Global Health publicar a massa de homologação (GH-19,
pedida desde 07/jul; cobrança atualizada em `cobranca-massa-homolog.md`). A página Cadeias
detecta sozinha: quando o D1 voltar com itens, os elos seguintes saem do estado bloqueado.

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
