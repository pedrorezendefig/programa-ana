#!/usr/bin/env python3
"""Retrato da Ana: gera retrato/dados/retrato.json (ADR-0028).

Um JSON só, carimbado com a data, que o site estático em retrato/ renderiza nas
quatro esferas: o que a Ana faz hoje, as regras, onde ela busca a resposta e
o que dá e o que não dá na Global Health.

Fontes:
  os/dados/comparacao.json           capacidades (estado, prova, o que falta)
  os/dados/sop-fluxo.json            os nós do SOP e os trechos literais do prompt
  os/dados/circuito.json             as seções do prompt e as ferramentas que cada uma chama
  os/dados/integracao.json           os elos ida / volta / fronteira (validação da curadoria)
  os/dados/grants-medida.json        concessão carimbada (usada se for mais nova que a curadoria)
  retrato/curadoria.json             a moldura em linguagem de diretor
  a plataforma fazer.ai agents       a lista viva de ferramentas (só nome e família de origem)

Regra de saída (decisão 6 do ADR-0028): antes de gravar, o JSON serializado é varrido
contra a lista de proibidos (CPF, paciente-sonda, endereço de ambiente, token,
credencial, código de tarefa). Se achar, imprime onde e não grava.

Uso:
  python3 retrato/gerar.py                  gera de verdade (exige a plataforma no ar)
  python3 retrato/gerar.py --dry-run        monta e valida, sem gravar
  python3 retrato/gerar.py --sem-plataforma marca as ferramentas como não lidas (só para testar o HTML)
  python3 retrato/gerar.py --testar-proibidos  injeta um CPF falso e confere que a varredura pega
"""

import argparse
import copy
import datetime
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
DADOS_OS = RAIZ / "os" / "dados"
CURADORIA = AQUI / "curadoria.json"
SAIDA = AQUI / "dados" / "retrato.json"

PLATAFORMA_URL_PADRAO = "https://agents.hospitalsaomatheus.cloud"
TIMEOUT_S = 20

# A família de origem é derivada do host que a plataforma declara (regra do ADR-0017
# e do ADR-0018). O host serve só para classificar: nunca vai para o JSON de saída.
FAMILIAS_POR_HOST = [
    ("hospital", "api.hospitalsaomatheus.cloud"),
    ("gh", "dem.agenda.globalhealth.mv"),
]

# ------------------------------------------------------------------ proibidos

# Exemplo de formato que o próprio prompt usa para ensinar a Ana a aceitar CPF com
# ou sem pontuação. É texto literal das regras, não é pessoa. Só ele passa.
CPF_EXEMPLO_DO_PROMPT = {"73676483647"}

PROIBIDOS = [
    ("CPF (11 dígitos, com ou sem pontuação)", re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")),
    ("CPF do paciente-sonda", re.compile(r"663\.?011\.?027-?70")),
    ("nome do paciente-sonda", re.compile(r"TESTE\s+INTEGRACAO", re.I)),
    ("id do paciente-sonda", re.compile(r"\b1681\b")),
    ("URL (http)", re.compile(r"https?:|\bhttp\b", re.I)),
    ("host da Global Health", re.compile(r"globalhealth", re.I)),
    ("host sslip.io", re.compile(r"sslip\.io", re.I)),
    ("host hospitalsaomatheus.cloud", re.compile(r"hospitalsaomatheus\.cloud", re.I)),
    ("literal token", re.compile(r"\btokens?\b", re.I)),
    ("referência de cofre (vault:)", re.compile(r"vault:", re.I)),
    ("literal Bearer", re.compile(r"\bBearer\b")),
    ("nome de variável de token", re.compile(r"AGENTS_API_TOKEN|GH_TOKEN")),
    ("código de tarefa do roadmap", re.compile(r"\b(V|OS|GH|OV|P)-?\d{1,3}\b")),
]

# Palavras que não cabem na moldura de diretor (decisão 4). Não derrubam a geração:
# o miolo literal pode contê-las. Só avisam, e só fora dos trechos literais.
VOCABULARIO_TECNICO = re.compile(
    r"homolog|endpoint|\bgrants?\b|payload|\btenant\b|\bADR\b|\btools?\b|redeploy|\bvault\b", re.I
)


def varrer_proibidos(texto):
    achados = []
    for rotulo, rx in PROIBIDOS:
        for m in rx.finditer(texto):
            trecho = m.group(0)
            if rotulo.startswith("CPF (") and re.sub(r"\D", "", trecho) in CPF_EXEMPLO_DO_PROMPT:
                continue
            ini = max(0, m.start() - 60)
            fim = min(len(texto), m.end() + 60)
            achados.append((rotulo, trecho, texto[ini:fim].replace("\n", " ")))
    return achados


def sem_literais(doc):
    """Cópia do documento com os trechos literais do prompt apagados (para o aviso de vocabulário)."""
    c = copy.deepcopy(doc)

    def limpar(obj):
        if isinstance(obj, dict):
            if "trechos" in obj and isinstance(obj["trechos"], list):
                for t in obj["trechos"]:
                    if isinstance(t, dict):
                        t["texto"] = ""
            for v in obj.values():
                limpar(v)
        elif isinstance(obj, list):
            for v in obj:
                limpar(v)

    limpar(c)
    return c


def avisar_vocabulario(doc):
    texto = json.dumps(sem_literais(doc), ensure_ascii=False)
    vistos = {}
    for m in VOCABULARIO_TECNICO.finditer(texto):
        chave = m.group(0).lower()
        if chave in vistos:
            vistos[chave] += 1
            continue
        vistos[chave] = 1
        ini = max(0, m.start() - 70)
        fim = min(len(texto), m.end() + 70)
        print("AVISO (moldura): '%s' em: ...%s..." % (m.group(0), texto[ini:fim].replace("\n", " ")))
    if vistos:
        print("AVISO: %d palavra(s) técnica(s) na moldura: %s" % (
            len(vistos), ", ".join("%s x%d" % kv for kv in sorted(vistos.items()))))


# ------------------------------------------------------------------ leitura

def ler_json(caminho):
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)


def ler_env():
    env = {}
    caminho = RAIZ / ".env"
    if not caminho.is_file():
        return env
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if linha and not linha.startswith("#") and "=" in linha:
            k, v = linha.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def familia_do_host(url):
    for familia, host in FAMILIAS_POR_HOST:
        if host in (url or ""):
            return familia
    return "desconhecida"


def ler_plataforma(env):
    """Lê /api/v1/tools na plataforma. Devolve só o que o retrato precisa: nome, id e família."""
    token = env.get("AGENTS_API_TOKEN", "")
    if not token:
        raise RuntimeError("AGENTS_API_TOKEN ausente no .env da raiz")
    base = env.get("PLATAFORMA_URL", PLATAFORMA_URL_PADRAO).rstrip("/")
    req = urllib.request.Request(
        base + "/api/v1/tools",
        headers={"Authorization": "Bearer " + token, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
            doc = json.loads(resp.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as e:
        raise RuntimeError("a plataforma respondeu HTTP %s" % e.code)
    except (urllib.error.URLError, OSError, ValueError) as e:
        raise RuntimeError("não alcançou a plataforma: %s" % getattr(e, "reason", e))
    brutas = doc.get("tools", doc if isinstance(doc, list) else [])
    vivas = []
    for t in brutas:
        vivas.append({
            "id": str(t.get("id")),
            "nome": t.get("name"),
            "familia": familia_do_host(t.get("urlTemplate")),
        })
    if not vivas:
        raise RuntimeError("a plataforma respondeu, mas sem nenhuma ferramenta")
    return vivas


# ------------------------------------------------------------------ montagem

def data_br(iso):
    p = str(iso or "").split("-")
    return "%s/%s/%s" % (p[2], p[1], p[0]) if len(p) == 3 else str(iso or "")


def concessao(cur, grants_medida, vivas):
    """O conjunto de ferramentas que a Ana pode chamar. Usa o carimbo mais novo entre
    a curadoria (lida na sessão) e os/dados/grants-medida.json."""
    c = cur.get("concessao") or {}
    data_cur = c.get("conferido_em", "")
    data_med = grants_medida.get("conferido_em", "")
    if data_cur >= data_med and vivas is not None:
        por_id = {t["id"]: t["nome"] for t in vivas}
        nomes = set(c.get("nativas", [])) | set(c.get("rag", []))
        for i in c.get("http_ids", []):
            if i in por_id:
                nomes.add(por_id[i])
        return nomes, data_cur, c.get("como", "")
    nomes = {n for n, ok in (grants_medida.get("ferramentas") or {}).items() if ok}
    return nomes, data_med, "Carimbo anterior, lido por script."


def parse_lista_tools(texto):
    """'a, b (não existe ainda)' -> [{nome, existe}] ; texto livre vira {texto}."""
    saida = []
    for parte in re.split(r",\s*", texto or ""):
        parte = parte.strip()
        if not parte:
            continue
        m = re.match(r"^([a-z_]+)(?:\s*\((.*)\))?$", parte)
        if m and "_" in m.group(1):
            saida.append({"nome": m.group(1), "existe": not bool(m.group(2))})
        else:
            saida.append({"texto": parte})
    return saida


def montar_faz(comp, cur):
    estados = cur["estados"]
    blocos = []
    placar = {"funciona": 0, "parte": 0, "ainda-nao": 0}
    for b in comp["blocos"]:
        caps = []
        for c in b["capacidades"]:
            o = (cur.get("capacidades") or {}).get(c["id"], {})
            estado = o.get("estado", c["estado"])
            e = estados[estado]
            placar[e["classe"]] += 1
            caps.append({
                "id": c["id"],
                "titulo": o.get("titulo", c["titulo"]),
                "secao": o.get("secao", c["secao"]),
                "estado": e["classe"],
                "estado_rotulo": e["rotulo"],
                "ferramentas": parse_lista_tools(o.get("tools", c.get("tools", ""))),
                "faz": o.get("faz", c.get("faz", "")),
                "prova": o.get("prova", c.get("prova", "")),
                "falta": o.get("falta", c.get("falta", "")),
            })
        blocos.append({
            "nome": b["nome"],
            "resumo": (cur.get("blocos") or {}).get(b["nome"], b["resumo"]),
            "capacidades": caps,
        })
    legenda = []
    vistos = set()
    for e in estados.values():
        if e["classe"] in vistos:
            continue
        vistos.add(e["classe"])
        legenda.append({"classe": e["classe"], "rotulo": e["rotulo"], "descricao": e["descricao"]})
    return {"placar": placar, "total": sum(placar.values()), "legenda": legenda, "blocos": blocos}


def montar_regras(sop, circ, cur):
    zonas_cur = cur.get("zonas") or {}
    # Os ids dos nós do SOP (E1, P3, S2...) colidem com o formato dos códigos de tarefa
    # do roadmap (P3 é um nó do particular e também seria um código). O retrato
    # renomeia os nós com o prefixo "n" (nP3) e a varredura fica estrita.
    def nid(i):
        return "n" + i

    resumos = cur.get("nos_resumo") or {}
    tipos_cur = cur.get("tipos") or {}

    # "tool" é o tipo de nó do Ana OS; no retrato a palavra é "ferramenta" (decisão 4)
    def tipo(t):
        return "ferramenta" if t == "tool" else t

    nos = []
    for n in sop["nos"]:
        nos.append({
            "id": nid(n["id"]), "raia": n["raia"], "col": n["col"], "linha": n["linha"],
            "tipo": tipo(n["tipo"]), "secao": n["secao"], "titulo": n["titulo"],
            "resumo": resumos.get(n["id"], n["resumo"]),
            "ferramentas": list(n.get("tools") or []),
            "trechos": [{"linhas": t.get("linhas", ""), "texto": t["texto"]} for t in n["ancora"]["trechos"]],
        })
    secoes = []
    for s in circ["secoes"]:
        secoes.append({
            "id": s["id"], "chave": s["chave"], "rotulo": s["rotulo"], "papel": s["papel"],
            "ferramentas": list(s.get("tools") or []),
            "trechos": [{"linhas": t.get("linhas", ""), "texto": t["texto"]} for t in s["trechos"]],
        })
    m = sop["meta"]
    return {
        "versao": m["versao_prompt"],
        "desde": m["prompt_exportado_em"],
        "caracteres": m.get("prompt_caracteres"),
        "tipos": [{"id": tipo(t["id"]), "rotulo": tipos_cur.get(t["id"], t["rotulo"])} for t in sop["tipos"]],
        "raias": [{"id": r["id"], "rotulo": r["rotulo"], "nota": r.get("nota", "")} for r in sop["raias"]],
        "zonas": [{"id": z["id"], "rotulo": z["rotulo"], "raias": z["raias"], "nota": zonas_cur.get(z["id"], "")}
                  for z in sop.get("zonas", [])],
        "nos": nos,
        "arestas": [{"de": nid(a["de"]), "para": nid(a["para"]), "rotulo": a.get("rotulo", "")} for a in sop["arestas"]],
        "secoes": secoes,
    }


def montar_ferramentas(vivas, concedidas, circ, sop, cur, plataforma_lida):
    """O índice de ferramentas: nome, descrição curta, família, concessão, seções que chamam.
    Nunca grava URL, host, método, credencial nem token."""
    desc = cur["ferramentas"]
    futuras = cur.get("ferramentas_futuras") or {}
    chamadas = {}  # nome -> set de chaves de seção

    def marca(nome, chave):
        chamadas.setdefault(nome, set()).add(chave)

    for t in circ["tools"]:
        for chave in t.get("secoes") or []:
            marca(t["id"], chave)
    for n in sop["nos"]:
        for nome in n.get("tools") or []:
            marca(nome, n["secao"])
    for nome, d in desc.items():
        for chave in d.get("secoes_extra") or []:
            marca(nome, chave)
    rotulo_secao = {s["chave"]: s["rotulo"] for s in circ["secoes"]}

    def secoes_de(nome):
        chaves = sorted(chamadas.get(nome, set()), key=lambda k: (rotulo_secao.get(k) is None, k))
        return [{"chave": k, "rotulo": rotulo_secao.get(k, k)} for k in chaves]

    itens = {}
    conc = cur.get("concessao") or {}
    if plataforma_lida:
        for t in vivas:
            itens[t["nome"]] = {"nome": t["nome"], "familia": t["familia"], "lida": True}
        for nome in list(conc.get("nativas", [])) + list(conc.get("rag", [])):
            itens[nome] = {"nome": nome, "familia": "nativa", "lida": True}
    else:
        # sem a plataforma o retrato não sabe a família de nada: marca tudo como não lido
        for nome in desc:
            itens[nome] = {"nome": nome, "familia": "sem-leitura", "lida": False}

    for nome, it in itens.items():
        d = desc.get(nome, {})
        it["descricao"] = d.get("descricao", "")
        it["ordem"] = d.get("ordem", 999)
        it["concedida"] = (nome in concedidas) if plataforma_lida else None
        it["existe"] = True
        it["secoes"] = secoes_de(nome)
    for nome, motivo in futuras.items():
        itens[nome] = {
            "nome": nome, "familia": "gh", "lida": plataforma_lida, "descricao": motivo,
            "ordem": 999, "concedida": False, "existe": False, "secoes": [],
        }
    return itens


def montar_busca(ferramentas, integ, cur, conferido_em, como):
    fam = cur["familias"]
    grupos = []
    for fid in ("hospital", "gh", "nativa"):
        lista = sorted(
            [f for f in ferramentas.values() if f["familia"] == fid and f["existe"]],
            key=lambda f: (f["ordem"], f["nome"]),
        )
        grupos.append({"id": fid, "rotulo": fam[fid]["rotulo"], "cor": fam[fid]["cor"],
                       "resumo": fam[fid]["resumo"], "ferramentas": lista})
    sem_leitura = sorted([f for f in ferramentas.values() if f["familia"] == "sem-leitura"],
                         key=lambda f: (f["ordem"], f["nome"]))
    desconhecidas = sorted([f for f in ferramentas.values() if f["familia"] == "desconhecida"],
                           key=lambda f: f["nome"])

    por_no = {n["id"]: n for n in integ["nos"]}
    faixas = []
    for fx in cur["integracao"]["faixas"]:
        passos = []
        for p in fx["passos"]:
            n = por_no.get(p["no"])
            if not n:
                raise RuntimeError("curadoria da integração cita o elo %s, que não existe em integracao.json" % p["no"])
            passos.append({
                "titulo": p["titulo"], "texto": p["texto"],
                "raia": n["raia"], "ferramenta": n.get("tool"),
            })
        faixas.append({"id": fx["id"], "rotulo": fx["rotulo"], "resumo": fx["resumo"], "passos": passos})
    return {
        "conferido_em": conferido_em, "como_conferido": como,
        "grupos": grupos, "sem_leitura": sem_leitura, "desconhecidas": desconhecidas,
        "faixas": faixas,
    }


def montar_gh(ferramentas, cur):
    g = cur["global_health"]
    vereditos = g["vereditos"]
    cadeias = []
    for c in g["cadeias"]:
        elos = []
        for e in c["elos"]:
            conv = dict(e.get("conversa") or {})
            fs = []
            for nome in conv.get("ferramentas") or []:
                f = ferramentas.get(nome)
                if not f:
                    raise RuntimeError("cadeia %s, elo %s cita a ferramenta %s, desconhecida" % (c["letra"], e["id"], nome))
                fs.append({"nome": nome, "familia": f["familia"], "tem": bool(f["concedida"]) and f["existe"],
                           "motivo": "" if (f["concedida"] and f["existe"]) else f["descricao"]})
            conv["ferramentas"] = fs
            v = vereditos[e["veredito"]]
            elos.append({
                "id": e["id"], "titulo": e["titulo"], "texto": e["texto"],
                "veredito": v["classe"], "veredito_rotulo": v["rotulo"],
                "ana_hoje": e["ana_hoje"], "ana_hoje_rotulo": g["ana_hoje"][e["ana_hoje"]],
                "conversa": conv,
            })
        cadeias.append({"letra": c["letra"], "titulo": c["titulo"], "resumo": c["resumo"], "elos": elos})
    return {"cadeias": cadeias, "da": g["da"], "nao_da": g["nao_da"], "legenda": [
        {"classe": v["classe"], "rotulo": v["rotulo"]} for v in vereditos.values()]}


def montar(args):
    cur = ler_json(CURADORIA)
    comp = ler_json(DADOS_OS / "comparacao.json")
    sop = ler_json(DADOS_OS / "sop-fluxo.json")
    circ = ler_json(DADOS_OS / "circuito.json")
    integ = ler_json(DADOS_OS / "integracao.json")
    grants = ler_json(DADOS_OS / "grants-medida.json")

    vivas = None
    if args.sem_plataforma:
        print("AVISO: --sem-plataforma: as ferramentas saem marcadas como não lidas. Não publique este retrato.")
    else:
        vivas = ler_plataforma(ler_env())
        print("plataforma lida: %d ferramentas" % len(vivas))

    concedidas, conferido_em, como = concessao(cur, grants, vivas)
    ferramentas = montar_ferramentas(vivas or [], concedidas, circ, sop, cur, vivas is not None)

    regras = montar_regras(sop, circ, cur)
    doc = {
        "gerado_em": datetime.date.today().isoformat(),
        "prompt_versao": regras["versao"],
        "prompt_desde": regras["desde"],
        "plataforma_lida": vivas is not None,
        "ferramentas": {nome: {"familia": f["familia"], "concedida": f["concedida"], "existe": f["existe"]}
                        for nome, f in ferramentas.items()},
        "esferas": {
            "faz": montar_faz(comp, cur),
            "regras": regras,
            "busca": montar_busca(ferramentas, integ, cur, conferido_em, como),
            "global_health": montar_gh(ferramentas, cur),
        },
    }
    return doc


def resumo(doc):
    e = doc["esferas"]
    por_fam = {}
    for g in e["busca"]["grupos"]:
        por_fam[g["id"]] = len(g["ferramentas"])
    print("retrato de %s, regras %s desde %s" % (data_br(doc["gerado_em"]), doc["prompt_versao"], data_br(doc["prompt_desde"])))
    print("  capacidades: %d (%s)" % (e["faz"]["total"], ", ".join("%s %d" % kv for kv in e["faz"]["placar"].items())))
    print("  nós do SOP: %d em %d raias, %d arestas; seções do prompt: %d" % (
        len(e["regras"]["nos"]), len(e["regras"]["raias"]), len(e["regras"]["arestas"]), len(e["regras"]["secoes"])))
    print("  ferramentas por origem: %s; não lidas: %d; destino desconhecido: %d" % (
        ", ".join("%s %d" % kv for kv in por_fam.items()), len(e["busca"]["sem_leitura"]), len(e["busca"]["desconhecidas"])))
    print("  cadeias: %d, elos: %d" % (len(e["global_health"]["cadeias"]),
                                        sum(len(c["elos"]) for c in e["global_health"]["cadeias"])))


def main():
    ap = argparse.ArgumentParser(description="Gera o retrato datado da Ana.")
    ap.add_argument("--dry-run", action="store_true", help="monta e valida, sem gravar")
    ap.add_argument("--sem-plataforma", action="store_true", help="não lê a plataforma (ferramentas saem como não lidas)")
    ap.add_argument("--testar-proibidos", action="store_true", help="injeta um CPF falso e confere que a varredura recusa")
    args = ap.parse_args()

    try:
        doc = montar(args)
    except RuntimeError as e:
        print("ERRO: %s. Nada foi gravado." % e, file=sys.stderr)
        return 2

    if args.testar_proibidos:
        doc["esferas"]["faz"]["blocos"][0]["resumo"] += " CPF de teste 123.456.789-09."
        achados = varrer_proibidos(json.dumps(doc, ensure_ascii=False))
        if any(r.startswith("CPF (") for r, _, _ in achados):
            print("OK: a varredura pegou o CPF injetado (%d achado(s)). Nada foi gravado." % len(achados))
            return 0
        print("FALHA: a varredura NÃO pegou o CPF injetado.", file=sys.stderr)
        return 1

    serializado = json.dumps(doc, ensure_ascii=False, indent=1)
    achados = varrer_proibidos(serializado)
    if achados:
        print("ERRO: %d item(ns) da lista de proibidos no retrato. Nada foi gravado." % len(achados), file=sys.stderr)
        for rotulo, trecho, contexto in achados[:40]:
            print("  [%s] '%s' em: ...%s..." % (rotulo, trecho, contexto), file=sys.stderr)
        return 3

    avisar_vocabulario(doc)
    resumo(doc)
    if args.dry_run:
        print("dry-run: nada gravado.")
        return 0
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(serializado + "\n", encoding="utf-8")
    print("gravado: %s (%d KB)" % (SAIDA.relative_to(RAIZ), len(serializado.encode("utf-8")) // 1024))
    return 0


if __name__ == "__main__":
    sys.exit(main())
