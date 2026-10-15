---
status: accepted
date: 2026-08-14
amends: 0006, 0010
amended_by: 0016
---

# Base Ana migra do NocoDB para o Hospital Reuniões

Decisão do Pedro (14/ago/2026, sessão de grilling com pesquisa citada): a fonte da verdade dos dados que alimentam a Ana muda do NocoDB para o Postgres do **Hospital Reuniões** (o Aplicativo do hospital, repo `~/PedroDev/Hospital`). O app ganha o módulo de edição das tabelas de valores e um painel de ouvidoria; a Ana passa a ler e escrever via API do app; o NocoDB se aposenta por completo. Ativa a opção que o ADR-0006 registrou como "melhor destino final possível" e tinha adiado de propósito.

## Contexto

- A Base Ana (ADR-0006) vive num NocoDB no Coolify da VPS: 4 tabelas de valores/cobertura lidas por shared views públicas (tools 1-4) e a tabela `5_Ouvidoria_Protocolos` (ADR-0010), lida/escrita com o `xc-token` do vault (tools 11-12). Nenhum dado de paciente; agenda e cadastro são Global Health/MV e não participam.
- O Hospital Reuniões é o outro produto do mesmo hospital: FastAPI + Next.js + Supabase self-hosted (Postgres), em produção (v0.47.2), no **mesmo VPS** (31.97.29.32). A diretoria e as secretárias já logam nele; o NocoDB, ninguém do hospital visita.
- O ADR-0010 registrou como risco o `xc-token` alcançar a base inteira, com mitigação prevista "proxy fino na fase 5". A migração resolve por outro caminho: API com escopo restrito.
- Pesquisa em fonte primária (docs oficiais e código do NocoDB, 14/ago/2026) fechou as alternativas híbridas: webhooks do NocoDB não têm retry (entrega única, timeout 30s, erro engolido; feature request aberta desde 2023), escrita direta no Postgres não dispara webhook (o gatilho vive na camada de aplicação do NocoDB), e o modo "data source externo" desaconselha edição de schema e exige sync manual. Qualquer arquitetura com o NocoDB no meio seria frágil.
- No `.env` do Hospital Reuniões existem `ANA_READONLY_PASSWORD` e `ANA_READONLY_DB_URL` (usuário Postgres read-only provisionado para a Ana, nunca usado por código). Com esta decisão fica obsoleto: o caminho é API, não banco direto.

## Decisão

1. **Escopo.** As 5 tabelas da Base Ana migram para o Postgres do Hospital Reuniões. O app ganha edição das tabelas de valores na área admin e um painel de ouvidoria. A Ana consulta no app o que migrou.
2. **NocoDB aposenta por completo.** Depois da validação da fase 2, o serviço `nocodb-base-ana` sai do Coolify. Um dono só para os dados, zero duplicação.
3. **Auth.** Endpoints `/api/ana/*` no FastAPI do Hospital, protegidos por API key de serviço dedicada (header), guardada no vault do fazer.ai. Mesma chave para leitura e para a escrita da ouvidoria. Substitui o par "shared view pública + xc-token de base inteira".
4. **Sequência.** Fase 1: as 4 tabelas de valores (CRUD no app, endpoints GET, tools 1-4 da Ana trocam de URL; validação por comparação de respostas). Fase 2: ouvidoria (POST + consulta, painel, migração dos protocolos existentes). O NocoDB só desliga depois da fase 2 validada.
5. **Edição.** Módulo na área admin do app: super admins e secretárias editam; facilitadores leem. A garantia "mudança vale na resposta seguinte" se mantém (leitura direta, sem cache).
6. **Ouvidoria.** Painel com mudança de Status (aberto/respondido) para diretoria e secretárias. A invariante **índice, não dossiê** migra junto: nenhum dado pessoal entra no app; nome, CPF e relato seguem só na conversa do Chatwoot, ligados por `Conversa_Id`.
7. **Protocolo.** Formato ANO-NNNN mantido, numeração continua do último número (a sequence do Postgres nasce dele), geração pelo banco, nunca pelo modelo. Protocolos já informados a pacientes continuam consultáveis.
8. **Registro e divisão do trabalho.** O desenvolvimento acontece no Hospital (ADR próprio lá + PRD + issues pelo workflow do repo). Do lado Ana ficam: este ADR, o CONTEXT.md atualizado e a proposta P9 no roadmap (trocar as URLs das 6 tools, credencial nova no vault, rodar o roteiro de regressão, desligar o NocoDB).

## Considered options

- **Manter o NocoDB e integrá-lo ao app (webhooks ou data source externo):** rejeitado pela pesquisa citada no contexto: sem retry, sem gatilho em escrita externa, sync de schema manual. Dois sistemas para sempre, sincronização cega.
- **Migrar só as 4 tabelas de valores, ouvidoria fica no NocoDB:** rejeitado. O painel de ouvidoria no app teria que ler do NocoDB, mantendo os dois sistemas e o risco do token de base inteira.
- **Ana lê direto do Postgres do Hospital (o usuário ANA_READONLY):** rejeitado. As tools da Ana são HTTP/HTTPS pela plataforma fazer.ai; banco direto não é um caminho que a instância executa, e furaria as regras de negócio que vivem no Python do app.
- **Usuário técnico no Supabase Auth (JWT):** rejeitado. As tools HTTP do fazer.ai não renovam token; expiraria em produção.
- **Big-bang (migrar tudo e desligar numa janela só):** rejeitado. A falha silenciosa de interpolação da plataforma (achado V14) já provou que erro de escrita pode passar calado; faseamento com validação por fase.

## Consequências

- O Hospital Reuniões vira a casa dos dados do atendimento: edição com login, auditoria e papéis, no produto que o hospital já usa e paga.
- As tools 1-4, 11 e 12 da Ana trocam de URL e de credencial (uma API key no vault no lugar do xc-token); o comportamento conversacional não muda.
- O risco do ADR-0010 (token com alcance de base inteira) morre com o NocoDB; o "proxy fino da fase 5" previsto lá deixa de ser necessário para a ouvidoria.
- O guia `docs/07-guia-edicao-base-ana.md` e o termo Base Ana do CONTEXT.md passam a apontar para o app quando a fase 1 entrar; até lá, o NocoDB segue sendo a fonte viva.
- Requisito herdado para os endpoints de escrita: a variável crítica vai na URL ou o campo é obrigatório no banco (defesa contra a falha silenciosa de interpolação da plataforma).
- Cuidado de fronteira: os endpoints `/api/ana/*` nascem na API de produção do app; a API key é de escopo restrito a eles e nunca aparece em prompt de agente.
