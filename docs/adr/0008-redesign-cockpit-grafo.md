---
status: accepted
date: 2026-07-31
amended_by: 0031, 0034
---

# Redesign do Ana OS (referência refero) e grafo de execução com prompts copiáveis

O Ana OS troca de design system e ganha um mapa de execução. Duas decisões amarradas, tomadas no grilling de 31/jul/2026:

1. **Visual novo, substituição total.** O `os/DESIGN.md` (estilo Aaply: canvas cinza, amarelo elétrico, pills) é reescrito a partir da referência refero.design depositada pelo Pedro: sidebar preta arredondada flutuante só de ícones (com tooltip), canvas quase branco, cards brancos de raio grande, tipografia preta pesada, sparklines discretas, uma sombra só. As **10 páginas** do OS são redesenhadas nesse sistema de uma vez (redesign gradual foi recusado de novo, como no ADR-0007). Tema claro único. Fontes locais mantidas (Poppins + Inter).

2. **Grafo de execução em página própria.** Nasce a página **Roadmap** do OS: um grafo SVG desenhado à mão (sem biblioteca externa), layout em colunas da esquerda para a direita (feitas → estágio ativo → propostas → horizonte), nós como cards, arestas com seta. Cada nó **acionável** (tarefa `fazer`, pendente, proposta) tem um botão **copiar prompt**: texto pronto para colar no Claude Code, em pt-BR, passo a passo para leigo; tarefa manual do Pedro vira prompt "me guie enquanto eu faço". Nó feito aparece concluído, sem botão. Clique abre painel lateral com ficha e prompt visível. Animações discretas: entrada em cascata, traço fluindo no caminho ativo, pulso na fronteira, bloqueada esmaecida com cadeado.

A home segue a geometria da referência: fileira de indicadores no topo (feitas, fronteira, a fazer, propostas, pendentes, ideias), dois cards grandes de destaque (a fronteira atual e a próxima proposta destravada, ambos com copiar prompt), painel de aplicações e faixa de Ideias editável como antes. **Métricas sempre funcionais**: mensalidade, KPI e escada de valor continuam proibidos no roadmap visual.

## O grafo reverte conscientemente o "sem grafo" do ADR-0007

O CONTEXT.md dizia "continua sem grafo de dependências" e o mapa.html com grafo foi aposentado. A reversão é consciente e o propósito é outro: o mapa antigo era mesa de arrastar cards; o grafo novo é **mapa de leitura e execução**, alimentado pelo `roadmap.json`, cujo produto é o prompt copiável de cada passo. Continua sem trilho da receita, sem criticidade derivada, sem kanban.

## Camada de propostas

Os passos futuros recomendados pelas sessões (P1..P6 na criação: demo do catálogo GH ao diretor, VPN da TST, prova da finalização/GH-18, tools GH de identificação, horários livres na conversa, agendamento fim a fim em homolog) entram numa chave nova `propostas` do `roadmap.json`, com ID próprio, deps e prompt, renderizadas com visual distinto (tracejado). O "desenho do fluxo GH" não vira proposta duplicada: ele é a própria pendente GH1, que ganha posição no grafo (deps V6 + P3 e prompt), sem mudar de natureza no TODO.md. **Proposta não entra no TODO.md**: vira tarefa (com ficha e "pronto quando") só quando o Pedro a puxa para o estágio, no ritual normal dos dois arquivos. Alternativa recusada: criar as 7 como tarefas oficiais agora (incharia o estágio, misturando compromisso com hipótese; a fronteira real é a V6).

## Opções consideradas

| Opção | Veredito |
|---|---|
| Redesign gradual (home primeiro, resto depois) | Recusado: o Pedro quer o visual coeso de saída, como no ADR-0007 |
| Grafo dentro da home | Recusado: espremido, trai a geometria da referência; página própria |
| Propostas como tarefas oficiais no TODO.md | Recusado: compromisso é do Pedro, não da sessão |
| Prompts em arquivo separado do roadmap.json | Recusado: dois arquivos para sincronizar; campo `prompt` no nó |
| Prompt também nos nós feitos (histórico) | Recusado: ruído; botão só onde há ação |

## Consequências

- `os/DESIGN.md`, `tokens.css`, `os.css` e `nav.js` reescritos; as 10 páginas redesenhadas exigem **fumaça por página** de novo (rotas, allowlist, escrita do roadmap, visual), como no ADR-0007.
- `roadmap.json` ganha as chaves `propostas` e o campo `prompt` nos nós acionáveis; o `/check` deve **preservar** esses campos ao reconciliar com o TODO.md (propostas não têm espelho narrativo).
- CLAUDE.md atualizado (descrição do espelho de dados inclui propostas).
- Este ADR **supersede a parte visual do ADR-0007** (o Aaply deixa de ser a referência) e **revisa a decisão "sem grafo"** registrada no mesmo ADR e no CONTEXT.md.
- A imagem de referência sai da raiz do repo para `os/assets/referencia-refero.jpg`.
- Nascem as tarefas OS6 (redesign) e OS7 (grafo) no estágio.
