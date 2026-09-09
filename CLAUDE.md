# CLAUDE.md

Programa Ana (Hospital São Matheus): agente de IA de atendimento/agendamento via WhatsApp, rodando na plataforma fazer.ai agents (com Chatwoot e Langfuse); a integração ao MV via API Global Health é pendente explícito do roadmap. Glossário do domínio em `CONTEXT.md`; estado do programa em `roadmap/TODO.md` (use `/check` para retomar).

## Ana OS (o cockpit) e o roadmap vivo (vale para toda sessão, não só o /check)

O **Ana OS** (`os/` na raiz, ADR-0007) é o cockpit único do programa: `python3 os/server.py` e abrir `http://localhost:8777`. Desde o ADR-0030 (09/set/2026) é **uma página só** (`os/index.html`), o esqueleto do Retrato vestido de Ledger, com cinco abas no topo: **Cockpit** (mesa de ação, grafo de execução e radar) mais as quatro esferas com os mesmos nomes do Retrato: **O que a Ana faz hoje** (capacidades com os testes manuais e as famílias da bancada), **As regras da Ana** (mapa do SOP e anatomia do prompt), **Onde ela busca a resposta** (caminho de uma mensagem, ferramentas por origem com a chamada real, caminhos da integração e a versão do Chatwoot) e **Global Health: o que dá e o que não dá** (cadeias A a F elo a elo, com botão de rodar cada elo na homologação). As esferas são desenhadas pelos motores JS do Retrato (`retrato/assets/`, servidos por `/retrato/`, fonte única) sobre `/api/retrato`, o `gerar.py` chamado ao vivo pelo server; a camada de operação está em `os/assets/os-esferas.js`; o leitor é um arquiteto (o Pedro e quem pegar o programa depois). Regra de corte: o OS mostra o que o Retrato mostra mais o ao vivo, a prova crua e o Cockpit, nada além. As páginas anteriores (Cockpit, Mecanismo, Mapa do SOP, Provas, Cadeias) e as mais antigas (Bancada da API GH, Absorção, Insights, Atlas, Roteiro, Mapa das APIs, Conexão TST, Biblioteca) vivem intactas em `os/arquivo/`, fora do menu, por URL direta. O OS é **só leitura**: nenhuma escrita pela tela; card novo, card feito e canal movido nascem por sessão no terminal. Visual: `os/DESIGN.md` (tema claro, sem travessões). Regras do server: GH só homologação, Oracle TST só SELECT, `dados-locais/` e `amostras/` jamais servidos, produção jamais chamada.

O **Retrato da Ana** (`retrato/` na raiz, ADR-0028) é o segundo produto: site estático para o diretor do hospital, publicado na Vercel. `python3 retrato/gerar.py` grava `retrato/dados/retrato.json` carimbado com a data (lê a plataforma e os JSON de `os/dados/`) e recusa gerar se achar CPF, paciente-sonda, URL de ambiente, token, credencial ou ID de tarefa. Quatro esferas: o que a Ana faz hoje, as regras da Ana (prompt completo e literal), onde ela busca a resposta, Global Health: o que dá e o que não dá. Miolo literal, moldura em linguagem de diretor. Publicar é ato do Pedro (`vercel` na raiz).

O estado do programa mora em dois lugares que precisam concordar sempre:
- `roadmap/TODO.md`: a verdade **narrativa** do estágio atual (estado, fichas curtas com "pronto quando", log). IDs estáveis V1../OS1.. e pendentes GH1/OV1, donos P/C/E.
- `os/dados/roadmap.json`: o espelho de **dados** que a home do Ana OS renderiza (tarefas, pendentes, a camada de `propostas` P1.. do ADR-0008, e a faixa `radar`; a faixa de Ideias morreu no ADR-0028). O "bloqueada" é derivado de `deps`, nunca escrito à mão. Todo item aberto (tarefa a fazer, pendente, proposta, radar) carrega os campos da **Mesa de ação** da home (ADR-0011): `canal` (dispare/comigo/aguardando), `canal_desde` e `mesa {destrava, gesto}`. Não existe escrita pela tela (ADR-0028): card novo, card feito e canal movido são pedidos do Pedro no terminal, e a sessão escreve nos dois arquivos. Propostas e os campos `prompt`, `canal`, `canal_desde` e `mesa` não têm espelho no TODO.md: preserve-os ao reconciliar; proposta só vira tarefa quando o Pedro puxar. A faixa `radar` (espelhada na seção Radar do TODO.md) guarda bugs/hotfixes que não impactam o objetivo, com `prioridade` 1-10, fora do grafo de execução; item do radar só volta a ser tarefa se o Pedro puxar.

Regra: **se você avançar, concluir ou criar uma tarefa do roadmap em qualquer sessão, atualize os DOIS** (o status/log no TODO.md e o campo `status` da tarefa no roadmap.json), mantendo o mesmo ID. Ao concluir, escreva também a `ficha` do nó no roadmap.json (`{fez, mudou, valor}`, três frases curtas curadas da ficha do TODO.md): é o que o hover do grafo mostra (regra da OS9). Item concluído perde `prompt`, `canal`, `canal_desde` e `mesa` (a mesa é só de abertos, regra da OS12); item aberto novo nasce com os três campos da mesa e com prompt (card sem prompt aparece como defeito na home). Nas páginas do OS, só mexa quando a tarefa for evoluir o próprio OS; dados vivem nos JSON de `os/dados/`. O `/check` reconcilia os dois toda vez que roda, então ele é a rede de segurança, mas não conte com ele: deixe sincronizado ao mexer.

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
