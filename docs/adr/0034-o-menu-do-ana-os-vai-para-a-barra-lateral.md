# ADR-0034: o menu do Ana OS vai para a barra lateral

Data: 15/out/2026. Estado: aceito. Emenda o ADR-0030 (as cinco abas saem do topo) e o ADR-0008 (raios e cinzas do Ledger).

## Contexto

O Ana OS tinha dois menus: o pill preto estreito à esquerda, só com o logo e as aplicações externas, e as cinco abas numa barra no topo, junto do título, do estágio e das conexões. O topo comia a primeira dobra de toda aba. O Hospital OS e o IAE OS passaram na mesma semana para um menu só, na lateral, com a marca no alto. Uma medição de contraste no Ana OS achou o cinza dos rótulos em 3,4:1 (abaixo do 4,5:1 de texto) e as setas dos diagramas em 2:1 ou menos (abaixo do 3:1 de elemento gráfico).

## Decisão

1. **A barra lateral é a navegação inteira.** O pill preto fica largo (264px) e leva, de cima para baixo: a logo do Hospital São Matheus e "Ana OS", o estágio lido do GitHub, as cinco abas com ícone e nome, as aplicações externas com nome e, no pé, as conexões e o selo do ambiente. O meio da tela fica só com o conteúdo da aba e a barra de filtros dela.
2. **Cantos discretos:** card 8px, interno 6px, ícone 6px, a barra 14px. Os nós do mapa das regras seguem pelo CSS do OS, sem mexer no `sop.js`, que também desenha o Retrato.
3. **Contraste:** `--cor-rotulo` passa a `#6b6b6b` (5,3:1) e nasce `--cor-linha` `#8a8782` (3,6:1) para seta, aresta e contorno de nó, sem opacidade por cima.
4. **Movimento:** a barra entra em sequência e o ícone da aba responde ao mouse e à troca; `prefers-reduced-motion` desliga tudo, como antes.

## Alternativas

- **Manter as abas no topo e só alargar a barra.** Dois menus para o mesmo lugar. Descartado.
- **Trocar o preto do Ledger pelo índigo do Hospital OS.** O preto é a marca do Ana OS desde o ADR-0008. Descartado.

## Consequências

- As páginas de `os/arquivo/` seguem com o pill estreito: o `nav.js` só cria a barra quando a página não traz a lateral pronta.
- O Retrato da Ana (site do diretor) não muda: os motores em `retrato/assets/` ficaram intocados.
