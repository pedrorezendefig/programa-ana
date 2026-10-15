"""O que a cópia do IAE OS muda para virar o Ana OS (ADR-0035).

Os outros arquivos desta pasta vieram do IAE e guardam as asserções de lá (a
pasta do app, `ana/`, mora no test_coletor_fases.py, com a fixture adaptada).
Aqui ficam os critérios que só existem na Ana: o nome na tela, a paleta Ledger,
o repo de reserva, o serviço com.ana.os na porta 8777 (o os/server.py) e as 4
abas abrindo com os arquivos do repo, mais as sub-abas das esferas do Retrato.
"""

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

DASH = Path(__file__).resolve().parents[1]
RAIZ = DASH.parents[1]
STATIC = DASH / "static"
APP_JS = (STATIC / "app.js").read_text(encoding="utf-8")

sys.path.insert(0, str(DASH))
import collect  # noqa: E402

ISSUE_DA_ANA = {
    "number": 19,
    "title": "A bateria das capacidades fecha 29 de 29",
    "state": "OPEN",
    "labels": [{"name": "in-progress"}],
    "createdAt": "2026-10-14T18:00:00Z",
    "closedAt": None,
    "assignees": [{"login": "pedrorezendefig"}],
    "author": {"login": "pedrorezendefig"},
    "body": "## Pai\n\n#1\n",
    "url": "https://github.com/pedrorezendefig/programa-ana/issues/19",
}
PAGINA_VAZIA = json.dumps(
    {"data": {"repository": {"issues": {"pageInfo": {"hasNextPage": False, "endCursor": None}, "nodes": []}}}}
)


def _texto_da_tela():
    """Tudo que o painel pode mostrar: a SPA inteira e o que o Python manda para ela.

    O style.css fica de fora: não tem texto que aparece na tela, e o comentário
    da linha 1 continua o do Hospital porque só o bloco :root muda."""
    arquivos = [p for p in STATIC.rglob("*")
                if p.is_file() and "vendor" not in p.parts and p.suffix != ".css"]
    arquivos += sorted(DASH.glob("*.py"))
    return {str(p.relative_to(DASH)): p.read_text(encoding="utf-8") for p in arquivos}


def test_rodape_diz_ana_os():
    assert "Ana OS · somente leitura" in APP_JS


def test_nenhum_texto_do_painel_cita_o_iae():
    citam = sorted(nome for nome, texto in _texto_da_tela().items() if re.search(r"\biae\b", texto, re.I))
    assert citam == []


# ---------- coleta: o repo de reserva é o da Ana ----------


def _gh_da_ana(chamadas):
    """gh e git falsos: o gh responde uma issue da Ana; o git não tem origin."""

    def run(cmd, cwd, timeout=None):
        chamadas.append(cmd)
        if cmd[0] == "git":
            raise RuntimeError("sem origin")
        if cmd[:3] == ["gh", "issue", "list"]:
            return json.dumps([ISSUE_DA_ANA])
        if cmd[:3] == ["gh", "pr", "list"]:
            return "[]"
        return PAGINA_VAZIA

    return run


def test_coleta_sem_repo_no_state_le_as_issues_da_ana(monkeypatch, tmp_path):
    # o state.json da Ana não tem bloco production: a coleta cai no repo de reserva
    (tmp_path / "docs" / "spec" / "deploy").mkdir(parents=True)
    for nome in ("state.json", "history.json", "project.json"):
        shutil.copy(RAIZ / "docs" / "spec" / "deploy" / nome, tmp_path / "docs" / "spec" / "deploy" / nome)
    chamadas = []
    monkeypatch.setattr(collect, "_run", _gh_da_ana(chamadas))

    data = collect.collect(tmp_path)

    assert data["github"]["error"] is None
    assert [i["number"] for i in data["github"]["issues"]] == [19]
    assert data["repo_slug"] == "pedrorezendefig/programa-ana"
    assert data["repo_url"] == "https://github.com/pedrorezendefig/programa-ana"
    graphql = [c for c in chamadas if c[:3] == ["gh", "api", "graphql"]]
    assert graphql, "a coleta não pediu sub-issues nem bloqueios"
    for c in graphql:
        assert "owner=pedrorezendefig" in c and "name=programa-ana" in c, c


# ---------- paleta: só o :root muda, e o favicon segue ----------

CSS = (STATIC / "style.css").read_text(encoding="utf-8")
INDEX = (STATIC / "index.html").read_text(encoding="utf-8")


def _raiz():
    return re.search(r":root\{(.*?)\}", CSS, re.S).group(1)


def _token(nome):
    m = re.search(rf"--{nome}:\s*(#[0-9a-fA-F]{{6}})", _raiz())
    assert m, f"--{nome} fora do :root"
    return m.group(1).lower()


def test_paleta_da_marca_no_root():
    # Ledger: o preto é a marca; a barra é o preto da sidebar, a tinta o da ação
    assert (_token("brand"), _token("navy")) == ("#111111", "#0d0d0d")
    assert "rgba(15,47,99" not in _raiz() and "rgba(1,33,61" not in _raiz()
    assert "--navy40:rgba(13,13,13,.40)" in _raiz()


def test_favicon_segue_a_paleta():
    fundo = re.search(r"%3Crect[^%]*fill='%23([0-9a-fA-F]{6})'", INDEX).group(1).lower()
    circulo = re.search(r"%3Ccircle[^%]*fill='%23([0-9a-fA-F]{6})'", INDEX).group(1).lower()
    assert ("#" + fundo, "#" + circulo) == (_token("navy"), _token("on-navy"))


# ---------- serviço do macOS: o os/server.py na porta 8777, ao lado do Hospital OS ----------

# o label do serviço do Hospital OS, partido para o test_fluxo_ana.py não acusar a pasta do app de lá
PLIST_DO_HOSPITAL = "com.hospital" + "-reunioes.workflow-dashboard.plist"


def _rodar_instalador(tmp_path, *args):
    """Roda o install-launchd.sh numa árvore principal falsa, com HOME e launchctl falsos.

    O launchctl de verdade nunca roda: o falso vem antes no PATH e só anota os
    argumentos. O HOME falso nasce com o plist do Hospital OS, que não pode mudar."""
    repo = tmp_path / "repo"
    (repo / ".git").mkdir(parents=True, exist_ok=True)  # árvore principal: .git é pasta, não arquivo
    (repo / "tools" / "workflow-dashboard").mkdir(parents=True, exist_ok=True)
    script = repo / "tools" / "workflow-dashboard" / "install-launchd.sh"
    shutil.copy(DASH / "install-launchd.sh", script)
    agentes = tmp_path / "home" / "Library" / "LaunchAgents"
    if not agentes.exists():
        agentes.mkdir(parents=True)
        (agentes / PLIST_DO_HOSPITAL).write_text("plist do Hospital OS\n", encoding="utf-8")
    bin_falso = tmp_path / "bin"
    bin_falso.mkdir(exist_ok=True)
    registro = tmp_path / "launchctl.txt"
    registro.write_text("", encoding="utf-8")
    launchctl = bin_falso / "launchctl"
    launchctl.write_text(f'#!/bin/sh\necho "$@" >> "{registro}"\n', encoding="utf-8")
    launchctl.chmod(0o755)
    assert os.access(launchctl, os.X_OK)
    env = {**os.environ, "HOME": str(tmp_path / "home"), "PATH": f"{bin_falso}:{os.environ['PATH']}"}
    out = subprocess.run(["bash", str(script), *args], env=env, capture_output=True, text=True, check=False)
    assert out.returncode == 0, out.stderr
    return agentes, registro.read_text(encoding="utf-8").splitlines()


def test_instalador_sobe_o_ana_os_na_porta_8777_sem_tocar_no_hospital(tmp_path):
    agentes, chamadas = _rodar_instalador(tmp_path)

    plist = (agentes / "com.ana.os.plist").read_text(encoding="utf-8")
    assert "<key>Label</key><string>com.ana.os</string>" in plist
    assert "<string>--porta</string><string>8777</string>" in plist
    assert "os/server.py</string>" in plist
    # log próprio: o do Hospital OS é ~/Library/Logs/workflow-dashboard.log
    assert "/Library/Logs/workflow-dashboard.log" not in plist
    assert (agentes / PLIST_DO_HOSPITAL).read_text(encoding="utf-8") == "plist do Hospital OS\n"
    assert chamadas and all("com.ana.os" in c for c in chamadas), chamadas
    assert not any("hospital" in c for c in chamadas), chamadas


def test_desinstalar_tira_so_o_ana_os(tmp_path):
    _rodar_instalador(tmp_path)
    agentes, chamadas = _rodar_instalador(tmp_path, "uninstall")

    assert not (agentes / "com.ana.os.plist").exists()
    assert (agentes / PLIST_DO_HOSPITAL).read_text(encoding="utf-8") == "plist do Hospital OS\n"
    assert chamadas and not any("hospital" in c for c in chamadas), chamadas


# ---------- as 4 abas abrem com os arquivos de verdade da Ana ----------

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_router import _app, com_node  # noqa: E402

ABAS = {
    "#issues": ("issues", "Issues"),
    "#prs": ("prs", "PRs"),
    # a Ana ainda não tem deploy: a subida termina no merge
    "#producao": ("producao", "sem deploy ainda"),
    # as esferas do Retrato: o cabeçalho é do painel, o desenho vem do quadro
    "#documentacao/faz": ("documentacao", "O que a Ana faz"),
    "#documentacao/gh": ("documentacao", "Global Health"),
    "#documentacao/fluxo": ("documentacao", "Do pedido à produção"),
    "#documentacao/mapa": ("documentacao", "Mapa da app"),
    "#documentacao/decisoes": ("documentacao", "Decisões de arquitetura"),
    "#documentacao/glossario": ("documentacao", "Glossário do domínio"),
}


def _payload_da_ana(monkeypatch):
    """O /api/data montado dos arquivos do repo (contrato de deploy, snapshots, ADRs,
    CONTEXT.md), com o gh falso devolvendo uma issue da Ana."""
    monkeypatch.setattr(collect, "_run", _gh_da_ana([]))
    return json.loads(json.dumps(collect.collect(RAIZ)))


def test_snapshots_da_ana_chegam_ao_mapa_sem_erro(monkeypatch):
    dados = _payload_da_ana(monkeypatch)
    nomes = [s["name"] for s in dados["snapshots"]]
    assert nomes == ["ROTAS", "ENTIDADES", "SCHEMA", "MIGRATIONS", "INTEGRACOES", "ESTRUTURA", "FLUXOGRAMAS"]
    for s in dados["snapshots"]:
        assert s["body_md"].strip(), s["name"]
    fluxogramas = next(s for s in dados["snapshots"] if s["name"] == "FLUXOGRAMAS")
    assert fluxogramas["diagramas"], "o diagrama de contexto da Ana não chegou ao Mapa"


@com_node
def test_as_quatro_abas_e_as_sub_abas_abrem_com_os_dados_da_ana(monkeypatch, tmp_path):
    dados = _payload_da_ana(monkeypatch)
    fluxo = (STATIC / "fluxo.json").read_text(encoding="utf-8")
    marked = (
        f"import _marked from '{(STATIC / 'vendor' / 'marked.min.js').as_uri()}';\n"
        "globalThis.marked = window.marked = _marked;\n"
    )
    for hash_, (aba, titulo) in ABAS.items():
        tab, rota, html = _app(
            tmp_path,
            "[S.tab, location.hash, _view.innerHTML]",
            hash_inicial=hash_,
            dados=dados,
            preludio_extra=marked + f"_respostas['/fluxo.json'] = {fluxo};\n",
            antes="await _esperar();",
        )
        assert (tab, rota) == (aba, hash_)
        assert titulo in html, hash_
    assert ISSUE_DA_ANA["title"] in _app(tmp_path, "_view.innerHTML", hash_inicial="#issues", dados=dados)
