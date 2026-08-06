# CLAUDE.md

Programa Ana (Hospital São Matheus): agente de IA de atendimento/agendamento via WhatsApp, rodando na plataforma fazer.ai agents (com Chatwoot e Langfuse); a integração ao MV via API Global Health é pendente explícito do roadmap. Glossário do domínio em `CONTEXT.md`; estado do programa em `roadmap/TODO.md` (use `/check` para retomar).

## Ana OS (o cockpit) e o roadmap vivo (vale para toda sessão, não só o /check)

O **Ana OS** (`os/` na raiz, ADR-0007) é o cockpit único do programa: `python3 os/server.py` e abrir `http://localhost:8777`. Home com roadmap e painel de aplicações, Mapa das APIs, diagrama de arquitetura, bancada e roteiro da API GH (homolog), Atlas da produção, Biblioteca de docs. Visual: `os/DESIGN.md` (tema claro, sem travessões). Regras do server: GH só homologação, Oracle TST só SELECT, `dados-locais/` e `amostras/` jamais servidos, produção jamais chamada.

O estado do programa mora em dois lugares que precisam concordar sempre:
- `roadmap/TODO.md`: a verdade **narrativa** do estágio atual (estado, fichas curtas com "pronto quando", log). IDs estáveis V1../OS1.. e pendentes GH1/OV1, donos P/C/E.
- `os/dados/roadmap.json`: o espelho de **dados** que a home e o grafo de execução do Ana OS renderizam (tarefas, pendentes, a faixa de Ideias, a camada de `propostas` P1.. do ADR-0008, e a faixa `radar`). O "bloqueada" é derivado de `deps`, nunca escrito à mão. As Ideias também são editáveis pela própria UI (única rota de escrita do server); ideia nova no JSON é insumo do Pedro a digerir. Propostas e os campos `prompt` dos nós acionáveis não têm espelho no TODO.md: preserve-os ao reconciliar; proposta só vira tarefa quando o Pedro puxar. A faixa `radar` (espelhada na seção Radar do TODO.md) guarda bugs/hotfixes que não impactam o objetivo, com `prioridade` 1-10, fora do grafo de execução; item do radar só volta a ser tarefa se o Pedro puxar.

Regra: **se você avançar, concluir ou criar uma tarefa do roadmap em qualquer sessão, atualize os DOIS** (o status/log no TODO.md e o campo `status` da tarefa no roadmap.json), mantendo o mesmo ID. Nas páginas do OS, só mexa quando a tarefa for evoluir o próprio OS; dados vivem nos JSON de `os/dados/`. O `/check` reconcilia os dois toda vez que roda, então ele é a rede de segurança, mas não conte com ele: deixe sincronizado ao mexer.

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
