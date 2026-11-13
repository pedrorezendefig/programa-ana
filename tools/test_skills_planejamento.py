"""Skills de planejamento e claim instaladas na Ana (vindas do IAE).

O fluxo veio do Hospital pelo IAE. Estes testes travam a adaptação: o router é
o `/ask-ana`, e nenhuma skill do pipeline carrega sobra do Hospital Reuniões
(o router antigo, as skills de entrega ao diretor, o Manual) nem do IAE (os
sócios, a Plataforma de cursos, o aluno). O hospital aqui é o cliente da Ana:
citar o hospital é permitido; a pasta e o painel do Hospital Reuniões, não, fora
dos trechos de exemplo de EXEMPLO_DO_HOSPITAL.

O critério do lint do cabeçalho mora no último teste de `test_lint_skills.py`,
que roda contra o `.claude/skills/` real.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml

SKILLS = Path(__file__).resolve().parent.parent / ".claude" / "skills"

# As skills do pipeline instaladas na Ana.
DA_ISSUE = [
    "ask-ana",
    "ship",
    "onda-enxuta",
    "deploy",
    "setup-maquina",
    "retro-onda",
    "tdd",
    "to-prd",
    "to-issues",
    "pegar-issue",
    "minhas-issues",
    "triage",
    "wayfinder",
    "express",
    "passagem",
    "research",
    "prototype",
    "resolver-conflitos",
    "diagnose",
    "codebase-design",
    "improve-codebase-architecture",
    "montar-ondas-enxutas",
    "grill-with-docs",
    "grill-me",
    "domain-modeling",
]

# O que só existe no Hospital Reuniões (o router antigo, as skills de entrega
# ao diretor, o Manual do usuário, o painel) e no IAE (o router, os sócios, a
# Plataforma de cursos, o aluno).
PROIBIDO = re.compile(
    r"/ask-pedro|/ask-iae|/divulgar|/mensagem-prd|/manual\b|/montar-manual|\bManual\b|docs/manual"
    r"|hospital-issue-|hospital-" r"reunioes/|Hospital OS|IAE OS|\biae-(implementador|revisor|corretor)"
    r"|[Ss]ócios?\b|Plataforma de cursos|\balunos?\b|\bcursos?\b"
)

# O Pacote do fluxo do PedroOS cita o Hospital Reuniões de propósito, como exemplo.
# Só estes trechos saem da busca: o parêntese "(no Hospital, ...)", o parêntese com o
# caminho do roteiro do manual de lá e o nome da seção "Manual: páginas que mudam" do PRD.
EXEMPLO_DO_HOSPITAL = re.compile(
    r"\(no Hospital, [^()]*\)|\(`hospital-" r"reunioes/frontend/scripts/manual/[^`]*`[^()]*\)"
    r"|Manual: páginas que mudam"
)


def _arquivos(skill: str) -> list[Path]:
    return sorted(p for p in (SKILLS / skill).rglob("*") if p.is_file() and p.suffix in {".md", ".py", ".sh"})


def _cabecalho(arquivo: Path) -> dict:
    texto = arquivo.read_text(encoding="utf-8")
    return yaml.safe_load(texto.split("---", 2)[1])


def test_ask_ana_e_o_router_e_nao_cita_ask_pedro_ask_iae_divulgar_nem_manual() -> None:
    skill = SKILLS / "ask-ana" / "SKILL.md"
    assert skill.is_file()
    assert _cabecalho(skill)["name"] == "ask-ana"
    texto = skill.read_text(encoding="utf-8")
    assert "/ask-ana" in texto
    for termo in ("/ask-pedro", "/ask-iae", "/divulgar", "Manual", "/manual"):
        assert termo not in texto, termo
    assert not (SKILLS / "ask-pedro").exists()
    assert not (SKILLS / "ask-iae").exists()


@pytest.mark.parametrize("skill", DA_ISSUE)
def test_skill_sem_sobra_do_hospital_reunioes_nem_do_iae(skill: str) -> None:
    arquivos = _arquivos(skill)
    assert arquivos, f"a skill {skill} não está instalada"
    achados = []
    for arquivo in arquivos:
        for n, linha in enumerate(arquivo.read_text(encoding="utf-8").splitlines(), 1):
            if PROIBIDO.search(EXEMPLO_DO_HOSPITAL.sub("", linha)):
                achados.append(f"{arquivo.relative_to(SKILLS)}:{n}: {linha.strip()[:120]}")
    assert not achados, "\n".join(achados)


@pytest.mark.parametrize("skill", DA_ISSUE)
def test_skill_sem_travessao_nem_meia_risca(skill: str) -> None:
    achados = [
        f"{arquivo.relative_to(SKILLS)}:{n}"
        for arquivo in _arquivos(skill)
        for n, linha in enumerate(arquivo.read_text(encoding="utf-8").splitlines(), 1)
        if "\u2014" in linha or "\u2013" in linha
    ]
    assert not achados, "\n".join(achados)


def test_pegar_issue_faz_o_claim_com_in_progress_e_assignee() -> None:
    texto = (SKILLS / "pegar-issue" / "SKILL.md").read_text(encoding="utf-8")
    claim = re.search(r"gh issue edit <N>[^\n`]*", texto)
    assert claim, "o /pegar-issue perdeu o comando de claim"
    assert "--add-label in-progress" in claim.group(0)
    assert "--add-assignee @me" in claim.group(0)
    assert "--remove-label ready-for-agent" in claim.group(0)
