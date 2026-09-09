---
status: accepted
date: 2026-09-09
amends: 0028, 0018
---

# Tudo tem link, e o Retrato da Ana veste o design system do app do hospital

Decisão do Pedro (segundo grilling de 09/set/2026): a navegação do Retrato da Ana e do Ana OS passa a obedecer um contrato único, "toda menção é link, e todo link tem volta". O Retrato ganha filtros em todas as esferas, três fluxogramas com botão de percorrer, transição suave entre abas e vidro só no que flutua. E o Retrato deixa o visual Ledger do `DESIGN.md` para vestir o design system do aplicativo do hospital (fonte HP Simplified, azul-marinho `#2B2E7E`, cantos pequenos, sombra e vidro do app, logo do hospital), porque é o sistema que o diretor já usa todo dia. O Ana OS mantém o Ledger e ganha só o contrato de links.

## Contexto

- O Retrato nascido no ADR-0028 tinha link só dentro da aba das regras (índice para seção, nó para nó). Capacidade, ferramenta e elo de cadeia não levavam a lugar nenhum, embora o dado da ligação já existisse (`secao_ids` nas capacidades, ferramentas por seção no `circuito.json`, ferramenta por elo nas cadeias). O Pedro pediu: "tudo deve ter link: chamadas, ferramentas, seções, direto para o prompt", no Retrato e no OS.
- Ele pediu também mais interação (filtros, animação, fluxogramas), troca de abas mais fluida, "um pouco mais liquid glass", e o visual do app do hospital só no Retrato.
- O app do hospital (`~/PedroDev/Hospital`, `frontend/src/app/globals.css`) tem design system explícito: HP Simplified (só o peso regular), `--color-primary #2B2E7E`, `--color-primary-light #3B6FB6`, `--color-secondary #88D7A4` (verde), `--color-accent #FFC067` (âmbar), `--color-error #FC9D9D`, `--color-info #7CC2F2`, raios de 1 a 12 px, `--shadow-premium`, a utilitária `.glass-card` (branco a 80% com desfoque de 12 px) e as animações `fade-in-up` e `fade-in-right`. E tem um renderizador próprio de fluxograma (ADR-0024 de lá): cards numerados, decisões em âmbar, retornos em curva, terminais. O diretor lê os POPs nesse desenho.

## Decisão

1. **Contrato de links (Retrato e OS).** Toda menção a ferramenta, seção do prompt, nó do mapa, capacidade ou cadeia é um link para o item. Todo item lista, linkados, os que o mencionam: ferramenta mostra as seções que a chamam, as capacidades que dependem dela e as cadeias que a usam; seção mostra os nós do mapa e as ferramentas; capacidade mostra seções e ferramentas; elo de cadeia mostra ferramenta e seção. O link troca de aba (ou de página, no OS) sozinho, rola até o alvo e o acende por dois segundos. Item sem ligação não ganha link inventado.
2. **A URL carrega o destino e o filtro.** No Retrato: `#<aba>/<alvo>?<filtros>` (ex.: `#regras/sec-2-3-1`, `#faz?estado=ainda-nao`). No OS: `<pagina>.html#<alvo>`, com o mesmo acender de chegada em toda página (um `os/assets/liga.js` comum).
3. **Filtros em toda esfera do Retrato**, numa barra fixa abaixo das abas: busca livre mais chips. Faz: estado e bloco. Regras: raia, tipo de nó e ferramenta (os nós que não a chamam esmaecem). Busca: origem e "pode chamar hoje". Global Health: veredito.
4. **Três fluxogramas na gramática do hospital, cada um com "percorrer".** O caminho de uma mensagem (paciente, WhatsApp, Ana, ferramenta, fonte, resposta) na esfera "Onde ela busca", com o caminho de cada ferramenta acendendo ao clique. Cada cadeia da Global Health desenhada elo a elo (recusa de propósito como decisão em âmbar, "ainda não" como terminal tracejado), com o percorrer avançando um elo por vez e a conversa da Ana ao lado. E o percorrer de uma jornada no mapa das regras: acende os nós da raia na ordem e abre o trecho literal de cada um. Nada roda sozinho ao abrir a página; `prefers-reduced-motion` desliga toda animação.
5. **Vidro só no que flutua.** A barra de abas do Retrato fica fixa no topo, translúcida com desfoque (a `.glass-card` do app). Os painéis flutuantes (ficha do nó, ficha da ferramenta) ganham o mesmo vidro. Cards e fundo continuam opacos. A troca de aba é uma transição de 250 ms (sai desvanecendo, entra deslizando de leve).
6. **O Retrato veste o app do hospital.** Tokens copiados para `retrato/assets/`: HP Simplified (títulos crescem em tamanho, não em peso), azul-marinho como cor principal, verde, âmbar e vermelho do app como cores de estado, raios pequenos, sombra premium, logo `logo-hsm.png`. Selos de origem: API do Hospital em azul-marinho, Global Health em âmbar (como o ADR-0018 pedia), nativa em cinza. O `DESIGN.md` da Ana ganha a seção "Retrato: veste o app do hospital". O Ana OS não muda de visual.
7. **A fonte HP Simplified é proprietária da HP.** O app do hospital já a serve publicamente; o Retrato a republica num domínio da Vercel. O Pedro foi avisado e decidiu manter. Se a decisão mudar, a troca é uma linha no CSS (Source Sans 3 como substituta).

## Considered options

- **Só ida para o prompt, sem volta:** rejeitado. O diretor chega na regra e não consegue voltar para "onde ela busca".
- **Vidro em tudo (cards translúcidos, manchas de cor ao fundo):** rejeitado. Quebra a leitura de tabela e de SVG, e contraria o próprio design system do app, que usa vidro só em card flutuante e modal.
- **Só as cores do hospital, mantendo Poppins/Inter e o Ledger:** rejeitado. Fica um híbrido que não é nem o OS nem o hospital.
- **Só busca livre, sem chips:** rejeitado. O diretor não descobre sozinho que dá para ver "só o que falta".
- **Só a cadeia vira fluxo:** rejeitado. O caminho da mensagem e o percorrer da jornada são o que faz o Retrato explicar em vez de listar.
- **Reusar o código React do renderizador do hospital:** rejeitado. O Retrato é estático sem build; copia-se a gramática visual (formas, cores, numeração), não o componente.

## Consequências

- `retrato/` é reescrito por dentro: `assets/hospital.css` (tokens), `assets/liga.js` (contrato de links e URL), `assets/filtros.js`, `assets/fluxo.js` (gramática do hospital, com percorrer), `sop.js` ganha o percorrer de jornada. O `gerar.py` passa a gravar as ligações inversas (quem menciona quem) no `retrato.json`.
- `os/assets/liga.js` novo, carregado por todas as páginas do OS; Provas, Mecanismo, Mapa do SOP e Global Health ganham os links que faltavam.
- `DESIGN.md` ganha a seção do Retrato; `CONTEXT.md` atualiza o termo Retrato da Ana e ganha o termo Contrato de links.
