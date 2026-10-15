"""Testes da documentação do fluxo instalado na Ana (vindo do IAE).

Cada teste trava uma parte da instalação: as labels documentadas são as do
fluxo da Ana, o onboarding leva do clone ao painel aberto, o README tem o mapa
de pastas no formato do Hospital e o router só cita skill que existe.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]

# As labels do fluxo no repo pedrorezendefig/programa-ana depois da migração das
# antigas (`canal:*` e `radar` viram papéis de triage, ver triage-labels.md).
# Label nova no GitHub entra aqui e em docs/agents/triage-labels.md juntas.
LABELS_DO_REPO = {
    "bug", "documentation", "duplicate", "enhancement", "good first issue",
    "help wanted", "invalid", "question", "wontfix",
    "needs-triage", "needs-info", "ready-for-agent", "ready-for-human", "in-progress", "revisor-comentou",
    "fatia:P", "fatia:M", "fatia:G",
    "type:feature", "type:fix", "type:chore", "type:refactor", "type:docs", "type:spec", "type:test",
    "area:ana", "area:global-health", "area:fazer-ai", "area:chatwoot", "area:app-hospital", "area:os",
    "wayfinder:map", "wayfinder:research", "wayfinder:prototype", "wayfinder:grilling", "wayfinder:task",
}


def _labels_nas_tabelas(texto: str) -> set[str]:
    """Primeira célula de cada linha de tabela, quando ela é um código: é a label."""
    return set(re.findall(r"^\| `([^`]+)` \|", texto, re.M))


def test_triage_labels_lista_as_labels_do_fluxo_com_as_areas_da_ana() -> None:
    texto = (RAIZ / "docs/agents/triage-labels.md").read_text(encoding="utf-8")
    assert _labels_nas_tabelas(texto) == LABELS_DO_REPO


def test_onboarding_dev_leva_do_clone_ao_painel_aberto_passando_pelo_hook() -> None:
    texto = (RAIZ / "docs/onboarding/dev.md").read_text(encoding="utf-8")
    passos = [
        "gh repo clone pedrorezendefig/programa-ana",
        "git config core.hooksPath .githooks",
        "tools/workflow-dashboard/install-launchd.sh",
        "http://localhost:8800",
    ]
    posicoes = [texto.find(p) for p in passos]
    assert -1 not in posicoes, dict(zip(passos, posicoes))
    assert posicoes == sorted(posicoes), "os passos têm de aparecer na ordem do primeiro dia"


CABECALHO_RAIZ = "| Pasta ou arquivo | O que é | Por que existe | O que você acha dentro | Para que serve no dia a dia |"
CABECALHO_DOCS = "| Pasta | O que é | Por que existe | O que tem | Quando abrir |"


def _pastas_do_git() -> set[str]:
    """Pastas de nível 1 e 2 que o git conhece, sem cache de Python."""
    # -z: sem ele o git põe entre aspas o caminho com acento ("ana/api-mv/Descrição...").
    arquivos = subprocess.run(["git", "ls-files", "-z"], cwd=RAIZ, check=True, capture_output=True,
                              text=True).stdout.split("\0")
    pastas = set()
    for arquivo in arquivos:
        partes = arquivo.split("/")[:-1]
        for nivel in (1, 2):
            if len(partes) >= nivel:
                pastas.add("/".join(partes[:nivel]))
    return {p for p in pastas if "__pycache__" not in p}


def test_readme_tem_o_mapa_de_pastas_no_formato_do_hospital() -> None:
    texto = (RAIZ / "README.md").read_text(encoding="utf-8")
    assert CABECALHO_RAIZ in texto
    assert CABECALHO_DOCS in texto
    bloco = re.search(r"<!-- cobertura:start -->\n```\n(.*?)```\n<!-- cobertura:end -->", texto, re.S)
    assert bloco, "falta o bloco cobertura"
    cobertura = set(bloco.group(1).split())
    assert _pastas_do_git() - cobertura == set()
    for pasta in {p for p in cobertura if "/" not in p}:
        assert f"| `{pasta}/` |" in texto, f"{pasta}/ fora da tabela da raiz"


ROUTER = RAIZ / ".claude" / "skills" / "ask-ana" / "SKILL.md"


def test_router_so_cita_skill_que_existe() -> None:
    """Toda `/skill` citada no /ask-ana tem pasta em .claude/skills/. O `/snapshot`
    entra pela instalação do painel, em paralelo; enquanto não chega, é o único
    nome tolerado."""
    texto = ROUTER.read_text(encoding="utf-8")
    citadas = set(re.findall(r"`/([a-z][a-z0-9-]+)", texto))
    existem = {p.name for p in (RAIZ / ".claude" / "skills").iterdir() if (p / "SKILL.md").is_file()}
    faltam = citadas - existem - {"snapshot", "nome"}  # `/nome` é o exemplo da convenção
    assert faltam == set()


def test_router_tem_o_mapa_do_fluxo_e_as_skills_proprias_da_ana() -> None:
    texto = ROUTER.read_text(encoding="utf-8")
    for skill in ("grill-with-docs", "to-prd", "to-issues", "pegar-issue", "tdd", "ship", "onda-enxuta",
                  "express", "minhas-issues", "check", "bancada", "testes"):
        assert f"`/{skill}" in texto, skill
