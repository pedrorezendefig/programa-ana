---
name: ask-ana
description: Router do pipeline da Ana. Digite /ask-ana para descobrir qual skill usar agora.
disable-model-invocation: true
---

# Ask Ana: router do pipeline

Responde "qual skill eu uso agora?" apontando a skill certa e o porquê. Não executa nada; só roteia. Se o pedido do usuário vier junto (`/ask-ana como subo um fix?`), responda direto com a rota recomendada.

## O mapa do fluxo

Ideia → `/grill-with-docs` (ou `/express`, se é pequena) → `/to-prd` → `/to-issues` → `/pegar-issue <N>` → `/tdd` → `/ship` → subida (merge). Em lote, sem ninguém olhando: `/onda-enxuta`. Antes de escolher o que fazer: `/minhas-issues`.

O "app" da Ana é a pasta `ana/` (prompt, bancada, scripts da API do MV e da Global Health). PR que toca `ana/` passa pelo `ana-revisor`; o resto é ferramenta e só passa pelo CI.

## Qual porta? (antes de tudo)

Nem todo trabalho é PRD. Classifique primeiro; o `/grill-with-docs` faz isso no fechamento e o `/express` já nasce na porta C.

| Porta | Quando | Caminho | Por que esse peso |
|---|---|---|---|
| **A. PRD + fatias** | Muda comportamento visível em mais de uma fatia, ou o Pedro e o diretor do hospital precisam saber (bloco "Para quem decide"), ou não cabe numa sessão | `/grill-with-docs` → `/to-prd` → `/to-issues` → `/onda-enxuta` ou `/pegar-issue` | O PRD é o que quem decide lê no GitHub; a issue é a spec do implementador |
| **B. Issue única, sem PRD** | Uma fatia vertical no app (`ana/`), cabe numa sessão, sem decisão do Pedro nem do diretor. Várias independentes: `/onda-enxuta --all` ou agentes paralelos na mesma sessão | `/triage` ou `gh issue create` com critérios de aceite → `/pegar-issue N` | PR do app passa pelo `ana-revisor`, e a lente spec × diff precisa dos critérios; os critérios viram os testes do `/tdd`; o funil do OS conta issues |
| **C. PR direto, sem issue** | Ferramenta (tudo fora de `ana/`: `.claude/`, `tools/`, `.github/`, `docs/`, `os/`, `retrato/`, `roadmap/`) e chore do app que não muda comportamento (texto, lint, config) | Edita na branch → `/ship "<descrição>" --from-diff` → subida. Paralelo: um `Agent` com `isolation: worktree` por mudança, cada um termina no `/ship --skip-review`, e um `fechar_onda.py --prs a b c` no fim | ADR 0068, regra 12: decisão de ferramenta vai no corpo do PR. O OS mostra o PR na aba PRs; sem issue fica fora do funil, e é isso mesmo: o funil é trabalho em aberto |

Teste rápido entre B e C: **alguém precisa conferir que fez o que foi pedido?** Sim: B (precisa de critério escrito). A prova é o diff e o CI: C.

## Fluxo principal (planejar → desenvolver → entregar)

1. **Planejar**: `/grill-with-docs` desafia o plano contra o domínio (uma pergunta por vez, recomendação destacada em cada decisão; atualiza `CONTEXT.md`/ADR via `domain-modeling`). Modo lote (`--lote`, "responde tudo"): todas as lacunas já decididas de uma vez, fecha com "ok" ou "N: correção". Dúvida factual de serviço externo no meio do grilling → `/research` em background.
2. **Especificar**: `/to-prd` vira PRD (1 issue `ready-for-agent`, aberta pelo bloco "Para quem decide") → `/to-issues` quebra em fatias verticais com label `fatia:P/M/G`.
3. **Desenvolver**: `/pegar-issue <N>` (claim atômico + branch; sem argumento, lista a fila) → `/tdd` (red → green → refactor).
4. **Entregar**: `/ship` leva até o **PR verde** (ferramenta, nada em `ana/`: só o CI; app: `ana-revisor` uma vez, com a lente de segurança se o `sensivel.py` acusar e spec × diff se houver issue, mais o CI; must-fix ou CI vermelho chamam o `ana-corretor`) e roda a subida sozinho, sem parada. **Subida única** (ADR 0068): `python3 .claude/skills/onda-enxuta/scripts/fechar_onda.py --prs <N>` mergeia PR a PR pela API (squash), e para aí: a Ana não tem deploy pelo repositório (o prompt e as ferramentas vivem na plataforma fazer.ai e mudam por sessão, com aprovação do Pedro), então o `services` do `docs/spec/deploy/project.json` fica vazio e a subida termina no merge, sem versão, build, health nem registro; nenhum push. Serve a um PR avulso ou ao lote de uma onda; quem roda é o `/ship` do autor do PR ou o fechamento da onda. Conflito na subida chama o `ana-corretor` com a `/resolver-conflitos` e conta tentativa; a terceira falha vai para `ready-for-human`. `/deploy status` confirma que não há deploy.

## Modo AFK

- `/minhas-issues [@login]`: check de um minuto antes de escolher o que fazer: semáforo do Actions, o que está em andamento e onde parou, fila por PRD com idade, e plano de até 3 passos com comando pronto (o passo de ondas devolve o `/montar-ondas-enxutas` com recorte), mais o passo a passo de cada `ready-for-human` (por que é humana, o que o agente faz, o que só você faz). "Minha" = atribuída, ou criada sem ninguém atribuído. Não executa nada.
- `/montar-ondas-enxutas [--exceto #PRD] [--max-sessoes N]`: antes de abrir várias `/onda-enxuta`, monta o plano: inventário que presta contas de toda issue aberta, triagem rápida das `needs-triage` com decisão cravada na issue, pergunta ao humano as decisões de domínio pendentes (2 opções, recomendação na frente) e crava a resposta, agrupamento pela dependência (não pelo arquivo) em sessões sem conflito interno, e um arquivo de prompt mais um comando de lançamento por sessão (sessão de fundo, zero MCP). Entrega a agenda das intervenções humanas no meio das ondas (credencial, ato na plataforma fazer.ai, resposta da Global Health) e termina perguntando "Posso lançar?": com o "pode", lança ela mesma a sessão da onda 1 de cada fila. Fora isso, não executa nada.
- `/onda-enxuta [#PRD | --all] [--paralelo N] [--sessao <nome>] [--onda N]`: esvazia a fila sozinho em ondas, uma sessão de fundo por onda (`scripts/lancar_sessao.sh`), implementador que morre no PR, corretor fresco, merge PR a PR pela API dos PRs verdes de cada lote pelo `fechar_onda.py` (as paradas humanas são as da regra 9 da ADR 0068). A review é do agente `ana-revisor`, disparado pelo orquestrador (ADR 0068).
- `/retro-onda [<nome>-onda<N> | <id de sessão>]`: o último passo do modo AFK, quando o relatório da onda terminou em `retro: recomendada`. Lê o que a onda deixou (medição em `~/.claude/onda-enxuta/medicoes/`, baixas, comentários do corretor, saída da subida, JSONL da sessão) e propõe mudanças no **ambiente** dos agentes, não no código: ponteiro de navegação, check no CI, lente nova no `ana-revisor`, gatilho no `sensivel.py`, instrução sem efeito para apagar. Mecânico vira check; juízo vira lente. Só propõe; cada candidata aceita vira PR de ferramenta pelo `/ship`.

## On-ramps (como o trabalho entra)

- Ideia pequena, "dá pra fazer X?", print com uma vontade → `/express`: uma rodada só, olha o código, propõe a ponte mínima, e com o "siga" implementa e verifica. É a entrada da porta C; se a conversa pedir 5 decisões encadeadas, ele mesmo manda para o `/grill-with-docs`.

- `/triage`: criar/triar issues pelos papéis canônicos de label (`docs/agents/triage-labels.md`).
- Bug difícil ou regressão de performance → `/diagnose`.
- Esforço grande demais para caber num grilling de uma sessão (névoa multi-sessão) → `/wayfinder`: mapa de tickets de decisão no GitHub (label `wayfinder:map`), um ticket por sessão, até a rota clarear; o handoff no fim é `/to-prd` + `/to-issues`. A porta da frente do planejamento continua sendo `/grill-with-docs`.
- Melhorar arquitetura → `/improve-codebase-architecture` (relatório HTML); sanity-check de design → `/prototype`. Vocabulário de módulos em `codebase-design`; glossário e ADRs em `domain-modeling`.

## Pós-entrega

- `/snapshot`: mapa factual da `ana/` em `docs/spec/snapshots/`.
- **Pendência humana pós-ciclo** (credencial, ato na plataforma fazer.ai, resposta da Global Health): vira issue `ready-for-human` ligada ao PRD (`/ship` Passo 10); o Pedro acompanha no Cockpit do **Ana OS** e fecha a issue ao concluir.

## Skills próprias da Ana

Ficam fora do pipeline de PR, mas são o dia a dia do programa:

- `/check`: retoma o programa. Lê as Issues e a narrativa do `roadmap/TODO.md`, reconcilia e diz a fronteira do dia, agrupada por fila (`ready-for-human`: só o Pedro; `ready-for-agent`: uma sessão resolve; `needs-triage`: radar).
- `/bancada`: roda a bateria de cenários da Ana (3 rodadas) com o painel ao vivo e grava o diagnóstico em `ana/bancada/diagnosticos/`.
- `/testes`: a mesa de testes. Relatório dos cenários por capacidade, e ver, executar, montar ou revisar cenários da bancada.

Apoio, quando o assunto pede: `/teach` (ensinar um conceito), `/to-questionnaire` (decisão que outra pessoa responde), `/wizard` (roteiro interativo para passo que só um humano faz), `/wait-what` (re-explicar a última resposta), `/retro` (retrospectiva da sessão), `writing-for-agents` (ao escrever skill ou `CLAUDE.md`), `git-guardrails-claude-code`, `setup-pre-commit`, `migrate-to-shoehorn` e `scaffold-exercises`.

## Máquina nova

- `/setup-maquina [--nivel N] [--env] [--mapa]`: diagnóstico de quem clonou (clone atualizado, binários, gh, plugins, `.env` do Oracle TST e da Global Health homolog) com o conserto ao lado e de onde vem cada chave; `--mapa` explica cada pasta do repo pelo `README.md` da raiz e como se conectar a cada serviço.

## Travessia de sessões

- `/passagem [--bg]`: documento de handoff pra outra janela; `--bg` dispara a continuação em background.
- Conflito de merge/rebase → `/resolver-conflitos`.

## Invariantes (não re-litigar)

- **A subida não espera humano** (ADR 0068 do Hospital, de onde o fluxo veio): o gate é CI e o revisor agente. O `/ship` e o fechamento da onda rodam a subida (`fechar_onda.py`) sozinhos; ela faz o merge pela API e para aí, porque a Ana não tem deploy pelo repositório. O humano só é chamado na baixa `ready-for-human`. Cada um sobe o próprio PR.
- **Produção nunca é chamada** pelas ferramentas locais: Oracle do MV só na base TST e só `SELECT`; Global Health só homologação. Dado de paciente, CPF, token e credencial não entram no git.
- ADRs: consuma só `status: accepted`; supersessão bidirecional travada pelo CI `lint-adr`.
- Estado vive nas GitHub Issues + `docs/spec/deploy/*.json`; proibido criar docs paralelos de estado/processo.
- Nada de travessão nem meia-risca em texto visível ao usuário (o CI trava no passo "Lint travessão").
- **Régua de texto: todo texto para fora passa pelo humanizer**: `/ship`, `/to-prd` e `/to-issues` chamam a skill `humanizer` em modo embutido antes de gravar ou publicar, na voz da amostra aprovada do canal. Texto interno (comentário de código, scratchpad) não passa.

## Manutenção deste router

Criou, renomeou ou apagou skill do pipeline? Atualize este arquivo no mesmo commit (regra no `CLAUDE.md`).

Skill do Matt Pocock (`mattpocock-skills`) entra no pipeline **forkada** em `.claude/skills/`, em pt-BR, apontando `CONTEXT.md` (o upstream renomeou o glossário para `GLOSSARY.md` na v1.3; aqui o nome não muda) e com as fontes e destinos da Ana escritos. O plugin fica como referência de leitura, não como skill ativa do fluxo; o fork sombreia o nome. Instrução operativa que manda rodar outra skill diz "chame a Skill tool com `nome`", nunca `/nome` em prosa (convenção do upstream: o `/nome` solto é o que mais falha em disparar); `/nome` fica só onde um humano escolhe, como neste router.

As ADRs citadas pelo número nas skills do fluxo (0068, 0071 e afins) são do Hospital, de onde o fluxo veio pelo IAE: estão em `pedrorezendefig/hospital-reunioes`, `docs/adr/`. As ADRs da Ana, em `docs/adr/` deste repositório, têm numeração própria.
