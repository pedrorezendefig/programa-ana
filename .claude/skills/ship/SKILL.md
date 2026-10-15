---
name: ship
description: Leva uma mudança até o PR verde (branch, commit, PR, gates da ADR 0068) e roda a subida, o fechar_onda.py, sem parar. Sintaxe `/ship "<descrição>" [--issue N] [--type ...] [--skip-review]`.
---

# ship

Do código ao PR verde e, com os gates verdes, a subida (`fechar_onda.py`), sem esperar mensagem (ADR 0068). O merge é só da subida (ADR 0068); o `/ship` nunca o faz. A Ana não tem deploy pelo repositório, então a subida termina no merge. Config em `docs/spec/deploy/project.json`.

## Sintaxe

```bash
/ship "<descrição curta>" [--issue N] [--type fix|feature|chore|refactor|docs|test|spec] [--skip-review] [--hotfix] [--draft] [--from-diff] [--resume]
```

| Flag | Efeito |
|---|---|
| `--issue N` | Vincula a issue: `Closes #N` no PR, critérios de aceite como checklist. |
| `--type` | Prefixo de branch e commit. Sem ele: "bug/corrigir/fix" → `fix`, "nova/adicionar" → `feature`, "refactor/limpar" → `refactor`, "doc/readme" → `docs`, senão `chore`. |
| `--skip-review` | Pula Gates 1 e 2 e termina no PR aberto, sem a subida. Modo do `ana-implementador` da onda. |
| `--hotfix` | Roda Gate 2 e CI e termina no PR verde, sem a subida. |
| `--draft` | PR como draft. |
| `--from-diff` | O código já está no working tree: vai direto ao commit. |
| `--resume` | Retoma pelo estado do git e do PR (tabela no fim). |

**Nunca pare para perguntar** (ADR 0068): dúvida, impasse ou revisor sem veredito é baixa, com uma linha de motivo.

## Passos 1 a 8: branch, código, testes, commit, PR

1. **Pre-flight:** `git fetch origin`. Arquivo alheio no working tree fica de fora do commit, sem perguntar. Com `--issue N` fora da `main`, a branch tem que terminar em `-<N>`; senão, pare (a árvore pode ser de outra sessão).
2. **Branch:** `<type>/<slug>[-<N>]` (slug minúsculo, ASCII, até 50 caracteres). Já na branch do `/pegar-issue`, pule.
3. **Issue:** `gh issue view N --json title,body,labels`. "O que construir" vira o contexto do PR; os critérios de aceite, o checklist e a lista de testes do `/tdd`.
4. **Código:** chame a Skill tool com `tdd`. Com `--from-diff`, pule.
5. **Testes locais, o mesmo comando do CI:** PR de ferramenta roda `uv run --no-project --python ">=3.12" --with pytest --with pyyaml python -m pytest tools/ -q --ignore=tools/workflow-dashboard` (o job `ferramenta` do `ci.yml`; o `python3` do macOS é velho) e, se tocou uma skill, `python3 tools/lint_skills.py --dir .claude/skills` (o `lint-skills.yml`); PR do app (algo em `ana/`) roda também o que o diff toca: `python3 ana/prompt/compilar.py` se mexeu no prompt, e a bancada (Skill tool com `bancada`) quando a issue pede prova de comportamento da Ana. Script que fala com o Oracle ou com a Global Health roda só contra a base TST e a homologação. Vermelho local nunca vira PR: o CI inteiro é a prova, não a lista de arquivos que você lembrou de rodar (o #1046 caiu por trocar uma string que um teste de outro arquivo asserta).
6. **Commit:** Conventional Commits, `git add` com lista explícita (nunca `-A` nem `.`), nada do `hard_excluded` do `project.json`. Sem versão no PR.
7. **Push:** `git push -u origin "$BRANCH"`. Falhou: reporte o erro bruto e pare.
8. **PR:** `gh pr create --base main --title "$SUBJECT" --body-file <scratchpad>/pr-$BRANCH.md`, mais `--label type:$TYPE --label area:<...>` só quando a label existe no repositório (`gh label list`): o `gh pr create` recusa label que não existe, e a Ana pode ainda não ter as `type:*`. O arquivo do corpo leva o nome da branch: agentes paralelos na mesma sessão já se atropelaram num `pr.md` compartilhado (o #796 saiu com o `Closes` da issue errada). Corpo pelo `.github/PULL_REQUEST_TEMPLATE.md`: **Valor entregue** (um parágrafo `**O que muda:**` de 1 a 3 frases, escrito a partir da issue como quem explica ao diretor do hospital o que a mudança entrega, sem jargão; passe o parágrafo pela skill `humanizer` em modo embutido antes de abrir o PR, ADR 0071), contexto (sem `--issue`, o Contexto abre com "Decisão registrada neste PR" e o porquê da mudança: é a casa da decisão de ferramenta, ADR 0068, regra 12), critérios de aceite, **Evidência** (antes e depois: o teste que falhava e passa, a saída de comando que mudou ou o print; nunca só "testes verdes"), **Perigo do merge** (porta de uma ou duas vias pela lista do template, com o motivo, e o raio) e `Closes #N`.

## Passo 8: gates

**PR de ferramenta** (nenhum arquivo em `ana/`, ADR 0068): só o CI. Verde, vá ao Passo 9.

**PR do app**, na ordem:

- **Gate 2, `sensivel.py`** (rode primeiro): `uv run --no-project --python ">=3.12" python .claude/skills/onda-enxuta/scripts/sensivel.py "$PR"`. Saída 0: o prompt do revisor leva `Sensível: <arquivos impressos>`. Saída 1: nada. Outra saída: rode de novo; na segunda falha, baixa.
- **Gate 1, `ana-revisor`**, prompt de `.claude/skills/onda-enxuta/references/prompts.md`. Última linha do comentário: `VEREDITO: LIMPO` ou `VEREDITO: MUST-FIX (n)`. Com issue vinculada, o revisor também confere spec × diff.
- **Gate 3, CI:** `gh pr checks "$PR" --watch`.

Correção:
- `MUST-FIX` → `ana-corretor` motivo `revisao` com o comentário inteiro. Uma revisão, uma correção, sem re-revisão: depois do corretor, quem confere é o CI. Corretor com `pendente` é baixa.
- CI vermelho → `ana-corretor` motivo `ci` com as últimas 60 linhas de `gh run view <id> --log-failed`; a segunda falha da fatia vai com `effort: max`. Depois, `gh pr checks --watch` de novo.
- Cada falha conta uma tentativa; na terceira, baixa.

**Baixa:** `gh issue edit N --remove-label in-progress --add-label ready-for-human`, comentário com `<!-- automacao -->` na primeira linha e o diagnóstico (gate, achado, hipótese) e `PushNotification` de uma linha. O PR fica aberto e a subida não roda.

Todo comentário do agente no GitHub leva `<!-- automacao -->` na primeira linha.

## Passo 9: critérios de aceite na issue

Com os gates verdes e issue vinculada, marque no corpo **da issue** cada critério entregue (`- [x]`) e risque o descopado (`- [ ] ~~...~~`). Sem descope e sem checkbox fora dos critérios, basta `sed 's/^- \[ \] /- [x] /'` no corpo e `gh issue edit N --body-file`.

## Passo 10: a subida

```bash
python3 .claude/skills/onda-enxuta/scripts/fechar_onda.py --prs "$PR"
```

Em segundo plano; leia só a saída. O que fazer em cada código de saída está na docstring do script. Os dois que pedem ação de quem rodou:
- **Saída 2 com `conflito no merge de #N em: <arquivos>`:** `ana-corretor` motivo `conflito` com os arquivos, CI de novo, subida de novo. Conta tentativa.
- **Saídas 6, 7 e 8:** `PushNotification` com a linha que o script imprimiu. A 6 conta tentativa.

**Sem deploy:** o `services` do `docs/spec/deploy/project.json` está vazio (`/deploy status` diz), então a subida trata todo PR como ferramenta e termina no merge: sem versão, tag, build, health nem registro. A saída 0 já é o PR mergeado com o CI verde. Mudança no prompt ou nas ferramentas da Ana na plataforma fazer.ai é ato do Pedro, com aprovação explícita, fora da subida.

**Pendência só humana** (credencial, ato na plataforma fazer.ai, resposta da Global Health): uma issue `ready-for-human` por pendência, ligada ao PRD pelo corpo ("Pai: #N"), nunca como sub-issue nativa.

## Saída

```
✅ ship PR #<PR> verde · gates: <lista> · Issue #<N> com critérios marcados
   Subida: <última linha do fechar_onda.py>
```

Baixa: `❌` e, na segunda linha, o gate e o motivo.

## Retomada (`--resume`)

| Estado | Retoma em |
|---|---|
| Sem commit | Passo 5 |
| Commit sem push | Passo 7 |
| Push sem PR | Passo 8 |
| PR aberto, gates pendentes | Passo 8 |
| Gates verdes | Passos 9 e 10 |
| PR mergeado | Nada; a subida já rodou |

## Regras

- Nunca `git push --force` na `main`; `--force-with-lease` só na branch própria.
- Nunca rodar `/ship` numa branch que já tem PR aberto sem `--resume`.
- Nunca logar token ou segredo.
