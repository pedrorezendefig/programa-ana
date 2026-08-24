---
status: accepted
date: 2026-08-24
amends: 0020
---

# O teste aponta para a seção do prompt, e a página de Testes vira lista filtrável

Decisão do Pedro (24/ago/2026, sessão de grilling): cada teste ganha um vínculo explícito com as seções do prompt (`secao_ids`, curado na fonte), e a página Testes manuais troca as duas faixas abertas por uma lista compacta com filtros, ordenação e detalhe em popover.

## Contexto

- A página do ADR-0020 mostrava os 61 testes com a ficha inteira aberta: rolagem longa, sem filtro nenhum. Para achar "os testes da Seção 2.3" ou "só o que a máquina roda", o Pedro rolava a página inteira.
- As capacidades da Comparação já tinham o campo `secao`, mas em prosa livre ("Seções 2.3 e 6.A", "Regra Híbrida"). Um parser automático falharia em 6 a 8 casos, sem avisar. Os cenários da bancada não tinham seção nenhuma.
- A anatomia do prompt no Circuito (ADR-0020) já tem âncora por seção (`circuito.html#sec-<id>`) e um campo `ordem` por seção: a jornada do SOP já está mapeada lá.

## Decisão

1. **O vínculo teste e seção nasce na fonte, nunca na página.** As 30 capacidades de `os/dados/comparacao.json` ganham `secao_ids` (lista de ids reais das seções do `circuito.json`); os 26 cenários de `ana/bancada/cenarios/integracao.json` ganham `secao` (prosa) e `secao_ids`. O runner da bancada ignora campos extras. A prosa continua para leitura; o id é o que gera link e filtro.
2. **Link só para seção que existe.** `secao_ids` vazio (caso ADR-0015, Seção 2.5 gated) não gera link: aparece a prosa com a marca "fora do prompt compilado". Nenhum link inventado, na linha do selo de origem (ADR-0020, cláusula 5).
3. **A página abre como lista única de linhas compactas, uma por teste.** Emenda a cláusula 3 do ADR-0020: as duas faixas deixam de ser seções da página e viram o filtro "quem roda". Cada linha mostra id, título, a mensagem que se manda, chip da seção, quem julga e o botão de copiar.
4. **Detalhe em popover: hover mostra, clique fixa.** O popover carrega a ficha completa (espere, falhou se, rastro do Chatwoot, checagens literais, turnos, selos de origem) e os links "§ seção" para `circuito.html#sec-<id>`. Esc ou clique fora fecha.
5. **Filtros e ordenação, com estado na URL.** Filtros: quem roda (todos, humano, máquina, sem teste), seção do SOP e busca livre. Ordenação: jornada do SOP (pela `ordem` das seções no `circuito.json`), ID, ou bloco e família. O estado vive no hash da URL; a página continua sem guardar nada (ADR-0017).

## Considered options

- **Parser automático da prosa `secao`:** rejeitado. Falharia em silêncio nos casos que não batem com as 41 seções do circuito; link quebrado sem dono é pior que link ausente.
- **Manter as duas faixas e filtrar dentro de cada uma:** rejeitado. Duplicaria a barra de filtros e impediria a visão "tudo da Seção 2.3", que cruza as duas fontes.
- **Modal grande centrado no clique:** rejeitado. Para varrer 61 testes, o hover com fixação por clique é mais rápido; o modal esconde a lista que se está varrendo.

## Consequências

- A página de Testes passa a ler três fontes: `comparacao.json`, `/api/cenarios` e `circuito.json` (seções, para rótulo, ordem e âncora).
- Se uma seção mudar de id no circuito, o chip da seção some do teste na hora: defeito visível, não silencioso.
- A curadoria dos `secao_ids` é pontual (feita em 24/ago/2026); teste novo nasce com o campo, e o par "Seção 7.5" aponta para o nó `7-4` do circuito, que hoje agrega o pós-registro.
- O CONTEXT.md atualiza o verbete Testes manuais.
