# Programa Atendimento ao Cliente — Ana & CRM
## Documento-mestre

**Hospital São Matheus (AMA) — Bangu, Rio de Janeiro**
Direção Executiva: Felipe Malafaia · Engenharia de IA: Pedro · Coordenação de atendimento: Gisele

> Registro vivo de decisões. Atualizar a cada decisão fechada. Não é relatório — é a memória do programa. As seções que mais mudam são a **7 (log de decisões)** e a **8 (questões em aberto)**: cada questão resolvida vira uma linha no log.

---

## 1. Objetivo e escopo

Transformar o atendimento ao cliente do hospital em uma operação empática, ágil e majoritariamente resolvida por IA, capturando o paciente particular (alta margem), não perdendo leads nem queixas, e transformando contato em inteligência de gestão. A IA ("Ana") é a espinha dorsal; o Chatwoot é o CRM comum a todas as frentes.

**Quatro frentes mapeadas:**

- **Frente 1 —** Atendimento e agendamento autônomo no WhatsApp (resolver a maioria; transbordar só o necessário).
- **Frente 2 —** Captura e conversão do paciente particular (identificar intenção de preço, acolher, agendar/aquecer).
- **Frente 3 —** Ouvidoria 24/7 (acolher, classificar e registrar elogio/reclamação/denúncia; apuração permanece humana).
- **Frente 4 —** Voz do paciente / pós-atendimento (disparo proativo, escuta interna para gestão e motor de reputação). Inclui gestão de reputação no Google Meu Negócio: rascunhos de resposta a avaliações gerados por IA, com aprovação humana obrigatória antes de publicar (regra dura para avaliações negativas).

**Fases:** Fase 1 — Ana no WhatsApp (frentes 1 a 4 conforme maturidade). Fase 2 — agente de voz para o telefone.

---

## 2. Baseline (números de partida)

Congelado para medir ganho. Toda melhoria se mede contra estes números.

| Indicador | Valor de partida | Fonte |
|---|---|---|
| Ligações telefônicas / mês | ~17.006 | Relatório de telefonia |
| Abandono telefônico | 14% (~2.329/mês), pico 07h–10h | Relatório de telefonia |
| TM de atendimento / espera | 1min50s / ~4min (6min no pico) | Relatório de telefonia |
| Mensagens WhatsApp / mês | ~20.814 (quase 100% WhatsApp) | Painel Kommo |
| Conversas não respondidas | ~3.295, crescendo +817/mês | Painel Kommo |
| Contatos particulares fora do CLT | 25–50% (noite/fim de semana) | Percepção da direção |
| Volume pós-atendimento / mês | ~25–35 mil pacientes (todos os serviços) | Estimativa operacional |
| Ouvidoria | Volume alto e constante; sem prazo regulatório formal | Percepção da direção |

---

## 3. Arquitetura da solução

Fluxo central: **Ana (n8n) → API Global Health/MV (agendamento) → Chatwoot (CRM)**. WhatsApp Business API oficial. Decisão de arquitetura de agentes tomada por análise crítica (council):

| Frente | Arquitetura decidida | Racional |
|---|---|---|
| Atendimento + Comercial | Agente único com modos | Vender é extensão de agendar; subagente injetaria fricção no handoff |
| Ouvidoria | Modo isolado na Ana única, identidade percebida separada | Natureza divergente; regra de exclusão desliga o comercial; apuração é humana |
| Pós-atendimento / Voz do paciente | Tende a agente/fluxo dedicado | Tarefa é batch + analítica, não conversa reativa |

**Regra de exclusão (crítica):** ao classificar uma conversa como ouvidoria, o modo comercial morre para aquela thread. O modo ouvidoria carrega guardrails jurídicos próprios — não admitir culpa, não prometer o que não se cumpre, não dar parecer clínico, nunca desencorajar registro formal.

---

## 4. Estrutura do Chatwoot

### 4.1 Pipeline (funil)

| Etapa | Significado | Quem move |
|---|---|---|
| 1. Novo contato | Conversa entrou, Ana assumindo | Ana (auto) |
| 2. Em atendimento (Ana) | Ana conduzindo / resolvendo | Ana |
| 3. Lead particular — aquecendo | Detectou intenção de preço/particular | Ana |
| 4. Resgate humano | Ana sinalizou que humano deve assumir | Humano (notificado) |
| 5. Negociação humana | Atendente conduzindo o particular | Humano |
| 6. Agendado / Ganho | Consulta/exame/procedimento marcado | Ana ou humano |
| 7. Perdido | Não converteu — **motivo obrigatório** | Sistema/humano |

**Ponto mais frágil:** a transição 3→4 (handoff). Deve ser instantânea, com atribuição automática + notificação. Lead quente nunca espera em coluna.

### 4.2 Taxonomia de tags (famílias com prefixo)

- `canal:` — whatsapp · instagram (origem).
- `tipo:` — consulta · exame · procedimento · duvida · retorno (o que o paciente quer).
- `pagador:` — particular · convenio · indefinido (**a tag que vale dinheiro**; aciona o modo comercial).
- `lead:` — quente · morno · frio (temperatura comercial, só particulares).
- `status-ana:` — resolveu · transbordou · erro (alimenta os KPIs da Ana).
- `motivo-perda:` — preco · demora · concorrente · desistiu (obrigatória na etapa Perdido).
- `ouvidoria:` — elogio · reclamacao · denuncia (três caminhos distintos).
- `tema:` — demora-telefone · cobranca · conduta · estrutura · ... (co-desenhar com coordenadores; é o que vira o painel de gestão).

*Deliberadamente fora:* tags por especialidade médica (já vêm da API; não duplicar a fonte).

### 4.3 Papéis de usuário

- **Ana** — agente nível 0, assume 100% das conversas na entrada.
- **Atendentes de exceção** — resolvem o que a Ana transborda (anexo, bloqueio, confusão).
- **Especialistas de conversão** — recebem `lead:quente` particular para fechar (papel novo a criar).
- **Gisele** — coordenadora/admin: vê tudo, move travados, faz revisão qualitativa semanal.
- **Direção/board** — acesso de visualização aos relatórios.

### 4.4 Três decisões de configuração

1. **Estados —** Ana trabalhando = `pending`; aguardando humano = `open` atribuído; resolvido = `resolved`. Não misturar.
2. **SLA —** por etapa desde o início: lead quente em minutos; exceção operacional mais folgado; alerta ao estourar.
3. **Noturno —** à noite a Ana opera autônoma e, para o que transbordaria, acolhe e agenda o retorno humano para a manhã com lead já etiquetado — nunca deixa no vácuo.

---

## 5. KPIs e medição

**Regra de ouro:** medir a experiência de quem **não** foi atendido, não só de quem foi. E separar sempre mérito da IA do mérito humano (cada métrica com campo de origem: Ana vs. humano).

**Bloco A — Saúde do funil:** % conversas com 1ª resposta (inverso das 3.295) · estoque de não respondidas · derivada do estoque (o +817 deve virar negativo) · tempo até 1ª resposta real · tempo até resolução.

**Bloco B — Desempenho da Ana:** taxa de resolução autônoma (central) · taxa de transbordo · transbordo correto vs. desnecessário · taxa de erro de informação (revisão amostral) · tempo de resolução.

**Bloco C — Conversão comercial:** leads particulares identificados · agendados pela Ana vs. transbordados · taxa de conversão do lead aquecido · distribuição horária (valida os 25–50% noturnos) · tempo de resgate humano.

**Bloco D — Qualidade percebida (o anti-robótico):** taxa de abandono da conversa · pedidos de "falar com pessoa" · revisão qualitativa semanal (Gisele) · CSAT pós-atendimento (opcional).

---

## 6. Equipe e dimensionamento

**Princípio:** humano e IA escalam de forma oposta. A IA cobre o volume elástico e a rotina; o humano cobre a exceção e o que exige julgamento. O tamanho final é uma **saída** do projeto (medido após a Ana absorver volume), não uma entrada.

**Financiamento sem corte:** as 4 vagas já abertas (Jessica, Tatiane, Tayná, Isabelle) não são repostas — convertem-se em orçamento de automação. Redução por não-reposição é juridicamente mais limpa que demissão (atenção ao passivo trabalhista existente).

**Estrutura-alvo sob a Gisele** (ponto de partida, ~7–9 pessoas, ajustável pós-dados):

| Função | Hoje | Alvo |
|---|---|---|
| WhatsApp — automação (Ana) | 0 | Agente IA (camada 1) |
| WhatsApp — exceção humana | 2 (parciais) | 1–2 (dedicadas) |
| Conversão de particular | 0 | 1–2 (papel novo) |
| Telefonia (pico + não-digital) | ~12 | 3–4 realocadas |
| Vagas em aberto | 4 ociosas | não repor |

---

## 7. Decisões tomadas (log)

O coração da continuidade. Cada decisão fechada entra aqui, datada. Nenhuma conversa futura reabre o que já está decidido.

| Data | Decisão | Origem |
|---|---|---|
| jun/2026 | WhatsApp é a prioridade (maior volume + mais desassistido + API pronta), não o telefone | Análise de dados |
| jun/2026 | Agente único para atendimento + comercial; **não** subagente comercial | Council |
| jun/2026 | Ouvidoria como modo isolado da Ana, com regra de exclusão e guardrails jurídicos | Council |
| jun/2026 | Pós-atendimento em dois mecanismos separados (escuta interna + reputação); **sem** review gating | Council |
| jun/2026 | Disparo proativo começa **só** pelo eletivo; emergência/obstetrícia só com filtro de desfecho | Council |
| jun/2026 | Não cortar equipe agora; reduzir por não-reposição das 4 vagas | Council |
| jul/2026 | Transbordo comercial é **seletivo**: Ana fecha consulta/exame particular sozinha 24/7; humano só para cirurgia, procedimento e negociação | Revisão da direção |
| jul/2026 | Reafirmado: disparo pós-atendimento começa só pelo eletivo; emergência (~10 mil/mês) fora até filtro de desfecho via MV | Revisão da direção |
| jul/2026 | Frente 4 estendida: respostas a avaliações do Google Meu Negócio via IA, com aprovação humana antes de publicar | Direção |

---

## 8. Questões em aberto

- **Integração —** token de produção da Global Health + limite de chamadas simultâneas que a API suporta.
- **Pós-atendimento —** fonte de dados do disparo deve vir do MV com **serviço e desfecho** (não lista solta).
- **Escopo —** recorte de público do disparo: confirmar início só pelo eletivo; quando e como incluir emergência.
- **Comportamento —** perfil de canal do paciente de Bangu: quanto migra do telefone para o WhatsApp?
- **Custo Meta —** classificação do template de abertura (utilidade vs. marketing) — define custo 6x. Testar antes de escalar.
- **LGPD —** consentimento de origem: o termo de atendimento autoriza contato proativo para pesquisa?
- **Ouvidoria —** dimensionamento humano pós-Ana (Cristiane é uma pessoa só, volume alto).

---

## 9. Riscos e guardrails

| Risco | Guardrail |
|---|---|
| Tom robótico perde o lead | Iteração do system prompt em sombra; revisão qualitativa contínua |
| LGPD / sigilo médico | Intenção comercial (preço) nunca se confunde com condição clínica; dado fica interno |
| Disparo para luto (emergência/obstetrícia) | Filtro de desfecho via MV; começar só pelo eletivo |
| Review gating no Google | Convite amplo sem filtrar por nota; reputação por melhoria real e volume |
| Fadiga / banimento do canal | Opt-out fácil; ritmo de disparo gerido; limite Meta (250–1.000/dia inicial) |
| Registro vira prova judicial | Ana não admite culpa, não promete, não dá parecer; guardrails no prompt |
| Manutenção da Ana (carga do Pedro) | Contabilizar como custo recorrente; a economia de folha não é total |
| Relatório que ninguém usa | Dono + ritual semanal + cada categoria acima do limiar vira ação com responsável |
| Resposta pública errada a review | Rascunho por IA, publicação só com aprovação humana; negativas seguem guardrails da ouvidoria (não admitir culpa, não expor dado do paciente) |

---

## 10. Roadmap por fase

**Fase 1 — Ana no WhatsApp**

1. **Pré —** travar API do MV (token, endpoints, limite simultâneo) e medir baseline do WhatsApp.
2. **Passo 1 —** sombra: Ana responde, humano revisa antes de enviar; calibrar tom em casos reais.
3. **Passo 2 —** autônomo com transbordo, atacando primeiro a fila de não-respondidas.
4. **Passo 3 —** ativar modo comercial (particular) e ouvidoria conforme maturidade.
5. **Passo 4 —** pós-atendimento (eletivo) em fluxo dedicado; depois expandir com filtro de desfecho.
6. **Passo 5 —** escala após resolução autônoma estabilizar (sugerido ≥70% nos fluxos de rotina).

**Fase 2 — Agente de voz para o telefone**

Nasce com todo o contexto da Fase 1. Priorizada pelo que a ouvidoria/pós-atendimento apontar como maior dor (provável: pico telefônico).

---

*Documento-mestre vivo — atualizar o log (seção 7) e as questões em aberto (seção 8) a cada decisão. As demais seções refletem o estado consolidado em junho/2026.*
