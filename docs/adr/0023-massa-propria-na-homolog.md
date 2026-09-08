---
status: accepted
date: 2026-08-26
---

# A massa de homologação deixa de ser espera: criamos o catálogo de teste nós mesmos, com o tutorial da MV

Decisão do grilling de 26/ago/2026. A massa de homologação (GH-19) deixa de ser tratada como entregável exclusivo da Global Health. O caminho ativo passa a ser criar a massa nós mesmos: o analista de TI do hospital cadastra **uma agenda de teste de Cardiologia** no SoulMV TST seguindo o tutorial oficial da MV, e o Pedro confere e ativa no **Painel de Controle GH de homologação**, ao qual ele tem acesso. O pendente GH19 continua aberto (a massa completa e as 4 perguntas de arquitetura seguem com a GH); a tarefa **V31** é o caminho próprio.

## Contexto

- A GH-19 foi pedida em 07/jul/2026 e cobrada formalmente em 12/ago. Em 26/ago o smoke (`ana/api-mv/scripts/smoke-gh.py`) confirmou ao vivo: auth OK, catálogo 100% vazio. São 50 dias de espera sem entrega.
- As tools de agenda da Ana **já existem** (identificação desde a V12, disponibilidade desde a V15). Elas respondem vazio por falta de dados, não por falta de implementação. Nenhuma tool nova destrava nada agora.
- O tutorial da MV "Disponibilização de agenda no ambiente Online" (docs.mv.com.br, salvo em `ana/api-mv/tutorial-agenda-online-gh.pdf`) revela o mecanismo: a massa não é um "pacote" que a GH publica por um ato especial. Ela nasce de cadastro comum: agenda no SoulMV (pública, com prestador vinculado ao item de agendamento e unidade de atendimento preenchida) mais ativação do item no Painel de Controle GH, com convênio vinculado ao plano ou a flag de exibir agendas sem convênio.
- Acessos levantados no grilling: o Pedro tem o Painel de Controle GH **de homologação** (confirmado por ele); não tem o SoulMV TST. Quem tem a mão no Soul é o analista de TI do hospital.
- O catálogo vazio na API tem duas causas possíveis que só o Painel distingue: nada existe no Soul TST, ou existe e está desligado no Painel. A inspeção do Painel responde isso em minutos.

## Decisão

1. **Pedido mínimo, não pacote:** uma agenda só (Cardiologia), para provar o circuito Soul → Painel → API. Cardiologia porque é o cenário da vitrine da V15, já pronto para re-validar. Ampliação vem depois, com o circuito provado.
2. **Divisão de papéis:** o analista de TI cadastra no SoulMV TST com o tutorial na mão; o Pedro inspeciona e ativa no Painel GH homolog; a sessão Claude prova pelo smoke e pela vitrine.
3. **A pergunta de arquitetura viaja junto:** o pedido ao analista inclui a confirmação "o SoulMV TST alimenta a homolog `dem.agenda.globalhealth.mv`?", que é uma das 4 perguntas sem resposta da cobrança de 12/ago.
4. **GH19 não morre:** o pendente segue aberto e cobrável. O que muda é que ele deixa de ser o único caminho.
5. **Regra de ambiente inalterada:** tudo em homologação. Painel de produção jamais; se algum acesso se revelar de produção, vira somente leitura e o plano para.

## Considered options

- **Só re-cobrar a GH:** rejeitado como caminho único. 50 dias de silêncio; custo de continuar cobrando é baixo, então a cobrança segue, mas sem carregar o roadmap sozinha.
- **Pacote completo de uma vez (especialidades, exames, convênios, agendas):** rejeitado. Pedido grande a terceiro emperra; o pedido de 1 agenda prova o circuito e cria o precedente.
- **Pedir acesso ao SoulMV TST para o Pedro:** não descartado, mas não bloqueia. O analista executa mais rápido do que um acesso novo é concedido; se o fluxo virar rotina, o acesso vira pedido próprio.

## Consequências

- Nasce a tarefa **V31** (dono P+E, com prova da sessão): inspeção do Painel + pedido ao analista (`ana/api-mv/pedido-agenda-cardiologia-tst.md`) + prova pelo smoke.
- **Pronto quando:** o smoke sai de VAZIO para OK em `/consultas`. Na sequência, a vitrine da V15 re-valida (Cardiologia no playground com horário real) e a Cadeia D destrava sozinha na página Cadeias.
- **VPN:** nenhum passo deste caminho exige VPN do Pedro (Painel GH e API são web; o Soul é do analista). A VPN só volta na Prova no banco (P3/GH-18), que continua sendo o gate da P6.
- O tutorial entra no repo (`ana/api-mv/tutorial-agenda-online-gh.pdf`) e vira referência citável em cobranças e pedidos.
- Risco aceito: a massa criada por nós pode não representar a massa "oficial" que a GH publicaria. Para provar o circuito das tools isso é irrelevante; para homologar conteúdo real, a GH-19 continua necessária.
