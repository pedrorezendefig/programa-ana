---
status: accepted
date: 2026-08-06
---

# A Ana fala com a Global Health por uma fachada de 7 ferramentas de agenda, não pelos 22 endpoints crus

Fecha a metade restante da GH1 (a sessão de desenho do fluxo). A decisão: a Ana **não ganha 22 tools**, uma por endpoint da API GH. Ela ganha as **7 ferramentas de agenda que o SOP reescrito já define** (`docs/04-sop-ana-reescrito.md`): `Identificar_paciente`, `Buscar_disponibilidade`, `Pre_requisitos_agendamento`, `Gerenciar_anexos`, `Efetivar_agendamento`, `Listar_agendamentos`, `Remarcar_ou_cancelar`. Cada ferramenta encapsula a cadeia de endpoints GH correspondente; o modelo conversa na linguagem do SOP e a fachada fala HTTP com a homologação.

Executada em modo autônomo por decisão do Pedro (06/ago/2026): sem grilling, com as recomendações de boa prática registradas aqui para revisão a posteriori.

## Contexto

- O catálogo e a viabilidade dos endpoints já estavam resolvidos (Mapa das APIs, ADR-0007; página Cadeias, 06/ago). Faltava o desenho: onde cada endpoint entra no fluxo de atendimento.
- O SOP reescrito de `docs/04` (era n8n) já desenhou o fluxo inteiro em cima de 7 ferramentas compostas. O desenho continua válido na plataforma fazer.ai agents; o que muda é o veículo de implementação.
- Evidência empírica do V6: o `gpt-5-mini` re-chamou a mesma tool 13 vezes num cenário. Dar 22 endpoints crus a esse modelo multiplica loops, custo e erro de encadeamento. A fachada reduz a superfície de decisão do modelo.
- Fatos de arquitetura (Dácilla/MV, 24/jul): a API roda sobre o banco SaaS da GH; só a finalização grava no Soul (Oracle). Isso define os gates: GH-19 (massa de homolog) trava a disponibilidade hoje; GH-18 (a homolog grava na TST?) é o gate da finalização.

## O mapa: ferramenta → endpoints → momento no fluxo

| Ferramenta (SOP) | Endpoints GH encapsulados | Onde entra no fluxo |
|---|---|---|
| `Identificar_paciente` | `GET /pessoas` (por CPF e por telefone), `POST /pessoas` | Seções 2/3/5, passo de cadastro, após coleta validada. Cadastro novo exige data de nascimento |
| `Buscar_disponibilidade` | `GET /consultas` ou `GET /exames` → `GET /prestadores` → `GET /convenios` (+`/planos`, `/subPlanos` quando via convênio) → `GET /agendas/v2` | Após o paciente dizer o que quer e a via. Devolve a lista numerada do SOP |
| (carteiras, dentro da via convênio) | `GET /carteiras`, `POST /carteiras`, `DELETE /carteiras/{id}` | Seção 3, passo da carteirinha. `nrCarteira` é obrigatório (achado de campo, 417) |
| `Pre_requisitos_agendamento` | `GET /consultas/tipos` (consulta) ou `GET /exames/perguntas` + `GET /exames/instrucaoGeral` (exame) | Após a escolha do horário. `impedeRealizacao = S` aciona a Regra Híbrida |
| `Gerenciar_anexos` | `POST /anexos/agendamento` (consulta de exigidos), `POST /anexos/upload` | Quando o item exige anexo (pedido médico, carteirinha) |
| `Efetivar_agendamento` | `POST /horarios/agendar` (+ `GET /horarios/{id}/instrucoes` no sucesso) | Só após confirmação explícita. É a finalização: o único ponto que grava no Soul (GH-18) |
| `Listar_agendamentos` | `GET /agendamentos`, `GET /agendamentos/{id}` | Seção 4.1 e a conferência anti-duplicidade da Regra 17. `tipoAgendamento` em CAIXA ALTA (minúsculo = 500) |
| `Remarcar_ou_cancelar` | `POST /horarios/reagendar`, `DELETE /agendamentos/{id}` | Seções 4.2/4.3, com confirmação reforçada. Também finalização |

Os 22 endpoints do Mapa das APIs estão cobertos; nenhum fica órfão e nenhuma ferramenta nova foi inventada além das que o SOP já usa.

## Veículo de implementação (decidido por fase)

| Fase | O quê | Veículo |
|---|---|---|
| P4 | `Identificar_paciente` (busca por CPF/telefone) | **Tools HTTP diretas** na plataforma, como as da Base Ana: a busca é 1 endpoint, não precisa de orquestração. O `POST /pessoas` (cadastro) entra aqui com sanitização de nome |
| P5 | `Buscar_disponibilidade` e `Pre_requisitos_agendamento` | **Proxy fino de orquestração** (serviço pequeno no Coolify da VPS), porque compõem 3 a 4 chamadas encadeadas. As tools da plataforma apontam para o proxy, nunca para a GH direto |
| P6 | `Efetivar_agendamento`, `Listar_agendamentos`, `Remarcar_ou_cancelar`, `Gerenciar_anexos` | Mesmo proxy. Gate: a Prova no banco (P3/GH-18) precisa confirmar que a finalização chega ao Oracle antes de a Ana prometer protocolo a paciente |

## Regras transversais da fachada

- **Segredo:** o token GH mora na credencial da tool/vault da plataforma (ou no ambiente do proxy), **nunca no prompt do agente**. Homologação somente; produção jamais entra nas ferramentas locais ou da plataforma.
- **Sanitização de entrada:** nome sem números (a API recusa com 417), CPF reduzido a 11 dígitos, enums em CAIXA ALTA. A fachada corrige antes de chamar, em vez de confiar no modelo.
- **Tradução de erro:** o formato `{"mensagens":[{"tipo":"ERROR","descricao":...}]}` (417) é regra de negócio legível; a fachada devolve a `descricao` ao modelo para alimentar a Regra Híbrida, sem vazar jargão HTTP ao paciente.
- **Contrato de falha:** toda falha de ferramenta cai na Regra Híbrida do SOP (fila certa + `Escalar_humano`), que já está desenhada; nada de retry cego (Regra 17: conferir com `Listar_agendamentos` antes de repetir).

## Consequências

- As propostas P4 → P5 → P6 do grafo são exatamente as fases deste desenho; nenhuma tarefa nova nasce da GH1. P3 (GH-18) deixa de bloquear o desenho e passa a ser gate só da P6, onde sempre foi decisiva.
- O prompt do agente em produção hoje (v4, estágio de viabilidade) não muda agora: o SOP de `docs/04` é o alvo para quando as tools de agenda entrarem (P4 em diante), adaptando os nomes às tools reais da plataforma.
- As etapas/tags novas do SOP (`FALHA AGENDAMENTO — FILA`, `agendado-bot`, `AGENDADO` automático) esbarram no Congelamento do Chatwoot (06/jul): configurar junto com a entrada do canal principal, não antes.
- A GH-19 continua sendo o desbloqueio prático da P5: sem massa publicada, `Buscar_disponibilidade` devolve lista vazia. O desenho não espera por ela; a implementação da P4 já pode começar.
