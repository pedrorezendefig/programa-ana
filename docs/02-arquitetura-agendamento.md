# Arquitetura de Agendamento (API Global Health/MV)

Documento técnico das **7 tools de agendamento**: como cada subfluxo é construído, como o estado é mantido entre chamadas, como funciona a confirmação e o fallback híbrido. Espelha o padrão real dos seus subfluxos existentes (`Atualizar_lead`, `Aplicar_tag`, `Escalar_humano`).

---

## 1. Princípios de design

1. **Orquestradores, não 1-tool-por-endpoint.** A API tem ~23 endpoints. Expor todos como tools sobrecarregaria o agente e o faria errar a ordem das chamadas. Consolidamos em **7 tools**, onde subfluxos encadeiam vários endpoints internamente (a ordem fica no n8n, que é confiável — não no LLM).
2. **O LLM nunca carrega IDs longos.** `idHorario: 2046807` é exatamente o tipo de número que um LLM troca de dígito. A `Buscar_disponibilidade` mostra horários **numerados** e guarda o mapa `número → ID` no estado da conversa. O paciente escolhe um número; o subfluxo resolve o ID.
3. **Todo subfluxo devolve uma string `resposta` já mastigada.** O `toolWorkflow` entrega ao agente o output do **último nó** do subfluxo. Por isso o último nó é sempre um `Set`/`Code` com um único campo `resposta` em linguagem natural (+ prefixo-sinal quando há erro/bloqueio).
4. **Ações de escrita são protegidas por confirmação em 3 camadas.**
5. **Nada quebra: tudo cai no humano.** Erros viram prefixos-sinal que disparam o fluxo de escalada já existente.

---

## 2. As 7 tools (resumo)

| # | Tool | Endpoints | Escrita? | Lê estado? | Grava estado? |
|---|---|---|:--:|:--:|:--:|
| 1 | `Identificar_paciente` | `GET/POST /pessoas` | — | — | cpf |
| 2 | `Buscar_disponibilidade` | `/consultas`·`/exames`·`/convenios`·`/planos`·`/agendas/v2` | — | (paginação) | **sim** (mapa + IDs) |
| 3 | `Pre_requisitos_agendamento` | `/consultas/tipos` · `/exames/perguntas` | — | sim | sim (perguntas) |
| 4 | `Gerenciar_anexos` | `/anexos/agendamento` · `/anexos/upload` | upload | sim | sim (anexos) |
| 5 | `Efetivar_agendamento` | `POST /horarios/agendar` | **✔** | sim | limpa |
| 6 | `Listar_agendamentos` | `GET /agendamentos` | — | — | sim (mapaAgendamentos) |
| 7 | `Remarcar_ou_cancelar` | `/horarios/reagendar` · `DELETE /agendamentos/{id}` | **✔** | sim | limpa |

**MVP:** 1, 2, 5, 6, 7 (consulta sem anexo nem triagem). Tools 3 e 4 entram para exames e itens com anexo obrigatório.

---

## 3. O molde de um subfluxo (igual aos existentes)

Cada subfluxo é um workflow n8n separado:

```
[Gatilho]  n8n-nodes-base.executeWorkflowTrigger
   inputs: [ id_conta, id_conversa, ... , <campos da IA> ]
      │
      ▼
[HTTP / Code / IF]  ← chama a API GH, trata erro, achata resposta
      │
      ▼
[Responder]  n8n-nodes-base.set
   resposta = "<texto que o LLM vai ler>"
```

E a **conexão da tool ao agente** (no `Ana.json`), via `@n8n/n8n-nodes-langchain.toolWorkflow`, segue o padrão de `Atualizar_lead`:

```js
// workflowInputs.value — mistura FIXO (contexto) + IA (decisão)
{
  "id_conta":   "={{ $('Info').item.json.id_conta }}",          // FIXO
  "id_conversa":"={{ $('Info').item.json.id_conversa }}",       // FIXO
  "estado":     "={{ $('Info').item.json.atributos_conversa.agendamento_estado }}", // FIXO (estado)
  "cpf":        "={{ $fromAI('cpf', 'CPF do paciente, 11 dígitos', 'string') }}",   // IA
  "procedimento":"={{ $fromAI('procedimento', 'O que o paciente quer agendar', 'string') }}" // IA
}
```

- **HTTP Request:** `n8n-nodes-base.httpRequest` v4.4, `authentication: predefinedCredentialType` → **Header Auth** (Token); `url` por expressão (ex.: `={{ $env.GH_BASE_URL }}/consultas?pesquisa={{ $json.procedimento }}`); **`onError: continueRegularOutput`** para nunca quebrar a tool.

---

## 4. Especificação tool a tool

Notação: **[FIXO]** vem de `$('Info')` · **[IA]** vem de `$fromAI(...)` · **[ESTADO]** lido do `agendamento_estado`.

### T1 — `Identificar_paciente`
- **description (no toolWorkflow):**
  > "Use para localizar o cadastro do paciente no sistema de agendamento, ANTES de agendar. Passe o cpf (11 dígitos, sem pontos/traços). Se você já validou nome completo e data de nascimento e o paciente NÃO existir, passe-os também para criar o cadastro. Não use para consultar preços."
- **Inputs:** `telefone`[FIXO]; `cpf`,`nome`,`data_nascimento`,`sexo`[IA].
- **Subfluxo:**
  ```
  Gatilho → HTTP GET /pessoas?cpf={{cpf}} [onError: continue]
   → IF (encontrou?)
       sim → Set resposta="Paciente localizado: {{nome}}."
       não → IF (tem nome e data_nascimento?)
               sim → HTTP POST /pessoas {cpf,nome,dataNascimento,telefone,sexo} → Set resposta="Cadastro criado."
               não → Set resposta="CADASTRO_PENDENTE: preciso de nome completo e data de nascimento."
  ```

### T2 — `Buscar_disponibilidade` *(orquestrador — peça central)*
- **description:**
  > "Use quando o paciente já disse o que quer (especialidade ou exame) e o convênio (ou que é particular) e pediu horários. Passe tipo (consulta/exame), procedimento, convenio (ou 'particular'), cpf, e opcionalmente medico e turno (manha/tarde/noite). Retorna uma lista numerada de horários reais — o paciente escolhe pelo número. Para ver mais datas, chame com proxima_pagina=true. Nunca invente horários."
- **Inputs:** `id_conta`,`id_conversa`,`id_inbox`,`estado`[FIXO]; `tipo`,`procedimento`,`convenio`,`cpf`,`medico?`,`turno?`,`proxima_pagina?`[IA].
- **Subfluxo (sequência):**
  ```
  Gatilho
   → Switch(tipo)
       consulta → HTTP GET /consultas?pesquisa={{procedimento}}
       exame    → HTTP GET /exames?pesquisa={{procedimento}}
   → Code "Resolver item": conteudo[0]; SE bloqueado → resposta="BLOQUEADO: {{mensagemBloqueio}}" (early return)
   → IF(convenio != 'particular')
       sim → HTTP GET /convenios?pesquisa={{convenio}}&idItemAgendamento={{idItem}}
           → HTTP GET /convenios/{{idConvenio}}/planos?idItemAgendamento={{idItem}}
           → Code "Resolver plano": 1 plano = assume; vários = resposta="ESCOLHA_PLANO: <lista>" (early return)
   → (proxima_pagina? lê estado.dataPaginaSeguinte → usa em dataInicial)
   → HTTP GET /agendas/v2?idItemAgendamento&idConvenio&idPlano&idPrestador?&turno?&dataInicial?
   → Code "Achatar agendas" (ver §5)
   → HTTP POST custom_attributes (grava ESTADO: cpf,idItem,tipo,idConvenio,idPlano,mapa,dataPaginaSeguinte)
   → Set resposta = textoNumerado   (ou "SEM_HORARIOS" se vazio)
  ```

### T3 — `Pre_requisitos_agendamento`
- **description:**
  > "Use depois que o paciente escolheu o horário, para obter o que falta antes de confirmar. Para consulta, retorna os tipos de marcação (ex.: primeira consulta, retorno). Para exame, retorna as perguntas obrigatórias de triagem. Passe o numero_escolhido do horário."
- **Inputs:** `id_conta`,`id_conversa`,`estado`[FIXO]; `numero_escolhido`[IA].
- **Subfluxo:**
  ```
  Gatilho → ler ESTADO (tipo, mapa, idItem, cpf)
   → Code resolve numero_escolhido → idAgenda
   → IF(tipo==consulta)
       → HTTP GET /consultas/tipos?idAgenda={{idAgenda}} → Set resposta="Tipos: 1-Primeira 2-Retorno..."
   → IF(tipo==exame)
       → HTTP GET /exames/perguntas?idItemAgendamento={{idItem}}&cpf={{cpf}}
       → Code grava perguntas no ESTADO; monta texto das perguntas
       → Set resposta="Antes de agendar preciso confirmar: <perguntas>"
  ```
- **Nota `impedeRealizacao`:** as perguntas e suas alternativas (com `impedeRealizacao` S/N e `mensagem`) ficam no ESTADO; a validação de bloqueio acontece no T5 (antes de chamar a API) — ver §7.

### T4 — `Gerenciar_anexos`
- **description:**
  > "Use quando o agendamento exigir documentos (ex.: pedido médico, carteirinha). Primeiro com modo=verificar para saber o que falta. Depois que o paciente enviar o arquivo no chat, com modo=enviar e o id_tipo_anexo correspondente para registrá-lo."
- **Inputs:** `id_conta`,`id_conversa`,`url_arquivo`,`tipo_arquivo`,`estado`[FIXO]; `modo`,`id_tipo_anexo`[IA].
- **Subfluxo:**
  ```
  Gatilho → ler ESTADO (idItem,idConvenio,idPlano,idHorario)
   → Switch(modo)
       verificar → HTTP POST /anexos/agendamento {idItem,idConvenio,idPlano,idHorario} → Set resposta="Necessário: ..."
       enviar    → Code mapeia tipo_arquivo→MIME (image/jpeg|png, application/pdf)
                 → HTTP POST /anexos/upload {url:url_arquivo, tipo:MIME} [onError: continue]
                 → IF(ok) push {idTipoAnexo:id_tipo_anexo, url} em ESTADO.anexos → grava ESTADO → Set resposta="Anexo recebido."
                        senão → Set resposta="ERRO_ANEXO"
  ```

### T5 — `Efetivar_agendamento` ⚠️
- **description:**
  > "Use APENAS depois que o paciente confirmou explicitamente o horário (data, hora, médico, valor) na mensagem anterior. Passe numero_escolhido, nr_carteira (se convênio), id_tipo_marcacao (consulta) e respostas_exame (exame). Não use sem confirmação. Retorna o protocolo ou o motivo de não ter dado certo."
- **Inputs:** `id_conta`,`id_conversa`,`estado`[FIXO]; `numero_escolhido`,`nr_carteira?`,`id_tipo_marcacao?`,`respostas_exame?`,`confirmado`[IA].
- **Subfluxo:**
  ```
  Gatilho
   → IF(confirmado != true) → Set resposta="CONFIRMACAO_PENDENTE" (early return — camada 3)
   → ler ESTADO (cpf,idItem,idConvenio,idPlano,mapa,anexos,perguntas)
   → Code "Validar exame": se alguma resposta marcada tem impedeRealizacao=S → resposta="BLOQUEIO_EXAME: {{mensagem}}" (early return)
   → Code "Resolver horário": mapa[numero_escolhido] → idHorario,idAgenda (se fora do range → "NUMERO_INVALIDO")
   → IF(consulta E id_tipo_marcacao vazio) → HTTP GET /consultas/tipos → Set resposta="Qual tipo? ..." (não agenda)
   → Code "Montar body" {cpf,idItemAgendamento,idConvenio,idPlano,idHorario,idTipoMarcacao?,nrCarteira?,respostas[],anexos[]}
   → HTTP POST /horarios/agendar [onError: continue]
   → IF(sucesso==true)
       sim → HTTP limpa ESTADO → Set resposta="AGENDADO_OK: protocolo {{protocolo}}, {{descricao}}, {{endereco}}. {{instrucoes}}"
       não → Set resposta="NAO_AGENDADO: {{mensagemErro}}"
  ```

### T6 — `Listar_agendamentos`
- **description:** "Use para o paciente ver os agendamentos ativos dele. Passe o cpf (11 dígitos)."
- **Inputs:** `id_conta`,`id_conversa`[FIXO]; `cpf`,`tipo?`[IA].
- **Subfluxo:**
  ```
  Gatilho → HTTP GET /agendamentos?cpf={{cpf}}&tipoAgendamento={{tipo}}
   → Code achatar+numerar → grava ESTADO.mapaAgendamentos (ordem→idAgendamento)
   → Set resposta="Você tem N agendamentos: 1 - ...; 2 - ..." (ou "Nenhum agendamento ativo.")
  ```

### T7 — `Remarcar_ou_cancelar` ⚠️
- **description:**
  > "Use para remarcar ou cancelar um agendamento existente. acao=reagendar troca por um novo horário (o paciente já precisa ter escolhido um horário novo em Buscar_disponibilidade). acao=cancelar cancela. Ambos exigem confirmação explícita do paciente; cancelar exige um 'sim' inequívoco."
- **Inputs:** `id_conta`,`id_conversa`,`estado`[FIXO]; `acao`,`numero_agendamento`,`numero_novo_horario?`,`confirmado`[IA].
- **Subfluxo:**
  ```
  Gatilho
   → IF(confirmado != true) → Set resposta="CONFIRMACAO_PENDENTE" (early return)
   → ler ESTADO (mapaAgendamentos, mapa)
   → Switch(acao)
       reagendar → Code resolve idAgendamentoAnterior + idHorario novo
                 → HTTP POST /horarios/reagendar {idHorario,idAgendamentoAnterior} [onError: continue]
                 → IF sucesso → "REAGENDADO_OK: novo protocolo {{protocolo}}, {{descricao}}" / "NAO_AGENDADO: {{erro}}"
       cancelar  → Code resolve id
                 → HTTP DELETE /agendamentos/{{id}} [onError: continue]
                 → IF status 200 → "CANCELADO_OK" / "ERRO_API"
  ```

---

## 5. Achatar `/agendas/v2` (o `Code` mais importante)

A resposta da API é aninhada (`agendas[].prestadores[].horarios[]`). O subfluxo a transforma em **lista numerada** + **mapa**:

```js
// entrada: items[0].json.agendas (array), dataPaginaSeguinte
const agendas = $json.agendas || [];
let n = 0, linhas = [], mapa = [];
for (const u of agendas) {
  linhas.push(`Unidade: ${u.nomeUnidade}`);
  for (const p of (u.prestadores||[])) {
    linhas.push(`  ${p.nomePrestadorRecurso}${p.valorParticular ? ' — ' + p.valorParticular : ''}`);
    for (const h of (p.horarios||[])) {
      n++;
      linhas.push(`  ${n} - ${h.descricaoHorario}`);
      mapa.push({ ordem:n, idHorario:h.idHorario, idAgenda:h.idAgenda,
                  idPrestador:p.idPrestador, descricao:h.descricaoHorario, valor:p.valorParticular });
    }
  }
}
const textoNumerado = n === 0 ? 'SEM_HORARIOS'
  : linhas.join('\n') + '\nResponda com o número do horário que preferir.';
return [{ json: { resposta: textoNumerado, mapa, dataPaginaSeguinte: $json.dataPaginaSeguinte } }];
```

> O `mapa` é gravado no `agendamento_estado`. O LLM só vê `textoNumerado` (sem IDs).

---

## 6. Gestão de estado entre chamadas

### 6.1 Onde guardar
**`custom_attributes` da conversa no Chatwoot**, num único atributo `agendamento_estado` (JSON serializado). Avaliado contra as alternativas:

| Opção | Veredito |
|---|---|
| **custom_attributes da conversa** | ✅ **Escolhida.** Já há precedente (o `Info` lê `atributos_conversa`); escopo = a conversa; visível ao atendente humano no fallback; sem nova infra. |
| Tabela Postgres nova | ❌ Overkill para a duração de uma conversa; invisível ao atendente; mais nós/credenciais. |
| Só o histórico de tool calls | ⚠️ Usar como **reforço**, não como verdade — IDs longos no texto correm risco de alucinação. |

### 6.2 Forma do estado
```json
{
  "cpf": "55206484091",
  "tipo": "consulta",
  "idItemAgendamento": 406,
  "idConvenio": 10, "idPlano": 2, "nrCarteira": null,
  "dataPaginaSeguinte": "2026-06-17",
  "perguntas": [ { "idPergunta": 2, "alternativas": [ { "id": 1, "impedeRealizacao": "S", "mensagem": "..." } ] } ],
  "anexos": [ { "idTipoAnexo": 94, "url": "https://.../arquivo.pdf" } ],
  "mapa": [ { "ordem": 1, "idHorario": 2046807, "idAgenda": 124004, "descricao": "03/06 11:00", "valor": "R$ 120,00" } ],
  "mapaAgendamentos": [ { "ordem": 1, "idAgendamento": 11191 } ],
  "ts": "2026-06-02T13:00:00-03:00"
}
```

### 6.3 Mecânica
- **Ler:** entra como input fixo da tool — `={{ $('Info').item.json.atributos_conversa.agendamento_estado }}` (sem round-trip). Dentro do subfluxo, `JSON.parse`.
- **Gravar:** nó HTTP `POST /api/v1/accounts/{id_conta}/conversations/{id_conversa}/custom_attributes` com body `{ "custom_attributes": { "agendamento_estado": "<json string>" } }`, header `api_access_token` (credencial Chatwoot já existente). *(Se o nó fazer-ai tiver operação `setCustomAttributes`, pode-se usá-lo no lugar do HTTP.)*
- **Limpar:** ao efetivar/cancelar com sucesso, gravar `agendamento_estado` vazio. O `/reset` da Ana também deve limpá-lo.
- **TTL:** o campo `ts` permite invalidar estado antigo (ex.: > 24h → forçar nova `Buscar_disponibilidade`).

---

## 7. Confirmação antes de gravar (3 camadas)

| Camada | Onde | O que faz |
|---|---|---|
| **1. Prompt** *(principal)* | SOP | "Exibir resumo (procedimento/data/hora/médico/unidade/valor) e pedir confirmação antes de `Efetivar`/`Remarcar`/`Cancelar`. Nunca na mesma mensagem da escolha. Cancelar exige 'sim' inequívoco." |
| **2. Input-gate** | `$fromAI('confirmado', ...)` | A tool de escrita recebe `confirmado`; a description manda passar `true` só após confirmação explícita. |
| **3. Nó-gate** | `IF(confirmado != true)` no início do subfluxo | Early-return determinístico: mesmo se o LLM pular a etapa, **a API não é chamada**. |

---

## 8. Fallback híbrido — prefixos-sinal

Cada subfluxo devolve a `resposta` com um prefixo quando algo impede o caminho feliz. A Ana é instruída (no SOP) a reconhecê-los e cair no fluxo humano **já existente** (mover para a fila + `Escalar_humano`, respeitando `PERÍODO_FDS` e a coleta de nome/CPF).

| Prefixo | Origem | Ação da Ana |
|---|---|---|
| `BLOQUEADO:` | item `bloqueado:true` | acolher + fila `FILA ATENDIMENTO` + escalar |
| `BLOQUEIO_EXAME:` | `impedeRealizacao = S` | informar a mensagem, não agendar, escalar |
| `ESCOLHA_PLANO:` | vários planos no convênio | perguntar o plano ao paciente e repetir a busca |
| `SEM_HORARIOS` | `agendas` vazio | oferecer próxima data (`proxima_pagina`) ou humano |
| `CADASTRO_PENDENTE:` | `/pessoas` vazio | coletar nome + data de nascimento |
| `NUMERO_INVALIDO` | número fora do mapa | pedir um número válido da lista |
| `NAO_AGENDADO:` | `sucesso:false` | se "horário tomado" → rebuscar 1×; senão escalar |
| `ERRO_ANEXO` | upload falhou / arquivo inválido | pedir reenvio 1×; senão escalar |
| `ERRO_API` | HTTP/timeout | desculpar-se + `FALHA AGENDAMENTO — FILA` + escalar |
| `CONFIRMACAO_PENDENTE` | nó-gate | pedir a confirmação explícita |

Configuração: HTTP Request com `onError: continueRegularOutput`; um `IF`/`Code` inspeciona `statusCode`/`sucesso` e produz o prefixo. **O paciente nunca vê o prefixo nem o jargão** — a Ana traduz para acolhimento.

---

## 9. Credenciais e ambientes

- **Token Global Health** → credencial n8n **Header Auth** (`name: Token`, `value: <token>`). Não repetir o anti-padrão de token em texto puro. Provável par homologação/produção → **2 credenciais**.
- **Base URL** → variável de ambiente `GH_BASE_URL` (homolog `https://dem.agenda.globalhealth.mv/rest/whatsapp` · prod `https://whatsapp.agenda.globalhealth.mv/rest/whatsapp`). Trocar de ambiente = trocar 1 variável.
- **PII/LGPD:** CPF e carteirinha trafegam para a API e ficam no `agendamento_estado` e no histórico de tool calls (Postgres). Garantir a limpeza do estado pós-agendamento e alinhar a retenção do histórico com a política do hospital. Anexos podem conter dado sensível (pedido médico) — só são encaminhados à API, nunca reenviados ou descritos.

---

## 10. Edge cases (a tratar nos subfluxos / no SOP)

1. **`data_url` do Chatwoot inacessível pela API GH** → `Gerenciar_anexos` detecta erro de upload → `ERRO_ANEXO`. *(Validar na execução se a URL é pública.)*
2. **Vários planos no convênio** → `ESCOLHA_PLANO:` (não assumir o primeiro).
3. **Paginação infinita** → `dataPaginaSeguinte` null + `proxima_pagina=true` → `SEM_HORARIOS`; após 2–3 páginas, sugerir humano.
4. **Número fora do mapa** → `NUMERO_INVALIDO` (não chama API).
5. **Estado obsoleto** (trocou de procedimento) → `Buscar_disponibilidade` sempre sobrescreve o `mapa`; `ts`/TTL invalida estado velho.
6. **Agendamento para terceiro** → perguntar "para quem é?" e usar o CPF do paciente do agendamento (espelha `nome_paciente ≠ nome_solicitante` da ouvidoria).
7. **Idempotência** → após `ERRO_API` no `agendar`, **não** auto-retry; checar via `Listar_agendamentos` ou escalar.
8. **`nrCarteira` só para convênio não-particular** (campo `particular` em `/convenios`).
9. **Concorrência de horário** (`"Este horário já foi agendado por outra pessoa"`) → `NAO_AGENDADO:` → reabrir busca 1×.
10. **Mídia que não é anexo** → a Ana só chama `Gerenciar_anexos` (modo=enviar) quando entende que o arquivo é o documento pedido.

---

## 11. Como plugar no `Ana.json`

1. Criar os 7 subfluxos (workflows separados) com o molde da §3.
2. No `Ana.json`, adicionar 7 nós `@n8n/n8n-nodes-langchain.toolWorkflow`, cada um apontando para o subfluxo e com os `workflowInputs` da §4, conectados à entrada **`ai_tool`** do nó `Agente IA Hospital`.
3. Atualizar o `systemMessage` do agente com o SOP novo ([04-sop-ana-reescrito.md](04-sop-ana-reescrito.md)).
4. Garantir que o nó de **reset** limpe `agendamento_estado`.

> Passo-a-passo detalhado e checklist de teste em [05-guia-implementacao-n8n.md](05-guia-implementacao-n8n.md).
