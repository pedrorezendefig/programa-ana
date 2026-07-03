# Catálogo de Funções da Ana

Inventário completo do que a Ana faz — **funções atuais** (já no `Ana.json`) e **funções novas** (agendamento via API). Cada ficha segue o formato: **propósito · gatilho · pré-condições · saída/efeito · riscos**.

Legenda de status: 🟢 existe hoje · 🔵 novo (agendamento)

> Convenção das tools no n8n: cada *tool* aparece como um nó conectado ao **Agente IA Hospital**. Tools de conhecimento usam Google Sheets; tools de CRM e de agenda são **subfluxos** (`toolWorkflow`).

---

## A. Conversação e Triagem 🟢

### A.1 — Identificação do motivo do contato
- **Propósito:** entender, na primeira mensagem útil, o que o paciente quer (agendar, consultar, reclamar, etc.).
- **Gatilho:** toda conversa nova, após a saudação.
- **Pré-condições:** nenhuma.
- **Saída/efeito:** define qual seção do SOP conduzir; tipicamente move o card para `EM ATENDIMENTO — ANA`.
- **Riscos:** classificar errado consulta × exame. Mitigado por regra de inferência (especialidade→consulta; procedimento→exame).

### A.2 — Pergunta acolhedora (convênio × particular)
- **Propósito:** descobrir se é convênio ou particular sem soar burocrático.
- **Gatilho:** quando a via de pagamento ainda não está clara e é necessária.
- **Saída/efeito:** direciona para o fluxo particular (Sheets + API) ou convênio (API/portal).
- **Riscos:** oferecer particular a quem tem convênio aceito (proibido pela Regra Global).

### A.3 — Validação de escopo
- **Propósito:** separar o que a Ana resolve do que vai para humano.
- **Gatilho:** qualquer pedido.
- **Saída/efeito:** fora de escopo → `Atualizar_lead` p/ `FILA ATENDIMENTO` + `Escalar_humano`.

---

## B. Base de Conhecimento — Google Sheets 🟢

> Fonte do **discurso comercial**. Com a integração, deixam de ser fonte de disponibilidade (isso vira API) e passam a servir diferenciais, ancoragem de valor e cirurgias.

### B.1 — `Get_Consultas`
- **Propósito:** valor e diferenciais de consultas particulares por especialidade.
- **Gatilho:** paciente pergunta se atende uma especialidade, valor ou disponibilidade (ex.: "vocês atendem urologia?").
- **Saída:** registros de consulta (especialidade, valor, diferenciais).
- **Riscos:** nunca afirmar disponibilidade sem chamar a tool. O **agendamento real** passa a usar a API, não esta planilha.

### B.2 — `Get_Convenios`
- **Propósito:** quais convênios são aceitos e especialidades cobertas.
- **Gatilho:** "meu convênio cobre X?", "o Unimed atende aí?".
- **Riscos:** não confirmar cobertura de memória. (Na execução, a cobertura efetiva é validada pela API ao buscar disponibilidade.)

### B.3 — `Get_Exames`
- **Propósito:** preparo, valor e diferenciais de exames.
- **Gatilho:** "fazem ressonância?", "qual o preparo da colono?", "quanto custa um hemograma?".
- **Saída:** registros de exame com preparo e valor.

### B.4 — `Get_Cirurgias`
- **Propósito:** estimativa de cirurgias (a **API não cobre cirurgia** — esta planilha continua sendo a fonte única).
- **Gatilho:** "fazem cirurgia de vesícula?", "quanto sai uma hérnia?".
- **Saída:** estimativa + honorários + internação, sempre com o caveat de avaliação médica.

---

## C. CRM — Chatwoot Kanban 🟢

> Tags e etapas via REST do Chatwoot (`/kanban/tasks/...`). São o "rastro" de tudo que a Ana faz, inclusive os agendamentos via API.

### C.1 — `Aplicar_tag`
- **Propósito:** etiquetar o card (uma tag por chamada).
- **Gatilho:** momentos definidos no SOP (ex.: valor informado → `particular-aquecido`).
- **Efeito:** `PATCH /kanban/tasks/{id}` anexando a tag.
- **Tags hoje:** `particular-aquecido`, `agendamento-particular`, `agendamento-convenio`, `exame-resultado`, `prontuario`, `ouvidoria`, `fora-horario`.
- **Tags novas (agendamento):** `agendado-bot`, `remarcacao`, `cancelamento`.

### C.2 — `Atualizar_lead`
- **Propósito:** mover o card entre etapas do funil.
- **Gatilho:** mudanças de estágio do atendimento.
- **Efeito:** `POST /kanban/tasks/{id}/move`.
- **Etapas hoje:** `NOVO CONTATO`, `EM ATENDIMENTO — ANA`, `AGUARDANDO CONFIRMAÇÃO`, `FILA COMERCIAL`, `FILA ATENDIMENTO`, `FILA OUVIDORIA`, `SETOR RESPONSÁVEL`, `AGENDADO`, `ENCERRADO — RESOLVIDO`, `ENCERRADO — DESISTÊNCIA`.
- **Etapa nova:** `FALHA AGENDAMENTO — FILA` (falha técnica da API após tentativa). `AGENDADO` passa a ser atingível **automaticamente** pela Ana.

### C.3 — `Escalar_humano`
- **Propósito:** notificar a equipe (nota privada no Chatwoot com resumo da conversa).
- **Gatilho:** sempre após mover para uma fila humana.
- **Pré-condições:** verificar `PERÍODO_FDS`/horário; nos fluxos que exigem, nome+CPF validados.

### C.4 — `Registrar_reclamacao`
- **Propósito:** abrir protocolo de ouvidoria e gravar em Google Sheets (`6_Ouvidoria_Log`).
- **Gatilho:** fim do fluxo de ouvidoria, após confirmação do paciente.
- **Saída:** protocolo HSM + linha na planilha.

### C.5 — `Encerrar_conversa`
- **Propósito:** encerrar atendimento resolvido.
- **Gatilho:** **somente** após `ENCERRADO — RESOLVIDO` e **sem** nenhuma escalada na conversa.

---

## D. Agenda — API Global Health/MV 🔵 (NOVO)

> Detalhe técnico completo (subfluxos, estado, fallback) em [02-arquitetura-agendamento.md](02-arquitetura-agendamento.md). Aqui ficam as fichas funcionais.

### D.1 — `Identificar_paciente`
- **Propósito:** localizar (ou criar) o cadastro do paciente no sistema de agenda.
- **Gatilho:** logo após validar o CPF, antes de efetivar qualquer agendamento.
- **Pré-condições:** CPF validado (11 dígitos). Para cadastrar: nome completo + data de nascimento.
- **Endpoints:** `GET /pessoas` (+ `POST /pessoas` se não existir).
- **Saída:** dados do paciente, ou pedido dos dados de cadastro.
- **Riscos:** PII/LGPD — CPF trafega para a API.

### D.2 — `Buscar_disponibilidade` *(orquestrador)*
- **Propósito:** descobrir o item (consulta/exame), resolver convênio/plano e retornar **horários reais numerados**.
- **Gatilho:** paciente já disse o que quer e a via (convênio/particular), e pediu para ver horários.
- **Endpoints:** `/consultas`|`/exames` → `/convenios`(+`/planos`) → `/agendas/v2` (com paginação).
- **Saída:** lista numerada ("1 - 03/06 11h, Dra. Fernanda…") + grava o **mapa de IDs** no estado.
- **Riscos:** item `bloqueado:true` → fallback; sem horários → oferecer próxima data ou humano.

### D.3 — `Pre_requisitos_agendamento`
- **Propósito:** obter o que falta antes de efetivar — **tipo de consulta** ou **perguntas de triagem do exame**.
- **Gatilho:** após o paciente escolher o horário; consulta → tipos; exame → perguntas.
- **Endpoints:** `GET /consultas/tipos?idAgenda` **ou** `GET /exames/perguntas`.
- **Saída:** lista de tipos (vira `idTipoMarcacao`) ou perguntas com alternativas.
- **Riscos:** alternativa com `impedeRealizacao = S` **bloqueia** o exame → não agendar, escalar.

### D.4 — `Gerenciar_anexos`
- **Propósito:** descobrir anexos exigidos (pedido médico, carteirinha) e subir os arquivos enviados pelo paciente.
- **Gatilho:** item que exige anexo obrigatório.
- **Endpoints:** `POST /anexos/agendamento` (o que exige) + `POST /anexos/upload` (sobe a `url_arquivo` do Chatwoot).
- **Riscos:** LGPD (documento sensível); `url_arquivo` precisa ser acessível pela API; arquivo fora de imagem/PDF → fallback.

### D.5 — `Efetivar_agendamento` ⚠️ escrita
- **Propósito:** **gravar o agendamento** e devolver o protocolo.
- **Gatilho:** **somente após confirmação explícita** do paciente, CPF validado, IDs reais e pré-requisitos resolvidos.
- **Endpoint:** `POST /horarios/agendar`.
- **Saída:** `protocolo` + data/unidade/instruções → `AGENDADO` + tag `agendado-bot`. Em `sucesso:false` → fallback.
- **Riscos:** idempotência (nunca reefetivar em retry cego); nunca dizer "agendado" sem `sucesso:true`.

### D.6 — `Listar_agendamentos`
- **Propósito:** mostrar os agendamentos ativos do paciente.
- **Gatilho:** paciente pergunta "quais são meus agendamentos?" ou quer remarcar/cancelar.
- **Endpoint:** `GET /agendamentos?cpf=`.
- **Saída:** lista numerada + grava `mapaAgendamentos` no estado.

### D.7 — `Remarcar_ou_cancelar` ⚠️ escrita
- **Propósito:** trocar o horário (remarcar) ou cancelar um agendamento.
- **Gatilho:** após o paciente escolher qual agendamento e **confirmar** (cancelar exige confirmação reforçada).
- **Endpoints:** `POST /horarios/reagendar` | `DELETE /agendamentos/{id}` (via parâmetro `acao`).
- **Saída:** novo protocolo (remarcar) ou confirmação de cancelamento + tag `remarcacao`/`cancelamento`.
- **Riscos:** ação destrutiva — nunca cancelar sem "sim" inequívoco; não operar sobre `id` que não veio de `Listar_agendamentos`.

---

## E. Infraestrutura do Agente 🟢

### E.1 — Transcrição de áudio
- **Propósito:** converter áudios do paciente em texto.
- **Fluxo:** `Download áudio` → `Convert to File` → `Transcrever audio` (OpenAI, `pt`) → salva em `transcribed_text`.
- **Riscos:** áudio silencioso/ruído → código limpa bugs de transcrição.

### E.2 — Descrição de imagem
- **Propósito:** sinalizar quando o paciente envia imagem e pedir reenvio por texto/áudio quando preciso.
- **Observação:** com `Gerenciar_anexos`, imagens podem virar **anexos de agendamento** (pedido médico/carteirinha) — distinguir os dois usos é regra de prompt.

### E.3 — Fila e lock anti-concorrência
- **Propósito:** evitar respostas duplicadas e mensagens "encavaladas".
- **Fluxo:** `n8n_fila_mensagens` (enfileira/dedup) + `n8n_status_atendimento` (lock por conversa) + espera de 8s.
- **Relevância p/ agendamento:** garante que a jornada é serial por conversa — protege o estado da jornada.

### E.4 — Memória da conversa
- **Propósito:** dar contexto ao agente.
- **Fluxo:** `memoryPostgresChat` (`n8n_historico_mensagens`), chave = `id_conversa`, janela ~15. O nó `Salvar tool calls` injeta os resultados das tools — então **o que cada tool retorna fica visível nas próximas mensagens**.

### E.5 — Ligar/Desligar Ana (`Desliga Ana`)
- **Propósito:** pausar a Ana quando um humano assume (tag `agente-off`); religar com `/ana`.
- **Gatilho:** mensagem de saída de um atendente humano.

### E.6 — Reset (`/reset`)
- **Propósito:** limpar memória, fila, status, atributos e etiquetas da conversa.
- **Relevância p/ agendamento:** o reset também deve **limpar `agendamento_estado`** (estado da jornada).

---

## F. Funções Operacionais 🟢

### F.1 — Ouvidoria
- **Propósito:** acolher reclamação, coletar dados, registrar protocolo.
- **Fluxo:** tag `ouvidoria` → coleta estruturada → confirmação → `Registrar_reclamacao` → `FILA OUVIDORIA` → `Escalar_humano`.

### F.2 — Prontuário
- **Propósito:** orientar a solicitação de prontuário por finalidade.
- **Fluxo:** tag `prontuario` → orientação/documentos → `SETOR RESPONSÁVEL` → `Escalar_humano`.

### F.3 — Resultado de exame
- **Propósito:** orientar acesso (RIOLABOR / plataforma do hospital). **Nunca enviar resultado** (LGPD).
- **Fluxo:** tag `exame-resultado` → orientação.

### F.4 — Gestão fora do horário (`PERÍODO_FDS`)
- **Propósito:** registrar e acolher quando a equipe humana não está; informar retorno.
- **Observação:** o **caminho de sucesso da API funciona 24/7** e não usa MENSAGEM_FDS; só o fallback humano respeita o horário.

---

## Mapa rápido tool → onde está detalhado

| Tool | Tipo | Detalhe |
|---|---|---|
| `Get_*` | Google Sheets (RAG) | §B |
| `Aplicar_tag`, `Atualizar_lead`, `Escalar_humano`, `Registrar_reclamacao`, `Encerrar_conversa` | Subfluxo / CRM | §C |
| `Identificar_paciente`, `Buscar_disponibilidade`, `Pre_requisitos_agendamento`, `Gerenciar_anexos`, `Efetivar_agendamento`, `Listar_agendamentos`, `Remarcar_ou_cancelar` | Subfluxo / API | §D + [02](02-arquitetura-agendamento.md) |
