---
status: accepted
date: 2026-10-13
---

# ADR-0033: a bancada ganha um painel ao vivo no Claude Code

Data: 13/out/2026. Estado: aceito.

## Contexto

Desde o ADR-0032 cada cenário da bancada grava a sua conversa em `ana/bancada/conversas/<id>.json`, e o player do Ana OS toca essa gravação. Mas a gravação nasce só no fim do cenário. Para ver a bateria rodando, o Pedro abria outro terminal com `tail -f` no log de texto ou filtrava a inbox no Chatwoot, que não mostra o trace. O ritual das três rodadas (um script de sessão, `bateria3x.sh`, cópia das conversas na mão, diagnóstico em `resultados/`, que o git ignora) vivia na cabeça de cada sessão e sumia com ela.

## Decisão

1. **O runner emite eventos.** O `e2e.py` grava `ana/bancada/resultados/ao-vivo.jsonl`, uma linha JSON por acontecimento (bateria, cenário, conversa, paciente, Ana, trace, veredito, placar), zerado a cada execução. O log de texto continua igual.
2. **O runner cuida das rodadas.** Com `--bateria <nome> --rodada <n>` ele grava `bateria-<nome>-rodada<n>.log`, copia as conversas para `conversas-<nome>-rodada<n>/` e anota as janelas, tudo em `resultados/`. Os nomes são os que já existiam. O evento `bateria` leva os vereditos das rodadas anteriores da mesma bateria, e o evento `cenario` leva o veredito da gravação anterior, para o painel marcar regressão sem ler nada além do arquivo.
3. **O painel é um mod do Claude Code** em `.claude/skills/bancada/`, na mesma pasta da skill, versionado: lista de cenários mais conversa do selecionado, segue o que roda, teclas para navegar, rodadas lado a lado, "regrediu" e "melhorou", tempo e estimativa, linha de status e toasts. Lê o `ao-vivo.jsonl` a cada segundo; sem ele, monta a bancada das conversas gravadas. Só leitura, como o OS: o único gesto de escrita é `/bancada rodar`, que dispara o próprio `e2e.py`.
4. **O diagnóstico é versionado** em `ana/bancada/diagnosticos/`, e a skill `bancada` fixa o ritual das três rodadas. Ela só diagnostica; mudar o prompt é outra sessão.

## Alternativas

- **O painel lê o log de texto.** Quebra a cada frase que mudar no runner. Descartado.
- **Mod fora do repo**, na pasta de mods da máquina. Quem pegar o programa depois não ganha o painel. Descartado.
- **Rodadas pela skill**, com o runner cego a elas. O runner é quem sabe os nomes dos arquivos e o veredito anterior; fora dele a cópia e a regressão ficam na mão. Descartado.

## Consequências

- O `resultados/` continua fora do git; o `ao-vivo.jsonl` é efêmero por desenho.
- O motor do Claude Code escreve `.claude/skills/bancada/.claude-plugin/types/` ao carregar o mod; a pasta está no `.gitignore`.
- O painel abre sozinho só em terminal com 144 colunas ou mais; abaixo disso, `/bancada`.
- Termo novo no `CONTEXT.md`: **Bancada ao vivo**.

## Adendo (13/out/2026, mesmo dia)

O painel ganhou uma segunda aba, **Testes**, que desenha o relatório por capacidade (`relatorio.py --json`: rodadas, classe, regressão e buracos de cobertura) em cores, com filtros por tecla. O mod registra a ferramenta `abrir_testes`, que a skill `/testes` chama na abertura em vez de colar o relatório no chat. A alternativa de uma página no Ana OS ficou para depois, porque mexeria na regra de corte do ADR-0030; um artefato publicado foi descartado por ser estático e levar o texto dos cenários para fora da máquina.

## Adendo 2 (13/out/2026, noite): custo por conversa e navegação por categoria (#24)

A Meta cobra cada resposta da Ana no WhatsApp desde 01/out/2026 (R$ 0,035 por mensagem de service, depois de 1.000 grátis por número por mês), e o grilling do mesmo dia decidiu que a bancada é a régua desse custo. Fatos que mandaram no desenho:

- **A plataforma não guarda tokens por conversa.** Os logs da etapa `generate` trazem só o prompt e a duração; `GET /api/v1/metrics` soma tokens por janela de tempo (`since`), e `until` e `conversationId` são ignorados na 1.15.0. Como a bancada roda um cenário por vez, o runner lê a soma "desde o início da conversa até agora" ao fim de cada cenário e grava `uso` (entrada, cache, criação de cache, saída, chamadas, modelos) e `custo` (`openai_usd`, `meta_brl`, `mensagens_ana`, `modelo`) na conversa gravada. Ruído possível: uma mensagem no Telegram de teste no mesmo minuto.
- **Os preços moram em `ana/bancada/precos.json`** (OpenAI por 1M tokens; Meta por mensagem e franquia; câmbio; `conferido_em`). O relatório avisa quando passam de 60 dias.
- **Travessão é falha global.** `checar()` reprova qualquer resposta da Ana com travessão (U+2014) ou meia-risca (U+2013), sem precisar listar por cenário. Os nomes das etapas do kanban continuam com travessão: a regra é da fala, não das ferramentas.
- **O relatório deriva, não escreve:** `depende_gh` vem das ferramentas do cenário (as da Global Health, ADR-0009/0025) ou do estado `gh` da capacidade; `fatia_sop` é a parte dos nós do Mapa do SOP que o cenário, a capacidade ou o bloco cobre; `funciona` é "todo cenário executável passa"; `alerta_mensagens` marca conversa com mais de 8 respostas da Ana (`TETO_MENSAGENS_ANA`).
- **Todo buraco diz de onde vem.** O relatório classifica cada capacidade sem cenário executável e cada nó do SOP sem cenário numa de quatro origens, derivadas (estado da capacidade no comparativo, ferramentas do nó, cenários manuais): Global Health com homologação vazia (terceiros), ainda não desenvolvido (nós, atrás da GH), só com gente ou quebrando algo de propósito (nós), falta escrever o cenário (nós). Também lista os cenários que passam só pelo desvio da GH (a agenda responde vazio e a Ana encaminha). O painel mostra a legenda, a etiqueta de quem depende e o porquê de cada um.
- **O cursor da aba Testes para nos três níveis** (categoria, capacidade, cenário) e o detalhe muda com ele: na categoria, o resumo do comparativo, a fatia do SOP, quantas funcionam, quantas não, quantas dependem da GH e o custo médio; na capacidade, o `faz`, o que falta, as ferramentas e os cenários com custo; no cenário, o que já havia mais custo, modelo e chamadas. A faixa do topo mostra o custo médio por conversa da bateria (Meta + OpenAI) e quantas conversas foram medidas. A aba Bateria mostra o custo da conversa assim que o runner o emite (evento `custo`).
