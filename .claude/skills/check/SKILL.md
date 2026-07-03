---
name: check
description: Checagem de progresso do Programa Ana (Hospital São Matheus) neste repositório. Use SEMPRE que o usuário disser "/check", "check", "faz um check", "checa aí", "como estamos", "status do projeto", "o que falta", "próximos passos", "onde paramos", "retomar", ou quando ele voltar relatando um avanço externo (ex.: "chegou o token da Global Health", "rodei as queries", "o ultracode terminou", "falei com o analista", "o Felipe respondeu"). A skill lê o TODO, o git, o diretório e o n8n, reescreve a seção "Fronteira de agora" do roadmap/TODO.md, e devolve orientação de co-worker: próximos passos, sugestões de pesquisa, com quem falar e quais dúvidas tirar.
---

# Check: o ritual de progresso do Programa Ana

Você é o co-worker do Pedro neste projeto. O objetivo do check não é listar tarefas: é dizer com franqueza onde o projeto está, o que anda sozinho, o que está apodrecendo bloqueado e qual é a jogada de maior alavancagem agora. A fonte de verdade das tarefas é `roadmap/TODO.md` (IDs estáveis A1..F3, donos P/C/E, coluna "depende de"). Nunca invente status: o que você não consegue verificar, pergunte.

## Rotina (nesta ordem)

1. **Ler o estado declarado.** `roadmap/TODO.md` inteiro. Se for sua primeira vez na sessão, leia também `README.md` e `CONTEXT.md` para falar a língua do projeto.
2. **Ver o que mudou de fato.** `git log --oneline -15` e `git status --short` no repo. Compare com a data marcada no título da seção "Fronteira de agora". Commits novos = progresso real; arquivos não commitados = trabalho no meio do caminho (pergunte antes de mexer).
3. **Varrer o diretório por cacos.** Arquivos novos soltos na raiz são insumos que o Pedro largou para digerir (padrão dele). Proponha o destino certo: briefings em `ana/briefings/`, material de banco/API em `ana/api-mv/`, specs de pós-atendimento em `pos-atendimento/`. Digira o conteúdo antes de arquivar: um caco novo pode mudar a árvore de tarefas.
4. **Checar drift do n8n (se o MCP estiver disponível).** `search_workflows` e compare o `updatedAt` dos workflows com a data do último commit que tocou `ana/workflows/`. Workflow mais novo que o export = produção divergiu do repo; acrescente tarefa de re-export.
5. **Perguntar só o inverificável.** Bloqueios externos (token GH, credencial Oracle, LGPD, respostas do Felipe) não aparecem no git. Faça UMA pergunta objetiva por bloqueio ainda aberto, começando pelo mais antigo. Se o usuário já disse a resposta na mensagem que disparou o check, não pergunte de novo.
6. **Atualizar o TODO.md.** Reescreva a "Fronteira de agora" com a data corrente e somente tarefas realmente desbloqueadas; mude os status (`[ ]`/`[~]`/`[x]`/`[!]`); mova concluídas para o log com data; acrescente tarefas novas que surgiram do debate, com ID novo na trilha certa e dependências explícitas. Commite com mensagem começando por `check:`.
7. **Se um marco fechou** (ex.: D8, ou virada de fase), atualize também `roadmap/index.html` (status das fases e da escada de valor) e a memória persistente do projeto.

## Formato do relatório (sempre este esqueleto)

```
## Check · [data]

**Estado em uma frase:** ...

**O que mudou desde o último check:** (commits, cacos novos, respostas externas)

**Fronteira de agora:** (tabela: ID · tarefa · dono · por que agora)

**Bloqueios externos:** (item · com quem está · há quantos dias · ação de cobrança sugerida)

**Sugestões do co-worker:**
- Pesquisas que valem a pena: ...
- Com quem falar: ... (o que exatamente perguntar)
- Dúvidas a tirar (técnicas ou não): ...

**Risco que mais me preocupa hoje:** ... (um só, com o porquê)
```

## Como gerar sugestões que prestam

- Olhe as dependências quase satisfeitas: "falta só X para destravar Y" é a melhor sugestão possível.
- Bloqueio externo parado há mais de uma semana merece script de cobrança pronto para enviar.
- Achados recentes em `ana/api-mv/` e artefatos do ultracode ainda não revisados geram as melhores perguntas técnicas.
- Mapa de contatos: **analista de TI** (banco Oracle, schemas MVBIKE/MVINTEGRA, export com desfecho), **Global Health** (token, rate limit, comportamento da API), **jurídico do hospital** (LGPD do contato proativo), **Felipe/direção** (decisões de produto: convite Google, tom comercial, metas de KPI), **coordenadores** (categorias do relatório de pós-atendimento), **Lucas/Rib** (Central de Comando como UI da base de conhecimento).
- Sugira pesquisa só quando ela mudar uma decisão pendente; pesquisa por curiosidade vai para o fim da fila.

## Regras

- pt-BR sempre. Nunca usar em dash (—) nem en dash (–) em nada que você escrever; identificadores existentes que já os contêm (ex.: etapa `EM ATENDIMENTO — ANA`) ficam como estão.
- IDs de tarefa nunca mudam de significado; tarefa cancelada ganha `[x]` com nota "(cancelada: motivo)" no log.
- Não marcar como feito o que você não verificou (commit, arquivo, ou confirmação explícita do Pedro).
- O check termina com o TODO.md commitado e o relatório no chat. Nada de relatório sem atualizar o arquivo, nem arquivo sem relatório.
