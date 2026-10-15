---
status: accepted
date: 2026-08-20
amended_by: 0020, 0022, 0028
---

# Cockpit enxuto: sete páginas saem de cena para o arquivo

Decisão do Pedro (20/ago/2026, sessão de saneamento do Ana OS): o cockpit cai de 16 para **9 páginas**. Sete páginas saem da navegação e vão intactas para `os/arquivo/`: **Absorção, Insights, Atlas, Roteiro, Mapa das APIs, Conexão TST e Biblioteca**. Nada é apagado; cada página tem um critério explícito de volta.

## Contexto

- A auditoria de 20/ago abriu as 16 páginas no navegador e conferiu os dados por trás de cada uma. Três fatos derrubaram o grupo:
  - **A colheita da produção nunca rodou.** A pasta `ana/api-mv/absorcao-producao/resultados/` está vazia (zero CSVs do pacote C8). Absorção (o manual da colheita), Insights (13 hipóteses sem nenhuma evidência) e Atlas (que promete produção hidratada e só mostra TST) vivem esperando dados que não chegaram desde o início de agosto.
  - **O Roteiro ensinava um comando morto** (`ana/api-mv/playground/server.py`, que não existe mais) e o resto dele repete a Bancada: as duas páginas cobrem a mesma homologação dem.agenda.
  - **O Mapa das APIs parou em 04/ago** e o Mapa da Integração (os17, ADR-0017 e ADR-0018) mais a Comparação contam hoje quase tudo o que ele contava, com dados vivos.
- A Conexão TST nasceu para diagnosticar uma conexão que já funciona (o essencial vive em `ana/api-mv/conexao-oracle.md`); a Biblioteca renderiza documentos que se leem melhor no editor.
- O Circuito da Ana também estava defasado (retratava o prompt v5.3 de 07/ago com só 40 de 95 trechos válidos), mas é a única página do mecanismo de execução: em vez de sair, foi re-validado contra o export v6.4 de 20/ago (88 trechos, 100% batendo) e ficou.

## Decisão

1. **Sete páginas vão para `os/arquivo/`**, intactas, servidas pelo mesmo server, fora da navegação. Mesmo padrão do `roadmap/arquivo/`: acervo de consulta, nunca fonte do estado atual.
2. **A navegação cai para 9 itens:** Cockpit, Roadmap (grafo), Arquitetura, Mapa do SOP, Circuito da Ana, Mapa da Integração, Comparação, Bancada e Cadeias. O `nav.js` marca páginas abertas de dentro de `os/arquivo/` com a trilha "arquivo".
3. **Critérios de volta:** Absorção, Insights e Atlas voltam no dia em que a colheita C8 rodar e os CSVs chegarem ao depósito. As demais só voltam se uma necessidade nova as puxar; a expectativa é que não voltem.
4. **O que era útil migrou antes de arquivar:** as queries de conferência exclusivas do Roteiro (detector de integração pelas colunas `*_INTEGRA` e busca do id da GH na `IT_AGENDA_CENTRAL`) entraram nos cards da Bancada; os links das páginas vivas que apontavam para as arquivadas foram redirecionados (Arquitetura e Cadeias para o Mapa da Integração, Bancada para `conexao-oracle.md`).

## Considered options

- **Apagar as sete páginas:** rejeitado. Absorção, Insights e Atlas são trabalho pronto esperando dados; apagar custaria refazer. O arquivo preserva com `git mv`.
- **Só tirar do menu, sem mover:** rejeitado. Página fora do menu mas na pasta principal volta a parecer viva para quem lista `os/`. A pasta `arquivo/` é a fronteira visível entre o que vale e o que é acervo.
- **Arquivar também o Circuito e as Cadeias:** rejeitado pelo Pedro. O Circuito é a única página do mecanismo de execução e estava em manutenção ativa (19/ago); a solução para a defasagem era re-validar, não arquivar. As Cadeias são a única página que prova consequência encadeada (o que um POST cria, o GET seguinte encontra).

## Consequências

- O `CLAUDE.md` passa a descrever o cockpit de 9 páginas; a descrição antiga citava Atlas, Biblioteca e roteiro.
- A Bancada vira a página única da homolog GH (chamadas ao vivo + queries de conferência, incluindo as herdadas do Roteiro).
- O Circuito ganhou a re-validação completa: meta v6.4 (53.251 chars, export de 20/ago via MCP `agent_export`), 88 trechos literais 100% válidos, grants ao vivo (8 nativas nomeadas, 1 RAG, 11 HTTP) e a saída da `cadastrar_paciente` refletida (fora dos grants desde a V20, ADR-0014).
- Quem procurar uma página arquivada abre `os/arquivo/<nome>.html` direto; os assets continuam funcionando (paths ajustados com `../`).
