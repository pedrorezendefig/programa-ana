# Ledger, o visual do Ana OS (referência refero)

> Dashboard financeiro claro, calmo e denso em informação, com sidebar preta flutuante.
> Fonte da verdade visual desde 31/jul/2026 (ADR-0008; substituiu o estilo Aaply).
> Referência original: `os/assets/referencia-refero.jpg`.

**Tema:** claro, único (sem dark mode).

O sistema lê como um cockpit de gestão: um canvas cinza-pérola quase branco, cards brancos de cantos generosos flutuando sem sombra, tipografia preta pesada para números e títulos, cinza médio para rótulos. A energia não vem de cor de marca: vem do contraste preto sobre claro e de dois acentos semânticos usados com parcimônia, verde (positivo/ok) e vermelho (negativo/erro). A sidebar é o único bloco escuro da tela: um pill vertical preto flutuante, só de ícones, com tooltip. Nada de gradientes, nada de texturas, uma sombra só (na sidebar). Densidade confortável: a página respira, mas cada card carrega dado de verdade.

## Tokens de cor

| Nome | Valor | Token | Papel |
|---|---|---|---|
| Canvas | `#f3f2f0` | `--cor-canvas` | Fundo da página, cinza-pérola quase branco |
| Card | `#ffffff` | `--cor-card` | Toda superfície elevada |
| Card interno | `#f6f5f3` | `--cor-card-interno` | Listas e blocos aninhados dentro de um card |
| Tinta | `#111111` | `--cor-tinta` | Texto principal, números grandes, chips pretos, botões primários |
| Sidebar | `#0d0d0d` | `--cor-sidebar` | O pill vertical preto da navegação |
| Cinza-rótulo | `#8c8c8c` | `--cor-rotulo` | Rótulos, legendas, texto secundário |
| Cinza-mudo | `#b9b7b2` | `--cor-mudo` | Bordas de seleção, ícones inativos, placeholders |
| Fio | `#e8e7e4` | `--cor-fio` | Divisores e bordas sutis |
| Verde | `#2e9e44` | `--cor-verde` | Positivo: feito, ok, linha de atividade |
| Verde-tinta | `#e3f4e4` | `--cor-verde-tinta` | Fundo de chip/selo positivo |
| Vermelho | `#e04434` | `--cor-vermelho` | Negativo: erro, bloqueio duro, DELETE |
| Vermelho-tinta | `#fde9e6` | `--cor-vermelho-tinta` | Fundo de chip/selo negativo |
| Azul | `#2b52c9` | `--cor-azul` | Links e o selo de ambiente homolog |
| Azul-tinta | `#e8effc` | `--cor-azul-tinta` | Fundo de chip/selo informativo |
| Areia | `#efece7` | `--cor-areia` | Fundo de chip neutro-quente (selo SaaS GH) |

Regra: verde e vermelho são **semânticos**, nunca decorativos. Não existe cor de marca; o preto é a marca.

## Tipografia

Famílias locais mantidas (sem rede): **Poppins** para números grandes, títulos e a marca; **Inter** para corpo, rótulos e UI; mono do sistema para código.

| Papel | Fonte | Tamanho | Peso | Tracking |
|---|---|---|---|---|
| display (número de card grande) | Poppins | 40px | 700 | -1.5px |
| número de indicador | Poppins | 30px | 700 | -1px |
| h1 da página | Poppins | 34px | 700 | -1px |
| h2 de seção | Poppins | 22px | 700 | -0.4px |
| h3 / título de card | Poppins | 17px | 700 | -0.2px |
| corpo | Inter | 15px | 400 | 0 |
| rótulo (label de card) | Inter | 14px | 500 | 0 |
| micro-rótulo (caps) | Inter | 11px | 600 | +0.08em, uppercase |
| legenda | Inter | 13px | 400 | 0 |

O micro-rótulo em caps cinza (`PROFIT`, `REVENUE` na referência) é assinatura do sistema: use-o para nomear o dado dentro do card, com o número pesado logo abaixo.

## Espaço e forma

- **Página:** conteúdo com max-width 1240px; canvas com padding 24px; sidebar fixa à esquerda ocupando 76px de largura + 16px de respiro (o `main` compensa).
- **Sidebar:** 64px de largura, raio 32px, altura `calc(100vh - 32px)`, fixa com margem 16px. Ícones 20px, stroke 1.7, em `--cor-mudo`; item ativo ganha quadrado arredondado (12px) `#262626` com ícone branco. Tooltip preto ao lado no hover.
- **Raios:** cards 24px; cards internos e inputs 14px; chips e botões pill (999px); quadrado de ícone 12px.
- **Bordas:** cards não têm borda por padrão (branco sobre canvas basta). Card selecionado/destacado: borda 1.5px `--cor-mudo`. Fios internos com `--cor-fio`.
- **Sombra:** uma só no sistema, na sidebar: `0 12px 28px -12px rgba(0,0,0,.35)`. Cards não têm sombra.
- **Gaps:** 14px entre cards da mesma fileira; 28px entre seções; padding de card 22px a 26px.

## Componentes

### Sidebar de ícones
Pill preto vertical flutuante: logo no topo (quadrado 34px, raio 11px, branco sobre preto, glifo "A" em Poppins 700), botão "+" logo abaixo, depois a pilha de páginas, e o rodapé com utilitários. Só ícones; o nome da página vive no tooltip (fundo `--cor-tinta`, texto branco, raio 8px, 12px Inter 500).

### Card de indicador (stat)
Card branco 24px com: rótulo 14px `--cor-rotulo` na primeira linha, número 30px Poppins 700 na segunda, e uma terceira linha opcional de detalhe (13px, pares rótulo+valor ou pontos coloridos de legenda). É a fileira do topo da referência (Revenue, Expenses...).

### Card grande de destaque
O "card de mês" da referência: título 17px + badge circular preto (número branco, 26px de diâmetro) no canto direito; micro-rótulo caps; número display 40px (verde/vermelho apenas se o dado for semântico); sparkline; linha de legenda com pontos coloridos; e um card interno (`--cor-card-interno`, raio 14px) com linhas rótulo/valor separadas por fio. Estado selecionado: borda 1.5px `--cor-mudo`.

### Sparkline
SVG inline, 2px de stroke, sem preenchimento (ou preenchimento a 8% de opacidade), verde para série positiva, vermelho para negativa, sobre uma linha-base 1px `--cor-fio`. Sem eixos, sem grid: é um gesto, não um gráfico completo.

### Botões
- **Primário:** pill preto, texto branco, Inter 500 14px, padding 12px 22px. Pode carregar ícone à esquerda (como o "Upgrade" da referência).
- **Claro:** pill branco com borda 1px `--cor-fio`, texto tinta. Vira o secundário universal.
- **Ghost:** transparente com borda 1px `--cor-tinta`.
- **Ícone:** círculo 40px branco (borda `--cor-fio`), ícone 18px tinta; usado para ações pontuais (busca, copiar).
- Hover: elevação de 1px e escurecimento sutil; sem mudanças de cor berrantes.

### Chips e selos
Pill 999px, Inter 500 12.5px, padding 6px 13px. Sempre tinta-sobre-tinta-clara: verde-tinta/verde (feito, ok), vermelho-tinta/vermelho (erro, tag dura), azul-tinta/azul (informativo, homolog), areia/tinta (neutro quente, selo SaaS), `--cor-fio`/tinta (neutro), preto/branco (ação pendente "fazer"). Pontos de legenda: círculo 7px da cor semântica + rótulo 13px.

### Selo de ambiente (regra do ADR-0004)
Toda página declara o ambiente num chip fixo no topo direito: homolog = azul-tinta/azul; produção (retrato) = vermelho-tinta/vermelho; local = `--cor-fio`/tinta.

### Tabelas
Dentro de card ou card interno: cabeçalho em micro-rótulo caps cinza, linhas separadas por `--cor-fio`, padding 12px 16px, sem zebra. Números alinhados à direita quando comparáveis.

### Código
Blocos `pre` em `--cor-tinta` com texto branco, raio 14px; código inline em `--cor-fio`.

### Badge circular
Círculo preto 26px com número branco (Poppins 600 13px): contadores de card, como o "5" do mês selecionado na referência.

## Grafo de execução (página Roadmap)

Nós são cards brancos compactos (raio 16px) em colunas da esquerda para a direita; arestas são curvas 1.5px `--cor-mudo` com seta pequena, e ficam `--cor-tinta` no caminho ativo. Nó feito: chip verde e opacidade plena, sem botão. Nó da fronteira: pulso sutil (anel que respira). Nó bloqueado: opacidade .55 + cadeado. Proposta: borda tracejada 1.5px `--cor-mudo`. Animações: entrada em cascata (fade + 8px de subida, 40ms de stagger), traço fluindo (`stroke-dashoffset`) nas arestas do caminho ativo, tudo desligado sob `prefers-reduced-motion`.

## Faça / não faça

### Faça
- Preto pesado para número e título; cinza `--cor-rotulo` para todo rótulo.
- Micro-rótulo caps em cima, número embaixo: essa dupla é a célula básica de informação.
- Cards sem borda e sem sombra; a hierarquia vem do branco sobre o canvas.
- Verde e vermelho só com significado (estado, série de dado); azul só em link/informação.
- Ícones stroke 1.7, nunca preenchidos.

### Não faça
- Nenhum amarelo, nenhum dot-grid, nenhum emoji em título (heranças do Aaply, aposentadas).
- Nada de sombra em card, nada de gradiente, nada de segunda sombra.
- Não usar vermelho/verde como decoração ou marca.
- Não colocar texto na sidebar (só ícone + tooltip).
- Não introduzir cor nova fora da tabela de tokens.

## Início rápido

```css
:root {
  --cor-canvas: #f3f2f0;  --cor-card: #ffffff;  --cor-card-interno: #f6f5f3;
  --cor-tinta: #111111;   --cor-sidebar: #0d0d0d;
  --cor-rotulo: #8c8c8c;  --cor-mudo: #b9b7b2;  --cor-fio: #e8e7e4;
  --cor-verde: #2e9e44;   --cor-verde-tinta: #e3f4e4;
  --cor-vermelho: #e04434; --cor-vermelho-tinta: #fde9e6;
  --cor-azul: #2b52c9;    --cor-azul-tinta: #e8effc;
  --cor-areia: #efece7;
  --raio-card: 24px; --raio-interno: 14px; --raio-pill: 999px;
  --sombra-sidebar: 0 12px 28px -12px rgba(0,0,0,.35);
}
```

## Retrato da Ana: veste o app do hospital (ADR-0029, 09/set/2026)

O Retrato (`retrato/`) não usa o Ledger. Ele veste o design system do aplicativo do hospital, porque é o sistema que o diretor já usa. Os tokens vivem em `retrato/assets/hospital.css`, copiados do `frontend/src/app/globals.css` do app:

| Papel | Valor |
|---|---|
| Fonte (corpo e títulos) | HP Simplified, só o peso 400; títulos crescem em tamanho |
| Principal | `#2B2E7E` (azul-marinho da logo) |
| Principal clara | `#3B6FB6` |
| Principal escura | `#1A1C4E` |
| Texto | `#1E293B`; secundário `#64748B` |
| Borda | `#E2E8F0` |
| Verde (ok) | `#88D7A4` |
| Âmbar (atenção, decisão, Global Health) | `#FFC067` |
| Vermelho (erro) | `#FC9D9D` |
| Azul-info | `#7CC2F2` |
| Raios | 1 a 12 px (corporativo); pill só em chip |
| Sombra | premium: `0 10px 25px -5px rgba(0,0,0,.08), 0 8px 10px -6px rgba(0,0,0,.08)` |
| Vidro | branco a 80% com desfoque de 12 px, só na barra de abas fixa e nos painéis flutuantes |
| Movimento | fade-in-up 0,4 s nos cards ao entrar; troca de aba 250 ms; tudo desligado com `prefers-reduced-motion` |

Selos de origem no Retrato: API do Hospital = azul-marinho, Global Health = âmbar, nativa = cinza. Fluxogramas na gramática do hospital (ADR-0024 de lá): cards numerados, decisões em âmbar, retornos em curva, terminais de início e fim. A logo `logo-hsm.png` fica no topo. O Ana OS continua no Ledger.
