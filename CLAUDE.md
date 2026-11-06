# CLAUDE.md

Programa Ana (Hospital São Matheus): agente de IA de atendimento/agendamento via WhatsApp, rodando na plataforma fazer.ai agents (com Chatwoot e Langfuse); a integração ao MV via API Global Health é pendente explícito do roadmap. Glossário do domínio em `CONTEXT.md`; estado do programa nas Issues do GitHub e narrativa em `roadmap/TODO.md` (use `/check` para retomar). Decisões em `docs/adr/`; o mapa das pastas no `README.md`.

## Regras

- Tudo em pt-BR. Tipo de commit em inglês (`feat`, `fix`, `chore`, `refactor`, `docs`) com descrição em pt-BR.
- **Sem travessão (U+2014) nem meia-risca (U+2013)** em nada que alguém lê: docs, skills, telas, PRs, issues e a fala da Ana. Use vírgula, dois-pontos, parênteses ou ponto. O CI trava.
- **Nunca faça push direto na `main`.** Todo trabalho entra por branch e PR. Depois de clonar, rode uma vez `git config core.hooksPath .githooks`, que liga a trava local.
- Issues e PRs não levam senha, token, CPF nem dado de paciente.

## Fluxo de trabalho (ADR-0035)

O mesmo fluxo do IAE e do Hospital, centrado em GitHub Issues. O mapa de qual skill usar em cada momento vive no router **`/ask-ana`**. Espinha dorsal:
- **Planejar:** `/grill-with-docs` (desafia o plano contra o domínio, uma pergunta por vez, com a recomendação destacada; atualiza `CONTEXT.md` e ADR) → `/to-prd` → `/to-issues`.
- **Desenvolver:** `/pegar-issue <N>` → `/tdd` → `/ship`. PR de ferramenta passa só pelo CI; PR que toca `ana/` passa pelo `ana-revisor` uma vez e pelo CI; must-fix ou CI vermelho chamam o `ana-corretor`. A **subida** (`fechar_onda.py --prs <N>`, que o `/ship` roda sozinho) mergeia pela API depois do CI verde e para aí: a Ana ainda não tem deploy. O que muda na plataforma fazer.ai segue sendo aplicado à mão. **Modo AFK:** `/onda-enxuta`.
- Criou, renomeou ou apagou skill do fluxo? Atualize o `/ask-ana` no mesmo commit, e o desenho do fluxo no PedroOS (`projetos/ana/fluxo.json`).

O estado do programa mora nas **Issues do GitHub** do repo privado `pedrorezendefig/programa-ana`. Etiquetas de estado: `needs-triage`, `needs-info`, `ready-for-agent` (uma sessão resolve), `ready-for-human` (só o Pedro, ou já pedido a terceiro), `wontfix` e `in-progress`; `area:*` diz a frente (`ana`, `global-health`, `fazer-ai`, `chatwoot`, `app-hospital`, `os`). Bloqueio entre issues é a dependência nativa do GitHub. O `roadmap/TODO.md` guarda só a narrativa (o parágrafo "Estado" e o log); `/check` retoma. Detalhes em `docs/agents/issue-tracker.md` e `docs/agents/triage-labels.md`.

Ao falar com o Pedro sobre tarefas, traduza os números para linguagem de ação e agrupe por quem destrava (só ele / uma sessão resolve / aguardando terceiro). Incentive-o a empurrar frentes em paralelo: várias sessões rodam issues `ready-for-agent` diferentes ao mesmo tempo, um git worktree por issue.

## Painel e Retrato

O painel do fluxo (issues, PRs, Fases, Esferas, Áreas e Documentação) é o **PedroOS**, no repo `pedrorezendefig/os`. O antigo Ana OS (`os/server.py`) e o `tools/workflow-dashboard/` saíram deste repo. Da pasta `os/` ficaram só `os/dados/` (os JSON curados que o `retrato/gerar.py`, a bancada e o `smoke-hospital.py` leem ou gravam) e `os/roadmap_github.py` (o termômetro do `/check`).

O **Retrato da Ana** (`retrato/`, ADR-0028) é o site estático para o diretor do hospital, publicado na Vercel. `python3 retrato/gerar.py` grava `retrato/dados/retrato.json` e recusa gerar se achar CPF, paciente-sonda, URL de ambiente, token, credencial ou ID de tarefa. Publicar é ato do Pedro (`vercel` na raiz).

O roadmap anterior está arquivado intacto em `roadmap/arquivo/`: acervo de consulta, nunca fonte do estado atual.

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
