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
