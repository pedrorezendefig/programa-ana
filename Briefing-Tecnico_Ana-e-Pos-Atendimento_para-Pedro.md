# Briefing Técnico — Ana (adequações) & Agente de Pós-Atendimento
## Programa Ana & CRM — Hospital São Matheus (AMA), Bangu/RJ

**De:** Felipe Malafaia (Direção Executiva)
**Para:** Pedro (Engenharia de IA)
**Objetivo do documento:** consolidar todo o debate de arquitetura e escopo em um único material de trabalho, para que você avalie os cenários, aponte inviabilidades técnicas e implemente. Não é especificação fechada — é o raciocínio completo por trás das decisões, com as questões em aberto explicitadas.

> **Como ler este documento:** a Parte I trata das adequações no prompt da Ana (agente reativo que já existe). A Parte II trata do agente de pós-atendimento (novo, proativo e analítico, a ser construído do zero). A Parte III lista as decisões de arquitetura já fechadas e as questões que dependem de você. Onde há risco de segurança do paciente ou risco jurídico, está marcado como **CRÍTICO**.

---

## PARTE I — Adequações da Ana (agente reativo)

### I.0 Princípio central: a Ana tem três modos, não três agentes

A decisão de arquitetura mais importante, validada em duas rodadas de análise crítica multi-perspectiva (metodologia "council"): a Ana é **um único agente conversacional** com três modos de comportamento bem demarcados, e **não** um conjunto de subagentes especializados.

O racional técnico é o consenso de engenharia de agentes de 2026: começar com agente único robusto e só migrar para multi-agente quando o agente único demonstravelmente atinge um platô de desempenho. Setups multi-agente adicionam overhead de tokens (na ordem de 58% a 285% dependendo da topologia) e — mais grave para o nosso caso — introduzem fragilidade no handoff entre agentes. O handoff é o ponto de falha mais documentado em produção (a própria equipe de SRE do Azure reverteu uma arquitetura de especialização multi-agente por causa disso).

No nosso contexto, "vender" é uma extensão natural de "agendar" (o mesmo ato de marcar, com tom consultivo), então separar o comercial em subagente injetaria fricção sem ganho. A ouvidoria tem natureza mais divergente, mas ainda assim se resolve como **modo isolado** dentro da Ana, com uma regra de exclusão dura — não como entidade técnica separada.

**Os três modos:**

1. **Modo atendimento** — agendar, remarcar, orientar, informar. Reativo. É o que o prompt atual já faz bem.
2. **Modo comercial** — detecta intenção de preço/particular, gera percepção de valor, aquece o lead, transborda para humano no ponto certo. Reativo. Parcialmente coberto (Seções 2 e 6 do prompt atual).
3. **Modo ouvidoria** — acolhe reclamação/elogio, classifica, registra protocolo, resolve o que dá para resolver, transborda a apuração para humano. Reativo. Existe no prompt (Seção 7), mas falta a regra de exclusão e os guardrails jurídicos.

Os três convivem porque compartilham a mesma natureza: reativos, conversacionais, um paciente por vez.

---

### I.1 CRÍTICO — Fluxo de triagem de urgência (está faltando)

**O problema:** a seção de Identidade da Ana promete que ela faz "triagem de urgências". A Regra Global 2 proíbe corretamente qualquer orientação, diagnóstico ou interpretação médica diante de dor ou sintoma. Mas **não existe nenhum fluxo** que instrua a Ana sobre o que fazer quando um paciente escreve algo como "estou com dor no peito", "meu filho não para de vomitar", "estou sangrando muito".

Hoje, esse paciente cairia no vazio ou, pior, num fluxo de agendamento eletivo — enquanto pode estar vivendo uma emergência real.

**A correção (a implementar como seção nova, no TOPO do SOP, antes de qualquer outro fluxo):**

A Ana precisa detectar sinais de emergência médica e, ao detectá-los, **imediatamente**:
- NÃO diagnosticar, NÃO interpretar, NÃO tentar avaliar gravidade clínica.
- Orientar o paciente a procurar imediatamente o Pronto-Socorro presencial (Adulto, Pediátrico ou Ortopédico, todos 24h) OU ligar para o SAMU 192 / procurar a emergência mais próxima se não puder se deslocar até o hospital.
- Fornecer o endereço do hospital e deixar claro que o Pronto-Socorro funciona 24 horas.
- NÃO tentar agendar, NÃO seguir para fluxo comercial, NÃO coletar dados de lead.

**Sinais que devem disparar o fluxo de urgência (lista inicial, a refinar):** menções a dor no peito, falta de ar, sangramento intenso, desmaio, convulsão, sinais de AVC (boca torta, fraqueza súbita, fala enrolada), dor abdominal severa, febre muito alta em bebê, acidente/trauma, pensamentos de автoagressão, qualquer linguagem que comunique risco iminente à vida.

**Nota de implementação para o Pedro:** avaliar se a detecção de urgência deve ser um classificador dedicado no início do fluxo (antes do roteamento normal) para garantir prioridade absoluta. O risco de falso-negativo aqui (não detectar uma emergência real) é o risco mais grave de todo o sistema. Melhor pecar por excesso — na dúvida, orientar a buscar o PS.

---

### I.2 CRÍTICO — Regra Global 1 ausente

A lista de "Regras Globais (Inegociáveis)" do prompt atual **começa no item 2**. Não existe item 1.

Ou uma regra foi deletada em alguma edição, ou é erro de numeração. Precisa ser investigado. Hipótese: a Regra 1 original pode ter sido justamente a triagem de urgência (o que conectaria com o item I.1 acima). Confirmar o que havia ali e restaurar — ou renumerar se for só falha cosmética. Uma "lei inegociável" faltando num prompt que a Ana trata como norma absoluta é um sinal de alerta que não pode ficar sem resposta.

---

### I.3 CRÍTICO — Regra de exclusão entre modo comercial e modo ouvidoria

**O problema:** o modo comercial existe para avançar, gerar valor, converter. O modo ouvidoria existe para recuar, acolher, escutar sem querer nada em troca. São posturas emocionais opostas. Se um paciente entra para reclamar e, no meio do relato, menciona que também queria marcar uma consulta, a Ana — sem uma regra dura — pode escorregar para ancoragem de preço dentro de uma reclamação. Isso é desastroso para a reputação: transforma queixa em sensação de que o hospital só quer vender.

**A correção:** adicionar regra explícita — assim que uma conversa é classificada como ouvidoria (tag `ouvidoria` aplicada), o modo comercial **morre para aquela thread**. Nenhuma ancoragem de valor, nenhuma oferta de particular, nenhum aquecimento de lead, até o fluxo de ouvidoria se encerrar. Se o paciente quiser agendar algo depois, isso é tratado como novo fluxo, após o acolhimento da queixa estar completo.

Há também um componente de **independência percebida do canal**: no modo ouvidoria, a Ana deve se apresentar de forma que o paciente perceba que está num canal de ouvidoria ("agora vou registrar sua manifestação com todo o cuidado"), criando separação mental sem exigir entidade técnica separada. Isso protege a legitimidade do canal — uma ouvidoria que parece ser a mesma coisa que o vendedor não gera confiança.

---

### I.4 CRÍTICO — Guardrails jurídicos da ouvidoria

**O problema:** o registro de ouvidoria pode virar prova em ação judicial. O que a Ana escreve e registra numa reclamação é documento. O prompt atual não protege contra isso — e a mensagem de acolhimento atual chega a ser uma quase-admissão de culpa.

A mensagem atual diz: *"Lamento muito que sua experiência não tenha sido a que você merecia."* Isso pressupõe, antes de qualquer apuração, que o atendimento foi de fato ruim — uma admissão implícita.

**As correções:**
- A Ana **nunca admite culpa ou falha do hospital**. Acolhe o *sentimento* do paciente sem validar a *acusação* como fato. Reformular a mensagem de acolhimento para algo como: *"Sinto muito que você tenha passado por isso. Quero registrar seu relato com todo o cuidado para que seja apurado pelos setores responsáveis."* — acolhe a pessoa, não confirma a falha.
- A Ana **nunca promete providências específicas** ("vamos punir o funcionário", "isso será corrigido"). Ela registra e informa o prazo de retorno.
- A Ana **nunca dá parecer** sobre conduta clínica ou técnica ("realmente esse remédio estava errado").
- A Ana **nunca desencoraja o registro formal**. Isso protege a independência do canal e evita o conflito de incentivo (o hospital tem interesse em que a queixa não vire registro; a Ana não pode servir a esse interesse).

---

### I.5 Reforço do modo comercial — geração de valor

**O que o Felipe enfatizou:** a Ana precisa ser altamente capaz no envolvimento comercial — receber, identificar, tratar, aquecer, gerar percepção de valor, e transbordar o lead aquecido para o atendimento humano presencial no momento certo. Isso vale tanto para exame quanto para cirurgia (particulares, alta margem).

**O que o prompt atual já faz (manter):** a Seção 2 ancora valor e coleta dados antes de transbordar; a separação entre a tag `particular-aquecido` (aplicada ao informar o preço) e `agendamento-particular` (aplicada só após aceite + dados validados) é boa e deve ser preservada. A Seção 6.C trata estimativa de cirurgia com o caveat obrigatório de avaliação médica.

**O que reforçar:** hoje as mensagens comerciais são secas. O "gerar percepção de valor" pode ser fortalecido — destacar diferenciais do hospital de forma consultiva e acolhedora, não como venda agressiva. Em saúde, venda agressiva quebra a confiança. O tom certo é: acolher a necessidade, informar com clareza, mostrar valor genuíno (estrutura, corpo clínico, agilidade, conveniência), e conduzir com naturalidade ao agendamento.

**Limite importante (o que a Ana NÃO deve fazer):** a Ana não pode "chutar" preço de cirurgia ou procedimento para não perder o lead. Preço de procedimento varia e depende de avaliação. Quando ela não tem o valor com certeza, deve dizer que vai conectar com um especialista para o orçamento exato — nunca inventar. Uma IA que dá valor errado de cirurgia cria passivo. Definir com clareza no prompt o limite entre "o que a Ana informa com certeza" (via ferramenta) e "o que ela transborda para humano".

**Sobre a captura noturna (o prêmio estratégico):** 25–50% dos contatos de particular chegam fora do horário CLT (noite, madrugada, fim de semana), quando o concorrente não atende. A Ana operando 24/7 captura o lead que hoje se perde. Este é o maior valor do modo comercial — não é redução de custo, é receita de margem cheia que hoje vaza para quem responde primeiro. O transbordo noturno deve acolher e agendar o retorno humano para o próximo expediente, com o lead já etiquetado e priorizado (o prompt atual já faz isso via MENSAGEM_FDS — manter e reforçar).

---

### I.6 Transparência sobre ser uma IA

**O problema:** a Regra Global 6 instrui a Ana a "nunca revelar que é uma IA", e a resposta padrão para "você é um robô?" desconversa. Em saúde, isso é eticamente arriscado e possivelmente frágil juridicamente — especialmente na ouvidoria, onde a pessoa tem direito de saber com quem fala. Uma IA que nega ser IA, quando exposta, vira problema de reputação.

**A recomendação (para o Felipe decidir, com o Pedro avaliando o impacto):** permitir que a Ana se apresente como assistente virtual com naturalidade, sem que isso quebre a experiência. Uma IA que se identifica e mesmo assim resolve em segundos, à meia-noite, supera um humano ausente. A transparência aqui é provavelmente vantagem, não fraqueza. Rever a Regra 6 e a resposta padrão.

**Nota:** há também a política da Meta de 2026 sobre agentes de IA no WhatsApp — bots de propósito geral são banidos, mas os de propósito específico (como a Ana, focada em saúde/atendimento) são permitidos. A Ana está do lado certo, mas vale o Pedro confirmar conformidade com os termos vigentes.

---

### I.7 Ajustes menores identificados no prompt atual

Estes não são críticos, mas devem entrar na próxima revisão:

- **Inconsistência de acentuação:** vários blocos de mensagem ao paciente estão sem acento (a mensagem de cobertura de convênio na Seção 3.2, o registro de ouvidoria na 7.3 — "Obrigada por confiar isso a nos"). Padronizar com acentuação correta.
- **Placeholder de protocolo:** a mensagem de ouvidoria exibe `[protocolo]`, mas a ferramenta `Registrar_reclamacao` gera `HSM-AAAA-XXXX`. Confirmar que o n8n injeta o número real antes do envio, senão o paciente recebe a string literal.
- **Tag `fora-horario` órfã:** está listada na ferramenta `Aplicar_tag` mas nenhum fluxo a aciona explicitamente (a Seção 10 não chama `Aplicar_tag`). Conectar ou remover.
- **Etapa `EM ATENDIMENTO — ANA` órfã:** existe na ferramenta `Atualizar_lead` mas nenhum fluxo move o lead para ela. Provavelmente deveria ser acionada logo após a identificação do motivo (Seção 1.1).
- **Rastreabilidade em prontuário (Seção 8.4):** quando o paciente retorna perguntando status, a Ana orienta e-mail mas não aplica tag nem registra — uma segunda dúvida sobre prontuário some do CRM. Pequeno vazamento de rastreabilidade.

---

### I.8 O que a Ana faz e o que integra (escopo reativo consolidado)

Para o Pedro ter o mapa completo do que a Ana reativa cobre:

**Atendimento e agendamento (via API Global Health/MV):**
- Identifica/cadastra o paciente (`GET/POST /pessoas` por CPF ou telefone).
- Busca consulta ou exame por linguagem natural (`/consultas`, `/exames`).
- Resolve convênio, plano, carteira (`/convenios`, `/planos`, `/carteiras`).
- Lista horários reais (`/agendas/v2`).
- Grava o agendamento (`POST /horarios/agendar`), reagenda (`/horarios/reagendar`), lista e cancela (`/agendamentos`, `DELETE /agendamentos/{id}`).
- Orientações básicas: horários, localização, formas de pagamento, preparo de exame, acesso a resultado (nunca envio).

**Pontos de transbordo já desenhados pela própria API (viram regra no prompt):**
- Item com `bloqueado: true` + `mensagemBloqueio` → transbordo automático (ex.: "agendamento apenas por telefone").
- Pergunta de triagem de exame com `impedeRealizacao: "S"` (ex.: gravidez, marca-passo) → a Ana para o agendamento e exibe a mensagem. **Atenção clínica:** erro de interpretação aqui (entender "não" como "sim") tem consequência clínica — configurar confirmação explícita nessas perguntas.
- Anexo obrigatório (`/anexos/agendamento`) → por WhatsApp o paciente consegue subir foto/PDF nativamente (diferente de voz); manter no fluxo.

**Movimentação no funil (Chatwoot):** a Ana move o lead pelas etapas via `Atualizar_lead`, aplica tags via `Aplicar_tag` (sempre uma por vez), e escala via `Escalar_humano` após mover para qualquer fila humana.

---

## PARTE II — Agente de Pós-Atendimento (novo, dedicado)

### II.0 Por que é um agente separado, não um modo da Ana

Esta é a decisão de arquitetura mais importante da Parte II, e o Felipe quer que você a avalie criticamente.

A Ana é **reativa e conversacional**: espera o paciente chegar, conduz um diálogo, resolve um caso por vez, vive no presente de uma conversa. O pós-atendimento é **proativo e analítico**: ele *inicia* o contato em massa (dezenas de milhares/mês), coleta respostas estruturadas, e seu produto final não é uma conversa — é um **relatório agregado por setor, profissional e período**.

São naturezas opostas. A Ana não "sabe" o que aconteceu nas outras 15 mil conversas; o relatório *é* as 15 mil conversas somadas. Três razões tornam a separação obrigatória, não estética:

1. **Disparo em massa** depende de templates Meta pré-aprovados, controle de volume diário (250–1.000/dia no início, escalando com histórico de qualidade), opt-out, e filtro de desfecho — lógica de campanha e segmentação, não de conversa.
2. **Review gating** (mandar NPS alto ao Google e conter o baixo) é padrão punido pelo Google — o desenho do convite precisa de cuidado que não é da Ana reativa.
3. **Geração de relatório** sai de uma camada de dados (classificar cada resposta, taguear por setor/profissional, armazenar, agregar), não de um prompt conversacional.

O consenso de engenharia (mesmo princípio da Parte I) confirma: aqui, diferente do comercial, a tarefa é genuinamente batch + analítica, então o agente/fluxo dedicado se justifica. A Ana e o pós-atendimento se conectam em **um único ponto**: quando um paciente responde ao disparo e quer, por exemplo, agendar um retorno, cai na Ana.

---

### II.1 O reframe central: dois mecanismos, não uma pesquisa

O Felipe priorizou os objetivos assim: (1) capturar crítica/elogio detalhado para gestão, (2) subir a nota do Google, (3) medir satisfação, (4) reativar paciente. Essa priorização revela uma tensão que precisa ser resolvida no desenho, porque **os objetivos #1 e #2 puxam em direções opostas**:

- Capturar crítica honesta (#1) exige ouvir a verdade, inclusive a ruim — quanto mais crítica detalhada, melhor para corrigir.
- Subir a nota do Google (#2), se feito filtrando só os satisfeitos para avaliar publicamente, é **review gating** — explicitamente proibido pela política do Google (risco de remoção das avaliações ou penalização do perfil) e eticamente frágil.

**A solução: separar em dois mecanismos distintos que se reforçam.**

**Mecanismo A — Escuta interna (o objetivo #1, o valor durável):**
- Vai para *todos* os pacientes no escopo liberado.
- Captura a experiência real, boa e ruim, em detalhe.
- Classifica cada resposta em categorias estáveis (por setor, profissional, tema).
- Alimenta o relatório de gestão. Aqui NÃO há filtro — quanto mais crítica, mais valor.
- É interno, respeita LGPD (dado fica em casa para melhoria de serviço).

**Mecanismo B — Motor de reputação (o objetivo #2, feito de forma legítima):**
- O convite ao Google é feito de forma ampla e legítima, sem filtrar por sentimento.
- A nota sobe por dois caminhos honestos: (a) volume e recência de avaliações (o algoritmo do Google premia isso, e o volume de 25–35 mil/mês dá escala de sobra — mesmo 15% avaliando enterra a concorrência), e (b) o Mecanismo A tornando o hospital genuinamente melhor.
- Reputação construída em verdade não desmorona quando o Google muda o algoritmo.

**A regra que evita o gating:** convide amplamente ao Google, OU não convide e construa nota por volume orgânico — mas **não filtre por nota**. Se quiser aumentar probabilidade de nota boa, o caminho é melhorar o atendimento, não selecionar quem opina.

> **Ponto para o Pedro avaliar:** há um espaço cinzento aqui. É defensável convidar ao Google no fim de uma conversa que correu bem (o paciente satisfeito é naturalmente mais propenso), desde que o convite não seja *condicionado* à nota e o insatisfeito também tenha um caminho de voz. A linha entre "convite contextual" e "gating" é sutil e vale o Felipe decidir com clareza qual postura adotar. O conservador (e mais seguro) é convite amplo sem condicionamento.

---

### II.2 CRÍTICO — Escopo de público: comece só pelo eletivo

**O risco mais grave de todo o pós-atendimento:** o Felipe listou disparar para todos os setores, incluindo emergência adulto (~5 mil/mês), emergência pediátrica (~4 mil/mês), emergência ortopédica (~1 mil/mês) e obstetrícia (~300/mês).

Entre esses milhares, todo mês, há desfechos trágicos: crianças que foram à emergência e não voltaram para casa, gestações que terminaram em perda. Um disparo automático e alegre — "Oi! Como foi seu atendimento? 😊" — para uma família em luto não é risco de reputação, é uma crueldade operacional que vira manchete e processo. E com uma fonte de dados que seja só "nome e telefone", **não há como saber o desfecho**.

**A decisão (fechada): começar SÓ pelo eletivo.**
- Fase inicial: exame e cirurgia eletiva (~500/mês) e ambulatório (~10–15 mil/mês). Desfecho previsível e benigno, tom seguro.
- Emergência e obstetrícia ficam **fora** até existir um **filtro de desfecho** confiável, vindo do MV, que impeça o disparo em casos de óbito ou desfecho adverso.

**Nota de implementação:** o tom da mensagem também precisa ser diferente por tipo de serviço. "Avalie sua experiência" funciona para exame eletivo, mas é ofensivo para quem viveu uma emergência. Mesmo quando a emergência entrar (com filtro), a linguagem precisa ser radicalmente mais cuidadosa.

---

### II.3 CRÍTICO — A fonte de dados é pré-condição de tudo

O Felipe mencionou usar "MV/Global Health ou até listagens de nomes e telefones". A listagem solta é a opção perigosa e deve ser evitada:

- Sem vínculo ao registro do MV, você não sabe o **serviço** nem o **desfecho** — não consegue segmentar tom nem evitar o disparo para o luto.
- Número que trocou de dono = dado de saúde ("você fez cirurgia aqui") vazado para um estranho. Isso é violação de sigilo médico e LGPD.

**A decisão:** a fonte precisa vir do MV, trazendo no mínimo: identificação do paciente, serviço realizado, data, setor/profissional quando aplicável, e — crítico para emergência/obstetrícia — o **desfecho**. Sem isso, o disparo não é seguro. Travar essa fonte é a primeira tarefa técnica do pós-atendimento.

**Consentimento de origem (LGPD):** confirmar se o termo de atendimento que o paciente assina autoriza contato proativo para pesquisa de satisfação. Se não autorizar, a base legal do disparo é frágil e precisa ser resolvida (ajuste no termo, ou outra base legal).

---

### II.4 A economia do disparo (regras da Meta, 2026)

Entender isto é o que define se o projeto custa ~R$ 1.900/mês ou ~R$ 12.000/mês — fator de ~6x.

**O fato-chave:** o custo está apenas no *primeiro toque* (o template que abre a conversa). Desde nov/2024, conversas iniciadas pelo cliente e respostas dentro da janela de 24h são gratuitas. Templates de utilidade dentro de uma janela já aberta também são gratuitos. Ou seja: **assim que o paciente responde ao disparo, toda a conversa de avaliação que se segue — por mais longa e rica que seja — é gratuita por 24h.** Você paga centavos só para iniciar.

**A armadilha da classificação:** o Felipe quer disparar "utilidade pré-aprovada a baixo custo". Mas a Meta classifica como utilidade apenas mensagens transacionais que seguem uma ação do usuário. Uma pesquisa de satisfação proativa tem alta chance de ser reclassificada como **marketing** — e a Meta reclassifica templates unilateralmente, mesmo depois de aprovados. A tarifa de marketing no Brasil (~US$ 0,0625) é ~6x a de utilidade (~US$ 0,01).

**Estimativa de custo (volume somado ~25–35 mil/mês, um template de abertura por paciente):**
- Se classificar como utilidade: ~US$ 250–350/mês (~R$ 1.400–1.900).
- Se cair em marketing: ~US$ 1.500–2.200/mês (~R$ 8.000–12.000).

**Implicação de desenho:** redigir o template de abertura como utilidade pura — sem emoji comercial, sem oferta, o mais transacional e respeitoso possível (ex.: "Olá [nome], aqui é do Hospital São Matheus. Podemos saber como foi seu atendimento de [data]?"). Testar a classificação com poucos envios antes de escalar. E ter um **plano B de custo** caso a Meta reclassifique — a viabilidade não pode depender de uma classificação que não controlamos.

---

### II.5 Fluxo funcional do agente de pós-atendimento

O desenho lógico, ponta a ponta, para você avaliar e implementar:

**1. Origem dos dados (batch, diário ou semanal):**
- Puxa do MV a lista de pacientes atendidos no período, no escopo liberado (eletivo primeiro), com serviço, data, setor/profissional e desfecho.
- Aplica o filtro de desfecho (exclui óbito/adverso quando a fonte permitir; enquanto não permitir, emergência/obstetrícia ficam fora).
- Aplica opt-out (quem já pediu para não receber, não recebe).
- Respeita o limite diário da Meta (começa em 250–1.000/dia, escala com histórico de qualidade).

**2. Disparo (template de abertura):**
- Template de utilidade, redigido de forma transacional e respeitosa, personalizado por nome e data/serviço.
- Ritmo de disparo gerido para não estourar limite nem gerar onda de bloqueios (que derrubaria a qualidade do número e contaminaria o canal de atendimento da Ana — ver risco de fadiga de canal).

**3. Conversa de coleta (na janela grátis, quando o paciente responde):**
- Pergunta de satisfação (NPS ou equivalente) de forma conversacional e leve.
- Pergunta aberta para capturar o detalhe ("o que poderia ter sido melhor?", "o que mais marcou seu atendimento?").
- Classifica internamente a resposta por sentimento e por tema/setor/profissional.
- Inclui opt-out fácil em toda mensagem proativa.

**4. Ramificação por sentimento:**
- **Experiência muito positiva (ex.: NPS 9–10):** convida ao Google de forma legítima (ver II.1 sobre não fazer gating), com o link de avaliação.
- **Experiência neutra ou negativa:** acolhe, captura o detalhe para gestão, e — importante — **fecha o loop**: garante que a crítica não evapora. Reclamação capturada e sem retorno é pior que não perguntar (frustra duas vezes). Definir se casos negativos graves são roteados para a ouvidoria/humano (provável que sim).

**5. Agregação e relatório (a camada analítica — o produto final):**
- Cada resposta vira dado estruturado: sentimento, setor, profissional, tema, data, serviço.
- Consolidação em relatórios semanais e mensais, por setor, por profissional/médico, por tema, com evolução no tempo (análise evolutiva).
- Os relatórios vão para os coordenadores e para a direção.

---

### II.6 CRÍTICO — O relatório só vale com método estável, dono e ação

Três pontos que determinam se o relatório vira decisão de gestão ou vira PDF morto:

1. **Categorias co-desenhadas com quem age.** As categorias de classificação (setor, tema, tipo de elogio/crítica) precisam ser desenhadas *com* os coordenadores que vão agir sobre elas — não impostas pela TI. Categoria genérica gera relatório inútil. A pergunta certa: "quais são os 8–12 motivos pelos quais as pessoas mais elogiam ou reclamam, e quais desses, se subissem num painel, me fariam agir?".
2. **Estabilidade para análise evolutiva.** A "análise evolutiva" que o Felipe pediu só existe se as categorias e a metodologia ficarem estáveis no tempo. Mudar a pergunta ou a taxonomia a cada mês destrói a comparabilidade. Definir o método uma vez, com os coordenadores, e segurar.
3. **Dono e ritual.** Cada relatório precisa de revisão agendada (Gisele + coordenadores, ritmo semanal) e de uma regra: cada categoria acima de um limiar vira uma ação com responsável. Sem isso, o paciente que reclamou percebe que reclamar não muda nada e para de responder.

**Nota de qualidade:** se o relatório vai virar decisão de diretoria (inclusive avaliação de profissionais e médicos), a **precisão da classificação da IA precisa ser auditada por amostragem**. Classificar errado o setor ou o profissional numa crítica gera decisão de gestão sobre dado errado — e, no caso de avaliação de profissionais nominais, é um risco sério (trabalhista e de justiça interna). A classificação por profissional/médico deve ser tratada com cuidado redobrado.

---

### II.7 Riscos específicos do pós-atendimento (consolidado)

| Risco | Mitigação |
|---|---|
| Disparo para luto (emergência/obstetrícia) | Filtro de desfecho via MV; começar só pelo eletivo |
| Review gating no Google | Convite amplo sem filtrar por nota; nota por volume e melhoria real |
| Fonte "lista solta" (sigilo/LGPD) | Fonte vem do MV com serviço e desfecho; sem lista avulsa |
| Custo 6x (reclassificação Meta) | Template de utilidade pura; testar antes de escalar; plano B de custo |
| Fadiga / banimento do número | Opt-out fácil; ritmo de disparo gerido; limite Meta respeitado |
| Onda de avaliação negativa no Google | Começar pelo eletivo satisfeito; não empurrar insatisfeito ao Google |
| Relatório que ninguém usa | Categorias co-desenhadas; dono; ritual semanal; ação com responsável |
| Classificação errada por profissional | Auditoria amostral; cuidado redobrado na atribuição nominal |
| Consentimento de origem (LGPD) | Confirmar autorização no termo de atendimento |
| Loop aberto com quem criticou | Retorno humano garantido para casos negativos; não deixar evaporar |

---

## PARTE III — Decisões fechadas e questões para o Pedro

### III.1 Decisões de arquitetura já fechadas

- Ana = agente único com três modos (atendimento, comercial, ouvidoria). **Não** subagentes.
- Regra de exclusão: modo ouvidoria desliga o comercial na thread.
- Pós-atendimento = agente/fluxo dedicado, separado da Ana, proativo e analítico.
- Pós-atendimento = dois mecanismos (escuta interna + motor de reputação). **Sem** review gating.
- Disparo proativo começa só pelo eletivo; emergência/obstetrícia só com filtro de desfecho.
- WhatsApp é a prioridade da Fase 1; voz é Fase 2.
- CRM em Chatwoot (migrando de Kommo); pipeline, tags, papéis e SLA já desenhados (ver documento-mestre do programa).

### III.2 Questões técnicas que dependem de você (Pedro)

1. **Detecção de urgência:** classificador dedicado no início do fluxo, com prioridade absoluta? Qual a melhor forma de garantir falso-negativo próximo de zero?
2. **Regra Global 1:** o que havia ali? Foi deletada? Restaurar ou renumerar?
3. **API Global Health — produção:** token de produção liberado? Qual o limite de chamadas simultâneas que a API suporta (importante para o pico e para o disparo em massa)?
4. **Fonte de dados do pós-atendimento:** o MV consegue exportar a lista de atendidos com serviço, data, setor/profissional e **desfecho**? Se não exporta desfecho hoje, o que é preciso para exportar?
5. **Classificação do template Meta:** conseguimos manter o template de abertura como utilidade? Testar com amostra e medir a classificação real.
6. **Camada de relatório:** qual arquitetura para armazenar as respostas classificadas e gerar os relatórios evolutivos (banco + agregação + possível chamada de IA para sumarização)?
7. **Conexão Ana ↔ pós-atendimento:** como o paciente que responde ao disparo e quer agendar cai na Ana sem fricção?
8. **Manutenção recorrente:** o custo de manter a Ana e o pós-atendimento (quando a Global Health muda a API, quando entra convênio novo, quando a Meta muda regra) precisa ser dimensionado — a economia de folha não é total, há uma carga recorrente de engenharia.

### III.3 O que fazer primeiro (sequência recomendada)

1. **Ana — Bloco crítico:** implementar o fluxo de urgência (I.1), investigar a Regra 1 (I.2), a regra de exclusão comercial↔ouvidoria (I.3) e os guardrails jurídicos da ouvidoria (I.4). Isso é pré-condição de produção.
2. **Ana — validação em sombra:** rodar a Ana respondendo com revisão humana antes do envio, por período curto, para calibrar tom (especialmente o comercial e o de urgência) com casos reais.
3. **Pós-atendimento — pré-condição:** travar a fonte de dados no MV (com desfecho) e definir o escopo eletivo. Sem isso, o disparo não começa.
4. **Pós-atendimento — POC:** um fluxo só (exame/cirurgia eletiva), template de utilidade testado, medindo taxa de resposta, taxa de conclusão da pesquisa, distribuição de NPS e custo real por resposta. Expandir com filtro de desfecho depois.

---

*Documento de trabalho para avaliação de cenários e implementação. Reflete o brainstorm consolidado de junho/2026. As decisões de arquitetura estão fechadas; as questões da seção III.2 dependem de avaliação técnica do Pedro.*
