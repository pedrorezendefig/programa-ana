# Prompt para a sessão ultracode — Programa Ana (Hospital São Matheus)

> Copiar tudo abaixo da linha e colar numa sessão nova do Claude Code (Fable 5) aberta em `/Users/pedrorezende/PedroDev/n8n Fluxos`, com a palavra-chave **ultracode** mantida no início.

---

ultracode

## Contexto

Você está no repositório do Programa Ana & CRM do Hospital São Matheus (Bangu/RJ). Antes de qualquer coisa, leia nesta ordem:

1. `README.md` e `CONTEXT.md` (mapa do repo e glossário canônico do domínio)
2. `ana/briefings/Briefing-Tecnico_Ana-e-Pos-Atendimento_para-Pedro.md` (briefing do diretor Felipe Malafaia, jun/2026)
3. `ana/prompt/Ana_System_Prompt.md` (prompt em produção, idêntico ao nó do n8n)
4. `docs/00-visao-geral.md` até `docs/05-guia-implementacao-n8n.md` (a integração de agendamento já projetada)
5. `ana/api-mv/doc_whatsapp_agendamento_1.10.pdf` (API Global Health/MV, v1.10)
6. `ana/workflows/Ana.json` (export fiel do workflow em produção: 68 nós, gpt-5.2, memória Postgres janela 15, buffer/debounce 8s + lock, RAG via Google Sheets)

O MCP do n8n está disponível somente para leitura e execução (`search_workflows`, `get_workflow_details`, `execute_workflow`). Não há como editar workflows por ele. Não altere nada em produção.

## Decisões já fechadas — não re-litigar

- Ana é agente único com três modos (atendimento, comercial, ouvidoria); pós-atendimento é agente separado, proativo e analítico.
- Sequência: hotfix do prompt em produção primeiro, integração MV depois (MVP = tools T1, T2, T5, T6, T7 do doc 02).
- Urgência: seção no topo do SOP como nova Regra Global 1 (hotfix) + classificador dedicado antes do agente (fase MV).
- Regra Global 6 reescrita: Ana se apresenta como assistente virtual quando perguntada, sem negar ser IA, sem expor detalhes técnicos.
- Ouvidoria: regra de exclusão dura (tag `ouvidoria` desliga o modo comercial na thread) + guardrails jurídicos (nunca admitir culpa, nunca prometer providência específica, nunca dar parecer, nunca desencorajar registro formal).
- Pós-atendimento: dois mecanismos (escuta interna sem filtro + motor de reputação sem review gating); disparo começa só pelo eletivo; emergência/obstetrícia apenas com filtro de desfecho vindo do MV.
- O apontamento I.5 do briefing (mensagens comerciais "secas") está parcialmente superado: a base RAG já tem coluna de diferenciais por especialidade que alimenta a ancoragem de valor. Não tratar como lacuna; tratar como mecanismo a refinar.

## Fatos verificados (não redescobrir)

- Meta/WhatsApp cobra por mensagem desde jul/2025. Brasil 2026: marketing ~US$ 0,0625/msg, utility ~US$ 0,008/msg, autenticação ~US$ 0,0315. Mensagens de texto livre e templates utility dentro da janela de 24h aberta pelo cliente são gratuitos. O fluxo reativo da Ana custa ~zero; o custo real está no disparo proativo do pós-atendimento (1 template de abertura por paciente, 25 a 35 mil/mês).
- O prompt em produção tem a numeração das Regras Globais começando em 2 (não existe Regra 1; o SOP reescrito em docs/04 já corrige e adiciona regras 11 a 18 de agendamento).
- Não existe nenhuma integração com a API Global Health no n8n hoje; é 100% Google Sheets + Chatwoot.
- Há um `api_access_token` do Chatwoot hardcoded em nós HTTP dos workflows (dívida de segurança já mapeada; a correção é migrar para Credential do n8n e rotacionar o token).

## Frentes de pesquisa (fan-out multi-agente, verificação adversarial das afirmações, fontes citadas)

1. **Ideia do diretor: WhatsApp → link → chat na web.** Um template com call-to-action leva o paciente para uma página de chat (mesma IA, aplicando tags), tirando a conversa do WhatsApp. Investigar TODOS os ângulos: viabilidade técnica e de negócio; custo real (corrigindo a premissa: a conversa reativa no WhatsApp já é grátis na janela de 24h, então o ganho só existe no proativo); rate limits e messaging limits da Meta; quem já fez (deflection para web chat); quem tentou e abandonou, e por quê; taxa de clique/conversão típica de link-out vs responder na thread (benchmark honesto); custos ocultos (manter widget, perder identidade verificada do WhatsApp, fricção mobile, LGPD de sessão web); alternativas que atacam o mesmo problema (Chatwoot website widget nativo, que o hospital já tem de graça; WhatsApp Flows para formulários dentro do próprio WhatsApp). Conclusão: viável ou não, em qual cenário, com números.
2. **Economia Meta 2026 aplicada ao hospital.** Classificação utility vs marketing de template de pesquisa de satisfação (risco de reclassificação unilateral); billing em BRL; limites de disparo por qualidade do número (250 a 1.000/dia iniciais e escalada); estratégia de template de abertura que maximize chance de utility; plano B de custo se reclassificar para marketing.
3. **Melhores práticas 2026 de agente único multi-modo em saúde no WhatsApp.** Padrões de triagem de urgência em chatbots de saúde (como garantir falso-negativo próximo de zero); guardrails jurídicos de ouvidoria; disciplina de tool-use (nunca responder de memória); avaliação/evals de prompts de produção; shadow mode e canário para agentes conversacionais.
4. **Classificador de urgência dedicado.** Arquitetura no n8n (nó antes do agente), escolha de modelo (pequeno e rápido vs regras híbridas), latência e custo por mensagem, dataset de sinais em pt-BR (incluindo gírias e erros de digitação), como medir e monitorar falso-negativo em produção.
5. **Base de conhecimento: Google Sheets vs Supabase vs Postgres existente.** O requisito do cliente: alguém do hospital edita valores/diferenciais como se fosse planilha. Avaliar nós n8n disponíveis, latência do RAG atual (Sheets a cada chamada), cache, e a hipótese de a Central de Comando (frente Lucas/Rib) virar a UI de edição. Entregar recomendação com trade-offs.
6. **Pós-atendimento: arquitetura da camada analítica.** Banco para respostas classificadas, classificação por IA com auditoria amostral (atenção redobrada em atribuição nominal a profissionais), agregação e relatórios evolutivos por setor/profissional/período, fechamento de loop com quem criticou, opt-out, conformidade com política do Google (sem review gating) e LGPD (base legal do contato proativo).
7. **API Global Health/MV e dados.** Validar o desenho das 7 tools (docs/02) contra a doc v1.10; listar o que a doc NÃO responde (rate limit, concorrência, comportamento de erro) para perguntar à Global Health; preparar perguntas objetivas sobre os esquemas MVBIKE e MVINTEGRA (fonte de dados do pós-atendimento, incluindo desfecho).
8. **Compliance Meta 2026 para agentes de IA no WhatsApp.** Confirmar que a Ana (propósito específico: saúde/atendimento) está conforme os termos vigentes; requisitos de identificação de IA; implicações da Regra 6 reescrita.

## Artefatos a entregar (gravar no repo e commitar)

1. `ana/prompt/Ana_System_Prompt_v2.md`: SOP final consolidado = prompt atual + hotfix (urgência como Regra 1, Regra 6 nova, exclusão comercial↔ouvidoria, guardrails jurídicos, acentuação, tag `fora-horario` conectada, etapa `EM ATENDIMENTO — ANA` acionada na Seção 1.1, rastreabilidade da 8.4) + as seções de agendamento do docs/04, revisado pelas melhores práticas da frente 3.
2. `pos-atendimento/viabilidade-webchat.md`: relatório da frente 1 com veredito e números.
3. `docs/adr/0003-base-de-conhecimento.md`: decisão Sheets vs Supabase (frente 5).
4. `pos-atendimento/templates-meta.md`: drafts dos templates de abertura (frente 2) com análise de classificação.
5. `docs/06-spec-classificador-urgencia.md`: spec do classificador (frente 4).
6. `pos-atendimento/arquitetura-analitica.md`: desenho da camada de dados/relatórios (frente 6).
7. `ana/api-mv/perguntas-global-health.md`: lista de perguntas técnicas para a Global Health e para o TI do hospital (frente 7).
8. `roadmap/relatorio-pesquisa.md`: síntese geral com fontes, decisões recomendadas e impactos no roadmap.

## Regras de trabalho

- pt-BR em tudo. Nunca usar em dash (—) nem en dash (–); os identificadores existentes que já contêm esses caracteres (ex.: a etapa `EM ATENDIMENTO — ANA`) permanecem como estão por serem nomes técnicos.
- Afirmações de custo, política Meta e benchmarks: sempre com fonte e data; verificar adversarialmente (a política da Meta muda com frequência).
- Commits atômicos por artefato. Não fazer push (o histórico contém token; limpeza pendente).
- Ao terminar, atualizar `roadmap/index.html` com o que a pesquisa mudou no plano.
