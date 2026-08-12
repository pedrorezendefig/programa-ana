# Cobrança da massa de homologação (GH-19), atualizada em 12/ago/2026

> Evolução do texto de julho (`roadmap/arquivo/PENDENCIAS.md`, seção 2). O que muda: agora há
> evidência fresca, rodada ao vivo em 06/ago, e a estratégia é o **diretor** endossar o pedido
> depois de ver a demonstração (Ato 2 da página Cadeias). Pedido do hospital anda; pedido de
> fornecedor espera.

## O fato, em uma frase

A API de agendamento WhatsApp da homologação **funciona** (autentica, cria e devolve pacientes
em menos de 1 segundo), mas o **catálogo nunca foi publicado**: especialidades, exames,
convênios e prestadores voltam vazios desde 07/jul, o que bloqueia toda a esteira de
agendamento (horários e finalização inclusive).

## Evidência de 06/ago/2026 (verificável a qualquer momento com `python3 ana/api-mv/scripts/smoke-gh.py`)

| Chamada | Resultado |
|---|---|
| `GET /pessoas` (paciente de teste) | OK, 200 em ~640ms |
| `POST /pessoas` + releitura por CPF e telefone | OK, cadastro criado (id 1685) e relido na hora |
| `GET /consultas`, `GET /exames`, `GET /convenios`, `GET /prestadores` | 200 com lista vazia |
| `GET /agendas/v2` | HTTP 500 (sem catálogo não há agenda) |

## Texto pronto para enviar à Global Health (em nome do hospital)

```
Assunto: Homologação WhatsApp São Matheus: publicação da massa de teste (pendente desde 07/jul)

Prezados,

O Hospital São Matheus está com a integração do agendamento via WhatsApp em
homologação (dem.agenda.globalhealth.mv). A API está funcional do nosso lado:
autenticação, cadastro e busca de pacientes operando.

O que nos bloqueia é a massa de homologação, solicitada em 07/jul e ainda
pendente: GET /consultas, GET /exames, GET /convenios e GET /prestadores
retornam listas vazias, e sem esses cadastros não conseguimos exercitar a
busca de horários (GET /agendas/v2) nem a finalização do agendamento.

Pedimos:
1. Publicar no ambiente de homologação ao menos 1 especialidade de consulta e
   1 exame, com convênio, prestador, agenda e horários disponíveis.
2. Se essa configuração for do lado do hospital (Soul MV), o passo a passo
   para nossa TI executar.
3. Um contato técnico para acompanhar a conclusão.

A direção do hospital acompanha este cronograma e a integração é prioridade
do programa de atendimento digital.

Atenciosamente,
```

## Versão WhatsApp (12/ago/2026, pronta para a Dácilla ou contato equivalente)

Evidência re-testada em 12/ago (mesmo quadro: escrita OK com paciente de teste id 1696, catálogo
100% vazio, /agendas/v2 com 500). Além do pedido da massa, esta versão pergunta as 4 dúvidas de
arquitetura que fecham a GH-18 e a confusão "banco GH vs banco MV":

```
Oi, Dácilla, tudo bem? Sobre a homologação do agendamento WhatsApp do São Matheus (dem.agenda.globalhealth.mv): a API está funcional do nosso lado (autenticação, cadastro e busca de paciente OK), mas seguimos travados na massa de teste, pendente desde 07/jul. GET /consultas, /exames, /convenios e /prestadores retornam vazios, e sem isso não conseguimos testar horários (/agendas/v2 dá erro 500) nem finalizar agendamento.

Preciso de 4 pontos para destravar:

1. Publicar na homologação ao menos 1 especialidade e 1 exame, com convênio, prestador e agenda com horários. Se essa configuração for do lado do hospital (Soul MV), me passa o passo a passo que nossa TI executa.

2. O catálogo da API (consultas, exames, convênios, prestadores) vem configurado aí no ambiente de vocês ou é espelhado do Soul MV do hospital? Quem publica essa massa?

3. Quando o agendamento é finalizado pela API, a gravação no Oracle do hospital é imediata ou roda em rotina batch (fim do dia)? E em homologação, grava na base TST do hospital?

4. Existe algum painel onde a gente consiga visualizar ou cadastrar os dados do ambiente de homologação (pacientes criados pela API, agendas, catálogo)? Hoje testamos às cegas, só pela própria API.

Com isso a gente roda o fluxo completo de ponta a ponta e valida a integração. Consegue me ajudar ou me apontar quem acompanha isso aí? Obrigado!
```

## Como saber que destravou

Rodar `python3 ana/api-mv/scripts/smoke-gh.py`: as linhas de catálogo saem de `VAZIO` para
`OK` com contagem de itens. A página **Cadeias** do Ana OS detecta sozinha (a Cadeia D sai do
estado bloqueado quando `GET /consultas` voltar com itens). Aí é hora da demo 2 ao diretor:
horários reais de cardiologia na tela.
