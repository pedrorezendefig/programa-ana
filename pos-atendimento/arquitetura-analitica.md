# Arquitetura da camada analítica do pós-atendimento

> Frente 6 da pesquisa ultracode (03/jul/2026). Banco de respostas classificadas, pipeline de classificação por IA com auditoria amostral, agregação e relatórios evolutivos, fechamento de loop, opt-out e conformidade (Google + LGPD + Meta). Premissas herdadas do briefing (Parte II): agente separado da Ana, disparo começando só pelo eletivo, dois mecanismos (escuta interna + motor de reputação), sem review gating, 25 a 35 mil disparos/mês em regime pleno, fonte de dados do MV com desfecho.
>
> Afirmações de política verificadas adversarialmente em fontes primárias (Google, Meta, ANPD), acesso 03/jul/2026.

## Resumo executivo

1. **Banco: Postgres já existente no stack (Coolify), não Supabase.** Schema dedicado `pos_atendimento`, role própria, telefone em claro numa única tabela de fila (acesso restrito), `paciente_hash` (HMAC-SHA256, chave fora do banco) em toda a camada analítica.
2. **Classificação por IA: batch horário no n8n**, uma chamada por resposta com saída estruturada, taxonomia estável de 8 a 12 temas co-desenhada com os coordenadores e versionada. Casos graves não esperam o batch: regra rápida na conversa (NPS <= 2 ou palavra-gatilho) abre o loop na hora.
3. **Auditoria amostral obrigatória:** calibração (meses 1 a 3) com revisão humana de 10% das classificações (estratificada, piso 30 e teto 75/semana) + 100% das graves + 100% das menções nominais; LLM-judge independente em 100% das negativas. Regime: 3 a 5% quando a concordância humano-IA ficar >= 90% por 4 semanas.
4. **Atribuição nominal a profissional: regra dura.** Só entra em relatório nominal com **n >= 5 respostas no período** (supressão de célula pequena, prática padrão de divulgação estatística), vindo de vínculo estrutural com o `atendimento_ref` do MV (nunca só inferido do texto) e **sempre com revisão humana antes**. Menção espontânea no texto vai para revisão humana antes de virar dado.
5. **Relatórios: o mais simples que funciona.** Fase 1: views SQL + relatório HTML semanal gerado pelo n8n, por email para Gisele e coordenadores. Fase 2: Metabase Open Source (AGPL, gratuito) no Coolify sobre o mesmo Postgres. Grafana descartado (métrica de infra, não BI de coordenador).
6. **Fechamento de loop com SLA e métrica:** grave → fila de ouvidoria do Chatwoot com SLA de 24h úteis; o loop só conta como fechado quando o paciente recebe retorno. Meta: >= 90% dos graves fechados em 7 dias.
7. **Opt-out:** a política da Meta exige opt-in prévio e obriga a respeitar toda solicitação de parada (dentro ou fora do WhatsApp) com instruções claras de opt-out. O registro persistente por hash e o comando SAIR são a NOSSA implementação para cumprir isso de forma auditável (a política não exige literalmente um comando SAIR).
8. **Convite ao Google sem filtro por nota.** A política do Google proíbe "selectively solicit positive reviews from customers"; o desenho do briefing II.5 (convidar só NPS 9-10) é review gating na letra da política. Desenho conforme: convite universal pós-pesquisa, com o insatisfeito recebendo ADICIONALMENTE acolhimento e loop.
9. **LGPD: a base legal segura do disparo é consentimento específico no termo de atendimento.** O Guia da ANPD sobre Legítimo Interesse (02/02/2024) veda essa base para dados sensíveis, e o contato revela vínculo do titular com serviço de saúde; a LIA é recomendada como ferramenta essencial de accountability (não formalmente obrigatória). Ajustar o termo é pré-condição.

## 1. Princípios de desenho

O produto final não é a conversa: é o relatório agregado por setor, profissional e período. Decorrem quatro princípios:

- **Separação disparo x análise.** O telefone em claro vive numa tabela só (fila de disparo), com acesso restrito; todo o resto referencia `paciente_hash`.
- **Classificação é dado versionado, não atributo da resposta.** A resposta é imutável; a classificação é uma leitura da IA, corrigível por auditoria e refazível quando a taxonomia evoluir (tabela própria 1:N, com `modelo`, `versao_prompt`, flag `vigente`).
- **Comparabilidade acima de tudo.** A análise evolutiva só existe com taxonomia e pergunta estáveis. Mudança de taxonomia é evento raro, versionado, que marca reinício de série no relatório.
- **Auditabilidade ponta a ponta.** De cada número do relatório volta-se às classificações, de cada classificação à resposta e ao disparo.

## 2. Banco de dados

### Postgres do stack vs Supabase

O caso de uso é escrita batch moderada (dezenas de milhares de linhas/mês), leitura agregada semanal, nenhum acesso de aplicação externa. Nenhum recurso do Supabase (Auth, REST automático, Realtime) é necessário; adotá-lo adicionaria um operador novo na cadeia LGPD e uma mensalidade (o free pausa após 1 semana de inatividade, inaceitável em produção). **Postgres existente, schema `pos_atendimento`, role de app com GRANT só no schema; o Metabase (fase 2) entra com role read-only que não enxerga `fila_disparo`.** Backup: dump diário com teste de restauração mensal (o banco passa a guardar a série histórica do programa). Volumetria: ~500 mil linhas/ano somando tudo; qualquer VPS modesto trata sem tuning.

### Schema proposto (DDL)

```sql
CREATE SCHEMA IF NOT EXISTS pos_atendimento;

-- ==== Dimensões (espelho do MV, mantidas pelo batch de ingestão) ====

CREATE TABLE pos_atendimento.setores (
  id            serial PRIMARY KEY,
  codigo_mv     text UNIQUE,
  nome          text NOT NULL,
  tipo_servico  text NOT NULL CHECK (tipo_servico IN
                  ('exame_eletivo','cirurgia_eletiva','ambulatorio',
                   'emergencia_adulto','emergencia_pediatrica',
                   'emergencia_ortopedica','obstetricia','internacao')),
  liberado_disparo boolean NOT NULL DEFAULT false,  -- II.2: só eletivo no início
  ativo         boolean NOT NULL DEFAULT true
);

CREATE TABLE pos_atendimento.profissionais (
  id            serial PRIMARY KEY,
  codigo_mv     text UNIQUE,
  nome          text NOT NULL,
  registro_conselho text,
  setor_principal_id int REFERENCES pos_atendimento.setores(id),
  ativo         boolean NOT NULL DEFAULT true
);

-- ==== Fila de disparo: ÚNICA tabela com telefone em claro ====
-- Acesso restrito à role do fluxo de disparo. Metabase e relatórios não leem daqui.

CREATE TABLE pos_atendimento.fila_disparo (
  id              bigserial PRIMARY KEY,
  paciente_hash   text NOT NULL,        -- HMAC-SHA256(prontuario_mv, chave_secreta)
  telefone        text NOT NULL,        -- E.164; apagado pelo job de retenção
  nome_exibicao   text,                 -- primeiro nome, para o template
  atendimento_ref text NOT NULL UNIQUE, -- id do atendimento no MV (dedupe natural)
  setor_id        int REFERENCES pos_atendimento.setores(id),
  profissional_id int REFERENCES pos_atendimento.profissionais(id),
  servico         text,
  data_atendimento date NOT NULL,
  desfecho        text,                 -- alta | obito | transferencia | evasao | null
  status          text NOT NULL DEFAULT 'pendente' CHECK (status IN
                    ('pendente','enviado','suprimido_optout','suprimido_desfecho',
                     'suprimido_setor','suprimido_recontato','erro')),
  criado_em       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON pos_atendimento.fila_disparo (status, data_atendimento);

-- ==== Disparos efetivados ====

CREATE TABLE pos_atendimento.disparos (
  id              bigserial PRIMARY KEY,
  fila_id         bigint REFERENCES pos_atendimento.fila_disparo(id),
  paciente_hash   text NOT NULL,
  atendimento_ref text NOT NULL,
  setor_id        int REFERENCES pos_atendimento.setores(id),
  profissional_id int REFERENCES pos_atendimento.profissionais(id),
  data_atendimento date,
  template_nome   text NOT NULL,
  categoria_meta  text NOT NULL DEFAULT 'utility',  -- categoria VIGENTE no envio
  wamid           text,
  status_envio    text CHECK (status_envio IN
                    ('aceito','enviado','entregue','lido','falha','bloqueado')),
  custo_estimado_usd numeric(8,5),
  enviado_em      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON pos_atendimento.disparos (enviado_em);
CREATE INDEX ON pos_atendimento.disparos (paciente_hash);

-- ==== Respostas (imutáveis: o que o paciente disse) ====

CREATE TABLE pos_atendimento.respostas (
  id            bigserial PRIMARY KEY,
  disparo_id    bigint NOT NULL REFERENCES pos_atendimento.disparos(id),
  nps           smallint CHECK (nps BETWEEN 0 AND 10),
  texto_livre   text,                  -- apagado pelo job de retenção (24 meses)
  conversa_chatwoot_id text,
  concluida     boolean NOT NULL DEFAULT false,
  recebida_em   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON pos_atendimento.respostas (recebida_em);

-- ==== Classificações (1:N com respostas; versionadas, auditáveis) ====

CREATE TABLE pos_atendimento.classificacoes (
  id            bigserial PRIMARY KEY,
  resposta_id   bigint NOT NULL REFERENCES pos_atendimento.respostas(id),
  sentimento    text NOT NULL CHECK (sentimento IN ('positivo','neutro','negativo','misto')),
  gravidade     text NOT NULL DEFAULT 'nenhuma' CHECK (gravidade IN ('nenhuma','media','grave')),
  temas         text[] NOT NULL,       -- valores fechados da taxonomia vigente
  mencao_profissional boolean NOT NULL DEFAULT false,
  profissional_confirmado_id int REFERENCES pos_atendimento.profissionais(id),
                                        -- SÓ preenchido após revisão humana
  modelo        text NOT NULL,
  versao_prompt text NOT NULL,          -- ex.: taxonomia-v1.0
  confianca     numeric(3,2),
  vigente       boolean NOT NULL DEFAULT true,
  criada_em     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX classif_vigente_unica
  ON pos_atendimento.classificacoes (resposta_id) WHERE vigente;
CREATE INDEX ON pos_atendimento.classificacoes USING gin (temas);

-- ==== Auditoria amostral da classificação ====

CREATE TABLE pos_atendimento.auditorias (
  id               bigserial PRIMARY KEY,
  classificacao_id bigint NOT NULL REFERENCES pos_atendimento.classificacoes(id),
  tipo_revisor     text NOT NULL CHECK (tipo_revisor IN ('humano','llm_judge')),
  revisor          text,
  veredito         text NOT NULL CHECK (veredito IN ('concorda','corrige')),
  correcao         jsonb,
  motivo_selecao   text CHECK (motivo_selecao IN
                     ('amostra_aleatoria','grave','mencao_profissional',
                      'discordancia_judge','baixa_confianca')),
  revisada_em      timestamptz NOT NULL DEFAULT now()
);

-- ==== Opt-out persistente (nunca expira, nunca é apagado) ====

CREATE TABLE pos_atendimento.optouts (
  telefone_hash  text PRIMARY KEY,     -- HMAC-SHA256(telefone E.164, chave_secreta)
  paciente_hash  text,
  origem         text NOT NULL CHECK (origem IN
                   ('comando_sair','pedido_em_conversa','bloqueio_meta',
                    'ouvidoria','pedido_lgpd')),
  registrado_em  timestamptz NOT NULL DEFAULT now()
);

-- ==== Fechamento de loop ====

CREATE TABLE pos_atendimento.loops (
  id             bigserial PRIMARY KEY,
  resposta_id    bigint NOT NULL REFERENCES pos_atendimento.respostas(id),
  gravidade      text NOT NULL CHECK (gravidade IN ('media','grave')),
  roteado_para   text NOT NULL,        -- 'ouvidoria' | 'coordenacao_<setor>' | 'humano_plantao'
  chatwoot_conversa_id text,
  sla_prazo      timestamptz,
  status         text NOT NULL DEFAULT 'aberto' CHECK (status IN
                   ('aberto','em_tratativa','resolvido_sem_retorno',
                    'fechado_com_retorno','expirado')),
  acao_registrada text,
  retorno_enviado_em timestamptz,
  fechado_em     timestamptz,
  criado_em      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON pos_atendimento.loops (status, sla_prazo);
```

Notas de modelagem:
- `paciente_hash` = HMAC-SHA256 sobre o identificador estável do MV (prontuário; CPF como fallback), com a **chave secreta fora do banco** (credencial do n8n). Atende a pseudonimização da LGPD (art. 13, § 4º): com a chave, o hospital atende direitos do titular; sem ela, quem lê a camada analítica não identifica ninguém.
- `atendimento_ref` fica em claro por ser a chave de auditoria contra o MV (não identifica o titular fora do MV); hashear se o jurídico preferir.
- `temas text[]` com vocabulário fechado (validado no pipeline antes do INSERT): agrega bem com GIN e impede a IA de inventar categoria.
- Opt-out guarda **hash do telefone**: o batch calcula HMAC(telefone) de cada candidato e suprime os que batem. A lista funciona sem reter dado em claro e sobrevive a pedidos de eliminação LGPD (reter o mínimo para honrar a própria exclusão é defensável; apagar o opt-out geraria novo disparo indevido, dano maior).
- Sem tabela de agregados na fase 1: views e materialized views (seção 4).

### Retenção (LGPD arts. 15 e 16)

- `texto_livre`, `telefone`, `nome_exibicao`: job mensal anonimiza registros com mais de **24 meses** (validar prazo com o jurídico; cobre dois ciclos anuais de comparação).
- Campos estruturados (nps, sentimento, temas, setor, datas): retidos como estatística após a anonimização.
- `optouts`: permanente por desenho. Registrar tudo no ROPA do hospital.

## 3. Classificação por IA

### Pipeline no n8n: batch horário, com atalho para graves

O consumidor do dado é um relatório semanal; latência de classificação não importa. Batch (Schedule Trigger a cada hora) é mais simples de operar, reprocessar e monitorar. Exceção: a conversa de coleta aplica regra rápida sem LLM (NPS <= 2 ou palavras-gatilho: "erro", "morreu", "processar", "advogado", "negligência", "agressão") e abre o loop imediatamente.

Workflow `classificar-respostas`:
1. Schedule Trigger (hora em hora).
2. `SELECT` das respostas sem classificação vigente (LIMIT 200).
3. SplitInBatches: **uma chamada de LLM por resposta** (agrupar várias degrada a atribuição), Structured Output com JSON Schema.
4. Validação do vocabulário de `temas`; valor fora do vocabulário cai em fila de erro.
5. INSERT em `classificacoes` (vigente = true).
6. Pós-processo: `grave` que a regra rápida não pegou abre loop retroativo; `mencao_profissional` entra na fila de revisão humana.

Custo: com 15 a 35% de taxa de resposta (planejar para até 40%), são ~4 a 12 mil respostas/mês a ~700 tokens por chamada: poucos dólares a poucas dezenas de dólares/mês, irrelevante frente ao disparo Meta.

### Taxonomia estável (levar à oficina com os coordenadores)

Proposta inicial de 10 temas: `tempo_espera`, `recepcao_acolhimento`, `atendimento_enfermagem`, `atendimento_medico` (cortesia/escuta/clareza, NUNCA conduta clínica), `agendamento_acesso`, `estrutura_limpeza_conforto`, `exames_resultados`, `financeiro_convenio`, `comunicacao_informacao`, `elogio_geral`. Ortogonais: `sentimento`, `gravidade`, `mencao_profissional`. Regras: adicionar tema é mudança menor; renomear/fundir/remover exige decisão da Gisele + coordenadores e marca reinício de série. Taxonomia v1.0 congelada por 6 meses.

### Prompt de classificação (esqueleto)

```
Você classifica respostas de pesquisa de satisfação de um hospital.
Use SOMENTE os temas do vocabulário fornecido. Não invente temas.
Não avalie conduta clínica; "atendimento_medico" refere-se a cortesia,
escuta e clareza, nunca a acerto ou erro de diagnóstico/tratamento.
gravidade = "grave" quando houver relato de possível dano ao paciente,
erro assistencial percebido, agressão, discriminação ou ameaça jurídica.
mencao_profissional = true se o texto citar nome ou função identificável
de um profissional específico. NÃO tente adivinhar de quem se trata.
Responda apenas com o JSON no schema.
```

### Auditoria amostral

**Revisão humana semanal (fonte da verdade):**
- Calibração (meses 1 a 3): 10% das classificações da semana, estratificada por sentimento, piso 30 e teto 75; + 100% das `grave`; + 100% das `mencao_profissional`.
- Regime (concordância >= 90% por 4 semanas): 3 a 5%, mantendo os dois "100%" para sempre.
- Operacionalização: workflow exporta a amostra para planilha Google com colunas de veredito/correção; outro workflow lê e grava em `auditorias`. Revisor: 1 pessoa da qualidade/ouvidoria, ~45 a 60 min/semana na calibração.
- Correção alimenta o sistema: `corrige` cria nova classificação vigente e preserva a errada para medir taxa.

**LLM-judge secundário (roda sempre):** prompt independente reclassifica 100% das negativas/graves + 10% das demais; discordância manda para revisão humana. Literatura: juízes LLM fortes concordam com humanos em ~80 a 90% dos casos, então o judge é detector de casos difíceis, não substituto do humano.

**Métricas de qualidade do dado (entram no relatório):** concordância humano-IA por campo/semana; taxa de correção nas graves; gatilho de contenção: concordância de sentimento < 80% numa semana pausa o relatório nominal e recalibra o prompt.

### CRÍTICO: atribuição nominal a profissionais

1. **Vínculo estrutural, nunca inferência:** atribuição válida vem do `profissional_id` do atendimento no MV. Menção no texto fica em `trecho_profissional` e só vira dado após confirmação humana.
2. **n >= 5 respostas no período** por profissional (supressão de célula pequena; o manual do NCHS, por exemplo, não publica células < 5). Abaixo disso, agregado no setor.
3. **Revisão humana obrigatória antes de qualquer relatório nominal**, que é artefato separado, de distribuição restrita (direção + coordenador da área), com a taxa de concordância da semana anexada.
4. Números nominais sempre com contexto (n, período, média do setor), nunca ranking isolado. Recomendar formalmente que decisão disciplinar nunca cite o relatório como prova única (validar com o jurídico).

## 4. Agregação e relatórios evolutivos

### Camada SQL

```sql
CREATE MATERIALIZED VIEW pos_atendimento.mv_agregado_semanal AS
SELECT
  date_trunc('week', r.recebida_em)::date        AS semana,
  s.nome                                          AS setor,
  t.tema,
  count(*)                                        AS n_respostas,
  round(avg(r.nps), 2)                            AS nps_medio,
  count(*) FILTER (WHERE r.nps >= 9)              AS promotores,
  count(*) FILTER (WHERE r.nps <= 6)              AS detratores,
  round(100.0 * (count(*) FILTER (WHERE r.nps >= 9)
               - count(*) FILTER (WHERE r.nps <= 6)) / count(*), 1) AS nps_score,
  count(*) FILTER (WHERE c.sentimento = 'negativo') AS negativas,
  count(*) FILTER (WHERE c.gravidade = 'grave')     AS graves
FROM pos_atendimento.respostas r
JOIN pos_atendimento.classificacoes c ON c.resposta_id = r.id AND c.vigente
JOIN pos_atendimento.disparos d       ON d.id = r.disparo_id
JOIN pos_atendimento.setores s        ON s.id = d.setor_id
CROSS JOIN LATERAL unnest(c.temas) AS t(tema)
GROUP BY 1, 2, 3;
```

Views análogas: `mv_agregado_profissional` (com `HAVING count(*) >= 5` embutido, para o limiar nominal ser estrutural) e `mv_funil_disparo` (disparados, entregues, respondidos, concluídos, opt-outs, custo, por semana).

### Ferramenta

- **Fase 1 (recomendada): relatório HTML gerado pelo n8n + email** toda segunda 7h para Gisele e coordenadores. Zero infra nova; atende o ritual semanal do briefing II.6.
- **Fase 2: Metabase Open Source** (AGPL, container no Coolify, ~1 a 2 GB RAM, role read-only sem acesso a `fila_disparo`, metadados em Postgres e não no H2 default), quando os coordenadores quiserem explorar.
- **Grafana: não** (painel de métrica contínua de infra, pouco natural para BI categórico de coordenador). **Power BI/Looker: não** nesta escala.

### Conteúdo do relatório semanal

1. KPIs: disparos, entrega, taxa de resposta, conclusão, NPS geral + deltas, custo do período.
2. Evolução: NPS por semana (últimas 12), por setor.
3. Temas: top 5 negativos com variação; 2 a 3 trechos ilustrativos anonimizados.
4. Graves e loops: status, % no SLA, tempo mediano de fechamento.
5. Qualidade do dado: n auditado, concordância, correções.
6. Ações: categoria acima do limiar vira ação com responsável (preenchido no ritual, não pela IA); pendências da semana anterior.
7. (Artefato separado, restrito) Relatório nominal, apenas n >= 5 e pós-auditoria.

## 5. Fechamento de loop

- **Grave** (regra rápida OU classificação grave): conversa na fila de **ouvidoria** do Chatwoot (mesmos guardrails jurídicos da Ana: sem admissão de culpa, sem promessa específica), linha em `loops` com `sla_prazo = now() + 24h úteis`, resposta imediata de acolhimento + protocolo ainda na janela de 24h.
- **Média** (NPS 3 a 6 ou negativa sem gravidade): acolhimento automático, registro roteado à coordenação do setor, tratamento agregado no ritual semanal.
- **Retorno ao paciente:** para graves (sempre) e médias que a coordenação decidir responder. Dentro da janela de 24h é grátis (até 30/set/2026); fora dela, template utility de follow-up (T4/T5 do `templates-meta.md`), custo de centavos. Só então `fechado_com_retorno`.
- Métricas: taxa de loop fechado (meta >= 90% dos graves em 7 dias); SLA de primeiro contato humano <= 24h úteis; `resolvido_sem_retorno` conta como falha parcial (o "frustra duas vezes" do briefing).

## 6. Opt-out

1. Toda mensagem proativa fecha com "Para não receber mais pesquisas, responda SAIR". Reconhecer variações (sair, parar, stop, "não quero receber") por regra + fallback de intenção no LLM da coleta.
2. Registro persistente em `optouts` (hash), efeito imediato e permanente, checado em todo batch.
3. Sinais implícitos também viram opt-out: bloqueio reportado pela API (webhook de status) e pedido em qualquer conversa (tag no Chatwoot convertida por workflow).
4. **Base na política da Meta (verificada):** a Business Messaging Policy exige opt-in prévio para contato proativo e obriga a "respeitar todas as solicitações (dentro e fora do WhatsApp) de bloquear, descontinuar ou deixar de receber comunicações", além de exigir instruções claras de opt-out. O registro persistente + comando SAIR são a nossa implementação auditável desse requisito (a política não exige literalmente um comando SAIR nem um registro específico). Violação sistemática degrada o quality rating e arrisca o número, que é o MESMO da Ana.
5. Contexto de volume: limites da Meta começam em 250 usuários únicos/24h e escalam por qualidade e uso para **2.000 → 10.000 → 100.000 → ilimitado** (portfólio compartilhado desde out/2025). O alvo de ~1.200/dia útil **cabe no tier 2.000**; o tier 10.000 dá folga (rampa ~2 semanas; ver `templates-meta.md`). Opt-out fácil e supressão de recontato (não disparar 2x para o mesmo paciente em < 90 dias) são a principal defesa do rating.

## 7. Conformidade

### Google: review gating

A política de conteúdo do Google Maps (support.google.com/contributionpolicy/answer/7400114, seção Rating Manipulation; confirmada por 1 verificador com fetch direto) proíbe comerciantes de "Discourage or prohibit negative reviews, or selectively solicit positive reviews from customers". As sanções (support.google.com/business/answer/14114287): bloqueio de novas avaliações por período, despublicação temporária das existentes e aviso público no perfil.

O fluxo do briefing II.5 item 4 ("NPS 9-10 → convida ao Google") é solicitação seletiva por sentimento: review gating na letra da política. O "espaço cinzento" do briefing II.1 não resiste à redação.

**Desenho conforme:** convite universal pós-pesquisa (todo paciente que completa recebe a mesma mensagem de encerramento com o link do Google, independente da nota); o insatisfeito recebe ADICIONALMENTE o acolhimento e o loop. Proibido no fluxo: qualquer branch `if nps >= X then link_google` e qualquer texto que desencoraje o insatisfeito de avaliar. Mitigação do medo de onda negativa: começar pelo eletivo e confiar no volume (a distribuição real de satisfação domina; nota sobe por volume + recência + melhoria real).

### LGPD

- **Natureza do dado:** o disparo revela vínculo do titular com serviço de saúde; postura conservadora: regime do art. 11 (dado sensível, no mínimo por inferência).
- **Base legal:** o Guia Orientativo da ANPD sobre Legítimo Interesse (02/02/2024, vigente) confirma que o legítimo interesse **não se aplica a dados sensíveis** (previsão apenas no art. 7º) e **recomenda** a LIA como ferramenta essencial de accountability (o modelo da ANPD não é de uso obrigatório). Caminho recomendado: **consentimento específico e destacado no termo de atendimento** (art. 11, I), citando canal (WhatsApp), finalidade (pesquisa de satisfação) e direito de revogação (SAIR). Como opt-in de canal, a Meta aceita opt-in presencial em papel, desde que o texto nomeie a empresa e declare o aceite de receber mensagens (doc oficial de opt-in, confirmada por 2 verificadores): o mesmo ajuste do termo resolve LGPD e Meta de uma vez. Fallback defensável e mais frágil: qualidade do serviço como execução do ciclo de atendimento, com LIA documentada; decisão do jurídico/DPO, não de engenharia. A hipótese "tutela da saúde" (art. 11, II, f) NÃO cobre pesquisa de satisfação.
- **Independente da base:** minimização no template (não citar procedimento/condição; "seu atendimento de [data]" no máximo), pseudonimização na camada analítica, retenção definida, ROPA, direitos do titular via hash recomputável.
- **Telefone reciclado:** template neutro reduz o dano; verificar recência do cadastro no MV antes do disparo quando possível.

### Meta: custo da coleta (adendo out/2026)

Até 30/set/2026, a conversa de coleta e o fechamento de loop dentro da janela de 24h custam ~zero (verificado na doc de pricing). **A partir de 01/out/2026** (anúncio de 03/jul/2026; card oficial até 01/set/2026), mensagens de serviço passam a ser cobradas a tarifa ~utility: a coleta passa a custar ~US$ 150 a 420/mês no nosso volume, e o desenho deve encurtar a conversa (4 a 6 mensagens do bot) ou migrar para WhatsApp Flows (1 a 2 mensagens). O risco de reclassificação utility → marketing (fator ~9x) é tratado em `templates-meta.md`; o schema registra `categoria_meta` por disparo justamente para o custo real por resposta aparecer no relatório.

## 8. Riscos e questões em aberto

| Risco/questão | Tratamento | Dono |
|---|---|---|
| Termo de atendimento sem cláusula de pesquisa | Ajustar termo antes da escala; POC só com base documentada | Jurídico/DPO do hospital |
| MV não exporta desfecho confiável | Pré-condição (briefing II.3); sem isso, escopo travado no eletivo | Pedro + TI hospital |
| Taxonomia imposta sem oficina | Oficina com coordenadores antes do go-live; v1.0 congelada 6 meses | Gisele + coordenadores |
| Relatório nominal como prova disciplinar isolada | n >= 5 + revisão humana + redação validada com jurídico | Direção |
| Quality rating cai e trava o volume | Opt-out rigoroso, supressão de recontato (90 dias), rating no relatório semanal | Pedro |
| Postgres compartilhado sob pressão | Métricas de conexão; database separado no mesmo host se preciso | Pedro |
| Concordância humano-IA < 80% | Contenção: pausa relatório nominal, recalibra prompt | Pedro + revisor |
| Fim da janela grátis em out/2026 | Recalcular custo da coleta em set/2026; testar Flows na POC | Pedro |

## Fontes principais (acesso 03/jul/2026)

1. Google Maps UGC Policy, "Prohibited and restricted content" (review gating): support.google.com/contributionpolicy/answer/7400114
2. Google, "Business Profile restrictions for policy violations" (sanções): support.google.com/business/answer/14114287
3. Meta, Business Messaging Policy (opt-in, opt-out, dentro e fora do WhatsApp): whatsappbusiness.com/policy (business.whatsapp.com/policy redireciona para lá)
4. Meta, Pricing (per-message desde 01/jul/2025; utility grátis na janela até 30/set/2026; BRL desde 01/jul/2026): developers.facebook.com/documentation/business-messaging/whatsapp/pricing
5. Meta, Messaging Limits (250/2.000/10.000/100.000/ilimitado; portfólio desde out/2025): developers.facebook.com/docs/whatsapp/messaging-limits
6. Meta, Get opt-in for WhatsApp (opt-in presencial em papel aceito): developers.facebook.com/docs/whatsapp/overview/getting-opt-in
7. ANPD, Guia Orientativo sobre Legítimo Interesse (02/02/2024; LI inaplicável a dado sensível; LIA recomendada): gov.br/anpd
8. Statistical disclosure control (limiar de célula pequena 3 a 5; NCHS < 5 não publica): PMC5409873 (2017)
9. Metabase Open Source (AGPL): metabase.com/license
10. Evidently AI, LLM-as-a-judge (concordância juiz-humano ~80 a 90%): evidentlyai.com/llm-guide/llm-as-a-judge
