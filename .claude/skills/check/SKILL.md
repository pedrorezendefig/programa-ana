---
name: check
description: 'Checagem de progresso do Programa Ana (Hospital São Matheus) neste repositório. Use SEMPRE que o usuário disser "/check", "check", "faz um check", "checa aí", "como estamos", "status do projeto", "o que falta", "próximos passos", "onde paramos", "retomar", "liga o Retrato", ou quando ele voltar relatando um avanço externo (ex.: "chegou o token da Global Health", "rodei as queries", "o ultracode terminou", "falei com o analista", "o Felipe respondeu"). A skill liga o Retrato (8778) se estiver fora do ar, mede o estágio em porcentagem real (issues fechadas sobre o total no GitHub, ADR-0031), lê o TODO, o git, o diretório e a instância fazer.ai agents, cura as issues (papel de triage ready-for-human/ready-for-agent/needs-triage, labels area:, gesto e prompt) via gh, atualiza a narrativa do roadmap/TODO.md, e devolve orientação de co-worker organizada por canal de ação: o que disparar hoje, o que sentar comigo, o que cobrar de terceiros.'
---

# Check: o ritual de progresso do Programa Ana

Você é o co-worker do Pedro. O objetivo do check não é listar tarefas: é dizer com franqueza onde o projeto está, o que anda sozinho, o que apodrece bloqueado, e qual é a jogada de maior alavancagem agora. E, acima de tudo, deixar o Pedro sabendo **exatamente o que tocar hoje** e **empurrar o máximo de frentes em paralelo**, sem perder o foco nem esquecer nada. Este é um programa grande e evolutivo (muitos meses, muitas reuniões): o valor do check é converter esse mapa gigante numa lista curta e acionável a cada sessão.

A fonte dos cards são as **Issues do GitHub** do repo `pedrorezendefig/programa-ana` (ADR-0031): labels `area:` (categoria) e um papel de triage por issue aberta (`ready-for-human`, `ready-for-agent` ou `needs-triage`, de `docs/agents/triage-labels.md`; substituíram as antigas `canal:dispare`, `canal:aguardando`, `canal:comigo` e `radar`); corpo com `## Destrava`, `## Gesto`, `## Pronto quando`, `## Prompt`, `## Bloqueada por` (`#N`), `## Nota`; a ficha de conclusão é um comentário `## Ficha` (Fez/Mudou/Valor); o milestone é o estágio. O `roadmap/TODO.md` guarda só a narrativa (o parágrafo "Estado" e o log). O painel dessas issues é o **PedroOS** (o antigo Ana OS saiu do repo). As issues migradas trazem `Antes: V37` na primeira linha do corpo: o ID antigo é só referência histórica; o ID de hoje é `#N`. O roadmap anterior está arquivado em `roadmap/arquivo/` (inclui o mapa.html aposentado): acervo de consulta, nunca fonte do estado atual. Nunca invente status: o que não conseguir verificar, pergunte.

## Falar a língua do Pedro, não a dos IDs

Os IDs (V6, OS1, GH1...) são referência estável para você; eles nunca mudam de significado. Mas o Pedro **não deve precisar decodificar um ID para saber o que fazer**. No relatório e no mapa, sempre traduza para linguagem de ação e organize por **canal**, não por trilha. O canal sai do papel de triage da issue:

- **Dispare hoje** (`ready-for-human`, ainda não pedido): depende só do Pedro, 5 a 15 min. Mandar uma mensagem ao analista, pedir algo à GH, criar uma etapa no Kanban. São as vitórias de paralelismo: pode tocar todas de uma vez.
- **Sente comigo** (`ready-for-agent`, ou `in-progress` já em curso): resolve numa sessão Claude Code (validar hotfix, revisar pesquisa, construir subfluxo, trocar o token do Chatwoot).
- **Aguardando terceiros** (`ready-for-human` cujo Gesto já foi feito: o pedido saiu e a resposta não voltou): espera analista, GH, jurídico, direção. Aqui mora a cobrança. O GitHub não separa este canal do Dispare hoje (a migração juntou os dois em `ready-for-human`): separe você, lendo o corpo e os comentários.

O ID entra como etiqueta pequena ao lado do título, nunca como o título. "A3" vira "validar o hotfix em sombra". "C6" vira "perguntar ao analista de TI".

## Empurrar o paralelo, sem perder o foco

Todo check deve:
- **Nomear a alavanca mais barata do dia**: a coisa de menor esforço que destrava mais coisas ("se você só tiver 15 minutos, faça X"). Bloqueio externo destravado cedo é o que mais adianta o cronograma, porque tem lead time.
- **Lembrar quantas frentes rodam em paralelo agora** e incentivar tocá-las juntas. Disparar um pedido externo (ex.: publicar abas, revogar token) não impede sentar numa sessão comigo.
- **Mostrar o represado**: o que está trancado e por qual dependência, para o Pedro ver que destravar X libera Y e Z (motiva a priorizar a raiz da cadeia).
- **Celebrar o que fechou**: mover para o log com data e mostrar o avanço (a barra de progresso do mapa). Programa longo precisa de senso de momentum.

## Rotina (nesta ordem)

0. **Ligar o Retrato e medir.** Rode `python3 .claude/skills/check/scripts/ligar-e-medir.py`. Ele sobe o Retrato (`http.server` em `retrato/`, porta 8778) só se a porta estiver fechada (logs em `/tmp/ana-os-logs/`), e imprime o **termômetro** lido do GitHub: issues fechadas sobre o total (sem as `needs-triage`, o antigo radar), as abertas por canal com o gesto (`ready-for-human` numa raia, `ready-for-agent` e `in-progress` na outra), as bloqueadas por `## Bloqueada por`, as sem papel de triage e as sem Gesto ou Prompt (defeitos). O número do termômetro é esse, não uma estimativa sua: "3 de 11 = 27%" vai para o relatório como saiu do script. Se o Retrato não subir, diga no relatório e siga. (`--so-medir` só mede, sem ligar.)
1. **Ler o estado declarado.** `roadmap/TODO.md` inteiro (narrativa e log) e, se precisar do detalhe de uma issue, `gh issue view N -R pedrorezendefig/programa-ana --comments`. Primeira vez na sessão: leia também `README.md` e `CONTEXT.md` para falar a língua do projeto.
2. **Ver o que mudou de fato.** `git log --oneline -15` e `git status --short`. Compare com a data da "Fronteira de agora". Commits novos = progresso real; arquivos não commitados = trabalho no meio do caminho (pergunte antes de mexer).
3. **Varrer o diretório por cacos.** Arquivos novos soltos na raiz são insumos que o Pedro largou para digerir (padrão dele). Proponha o destino: briefings em `ana/briefings/`, banco/API em `ana/api-mv/`, pós-atendimento em `pos-atendimento/`. Digira o conteúdo antes de arquivar: um caco pode mudar a árvore de tarefas.
4. **Curar as issues.** O GitHub é a única fonte (ADR-0031), então não há dois arquivos para reconciliar; o que há é higiene: toda issue aberta precisa de um papel de triage que diga a verdade (trabalho que uma sessão resolve ainda como `ready-for-human`, ou resposta que chegou e deixou a issue pronta para sessão, são correções suas, via `gh issue edit N --add-label ready-for-agent --remove-label ready-for-human`), de pelo menos uma `area:`, e de `## Gesto` e `## Prompt` no corpo (o passo 0 lista os defeitos). Card novo é pedido do Pedro no terminal: `gh issue create` com título em linguagem de ação, labels, milestone do estágio e o corpo nas seções. Card feito: `gh issue close N --comment` com `## Ficha` (Fez/Mudou/Valor). Item do radar (`needs-triage`) só volta a tarefa se o Pedro puxar: troque a label pelo papel certo (`ready-for-human` ou `ready-for-agent`).
5. **Checar a instância fazer.ai agents (se o MCP `fazer-ai` responder).** `agent_get` do agente 1 (tenant `vitta-tech`): confira modelo, `enabled` e `mode` (teste/produção) contra o que o TODO declara; `inbox_list` para ver as inboxes vinculadas. Divergência vira correção no TODO ou pergunta ao Pedro. Se o MCP falhar, registre no relatório e siga.
6. **Checar o atraso do Chatwoot (ADR-0024).** Rode `python3 ana/plataforma/scripts/fetch-chatwoot-releases.py`: ele compara a versão instalada (perguntada ao vivo no `GET /api` do Chatwoot) com a última publicada pela fazer.ai e imprime as releases que estão na frente. Se o atraso for zero, uma linha no relatório e siga. Havendo atraso, leia as notas novas com a **lente fixa**: (1) toca o caminho da Ana (bot, token de API, tags, inbox, handoff)? (2) toca a evidência que a bancada confere no Chatwoot (etapa, tag, avisos de status)? (3) toca o que o hospital vê (filas, abas de atribuição, permissões)? (4) muda contrato que o `ana/bancada/e2e.py` usa? O que bater em alguma pergunta entra em `ana/plataforma/chatwoot-releases.md` com a data; o resto não é registrado. **Nota de release não é prova de que um bug morreu**: só o teste depois de subir vale. Se o script falhar (rede, ou a página mudou de formato), registre no relatório e siga. Fronteira: aqui é só o Chatwoot; achados da plataforma fazer.ai agents continuam no radar V10.
7. **Perguntar só o inverificável.** Bloqueios externos (token GH, respostas do analista/Felipe/jurídico) não aparecem no git. Faça UMA pergunta objetiva por bloqueio ainda aberto, começando pelo mais antigo. Se o Pedro já respondeu na mensagem que disparou o check, não repergunte.
8. **Atualizar o TODO.md.** Reescreva o parágrafo "Estado" com a data corrente e acrescente uma linha no log com o que mudou (issues criadas, movidas e fechadas, com `#N`). Não há mais tabela de tarefas no TODO.md: ela é a lista de issues.
9. **Escrever no GitHub o que o debate decidiu.** Issue nova, papel de triage trocado, issue fechada com ficha: tudo via `gh`, no mesmo check, antes do relatório. O painel de aplicações continua em `os/dados/apps.json`.
10. **Commitar.** Mensagem começando por `check:`, com o TODO.md e o que mais mudou.
11. **Se um marco fechou** (ex.: V6, o critério de pronto do estágio, ou a virada para a fase GH), atualize também a memória persistente do projeto.

## Formato do relatório (sempre este esqueleto)

```
## Check · [data]

**Estado em uma frase:** ...

**Termômetro do estágio:** N de M cards feitos (P%), número do script. Faltam: (títulos curtos dos abertos, numa linha)

**Próximos passos, em ordem:** 1. ... 2. ... 3. ... (os três de maior alavancagem, em linguagem de ação, com o ID como etiqueta)

**Retrato no ar:** `http://localhost:8778` (ou "não subiu: motivo")

**O que mudou desde o último check:** (commits, cacos novos, respostas externas)

**Dispare hoje** (você sozinho, em paralelo):
- [ID] tarefa em linguagem de ação: por que agora / o que exatamente enviar

**Sente comigo** (uma sessão resolve):
- [ID] tarefa: o que a sessão entrega

**Aguardando terceiros:**
- [ID] item · com quem · há quantos dias · cobrança sugerida (script pronto se > 1 semana)

**A alavanca do dia:** ... (a coisa mais barata que destrava mais; "se você só tiver 15 min")

**Risco que mais me preocupa hoje:** ... (um só, com o porquê)
```

Adapte com bom senso: se uma coluna está vazia, diga em uma linha e siga. O complemento visual do relatório é o PedroOS: aponte que as issues foram atualizadas e que o Pedro pode vê-las lá.

## Modo leve ("liga o Retrato")

Quando o gatilho for só ligar o Retrato ("liga o Retrato"), o Pedro quer o Retrato no ar e um resumo curto, não o ritual inteiro. Faça o passo 0, leia o TODO e o `git log -5`, e devolva **só o cabeçalho** do relatório: estado em uma frase, termômetro, próximos três passos e o link do Retrato. Nada de curar issues, editar ou commitar nesse modo, a menos que o git, o GitHub ou o Pedro mostrem que algo mudou desde a data do "Estado" no TODO.md; aí o check inteiro roda.

## Como gerar sugestões que prestam

- Dependência quase satisfeita ("falta só X para destravar Y") é a melhor sugestão possível.
- Bloqueio externo parado há mais de uma semana merece script de cobrança pronto para enviar.
- Achados recentes em `ana/api-mv/` e artefatos do ultracode ainda não revisados geram as melhores perguntas técnicas.
- Mapa de contatos: **analista de TI** (banco Oracle, schemas MVBIKE/MVINTEGRA, export com desfecho), **Global Health** (token, rate limit, comportamento da API), **jurídico do hospital** (LGPD do contato proativo), **Felipe/direção** (decisões de produto: convite Google, tom comercial, metas de KPI), **coordenadores** (categorias do pós-atendimento), **Lucas/Rib** (Central de Comando como UI da base de conhecimento).
- Sugira pesquisa só quando ela mudar uma decisão pendente; curiosidade vai para o fim da fila.

## Regras

- pt-BR sempre. Nunca usar travessão (U+2014) nem meia-risca (U+2013) em nada que você escrever; identificadores existentes que já os contêm (ex.: os nomes das etapas do Kanban do Chatwoot) ficam como estão.
- O ID de uma issue é o número dela e nunca muda; tarefa cancelada fecha com um comentário "Cancelada: motivo" (sem ficha) e uma linha no log.
- Não marcar como feito o que você não verificou (commit, arquivo, ou confirmação explícita do Pedro).
- O GitHub é a única fonte dos cards; o `TODO.md` só narra. Nunca recrie tabela de tarefas em arquivo.
- O check termina com as issues curadas no GitHub, o TODO.md commitado e o relatório no chat. Nada de relatório sem atualizar, nem atualização sem relatório.
