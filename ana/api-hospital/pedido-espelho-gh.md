# Prompt para outra sessão: aposentar a tabela de convênios e criar o Espelho da Global Health

> Cole o texto abaixo (da linha `---` em diante) numa sessão nova aberta em `~/PedroDev/Hospital`.
> Escrito em 26/ago/2026, na sessão da Ana que virou a fonte de cobertura de convênio.

---

## Contexto

Trabalho no repo do Hospital (`~/PedroDev/Hospital`), que serve a API `api.hospitalsaomatheus.cloud/api/ana/*`
e a tela de administração `/admin/dados-atendimento`.

Hoje essa tela mantém quatro tabelas curadas à mão pela secretária, e a Ana (o agente de WhatsApp,
noutro repo) lê as quatro por HTTP tools:

| Tabela | Endpoint | Tool da Ana | Situação |
|---|---|---|---|
| Consultas particulares | `GET /api/ana/consultas-particulares` | 1 | **fica** |
| Exames | `GET /api/ana/exames` | 2 | **fica** |
| Cirurgias (estimativas) | `GET /api/ana/cirurgias` | 3 | **fica** |
| Convênios por especialidade | `GET /api/ana/convenios` | 4 | **sai** |

Em 26/ago/2026 ficou provado que a API da Global Health já responde a cobertura de convênio,
por especialidade, direto da fonte. A tabela local virou uma segunda verdade que diverge da real
(exemplo: a tabela local tem Amil, Golden Cross e Hapvida; a agenda da GH não tem nenhum dos três).
Do lado da Ana a tool 4 já foi desligada e o prompt já não consulta mais essa tabela.

## A prova, para você não precisar refazer

Base: `https://dem.agenda.globalhealth.mv/rest/whatsapp` (homologação). Header `Token: <GH_TOKEN_HOMOLOG>`.

```
GET /convenios?idItemAgendamento=1843&size=100   -> 200, 32 convênios
GET /convenios?idItemAgendamento=1               -> 200, 0 convênios
GET /convenios?idItemAgendamento=999999          -> 200, 0 convênios
GET /convenios                (sem o parâmetro)  -> 200, 0 convênios
```

A lista é filtrada pelo item agendável, ou seja, pela especialidade. É por isso que ela responde cobertura.

## Tarefa 1: aposentar a tabela de convênios por especialidade

**Escopo: SOMENTE a tabela de convênios.** As outras três (consultas particulares, exames, cirurgias)
continuam vivas e continuam sendo lidas pela Ana. Remover qualquer uma delas quebra o bot.

Faça na ordem, com commits atômicos:

1. **Levantar os consumidores antes de apagar.** Procure no repo inteiro por todo uso da tabela de
   convênios: model, migration, seed, service, controller, rota, tela de admin, testes, fixtures,
   documentação e qualquer painel que a leia. Liste o que achou antes de mexer.
2. **Confirmar que ninguém de fora consome.** O único consumidor externo conhecido era a tool 4 da Ana,
   já desligada. Se você achar outro consumidor (relatório, integração, tela pública), **pare e me diga**,
   não remova.
3. **Remover em camadas**, de fora para dentro: primeiro a seção da tela `/admin/dados-atendimento`,
   depois a rota e o controller, depois o service, depois o model. A migration de drop da tabela vem por
   último e em commit separado, para poder ser revertida sozinha.
4. **Preservar o dado antes do drop.** Antes da migration de drop, gerar um dump da tabela
   (CSV ou INSERTs) e guardá-lo no repo, num diretório de acervo. O texto da coluna de observação
   (ex.: "Cobre consultas. Exames de alta complexidade sujeitos a autorização.") é conteúdo escrito
   por gente e não existe na Global Health: perder isso é irreversível.
5. **Ajustar os testes.** Remover os que cobrem só a tabela removida; corrigir os que a usam de apoio.
6. **Atualizar a documentação do repo** (README, docs de API, ADR novo registrando a decisão e o porquê).

## Tarefa 2: no lugar dela, o Espelho da Global Health

Onde ficava a tabela de convênios, criar uma seção **somente leitura** que mostra ao vivo o que a
Global Health está publicando na agenda online. Um botão "Atualizar" dispara a chamada.

**Regras não negociáveis:**

- **Só homologação.** Base `https://dem.agenda.globalhealth.mv`. Produção
  (`app.agenda.globalhealth.mv`) jamais é chamada por este código.
- **Só leitura.** Nenhum POST, PUT ou DELETE contra a Global Health.
- **O token nunca chega ao navegador.** Ele mora numa env var do backend (nome sugerido
  `GH_TOKEN_HOMOLOG`, no mesmo lugar do `ANA_API_KEY`). O front chama o backend do Hospital; o backend
  chama a Global Health. Nunca o contrário.
- **Nada é gravado no banco.** É espelho, não cópia. O que a plataforma já sabe não se guarda: dado
  guardado envelhece e vira mentira, que é exatamente o defeito que estamos consertando aqui.
- Timeout curto por chamada e mensagem de erro honesta na tela quando a Global Health não responder.
  Falha de rede aparece como falha, nunca como lista vazia.

**O que a tela deve mostrar.** A cadeia da Global Health tem quatro elos e cada um vira um bloco:

1. **Especialidades publicadas na agenda** (`GET /consultas`, com `?pesquisa=` opcional).
   Campos: `id`, `nome`, `bloqueado`. É a lista do que a Ana consegue agendar hoje.
2. **Ao clicar numa especialidade**, carregar em paralelo:
   - **Convênios aceitos** (`GET /convenios?idItemAgendamento={id}&size=100`).
     Campos: `id`, `nome`, `particular`. Destacar visualmente a linha com `particular: true`.
   - **Profissionais** (`GET /prestadores?idItemAgendamento={id}`). Campos: `id`, `nome`.
     Aqui aparece só quem está com o botão ligado no Painel de Controle da GH.
3. **Ao clicar num convênio**, os **planos** (`GET /convenios/{idConvenio}/planos?idItemAgendamento={id}`).
   Campos: `id`, `nome`. Há ainda `GET /convenios/{idConvenio}/planos/{idPlano}/subPlanos`, se quiser o
   terceiro nível.
4. **Horários livres** (`GET /agendas/v2?idItemAgendamento=&idConvenio=&idPlano=`), opcionalmente com
   `idPrestador` e `dataInicial`. A resposta vem aninhada: `agendas[]` → `prestadores[]` → `horarios[]`,
   com `data`, `hora`, `idHorario`, `idAgenda`. A janela padrão é de 14 dias.

**Duas armadilhas da API que a tela precisa tratar:**

- `GET /agendas/v2` **exige os três ids**. Faltando qualquer um, responde HTTP 500 "Erro interno".
- Id **errado** não dá erro: responde HTTP 200 com `agendas: []`. Na tela isso não pode aparecer como
  "sem horários": ou os ids vieram dos elos anteriores, ou a tela não faz a chamada.

**Se sobrar fôlego**, dois blocos que ajudam a secretária:
- **Exames publicados** (`GET /exames`), mais `GET /exames/instrucaoGeral` e `GET /exames/perguntas`.
- **Instruções do horário** (`GET /horarios/{idHorario}/instrucoes`), no hover de cada horário.

**O valor da tela:** hoje, quando a Ana não acha horário, ninguém sabe se o problema é a especialidade
não publicada, o convênio fora da lista, o médico com o botão desligado no Painel, ou a agenda sem
horário livre. Essa tela responde as quatro perguntas de uma vez, sem abrir o Painel da Global Health.
Deixe cada bloco dizer com todas as letras quando vier vazio, e por quê.

## Como fechar

Rodar a suíte de testes, subir a stack local, tirar print da tela nova funcionando, e abrir a entrega
no fluxo normal do repo. No resumo, dizer explicitamente: o que foi removido, onde o dump da tabela
antiga ficou guardado, e quais endpoints da Global Health a tela passou a consumir.

Se em qualquer ponto você achar um consumidor da tabela de convênios que eu não previ, **pare e me
pergunte** antes de remover.
