# Programa Ana - Hospital São Matheus

Repositório de trabalho da VITTA TECH para os agentes de IA do Hospital São Matheus (Bangu/RJ). O produto principal é a **Ana**, agente de atendimento e agendamento via WhatsApp/Telegram, rodando na plataforma **fazer.ai agents** (com Chatwoot para as conversas e Langfuse para observabilidade e custo).

## Estado do programa (ago/2026)

- A Ana **migrou do n8n para a plataforma fazer.ai agents** (onboarding em 29/jul, tenant `vitta-tech`, agente id 1, modelo `gpt-5-mini`).
- As tabelas de negócio (preços de consultas, exames, estimativas de cirurgia, cobertura de convênios) vivem no **NocoDB** e são lidas ao vivo pela Ana via tools HTTP.
- O estágio de **testes de viabilidade foi concluído em 06/ago/2026**: os 10 cenários principais do Roteiro de cenários passaram (`roadmap/roteiro-cenarios.md`).
- A integração com o sistema MV do hospital (API Global Health) é o próximo horizonte, ainda em desenho (pendência GH1 no roadmap).
- O estado vivo do programa mora nas Issues do GitHub (`pedrorezendefig/programa-ana`, ADR-0031); `roadmap/TODO.md` guarda a narrativa (estado e log).

## Como entrar no projeto (passo a passo para sócios)

**1. Clonar e ler.** Só com o clone você já tem tudo que explica o programa, sem precisar de nenhuma chave:

- `roadmap/TODO.md`: onde estamos, o que foi feito, o que falta e por quê.
- `roadmap/roteiro-cenarios.md`: o que a Ana provou que sabe fazer, cenário por cenário.
- `CONTEXT.md`: o vocabulário (o que é kanban, handoff, tabela oficial, etc.).
- ADRs em `docs/adr/`: as decisões de arquitetura e as razões.

**2. Abrir o cockpit (opcional, recomendado).** Com Python 3 instalado:

```bash
python3 os/server.py
# abrir http://localhost:8777
```

A home mostra o roadmap, o grafo de execução e os painéis. As páginas que consultam APIs externas (bancada GH, conexão TST) precisam de credenciais e vão apontar isso; o resto funciona sem nada.

**3. Operar a Ana (exige acessos, fale com o Pedro).** O repositório documenta, mas a operação acontece nas plataformas:

- **Chatwoot** (conversas reais e de teste): conta criada por convite.
- **Langfuse** (custo e traces por resposta): conta criada por convite.
- **fazer.ai agents** (prompt, ferramentas e configuração do agente): operado via MCP em sessões Claude Code; o token é pessoal e nunca entra no git.
- **NocoDB** (tabelas de preços e cobertura): convite como editor quando for a hora (tarefa V9 do roadmap).

**4. Trabalhar com Claude Code (o fluxo padrão do projeto).** As sessões de trabalho usam o Claude Code aberto neste diretório. O comando `/check` lê o estado, reconcilia o roadmap e devolve orientação de próximos passos. O `CLAUDE.md` da raiz contém as regras que as sessões seguem (o que pode e o que não pode). O setup completo está na seção seguinte.

## Setup completo da estação de trabalho (replicar o ambiente do Pedro)

Siga na ordem. Os passos 1 a 3 não dependem de ninguém; do passo 4 em diante você vai precisar de credenciais, e elas são entregues **pessoalmente pelo Pedro** (ligação ou presencial, de preferência via gerenciador de senhas; nunca por grupo de WhatsApp, e-mail ou commit).

**1. Pré-requisitos na máquina**

- git e Python 3 (macOS e Linux já têm).
- [Claude Code](https://claude.com/claude-code) instalado (CLI ou app desktop) com uma conta que tenha acesso ao plano da VITTA TECH.

**2. Clonar o repositório**

```bash
git clone git@github.com:pedrorezendefig/programa-ana.git
cd programa-ana
```

**3. Validar o que funciona sem credencial**

```bash
python3 os/server.py   # abrir http://localhost:8777 (o cockpit Ana OS)
```

Leia `roadmap/TODO.md` e o `CONTEXT.md` antes de seguir: o resto do setup faz mais sentido depois.

**4. Pedir ao Pedro (pessoalmente) o kit de credenciais**

| Item | Para quê | Formato |
|---|---|---|
| Conteúdo do `.env` | Consultas ao Oracle TST e à API GH homolog | Arquivo/texto para colar na raiz |
| Token MCP da plataforma fazer.ai | Operar a Ana pelo Claude Code | URL do endpoint + token |
| Convite do Chatwoot | Ver conversas reais e de teste | Convite por e-mail |
| Convite do Langfuse | Custo e traces por resposta | Convite por e-mail |
| Convite do NocoDB | Editar tabelas de preço/cobertura (quando V9 abrir) | Convite por e-mail |

**5. Montar o `.env` na raiz** (nunca commitá-lo; o `.gitignore` já o ignora)

```
ORACLE_HOST=...
ORACLE_PORT=1521
ORACLE_SERVICE=...        # ou ORACLE_SID
ORACLE_USER=...
ORACLE_PASSWORD=...
GH_TOKEN_HOMOLOG=...
```

Instale o driver do Oracle: `python3 -m pip install --user oracledb`. Se o modo thin não conectar, o guia do modo thick (Instant Client) está em `ana/api-mv/conexao-oracle.md`.

**6. Testar as conexões**

```bash
python3 ana/api-mv/scripts/query-mv.py "SELECT 1 FROM DUAL"   # Oracle TST
python3 ana/api-mv/scripts/smoke-gh.py                         # API GH homolog
```

**7. Conectar o MCP da fazer.ai no Claude Code** (com a URL e o token do passo 4)

```bash
claude mcp add fazer-ai --transport http <URL-do-endpoint-MCP> --header "Authorization: Bearer <token>"
```

Depois, numa sessão Claude Code aberta neste diretório, rode `/check`: ele confere a instância, reconcilia o roadmap e te diz a fronteira do dia.

**8. Regras de operação que valem para todos**

- Banco Oracle: somente leitura, sempre pelo `query-mv.py` (ele recusa o que não for SELECT). Produção é só o Pedro, manualmente.
- API Global Health: somente homologação nas ferramentas locais. Produção jamais.
- Mudança em prompt ou ferramentas da Ana: sempre com aprovação explícita antes de aplicar, e registrada no roadmap.
- Avançou ou criou tarefa do roadmap? Mexa na issue pelo `gh` (labels `area:`/`canal:`, corpo nas seções, ficha ao fechar) e registre uma linha no log do `roadmap/TODO.md`.

## URLs do programa (todas atrás de login)

| Serviço | URL |
|---|---|
| Plataforma fazer.ai agents (tenant `vitta-tech`) | https://agents.hospitalsaomatheus.cloud |
| Chatwoot (conversas) | https://chatwoot.mala-ia.cloud |
| Langfuse (custo e traces) | https://langfuse.hospitalsaomatheus.cloud |
| Coolify (infra na VPS) | https://coolify.hospitalsaomatheus.cloud |
| Ana OS (local) | http://localhost:8777 após `python3 os/server.py` |

## Segurança: o que NUNCA entra neste repositório

O `.gitignore` já bloqueia, mas a regra vale para qualquer arquivo novo:

- **`.env`** (raiz): credenciais do Oracle TST e token da API Global Health de homologação. Cada pessoa recebe o seu por canal seguro (nunca por commit, nunca por grupo de WhatsApp).
- **`dados-locais/`** e **`amostras/`**: planilhas e extrações com dado pessoal de paciente (LGPD).
- **Tokens de plataforma** (Chatwoot admin, fazer.ai MCP, Cloudflare, Coolify): não têm arquivo no repo de propósito; vivem nos cofres/painéis de cada serviço.
- Credenciais de **produção** do hospital: jamais nesta máquina ou neste repo; produção é acessada só pelo Pedro, manualmente.

Na dúvida: se o arquivo tem senha, token ou nome/CPF de paciente, ele não entra no git.

## Mapa do repositório

Esta seção é o mapa completo das pastas, no formato do fluxo de trabalho que veio do Hospital pelo IAE: o que é cada pasta, por que existe, o que tem dentro e para que serve. A árvore de verdade é o disco: antes de responder sobre uma pasta, rode `ls` nela e confira. Pasta que o git conhece e não está na lista de cobertura no fim desta seção é sinal de que o mapa envelheceu: o teste `tools/test_docs_fluxo.py` reprova, e a correção é editar aqui no mesmo PR.

O "app" do fluxo é a pasta `ana/`: PR que toca `ana/` passa pelo `ana-revisor`; o resto é ferramenta e só passa pelo CI. Para saber qual skill usar em cada momento, rode `/ask-ana`. O passo a passo do clone ao painel aberto está em `docs/onboarding/dev.md`.

### Raiz

| Pasta ou arquivo | O que é | Por que existe | O que você acha dentro | Para que serve no dia a dia |
|---|---|---|---|---|
| `README.md` | Este arquivo | Quem clona precisa saber o que é o programa e cada pasta sem perguntar | O estado do programa, o setup da estação e este mapa | Primeiro dia; o `/setup-maquina --mapa` lê daqui |
| `CLAUDE.md` | Regras do repo para o agente | Mínimo que toda sessão precisa saber | O Ana OS, a gramática das issues, o Oracle TST e a Global Health homolog | Leia uma vez. O roteamento fino está no `/ask-ana` |
| `CONTEXT.md` | Glossário do programa | O Pedro, o hospital e o agente falam a mesma língua | Termos com definição e "evitar" | Consultar antes de nomear qualquer coisa nova |
| `.claude/` | Skills e agentes, versionados | Quem clona recebe o fluxo inteiro | `skills/` (uma pasta por skill: o pipeline do fluxo e as próprias da Ana, como `/check`, `/bancada` e `/testes`) e `agents/` (`ana-implementador`, `ana-revisor`, `ana-corretor`, que a `/onda-enxuta` e o `/ship` disparam) | `/ask-ana` diz qual usar |
| `.claude-plugin/` | Marketplace de mods do Claude Code | Instalar o mod da bancada com um comando | `marketplace.json` (`ana-mods`, que aponta para `mods/bancada`) | Ao instalar o painel da bancada ao vivo (ADR-0033) |
| `.githooks/` | Hooks de git do repo | O plano grátis do GitHub não protege a `main` de repo privado | `pre-push`, que recusa push direto na `main` | Ligar uma vez com `git config core.hooksPath .githooks` |
| `.github/` | CI e templates | Gates automáticos do `/ship` e formato único de issue e PR | `workflows/` (`ci.yml`, `lint-adr.yml`, `lint-skills.yml`, `higiene-issues.yml`), `ISSUE_TEMPLATE/` e o `PULL_REQUEST_TEMPLATE.md` | Não se edita no dia a dia |
| `ana/` | O "app" do fluxo: a Ana | Tudo que define e prova o comportamento da Ana mora junto | `prompt/` (fonte do prompt e o `compilar.py`), `bancada/` (cenários, conversas e diagnósticos das baterias), `api-mv/` (dicionário do Oracle e scripts só de leitura da base TST e da Global Health homolog), `api-hospital/` (a API do app do hospital), `plataforma/` (achados e scripts da fazer.ai e do Chatwoot), `base-conhecimento/` (tabelas de negócio), `briefings/` e `workflows/` (era n8n, acervo) | Toda mudança aqui passa pelo `ana-revisor` |
| `contrato/` | Contrato de Serviços Contínuos da VITTA TECH | O contrato sai de fonte versionada, não de documento solto | `fonte/` (o texto e os metadados), `gerado/` (PDF e HTML), `hospital/` (a versão revisada pelo jurídico), `legado/` (a versão anterior) e o `LEIA-ME.md` com o comando de publicar | Ao mexer no contrato |
| `docs/` | Documentação viva | Ver a tabela abaixo | | |
| `mods/` | Mods do Claude Code | O painel da bancada roda dentro do Claude Code | `bancada/` (hooks e testes do mod da bateria ao vivo) | Ao evoluir o painel da bancada |
| `os/` | O cockpit do programa (`python3 os/server.py`, porta 8777) | Ver o programa inteiro numa página, só leitura (ADR-0007, ADR-0030) | `index.html`, `server.py`, `roadmap_github.py` (lê as issues pelo `gh`), `assets/`, `dados/` (os JSON das esferas) e `arquivo/` (páginas antigas, por URL direta) | O `/check` liga e mede por ele |
| `pos-atendimento/` | Specs do agente de pós-atendimento | O próximo agente do hospital começa desenhado | Arquitetura analítica, templates da Meta e viabilidade do webchat | Quando o pós-atendimento entrar no roadmap |
| `retrato/` | O Retrato da Ana, site estático para o diretor do hospital | O diretor vê o que a Ana faz sem abrir o repositório (ADR-0028) | `gerar.py` (grava `dados/retrato.json`), `index.html`, `assets/` e `curadoria.json` | `python3 retrato/gerar.py`; publicar é ato do Pedro |
| `roadmap/` | A narrativa do programa | O estado vive nas Issues; a história, aqui (ADR-0031) | `TODO.md` (estado e log), os roteiros de cenários e de integração, `arquivo/` (o roadmap anterior) | O `/check` lê e atualiza o `TODO.md` |
| `tools/` | Ferramentas do repo | Lints e testes do CI e o painel do fluxo | `lint_adr.py`, `lint_skills.py`, `checar_migration_repetida.py`, os testes `test_*.py` ao lado e `workflow-dashboard/` (o painel só de leitura das issues e dos PRs, em `http://localhost:8800`) | `uv run --no-project --python '>=3.12' --with pytest --with pyyaml python -m pytest tools/ -q --ignore=tools/workflow-dashboard` |

Na raiz também ficam `Documento-Mestre_Programa-Ana-CRM.md` e `resumo.md` (visão do programa para quem chega), `vercel.json` (publicação do Retrato) e o `.gitignore`.

### `docs/`

| Pasta | O que é | Por que existe | O que tem | Quando abrir |
|---|---|---|---|---|
| `adr/` | Decisões de arquitetura e de processo | Decisão sem registro é rediscutida | `README.md` (índice) e um `.md` por decisão, com `status` no frontmatter | Antes de propor mudança de regra. Só `accepted` vale |
| `agents/` | Protocolo do agente | Sessões paralelas precisam do mesmo contrato | `issue-tracker.md` (claim, worktrees, bloqueio, revisor), `triage-labels.md` (as labels do fluxo e a migração das antigas), `domain.md` (como ler glossário, ADRs e snapshots) | Ao pegar issue ou triar |
| `onboarding/` | Setup humano | Máquina nova | `dev.md` (do clone ao painel aberto, e o dia a dia), `claude-setup.md` (Claude Code, plugins e permissões) | Primeiro dia. O `/setup-maquina` confere o mesmo conteúdo |
| `painel/` | Páginas HTML antigas de visão do programa | Acervo da era n8n | `index.html`, `fluxos.html`, `prompt.html` | Só para consulta histórica |
| `spec/` | Contrato de deploy e mapa factual da `ana/` | O agente lê daqui, nunca de memória | `deploy/` (`project.json`, `state.json`, `history.json`; sem deploy pelo repositório), `VERSIONING.md` (por que não há versão de app) e `snapshots/` (gerados pelo `/snapshot`) | `/deploy status` e `/snapshot --check` |

Na raiz de `docs/` ficam os documentos numerados da arquitetura da integração de agendamento (`00-visao-geral.md` a `07-guia-edicao-base-ana.md`), da era n8n: consulta.

### O fluxo, em uma linha por etapa

1. Ideia: `/grill-with-docs` afia contra `CONTEXT.md` e as ADRs. 2. `/to-prd` e `/to-issues` viram issues. 3. `/pegar-issue N` faz o claim e abre a branch. 4. `/tdd` escreve o teste primeiro. 5. `/ship` abre o PR, roda os gates e, com o PR verde, roda a subida (`fechar_onda.py`). 6. A subida mergeia pela API e para: a Ana não tem deploy pelo repositório.

### Cobertura (o teste `tools/test_docs_fluxo.py` confere esta lista)

Toda pasta de nível 1 e 2 que o git conhece precisa estar aqui. Pasta nova no repo: acrescente a linha e explique acima, no mesmo commit. O conteúdo de `.claude/skills/` e de `docs/adr/` fica fora da conferência, porque é descrito por padrão e não um a um.

<!-- cobertura:start -->
```
.claude
.claude/agents
.claude/skills
.claude-plugin
.githooks
.github
.github/ISSUE_TEMPLATE
.github/workflows
ana
ana/api-hospital
ana/api-mv
ana/bancada
ana/base-conhecimento
ana/briefings
ana/plataforma
ana/prompt
ana/workflows
contrato
contrato/fonte
contrato/gerado
contrato/hospital
contrato/legado
docs
docs/adr
docs/agents
docs/onboarding
docs/painel
docs/spec
mods
mods/bancada
os
os/arquivo
os/assets
os/dados
pos-atendimento
retrato
retrato/assets
retrato/dados
roadmap
roadmap/arquivo
tools
tools/workflow-dashboard
```
<!-- cobertura:end -->

Não aparecem aqui, por não estarem no git: `.claude/worktrees/` (worktrees dos agentes), `.claude/settings.local.json`, o `.env` da raiz, `dados-locais/`, as `amostras/` e os caches de ferramenta.
