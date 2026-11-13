"""Testes da adaptação do fluxo de entrega à Ana.

O motor das ondas veio do Hospital pelo IAE. Estes testes travam o que muda
aqui: os agentes da onda com o nome da Ana, nenhum script apontando para a
pasta do app do Hospital nem do IAE, a lente de segurança do revisor olhando
dado de paciente e produção, e a subida terminando no merge porque o
`docs/spec/deploy/project.json` não tem serviço.
"""

from __future__ import annotations

import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
AGENTES = RAIZ / ".claude" / "agents"


def test_agentes_da_onda_tem_o_nome_da_ana_e_nenhum_e_do_hospital_nem_do_iae() -> None:
    nomes = sorted(p.stem for p in AGENTES.glob("*.md"))
    assert {"ana-implementador", "ana-revisor", "ana-corretor"} <= set(nomes)
    assert not [n for n in nomes if n.startswith(("hr-", "iae-"))]
    for papel in ("implementador", "revisor", "corretor"):
        cabecalho = (AGENTES / f"ana-{papel}.md").read_text(encoding="utf-8").split("---")[1]
        assert re.search(rf"^name: ana-{papel}$", cabecalho, re.M)


def test_quem_dispara_os_agentes_chama_pelo_nome_novo() -> None:
    velho = re.compile(r"\b(hr|iae)-(implementador|revisor|corretor\b|\*)")
    citam = [str(p.relative_to(RAIZ)) for p in _textos((".claude", ".github", "docs/agents"))
             if velho.search(p.read_text(encoding="utf-8", errors="replace"))]
    assert citam == []


def test_lente_de_seguranca_do_revisor_protege_paciente_e_nunca_chama_producao() -> None:
    revisor = (AGENTES / "ana-revisor.md").read_text(encoding="utf-8")
    for termo in ("dado de paciente exposto", "CPF", "token da Global Health", "credencial do Oracle",
                  "Chamada a produção é must-fix"):
        assert termo in revisor, termo
    assert not re.search(r"aluno|Facilitador|supabase|RLS", revisor)


def test_nenhum_script_aponta_para_a_pasta_do_app_do_hospital_nem_do_iae() -> None:
    # A pasta do app do Hospital e a do IAE, partidas para este arquivo não se acusar.
    # `ana/plataforma/` (os scripts da fazer.ai) é da Ana e não conta.
    velha = re.compile("hospital" + "-reunioes/" + "|(?<![\\w/])" + "plata" + "forma/")
    citam = [str(p.relative_to(RAIZ)) for p in _textos((".claude", "tools", ".github"), (".py", ".sh", ".yml"))
             if velha.search(p.read_text(encoding="utf-8", errors="replace"))]
    assert citam == []


def test_o_app_do_fluxo_e_a_pasta_ana() -> None:
    assert _subida().APP == "ana/"
    projeto = json.loads((RAIZ / "docs/spec/deploy/project.json").read_text(encoding="utf-8"))
    assert projeto["git"]["root_relative"] == "ana"
    assert projeto["services"] == []


SUBIDA = RAIZ / ".claude" / "skills" / "onda-enxuta" / "scripts" / "fechar_onda.py"
SEM_PLATAFORMA = {"schema_version": "2.0", "project": {"name": "Ana"}, "git": {"repo": "x/programa-ana", "branch": "main"},
                  "coolify": None, "services": []}


def _subida():
    sys.path.insert(0, str(SUBIDA.parent))  # o ci_sem_runner mora ao lado
    spec = importlib.util.spec_from_file_location("fechar_onda_teste", SUBIDA)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def _rodar_subida(monkeypatch, tmp_path: Path, arquivos_do_pr: list[str]):
    """Roda o `main()` da subida num PR verde, com o GitHub, o git e o semáforo
    trocados por dublês, e sem o CLI de nenhuma plataforma na máquina. Devolve
    o código de saída e o que foi mergeado. Qualquer passo de deploy (versão,
    tag, build, health, registro) falha o teste."""
    fo = _subida()
    (tmp_path / "docs/spec/deploy").mkdir(parents=True)
    (tmp_path / "docs/spec/deploy/project.json").write_text(json.dumps(SEM_PLATAFORMA), encoding="utf-8")
    pr = {"number": 7, "state": "OPEN", "mergeable": "MERGEABLE", "baseRefName": "main",
          "statusCheckRollup": [{"name": "ci", "conclusion": "SUCCESS"}], "headRefName": "chore/x-5",
          "headRefOid": "h" * 40, "isCrossRepository": False, "title": "chore: x", "body": "",
          "files": [{"path": a} for a in arquivos_do_pr], "commits": [], "closingIssuesReferences": []}

    def run(cmd, cwd=None, check=True, timeout=600, env=None):
        saida = "\n".join(arquivos_do_pr) if cmd[:2] == ["git", "diff"] else "abc12345"
        return subprocess.CompletedProcess(cmd, 0, stdout=saida, stderr="")

    def proibido(*_a, **_k):
        raise AssertionError("a subida tentou deploy sem plataforma")

    mergeados = []
    monkeypatch.setattr(fo, "run", run)
    monkeypatch.setattr(fo, "gh_json", lambda args, cwd=None: pr)
    monkeypatch.setattr(fo.shutil, "which", lambda b: None if b == "coolify" else f"/bin/{b}")
    monkeypatch.setattr(fo, "conferir_migrations", lambda raiz, infos: [i.update(head_conferido="h" * 40) for i in infos] and [])
    monkeypatch.setattr(fo, "pegar_semaforo", lambda *a, **k: None)
    monkeypatch.setattr(fo, "semaforo", lambda *a, **k: 0)
    monkeypatch.setattr(fo, "conferir_bloqueios", lambda raiz, infos: [])
    monkeypatch.setattr(fo, "tirar_os_sem_volta", lambda raiz, infos, novas, chave, dry: (infos, novas, []))
    monkeypatch.setattr(fo, "criar_worktree", lambda raiz, sessao: tmp_path / "wt")
    monkeypatch.setattr(fo, "remover_worktree", lambda raiz, wt: None)
    monkeypatch.setattr(fo, "versao_em_producao", lambda wt, ref: "0.0.0")
    monkeypatch.setattr(fo, "preparar_pr", lambda raiz, wt, info, entraram: info["headRefOid"])
    monkeypatch.setattr(fo, "mergear_pela_api", lambda raiz, n, head, titulo: mergeados.append(n) or "s" * 40)
    monkeypatch.setattr(fo, "limpar_worktrees_de_agente", lambda raiz, entregues=None: 0)
    for passo in ("coolify_json", "setar_app_version_nos_apps", "imagem_no_ar", "criar_tag", "esperar_build",
                  "subir_imagem", "checar_health", "registrar_pela_action", "esperar_migrations_do_lote"):
        monkeypatch.setattr(fo, passo, proibido)
    monkeypatch.setattr(sys, "argv", ["fechar_onda.py", "--prs", "7", "--raiz", str(tmp_path)])
    try:
        codigo = fo.main()
    except SystemExit as e:
        codigo = e.code
    return codigo, mergeados


def test_subida_de_pr_de_ferramenta_mergeia_sem_cli_de_plataforma(monkeypatch, tmp_path: Path, capsys) -> None:
    codigo, mergeados = _rodar_subida(monkeypatch, tmp_path, [".claude/skills/ship/SKILL.md"])
    assert (codigo, mergeados) == (0, [7]), capsys.readouterr().out


def test_subida_sem_plataforma_termina_no_merge_mesmo_com_pr_do_app(monkeypatch, tmp_path: Path, capsys) -> None:
    codigo, mergeados = _rodar_subida(monkeypatch, tmp_path, ["ana/prompt/nucleo-comum.md"])
    saida = capsys.readouterr().out
    assert (codigo, mergeados) == (0, [7]), saida
    assert "sem build, health nem registro" in saida


STATUS = RAIZ / ".claude" / "skills" / "deploy" / "scripts" / "status_deploy.py"


def _status(raiz: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, str(STATUS), "--raiz", str(raiz)], check=False,
                          capture_output=True, text=True, encoding="utf-8")


def test_deploy_status_diz_que_o_projeto_ainda_nao_tem_deploy() -> None:
    feito = _status(RAIZ)
    assert feito.returncode == 0, feito.stderr
    assert "Projeto Ana: ainda não tem deploy" in feito.stdout
    assert "termina no merge" in feito.stdout


def test_deploy_status_nao_diz_sem_deploy_quando_a_plataforma_chega(tmp_path: Path) -> None:
    (tmp_path / "docs/spec/deploy").mkdir(parents=True)
    com_servico = dict(SEM_PLATAFORMA, services=[{"id": "backend", "type": "node"}])
    (tmp_path / "docs/spec/deploy/project.json").write_text(json.dumps(com_servico), encoding="utf-8")
    feito = _status(tmp_path)
    assert feito.returncode != 0
    assert "ainda não tem deploy" not in feito.stdout


def _textos(pastas, sufixos=(".md", ".py", ".sh", ".yml", ".txt")):
    """Arquivos de texto do repositório, sem os worktrees de agente que moram
    dentro de `.claude/worktrees/` na árvore principal."""
    for pasta in pastas:
        for p in (RAIZ / pasta).rglob("*"):
            if p.is_file() and p.suffix in sufixos and "worktrees" not in p.relative_to(RAIZ).parts:
                yield p
