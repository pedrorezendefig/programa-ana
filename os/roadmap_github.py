#!/usr/bin/env python3
"""Ana OS: o roadmap lido das Issues do GitHub (ADR-0031).

Monta, a partir do `gh`, o MESMO objeto que /api/roadmap devolvia do roadmap.json:
  {estagio, atualizado, lido_em, repo, tarefas: [...], radar: [...]}
Cada tarefa: {id, numero, url, titulo, status (fazer|feito), deps, tema, areas, canal,
  canal_desde, mesa {destrava, gesto}, pronto_quando, prompt, nota, ficha, antes, em_curso}.

As labels de estado sao os papeis de triage do fluxo de trabalho (docs/agents/triage-labels.md),
que substituiram as antigas `canal:*` e `radar`: `ready-for-human` (antes `canal:dispare` e
`canal:aguardando`: so o Pedro, ou ja pedido a terceiro), `ready-for-agent` (antes
`canal:comigo`: uma sessao resolve) e `needs-triage` (antes `radar`: fora do grafo). O campo
`canal` guarda as chaves que o Cockpit ja le: `ready-for-human` vira `dispare` e
`ready-for-agent` vira `comigo`; `aguardando` fica vazio, porque a migracao juntou os dois
canais humanos. Issue `in-progress` sem papel (o claim tira o `ready-for-agent`) conta como
`comigo`.
Fonte unica: o GitHub. Nenhuma escrita aqui; card novo, canal movido e card feito
sao comandos `gh` na sessao do terminal.

Tambem serve o detalhe de uma issue (/api/issue/<n>): corpo cru, comentarios e a
linha do tempo (labels, fechamentos, atribuicoes), para o card do Cockpit.

Uso direto (o /check usa):  python3 os/roadmap_github.py  -> imprime o JSON.
"""
import json
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

REPO = "pedrorezendefig/programa-ana"
GH_TIMEOUT = 40
CACHE_S = 60
_CACHE = {"em": 0.0, "resposta": None}

AREAS = ["global-health", "ana", "fazer-ai", "chatwoot", "app-hospital", "os"]
CANAIS = ["dispare", "comigo", "aguardando"]
# label de triage -> chave de canal que o Cockpit le (ver a docstring)
FILAS = {"ready-for-human": "dispare", "ready-for-agent": "comigo"}
RADAR = "needs-triage"
SECOES = {"destrava": "destrava", "gesto": "gesto", "pronto quando": "pronto_quando",
          "prompt": "prompt", "bloqueada por": "deps", "nota": "nota"}


def _gh(*args):
    r = subprocess.run(["gh", *args], capture_output=True, text=True, timeout=GH_TIMEOUT)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout).strip()[:400] or "gh falhou")
    return r.stdout


def _gh_json(*args):
    return json.loads(_gh(*args) or "null")


def _data(iso):
    return (iso or "")[:10]


def parse_corpo(body):
    """Separa o corpo da issue nas secoes fixas do ADR-0031."""
    out = {"antes": None, "prioridade": None, "secoes": {}}
    atual = None
    for linha in (body or "").replace("\r", "").split("\n"):
        m = re.match(r"^##\s+(.+?)\s*$", linha)
        if m:
            chave = SECOES.get(m.group(1).strip().lower())
            atual = chave or ("_" + m.group(1).strip().lower())
            out["secoes"].setdefault(atual, [])
            continue
        if atual is None:
            m = re.match(r"^Antes:\s*(\S+)", linha)
            if m:
                out["antes"] = m.group(1)
                continue
            m = re.match(r"^Prioridade:\s*(\d+)\s*/\s*10", linha)
            if m:
                out["prioridade"] = int(m.group(1))
                continue
            if linha.strip():
                out["secoes"].setdefault("nota", []).append(linha)
            continue
        out["secoes"][atual].append(linha)
    secoes = {k: "\n".join(v).strip() for k, v in out["secoes"].items()}
    deps = re.findall(r"#(\d+)", secoes.get("deps", ""))
    out["secoes"] = secoes
    out["deps"] = deps
    return out


def parse_ficha(comentarios):
    """Acha o comentario '## Ficha' e devolve {fez, mudou, valor}."""
    for c in reversed(comentarios or []):
        corpo = c.get("body") or ""
        if "## Ficha" not in corpo:
            continue
        f = {}
        for rot, chave in (("Fez", "fez"), ("Mudou", "mudou"), ("Valor", "valor")):
            m = re.search(r"^" + rot + r":\s*(.+)$", corpo, re.M)
            if m:
                f[chave] = m.group(1).strip()
        if f:
            return f
    return None


def _eventos(numero):
    try:
        return _gh_json("api", f"repos/{REPO}/issues/{numero}/events", "--paginate")
    except RuntimeError:
        return []


def _comentarios(numero):
    try:
        return _gh_json("api", f"repos/{REPO}/issues/{numero}/comments", "--paginate")
    except RuntimeError:
        return []


def _canal_desde(eventos, label):
    """Data do ultimo evento 'labeled' da label de triage que deu o canal."""
    data = None
    for e in eventos:
        if e.get("event") == "labeled" and (e.get("label") or {}).get("name") == label:
            data = _data(e.get("created_at"))
    return data


def _canal(labels):
    """(chave de canal, label que a deu) pelas labels de triage; (None, None) sem papel."""
    for label, canal in FILAS.items():
        if label in labels:
            return canal, label
    if "in-progress" in labels:
        return "comigo", "in-progress"
    return None, None


def _issue_para_item(it, eventos, comentarios):
    labels = [l["name"] for l in it.get("labels", [])]
    areas = [l[5:] for l in labels if l.startswith("area:")]
    canal, label_do_canal = _canal(labels)
    p = parse_corpo(it.get("body"))
    s = p["secoes"]
    feito = it.get("state", "").upper() == "CLOSED"
    item = {
        "id": str(it["number"]),
        "numero": it["number"],
        "url": it.get("url"),
        "titulo": it.get("title"),
        "status": "feito" if feito else "fazer",
        "deps": p["deps"],
        "tema": areas[0] if areas else "outro",
        "areas": areas,
        "antes": p["antes"],
        "em_curso": "in-progress" in labels,
        "radar": RADAR in labels,
        "prioridade": p["prioridade"],
        "assignees": [a["login"] for a in it.get("assignees", [])],
        "criada_em": _data(it.get("createdAt")),
        "fechada_em": _data(it.get("closedAt")),
        "atualizada_em": _data(it.get("updatedAt")),
        "nota": s.get("nota") or None,
        "pronto_quando": s.get("pronto_quando") or None,
        "comentarios": len(comentarios),
    }
    if feito:
        item["ficha"] = parse_ficha(comentarios)
    else:
        item["canal"] = canal
        item["canal_desde"] = _canal_desde(eventos, label_do_canal) if canal else None
        if s.get("destrava") or s.get("gesto"):
            item["mesa"] = {"destrava": s.get("destrava", ""), "gesto": s.get("gesto", "")}
        item["prompt"] = s.get("prompt") or None
    return item


def montar(fresco=False):
    agora = time.time()
    if not fresco and _CACHE["resposta"] and agora - _CACHE["em"] < CACHE_S:
        return _CACHE["resposta"]
    issues = _gh_json("issue", "list", "-R", REPO, "--state", "all", "--limit", "300", "--json",
                      "number,title,body,state,labels,assignees,milestone,createdAt,closedAt,updatedAt,url")
    issues.sort(key=lambda i: i["number"])

    def enriquecer(it):
        fechado = it.get("state", "").upper() == "CLOSED"
        return (it, [] if fechado else _eventos(it["number"]), _comentarios(it["number"]))

    with ThreadPoolExecutor(max_workers=6) as ex:
        trios = list(ex.map(enriquecer, issues))
    itens = [_issue_para_item(*t) for t in trios]
    tarefas = [i for i in itens if not i["radar"]]
    radar = [i for i in itens if i["radar"]]
    abertas = [i for i in itens if i["status"] == "fazer"]  # tarefas e radar: o que a mesa mostra
    milestones = [i.get("milestone") for i in issues if i.get("milestone")]
    estagio = None
    if milestones:
        estagio = max({m["title"] for m in milestones}, key=lambda t: sum(1 for m in milestones if m["title"] == t))
    resposta = {
        "fonte": "github",
        "repo": REPO,
        "estagio": estagio or "Sem milestone",
        "atualizado": max([i["atualizada_em"] for i in itens] or [time.strftime("%Y-%m-%d")]),
        "lido_em": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "tarefas": tarefas,
        "radar": radar,
        "pendentes": [],
        "propostas": [],
        "totais": {
            "total": len(tarefas),
            "feitas": sum(1 for t in tarefas if t["status"] == "feito"),
            "abertas": sum(1 for t in tarefas if t["status"] == "fazer"),
            "radar": len(radar),
            "bloqueadas": sum(1 for t in tarefas if t["status"] == "fazer" and any(
                d for d in t["deps"] if d not in {x["id"] for x in tarefas if x["status"] == "feito"})),
            "por_canal": {c: sum(1 for i in abertas if i.get("canal") == c) for c in CANAIS},
            "sem_canal": [i["id"] for i in abertas if not i.get("canal")],
        },
    }
    _CACHE.update({"em": agora, "resposta": resposta})
    return resposta


def detalhe(numero):
    """Corpo cru, comentarios e linha do tempo de UMA issue, para o card do Cockpit."""
    it = _gh_json("issue", "view", str(numero), "-R", REPO, "--json",
                  "number,title,body,state,labels,assignees,milestone,createdAt,closedAt,updatedAt,url,author")
    eventos = _eventos(numero)
    comentarios = _comentarios(numero)
    linha = []
    for e in eventos:
        tipo = e.get("event")
        if tipo not in ("labeled", "unlabeled", "closed", "reopened", "assigned", "unassigned", "milestoned", "renamed"):
            continue
        quem = (e.get("actor") or {}).get("login")
        if tipo in ("labeled", "unlabeled"):
            texto = ("recebeu a label " if tipo == "labeled" else "perdeu a label ") + (e.get("label") or {}).get("name", "")
        elif tipo == "closed":
            texto = "fechada"
        elif tipo == "reopened":
            texto = "reaberta"
        elif tipo in ("assigned", "unassigned"):
            texto = ("atribuída a " if tipo == "assigned" else "desatribuída de ") + ((e.get("assignee") or {}).get("login") or "")
        elif tipo == "milestoned":
            texto = "entrou no estágio " + ((e.get("milestone") or {}).get("title") or "")
        else:
            texto = "renomeada"
        linha.append({"quando": e.get("created_at"), "quem": quem, "tipo": tipo, "texto": texto})
    for c in comentarios:
        linha.append({"quando": c.get("created_at"), "quem": (c.get("user") or {}).get("login"),
                      "tipo": "comentario", "texto": c.get("body") or ""})
    linha.append({"quando": it.get("createdAt"), "quem": (it.get("author") or {}).get("login"), "tipo": "aberta", "texto": "aberta"})
    linha.sort(key=lambda x: x["quando"] or "")
    return {"ok": True, "issue": it, "linha_do_tempo": linha, "secoes": parse_corpo(it.get("body"))}


if __name__ == "__main__":
    try:
        print(json.dumps(montar(fresco=True), ensure_ascii=False, indent=1))
    except RuntimeError as e:
        print(json.dumps({"erro": str(e)}, ensure_ascii=False))
        sys.exit(1)
