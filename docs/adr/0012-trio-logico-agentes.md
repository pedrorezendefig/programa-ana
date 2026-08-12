---
status: accepted
date: 2026-08-12
---

# A Ana vira um trio lógico (orquestradora, Particular, Ouvidoria) compilado num agente físico único

Supera a decisão "Modos da Ana" do briefing do diretor (jun/2026: um agente com três modos, nunca subagentes). O Pedro decidiu, como arquitetura definitiva e não como paliativo, que a Ana se organiza em **três agentes lógicos**: a **Ana orquestradora** (triagem de urgência, identificação do atendimento, convênio, prontuário, dúvidas gerais, encerramento), o **Particular** (comercial, valores, ancoragem com diferenciais, agendamento de consultas e exames, todas as tools GH, a P6 quando acender) e a **Ouvidoria** (acolhimento, guardrails jurídicos, protocolo quando a OV2 entrar).

Como a plataforma fazer.ai agents **não tem transferência de conversa entre agentes de IA** (fato verificado no código-fonte em 12/ago/2026: catálogo nativo sem transfer entre agentes, vínculo inbox→agente 1:1 por coluna escalar no schema, "supervisor router" listado como *Deferred* no roadmap deles), o trio vive hoje como **estrutura fonte no repo, compilada num prompt único** publicado na Ana id 1. Quando a plataforma entregar o roteador entre agentes, os mesmos arquivos-fonte viram três agentes físicos sem redesenho.

## Contexto

- O prompt v5.3 está em 49.353 de 50.000 caracteres; a P6 (finalização) não cabe. O teto de 50k é do build de 29/jul da instância: no código atual da plataforma o teto é 100.000, configurável por `AGENT_PROMPT_MAX_CHARS` (o build antigo não lê essa env var).
- Medição do prompt vivo por seção: núcleo comum (persona, tom, Regras Globais, Princípio de Coleta, Princípio de Ferramentas, resumo) soma ~15,4k; as jornadas do SOP somam 27,6k, com ouvidoria (6,2k) e agendamento particular (4,1k) como maiores e os dois únicos blocos com crescimento previsto (OV2 e P6).
- O corte "consultoria particular" separada de "agendamento particular" (ideia inicial) foi descartado no grilling: é a mesma jornada de venda, e uma fronteira ali colocaria uma transferência no meio do fluxo que o transbordo seletivo mandou a Ana fechar sozinha.

## Decisões de desenho

- **Corte em três**: Particular engloba comercial + valores + agendamento + exames. Convênio fica na orquestradora (jornada curta, termina em portal ou escalada). Ouvidoria separada.
- **Semântica de retorno**: o especialista conclui a jornada dele e devolve à orquestradora; assunto novo passa pela triagem de novo. Exceção dura: a triagem de urgência é Regra Global replicada nos três blocos, escala para humano direto. A exclusão comercial↔ouvidoria vira regra de roteamento da orquestradora: thread com tag `ouvidoria` não roteia para o Particular.
- **Fonte da verdade**: os prompts nascem no repo (núcleo comum + um arquivo por agente lógico); uma sessão Claude compila cada prompt final e publica via `prompt_set`, carimbando versão. A compilação pode aparar o núcleo por agente (a Ouvidoria não carrega regras de agenda). O Mapa do SOP lê os mesmos arquivos.
- **Escopo GH**: as tools da P6 (agendar, reagendar, cancelar) nascem prontas no bloco Particular com o prompt escrito, e o acender continua gated por GH-19 (massa do catálogo) e GH-18 (prova no banco via VPN da TST). Este plano não promete escrita real no banco antes dos destravas.
- **OV2 fora do escopo**: a Ouvidoria nasce com a Seção 7 atual (Regra Híbrida, sem citar número); o protocolo entra quando a pendente OV2 andar (depende de gesto manual do Pedro no NocoDB).
- **Rollout**: substituir direto no canal de teste (Telegram, gatilho `/teste`) e ajustar no ar, decisão explícita do Pedro. Piso de segurança: `agent_export` da v5.3 arquivado no repo antes da primeira mudança. Critério de pronto a posteriori: Roteiro de cenários v2, incluindo cenários de fronteira (urgência no meio do agendamento, ouvidoria→comercial bloqueado, assunto misto com volta à orquestradora).
- **Infra no início do plano**: atualizar a imagem `agents-pro` no Coolify (build 29/jul → atual) para destravar o teto de 100k. O Chatwoot é outro container; o hotfix frágil não é tocado.
- **Mapa do SOP**: `os/sop.html` passa a desenhar o trio em três zonas visuais numa página única, com as transferências como nós de fronteira explícitos (quem decide, com qual critério, o que viaja junto), tools nos quadrados pretos e âncoras apontando o arquivo-fonte do bloco correspondente. Público-alvo: funcionário novo entendendo o organismo inteiro.

## Alternativas descartadas

- **4 agentes** (consultoria e agendamento particular separados): transferência no meio da venda.
- **Workaround tool→playground** (um agente chama o playground do outro por HTTP tool): thread isolada, sem memória da conversa, sem atribuição no Chatwoot; o próprio código da plataforma fecha essa porta.
- **Esperar ou implementar o roteador**: ficar refém de terceiro sem prazo, ou projeto de engenharia à parte. O trio lógico entrega a organização agora e aproveita o roteador quando existir.

## Consequências

- O CONTEXT.md troca o termo "Modos da Ana" por "Trio lógico da Ana"; "subagentes" deixa de ser palavra proibida e passa a designar o desenho lógico (a proibição valia para o físico, que continua único por ora).
- O Roteiro de cenários v2 vira o critério de pronto da reorganização; conversa livre não conta.
- A troca de modelo que acompanha este plano está no ADR-0013.
