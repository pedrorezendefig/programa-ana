# INTEGRACOES.md
<!-- gerado por /snapshot; não editar à mão -->

Serviços externos do Programa Ana e o NOME das chaves de ambiente que o código lê
(do `.env` da raiz, fora do git). Nunca o valor. O repositório não tem `.env.example`:
as chaves saem da varredura do código (fora `tools/` e `.claude/`, que são do fluxo de trabalho).

## Oracle MV (base TST)
**Pra que serve:** Banco do hospital, base de teste. Só leitura (SELECT/WITH), pelo query-mv.py.
**Onde aparece no código:** `ana/api-mv/scripts/query-mv.py`
**Secret/env primária:** `ORACLE_PASSWORD`
**Variáveis relacionadas:** `ORACLE_CLIENT_DIR`, `ORACLE_HOST`, `ORACLE_PORT`, `ORACLE_SERVICE`, `ORACLE_SID`, `ORACLE_USER`

## fazer.ai agents
**Pra que serve:** A plataforma onde a Ana roda: lista de ferramentas para o Retrato.
**Onde aparece no código:** `ana/bancada/arquivo/divergimetro.py`, `ana/bancada/e2e.py`, `retrato/gerar.py`
**Secret/env primária:** `AGENTS_API_TOKEN`
**Variáveis relacionadas:** `PLATAFORMA_URL`

## Chatwoot
**Pra que serve:** Inbox do atendimento: a bancada e2e conversa por ele.
**Onde aparece no código:** `ana/bancada/e2e.py`, `ana/plataforma/scripts/fetch-chatwoot-releases.py`
**Secret/env primária:** `CHATWOOT_API_TOKEN`
**Variáveis relacionadas:** `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_URL`

---
**Resumo:** 3 serviços com chave no código. Langfuse e a API do Hospital são
configurados na plataforma, sem chave lida por este repositório.
