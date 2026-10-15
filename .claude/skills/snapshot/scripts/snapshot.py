#!/usr/bin/env python3
"""snapshot.py: gera os sete arquivos de `docs/spec/snapshots/` do Programa Ana.

A Ana não é um app com backend e banco próprios: ela roda na plataforma
fazer.ai agents, atende pelo Chatwoot, lê a API de agenda da Global Health e
consulta o Oracle do MV do hospital (base TST, só leitura). O que dá para ler
do repositório, e de onde cada arquivo sai:
  - ESTRUTURA.md: as pastas que o git conhece (rastreadas e novas não
    ignoradas), sem `dados-locais/`, `amostras/` e `__pycache__/`;
  - INTEGRACOES.md: o NOME das chaves de ambiente que o código lê
    (`ENV.get`, `env.get`, `env[...]`, `os.environ`, `os.getenv`,
    `ler_env`), agrupadas por serviço externo; nunca o valor;
  - ROTAS.md: as rotas HTTP do `os/server.py` (o servidor local do Ana OS),
    lidas por AST dos `do_GET`/`do_POST`;
  - ENTIDADES.md e SCHEMA.md: as tabelas do MV já estudadas, lidas de
    `ana/api-mv/dicionario-colunas.md` (seções `###` e o flowchart do fluxo
    do agendamento, que dá as ligações);
  - MIGRATIONS.md: uma linha, o programa não tem migrations próprias;
  - FLUXOGRAMAS.md: o diagrama de contexto, curado aqui no script, no subset
    `flowchart TD` que o `tools/workflow-dashboard/diagramas.py` aceita.

Uso:
    python3 .claude/skills/snapshot/scripts/snapshot.py [--check] [--root <repo>]

`--check` não escreve: sai com 1 e lista os arquivos que mudariam, 0 se está
em dia. Sem data nos arquivos, para o `--check` não acusar só o relógio.
"""

from __future__ import annotations

import argparse
import ast
import re
import subprocess
import sys
from pathlib import Path

SAIDA = "docs/spec/snapshots"
NOMES = ("ESTRUTURA.md", "ROTAS.md", "ENTIDADES.md", "SCHEMA.md", "MIGRATIONS.md", "INTEGRACOES.md", "FLUXOGRAMAS.md")
SERVIDOR = "os/server.py"
DICIONARIO = "ana/api-mv/dicionario-colunas.md"
FORA_DA_ARVORE = {"dados-locais", "amostras", "__pycache__", "node_modules", ".venv", ".venv-mv"}
CODIGO_FORA = ("tools/", ".claude/")  # ferramenta do fluxo, não código do programa
EXTENSOES_CODIGO = (".py", ".js", ".mjs", ".ts")


def _doc(titulo: str, linhas: list[str]) -> str:
    return "\n".join([f"# {titulo}", "<!-- gerado por /snapshot; não editar à mão -->", "", *linhas]) + "\n"


def _arquivos_do_git(raiz: Path) -> list[str]:
    """Rastreados + novos não ignorados (o que o git conhece), sem dado local."""
    saida = subprocess.run(
        ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        cwd=raiz, capture_output=True, text=True, check=True,
    ).stdout
    caminhos = {c for c in saida.split("\0") if c and (raiz / c).exists()}  # apagado e não commitado sai
    caminhos |= {f"{SAIDA}/{n}" for n in NOMES}  # a saída conta desde a primeira rodada
    return sorted(c for c in caminhos if not FORA_DA_ARVORE & set(c.split("/")[:-1]))


# ---------- ESTRUTURA ----------


def estrutura(raiz: Path, arquivos: list[str]) -> str:
    pastas: dict[str, set[str]] = {}
    soltos: set[str] = set()
    for caminho in arquivos:
        partes = caminho.split("/")
        if len(partes) == 1:
            soltos.add(partes[0])
            continue
        filhos = pastas.setdefault(partes[0], set())
        if len(partes) > 2:
            filhos.add("/".join(partes[1:3]) if len(partes) > 3 else partes[1])
    linhas = [
        "Pastas que o git conhece, dois níveis abaixo de cada pasta da raiz. Ficam fora",
        "`dados-locais/`, `amostras/` e `__pycache__/` (dado pessoal ou lixo de build).",
        "",
        "## Raiz",
        "",
        "Localização: `./`",
        "",
        "```",
        *(f"{p}/" for p in sorted(pastas)),
        *sorted(soltos),
        "```",
    ]
    for topo in sorted(pastas):
        filhos = pastas[topo]
        nivel1 = sorted({f.split("/")[0] for f in filhos})
        if not nivel1:
            continue
        linhas += ["", f"## {topo}/", "", f"Localização: `{topo}/`", "", "```"]
        for pasta in nivel1:
            linhas.append(f"{pasta}/")
            netos = sorted(f.split("/")[1] for f in filhos if f.startswith(pasta + "/"))
            for i, neto in enumerate(netos):
                linhas.append(f"{'└──' if i == len(netos) - 1 else '├──'} {neto}/")
        linhas.append("```")
    return _doc("ESTRUTURA.md", linhas)


# ---------- INTEGRACOES ----------

# serviço externo -> (pra que serve, prefixos das chaves)
SERVICOS = [
    ("Global Health", "API de agendamento WhatsApp da MV. O Ana OS chama ao vivo só a homologação; produção é proibida neste app.", ("GH_",)),
    ("Oracle MV (base TST)", "Banco do hospital, base de teste. Só leitura (SELECT/WITH), pelo Ana OS e pelo query-mv.py.", ("ORACLE_",)),
    ("fazer.ai agents", "A plataforma onde a Ana roda: lista de ferramentas para o Ana OS e para o Retrato.", ("AGENTS_API_", "PLATAFORMA_")),
    ("Chatwoot", "Inbox do atendimento: a bancada e2e conversa por ele e o Ana OS confere a versão.", ("CHATWOOT_",)),
]
_ACESSO_ENV = re.compile(r"(?:\bENV|\benv|os\.environ)\s*(?:\.get\(|\[)|os\.getenv\(|ler_env\(|process\.env")
_CHAVE = re.compile(r"[\"']([A-Z][A-Z0-9_]{2,})[\"']|process\.env\.([A-Z][A-Z0-9_]{2,})")


def integracoes(raiz: Path, arquivos: list[str]) -> str:
    uso: dict[str, set[str]] = {}
    for caminho in arquivos:
        if not caminho.endswith(EXTENSOES_CODIGO) or caminho.startswith(CODIGO_FORA):
            continue
        try:
            texto = (raiz / caminho).read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for linha in texto.splitlines():
            if not _ACESSO_ENV.search(linha):
                continue
            for m in _CHAVE.finditer(linha):
                uso.setdefault(m.group(1) or m.group(2), set()).add(caminho)
    linhas = [
        "Serviços externos do Programa Ana e o NOME das chaves de ambiente que o código lê",
        "(do `.env` da raiz, fora do git). Nunca o valor. O repositório não tem `.env.example`:",
        "as chaves saem da varredura do código (fora `tools/` e `.claude/`, que são do fluxo de trabalho).",
    ]
    restantes = dict(uso)
    blocos = 0
    for nome, papel, prefixos in SERVICOS + [("Outras chaves", "Chaves lidas pelo código sem serviço mapeado no snapshot.py.", ("",))]:
        chaves = sorted(k for k in restantes if k.startswith(prefixos))
        if not chaves:
            continue
        for k in chaves:
            restantes.pop(k)
        segredo = next((k for k in chaves if re.search(r"TOKEN|PASSWORD|KEY|SECRET", k)), chaves[0])
        onde = sorted({c for k in chaves for c in uso[k]})
        linhas += [
            "",
            f"## {nome}",
            f"**Pra que serve:** {papel}",
            f"**Onde aparece no código:** {', '.join(f'`{c}`' for c in onde)}",
            f"**Secret/env primária:** `{segredo}`",
        ]
        outras = [k for k in chaves if k != segredo]
        if outras:
            linhas.append(f"**Variáveis relacionadas:** {', '.join(f'`{k}`' for k in outras)}")
        blocos += 1
    linhas += ["", "---", f"**Resumo:** {blocos} serviços com chave no código. Langfuse e a API do Hospital são",
               "configurados na plataforma, sem chave lida por este repositório."]
    return _doc("INTEGRACOES.md", linhas)


# ---------- ROTAS ----------

_SEM_DESCRICAO = {"_json", "_host_local", "_arquivo"}


def _primeira_frase(doc: str | None) -> str:
    if not doc:
        return ""
    paragrafo = " ".join(doc.strip().split("\n\n")[0].split())
    m = re.match(r"(.+?\.)(?:\s|$)", paragrafo)
    frase = (m.group(1) if m else paragrafo).replace("|", "/")
    if len(frase) > 140:
        frase = frase[:140].rsplit(" ", 1)[0].rstrip(",;:") + "..."
    return frase


def _descricao(corpo: list[ast.stmt], funcs: dict, metodos: dict, pasta: Path) -> str:
    for stmt in corpo:
        for no in ast.walk(stmt):
            if not isinstance(no, ast.Call):
                continue
            f = no.func
            if isinstance(f, ast.Name) and f.id in funcs:
                return _primeira_frase(ast.get_docstring(funcs[f.id])) or f"`{f.id}()` (sem docstring)"
            if isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name):
                if f.value.id == "self" and f.attr in metodos and f.attr not in _SEM_DESCRICAO:
                    return _primeira_frase(ast.get_docstring(metodos[f.attr])) or f"`{f.attr}()`"
                modulo = pasta / f"{f.value.id}.py"
                if modulo.is_file():
                    alvo = next((n for n in ast.parse(modulo.read_text(encoding="utf-8")).body
                                 if isinstance(n, ast.FunctionDef) and n.name == f.attr), None)
                    if alvo is not None:
                        return _primeira_frase(ast.get_docstring(alvo)) or f"`{f.value.id}.{f.attr}()`"
    for stmt in corpo:
        for no in ast.walk(stmt):
            if isinstance(no, ast.Name) and re.fullmatch(r"[A-Z][A-Z0-9_]+", no.id):
                return f"Lê `{no.id}`."
    for stmt in corpo:
        for no in ast.walk(stmt):
            if isinstance(no, ast.Call) and isinstance(no.func, ast.Attribute) and no.func.attr not in _SEM_DESCRICAO:
                return f"Chama `{ast.unparse(no.func)}()`."
    return ""


def _e_path(no: ast.AST) -> bool:
    return (isinstance(no, ast.Name) and no.id == "path") or (isinstance(no, ast.Attribute) and no.attr == "path")


def _rotas_do_teste(teste: ast.AST) -> list[str]:
    if isinstance(teste, ast.Compare) and _e_path(teste.left) and len(teste.ops) == 1:
        alvo = teste.comparators[0]
        if isinstance(teste.ops[0], ast.Eq) and isinstance(alvo, ast.Constant):
            return [alvo.value]
        if isinstance(teste.ops[0], ast.NotIn) and isinstance(alvo, (ast.Tuple, ast.List)):
            return [e.value for e in alvo.elts if isinstance(e, ast.Constant)]
    if isinstance(teste, ast.Call) and isinstance(teste.func, ast.Attribute):
        if teste.func.attr == "startswith" and _e_path(teste.func.value) and isinstance(teste.args[0], ast.Constant):
            return [teste.args[0].value + "*"]
        if teste.func.attr == "match" and len(teste.args) == 2 and _e_path(teste.args[1]) and isinstance(teste.args[0], ast.Constant):
            return [re.sub(r"\\d\+", "{n}", teste.args[0].value.strip("^$"))]
    return []


def rotas(raiz: Path) -> str:
    fonte = raiz / SERVIDOR
    if not fonte.is_file():
        return _doc("ROTAS.md", [f"`{SERVIDOR}` não existe."])
    arvore = ast.parse(fonte.read_text(encoding="utf-8"))
    funcs = {n.name: n for n in arvore.body if isinstance(n, ast.FunctionDef)}
    classe = next(n for n in arvore.body if isinstance(n, ast.ClassDef)
                  and any(isinstance(m, ast.FunctionDef) and m.name == "do_GET" for m in n.body))
    metodos = {m.name: m for m in classe.body if isinstance(m, ast.FunctionDef)}
    linhas_rota: list[tuple[str, str, str]] = []
    for metodo_http in ("GET", "POST"):
        handler = metodos.get(f"do_{metodo_http}")
        if handler is None:
            continue
        declaradas: list[str] = []
        casadas: dict[str, str] = {}
        corpo_resto: list[ast.stmt] = []
        for stmt in handler.body:
            if not isinstance(stmt, ast.If) or not _rotas_do_teste(stmt.test):
                corpo_resto.append(stmt)
                continue
            no: ast.stmt | None = stmt
            while isinstance(no, ast.If) and _rotas_do_teste(no.test):
                rs = _rotas_do_teste(no.test)
                if isinstance(no.test, ast.Compare) and isinstance(no.test.ops[0], ast.NotIn):
                    declaradas += rs  # lista de rotas aceitas; a descrição vem do resto do corpo
                    corpo_resto += no.orelse
                    break
                for r in rs:  # a primeira que casa vence, como no servidor
                    if r not in casadas:
                        casadas[r] = _descricao(no.body, funcs, metodos, fonte.parent)
                if len(no.orelse) == 1 and isinstance(no.orelse[0], ast.If):
                    no = no.orelse[0]
                    continue
                if no.orelse:
                    casadas["/*"] = _descricao(no.orelse, funcs, metodos, fonte.parent)
                break
        for r in declaradas:
            if r not in casadas:
                casadas[r] = _descricao(corpo_resto, funcs, metodos, fonte.parent)
        linhas_rota += [(metodo_http, r, d) for r, d in casadas.items()]
    linhas = [
        "Rotas HTTP do Ana OS, o servidor local do cockpit (`python3 os/server.py`, porta 8777).",
        "Método de extração: AST do `os/server.py`, lendo as comparações de `path` nos",
        "`do_GET`/`do_POST`; a descrição é a primeira frase da docstring da função que a rota chama.",
        "Nenhuma rota exige login: o servidor só escuta em 127.0.0.1 e recusa Host que não seja local.",
        "",
        f"## os (`{SERVIDOR}`)",
        "",
        "| Método | Rota | O que faz | Auth |",
        "|--------|------|-----------|------|",
        *(f"| {m} | `{r}` | {d or '-'} | não (só localhost) |" for m, r, d in linhas_rota),
    ]
    return _doc("ROTAS.md", linhas)


# ---------- ENTIDADES e SCHEMA (Oracle do MV, base TST) ----------

_COL = r"[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+"
_COL_CRASE = re.compile(rf"`({_COL})`")
_TIPO_APOS = re.compile(rf"`({_COL})`\s*\((?:\*\*)?(NUMBER|VARCHAR2|DATE|CHAR)\b(?:\*\*)?(?:,\s*(\d+))?")
_NO_FLOW = re.compile(r'^\s*(\w+)\["([A-Z][A-Z0-9_]+)\s*\(')
_ARESTA = re.compile(r'^\s*(\w+)\s+(--|-\.)\s+"([^"]*)"\s+(-->|\.->)\s+(\w+)')
CABECALHO_MV = (
    "Banco externo do hospital: o Oracle do MV (owner `DBAMV`), na base TST (teste), só leitura.",
    "O programa não cria nem altera tabela nenhuma; o que está aqui são as tabelas já estudadas,",
    f"lidas de `{DICIONARIO}`. Só as colunas que o dicionário cita, não a tabela inteira.",
)


def _tabelas_mv(raiz: Path) -> tuple[list[dict], list[dict]]:
    """(tabelas com colunas, relações) a partir do dicionário de colunas."""
    texto = (raiz / DICIONARIO).read_text(encoding="utf-8")
    tabelas: list[dict] = []
    for bloco in re.split(r"(?m)^### ", texto)[1:]:
        titulo, _, corpo = bloco.partition("\n")
        corpo = re.split(r"(?m)^## ", corpo)[0]
        m = re.search(r"`DBAMV\.([A-Z_]+)`", titulo)
        if not m:
            continue
        resumo = re.search(r"`DBAMV\.[A-Z_]+`\s*\(([^)]*)\)", titulo)
        colunas: dict[str, dict] = {}

        def poe(nome: str, tipo: str = "", pk: bool = False, papel: str = "") -> None:
            c = colunas.setdefault(nome, {"nome": nome, "tipo": "", "pk": False, "papel": "", "fk": ""})
            c["tipo"] = c["tipo"] or tipo
            c["pk"] = c["pk"] or pk
            c["papel"] = c["papel"] or papel

        linhas = corpo.splitlines()
        for linha in linhas:
            if not linha.startswith("|"):
                continue
            cel = [x.strip() for x in linha.strip().strip("|").split("|")]
            nomes = [n for n in _COL_CRASE.findall(cel[0]) if "." not in n]
            if not nomes:
                continue
            tipo = cel[1] if len(cel) == 3 and re.fullmatch(r"[A-Z0-9/]+", cel[1]) else ""
            papel = cel[-1].replace("`", "")
            for n in nomes:
                poe(n, tipo, papel.startswith("PK"), "" if papel == "PK" else papel)
        paragrafo = next((l for l in linhas if l.strip() and not l.startswith("|")), "")
        if "·" in paragrafo or paragrafo.startswith("`"):
            tipos = {t.group(1): t.group(2) + (f"({t.group(3)})" if t.group(3) else "") for t in _TIPO_APOS.finditer(paragrafo)}
            for pedaco in paragrafo.split(" · "):
                for i, n in enumerate(_COL_CRASE.findall(pedaco)):
                    if f"DBAMV.{n}" in pedaco or f"DBAPS.{n}" in pedaco:
                        continue
                    poe(n, tipos.get(n, ""), i == 0 and re.search(rf"`{n}`\s+PK\b", pedaco) is not None)
        tabelas.append({"nome": m.group(1), "resumo": resumo.group(1) if resumo else "", "colunas": list(colunas.values())})

    # ligações: o flowchart do fluxo do agendamento, rótulo começando por CD_
    ids: dict[str, str] = {}
    arestas = []
    for linha in texto.splitlines():
        if (n := _NO_FLOW.match(linha)):
            ids[n.group(1)] = n.group(2)
        elif (a := _ARESTA.match(linha)) and re.match(r"CD_\w+", a.group(3)):
            arestas.append((a.group(1), a.group(5), re.match(r"CD_\w+", a.group(3)).group(0), a.group(2) == "-."))
    pk_de = {c["nome"]: t["nome"] for t in tabelas for c in t["colunas"] if c["pk"]}
    por_nome = {t["nome"]: t for t in tabelas}
    relacoes = []
    for de, para, col, tracejada in arestas:
        a, b = ids.get(de), ids.get(para)
        if not a or not b:
            continue
        pai, filho = (b, a) if pk_de.get(col) == b else (a, b)
        relacoes.append({"pai": pai, "filho": filho, "col": col, "formal": not tracejada})
        if filho in por_nome:
            for c in por_nome[filho]["colunas"]:
                if c["nome"] == col and not c["pk"]:
                    c["fk"] = f"{pai}.{col}"
    return tabelas, relacoes


def entidades(raiz: Path) -> str:
    if not (raiz / DICIONARIO).is_file():
        return _doc("ENTIDADES.md", [f"`{DICIONARIO}` não existe: nenhuma tabela estudada ainda."])
    tabelas, _ = _tabelas_mv(raiz)
    linhas = list(CABECALHO_MV)
    for t in tabelas:
        linhas += ["", f"## {t['nome']}", "", f"> Origem: `{DICIONARIO}`", ""]
        if t["resumo"]:
            linhas += [f"No dicionário: {t['resumo']}.", ""]
        linhas += ["| Campo | Tipo | Constraints | Default | FK | Papel |", "|-------|------|-------------|---------|-----|-------|"]
        for c in t["colunas"]:
            tipo = "`%s`" % c["tipo"] if c["tipo"] else "-"
            fk = "`%s`" % c["fk"] if c["fk"] else "-"
            pk = "PK" if c["pk"] else "-"
            papel = c["papel"].replace("|", "/") or "-"
            linhas.append(f"| `{c['nome']}` | {tipo} | {pk} | - | {fk} | {papel} |")
    return _doc("ENTIDADES.md", linhas)


def schema(raiz: Path) -> str:
    if not (raiz / DICIONARIO).is_file():
        return _doc("SCHEMA.md", [f"`{DICIONARIO}` não existe: nenhuma tabela estudada ainda."])
    tabelas, relacoes = _tabelas_mv(raiz)
    corpo = ["erDiagram"]
    for r in sorted(relacoes, key=lambda r: (r["pai"], r["filho"], r["col"])):
        corpo.append(f'    {r["pai"]} {"||--o{" if r["formal"] else "||..o{"} {r["filho"]} : "{r["col"]}"')
    for t in tabelas:
        chaves = [c for c in t["colunas"] if c["pk"] or c["fk"]]
        resto = [c for c in t["colunas"] if c not in chaves]
        mostradas = chaves + resto[: max(0, 6 - len(chaves))]
        corpo += ["", f"    {t['nome']} {{"]
        for c in mostradas:
            tipo = re.sub(r"\(.*", "", c["tipo"])
            tipo = tipo if re.fullmatch(r"\w+", tipo) else "ND"
            chave = " PK" if c["pk"] else " FK" if c["fk"] else ""
            corpo.append(f"        {tipo} {c['nome']}{chave}")
        if len(t["colunas"]) > len(mostradas):
            corpo.append(f'        _ mais_colunas "+{len(t["colunas"]) - len(mostradas)}"')
        corpo.append("    }")
    linhas = [
        *CABECALHO_MV,
        "Ligação contínua: chave declarada no fluxo do dicionário; tracejada: referência sem FK formal.",
        "`ND`: tipo que o dicionário não registra. A ficha completa de cada tabela está em ENTIDADES.",
        "",
        "## Diagrama ER (Mermaid)",
        "",
        "```mermaid",
        *corpo,
        "```",
    ]
    return _doc("SCHEMA.md", linhas)


# ---------- FLUXOGRAMAS ----------

CONTEXTO = """flowchart TD
    PAC[Paciente<br/>no WhatsApp] -- manda mensagem --> CW[Chatwoot<br/>inbox do atendimento]
    CW -- Agent Bot --> ANA[fazer.ai agents<br/>com a Ana]
    ANA -- responde --> CW
    ANA -- traces --> LF[Langfuse]
    ANA -- preços e ouvidoria --> APIH[API do Hospital]
    ANA -- agenda --> GH[Global Health<br/>API de agendamento]
    GH -- finalização grava --> MV[Oracle MV TST<br/>só leitura daqui]
    OS[Ana OS<br/>localhost 8777] -- homologação --> GH
    OS -- SELECT --> MV
    OS -- lista ferramentas --> ANA
    OS -- gera via gerar.py --> RET[Retrato<br/>na Vercel]
    RET -- lê ferramentas --> ANA"""


def fluxogramas() -> str:
    linhas = [
        "Diagramas curados no `snapshot.py` (não saem do código). Subset `flowchart TD` aceito",
        "pelo `tools/workflow-dashboard/diagramas.py`.",
        "",
        "## Contexto: quem conversa com quem",
        "",
        "```mermaid",
        CONTEXTO,
        "```",
        "",
        "O paciente fala só com o WhatsApp do hospital; o Chatwoot entrega a conversa à Ana",
        "na fazer.ai agents, que registra cada execução no Langfuse. A Ana lê preços e grava a",
        "ouvidoria na API do Hospital e marca pela Global Health, que só grava no Oracle do MV",
        "na finalização. O Ana OS é o cockpit local: chama a homologação da Global Health,",
        "consulta a base TST em leitura e monta o Retrato publicado na Vercel.",
    ]
    return _doc("FLUXOGRAMAS.md", linhas)


# ---------- orquestra ----------


def gerar(raiz: Path) -> dict[str, str]:
    arquivos = _arquivos_do_git(raiz)
    return {
        "ESTRUTURA.md": estrutura(raiz, arquivos),
        "ROTAS.md": rotas(raiz),
        "ENTIDADES.md": entidades(raiz),
        "SCHEMA.md": schema(raiz),
        "MIGRATIONS.md": _doc("MIGRATIONS.md", [
            "O Programa Ana não tem migrations próprias: o único banco que ele lê é o Oracle do MV do hospital (base TST, só leitura)."
        ]),
        "INTEGRACOES.md": integracoes(raiz, arquivos),
        "FLUXOGRAMAS.md": fluxogramas(),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="Gera docs/spec/snapshots/ do Programa Ana.")
    ap.add_argument("--check", action="store_true", help="não escreve; sai com 1 se algum arquivo mudaria")
    ap.add_argument("--root", default=".", help="raiz do repositório (default: cwd)")
    args = ap.parse_args()
    raiz = Path(args.root).resolve()
    pasta = raiz / SAIDA
    novos = gerar(raiz)
    mudariam = [nome for nome, texto in novos.items()
                if not (pasta / nome).is_file() or (pasta / nome).read_text(encoding="utf-8") != texto]
    if args.check:
        if mudariam:
            print("snapshot desatualizado: " + ", ".join(mudariam))
            return 1
        print("snapshot em dia.")
        return 0
    pasta.mkdir(parents=True, exist_ok=True)
    for nome in mudariam:
        (pasta / nome).write_text(novos[nome], encoding="utf-8")
    print("snapshot: " + (", ".join(mudariam) if mudariam else "nada mudou"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
