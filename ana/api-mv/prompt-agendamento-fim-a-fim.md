# Prompt: a Ana agenda, remarca e cancela de verdade (P6), como usuário de teste

> Para colar numa sessão Claude nova, na raiz do repo Ana. Escrito em 08/set/2026 depois da primeira
> tentativa de finalização (recusada com 417). Só homologação. Só o paciente-sonda. Nunca produção.

## Estado de partida (08/set/2026, confira antes de agir)

- A cadeia de horários funciona de ponta a ponta na homolog: item 1843 (Consulta Cardiologica), convênio
  Particular 3, plano Apartamento 2, `/agendas/v2` com horários reais, `/consultas/tipos` com PRIMEIRA CONSULTA (id 1).
- **Todos os campos obrigatórios do `POST /horarios/agendar` a cadeia já produz:** `cpf`, `idItemAgendamento`,
  `idConvenio`, `idPlano`, `idHorario`, `idTipoMarcacao`. `idSubPlano` é nulo (Particular não tem). `nrCarteira` só
  para convênio. `respostas` e `anexos` só para exame. Contrato oficial: `ana/api-mv/doc_whatsapp_agendamento_1.10.pdf`.
- **A API recusa a finalização:** HTTP 417 "Não é possível agendar com o convênio escolhido", para Particular (planos 2 e 1)
  e para Unimed (8). Registro em `ana/api-mv/cadeias-gh.md` (seção de 08/set) e pergunta 24 de `perguntas-global-health.md`.
- A Ana não tem as ferramentas de agendar, listar, remarcar e cancelar. As Seções 2.5 e 2.6 do prompt existem na fonte
  (`ana/prompt/bloco-particular.md`) mas saem na compilação (`@gated:P6`). A tool 7 `cadastrar_paciente` está fora do grant (ADR-0014).
- Prova no banco (GH-18) bloqueada: VPN da TST caída e o Oracle Instant Client sumiu do Mac (`~/oracle` não existe).
- Causa provável da recusa (tutorial da MV, pág. 3): as agendas de Cardiologia do Soul TST não têm convênio na aba "Convênio"; a flag
  "Exibir agendas que não tem convênio associado" do Backoffice GH faz o horário aparecer mesmo assim. A correção é no Soul (analista de TI).

## O que eu quero desta sessão

Me conduza, passo a passo e com aprovação minha em cada escrita, até a Ana no Telegram (modo teste, `/teste` primeiro)
agendar, listar, remarcar e cancelar uma consulta de Cardiologia para o paciente-sonda (CPF 66301102770), com protocolo
devolvido pela Global Health. Ordem obrigatória:

### Passo 0: destravar a API (sem isso nada anda)

A regra que explica a recusa está no tutorial oficial da MV (`ana/api-mv/tutorial-agenda-online-gh.pdf`, páginas 3 e 4):
uma agenda do Soul **sem convênio na aba "Convênio"** só aparece no online porque o Backoffice da GH tem a flag
"Exibir agendas que não tem convênio associado" ligada. Isso faz o `/agendas/v2` mostrar horário, mas a finalização
precisa do vínculo agenda x convênio no Soul, e recusa: "Não é possível agendar com o convênio escolhido". A correção é no
**SoulMV de teste**, que é do analista de TI, não no Painel. Me conduza nesta ordem, uma coisa por vez, pedindo o print quando precisar ver:

0.1 **Desfazer a armadilha do Painel.** No Painel GH de homologação, Agenda > Itens Agendamento > Consulta Cardiologica >
    agenda da Norvandia (140) > aba "Convênios e planos". Essa tela é uma lista de **proibidos** ("serão proibidos para esta
    agenda"). Ela precisa estar **vazia**. Em 08/set eu adicionei Particular e Unimed ali por engano; se ainda estiverem lá, me mande apagar
    pela lixeira e clicar OK. Confirme comigo, por print, que está vazia nas 4 agendas publicadas (21 Amanda, 51 Charles, 140 Norvandia, 160 Ricardo).
0.2 **Mapear o que o Painel mostra.** Me peça prints do menu lateral do Painel (Convênios e Planos, Integrador Convênios,
    Preferências) e me diga se existe uma tela "De/Para" de convênios e o que está nela. Não mude nada sem eu aprovar.
0.3 **Pedido ao analista de TI (SoulMV TST).** Escreva a mensagem, curta, para o WhatsApp, com o PDF do tutorial em anexo:
    na tela Cadastro de Agendas (Std) das agendas de Cardiologia de teste (prestadores 21, 51, 140 e 160; conferir os códigos
    das agendas pela API: idAgenda 1772, 1773 e 1763 vieram no `/agendas/v2` de 08/set), aba **Convênio**, adicionar
    PARTICULAR e UNIMED DO BRASIL; conferir no cadastro do convênio, aba Planos, que o plano permite atendimento
    **Ambulatorial** e que a empresa Hospital São Matheus está na lista de empresas atendidas pelo plano. Perguntar também se
    o paciente criado pela API (66301102770, id 1681 na GH) existe na tabela PACIENTE do Soul TST, porque a finalização pode
    exigir o cadastro do lado do Soul (isso é a GH-18 por outro caminho). Modelo anterior de pedido: `ana/api-mv/pedido-agenda-cardiologia-tst.md`.
0.4 **Reteste a cada mudança.** Depois de cada ajuste (0.1, 0.3), rode o `POST /horarios/agendar` pelo proxy `/api/gh` do Ana OS
    (`python3 os/server.py` no ar), com a cadeia montada ao vivo (nunca id de memória), foto do antes e do depois pelo
    `GET /agendamentos?cpf=66301102770&tipoAgendamento=CONSULTA`. Body de referência:
    `{cpf, idItemAgendamento: 1843, idConvenio: 3, idPlano: 2, idSubPlano: null, idHorario: <da lista>, idTipoMarcacao: 1, nrCarteira: null, respostas: [], anexos: []}`.
    Leia a mensagem de erro por inteiro: ela muda conforme o que falta, e cada mudança é pista.
0.5 **Se seguir 417 depois do Soul ajustado:** mande à Global Health a pergunta 24 de `perguntas-global-health.md` (já escrita),
    com os payloads e as respostas cruas de `ana/api-mv/cadeias-gh.md`. Pare aqui e registre no TODO.md.
0.6 **Se aceitar** (`sucesso: true`, `protocolo`, `id`): confira pelo GET de lista e pelo `GET /agendamentos/{id}`, depois
    `POST /horarios/reagendar` (body `idHorario` novo + `idAgendamentoAnterior`) e `DELETE /agendamentos/{id}`, conferindo
    a lista depois de cada um. Registre payloads e respostas cruas em `ana/api-mv/cadeias-gh.md`. A GH-18 continua aberta até a
    prova no banco (Passo 4).

### Passo 1: as ferramentas na plataforma (fazer.ai agents, tenant vitta-tech, agente 1)

Crie com `tool_create` (preview primeiro, `dry_run: false` só com meu ok), credencial `gh-homolog-token` (vault:4),
`input_schema` no formato compacto nativo, nome do campo idêntico à chave do body (regras da instância, ver memória e ADR-0009):

- `agendar_horario` (POST `/horarios/agendar`, risco high): campos `cpf`, `idItemAgendamento`, `idConvenio`, `idPlano`,
  `idHorario`, `idTipoMarcacao`, `nrCarteira` (opcional). Descrição: só depois de resumo e confirmação explícita; uma vez por
  conversa; o `protocolo` da resposta é o único número que pode ser dito.
- `listar_agendamentos` (GET `/agendamentos`, low): `cpf`, `tipoAgendamento` em CAIXA ALTA.
- `consultar_tipos_consulta` (GET `/consultas/tipos`, low): `idAgenda` do horário escolhido. Escolher PRIMEIRA CONSULTA
  salvo paciente dizendo que é retorno.
- `reagendar_horario` (POST `/horarios/reagendar`, high): `idHorario`, `idAgendamentoAnterior`.
- `cancelar_agendamento` (DELETE `/agendamentos/{id}`, high): `id`. Resposta vazia com 200 é sucesso.
- Religar o grant da tool 7 `cadastrar_paciente` (pedindo só o nascimento; telefone por `{{contact_phone}}`).

Conceda ao agente 1 com `agent_tools_set` (preview, depois `dry_run: false`). Reconfira com `agent_tools_get` e recarimbe
`os/dados/grants-medida.json` com a data (ADR-0018).

### Passo 2: o prompt

`python3 ana/prompt/compilar.py --com-p6` para incluir as Seções 2.5 (Finalização) e 2.6 (Gestão). Antes de publicar, leia
as duas seções e ajuste o que o contrato real pede: o tipo de consulta vem de `consultar_tipos_consulta`; `nrCarteira` é
pergunta obrigatória no fluxo de convênio; nunca compor protocolo. Publique com `prompt_set`, confira o tamanho e o hash.
Registre a versão (v6.8 ou a próxima) no TODO.md e no `circuito.json` se a anatomia mudar.

### Passo 3: a prova no playground, depois no Telegram

Cenários, um por conversa nova, `/teste` como primeira mensagem:

1. Agendar particular: preço, nome e CPF do sonda, horários, escolha pelo número, resumo, "sim", protocolo dito. Conferir no
   Langfuse a sequência das chamadas e no Chatwoot a tag `agendado-bot` e o card em AGENDADO. Conferir pela Bancada o
   `GET /agendamentos` do sonda.
2. Duplicidade: pedir de novo a mesma especialidade na mesma data. A Ana deve achar o existente e oferecer remarcar (PASSO F2).
3. Remarcar: escolher outro horário, confirmar, tag `remarcacao`, protocolo mantido ou novo conforme a resposta.
4. Cancelar: confirmar qual agendamento, cancelar, tag `cancelamento`, motivo em `private_note`. Conferir a lista vazia.
5. Falha: forçar recusa (horário já tomado, ou id errado de propósito só na Bancada, nunca pelo prompt) e conferir a Seção 2.4A
   sem expor erro técnico.
6. Convênio: Unimed, com número de carteira, até o protocolo. Se a API recusar, a Ana segue o PASSO F5.

Placar por cenário no `roadmap/roteiro-cenarios-v3.md` (ou v4 se criar).

### Passo 4: a prova no banco (só se a VPN e o Instant Client voltarem)

Refazer `ana/api-mv/conexao-oracle.md` (Instant Client em `~/oracle/instantclient_23_26`, `ORACLE_CLIENT_DIR` no `.env`),
`python3 ana/api-mv/scripts/query-mv.py "SELECT 1 FROM DUAL"`, e procurar o agendamento do sonda na Base TST antes e depois
de uma finalização. Isso responde a GH-18. Sem isso, a P6 fecha "provada pela API" e a GH-18 fica aberta, dito assim no TODO.

## Regras desta sessão

- Homolog só. Paciente-sonda só. Toda escrita com preview e meu ok. Nunca em modo autônomo.
- Atualize os dois arquivos do estado (TODO.md e os/dados/roadmap.json) ao fechar cada passo; a P6 vira tarefa quando eu puxar.
- Nada de travessão em nenhum arquivo.
