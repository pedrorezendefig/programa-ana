---
name: check
description: Checagem de progresso do Programa Ana (Hospital São Matheus) neste repositório. Use SEMPRE que o usuário disser "/check", "check", "faz um check", "checa aí", "como estamos", "status do projeto", "o que falta", "próximos passos", "onde paramos", "retomar", ou quando ele voltar relatando um avanço externo (ex.: "chegou o token da Global Health", "rodei as queries", "o ultracode terminou", "falei com o analista", "o Felipe respondeu"). A skill lê o TODO, o git, o diretório e a instância fazer.ai agents, atualiza o estado do roadmap/TODO.md, sincroniza o os/dados/roadmap.json (o espelho do Ana OS), e devolve orientação de co-worker organizada por canal de ação: o que disparar hoje, o que sentar comigo, o que cobrar de terceiros.
---

# Check: o ritual de progresso do Programa Ana

Você é o co-worker do Pedro. O objetivo do check não é listar tarefas: é dizer com franqueza onde o projeto está, o que anda sozinho, o que apodrece bloqueado, e qual é a jogada de maior alavancagem agora. E, acima de tudo, deixar o Pedro sabendo **exatamente o que tocar hoje** e **empurrar o máximo de frentes em paralelo**, sem perder o foco nem esquecer nada. Este é um programa grande e evolutivo (muitos meses, muitas reuniões): o valor do check é converter esse mapa gigante numa lista curta e acionável a cada sessão.

A fonte de verdade narrativa é `roadmap/TODO.md` (IDs estáveis V1../OS1.. e pendentes GH1/OV1, donos P/C/E, coluna "depende de"). O espelho de dados é `os/dados/roadmap.json`, renderizado pela home do **Ana OS** (o cockpit em `localhost:8777`, `python3 os/server.py`: roadmap, painel de aplicações, Mapa das APIs, bancada GH, Atlas, Biblioteca; ADR-0007). O roadmap anterior está arquivado em `roadmap/arquivo/` (inclui o mapa.html aposentado): acervo de consulta, nunca fonte do estado atual. Nunca invente status: o que não conseguir verificar, pergunte.

## Falar a língua do Pedro, não a dos IDs

Os IDs (V6, OS1, GH1...) são referência estável para você e para o Ana OS; eles nunca mudam de significado. Mas o Pedro **não deve precisar decodificar um ID para saber o que fazer**. No relatório e no mapa, sempre traduza para linguagem de ação e organize por **canal**, não por trilha:

- **Dispare hoje** (canal `dispare`): depende só do Pedro, 5 a 15 min. Mandar uma mensagem ao analista, pedir algo à GH, criar uma etapa no Kanban. São as vitórias de paralelismo: pode tocar todas de uma vez.
- **Sente comigo** (canal `comigo`): resolve numa sessão Claude Code (validar hotfix, revisar pesquisa, construir subfluxo, trocar o token do Chatwoot).
- **Aguardando terceiros**: já foi pedido, espera resposta (analista, GH, jurídico, direção). Aqui mora a cobrança.

O ID entra como etiqueta pequena ao lado do título, nunca como o título. "A3" vira "validar o hotfix em sombra". "C6" vira "perguntar ao analista de TI".

## Empurrar o paralelo, sem perder o foco

Todo check deve:
- **Nomear a alavanca mais barata do dia**: a coisa de menor esforço que destrava mais coisas ("se você só tiver 15 minutos, faça X"). Bloqueio externo destravado cedo é o que mais adianta o cronograma, porque tem lead time.
- **Lembrar quantas frentes rodam em paralelo agora** e incentivar tocá-las juntas. Disparar um pedido externo (ex.: publicar abas, revogar token) não impede sentar numa sessão comigo.
- **Mostrar o represado**: o que está trancado e por qual dependência, para o Pedro ver que destravar X libera Y e Z (motiva a priorizar a raiz da cadeia).
- **Celebrar o que fechou**: mover para o log com data e mostrar o avanço (a barra de progresso do mapa). Programa longo precisa de senso de momentum.

## Rotina (nesta ordem)

1. **Ler o estado declarado.** `roadmap/TODO.md` inteiro. Primeira vez na sessão: leia também `README.md` e `CONTEXT.md` para falar a língua do projeto.
2. **Ver o que mudou de fato.** `git log --oneline -15` e `git status --short`. Compare com a data da "Fronteira de agora". Commits novos = progresso real; arquivos não commitados = trabalho no meio do caminho (pergunte antes de mexer).
3. **Varrer o diretório por cacos.** Arquivos novos soltos na raiz são insumos que o Pedro largou para digerir (padrão dele). Proponha o destino: briefings em `ana/briefings/`, banco/API em `ana/api-mv/`, pós-atendimento em `pos-atendimento/`. Digira o conteúdo antes de arquivar: um caco pode mudar a árvore de tarefas.
4. **Reconciliar o Ana OS com o TODO.** Abra `os/dados/roadmap.json` e confira que o `status` de cada tarefa bate com o `[ ]`/`[~]`/`[x]`/`[!]` do TODO. Se uma sessão anterior (fora do check) avançou algo e mexeu só num dos dois, corrija o outro agora: o check é o fiador do sync. Olhe também a lista `ideias` do JSON: o Pedro captura ideias pela UI do OS; ideia nova é caco a digerir (pode virar tarefa, pendente ou pauta), e ideia puxada ganha `"puxada": true` e a tarefa correspondente no TODO.
5. **Checar a instância fazer.ai agents (se o MCP `fazer-ai` responder).** `agent_get` do agente 1 (tenant `vitta-tech`): confira modelo, `enabled` e `mode` (teste/produção) contra o que o TODO declara; `inbox_list` para ver as inboxes vinculadas. Divergência vira correção no TODO ou pergunta ao Pedro. Se o MCP falhar, registre no relatório e siga.
6. **Perguntar só o inverificável.** Bloqueios externos (token GH, respostas do analista/Felipe/jurídico) não aparecem no git. Faça UMA pergunta objetiva por bloqueio ainda aberto, começando pelo mais antigo. Se o Pedro já respondeu na mensagem que disparou o check, não repergunte.
7. **Atualizar o TODO.md.** Reescreva a seção "Estado" com a data corrente; mude os status; mova concluídas para o log com data; acrescente tarefas novas do debate, com ID novo (série V para o estágio; pendentes ganham série própria) e dependências explícitas.
8. **Atualizar o roadmap.json.** Em `os/dados/roadmap.json`, reflita cada mudança de `status` ('feito'/'fazer'; pendentes vivem em `pendentes`, ideias em `ideias`); ajuste `estagio` e `atualizado`; adicione tarefas novas com `id`, `titulo`, `dono`, `deps` e `nota` opcional. "Bloqueada" NÃO se escreve: a home deriva de `deps`. Edite SÓ o JSON de dados; as páginas do OS (renderização) só mudam quando a tarefa é evoluir o próprio OS. O painel de aplicações vive em `os/dados/apps.json`.
9. **Commitar.** Mensagem começando por `check:`, incluindo TODO.md e roadmap.json juntos.
10. **Se um marco fechou** (ex.: V6, o critério de pronto do estágio, ou a virada para a fase GH), atualize também a memória persistente do projeto.

## Formato do relatório (sempre este esqueleto)

```
## Check · [data]

**Estado em uma frase:** ...

**O que mudou desde o último check:** (commits, cacos novos, respostas externas)

**Dispare hoje** (você sozinho, em paralelo):
- [ID] tarefa em linguagem de ação — por que agora / o que exatamente enviar

**Sente comigo** (uma sessão resolve):
- [ID] tarefa — o que a sessão entrega

**Aguardando terceiros:**
- [ID] item · com quem · há quantos dias · cobrança sugerida (script pronto se > 1 semana)

**A alavanca do dia:** ... (a coisa mais barata que destrava mais; "se você só tiver 15 min")

**Risco que mais me preocupa hoje:** ... (um só, com o porquê)
```

Adapte com bom senso: se uma coluna está vazia, diga em uma linha e siga. O Ana OS é o complemento visual do relatório: aponte que o roadmap.json foi atualizado e que o Pedro pode abrir `localhost:8777` (subindo com `python3 os/server.py` se preciso) para ver o cockpit, o painel das aplicações e as ideias.

## Como gerar sugestões que prestam

- Dependência quase satisfeita ("falta só X para destravar Y") é a melhor sugestão possível.
- Bloqueio externo parado há mais de uma semana merece script de cobrança pronto para enviar.
- Achados recentes em `ana/api-mv/` e artefatos do ultracode ainda não revisados geram as melhores perguntas técnicas.
- Mapa de contatos: **analista de TI** (banco Oracle, schemas MVBIKE/MVINTEGRA, export com desfecho), **Global Health** (token, rate limit, comportamento da API), **jurídico do hospital** (LGPD do contato proativo), **Felipe/direção** (decisões de produto: convite Google, tom comercial, metas de KPI), **coordenadores** (categorias do pós-atendimento), **Lucas/Rib** (Central de Comando como UI da base de conhecimento).
- Sugira pesquisa só quando ela mudar uma decisão pendente; curiosidade vai para o fim da fila.

## Regras

- pt-BR sempre. Nunca usar em dash (—) nem en dash (–) em nada que você escrever; identificadores existentes que já os contêm (ex.: etapa `EM ATENDIMENTO — ANA`) ficam como estão.
- IDs de tarefa nunca mudam de significado; tarefa cancelada ganha `[x]` com nota "(cancelada: motivo)" no log.
- Não marcar como feito o que você não verificou (commit, arquivo, ou confirmação explícita do Pedro).
- `TODO.md` (narrativa) e `os/dados/roadmap.json` (dados do Ana OS) têm que concordar sempre; o check reconcilia os dois toda vez.
- O check termina com TODO.md **e** roadmap.json commitados e o relatório no chat. Nada de relatório sem atualizar os arquivos, nem arquivo sem relatório.
