# CLAUDE.md

Programa Ana (Hospital São Matheus): agente de IA de atendimento/agendamento via WhatsApp, integrado ao MV via API Global Health. Glossário do domínio em `CONTEXT.md`; estado do programa em `roadmap/TODO.md` (use `/check` para retomar).

## Manter o roadmap vivo (vale para toda sessão, não só o /check)

O estado do programa mora em dois lugares que precisam concordar sempre:
- `roadmap/TODO.md`: a verdade **narrativa** (fichas das tarefas, "pronto quando", contexto, log). IDs estáveis A1..G6, donos P/C/E.
- `roadmap/mapa.html`: o espelho **visual** que o Pedro abre para ver as tarefas (arquivo único, autossuficiente, abre com duplo clique). Os dados vivem num bloco `TAREFAS` no topo do arquivo, cercado por comentários; o resto é renderização.

Regra: **se você avançar, concluir ou criar uma tarefa do roadmap em qualquer sessão, atualize os DOIS** (o status/log no TODO.md e o campo `status` da tarefa no bloco `TAREFAS` do mapa.html), mantendo o mesmo ID. Nunca edite o código de renderização do mapa, só o bloco de dados. O `/check` reconcilia os dois toda vez que roda, então ele é a rede de segurança, mas não conte com ele: deixe sincronizado ao mexer.

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
