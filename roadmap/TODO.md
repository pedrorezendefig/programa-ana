# TODO - Programa Ana: agendar de verdade e chegar ao WhatsApp

> Verdade **narrativa** do estágio atual. O espelho de **dados** é `os/dados/roadmap.json`, renderizado pelo **Ana OS** (`python3 os/server.py` e abrir `localhost:8777`; ADR-0007). Regra de sempre: ao mudar um status aqui, mude lá (e vice-versa). O OS é só leitura (ADR-0028): card novo, card feito e canal movido nascem só por sessão no terminal, nos dois arquivos.
>
> O estágio anterior (testes de viabilidade no fazer.ai agents, V1 a V36 e OS1 a OS24, 30/jul a 08/set/2026) está **intacto em `roadmap/arquivo/TODO-estagio-viabilidade.md`** e o roadmap.json dele em `roadmap/arquivo/roadmap-estagio-viabilidade.json`: é história e acervo (fichas, log, decisões), não fronteira de trabalho. O roadmap mais antigo (trilhas A a G) segue em `roadmap/arquivo/` também.

**Status:** `[ ]` a fazer · `[~]` em curso · `[x]` feito · `[!]` bloqueada
**Donos:** **(P)** Pedro · **(C)** Claude (sessões) · **(E)** Externo

---

## Estado (09/set/2026)

**Onde a Ana está, em uma linha:** ela atende no Telegram de teste, lê preços, exames e cirurgias do app do hospital, registra ouvidoria com protocolo, identifica o paciente na Global Health, decide cobertura de convênio pela agenda online e entrega horário real de Cardiologia. Ela **não** marca a consulta (a API recusa com 417) e **não** está no WhatsApp do hospital.

**O reset (grilling de 09/set/2026, ADR-0028).** O Pedro pediu um roadmap enxuto, nítido e visual, escrito do ponto em que o programa está. O estágio anterior foi arquivado inteiro e nasceram nove cards, título em linguagem de ação, sem código da Global Health. Tudo que estava aberto entrou num deles ou morreu: a P3 virou a V37, a P6 virou a V39, a V29 e a V35 seguem com o mesmo ID, a GH19 (resolvida em 26/ago) saiu do grafo, e as duas ideias antigas morreram (uma já puxada, a outra morta com a massa). Cards a mais só depois de o Pedro ver a esfera de capacidades do Retrato.

**As três frentes que andam em paralelo:** (1) agendamento na Global Health, que começa por um pedido ao analista (V37) e destrava a prova no banco (V38) e a marcação de ponta a ponta (V39), com a agenda de exames (V40) ao lado; (2) o hospital e o canal, o espelho da GH no app (V35) e a estreia no WhatsApp real (V41); (3) o cockpit e o Retrato (OS25, OS26), que é o que o diretor vê.

## Tarefas do estágio

| ID | St | Tarefa | Dono | Depende de |
|---|---|---|---|---|
| V37 | `[ ]` | A Global Health aceita a marcação (hoje ela recusa com 417) | P+E | nada |
| V38 | `[ ]` | A marcação aparece no banco do MV (a prova de que ela é real) | C+P | V37 |
| V39 | `[ ]` | A Ana marca, remarca e cancela uma consulta de ponta a ponta | C+P | V37 |
| V40 | `[ ]` | A Global Health publica a agenda de exames na homologação | P+E | nada |
| V29 | `[ ]` | A bancada de cenários fecha 16 de 16 | C+P | nada |
| V35 | `[ ]` | O app do hospital espelha a Global Health (no lugar da tabela de convênios) | P+E | nada |
| V41 | `[ ]` | A Ana entra no WhatsApp real do hospital | P+C | nada |
| OS25 | `[x]` | Ana OS com cinco abas, só leitura | C | nada |
| OS26 | `[~]` | Retrato da Ana no ar, na Vercel | C+P | nada |
| OS27 | `[x]` | Tudo tem link: o Retrato veste o app do hospital, com filtros e fluxogramas, e o OS liga as abas | C | nada |

### V37 · A Global Health aceita a marcação `[ ]`
Herda a P3. O `POST /horarios/agendar` devolve 417 porque a agenda de Cardiologia de teste não tem convênio vinculado no SoulMV TST. Gesto: pedir ao analista de TI o vínculo das agendas com PARTICULAR e UNIMED (aba Convênio do Cadastro de Agendas, tutorial pág. 3) e conferir no Painel GH que a aba "Convênios e planos" está vazia. Roteiro: `ana/api-mv/prompt-agendamento-fim-a-fim.md`, Passo 0.
**Pronto quando:** a Cadeia D fecha com o agendar em 200 e um id de agendamento devolvido.

### V38 · A marcação aparece no banco do MV `[ ]`
A pergunta GH-18. Fato oficial da MV: a API grava no Soul só na finalização, o único ponto em que faz sentido procurar no Oracle. Logo depois da V37: agendar pela Cadeia D e consultar a Base TST (`query-mv.py`) pelo id e pelo paciente-sonda.
**Pronto quando:** um SELECT na TST devolve a marcação feita pela API, registrada no roteiro.

### V39 · A Ana marca, remarca e cancela de ponta a ponta `[ ]`
Herda a P6. Fachada de agenda (ADR-0009): tools de finalização e gestão no grant, Seções 2.5 e 2.6 fora do gate, volta da tool de cadastro (ADR-0014). Nunca em modo autônomo; prompt em `ana/api-mv/prompt-agendamento-fim-a-fim.md`.
**Pronto quando:** no Telegram, a Ana marca, remarca e cancela uma consulta de Cardiologia da agenda de teste, cada ato visível na Cadeia F e no Langfuse.

### V40 · A Global Health publica a agenda de exames `[ ]`
Hoje a Cadeia E para no catálogo: só existe a agenda de Cardiologia. Pedir ao analista uma agenda de exame de teste pelo mesmo caminho da V31 (agenda pública no SoulMV TST com prestador, ativação no Painel GH).
**Pronto quando:** `GET /exames` devolve um item agendável e a Cadeia E chega ao horário.

### V29 · A bancada fecha 16 de 16 `[ ]`
Ficha íntegra no arquivo. E1, E3 e D4 quebram de propósito a credencial `vault:6` ou a tool 11; precisam de janela com a Ana parada e restauração imediata.
**Pronto quando:** os três com veredito na tabela da rodada, credencial e tool 11 restauradas.

### V35 · O app do hospital espelha a Global Health `[ ]`
Ficha íntegra no arquivo (ADR-0025). Não se executa neste repo: `~/PedroDev/Hospital`, prompt em `ana/api-hospital/pedido-espelho-gh.md`. Só a tabela de convênios sai; as outras três alimentam as tools 1 a 3.
**Pronto quando:** a tela mostra os quatro blocos e `GET /api/ana/convenios` deixa de existir.

### V41 · A Ana entra no WhatsApp real do hospital `[ ]`
Não depende do agendamento: ela pode estrear informando preço, exame, convênio e ouvidoria, escalando a marcação para a secretária até a V39. Pré-requisitos: tirar a automação `/resolve` (V36 do radar), decidir o transbordo seletivo, inbox do número oficial vinculada ao agente 1, estreia assistida. Chatwoot já na versão corrente (V32). Data, transbordo e aviso aos pacientes são decisões do Pedro e do hospital.
**Pronto quando:** uma conversa real de paciente, pelo número oficial, atendida pela Ana e visível no Chatwoot e no Langfuse.

### OS25 · Ana OS com cinco abas, só leitura `[x]`
Feita em 09/set/2026, na sessão do grilling. Conferida no navegador: cinco abas sem erro de console, `POST /api/roadmap` devolve 404, Bancada abre em `os/arquivo/bancada.html`. O grafo virou módulo (`os/assets/grafo.js`) e ganhou o tema `canal`. ADR-0028. Cockpit (mesa e grafo), Mecanismo (Circuito + Arquitetura + Mapa da Integração), Mapa do SOP, Provas (Comparação + Testes + Famílias), Global Health (Cadeias). Bancada para `os/arquivo/`. Some toda escrita da tela e a rota `POST /api/roadmap`; o `/check` para de esperar ideias.
**Pronto quando:** menu com cinco itens, nenhuma página escreve, Bancada abre por URL, as cinco abas carregam sem erro.

### OS26 · Retrato da Ana no ar `[ ]`
Construído em 09/set/2026 (`retrato/`, `vercel.json`): o `gerar.py` rodou contra a plataforma, a lista de proibidos passou, as quatro abas foram conferidas no navegador. **Falta só publicar** (`vercel` e `vercel --prod` na raiz) e registrar o link aqui. ADR-0028. Site estático em `retrato/`: `gerar.py` grava um JSON carimbado com a data e recusa CPF, paciente-sonda, URL de ambiente, token, credencial e ID de tarefa; quatro abas nomeadas (o que a Ana faz hoje, as regras da Ana, onde ela busca a resposta, Global Health: o que dá e o que não dá); tokens do `DESIGN.md`; `noindex`; `vercel.json` na raiz. Publicar é ato do Pedro.
**Pronto quando:** o gerar.py passa na lista de proibidos, as quatro abas abrem por arquivo local, e o link da Vercel está aqui.

### OS27 · Tudo tem link, e o Retrato veste o app do hospital `[x]`
Feita em 09/set/2026, na mesma sessão. Verificação headless a 1360 e 390 px: console limpo, 768 links entre esferas e zero mortos, sete fluxogramas com percorrer (o caminho de uma mensagem e as seis cadeias) mais o percorrer de jornada em cada raia do mapa; no OS, `liga.js` com chegada acesa nas cinco abas. ADR-0029 (segundo grilling de 09/set/2026). Contrato de links nos dois produtos (toda menção é link, todo link tem volta, a URL carrega destino e filtro), Retrato no design system do app do hospital (HP Simplified, azul-marinho, vidro só no que flutua, transição de aba de 250 ms), barra de filtros em toda esfera, três fluxogramas na gramática do hospital com percorrer (caminho de uma mensagem, cadeia elo a elo, jornada no mapa).
**Pronto quando:** clicar numa ferramenta na aba "faz" chega na aba "busca" com o card aceso e as ligações de volta; a URL carrega aba, alvo e filtro; os três fluxogramas percorrem; no OS, `comparacao.html#cap-<id>`, `circuito.html#tool-<nome>` e `sop.html#no-<id>` chegam acesos.

## Radar (fora do grafo de execução: pontos para lembrar ou tocar no futuro)

Bugs, hotfixes e higienes que **não impactam o objetivo** (montar a solução funcional). Não aparecem no grafo de execução do Ana OS; vivem na faixa `radar` do `roadmap.json` e na seção Radar da home. **Prioridade** de 1 (ignorável) a 10 (crítico) = quanto impacta e quanta atenção dar. Item do radar só volta a ser tarefa se o Pedro puxar.

| ID | Prio | Ponto | Nota |
|---|---|---|---|
| V10 | 3/10 | Reportar à fazer.ai o bug do `resolve_conversation` e a dessincronização de inboxes | Mensagem final descartada em turno com `resolve_conversation` (contornado: tool fora dos grants) e dessincronização da lista de inboxes (já corrigida via `instance_sync_inboxes`). Sem impacto atual; o report é a alavanca dos fixes upstream, mesmo canal do bug report do V8. Somar (12/ago): **expor `reasoning_effort` no modelConfig** (bloqueia o gpt-5.6-luna com tools, ADR-0013); e somar (12/ago, tarde): **a interpolação do body foi RE-TESTADA na 1.4.1 e o bug persiste** (nome do campo precisa ser idêntico à chave do JSON; com API que aceita campo ausente, como o NocoDB, a falha é silenciosa: linha criada vazia com HTTP 200). A normalização de `input_schema` em JSON Schema padrão segue sem re-teste. O achado do teto de 50k morreu: o teto atual é 100k configurável. Somar (14/ago, V21): **output de HTTP tool truncado em 4.000 chars fixos** (`maxResponseChars` de `src/graph/tools/http.ts`, sem env nem config); resposta maior esconde o fim da tabela do modelo e causa loop de re-chamadas; pedir limite configurável |
| V36 | 5/10 | Remover a automação `/resolve` do Chatwoot antes do WhatsApp real | Regra id 9 criada em 08/set (mensagem recebida igual a `/resolve` resolve a conversa). Serve ao modo teste: `/resolve` fecha, `/teste` reabre com a Ana; nasceu do caso do Felipe (conversa #166, 11 dias presa na Fila Ouvidoria porque `handoff_to_human` cala o bot e `/teste` não atravessa conversa em fila humana). Provada na conversa 154 da inbox de API. Tocar quando: dia de ligar a Ana num número real (desativar ou apagar em Configurações > Automação) |
| V7 | 2/10 | Revogar o token Cloudflare do onboarding (29/jul) | Movida do Pendente para o radar em 06/ago por decisão do Pedro: o token ainda tem uso previsto, não pertence ao roadmap. Verificado em 06/ago: não está salvo em nenhum serviço, e revogar não apaga os DNS já criados (agents/langfuse/coolify). Tocar quando o Pedro declarar que o uso acabou |
## Log

- **09/set/2026 (4):** **OS27 concluída: tudo tem link, e o Retrato veste o app do hospital (ADR-0029).** Segundo grilling da noite: contrato de links nos dois produtos, filtros por esfera com URL, vidro só no que flutua, Retrato com HP Simplified e azul-marinho, sete fluxogramas na gramática do hospital com percorrer. Falta só o ato de publicar (OS26).

- **09/set/2026 (3):** **o Retrato da Ana existe (OS26 em curso).** `retrato/` com `gerar.py`, `curadoria.json`, página única de quatro abas e `vercel.json` na raiz. Retrato gerado contra a plataforma (14 ferramentas; 30 capacidades; 81 nós e 41 seções do prompt v6.4; 6 cadeias). Ressalvas registradas na ficha: a curadoria sobrescreve cinco estados da Comparação (C09, C13, C14, C15, C20) que o `comparacao.json` de 24/ago ainda não reflete; o mapa retrata o prompt v6.4 de 18/ago. Falta publicar.

- **09/set/2026 (2):** **OS25 concluída: o Ana OS tem cinco abas e é só leitura.** Cockpit (mesa e grafo), Mecanismo (Circuito + Arquitetura + Integração), Mapa do SOP, Provas (Comparação + Testes + Famílias), Global Health (Cadeias). Bancada em `os/arquivo/`. Faixa de Ideias, botão "marquei" e `POST /api/roadmap` apagados; `/check`, `CLAUDE.md` e `CONTEXT.md` alinhados.

- **09/set/2026:** **reset do roadmap (ADR-0028).** O grilling da noite decidiu dois produtos (o Ana OS local e o Retrato da Ana na Vercel), o OS de cinco abas só leitura, e um roadmap novo de nove cards escrito do ponto em que a Ana está. O estágio anterior foi arquivado inteiro em `roadmap/arquivo/TODO-estagio-viabilidade.md` e `roadmap-estagio-viabilidade.json`. A P3 virou V37, a P6 virou V39, a GH19 saiu do grafo, as ideias morreram. Nenhum card nasce mais pela tela.
