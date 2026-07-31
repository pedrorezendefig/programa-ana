# Relatório da pesquisa ultracode: síntese, decisões e impactos no roadmap

> Sessão de 03/jul/2026. Oito frentes de pesquisa executadas em fan-out multi-agente (69 agentes), com verificação adversarial das afirmações críticas (refutadores + auditores de fonte, dupla verificação nas frentes de preço e política Meta) e crítico de completude cruzando as frentes. Este relatório consolida os vereditos, resolve as contradições que o crítico encontrou entre as frentes e lista o que muda no roadmap.
>
> Convenções adotadas após reconciliação: câmbio R$ 5,20/US$ (PTAX 02/jul/2026); tarifas Brasil por mensagem entregue: utility US$ 0,0068 a 0,008, marketing US$ 0,0625 (fator ~9x, e não os 6x do briefing); volume de conversas da Ana: NÃO MEDIDO (faixa de trabalho 2 a 35 mil/mês; medir no Chatwoot é ação imediata); volume do pós-atendimento: 25 a 35 mil disparos/mês (premissa do briefing).

## Os 5 achados que mudam o plano

### 1. Fim da janela grátis do WhatsApp em 01/out/2026

A Meta anunciou (imprensa de negócios de 02-03/jul/2026; ainda fora da doc oficial, rate card até 01/set/2026) que em 01/out/2026 **acaba a gratuidade dentro da janela de 24h**: mensagens de serviço (texto livre) e templates utility na janela passam a ser cobrados a tarifa ~utility. Em 01/ago/2026 entra a cobrança por token do Meta Business Agent (US$ 2,00/1M tokens; NÃO afeta a Ana, que é stack próprio).

**Impacto:** a premissa "o fluxo reativo da Ana custa ~zero" expira em outubro. Estimativas a US$ 0,008/msg: Ana reativa passa a custar ~R$ 0,04 por mensagem enviada (R$ 0,7 a 2,1 mil/mês nas faixas de volume plausíveis); a coleta do pós-atendimento passa a custar ~US$ 150 a 420/mês. **Ações:** medir agora o volume real de mensagens/mês da Ana no Chatwoot; recalcular em 01/set/2026 com o card oficial; desenhar a coleta enxuta (4 a 6 mensagens) e testar WhatsApp Flows (1 a 2 mensagens) na POC; revisar o prompt para respostas mais agrupadas sem perder qualidade.

### 2. CFM 2.454/2026: comunicar o uso de IA vira obrigação (~26/08/2026)

A Resolução CFM 2.454/2026 (DOU 27/02/2026, vigor 180 dias depois) determina no art. 11 que "qualquer utilização de IA deverá ser comunicada e explicada aos pacientes", e o Anexo I inclui expressamente "assistentes virtuais para pacientes" e triagem/apoio administrativo. Confirmado por 2 verificadores no PDF oficial do CFM.

**Impacto:** a Regra 6 atual ("nunca revelar que é uma IA") fica frontalmente insustentável; a Regra 6 nova (decidida no briefing) é necessária mas não suficiente: a comunicação deve ser proativa. O v2 já incorpora: saudação inicial passa a dizer "assistente virtual". Além do prompt, a resolução cria deveres institucionais (art. 12: avaliação preliminar de risco da Ana; art. 13: categoria de risco informada ao usuário; art. 14: Comissão de IA e Telemedicina sob coordenação médica). **Levar à diretoria do hospital antes de agosto.**

Nota de reconciliação: a Meta NÃO exige que o bot se declare IA (verificado nos 3 documentos primários; a alegação de vendors sobre "disclosure obrigatório em 2026" não tem fonte primária). A exigência real da Meta para automação é caminho de escalação humana rápido e claro, que a Ana já cumpre. A obrigação de comunicar vem do CFM (e do CDC/LGPD como pano de fundo), não da Meta.

### 3. Coleta de CPF em texto livre conflita com a política da Meta

A Business Messaging Policy proíbe, verbatim: "Don't share or ask people to share full length individual payment card numbers, financial account numbers, personal ID card numbers, or other sensitive identifiers" (confirmado por 2 verificadores). A Ana pede CPF completo em texto livre em 4 fluxos (2.4A, 3.2, 5.B e ouvidoria), e o prontuário pede até RG.

**Calibragem honesta:** é prática generalizada no Brasil e não há caso público de enforcement por CPF; o risco é baixo, mas a cláusula dá fundamento formal para ação contra a conta. **Ações:** registrar a decisão com o jurídico; avaliar minimização (a fila humana precisa mesmo do CPF antes do contato?); na fase MV, avaliar WhatsApp Flows para coleta de CPF/carteirinha (formulário nativo, dado fora do corpo do chat). Não é urgência; é pendência formal documentada.

### 4. O desenho das 7 tools precisa de 1 correção grave antes de construir

A validação contra a doc v1.10 (frente 7) confirmou o desenho em geral, mas achou 8 divergências. A grave (D1): o fluxo "particular" do T2 pularia `GET /convenios` e chamaria `/agendas/v2` sem `idConvenio`/`idPlano`, que a doc não marca como opcionais; "particular" é um convênio com id próprio e flag `particular: true`. Corrigir o docs/02 (sempre resolver o convênio) e perguntar o id do particular à Global Health. As demais (D2 a D8) e as 18 perguntas à GH + 20 ao TI estão em `ana/api-mv/perguntas-global-health.md`.

**Achado estrutural:** a API não serve ao pós-atendimento (só agendamentos ativos por CPF; sem atendimento realizado, desfecho ou webhook). O pós-atendimento nasce do Oracle (Trilha 1). E a tabela de desfecho no MV clássico é **`MOT_ALT`** (não `MOTIVO_ALTA`), com `TP_MOT_ALTA = 'O'` = óbito e 3 sinais redundantes de óbito (`ATENDIME.SN_OBITO`, `MOT_ALT.TP_MOT_ALTA`, `PACIENTE_OBITO`), tudo com evidência pública de instalações MV em produção. As queries da Trilha 1 no TODO foram ajustadas.

### 5. Webchat por link: inviável como economia; a ideia boa dentro dela é outra

Veredito da frente 1, com a premissa corrigida na fonte primária da Meta: a economia do link-out é **zero** no cenário base (o template de abertura é pago de qualquer jeito e a conversa na janela já é grátis; clique em botão CTA URL nem abre a janela de 24h, então o link-out ainda destrói o canal de retorno gratuito). O funil modelado colhe ~metade das respostas com o mesmo custo Meta. Não existe caso documentado de deflection WhatsApp→web em nenhum setor; o movimento do mercado é o inverso. Pós-out/2026 o teto de economia sobe para ~R$ 0,8 a 2,2 mil/mês, mas a resposta racional é encurtar a conversa (Flows), não trocar de canal. **O que aproveitar:** widget nativo do Chatwoot no site do hospital como canal ADICIONAL (frente Lucas/Rib, custo ~zero) e WhatsApp Flows para formulários. Relatório completo: `pos-atendimento/viabilidade-webchat.md`.

## Vereditos das demais frentes

**Frente 2 (economia Meta):** pesquisa de satisfação vinculada a atendimento específico é caso de uso OFICIAL de utility (a doc da Meta traz exemplo quase idêntico e a regra "A general/generic survey... will not be approved as utility"). Custo do disparo: utility US$ 170 a 280/mês; marketing US$ 1.562 a 2.187/mês. Recategorização desde abr/2025 é silenciosa (aprovado direto como marketing; sem aviso para reincidentes): monitorar webhook `template_category_update` é obrigatório. Limites: 250 → 2.000 → 10.000 (o alvo de ~1.200/dia cabe no tier 2.000; rampa ~2 semanas até 10.000). Plano B sólido: amostragem estatística mantém o relatório por US$ 95 a 400/mês mesmo em marketing. Artefato: `pos-atendimento/templates-meta.md` (5 templates prontos para submissão).

**Frente 3 (melhores práticas):** a literatura valida com força a decisão da dupla camada de urgência: o estudo Mount Sinai (Nature Medicine, 02/2026) mostrou o ChatGPT Health sub-triando mais da metade das emergências e alertas de suicídio invertidos; a ECRI pôs mau uso de chatbots como risco número 1 de 2026; NHS 111 põe as perguntas de risco de vida primeiro com viés deliberado de sobre-encaminhamento. A revisão apontou 17 problemas concretos no prompt atual e no docs/04 (P1 a P17), aplicados ao v2. Correção de base normativa: a RDC 36/2013 é de segurança do paciente (NSP), não de ouvidoria; não há norma federal impondo ouvidoria a hospital privado fora do SUS; o risco dominante do registro é cível/probatório (WhatsApp é prova documental aceita). Stack de evals recomendado: promptfoo (CI, golden set com gate de 100% nas red flags) + Langfuse self-hosted (traces, judge contínuo); shadow mode via private notes do Chatwoot; canário por hash de conversa.

**Frente 4 (classificador):** spec completa em `docs/06-spec-classificador-urgencia.md`. Híbrido em 3 camadas (regex hard de curto-circuito → gpt-5.4-mini effort minimal → regra do piso), fail-safe = SUSPEITA, golden set de 135 casos pt-BR coloquial, judge noturno de cobertura total via Batch API. Atenção: gpt-5-mini/nano estão deprecados (desligam 11/12/2026); usar a família 5.4. Custo ~US$ 18/mês; latência p50 ~1,1 a 1,6s (validar em shadow mode).

**Frente 5 (base de conhecimento):** decisão em `docs/adr/0003-base-de-conhecimento.md`: Sheets como UI de edição, Postgres como runtime (sync agendado na fase MV), Central de Comando como alvo final da edição, NocoDB como plano B. Quota do Google não é o risco hoje; latência, confiabilidade e o custo de tokens do dump-tudo são. Supabase, Airtable, Baserow e RAG vetorial descartados com justificativa.

**Frente 6 (camada analítica):** desenho completo em `pos-atendimento/arquitetura-analitica.md`: schema `pos_atendimento` no Postgres existente (telefone em claro só na fila de disparo; `paciente_hash` HMAC no resto), classificação batch com taxonomia versionada de 10 temas (oficina com coordenadores), auditoria amostral 10%→3-5% + 100% das graves e menções nominais, relatório nominal só com n >= 5 e revisão humana, relatório HTML semanal via n8n (Metabase na fase 2), loop com SLA de 24h úteis para graves.

**Frente 8 (compliance):** a Ana está claramente do lado permitido da política de IA da Meta (a proibição de 15/01/2026 atinge "AI Providers" cuja IA é a funcionalidade primária; bot de tarefa específica de um hospital é caso permitido, com a ressalva do "sole discretion" da Meta). Enforcement é escada documentada (warning → bloqueio de templates 1-3 dias → bloqueio total 5-30 dias → lock → banimento), com "template misclassification" citada nominalmente como gatilho. Opt-in em papel no balcão é canal aceito pela Meta SE o termo nomear o hospital, o canal WhatsApp e a finalidade; hoje o termo provavelmente não cumpre isso: **revisar o termo é bloqueante para o disparo**. Não há caso público de banimento de hospital na API oficial (os casos documentados são de ferramentas não oficiais + spam).

## Reconciliação das contradições entre frentes (veredito final)

1. **Custo da janela de 24h:** a frente 2 prevalece (fim da gratuidade em 01/out/2026, confirmado por verificação independente); os artefatos das frentes 1 e 6 já foram escritos com o adendo.
2. **Fator utility vs marketing:** ~9x (0,0625/0,0068), não 6x. Todos os artefatos usam 9x.
3. **Volume da Ana:** desconhecido; nenhuma conclusão muda entre 2 e 35 mil conversas/mês, mas os custos pós-out/2026 dependem dele. Medir é a ação número 1.
4. **Base legal LGPD do disparo:** prevalece a leitura da frente 6 (conservadora): o guia da ANPD veda legítimo interesse para dado sensível, e o disparo revela vínculo com serviço de saúde; caminho seguro é consentimento específico no termo (que também resolve o opt-in da Meta de uma vez). O LI com LIA documentada fica como posição de fallback, decisão do jurídico.
5. **Exigência de disclosure de IA:** prevalece a frente 8 (verificada na fonte): a Meta não exige; o CFM exige a partir de ~26/08/2026. A saudação com "assistente virtual" resolve os dois mundos.
6. **Tiers de messaging limit:** 250 → 2.000 → 10.000 → 100.000 → ilimitado (o tier de 1.000 do modelo antigo virou 2.000 em out/2025; confirmado 2x).

## Decisões recomendadas (para ratificar com o Felipe)

1. **Aplicar o hotfix do prompt já** (v2 pronto em `ana/prompt/Ana_System_Prompt_v2.md`, com o mapa Fase 0 no preâmbulo), incluindo a saudação "assistente virtual".
2. **Descartar o link-out para web chat**; aprovar o widget do Chatwoot no site (frente Lucas/Rib) e o teste de WhatsApp Flows na POC do pós-atendimento.
3. **Convite ao Google: universal pós-pesquisa, sem filtro por nota** (o desenho NPS 9-10 → Google é review gating na letra da política; sanções documentadas). O insatisfeito recebe adicionalmente o loop interno.
4. **Revisar o termo de atendimento do balcão** (nomear hospital + WhatsApp + finalidade): destrava opt-in Meta e base legal LGPD de uma vez. Bloqueante do disparo.
5. **Levar a CFM 2.454/2026 à diretoria**: avaliação de risco da Ana + Comissão de IA e Telemedicina antes de ~26/08/2026.
6. **Base de conhecimento:** ratificar o ADR-0003 (Sheets → sync → Postgres na fase MV; Central de Comando como UI final).
7. **Corrigir o docs/02** com as divergências D1 a D8 antes de construir os subfluxos; enviar as perguntas à Global Health e ao TI (`ana/api-mv/perguntas-global-health.md`).
8. **Número dedicado para o disparo em massa** do pós-atendimento (isola quality rating; o limite é por portfólio, então a proteção é parcial, mas protege a operação reativa da Ana de um bloqueio de template).

## Impactos no roadmap

| Fase | O que muda |
|---|---|
| Fase 0 (hotfix) | v2 pronto; somar: medir volume de mensagens da Ana (base do custo pós-out/2026); Retry on Fail + filtro `Ativo = S` nas tools de Sheets; comunicar CFM 2.454/2026 à diretoria |
| Fase 1 (MV) | Corrigir docs/02 (D1 a D8) antes de construir; classificador de urgência com gpt-5.4-mini (spec pronta); sync Sheets→Postgres + postgresTool (ADR-0003); golden set + promptfoo + shadow mode antes do canário |
| Fase 2 (expansão) | Item "web-chat via link" sai do roadmap (inviável); entram: widget Chatwoot no site + WhatsApp Flows; Langfuse self-hosted para observabilidade |
| Fase 3 (pós-atendimento) | Templates prontos para submissão; arquitetura analítica especificada; bloqueantes externos: termo de balcão (opt-in + LGPD) e fonte MV com desfecho (`MOT_ALT`); convite Google universal (decisão Felipe); reavaliar custos em 01/set/2026 |

## Novos riscos para a tabela do roadmap

| Severidade | Risco | Mitigação |
|---|---|---|
| Alta | Fim da janela grátis em 01/out/2026 muda a economia da Ana e da coleta | Medir volume agora; recalcular em 01/set; coleta enxuta/Flows |
| Média | CFM 2.454/2026 (vigor ~ago/2026): IA comunicada, avaliação de risco, Comissão de IA | Saudação nova (feito no v2); pauta com a diretoria |
| Média | CPF em texto livre vs política Meta de identificadores sensíveis | Decisão documentada com jurídico; Flows na fase MV |
| Média | Recategorização silenciosa do template (custo ~9x) | Webhook `template_category_update` + alerta; appeal em 60 dias |
| Baixa | Disparo sem opt-in válido (termo atual não cita WhatsApp) | Reescrever termo antes do primeiro disparo |

## Calendário de monitoramento consolidado

| Data | Ação |
|---|---|
| Julho/2026 | Aplicar hotfix; medir volume da Ana; enviar perguntas GH/TI; pauta CFM com a diretoria |
| 01/ago/2026 | Token pricing do Meta Business Agent entra (confirmar que não afeta a Ana) |
| ~26/08/2026 | CFM 2.454/2026 em vigor (saudação nova + deveres institucionais) |
| 01/set/2026 | Meta publica rate card de outubro: recalcular custos (Ana reativa + coleta) |
| 01/out/2026 | Fim da janela grátis: orçamento por mensagem em vigor |
| 30/jun/2027 | Prazo final de migração da WABA para billing BRL |
| Trimestral | Re-verificar preços Meta (mudam só no dia 1 de trimestre) |

## Artefatos entregues nesta sessão

1. `ana/prompt/Ana_System_Prompt_v2.md`: SOP consolidado (hotfix + agendamento), revisado pelas melhores práticas
2. `pos-atendimento/viabilidade-webchat.md`: veredito do link-out com números
3. `docs/adr/0003-base-de-conhecimento.md`: decisão Sheets/Postgres/Central
4. `pos-atendimento/templates-meta.md`: 5 templates + classificação + limites + plano B
5. `docs/06-spec-classificador-urgencia.md`: spec completa + golden set de 135 casos
6. `pos-atendimento/arquitetura-analitica.md`: schema, auditoria, relatórios, loop, conformidade
7. `ana/api-mv/perguntas-global-health.md`: validação das tools + 18 perguntas GH + 20 perguntas TI + hipóteses MV
8. `roadmap/relatorio-pesquisa.md`: este relatório
9. Atualizados: `roadmap/index.html` (roadmap visual) e `roadmap/TODO.md` (MOT_ALT nas queries da Trilha 1)

## Sobre as fontes

Cada artefato lista suas fontes com URL e data. As afirmações de preço e política Meta foram verificadas contra developers.facebook.com e whatsapp.com/legal (acesso 03/jul/2026), com dupla verificação adversarial; a mudança de 01/out/2026 está confirmada apenas em imprensa de negócios (Storyboard18, Business Today, 03/jul/2026) e deve ser reconfirmada no card oficial até 01/set/2026. A CFM 2.454/2026 foi verificada no PDF oficial do CFM. O rate card exato do Brasil (CSV oficial) não é extraível programaticamente: baixar manualmente em business.whatsapp.com/products/platform-pricing#rates para fechar os centavos (tarefa de 5 minutos).
