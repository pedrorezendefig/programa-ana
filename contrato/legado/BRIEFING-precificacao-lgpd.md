# Briefing — Precificação e LGPD para o Contrato VITTA TECH

> Documento de apoio à decisão (não é parecer jurídico). Acompanha o `CONTRATO.md`.
> A seção **Fontes e casos** (final) é complementada pela pesquisa verificada em anexo.

---

## PARTE 1 — PRECIFICAÇÃO

### 1.1. Modelos de cobrança — comparação rápida

| Modelo | Como funciona | Quando usar | Risco principal |
|---|---|---|---|
| **Mensalidade / Retainer** *(o seu)* | Valor fixo mensal por entrega contínua + sustentação | Relação contínua, evolução constante, suporte | Escopo "infinito" (scope creep) se não delimitado |
| **Valor fechado por projeto** | Preço por entregável definido | Escopo claro e estável, ponto fora da curva | Aditivos e atrito quando o escopo muda |
| **Time & Material (h/homem)** | Cobra horas trabalhadas | Escopo incerto, descoberta | Cliente sente "torneira aberta", difícil prever |
| **Por usuário (per-seat)** | Preço × nº de usuários | Produto/SaaS com base que cresce | Receita travada se nº de usuários não cresce |
| **Value/Outcome-based (KPI)** | Preço atrelado a resultado de negócio | Quando o valor é mensurável (ex.: agendamentos) | Medição e atribuição do resultado |

### 1.2. Recomendação para o seu caso

**O modelo que você escolheu — mensalidade recorrente escalonada por marcos — é o mais
adequado**, porque:

- alinha pagamento a **entregas reais** (cada solução que entra no ar sobe o patamar);
- dá **previsibilidade** de caixa para você e para o cliente;
- embute a **sustentação** (suporte + manutenção evolutiva), que é receita recorrente e o
  ativo mais valioso de uma software house iniciante;
- permite **crescer o ticket** sem renegociar tudo (basta um Termo de Aceite por marco).

**Três cuidados que blindam esse modelo (já refletidos no contrato):**

1. **Delimitar o "incluído" vs. "extra".** A maior armadilha do retainer é o escopo
   infinito. O **Anexo III** trata a cadência de melhorias como **obrigação de meio**
   (~1 funcionalidade/semana, priorizada em backlog) e o **Anexo I.5** lista exclusões.
   *Defina o que é "uma funcionalidade"* (tamanho médio) já no kickoff para evitar atrito.
2. **Reajuste anual** por índice (IPCA sugerido) — protege a margem da inflação ao longo
   dos meses (Cláusula 7.4 / Anexo II).
3. **Custos de terceiros por fora** (APIs de IA, WhatsApp/Meta, MV, nuvem). Esses custos
   variam com o volume de pacientes — se entrarem na sua mensalidade fixa, **um pico de
   uso come sua margem**. Recomendação: contas em nome do cliente (padrão do Anexo I.5).

### 1.3. Referência de mercado para sustentação/manutenção

- Heurística comum no mercado de software: **manutenção evolutiva anual ≈ 15%–25% do
  custo de construção** do sistema. Como aqui o app já está entregue e em produção, a
  mensalidade de sustentação remunera **suporte + evolução + disponibilidade**, e não a
  construção (que foi "investimento" inicial seu).
- Para **agentes de IA / chatbots de atendimento**, o mercado tem migrado para **modelos
  híbridos**: mensalidade base (plataforma + sustentação) **+** componente variável por
  resultado/volume. É exatamente o desenho do seu **Patamar 4** (KPI da Ana). A pesquisa
  confirmou que o **usage-based pricing** é tendência crescente em SaaS/IA (fonte
  secundária — ver Fontes). O **retainer com reajuste anual** segue sendo a base.

> ⚠️ **Transparência:** as faixas de preço de mercado e o "% de manutenção sobre o custo
> do projeto" **não foram confirmados por fonte primária** nesta pesquisa (eixo fraco). Os
> percentuais acima são **heurísticas de mercado**, úteis para calibrar, não números de lei.

### 1.4. O Patamar 4 (KPI da Ana) — como definir o gatilho

Você pediu sugestões de KPI para o +R$ 1.000. Princípio: escolher **1 ou 2 indicadores
objetivos, auditáveis e sob influência da Ana** (evite métricas que dependem de fatores
fora do seu controle). Opções, da mais recomendada para a menos:

| KPI sugerido | Por que é bom | Cuidado |
|---|---|---|
| **% de agendamentos concluídos sem intervenção humana** (taxa de automação) ≥ meta, por 30 dias | Mede diretamente o valor da Ana (reduz trabalho humano) | Definir o denominador (o que conta como "agendamento iniciado") |
| **Estabilidade**: 3 meses consecutivos em produção dentro do SLA | Simples, objetivo, recompensa entrega + sustentação | Não mede "valor", e sim maturidade |
| **Volume mensal** de conversas/pacientes atendidos ≥ X | Fácil de medir no Chatwoot/n8n | Volume não é qualidade; pode subir sem valor |
| **Redução de no-show** atribuível a lembrete/confirmação | Métrica de negócio que o gestor adora | **Atribuição** difícil (muitos fatores influenciam) |
| **CSAT/NPS** do atendimento automatizado ≥ meta | Mede satisfação | Exige instrumentar pesquisa; amostragem |

**Recomendação prática:** combine **taxa de automação (≥ ~70%)** **+** **janela de
estabilidade (3 meses no SLA)** como gatilho duplo. São métricas que (a) você influencia,
(b) o cliente consegue auditar nos painéis, e (c) representam valor real. Deixe **a fórmula
de medição, a fonte do dado e o período de apuração escritos no Termo de Aceite (Anexo V)**
— é onde a maioria dos contratos de outcome falha.

### 1.5. Sobre a cadência "1 funcionalidade por semana"

- Mantenha como **meta de esforço (obrigação de meio)**, nunca como garantia rígida — uma
  feature grande pode levar semanas, e prometer "4 features/mês fixas" vira passivo.
- Adote um **backlog priorizado em conjunto** (você já tem cultura de issues/PRs no app).
- Demandas grandes → tratar como **escopo adicional** (orçamento à parte), preservando a
  mensalidade para evolução incremental.

---

## PARTE 2 — LGPD, WHATSAPP E DADOS DE SAÚDE

> Contexto de risco: a Ana trata **dados sensíveis de saúde** (art. 11 da LGPD) de
> pacientes, por **WhatsApp**, com integração ao MV. É a área mais sensível do contrato.
> O **Anexo IV** do contrato é o instrumento; aqui vão as **boas práticas** ("o que dá
> certo / o que dá errado").

### 2.1. Papéis — quem é o quê (e por que importa)

- **Cliente (hospital/clínica) = CONTROLADOR.** Decide finalidades, é o responsável
  primário perante o paciente e a ANPD, e é quem **deve ter a base legal**.
- **VITTA TECH = OPERADOR.** Trata os dados **sob instrução** do controlador. Isso
  **limita sua responsabilidade** — desde que você (i) siga instruções documentadas,
  (ii) tenha o DPA (Anexo IV), e (iii) adote segurança adequada. **Sem DPA, o operador
  pode ser responsabilizado solidariamente.** Por isso o Anexo IV é inegociável.

### 2.2. Base legal — o ponto mais incompreendido

Dados de saúde **não** dependem necessariamente de consentimento. A LGPD (art. 11)
permite o tratamento de dado sensível de saúde para **"tutela da saúde, em procedimento
realizado por profissionais/serviços de saúde"**. Logo:

- **Agendar/remarcar/cancelar consulta e exame** pode se apoiar na **tutela da saúde** (e
  na execução de contrato com o paciente) — não exige consentimento para a finalidade
  assistencial em si.
- **MAS o canal WhatsApp** (enviar mensagem ativa ao paciente, lembretes, comunicação) é
  onde entra o **consentimento/opt-in** — porque é comunicação e uso de um canal de
  terceiro. **Separe as duas coisas no Anexo IV** (já está separado).

> ✅ **Faça:** distinga "base legal da finalidade assistencial (tutela da saúde)" da
> "autorização para falar com o paciente pelo WhatsApp (opt-in)".

### 2.3. WhatsApp — o que dá certo / o que dá errado

**✅ O que dá certo (boas práticas):**
- **Opt-in demonstrável** e idealmente **double opt-in** (paciente confirma que quer
  receber no WhatsApp), com **finalidade clara** e instruções de **opt-out** ("responda
  SAIR").
- **Guardar a prova do consentimento** (data, hora, texto aceito) — o ônus é do
  controlador, mas a Ana pode **registrar** isso para ajudar.
- **Minimização**: pedir só o necessário em cada passo (CPF para identificar, etc.).
- Usar **WhatsApp Business API oficial** (via Chatwoot/provedor), com **templates
  aprovados** e respeito à **janela de 24h** de atendimento da Meta.
- **Mascarar/limitar** dados sensíveis no corpo das mensagens.

**❌ O que dá errado (evite):**
- **Enviar resultado de exame / laudo / diagnóstico pelo WhatsApp.** É o erro clássico.
  A Ana **já faz certo** ao orientar o paciente a buscar canal seguro — **mantenha isso**.
- **Marketing sem opt-in** (disparo em massa) — gera bloqueio pela Meta e risco LGPD.
- Tratar dado sensível **sem DPA** com os subprocessadores (OpenAI, Chatwoot, MV, etc.).
- **Reter conversas indefinidamente** sem política de descarte.
- Usar números pessoais/não oficiais — risco de banimento e de vazamento.

> ⚠️ A **Política de Negócios/Comércio do WhatsApp (Meta)** impõe restrições a setores
> regulados e veda certos conteúdos. Saúde **é permitida**, mas exige cuidado redobrado com
> dados sensíveis e solicitações não solicitadas. **As regras específicas da Meta para
> saúde não foram confirmadas por fonte primária nesta pesquisa** — as orientações desta
> seção apoiam-se em **fontes secundárias/práticas** (ver Fontes) e nas boas práticas de
> LGPD; valide a política vigente da Meta antes do go-live.

### 2.4. Subprocessadores e transferência internacional

- A Ana usa serviços que podem **processar dados fora do Brasil** (provedor de IA, nuvem).
  Isso é **transferência internacional** (LGPD, arts. 33–36) e exige salvaguarda. ✅
  **Verificado:** a ANPD aprovou as **Cláusulas-Padrão Contratuais (CPC) pela Resolução
  CD/ANPD nº 19/2024**, de uso **obrigatório desde 23/08/2025** (fim do período de
  adequação). Usar nuvem/e-mail/IA com servidores no exterior **é** transferência
  internacional e atrai esse regime.
- ✅ **Faça:** liste os subprocessadores no Anexo IV (já listados), use os termos de DPA de
  cada um (OpenAI/Anthropic, Meta, etc.) e **minimize** o que vai para a IA.
- ⚠️ **Atenção a "treinar modelo":** garanta contratualmente que o provedor de IA **não usa
  os dados para treinar** modelos (já vedado no Anexo IV.4.f para a VITTA, e os provedores
  oferecem opção de opt-out de treino — ative).

### 2.5. Incidentes de segurança

- A LGPD exige comunicar incidentes que possam gerar risco/dano aos titulares à **ANPD** e
  aos **titulares**. ✅ **Verificado:** o **Regulamento de Comunicação de Incidente de
  Segurança (Resolução CD/ANPD nº 15/2024)** fixa **3 (três) dias úteis** para o
  **controlador** comunicar à ANPD, contados da ciência — **prazo em dobro (6 dias úteis)
  para agentes de tratamento de pequeno porte** (sua software house no Simples pode se
  enquadrar). A obrigação legal de comunicar à ANPD é **do controlador** (cliente).
- ✅ **Faça (operador):** notificar o **controlador** rápido (o Anexo IV fixa 24–48h da
  ciência). A comunicação à ANPD/titulares é do **controlador** (cliente), com seu apoio.
- Tenha um **plano de resposta a incidentes** mínimo (quem aciona quem, em quanto tempo).

### 2.6. Normas setoriais de saúde (CFM)

> ⚠️ **Não verificado nesta pesquisa.** As resoluções específicas do CFM **não foram
> confirmadas por fonte primária** nesta rodada — trate os pontos abaixo como **alerta para
> validar com o jurídico**, não como números fechados.

- **Guarda de prontuário**: as normas do CFM preveem **retenção mínima de longo prazo** do
  prontuário do paciente — isso baliza a política de **retenção** do Anexo IV.7. Confirmar
  o prazo vigente (há referência histórica a guarda de longa duração) com o(a) advogado(a).
- **Telemedicina/atendimento digital**: o CFM regula atendimento remoto — relevante caso a
  Ana evolua de agendamento para **triagem clínica**. Confirmar a resolução aplicável.
- Como **operador**, você segue a instrução do controlador quanto a prazos de guarda; mas
  **alinhe isso no kickoff** para não reter de menos nem de mais.

### 2.7. Checklist LGPD de 1 página (para anexar ao kickoff)

- [ ] DPA assinado (Anexo IV) com o cliente (controlador)
- [ ] Base legal da finalidade assistencial definida pelo cliente (tutela da saúde)
- [ ] Fluxo de **opt-in** no WhatsApp implementado e **registrado** (prova)
- [ ] Fluxo de **opt-out** funcionando ("responda SAIR")
- [ ] **Nunca** enviar resultado de exame/laudo por WhatsApp (mantido)
- [ ] Subprocessadores listados + **opt-out de treino de IA** ativado
- [ ] TLS/HTTPS em todas as integrações; controle de acesso e logs
- [ ] Política de **retenção e descarte** definida com o cliente
- [ ] Plano de **resposta a incidentes** (notificar controlador em 24–48h)
- [ ] Encarregados (DPO) das duas partes nomeados no Anexo IV

---

---

## PARTE 3 — CLÁUSULAS CONTRATUAIS DE TECNOLOGIA (pontos jurídicos verificados)

### 3.1. 🔑 Propriedade intelectual — o achado mais importante

✅ **Verificado (Lei nº 9.609/1998, art. 4):** quando o software é desenvolvido **sob
encomenda / por contrato de prestação de serviços cujo objeto seja o desenvolvimento**, os
direitos pertencem ao **CONTRATANTE (o cliente)**, **salvo estipulação em contrário**.

**Consequência prática para você:** se você **não escrever nada** sobre PI, o software da
Ana e do App seria, por padrão legal, **do cliente**. Por isso a **Cláusula 10 do contrato
é decisiva** e oferece as duas opções explícitas:
- **10.1 (A) Licença de uso** → você precisa **dizer expressamente** que retém a
  titularidade e apenas licencia (é o que protege uma software house que quer reusar
  componentes e manter o ativo). **Recomendado para você.**
- **10.1 (B) Cessão** → transfere ao cliente (mais caro/definitivo; use se o cliente exigir
  e o preço compensar).

> Sem cláusula expressa, a lei entrega o software ao cliente. **Escolha A ou B no contrato.**

### 3.2. Outros pontos verificados (Lei 9.609/98)

- **Licença de uso (art. 9):** o uso de software no país se dá por **contrato de licença**;
  na sua falta, o documento fiscal serve de prova — ou seja, formalizar a licença é o certo.
- **Garantia técnica (arts. 7–8):** o fornecedor deve assegurar a **validade técnica** pelo
  prazo de validade; combina com a sua Cláusula 13 (garantia de 90 dias + correção contínua
  na sustentação).
- **Código-fonte / escrow (art. 11):** há previsão de **depósito** (inclusive no INPI) e é
  comum cláusula de **escrow de código-fonte** liberável em hipóteses (ex.: encerramento da
  CONTRATADA). Avalie se o cliente vai exigir — hoje seu contrato prevê *exit plan* (10.3).

### 3.3. Limitação de responsabilidade, SLA e multas (boas práticas)

- **Limitação de responsabilidade** é **válida** entre empresas (B2B), desde que **não
  exclua dolo/culpa grave** — exatamente como está na Cláusula 14 (teto de 3 meses, com
  exceções para dolo, culpa grave, sigilo e dados).
- **Multas em contratos de TI:** devem ser **proporcionais**; multas excessivas podem ser
  reduzidas pelo Judiciário (art. 413 do Código Civil). Mantivemos patamares moderados
  (mora 2% + juros 1% a.m.; penalidade de ~1 mês).
- **SLA por severidade** com tempos-alvo (Anexo III) é prática consolidada; trate como
  **obrigação de meio**, não de resultado absoluto.

---

## Fontes e casos *(verificadas pela pesquisa — 24 confirmadas / 1 refutada)*

> Verificação adversarial (3 votos por claim). Legenda de qualidade: **primária** (lei/ANPD/CFM),
> **secundária** (escritórios/imprensa especializada), **blog** (prático), **refutada**.

**LGPD, ANPD e transferência internacional (alta confiança):**
- **LGPD — Lei 13.709/2018** (texto compilado) — *primária* — papéis controlador/operador
  (art. 5), dados sensíveis de saúde (art. 11), operador segue instruções (art. 39),
  responsabilidade solidária (art. 42), incidentes (art. 48):
  `planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm`
- **Res. CD/ANPD nº 15/2024 — Comunicação de Incidente (RCIS): 3 dias úteis** (dobro p/
  pequeno porte) — *primária/secundária*:
  `gov.br/anpd/.../comunicado-de-incidente-de-seguranca-cis` ·
  `gov.br/anpd/.../anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca` ·
  `machadomeyer.com.br/.../anpd-publica-regulamento-de-comunicacao-de-incidente-de-seguranca`
- **Res. CD/ANPD nº 19/2024 — Cláusulas-Padrão Contratuais (transferência internacional),
  obrigatórias desde 23/08/2025** — *primária/secundária*:
  `gov.br/anpd/.../resolucao-normatiza-transferencia-internacional-de-dados` ·
  `mayerbrown.com/.../end-of-grace-period-...-standard-contractual-clauses...`
- **Casos ANPD / 1ª sanção** — *secundária*: `conjur.com.br/2023-jul-25/...anpd-aplica-primeira-sancao-empresa/` ·
  retrospectiva 2024: `mayerbrown.com/.../um-olhar-retrospectivo-sobre-a-anpd...2024`

**WhatsApp + saúde (fontes práticas/secundárias — não primárias):**
- Compartilhar exames/dados de paciente por WhatsApp e LGPD — *blog técnico*:
  `ccih.med.br/posso-compartilhar-resultados-de-exames...lgpd/`
- Consentimento de clínica no WhatsApp e dados sensíveis — *blog*:
  `socialhub.pro/blog/lgpd-clinica-whatsapp-consentimento-obrigatorio-2026/` ·
  `socialhub.pro/blog/dados-sensiveis-whatsapp-lgpd-saude-financeiro-juridico/`
- CFM (não verificado nesta rodada): `sistemas.cfm.org.br/normas/.../2023/2336_2023.pdf`

**Contratos de TI / PI / responsabilidade (alta confiança):**
- **Lei 9.609/1998** (software) — *primária* — arts. 4, 7, 8, 9, 11:
  `planalto.gov.br/ccivil_03/leis/l9609.htm`
- PI em contrato de desenvolvimento — *blog jurídico*:
  `vp.adv.br/blog/propriedade-intelectual-contrato-desenvolvimento-software/`
- Limitação de responsabilidade em contratos de software — *secundária*:
  `migalhas.com.br/depeso/427638/...`
- Cláusulas essenciais em contratos de tecnologia — *secundária*: `condeadv.com.br/clausulas-essenciais...`
- (I)legalidade de multas em contratos de TI — *secundária*: `conjur.com.br/2024-out-03/...multas-em-contratos-de-servicos-de-ti...`

**Precificação (eixo mais fraco — fontes blog/secundárias):**
- Custo de desenvolvimento BR 2026 — *blog*: `neryx.com.br/blog/custo-desenvolvimento-software-brasil-2026/`
- Sustentação de sistemas (modelos/custos) — *blog*: `vmbears.io/sustentacao-de-sistemas...`
- Usage-based pricing como tendência (OpenView 2021, **2-1**) — *secundária*:
  `mitsloanreview.com.br/pagar-pelo-uso-uma-tendencia...`
- Reajuste por IGP-M/IPCA em contratos — *blog*: `tiflux.com/blog/aplicando-igpm-em-contratos/`

**❌ Claim refutado (0-3) — não use:** "metade (4 de 8) das investigações/sanções da ANPD
por incidentes envolviam o setor saúde". A verificação **derrubou** essa estatística
(`cisoadvisor.com.br/metade-das-investigacoes-da-anpd-envolvem-empresas-de-saude/`). Há
**casos** reais no setor saúde (ex.: órgãos públicos de saúde), mas **não** a proporção de
"metade".

---

### Resumo da pesquisa
24 alegações confirmadas e 1 refutada (de 25 verificadas), a partir de 24 fontes e 104
alegações extraídas, em 5 ângulos. **Eixos fortes:** LGPD/ANPD e cláusulas de TI (fontes
primárias). **Eixos fracos/não verificados:** faixas de preço de mercado, regras da
Meta/WhatsApp para saúde e resoluções do CFM — sinalizados ao longo do texto.
