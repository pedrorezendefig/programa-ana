---
name: bancada
description: Roda a bateria de cenarios da Ana (3 rodadas, uma por vez, em segundo plano) com a bancada ao vivo no painel, separa falha constante de intermitente e escreve o diagnostico versionado em ana/bancada/diagnosticos/. Use quando o Pedro disser "roda a bateria", "bateria 3x", "roda os cenarios", "diagnostico da bateria", "o que falhou na bateria", ou pedir para testar um prompt novo contra os cenarios.
---

# Bancada: o ritual da bateria

A bancada de cenários prova, contra o canal real, o que a Ana fala. Este ritual roda a bateria três vezes, mostra tudo no painel da **bancada ao vivo** (ADR-0033) e termina com um diagnóstico versionado. Ele só lê e diagnostica: nenhuma escrita no prompt, na plataforma ou nos cenários. Quem muda o prompt é outra sessão, depois de ler o diagnóstico.

## O painel

O mod nesta mesma pasta desenha o painel. Ele lê `ana/bancada/resultados/ao-vivo.jsonl`, que o `e2e.py` escreve a cada acontecimento, e abre sozinho quando uma bateria começa. Comandos do Pedro: `/bancada` abre o painel, `/bancada rodar <args do e2e.py>` roda uma rodada por dentro, `/bancada parar` encerra. Teclas no painel (depois de clicar nele ou abrir com `/bancada`): `j`/`k` navegam, `f` volta a seguir o cenário que roda, `x` filtra só falhas, `u`/`d` rolam a conversa, Esc devolve o teclado ao prompt. Terminal com menos de 144 colunas: o painel espera o `/bancada`.

## Passos

1. **Nome da bateria.** É a versão do prompt que está no ar: a última linha do log do `roadmap/TODO.md` que diz "prompt vX.Y publicado", sem o ponto (v6.9 vira `v69`). Se o Pedro deu outro nome, use o dele. Nome só com letras, números, ponto, traço e sublinhado.

2. **Rodada 1.** Pelo Bash, em segundo plano, com o log indo para o arquivo que o runner mesmo grava:

   ```bash
   python3 ana/bancada/e2e.py cenarios/capacidades.json --bateria <nome> --rodada 1
   ```

   O runner grava `resultados/bateria-<nome>-rodada1.log`, copia as conversas para `resultados/conversas-<nome>-rodada1/` e anota a janela em `resultados/janelas-<nome>.txt`. Uma bateria completa leva uns 20 minutos. Enquanto roda, você pode ler o painel, o log ou a conversa gravada de um cenário que já terminou; o Pedro navega o painel.

3. **Rodadas 2 e 3.** Só depois que a anterior terminou (a notificação do Bash chega). Mesma linha, `--rodada 2` e `--rodada 3`. Pronto quando `janelas-<nome>.txt` tem três linhas "fim" com placar.

4. **Juntar as três.** Para cada cenário, o veredito nas três rodadas (de `resultados/conversas-<nome>-rodada{1,2,3}/<id>.json`). Classifique: **constante** (falhou nas três), **intermitente** (falhou em uma ou duas), **regrediu** (passou na bateria anterior e falhou agora; a bateria anterior é a última `conversas-*-rodada3/` de outro nome) e **melhorou**. Pronto quando todo cenário rodado está em uma classe.

5. **Causa de cada falha.** Para cada cenário que falhou em qualquer rodada, leia a conversa gravada e o trace da rodada em que falhou e diga a causa em uma linha: regra do prompt que o modelo não seguiu, descrição de ferramenta que mandou para o lugar errado, dado faltando na API, ou cenário exigente demais. Separe o que é da Ana do que é do runner ou do ambiente (GH fora, timeout). Pronto quando nenhuma falha está sem causa.

6. **Diagnóstico.** Escreva `ana/bancada/diagnosticos/diagnostico-bateria-<data>-<nome>.md` com as seções, nesta ordem: `Resumo` (3 a 5 linhas: placar das três rodadas e o padrão principal), `Tabela` (cenário, rodada 1, 2, 3, classe, causa em uma linha), `Evidências` (por cenário que falhou: o turno, o que veio, o que se esperava, as ferramentas), `Pacote de mudanças (proposta, nada aplicado)` (uma entrada por causa, dizendo onde no prompt ou na ferramenta e o texto proposto), `Riscos para os cenários que passam`. Sem CPF, sem nome de paciente real, sem token, sem URL de ambiente. Pronto quando o arquivo tem as cinco seções e toda falha da tabela aparece nas evidências.

7. **Registrar.** Uma linha no log do `roadmap/TODO.md` com a data, a issue em curso (`#N`), os três placares e o padrão principal. Se a bateria é de uma issue aberta, comente nela o placar e o caminho do diagnóstico. Depois diga ao Pedro, em ação: o que mudar no prompt primeiro e o que é intermitente.

## Uma rodada só, ou um cenário

Pedido como "roda só o C13-1" ou "roda uma rodada": passo 2 com `--so <ids>` ou sem `--bateria`, sem diagnóstico, só o placar e a causa das falhas no chat. Sem `--bateria` o runner não grava log nem cópia, só o `ao-vivo.jsonl` e as conversas gravadas.

## Armadilhas

- `--bateria` e `--rodada` andam juntos; um sem o outro é erro na partida.
- Dois `e2e.py` ao mesmo tempo disputam o `ao-vivo.jsonl` e a inbox. Uma rodada por vez.
- O `/teste`, o filtro `conversationId`, a numeração da plataforma e a raia pelo trace estão no `ana/bancada/README.md`. Leia antes de culpar o runner.
