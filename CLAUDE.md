# CLAUDE.md

Programa Ana (Hospital São Matheus): agente de IA de atendimento/agendamento via WhatsApp, rodando na plataforma fazer.ai agents (com Chatwoot e Langfuse); a integração ao MV via API Global Health é pendente explícito do roadmap. Glossário do domínio em `CONTEXT.md`; estado do programa nas Issues do GitHub e narrativa em `roadmap/TODO.md` (use `/check` para retomar).

## Ana OS (o cockpit) e o roadmap vivo (vale para toda sessão, não só o /check)

O **Ana OS** (`os/` na raiz, ADR-0007) é o cockpit único do programa: `python3 os/server.py` e abrir `http://localhost:8777`. Desde o ADR-0030 (09/set/2026) é **uma página só** (`os/index.html`), o esqueleto do Retrato vestido de Ledger, com cinco abas no topo: **Cockpit** (a aba do GitHub desde o ADR-0031: filtros, funil, mesa de ação, grafo de execução, radar e o card da issue, tudo lido das Issues pelo `gh`) mais as quatro esferas com os mesmos nomes do Retrato: **O que a Ana faz hoje** (capacidades com os testes manuais e as famílias da bancada), **As regras da Ana** (mapa do SOP e anatomia do prompt), **Onde ela busca a resposta** (caminho de uma mensagem, ferramentas por origem com a chamada real, caminhos da integração e a versão do Chatwoot) e **Global Health: o que dá e o que não dá** (cadeias A a F elo a elo, com botão de rodar cada elo na homologação). As esferas são desenhadas pelos motores JS do Retrato (`retrato/assets/`, servidos por `/retrato/`, fonte única) sobre `/api/retrato`, o `gerar.py` chamado ao vivo pelo server; a camada de operação está em `os/assets/os-esferas.js`; o leitor é um arquiteto (o Pedro e quem pegar o programa depois). Regra de corte: o OS mostra o que o Retrato mostra mais o ao vivo, a prova crua e o Cockpit, nada além. As páginas anteriores (Cockpit, Mecanismo, Mapa do SOP, Provas, Cadeias) e as mais antigas (Bancada da API GH, Absorção, Insights, Atlas, Roteiro, Mapa das APIs, Conexão TST, Biblioteca) vivem intactas em `os/arquivo/`, fora do menu, por URL direta. O OS é **só leitura**: nenhuma escrita pela tela; card novo, card feito e canal movido nascem por sessão no terminal. Visual: `os/DESIGN.md` (tema claro, sem travessões). Regras do server: GH só homologação, Oracle TST só SELECT, `dados-locais/` e `amostras/` jamais servidos, produção jamais chamada.

O **Retrato da Ana** (`retrato/` na raiz, ADR-0028) é o segundo produto: site estático para o diretor do hospital, publicado na Vercel. `python3 retrato/gerar.py` grava `retrato/dados/retrato.json` carimbado com a data (lê a plataforma e os JSON de `os/dados/`) e recusa gerar se achar CPF, paciente-sonda, URL de ambiente, token, credencial ou ID de tarefa. Quatro esferas: o que a Ana faz hoje, as regras da Ana (prompt completo e literal), onde ela busca a resposta, Global Health: o que dá e o que não dá. Miolo literal, moldura em linguagem de diretor. Publicar é ato do Pedro (`vercel` na raiz).

O estado do programa mora nas **Issues do GitHub** do repo privado `pedrorezendefig/programa-ana` (ADR-0031, 09/out/2026). Issue aberta é card aberto; fechada é card feito. Não existe espelho em arquivo: o `os/dados/roadmap.json` morreu (a última versão está em `roadmap/arquivo/`), e o `roadmap/TODO.md` guarda só a narrativa (o parágrafo "Estado" e o log), sem tabela de tarefas. O Cockpit do Ana OS e o `/check` leem o `gh` pelo mesmo módulo (`os/roadmap_github.py`).

A gramática de uma issue:
- **Labels `area:`** (categoria, pode ter mais de uma): `area:global-health`, `area:ana`, `area:fazer-ai`, `area:chatwoot`, `area:app-hospital`, `area:os`. A primeira é a faixa do grafo.
- **Label `canal:`** (uma por issue aberta, obrigatória): `canal:dispare` (só o Pedro, minutos), `canal:comigo` (uma sessão resolve), `canal:aguardando` (já pedido a terceiro; aqui se cobra). A idade no canal vem da data em que a label foi posta. Não existe "dono".
- **Label `radar`** (fora do grafo e do termômetro) com `Prioridade: N/10` no corpo; `in-progress` para em curso.
- **Corpo** com seções fixas: `Antes: <ID antigo>` (só nas migradas), `## Destrava`, `## Gesto`, `## Pronto quando`, `## Prompt` (texto para colar numa sessão), `## Bloqueada por` (uma linha `#N` por dependência; "bloqueada" é derivado, nunca escrito), `## Nota`. Issue aberta sem Gesto ou sem Prompt aparece como defeito no Cockpit.
- **Fechar** é comentar `## Ficha` com `Fez:`, `Mudou:`, `Valor:` (uma linha cada) e fechar. O milestone é o estágio.

Regra: **se você avançar, concluir ou criar um card em qualquer sessão, faça no GitHub via `gh`** (`gh issue create` com as labels e o corpo nas seções; `gh issue edit N --add-label canal:x --remove-label canal:y` para mover de canal; `gh issue close N --comment "## Ficha..."` para concluir) e registre uma linha no log do `TODO.md`. O OS é só leitura: nada muda pela tela. Nas páginas do OS, só mexa quando a tarefa for evoluir o próprio OS.

O roadmap anterior (trilhas A a G, PENDENCIAS.md, mapas antigos, o mapa.html de 30/jul) está arquivado intacto em `roadmap/arquivo/`: é acervo de consulta (textos prontos para a Global Health e o analista de TI, histórico do banco MV), nunca fonte do estado atual.

Ao falar com o Pedro sobre tarefas, traduza os IDs para linguagem de ação e agrupe por canal (dispare hoje / sente comigo / aguardando terceiros); o ID é etiqueta, não título. Incentive-o a empurrar frentes em paralelo.

## Consultar o banco Oracle do MV (base TST/homolog)

A conexão já está configurada e funciona (credenciais no `.env` da raiz, fora do git). Para qualquer consulta ao banco, rode:

```bash
python3 ana/api-mv/scripts/query-mv.py "SELECT ..."
```

- Somente leitura: o script recusa tudo que não for `SELECT`/`WITH`. Escrita no banco é sempre deliberada, nunca via script.
- Owner canônico das tabelas: `DBAMV` (ex.: `DBAMV.PACIENTE`).
- Dicionário das tabelas já estudadas: `ana/api-mv/dicionario-colunas.md`. Detalhes da conexão (modo thick, Instant Client): `ana/api-mv/conexao-oracle.md`.
- Esta é a base TST (teste). Produção: só o Pedro, manualmente, no DBeaver; nunca colocar credencial de produção no `.env` desta máquina.
- Dados pessoais de pacientes não entram no git: amostras vão para `ana/api-mv/resultados/amostras/` (ignorado). Em consultas exploratórias, prefira contagens e colunas não identificáveis.

## API Global Health (homolog)

Token no `.env` (`GH_TOKEN_HOMOLOG`). Re-teste rápido da API: `python3 ana/api-mv/scripts/smoke-gh.py`. Produção é proibida nas ferramentas locais.
