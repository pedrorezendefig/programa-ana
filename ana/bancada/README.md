# Bancada de cenários da Ana

O aparato que prova, contra o canal real, o que a Ana fala e de onde vem o que ela fala.
Termo no `CONTEXT.md`: **Bancada de cenários** (não confundir com a *bancada da API*, que é
página do Ana OS).

## Os scripts

| Nível | Script | O que prova |
|---|---|---|
| 1. Contrato | `ana/api-hospital/scripts/smoke-hospital.py` | a API responde, o formato bate e cabe nos 4.000 chars |
| 3. Conversa | `ana/bancada/e2e.py` | os cenários ponta a ponta, pela inbox de API do Chatwoot |

O Divergímetro (nível 1.5) comparava o app com a fonte antiga e morreu com a migração
(ADR-0032): está em `ana/bancada/arquivo/`, como acervo.

## Os arquivos de cenários

| Arquivo | O que tem |
|---|---|
| `cenarios/capacidades.json` | os testes de cada capacidade do Ana OS (`os/dados/comparacao.json`), um cenário por teste, com id `<capacidade>-<n>` (ex.: `C05-1`). Cada turno declara o caminho `nos` no Mapa do SOP e o `espere` em texto; a máquina confere só etiqueta, raia, handoff, ferramenta e frases proibidas. |
| `cenarios/integracao.json` | os cenários das famílias A a E da integração com o app do hospital, hoje ligados como testes das capacidades da Base Ana e da Ouvidoria. |

O nível 2 (espelho) é semi-manual: alguém edita no `/admin/dados-atendimento` e a sessão mede
antes e depois. Os cenários A3 e A4 têm o campo `edicao_manual` dizendo o que editar.

## Como rodar

```bash
python3 ana/bancada/e2e.py cenarios/capacidades.json --so C05-1
python3 ana/bancada/e2e.py cenarios/capacidades.json
python3 ana/bancada/e2e.py cenarios/integracao.json
python3 ana/bancada/e2e.py cenarios/integracao.json --so C1a,C1b
python3 ana/bancada/e2e.py cenarios/integracao.json --familia D
```

Cada cenário rodado grava a sua **conversa gravada** em `ana/bancada/conversas/<id>.json`,
versionada e sobrescrita a cada bateria (ADR-0032): turnos (paciente, Ana, ferramentas do
turno, nós do SOP, o `espere`), conferências com esperado e veio, e o veredito. O histórico
das rodadas é o log desses arquivos; é o que o player do Ana OS toca. Contatos são de teste,
sem dado de paciente.

Cenário `manual` não roda (mostra só os passos). Cenário com `grava_producao` (o `C22-1`
registra ouvidoria de verdade) só roda com `--com-escrita`.

O relatório cru de cada bateria fica em `ana/bancada/resultados/`, ignorado pelo git.

## A bancada ao vivo e as rodadas (ADR-0033)

O runner emite um evento por linha em `resultados/ao-vivo.jsonl` (zerado a cada execução):
`bateria`, `cenario`, `conversa`, `paciente`, `ana`, `trace`, `veredito`, `placar`. O painel
do Claude Code (mod em `mods/bancada/`) lê esse arquivo a cada segundo e abre
sozinho quando uma bateria começa; `/painel` abre, `/painel rodar --so C05-1` roda por dentro,
`/painel parar` encerra. Parado, o painel mostra as conversas gravadas. A segunda aba, Testes
(`/painel testes`), desenha o `relatorio.py --json` em cores com filtros por tecla.

```bash
python3 ana/bancada/e2e.py cenarios/capacidades.json --bateria v69 --rodada 1
```

Com `--bateria` e `--rodada` (sempre juntos) o runner grava `resultados/bateria-v69-rodada1.log`,
copia as conversas para `resultados/conversas-v69-rodada1/` e anota as janelas em
`resultados/janelas-v69.txt`. A skill `bancada` roda as três rodadas e escreve o diagnóstico em
`ana/bancada/diagnosticos/`, versionado.

## A mesa de testes: relatório e práticas

`python3 ana/bancada/relatorio.py` imprime, em Markdown, os cenários por capacidade na ordem do
Ana OS, com as rodadas copiadas da bateria mais recente (`--bateria v69` escolhe outra), a classe
de cada um (passa, intermitente, constante), a regressão contra a bateria anterior e os buracos
(capacidades e nós do SOP sem cenário). Filtros: `--capacidade C05`, `--no E5`, `--tool <nome>`,
`--raia particular`, `--buracos`. É a abertura da skill `/testes`; as práticas que guiam montar e
revisar cenários estão em `PRATICAS.md`.

## Credenciais

Todas no `.env` da raiz do repo, nunca no código:

| Variável | Para quê |
|---|---|
| `CHATWOOT_URL`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_API_TOKEN` | conduzir a conversa e ler notas e etiquetas |
| `AGENTS_API_TOKEN` | ler o trace das ferramentas (sem ela o runner roda, mas cego) |

A chave da API do Hospital vem do mesmo lugar que o `smoke-hospital.py` já usa.

## Armadilhas que custaram tempo (não repita)

1. **`/teste` vai sozinho, numa mensagem só dele.** Colado no início do texto, a plataforma
   não ativa o modo teste e responde com uma nota privada.
2. **O filtro de logs é `conversationId`, camelCase.** A forma `conversation_id` é ignorada
   em silêncio e devolve o tenant inteiro.
3. **A plataforma numera as conversas por conta dela** (Chatwoot 83 = plataforma 68). O elo
   confiável é o `threadId` do log, no formato `1:1:<id do Chatwoot>`.
4. **Nome de item novo entra na ordem alfabética.** Um item de teste batizado com letra do
   fim da lista reprova pelo teto de caracteres, não pelo que o cenário queria medir.
5. **A Ana só registra ouvidoria depois de nome e CPF.** Cenário sem esses dados nunca chega
   ao registro, e a reprovação é do cenário.
6. **Conversa de API não tem card no kanban.** O `kanban_move_card` responde "nothing to move"
   e a raia lida do Chatwoot vem sempre vazia. O runner confere a raia pelo último
   `kanban_move_card` do trace; como o log mascara o argumento (`string(<n>)`), só o
   comprimento do nome da etapa sobrevive, e ele é único entre as etapas, menos FILA
   COMERCIAL e FILA OUVIDORIA (14), que contam as duas. Achado da bateria #18.
7. **CPF sai mascarado na conversa gravada**, mesmo o de teste que o cenário envia: o
   arquivo vai para o git.

## Escrita em produção

O cenário `D1` grava uma manifestação de verdade no painel de ouvidoria do hospital, e a regra
da casa é que linha de ouvidoria em produção **nunca se apaga** (encerrar é mudar o status).
Rode uma vez, e avise quem cuida do painel qual protocolo ficou.
