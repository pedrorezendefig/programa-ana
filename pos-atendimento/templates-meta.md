# Templates Meta do pós-atendimento: drafts e análise de classificação

> Frente 2 da pesquisa ultracode (03/jul/2026). Drafts dos templates de abertura do disparo proativo, análise de classificação utility vs marketing com a política vigente da Meta, limites de disparo, plano B de custo e calendário de monitoramento. Afirmações de preço e política verificadas adversarialmente em fontes primárias (developers.facebook.com), acesso 03/jul/2026. Câmbio de referência: R$ 5,20/US$ (PTAX 02/jul/2026).

## Resumo executivo

1. **Pesquisa de satisfação vinculada a um atendimento específico é caso de uso OFICIAL de template utility.** A doc de categorização da Meta traz exemplo quase idêntico ao nosso ("Your feedback ensures we continually improve. Please click below to share your thoughts on your recent visit at our store location.") e a regra de ouro: "A general/generic survey or request for feedback will not be approved as utility." Ancorar cada template em data + serviço do atendimento não é estilo, é o critério literal de aprovação.
2. **Custos (25 a 35 mil disparos/mês):** utility US$ 170 a 280/mês (~R$ 0,9 a 1,5 mil); marketing US$ 1.562 a 2.187/mês (~R$ 8,1 a 11,4 mil). O fator é **~9x** (0,0625/0,0068), maior que o 6x do briefing (que usava a tarifa antiga de utility).
3. **Risco de reclassificação é real e silencioso:** desde 09/abr/2025 um template submetido como utility que a Meta julgue promocional é aprovado direto como MARKETING; desde 16/abr/2025, negócio já advertido é recategorizado sem aviso. Monitorar via webhook `template_category_update` é obrigatório (a mudança muda o custo em ~9x direto na fatura).
4. **Mudança de 01/out/2026 (anunciada, card oficial até 01/set/2026):** acaba a gratuidade da janela de 24h; mensagens de serviço e utility na janela passam a ser cobradas a tarifa ~utility. A conversa de coleta passa a custar ~US$ 150 a 420/mês, e a premissa "Ana reativa custa ~zero" expira. Desenhar a coleta enxuta (4 a 6 mensagens do bot) e reavaliar WhatsApp Flows (empacota a pesquisa em 1 a 2 mensagens).
5. **Plano B sólido:** se reclassificar e o appeal falhar, amostragem estatística (1,5 a 6,4 mil disparos/mês) mantém o relatório de gestão válido por US$ 95 a 400/mês mesmo em tarifa marketing.

## 1. Regras de redação para maximizar chance de utility

Derivadas da doc oficial de template categorization (acesso 03/jul/2026):

1. **Ancorar na transação:** citar o atendimento específico (data, serviço, setor). Critério literal da doc.
2. **Zero conteúdo promocional:** sem oferta, cupom, "conheça nossos serviços", emoji comercial. Conteúdo misto = template inteiro vira marketing.
3. **Tom transacional e curto:** propósito único (feedback do atendimento realizado).
4. **Exemplos de variáveis coerentes no cadastro:** os exemplos de {{1}}, {{2}} devem reforçar o caráter transacional (nome, data, setor). Exemplo genérico convida à recategorização.
5. **Botões: preferir quick reply, evitar URL.** Dois motivos: (a) link externo é traço típico de marketing para o classificador; (b) o clique em quick reply envia uma mensagem e ABRE a janela de 24h gratuita; o clique em botão URL não abre janela nenhuma (verificado na doc de pricing). O quick reply é o gatilho da coleta gratuita.
6. **Opt-out em toda mensagem proativa** ("responda SAIR"): exigido pela Business Messaging Policy (honrar pedidos de parada) e protege o quality rating.

## 2. Drafts dos templates (catálogo inicial)

Todos submetidos como UTILITY, idioma pt_BR, categoria de uso "pesquisa pós-atendimento". A coleta (NPS + pergunta aberta) acontece DENTRO da janela aberta pela resposta, não no template.

### T1. Abertura: exame eletivo

```
Olá, {{1}}. Aqui é o Hospital São Matheus.

Você realizou {{2}} no dia {{3}} e queremos saber como foi sua experiência, para melhorar nosso atendimento. Pode nos contar?

Para não receber pesquisas, responda SAIR.
```
Variáveis (exemplos no cadastro): {{1}} = "Maria", {{2}} = "um exame de ultrassonografia", {{3}} = "02/07".
Botões (quick reply): `Responder pesquisa` | `SAIR`.
Análise: espelha o exemplo oficial 2 da Meta (feedback de visita específica). Sem promoção, sem URL. Risco de reclassificação: baixo.

### T2. Abertura: consulta ambulatorial

```
Olá, {{1}}. Aqui é o Hospital São Matheus.

Você teve uma consulta de {{2}} no dia {{3}} e sua opinião nos ajuda a melhorar. Como foi sua experiência?

Para não receber pesquisas, responda SAIR.
```
Variáveis: {{1}} = "João", {{2}} = "cardiologia", {{3}} = "01/07".
Botões (quick reply): `Avaliar atendimento` | `SAIR`.
Análise: mesma âncora transacional. Risco: baixo.

### T3. Abertura: cirurgia eletiva (tom mais cuidadoso)

```
Olá, {{1}}. Aqui é o Hospital São Matheus.

Você esteve conosco no dia {{2}} para um procedimento e queremos saber como foi sua experiência com nossa equipe e estrutura. Pode nos contar?

Para não receber pesquisas, responda SAIR.
```
Variáveis: {{1}} = "Ana", {{2}} = "30/06".
Botões (quick reply): `Responder` | `SAIR`.
Análise: não nomeia o procedimento no template (privacidade: o texto do template chega em notificação de tela). Não presume desfecho ("esperamos que esteja tudo bem" foi evitado de propósito; mesmo no eletivo, o desfecho pode ter sido ruim). Risco de categoria: baixo.

### T4. Retomada de loop aberto (usar com parcimônia)

```
Olá, {{1}}. Aqui é o Hospital São Matheus.

Sobre o relato que você nos enviou em {{2}}: ele foi encaminhado ao setor responsável e está em apuração. Se quiser acrescentar alguma informação, é só responder esta mensagem.
```
Análise: utility clássico (atualização de status de uma solicitação do usuário). É o template pago que fecha o loop quando a janela de 24h expirou. Risco: baixo.

### T5. Fechamento de loop (retorno ao paciente que criticou)

```
Olá, {{1}}. Aqui é o Hospital São Matheus.

Sobre sua resposta à pesquisa do atendimento de {{2}}: sua observação foi analisada pelo setor responsável e medidas de melhoria estão em andamento. Obrigado por nos ajudar a melhorar.
```
Análise: utility (follow-up de interação específica). Atenção jurídica: não admitir culpa nem prometer providência específica (mesma regra da ouvidoria da Ana); "medidas de melhoria em andamento" é o teto do que se afirma. Risco de categoria: baixo; risco jurídico controlado pela redação.

### O que NUNCA entra em nenhum template

- Convite ao Google condicionado à nota (review gating; ver `pos-atendimento/arquitetura-analitica.md`).
- Oferta, desconto, novidade de serviço, campanha de check-up (isso é marketing, e mistura recategoriza o template inteiro).
- Nome de doença, resultado ou detalhe clínico (o template aparece em notificação; privacidade).

## 3. Processo de validação antes de escalar

1. Submeter como UTILITY e conferir a categoria de APROVAÇÃO no retorno da API/webhook (desde abr/2025 pode ser aprovado já como MARKETING, sem rejeição).
2. Se aprovado como marketing: simplificar o texto e apelar em WhatsApp Manager > Business Support > Template Category Updates (prazo de 60 dias).
3. Piloto com 200 a 500 envios dentro do tier inicial, monitorando: categoria efetivamente cobrada na fatura, block rate, quality rating do número, taxa de resposta por template (T1 vs T2 vs T3).
4. Assinar no n8n os webhooks `template_category_update` e `message_template_status_update`, com alerta imediato (recategorização = custo ~9x sem aviso na fatura).
5. Só então escalar volume, seguindo a rampa de tiers (seção 4).

## 4. Limites de disparo e qualidade do número (reforma de 07/out/2025)

Verificado em fonte primária (developers.facebook.com/docs/whatsapp/messaging-limits), 2 verificadores:

- Limites por **portfólio de negócio** (todos os números compartilham): **250 → 2.000 → 10.000 → 100.000 → ilimitado** destinatários únicos por período móvel de 24h (mede usuários únicos alcançados fora de janela aberta). O tier de 1.000 do modelo antigo virou 2.000.
- Sair de 250: verificar o negócio, OU enviar 2.000 mensagens entregues fora de janela para números únicos em 30 dias com templates de alta qualidade.
- Escalada automática (em até 6h): qualidade alta em todos os números e templates + uso de pelo menos metade do limite atual nos últimos 7 dias.
- O status Flagged foi extinto: queda de qualidade não rebaixa mais o tier, mas **trava a subida**. Template com rating vermelho é pausado (3h, depois 6h, depois desativado).
- **Volume alvo do hospital: 25 a 35 mil/mês = ~1.100 a 1.600/dia útil. Cabe no tier 2.000 desde o início (com negócio verificado); rampa realista até o tier 10.000 em ~2 semanas** (operar ≥50% do limite por 7 dias com qualidade alta).
- Alerta arquitetural: número separado para o pós-atendimento NÃO isola o limite (é por portfólio), mas isola o quality rating por número e a percepção do paciente. Vale usar número separado, sabendo que qualidade ruim nele trava a escalada do portfólio inteiro (incluindo o número da Ana).
- Higiene de qualidade: opt-out em toda mensagem, supressão imediata, envio espalhado no dia (sem rajada), começar pelo eletivo, monitorar block reasons semanalmente no WhatsApp Manager.

## 5. Custos consolidados

Tarifas por mensagem entregue, Brasil (rate card per-message; utility com tiers de volume, marketing flat):

| Cenário do disparo | 25.000/mês | 30.000/mês | 35.000/mês |
|---|---|---|---|
| 100% utility (US$ 0,0068 tier base) | US$ 170 / R$ 884 | US$ 204 / R$ 1.061 | US$ 238 / R$ 1.238 |
| 100% utility (US$ 0,008 conservador) | US$ 200 / R$ 1.040 | US$ 240 / R$ 1.248 | US$ 280 / R$ 1.456 |
| Misto 80/20 | US$ 472 / R$ 2.457 | US$ 567 / R$ 2.948 | US$ 661 / R$ 3.440 |
| 100% marketing (US$ 0,0625) | US$ 1.562 / R$ 8.125 | US$ 1.875 / R$ 9.750 | US$ 2.187 / R$ 11.375 |
| 100% marketing (card jul/2026 US$ 0,07188, só SleekFlow, confirmar no CSV oficial) | US$ 1.797 / R$ 9.344 | US$ 2.156 / R$ 11.213 | US$ 2.516 / R$ 13.082 |

A partir de 01/out/2026, somar a coleta (estimativa ~US$ 0,008/mensagem do bot; 25% resposta, 6 mensagens/coleta): +US$ 300/mês em 25 mil, +US$ 420/mês em 35 mil. Total utility pós-out/2026: **~R$ 2,6 a 3,6 mil/mês tudo dentro**, ainda viável. WhatsApp Flows reduz a coleta a 1 a 2 mensagens (cortaria ~70 a 80% desse custo novo); testar na POC.

**Billing em BRL:** desde 01/jul/2026 WABAs brasileiras elegíveis faturam em BRL (entidade local da Meta); migração obrigatória até 30/jun/2027. Confirmar com o BSP quando a WABA do hospital migra e se o card BRL embute impostos.

## 6. Plano B se reclassificar para marketing

Na ordem de preferência:

1. **Amostragem estatística (recomendada).** O relatório de gestão não precisa de censo. Com 95% de confiança: ±5% global = ~380 respostas/mês = ~1.520 disparos (25% resposta) = US$ 95/mês em marketing; ±7% por setor (8 setores) = ~6.400 disparos = US$ 400/mês. Perde-se volume de convites ao Google e granularidade nominal por profissional (acumular meses); o produto analítico central sobrevive.
2. **Manter censo só nos setores prioritários do mês** e amostrar o resto (híbrido).
3. **SMS** (R$ 0,05 a 0,065/envio): 5 a 6x mais barato que marketing WhatsApp por disparo, mas sem conversa rica (coleta viraria link para formulário) e com taxa de resposta muito inferior; custo por resposta provavelmente pior. Fallback de canal, não plano principal.
4. **E-mail:** custo ~zero, base de e-mail do público classe C/D tende a ser incompleta; canal complementar apenas.

Regra de decisão: enquanto utility, censo completo. Se reclassificar, apelar (60 dias); se o appeal falhar, cair para amostragem estratificada.

## 7. Calendário de monitoramento

| Data | O quê |
|---|---|
| 01/ago/2026 | Token pricing do Meta Business Agent entra (não afeta a Ana; confirmar que não afeta) |
| 01/set/2026 | Meta publica o rate card de outubro. Recalcular custos de coleta e da Ana reativa |
| 01/out/2026 | Fim da janela grátis. Orçamento passa a incluir mensagens de serviço |
| 30/jun/2027 | Prazo final de migração da WABA para billing BRL |
| Contínuo | Webhooks `template_category_update` e `message_template_status_update`; quality rating e block reasons semanais; re-verificação trimestral de preços (a Meta muda tarifa só no dia 1 de trimestre) |

## 8. Incertezas declaradas

- CSV oficial do rate card Brasil jul/2026 não extraível programaticamente (página JS); valores por convergência de 3+ fontes. Baixar manualmente em business.whatsapp.com/products/platform-pricing#rates e confirmar (tarefa de 5 minutos).
- O valor marketing US$ 0,07188 "a partir de 01/jul/2026" tem fonte única (SleekFlow); tratar como stress case até confirmação.
- Tarifas oficiais de out/2026 saem até 01/set/2026; as estimativas de coleta usam ~tarifa utility conforme o anúncio.
- Taxa de resposta de pesquisa em saúde no Brasil: sem benchmark confiável; faixa de trabalho 15 a 25%, calibrar no piloto.
- Cortes exatos dos volume tiers de utility do Brasil: não publicados em fonte aberta; irrelevantes no nosso volume.

## Fontes principais

1. developers.facebook.com/documentation/business-messaging/whatsapp/pricing (primária; per-message 01/jul/2025; gratuidades vigentes; billing BRL; acesso 03/jul/2026)
2. developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization (primária; exemplos de survey utility; regra de especificidade; recategorização abr/2025; appeal 60 dias; acesso 03/jul/2026)
3. developers.facebook.com/docs/whatsapp/messaging-limits + upcoming-messaging-limits-changes (primária; reforma out/2025; tiers; escalada 6h; acesso 03/jul/2026)
4. developers.facebook.com/documentation/business-messaging/whatsapp/pricing/ai-providers (primária; AI Providers Brasil desde 11/mar/2026, não atinge a Ana; acesso 03/jul/2026)
5. Storyboard18 + BusinessToday (03/jul/2026): fim da janela grátis 01/out/2026, token pricing Meta Business Agent 01/ago/2026 (anúncio; ainda fora da doc oficial)
6. Message Central (21/mai/2026), Wiichat (jun/2026), Flowcall, EngageLab, SleekFlow (03/jul/2026): rate card Brasil por convergência
7. BCB PTAX 02/jul/2026 (R$ 5,1945/US$)
