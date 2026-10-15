---
status: accepted
date: 2026-10-15
amends: 0030, 0031, 0034
---

# O programa Ana adota o fluxo de trabalho do IAE e do Hospital

## Contexto

O Hospital OS e o IAE OS trabalham do mesmo jeito: cada mudança nasce como issue, vira branch e PR, passa por CI e, quando mexe no produto, por um revisor. O painel de lá tem quatro abas (Issues, PRs, Produção e Documentação), com o fluxograma do processo e um balão curto em cada passo. A Ana tinha outro desenho: o Cockpit com mesa, grafo e radar, as etiquetas `canal:` e `radar`, nenhum PR e nenhum CI, e skills do Matt Pocock de uma versão diferente da do pipeline. O Pedro pediu os mesmos conceitos nos três.

## Decisão

1. **O Ana OS é o painel do fluxo.** `tools/workflow-dashboard/` veio do IAE OS e o `os/server.py` o serve na raiz da porta 8777, com o `/api/data` do coletor. O Cockpit sai: a aba Issues faz o papel da mesa, do grafo e do radar.
2. **As esferas viram sub-abas de Documentação.** O que a Ana faz, As regras, Onde busca e Global Health continuam desenhadas pelo motor do Retrato em `os/esferas.html`, dentro de um quadro do painel, com os dados ao vivo do `os/server.py`. Ficam ao lado de Fluxo, Mapa, Decisões, Glossário e Stack.
3. **Etiquetas do fluxo.** `canal:comigo` virou `ready-for-agent`; `canal:dispare` e `canal:aguardando` viraram `ready-for-human`; `radar` virou `needs-triage` quando a issue não tinha canal. As etiquetas antigas saíram. O "Bloqueada por" do corpo virou o bloqueio nativo do GitHub.
4. **O pipeline do IAE, adaptado.** Entram `/ask-ana`, `/grill-with-docs`, `/to-prd`, `/to-issues`, `/pegar-issue`, `/tdd`, `/ship`, `/onda-enxuta`, `/express`, `/minhas-issues` e os agentes `ana-implementador`, `ana-revisor` e `ana-corretor`. Saem as skills da outra versão que faziam o mesmo papel. As próprias da Ana (`bancada`, `testes`, `check`) ficam.
5. **O "app" é a pasta `ana/`.** PR que toca `ana/` passa pelo `ana-revisor` uma vez e pelo CI; o resto é ferramenta e passa só pelo CI.
6. **Sem deploy.** A subida termina no merge, como no IAE. A aba Produção mostra "sem deploy ainda". O que muda na plataforma fazer.ai continua sendo aplicado à mão.
7. **Nada de push direto na `main`.** Tudo entra por branch e PR.

## Alternativas

- **Manter o Cockpit e só acrescentar abas.** Dois lugares para ver as issues, com etiquetas diferentes dos outros dois projetos. Descartado.
- **Reescrever as esferas no painel novo.** O motor do Retrato também desenha o site do diretor; duplicar o desenho faria os dois divergirem. Descartado: o quadro reaproveita o motor.

## Consequências

- O `/check` e o `os/roadmap_github.py` leem as etiquetas novas.
- As páginas de `os/arquivo/` seguem abrindo por URL direta, com a barra estreita.
- Quando a Ana ganhar deploy automático, a Fase 4.4 do roteiro de instalação do Hospital (`tools/instalar-fluxo/ROTEIRO.md`) diz o que adaptar na subida.
