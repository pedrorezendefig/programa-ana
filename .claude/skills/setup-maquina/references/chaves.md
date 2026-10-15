# Acessos: de onde vem cada um

O fluxo de PR da Ana não pede chave de serviço: não há deploy pelo repositório. Os acessos do programa, sim, e todos são entregues **pessoalmente pelo Pedro** (ligação ou presencial, de preferência por gerenciador de senhas; nunca por grupo de WhatsApp, e-mail, issue, PR ou commit). O passo a passo está no "Setup completo da estação de trabalho" do `README.md` da raiz.

## Serviços

| Serviço | Para quê | O que você precisa | Como conseguir |
|---|---|---|---|
| **GitHub** (`pedrorezendefig/programa-ana`) | Issues, PRs, CI, merge | Permissão WRITE e `gh auth login` | O Pedro adiciona você como colaborador; depois `gh auth login` |
| **Claude Code** | Skills e agentes do fluxo | A sua conta | Instale com `curl -fsSL https://claude.ai/install.sh \| bash` |
| **Oracle do MV, base TST** | Consultas só de leitura pelo `ana/api-mv/scripts/query-mv.py` | `ORACLE_HOST`, `ORACLE_PORT`, `ORACLE_SERVICE` (ou `ORACLE_SID`), `ORACLE_USER`, `ORACLE_PASSWORD` no `.env` da raiz, e o driver `oracledb` | O Pedro entrega o conteúdo do `.env`. Produção: só o Pedro, à mão, no DBeaver; credencial de produção nunca entra nesta máquina |
| **API Global Health, homologação** | `ana/api-mv/scripts/smoke-gh.py` e as cadeias do Ana OS | `GH_TOKEN_HOMOLOG` no `.env` da raiz | Vem no mesmo `.env`. Produção é proibida nas ferramentas locais |
| **Plataforma fazer.ai agents** | Operar o prompt e as ferramentas da Ana pelo Claude Code | URL do endpoint MCP e token pessoal | O Pedro entrega; `claude mcp add fazer-ai --transport http <URL> --header "Authorization: Bearer <token>"` |
| **Chatwoot** | Conversas reais e de teste | Conta | Convite por e-mail |
| **Langfuse** | Custo e traces por resposta | Conta | Convite por e-mail |

O `.env` da raiz fica fora do git (o `.gitignore` já o ignora). Issue e PR não levam senha nem token (regra do `CLAUDE.md`). Dado de paciente (nome, CPF, telefone) também não entra no git: amostras vão para `ana/api-mv/resultados/amostras/`, que é ignorada.
