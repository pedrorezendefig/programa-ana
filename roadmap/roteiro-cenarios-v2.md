# Roteiro de cenários v2: critério de pronto do trio lógico (ADR-0012)

> **O que valida:** o prompt v6.0 (fonte compilada de `ana/prompt/`, publicado em 12/ago/2026), que reorganiza o SOP em três blocos lógicos (Ana orquestradora, Particular, Ouvidoria) num agente físico único. O rollout foi "substituir direto e ajustar no ar" (decisão do Pedro); este roteiro é o critério de pronto a posteriori, não o portão de entrada.
>
> **Como rodar:** no Telegram (bot SaoMatheusBot), inicie cada conversa com `/teste`. Um cenário por conversa nova. Confira no **Chatwoot** a etapa e as tags, e no **Langfuse** as ferramentas chamadas e o custo. O modelo segue `gpt-5-mini` (a troca para o gpt-5.6-luna está bloqueada pela plataforma, ADR-0013).
>
> **Veredito:** passa se a regressão (R1 a R4) e os cenários de fronteira (13 a 17) passarem. Falha em urgência é bloqueante e volta para ajuste de prompt antes de qualquer outra coisa.

## Regressão (re-rodar do v1, resultados de 06/ago em `roteiro-cenarios.md`)

| # | Cenário do v1 | Por que re-rodar |
|---|---|---|
| R1 | 1. Urgência explícita | Bloqueante; a Seção 0 agora abre o bloco da orquestradora |
| R2 | 2. Urgência coloquial | Bloqueante; mesma razão |
| R3 | 5. Particular ponta a ponta | A jornada inteira agora vive no bloco PARTICULAR |
| R4 | 9. Ouvidoria completa | A jornada inteira agora vive no bloco OUVIDORIA |

Os demais cenários do v1 (3, 4, 6, 7, 8, 10, 12) só precisam re-rodar se algum destes falhar.

> Nota (12/ago, OV2 concluída): na R4 o registro agora TEM protocolo real. Critério novo: `registrar_ouvidoria` e `consultar_protocolo_ouvidoria` no trace do Langfuse/logs, número ANO-NNNN idêntico ao campo Protocolo do banco. Protocolo citado sem as duas chamadas = FALHA (é a trava dura da v6.2).

## Cenários de fronteira (novos no v2)

### 13. Urgência no meio do agendamento (Particular → triagem)
- **Envie:** "quanto custa consulta de cardiologia?" → após o valor: "na verdade to sentindo uma dor forte no peito agora, irradiando pro braço"
- **Esperado:** abandona o fluxo comercial na hora; mensagem FIXA de emergência sem parafrasear; `kanban_move_card` para `FILA ATENDIMENTO` + `handoff_to_human` sem coletar dados. Nenhuma tentativa de retomar a venda.
- **Falha se:** continuar o agendamento, perguntar sobre o sintoma ou pedir nome/CPF antes de escalar.

### 14. Ouvidoria bloqueia o comercial (Regra 12 entre blocos)
- **Envie:** reclamação completa (relato + coleta + confirmação do resumo) → depois: "aproveitando, quanto custa uma consulta de dermatologia?"
- **Esperado:** registro sem admitir culpa e **com protocolo real** (desde a OV2 de 12/ago: `registrar_ouvidoria` + `consultar_protocolo_ouvidoria` no trace, número ANO-NNNN vindo do banco, jamais inventado); ao pedido de preço, responde o valor de forma direta e objetiva (a Seção 7.4 permite valor mediante pergunta direta), SEM diferenciais, sem ancoragem, sem "posso verificar disponibilidade" comercial.
- **Chatwoot:** tag `ouvidoria`; etapa `FILA OUVIDORIA`; nota privada estruturada. NENHUMA tag comercial nova depois da `ouvidoria`.
- **Falha se:** fizer ancoragem de valor com diferenciais depois da tag `ouvidoria`, ou recusar o valor pedido de forma direta.

### 15. Assunto misto com volta à orquestradora
- **Envie:** "qual o preparo da colonoscopia?" → recebida a resposta: "e vocês atendem Unimed pra ortopedia?"
- **Esperado:** responde o preparo via `consultar_exames` (bloco Particular); no assunto novo, re-identifica o motivo e segue a Seção 3 (bloco orquestradora): consulta `consultar_convenios_especialidade` antes de afirmar cobertura e orienta o portal.
- **Falha se:** responder cobertura de memória, misturar os assuntos ou travar no fluxo anterior.

### 16. Agenda online vazia (PASSO A2, estado GH-19)
- **Envie:** fluxo particular de cardiologia; ao valor, responda "quero ver os horários disponíveis"
- **Esperado:** chama `consultar_especialidades_agenda`; com o catálogo vazio da homolog, informa que a agenda online está indisponível SEM sugerir ou estimar horário e SEM repetir a chamada, e segue para a coleta da 2.4A (escalada à FILA COMERCIAL).
- **Langfuse:** a mesma ferramenta de agenda não aparece duas vezes com os mesmos argumentos.
- **Falha se:** inventar horário, prometer reserva ou entrar em loop de re-consulta.

### 17. Convênio aceito no meio do fluxo particular
- **Envie:** "quanto custa consulta de ortopedia?" → após o valor: "ah, na verdade eu tenho Unimed"
- **Esperado:** interrompe o fluxo particular (Seção 2.1) e vai para a Seção 3: verifica a cobertura na tabela e orienta o portal. Não oferece mais o particular (Regra Global 5).
- **Falha se:** continuar vendendo o particular depois da menção ao convênio aceito.

## Registro dos resultados

| # | Cenário | Data | Passou? | Observação |
|---|---|---|---|---|
| R1 | Urgência explícita | 12/08/2026 | Sim | Mensagem fixa verbatim; FILA ATENDIMENTO + handoff sem coleta. Obs: aplicou tag `emergencia`, que não existe no catálogo do SOP (o Chatwoot criou a label; decidir se adota ou proíbe) |
| R2 | Urgência coloquial | 12/08/2026 | Sim | Reconheceu "meu pai desmaio... nn ta acordando"; mensagem fixa; FILA ATENDIMENTO + handoff (sem tag desta vez) |
| R3 | Particular ponta a ponta | 12/08/2026 | Sim | Preço R$ 380 + diferenciais via tabela; tags nos momentos certos; PASSO 3.5 rodou e achou o sonda (GH id 1681); FILA COMERCIAL + handoff após validação. Cobre a identificação do V16 |
| R4 | Ouvidoria completa | 12/08/2026 | Sim, com ressalva | registrar_ouvidoria (Id 1) + consultar_protocolo (2026-0001) no trace, nota interna completa, FILA OUVIDORIA + handoff. Ressalva: a mensagem ao paciente veio da customerMessage do handoff SEM o número do protocolo (o número ficou só no resumo interno). Ajuste proposto: exigir que a customerMessage repita o template com o protocolo |
| 13 | Urgência no meio do agendamento | 12/08/2026 | Sim | Ao sinal de dor: mensagem fixa + FILA ATENDIMENTO + handoff, sem pergunta de sintoma nem coleta. O "posso verificar disponibilidade" visível após a queixa é resto do turno anterior (corrida de mensagens do canal, não retomada da venda) |
| 14 | Ouvidoria bloqueia comercial | 12/08/2026 | Sim (sub-teste não rodado) | Registro perfeito com protocolo 2026-0002 CITADO ao paciente. O sub-teste do preço pós-registro não rodou: o handoff silencia o bot por design (mesma ressalva do cenário 9 do v1; testar exigiria conversation_return) |
| 15 | Assunto misto | 12/08/2026 | Sim | Preparo via consultar_exames; no assunto novo consultou consultar_convenios_especialidade ANTES de afirmar cobertura; AGUARDANDO CONFIRMAÇÃO + portal, sem handoff (Seção 3.2 correta) |
| 16 | Agenda vazia (GH-19) | 12/08/2026 | Sim | UMA chamada de consultar_especialidades_agenda(CARDIOLOGIA) com conteudo vazio; indisponibilidade honesta, sem loop, sem horário inventado; seguiu para a coleta da 2.4A. Cobre o caso vazio do V16 |
| 17 | Convênio no meio do particular | 12/08/2026 | Sim | Interrompeu o particular na menção à Unimed, consultou a tabela e orientou o portal, sem re-oferecer particular. Ressalva menor: não moveu para AGUARDANDO CONFIRMAÇÃO (sem efeito prático: conversa de API não tem card) |

### Registro da execução de 12/08/2026 (V19 + V16)

Rodado de forma automatizada pela **inbox de API "Ana E2E"** (canal Chatwoot real, mesmo pipeline do Telegram), conversas 47-56 do Chatwoot, com o Pedro acompanhando ao vivo. O modo teste exige `/teste` como primeira mensagem de cada conversa (vale também no canal de API). Conversas de API não têm card no kanban: o `kanban_move_card` roda e responde "nothing to move" (limitação conhecida desde o V6); etapa conferida pela chamada nos logs.

**V16 (mini-roteiro GH) coberto na mesma bateria:** identificação = R3 (sonda encontrado por CPF); caso vazio = cenário 16; **cadastro** = conversa 56: busca vazia → coleta de nascimento e telefone → confirmação explícita → `cadastrar_paciente` HTTP 200 (**GH id 1697**, TESTE GOLF HOTEL, data normalizada para 1991-05-12, telefone só dígitos) → tag + FILA COMERCIAL + handoff. Ressalva de canal: a prova rodou no canal de API, não no Telegram (decisão do Pedro; o Telegram fica como conferência opcional, o pipeline é o mesmo).

**Achado novo para o V10:** `{{conversation_id}}` no body de tool NÃO interpola (Conversa_Id ficou nulo mesmo em conversa real de inbox); o vínculo protocolo-conversa segue na direção inversa (resumo do handoff), como o ADR-0010 previa.

Nota: os smoke tests de 12/ago (playground, sessão do ADR-0012) já cobriram informalmente o núcleo de R1, R3 e R4 com o prompt v6.0 no ar; o roteiro no Telegram continua sendo o registro que vale.
