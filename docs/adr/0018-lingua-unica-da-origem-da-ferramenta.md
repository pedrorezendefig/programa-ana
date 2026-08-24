---
status: accepted
date: 2026-08-19
amends: 0017
---

# Uma língua só para a origem da ferramenta, nas três páginas do cockpit

Decisão do Pedro (19/ago/2026, sessão de grilling sobre o Mapa da Integração): toda ferramenta desenhada em qualquer página do Ana OS carrega um **selo de origem** com o mesmo vocabulário e a mesma cor, dizendo quem responde aquela chamada. São três famílias: **API do Hospital**, **Global Health** e **nativa da plataforma**. O selo é derivado, nunca escrito à mão. A Global Health **continua no Mapa da Integração**, marcada pelo selo, em vez de sair da tela. O NocoDB sai do cockpit inteiro.

## Contexto

- O ADR-0017 tirou URL, método, credencial e estado de dentro dos JSON curados e passou a derivá-los da rota `/api/v1/tools` da plataforma. Resolveu a mentira, mas resolveu numa página só: o Mapa da Integração.
- As outras duas páginas que falam de ferramenta seguiram no padrão velho e já apodreceram. A `os/dados/circuito.json` ainda diz que `consultar_precos_consultas` lê "a Base Ana (NocoDB)", coisa que deixou de ser verdade em 14/ago com a V21. A `os/arquitetura.html` ainda desenha o NocoDB como casa das quatro tabelas e ainda diz que "a migração está pela metade". O `os/dados/apps.json` ainda lista o NocoDB como aplicação viva. O serviço está parado desde 19/ago (V26).
- O Mapa do SOP mostra as ferramentas como chip cinza no painel lateral, sem dizer de onde vêm. Quem lê o fluxo não distingue uma chamada que já funciona em produção de uma que espera a massa da Global Health. Era exatamente a pergunta que o Pedro fazia olhando a tela.
- A junção já existe nos dados e ninguém a usava: cada nó de tool do `sop-fluxo.json` guarda a lista de nomes de ferramenta no campo `tools`, e cada nó do `integracao.json` guarda o mesmo nome mais a âncora de volta para o nó do SOP. Faltava o caminho inverso e faltava o selo.
- Leitura ao vivo em 19/ago/2026 confirmou a base da derivação: a instância tem 12 ferramentas HTTP, 6 no host `api.hospitalsaomatheus.cloud` e 6 no host `dem.agenda.globalhealth.mv`. As nativas (`assign_label`, `kanban_move_card`, `handoff_to_human`, `private_note`, `get_current_time`) e a RAG (`search_knowledge`) **não aparecem** nessa rota, porque não saem da plataforma. Ausência da lista é, por si só, o sinal da terceira família.
- A concessão é outra história. A Ana tem 11 das 12 ferramentas HTTP concedidas; a `cadastrar_paciente` (id 7) está fora dos grants desde a V20 (ADR-0014), e hoje isso vive como alerta escrito à mão no `integracao.json`. A instância 1.4.1 **não expõe rota REST de grants**: oito caminhos testados em 19/ago devolveram 404, e só a ferramenta MCP `agent_tools_get` alcança o dado.

## Decisão

1. **Três famílias, um vocabulário.** Toda ferramenta desenhada no cockpit carrega o selo **API do Hospital**, **Global Health** ou **nativa da plataforma**, com a mesma palavra e a mesma cor em todas as páginas. As nativas não se subdividem em Chatwoot, base de conhecimento e relógio: a pergunta que o selo responde é se a chamada sai da plataforma, e para onde.
2. **Origem é derivada, nunca declarada.** Ferramenta que aparece em `/api/v1/tools` recebe a família pelo host da `urlTemplate`, casada com a lista de destinos do `integracao.json`. Ferramenta ausente daquela rota é nativa. Nenhum campo de origem entra em JSON curado, o que estende a regra do ADR-0017 às páginas Circuito e Mapa do SOP.
3. **O selo vale nas três páginas.** Mapa da Integração, Mapa do SOP e Circuito da Ana passam a mostrar o selo na própria caixa, sem exigir clique. Continuam sendo três páginas com três altitudes diferentes, e não viram uma só.
4. **O link vai e volta.** A âncora que hoje leva do Mapa da Integração ao nó do SOP ganha o caminho inverso, montado na renderização a partir do nome da ferramenta. Nenhum índice novo é escrito em arquivo.
5. **A Global Health fica na tela, marcada.** As seis ferramentas de agenda continuam desenhadas no Mapa da Integração, na faixa da fronteira parada, com o selo âmbar e com o alerta da GH19 em vermelho. Pendência real continua vermelha; some quando deixa de ser verdade, não porque incomoda.
6. **A concessão vem carimbada, com data.** Enquanto não houver rota REST de grants, o estado "a Ana não pode chamar" é gravado por script (leitura via MCP `agent_tools_get`) num JSON de medição, e a página o mostra sempre com a data da conferência ao lado, no mesmo padrão da cláusula 4 do ADR-0017. O alerta escrito à mão sai do `integracao.json`. A rota que falta entra no report V10 para a fazer.ai.
7. **O NocoDB sai do cockpit.** A raia, o destino, o nó e os alertas do NocoDB somem do `integracao.json`; a menção some do `apps.json`, do `circuito.json`, da `arquitetura.html`, do `circuito.html` e do `roadmap.html`. O serviço parado é história, e história mora no TODO.md e no CONTEXT.md, não no desenho do que existe hoje.

## Considered options

- **Fundir o Mapa do SOP e o Mapa da Integração numa tela só:** rejeitado. Seriam 81 nós de fluxo mais 24 de fronteira no mesmo canvas, e a densidade mataria a leitura das duas coisas. As altitudes diferentes já são a razão de existirem três páginas (ADR-0007 e o termo de cada uma no CONTEXT.md). A língua comum entrega a integração que o Pedro queria sem pagar o preço da fusão.
- **Tirar a Global Health do Mapa da Integração:** rejeitado pelo próprio Pedro no meio da sessão. O mapa se chama fronteira externa da Ana, e a Global Health é metade dessa fronteira. Escondê-la faria a página mentir por omissão, que é o defeito que o ADR-0017 nasceu para matar. O que incomodava não era a presença, era não distinguir o que é do Hospital do que é da Global Health.
- **Cinco famílias (Hospital, Global Health, Chatwoot, base de conhecimento, relógio):** rejeitado. Mais preciso e menos legível: cinco cores competindo em telas que já usam cor para estado e para defeito. As três nativas se comportam igual no que o selo mede, porque nenhuma sai da plataforma.
- **Escrever a família num campo do JSON:** rejeitado pelo ADR-0017. Seria o mesmo `"backend": "nocodb"` com outro nome, e apodreceria na virada seguinte de tool.
- **Manter a concessão como alerta escrito à mão:** rejeitado. É o padrão que já falhou. O carimbo com data é pior que ao vivo e melhor que prosa, porque nunca finge frescor.

## Consequências

- Uma virada de tool na plataforma passa a atualizar sozinha as três páginas, e não mais só uma.
- O `os/server.py` não muda de natureza: a rota `/api/tools` que ele já serve passa a alimentar mais duas páginas.
- Nasce um segundo arquivo de medição carimbada, com os grants. Quem rodar a conferência alimenta o cockpit, do mesmo jeito que quem roda o `smoke-hospital.py` alimenta a medida das tabelas.
- O Mapa do SOP deixa de ser retrato puramente congelado: continua carimbado no que diz respeito ao prompt, mas o selo de origem das ferramentas passa a ser vivo. A distinção precisa ficar clara na página, para ninguém achar que o trecho literal também é de agora.
- A ausência de rota de grants vira pendência registrada para a fazer.ai, somando ao report V10 junto com `resolve_conversation`, o teto de 2.000 caracteres da descrição de tool e o `reasoning_effort` no modelConfig.
