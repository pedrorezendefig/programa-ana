# Viabilidade: WhatsApp com link para chat na web (link-out)

> Relatório da frente 1 da pesquisa ultracode (03/jul/2026). Avalia a ideia do diretor: um template de WhatsApp com botão de call-to-action (CTA URL) levando o paciente para uma página de chat na web, com a mesma IA da Ana e as mesmas tags no CRM, tirando a conversa do WhatsApp para reduzir custo.
>
> Todas as afirmações de custo e política passaram por verificação adversarial (refutador + auditor de fontes) em 03/jul/2026. Câmbio de referência: R$ 5,20/US$ (PTAX de 03/jul/2026).

## Veredito

**Inviável como mecanismo de economia nas regras vigentes: a economia de tarifas Meta do link-out é zero no cenário base.** Viável apenas em nicho, como canal adicional no site do hospital (não como deflection). Reavaliar uma única vez em setembro/2026, quando a Meta publicar as tarifas do fim da janela grátis (ver seção 6), mas mesmo nesse cenário a resposta dominante é outra (WhatsApp Flows), não o link-out.

A premissa de custo da ideia está errada em dois pontos, verificados na fonte primária da Meta:

1. **O fluxo reativo da Ana já é gratuito hoje.** Desde 01/jul/2025 a Meta cobra por mensagem e só cobra templates entregues. Toda a conversa dentro da janela de atendimento de 24h aberta pelo paciente (texto livre, mídia e até templates utility) é gratuita, e cada mensagem do paciente renova a janela. Não há custo a deslocar para a web no atendimento reativo.
2. **No disparo proativo, o único custo é o template de abertura, pago de qualquer jeito.** O preço do template é da categoria (utility/marketing) e do país; não muda por ter botão CTA URL. As mensagens seguintes, que o link-out "tiraria" do WhatsApp, já seriam gratuitas na janela de 24h aberta pela resposta do paciente.

E o link-out ainda **destrói valor**: clicar em botão CTA URL não abre a janela de 24h (só mensagem do paciente abre; quick reply abre porque envia mensagem). O hospital paga o template e não ganha o canal de retorno gratuito. E cada etapa extra de funil (clique + engajar na página) perde respondentes: nosso modelo indica custo por resposta ~2x maior.

## 1. A conta, com as regras vigentes (jul/2026)

### 1.1 Regras de cobrança da Meta (fonte primária, acesso 03/jul/2026)

Fonte: developers.facebook.com/documentation/business-messaging/whatsapp/pricing (equivalente a /docs/whatsapp/pricing). Confirmado por dois verificadores independentes:

- **Por mensagem desde 01/jul/2025:** "You are only charged when a template message is delivered."
- **Não-template é grátis:** "All non-template messages are free" (só podem ser enviadas dentro de janela de atendimento aberta).
- **Janela de 24h:** abre quando o paciente envia mensagem (ou liga); cada nova mensagem renova.
- **Utility na janela é grátis:** "Utility templates delivered within an open customer service window are free." (Marketing é cobrado mesmo dentro da janela.)
- **Free Entry Point (72h):** conversa vinda de anúncio click-to-WhatsApp ou botão CTA de Página do Facebook, respondida em 24h, abre janela de 72h totalmente gratuita (inclusive templates).
- **Clique em CTA URL não abre janela** (não gera mensagem inbound). Quick reply abre (envia mensagem).
- **Billing em BRL:** contas brasileiras elegíveis podem faturar em moeda local desde 01/jul/2026.

### 1.2 Tarifas para o Brasil (rate card por mensagem, 2026)

| Categoria | USD/mensagem entregue | BRL (R$ 5,20/US$) | Verificação |
|---|---|---|---|
| Service (não-template na janela de 24h) | 0,00 | 0,00 | Primária Meta (até 30/set/2026, ver seção 6) |
| Utility (fora da janela) | 0,0068 (tier base; ~0,0065 acima de 1.000/mês) | ~R$ 0,035 | Convergência de 3+ fontes 2026 (Flowcall, Blueticks, Message Central, EngageLab); página oficial de rate card renderiza via JS |
| Utility (dentro da janela) | 0,00 | 0,00 | Primária Meta |
| Marketing | 0,0625 (flat, sem tiers) | ~R$ 0,325 | Convergência de fontes; flat confirmado |
| Authentication | 0,0068 | ~R$ 0,035 | Fontes 2026 (o valor 0,0315 usado antes era do modelo antigo por conversa) |

O fator utility vs marketing é **~9x** (0,0625/0,0068), não os "6x" do briefing (que usava a tarifa antiga de utility). Validar os centavos exatos na fatura do BSP com a amostra pequena do teste de template, antes de escalar.

### 1.3 Custo do disparo proativo (o dinheiro real)

25 a 35 mil templates de abertura/mês:

| Cenário | USD/mês | BRL/mês (5,20) |
|---|---|---|
| 100% utility (0,0068) | 170 a 238 | ~880 a 1.240 |
| 100% marketing (0,0625) | 1.562 a 2.187 | ~8.100 a 11.400 |

O fator de risco de ~9x mora na **classificação do template** (ver `pos-atendimento/templates-meta.md`), não no canal da conversa subsequente. O link-out não protege disso: template com link externo tem, se algo, mais cara de marketing para o classificador da Meta.

### 1.4 A economia do link-out, por paciente

**Desenho A (responder na thread):** 1 template pago → paciente responde (abre janela) → toda a conversa de pesquisa é grátis por 24h renováveis. Custo Meta: 1 template.

**Desenho B (link-out):** 1 template pago (mesma tarifa, o botão não muda o preço) → paciente clica (janela NÃO abre) → conversa na web (custo Meta zero, como no Desenho A). Custo Meta: 1 template.

**Diferença: US$ 0,00.** A única economia teórica são templates de reengajamento evitados quando a conversa atravessa a janela de 24h. Quantificando com premissa explícita: numa pesquisa de satisfação que dura minutos, se ~13 a 18% dos casos precisassem de 1 template utility de retomada, seriam ~R$ 120 a 200/mês; o teto absoluto (1 retomada utility para 100% dos 25 a 35 mil disparos, cenário irreal) seria ~R$ 880 a 1.240/mês. Contra isso, o Desenho B perde ~metade das respostas (seção 3) e cria custos novos (seção 4).

Pior: se o paciente clica no link e não responde na thread, a janela de 24h nunca abre. Fechar o loop da reclamação depois exige novo template pago. O Desenho B treina o paciente a não abrir a janela gratuita que o hospital pagou para tentar abrir.

## 2. Viabilidade técnica (se mesmo assim quiséssemos)

- **Chatwoot website widget é nativo e gratuito** na instância self-hosted que o hospital já opera (canal Website, snippet no site, pre-chat form, CSAT). Fonte: docs oficiais Chatwoot, acesso 03/jul/2026.
- **O mesmo workflow n8n da Ana atende o widget**, roteando por `inbox_id` (o webhook de `message_created` traz o inbox; padrões públicos de workflow multicanal existem). Adaptações: comportamento por canal, anexos com UX inferior, estado em `custom_attributes` funciona igual.
- **O ponto frágil é a identidade entre canais.** No WhatsApp o contato é o telefone verificado; no widget o visitante é anônimo até `setUser(identifier, {identifier_hash HMAC-SHA256})`. Ligar o clique ao contato exigiria token de paciente na URL (dado pessoal em URL: vaza por histórico, logs e referer; exigiria token opaco de uso único). O merge de contatos do Chatwoot tem histórico de bugs (merge automático indevido por email igual, issues 2811 e 4728), criando risco concreto de contatos duplicados, exatamente o que o CRM e o relatório do pós-atendimento não podem ter.
- Estimativa: 2 a 4 semanas de engenharia + superfície permanente de manutenção. Nada é bloqueador; o bloqueador é a ausência de benefício.

## 3. Benchmarks honestos: thread vs link-out

Todos os benchmarks públicos vêm de vendors (viés comercial, metodologia raramente publicada, nenhum recorte de saúde). Faixas em 03/jul/2026:

- CTR de botão URL em template: 12 a 25% no típico (fontes otimistas citam 40 a 60%, sem amostra publicada).
- Resposta na própria thread (broadcast): 20 a 30% média; 35%+ forte; 45%+ em lista bem segmentada.
- O que é sólido: responder na thread é 1 toque; clicar e engajar numa página são 2+ etapas; cada etapa perde gente; CTR mede clique, não conclusão.

Funil modelado (30 mil disparos/mês, utility, premissas explícitas: 97% entrega; 25% resposta na thread vs 20% clique; 90% vs 60% de conclusão):

| | Thread | Link-out |
|---|---|---|
| Respostas completas | ~6.500 | ~3.500 |
| Custo Meta/mês | US$ 204 | US$ 204 |
| Custo por resposta | ~US$ 0,031 | ~US$ 0,058 |

São estimativas de direção, não decimais. Para qualquer combinação plausível dos benchmarks, o link-out paga o mesmo à Meta e colhe menos respostas. Para o pós-atendimento, cuja matéria-prima é resposta de paciente, é destruição direta de valor.

**Quem fez:** não encontramos nenhum caso documentado de deflection de WhatsApp para web chat, em nenhum setor, em buscas em inglês e português. O movimento documentado é o inverso: a Centrica (British Gas) ofereceu no IVR a migração para WhatsApp, 5% aceitaram e o NPS foi a +60/+40 por linha de serviço (case study da Webex/imimobile, Cisco; a atribuição ao blog da Infobip na primeira versão desta pesquisa estava errada e foi corrigida). No Brasil, ~99% dos smartphones têm WhatsApp e 86% usam diariamente (Statista); para o público classe C/D da Zona Oeste, a página de chat na web é território estranho. A própria Meta subsidia o sentido contrário (Free Entry Point de 72h para quem entra no WhatsApp por anúncio).

## 4. Custos ocultos do link-out

1. Página + widget: build inicial, hospedagem, QA em dois canais a cada mudança de prompt, manutenção permanente.
2. Perda do funil pago: clique não abre janela; fechar loop custa outro template (seção 1.4).
3. Contatos duplicados no Chatwoot (merge frágil) quebrando histórico unificado e agregação por paciente.
4. Identidade verificada: na web, qualquer pessoa com o link responde em nome do paciente (token de uso único mitiga, com mais engenharia).
5. LGPD nova: dado sensível de saúde (art. 11) em sessão web com cookies/localStorage (Guia de Cookies da ANPD, out/2022), identificador de paciente em URL. Nada impeditivo, mas é trabalho jurídico e técnico novo para substituir canal já enquadrado.
6. Nuance honesta sobre criptografia: na Cloud API a Meta já processa as mensagens como operadora; a perda real do link-out está na identidade verificada e na persistência, não na cifra. Uma página com TLS é comparável em trânsito.

## 5. Alternativas que capturam o valor da ideia

1. **Widget do Chatwoot no site do hospital como canal ADICIONAL (recomendada).** A intuição correta do diretor (atendimento IA na web), invertida: atender quem já está no site, sem tirar ninguém do WhatsApp. Software já pago, mesmo workflow, pre-chat form pedindo telefone para conectar ao CRM. Esforço: dias. Encaixa na frente do site (Lucas e Rib).
2. **WhatsApp Flows para experiência estruturada dentro do WhatsApp.** Formulários nativos (nota NPS, campo aberto, telas condicionais) sem sair do app e sem custo além da mensagem que os entrega; dentro da janela, grátis hoje. Vendors reportam conclusão acima de 80% (ex.: Farmacias del Ahorro, 2,6x agendamentos, página oficial Meta). Vira o candidato natural da pesquisa de satisfação, e ganha força no cenário pós-out/2026 (seção 6).
3. **Baseline: responder na própria thread.** O desenho já decidido. O link-out não o bate em nenhuma métrica.

## 6. Adendo crítico: fim da janela grátis em 01/out/2026

Achado da frente 2, confirmado por verificação independente (imprensa de negócios em 03/jul/2026; ainda NÃO refletido na documentação oficial da Meta): **a partir de 01/out/2026 a Meta passa a cobrar mensagens de serviço (não-template) e encerra a isenção de templates utility dentro da janela de 24h**, a tarifas "similares às de utility/authentication" de cada país, com rate card oficial prometido até 01/set/2026. Mensagens enviadas pelo Meta Business Agent (o agente de IA da própria Meta) ficam isentas; bots próprios como a Ana, não.

O que muda se confirmar como anunciado (estimativa a US$ 0,0068/msg, R$ 5,20):

- **Ana reativa deixa de custar ~zero:** cada resposta da Ana passa a custar ~R$ 0,035. O custo passa a depender do volume real de mensagens da Ana (a medir; ver `roadmap/relatorio-pesquisa.md`).
- **A conversa de coleta do pós-atendimento passa a custar:** ~6.500 respostas/mês com 6 a 10 mensagens da empresa cada = ~40 a 65 mil mensagens = ~US$ 270 a 440/mês (~R$ 1.400 a 2.300).
- **O teto de economia do link-out sobe para ~R$ 800 a 2.200/mês** (a conta da frente 2). Deixa de ser zero, mas continua enfrentando os mesmos contras: metade das respostas, engenharia, merge, LGPD.
- **A resposta racional não é o link-out, é reduzir mensagens por conversa:** WhatsApp Flows empacota a pesquisa inteira (nota + campo aberto) em 1 a 2 mensagens em vez de 6 a 10, cortando ~80% do custo novo sem sair do WhatsApp e sem perder metade das respostas.

**Ação:** recalcular em set/2026 com o rate card oficial; antecipar o teste de WhatsApp Flows na POC do pós-atendimento; monitorar a página oficial de pricing (a Meta atualiza tarifas no primeiro dia de cada trimestre).

## 7. Cenários em que o link-out faria sentido

1. Meta cobrando a conversa na janela: acontece em out/2026, mas a resposta dominante é Flows/roteiro curto, não link-out (seção 6).
2. Conversas longas de múltiplos dias iniciadas pela empresa: teto de economia modesto e não é o perfil da pesquisa nem da Ana.
3. Experiências impossíveis no WhatsApp (dashboard interativo, upload pesado, pagamento em página): não é o caso do hospital; Flows cobre formulário estruturado.
4. Pacientes sem WhatsApp: o link-out pressupõe WhatsApp (o template chega por lá); quem não tem WhatsApp é atendido pela alternativa do widget no site.

## Recomendação de comunicação ao Felipe

Reconhecer o objetivo legítimo (controlar o custo do disparo proativo) e mostrar três coisas: (1) o custo mora na classificação do template (fator ~9x), não no canal da conversa; (2) a ideia da presença web vira o widget do Chatwoot no site, como canal novo de entrada, sem canibalizar o WhatsApp; (3) a mudança de out/2026 é real e a defesa é encurtar a conversa (Flows), não tirá-la do WhatsApp.

## Fontes principais

| Afirmação | Fonte | Tipo | Data |
|---|---|---|---|
| Cobrança por template entregue desde 01/jul/2025; não-template grátis; utility grátis na janela; FEP 72h; CTA URL não abre janela | developers.facebook.com/documentation/business-messaging/whatsapp/pricing | Primária (Meta) | acesso 03/jul/2026 |
| Utility Brasil US$ 0,0068 (tiers); marketing US$ 0,0625 flat | Flowcall, Blueticks, Message Central, EngageLab (convergência) | Secundária | 2026 |
| Fim da janela grátis em 01/out/2026; tarifas até 01/set/2026 | Business Today e Storyboard18 (anúncio Meta, ainda fora da doc oficial) | Secundária (imprensa) | 03/jul/2026 |
| Widget website nativo, pre-chat form, setUser + HMAC | chatwoot.com/docs e help center | Primária (Chatwoot) | acesso 03/jul/2026 |
| Bugs de merge de contatos | github.com/chatwoot/chatwoot issues 2811 e 4728 | Primária (issues) | acesso 03/jul/2026 |
| CTR 12 a 25%; resposta na thread 20 a 45% | ChatArchitect, Sendwo (18/ago/2025), Raion Tech | Secundária (vendor) | 2025/2026 |
| Caso Centrica (IVR para WhatsApp, 5%, NPS +60/+40) | Case study Webex/imimobile (Cisco) | Secundária (case) | acesso 03/jul/2026 |
| WhatsApp ~99% dos smartphones no Brasil | Statista | Secundária | acesso 03/jul/2026 |
| WhatsApp Flows (formulários nativos, sem custo extra) | whatsappbusiness.com/products/whatsapp-flows | Primária (Meta) | acesso 03/jul/2026 |
| LGPD art. 11; Guia de Cookies ANPD | planalto.gov.br; gov.br/anpd | Primária (lei/regulador) | vigente |

**Lacunas declaradas:** nenhum caso de deflection WhatsApp→web encontrado (em qualquer setor); nenhum benchmark de saúde no Brasil; rate card oficial da Meta não legível por fetch direto (página JS), valores confirmados por convergência de 3+ fontes; validar centavos na fatura do BSP durante o teste de template.
