#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build sincronizado do contrato VITTA TECH.
Fonte do texto legal: o Markdown do contrato. Camada de design/explicacao: meta-*.json.
Saidas por contrato (ver CONTRATOS):
  - *-print.html -> documento FORMAL (preto no branco) p/ virar PDF
  - *-app.html   -> camada de LEITURA: documento corrido, indice lateral, animacoes
Uso:
  python3 build.py            # contrato 'servicos' (default)
  python3 build.py servicos
  python3 build.py vitta      # contrato antigo (CONTRATO.md -> index.html), sem meta
"""
import html
import json
import os
import re
import sys
import unicodedata

BASE = os.path.dirname(os.path.abspath(__file__))

# ----------------------------------------------------------------------------- config por contrato
CONTRATOS = {
    "servicos": {
        "md": "fonte/CONTRATO-servicos-continuos.md",
        "print": "gerado/servicos-continuos-print.html",
        "app": "gerado/servicos-continuos-app.html",
        "meta": "fonte/meta-servicos.json",
    },
    "vitta": {
        "md": "legado/CONTRATO.md",
        "print": "legado/contrato-print.html",
        "app": "legado/index.html",
        "meta": None,
    },
}

KEY = sys.argv[1] if len(sys.argv) > 1 else "servicos"
if KEY not in CONTRATOS:
    raise SystemExit(f"Contrato desconhecido: {KEY!r}. Opcoes: {', '.join(CONTRATOS)}")
CFG = CONTRATOS[KEY]
MD = os.path.join(BASE, CFG["md"])
OUT_PRINT = os.path.join(BASE, CFG["print"])
OUT_APP = os.path.join(BASE, CFG["app"])
os.makedirs(os.path.dirname(OUT_PRINT), exist_ok=True)
os.makedirs(os.path.dirname(OUT_APP), exist_ok=True)

META = {}
if CFG.get("meta"):
    mp = os.path.join(BASE, CFG["meta"])
    if os.path.exists(mp):
        with open(mp, encoding="utf-8") as f:
            META = json.load(f)

DOC = META.get("doc", {})
TOKENS = META.get("tokens", {})          # token cru -> rotulo legivel (campo a preencher)
FILL = set(TOKENS.keys())                # tokens que viram campo (.tk no app, [..] no print)
SEC_META = META.get("sections", {})      # section_id -> {title, gloss}

EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\U00002190-\U000021FF\U00002300-\U000027BF"
    "\U00002B00-\U00002BFF\U0000FE00-\U0000FE0F\U00002600-\U000026FF]+"
)


# ----------------------------------------------------------------------------- helpers
def strip_emoji(s):
    return EMOJI.sub("", s).strip()


def clean_title(s):
    s = s.replace("**", "").replace("`", "")
    s = strip_emoji(s)
    return re.sub(r"\s{2,}", " ", s).strip(" —-:·")


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s or "x"


# ----------------------------------------------------------------------------- inline
def _basic_inline(text):
    text = html.escape(text, quote=False)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)
    return text


def _placeholders(text, mode):
    # text ja passou por _basic_inline; tokens [..] continuam crus
    def repl(m):
        token = m.group(1)
        if mode == "app":
            if token in FILL:
                return f'<span class="tk">{html.escape(TOKENS[token])}</span>'
            return html.escape(token)  # valor literal de referencia: sem colchetes
        else:  # print formal: campo a preencher fica como [TOKEN]; literal vira texto
            if token in FILL:
                return "[" + html.escape(token) + "]"
            return html.escape(token)

    return re.sub(r"\[([^\]]+)\]", repl, text)


def inline(text, mode):
    return _placeholders(_basic_inline(text), mode)


# realca as partes no corpo das clausulas (so no app)
def termify(s):
    s = re.sub(r"\bCONTRATANTE\b", '<span class="term b">Contratante</span>', s)
    s = re.sub(r"\bCONTRATADA\b", '<span class="term">Contratada</span>', s)
    return s


# ----------------------------------------------------------------------------- block parser
def parse_blocks(md):
    lines = md.split("\n")
    n = len(lines)
    i = 0
    blocks = []
    while i < n:
        line = lines[i]
        s = line.strip()
        if s.startswith("|"):
            buf = []
            while i < n and lines[i].strip().startswith("|"):
                buf.append(lines[i].strip())
                i += 1
            cells = [[c.strip() for c in r.strip("|").split("|")] for r in buf]
            header = None
            body = cells
            if len(cells) >= 2 and all(set(c) <= set("-: ") for c in cells[1]):
                header = cells[0]
                body = cells[2:]
            blocks.append({"k": "table", "header": header, "rows": body})
            continue
        if s.startswith(">"):
            buf = []
            while i < n and lines[i].strip().startswith(">"):
                buf.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            blocks.append({"k": "quote", "text": " ".join(x for x in buf if x.strip())})
            continue
        if re.fullmatch(r"-{3,}", s):
            blocks.append({"k": "hr"})
            i += 1
            continue
        m = re.match(r"^(#{1,6})\s+(.*)$", s)
        if m:
            blocks.append({"k": "h", "level": len(m.group(1)), "text": m.group(2)})
            i += 1
            continue
        m = re.match(r"^([-*])\s+(.*)$", s)
        if m:
            items = []
            while i < n and re.match(r"^([-*])\s+(.*)$", lines[i].strip()):
                it = re.match(r"^([-*])\s+(.*)$", lines[i].strip()).group(2)
                i += 1
                while i < n and lines[i].strip() and not re.match(
                    r"^(\||>|#{1,6}\s|[-*]\s|-{3,}$|\d+\.)", lines[i].strip()
                ) and lines[i].strip() != "<br>":
                    it += " " + lines[i].strip()
                    i += 1
                cb = re.match(r"^\[( |x|X)\]\s+(.*)$", it)
                if cb:
                    items.append({"text": cb.group(2), "check": cb.group(1).lower() == "x"})
                else:
                    items.append({"text": it, "check": None})
            blocks.append({"k": "ul", "items": items})
            continue
        if re.match(r"^[a-z]\)\s", s) or re.match(r"^\d+\.\d+\.", s) or re.match(r"^\d+\.\s", s):
            buf = [s]
            i += 1
            while i < n and lines[i].strip() and not re.match(
                r"^(\||>|#{1,6}\s|[-*]\s|-{3,}$|[a-z]\)\s|\d+\.)", lines[i].strip()
            ) and lines[i].strip() != "<br>":
                buf.append(lines[i].strip())
                i += 1
            blocks.append({"k": "clause", "text": " ".join(buf)})
            continue
        if s == "<br>":
            blocks.append({"k": "br"})
            i += 1
            continue
        if s == "":
            i += 1
            continue
        buf = [s]
        i += 1
        while i < n and lines[i].strip() and not re.match(
            r"^(\||>|#{1,6}\s|[-*]\s|-{3,}$|[a-z]\)\s|\d+\.)", lines[i].strip()
        ) and lines[i].strip() != "<br>":
            buf.append(lines[i].strip())
            i += 1
        blocks.append({"k": "p", "text": " ".join(buf)})
    return blocks


def section_id(text):
    t = clean_title(text)
    up = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().upper()
    m = re.search(r"CLAUSULA\s+(\d+)", up)
    if m:
        return "clausula-" + m.group(1)
    m = re.search(r"ANEXO\s+([IVX]+)", up)
    if m:
        return "anexo-" + m.group(1).lower()
    if "QUALIFICA" in up or up.startswith("PARTES"):
        return "qualificacao"
    if "CONSIDERANDO" in up:
        return "considerandos"
    if "CONTRATO DE PRESTA" in up:
        return "titulo"
    return slug(t)


BOUNDARY_KEYS = ("CLAUSULA", "QUALIFICA", "PARTES", "CONSIDERANDO")


def group_sections(blocks):
    sections = []
    cur = None

    def newsec(sid, title, level):
        nonlocal cur
        cur = {"id": sid, "title": title, "level": level, "blocks": []}
        sections.append(cur)

    newsec("titulo", "Contrato", 1)
    for b in blocks:
        if b["k"] == "h":
            up = unicodedata.normalize("NFKD", clean_title(b["text"])).encode("ascii", "ignore").decode().upper()
            boundary = (b["level"] == 1) or (b["level"] == 2 and any(k in up for k in BOUNDARY_KEYS))
            if boundary:
                sid = section_id(b["text"])
                ttl = clean_title(b["text"])
                if cur and cur["id"] == sid and not cur["blocks"]:
                    cur["title"] = ttl
                    cur["level"] = b["level"]
                else:
                    newsec(sid, ttl, b["level"])
                cur["blocks"].append(b)
                continue
        if b["k"] == "p" and b["text"].startswith("E, por estarem"):
            newsec("assinaturas", "Assinaturas e Testemunhas", 2)
        cur["blocks"].append(b)
    return sections


# ----------------------------------------------------------------------------- block -> html
def render_block(b, mode):
    k = b["k"]
    if k == "h":
        lv = min(b["level"], 6)
        return f"<h{lv}>{inline(clean_title(b['text']), mode)}</h{lv}>"
    if k == "p":
        cls = ""
        if mode == "app" and re.match(r"^\([a-z0-9ivx]+\)\s", b["text"]):
            cls = ' class="sub"'
        return f"<p{cls}>{inline(b['text'], mode)}</p>"
    if k == "clause":
        return f'<p class="cl">{inline(b["text"], mode)}</p>'
    if k == "ul":
        out = ["<ul>"]
        for it in b["items"]:
            if it["check"] is None:
                out.append(f"<li>{inline(it['text'], mode)}</li>")
            else:
                box = "&#9745;" if it["check"] else "&#9744;"
                out.append(f'<li class="task">{box} {inline(it["text"], mode)}</li>')
        out.append("</ul>")
        return "".join(out)
    if k == "table":
        out = ['<div class="tw"><table>']
        if b["header"]:
            out.append("<thead><tr>" + "".join(f"<th>{inline(c, mode)}</th>" for c in b["header"]) + "</tr></thead>")
        out.append("<tbody>")
        for r in b["rows"]:
            out.append("<tr>" + "".join(f"<td>{inline(c, mode)}</td>" for c in r) + "</tr>")
        out.append("</tbody></table></div>")
        return "".join(out)
    if k == "quote":
        return f'<blockquote>{inline(b["text"], mode)}</blockquote>'
    if k == "hr":
        return "<hr/>" if mode == "app" else ""
    if k == "br":
        return "<br/>"
    return ""


def render_blocks(blocks, mode, skip_first_heading=False):
    out = []
    for b in blocks:
        if skip_first_heading and b["k"] == "h":
            skip_first_heading = False
            continue
        out.append(render_block(b, mode))
    return "\n".join(out)


# ----------------------------------------------------------------------------- read + parse
with open(MD, encoding="utf-8") as f:
    RAW_MD = f.read()
BLOCKS = parse_blocks(RAW_MD)
SECTIONS = group_sections(BLOCKS)
SEC_BY_ID = {s["id"]: s for s in SECTIONS}
PRINT_SKIP = {"checklist"}


# ----------------------------------------------------------------------------- PRINT (formal, preto)
PRINT_CSS = """
@page { size: A4; margin: 22mm 22mm 18mm 22mm;
  @bottom-center { content: "Pagina " counter(page) " de " counter(pages);
    font-family:"Times New Roman",serif; font-size: 9pt; color:#000; } }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: "Times New Roman", Georgia, serif; color:#000; background:#fff;
  font-size: 12pt; line-height: 1.6; margin:0; }
.wrap { max-width: 820px; margin: 0 auto; padding: 36px 32px; }
@media print { .wrap { max-width:none; margin:0; padding:0; } body { font-size:11.4pt; } }
h1,h2,h3,h4 { color:#000; font-family:"Times New Roman",Georgia,serif; font-weight:700; }
h1 { font-size: 15.5pt; text-align:center; text-transform:uppercase; letter-spacing:.5px;
  line-height:1.3; border-bottom: 1.5px solid #000; padding-bottom:11px; margin:0 0 20px; }
h2 { font-size: 12.5pt; text-transform:uppercase; letter-spacing:.3px; margin: 22px 0 9px; }
h3 { font-size: 12pt; margin: 17px 0 6px; }
h4 { font-size: 11.5pt; margin: 14px 0 5px; }
p { margin: 0 0 9px; text-align: justify; orphans:2; widows:2; }
p.cl { margin: 0 0 7px 16px; }
ul { margin: 7px 0 10px; padding-left: 28px; }
li { margin: 4px 0; text-align: justify; }
li.task { list-style:none; margin-left:-18px; }
code { font-family:"Courier New",monospace; font-size:10.5pt; }
strong { font-weight: 700; }
em { font-style: italic; }
blockquote { margin: 14px 0 18px; padding: 11px 16px; border:1px solid #555;
  font-size: 10.5pt; line-height:1.5; font-style:italic; }
.tw { width:100%; }
table { border-collapse: collapse; width:100%; margin: 13px 0; font-size: 10.5pt; line-height:1.4; }
th,td { border:1px solid #000; padding:7px 10px; text-align:left; vertical-align:top; }
thead th { font-weight:700; }
hr { border:0; border-top:1px solid #000; margin:18px 0; }
h1 { page-break-before: always; break-before: page; }
.wrap section:first-child h1 { page-break-before: avoid; break-before: avoid; }
table, blockquote, tr, h1, h2, h3 { page-break-inside: avoid; break-inside: avoid; }
#p-assinaturas { page-break-inside: avoid; margin-top: 14px; }
#p-assinaturas table { margin-top: 30px; }
#p-assinaturas table, #p-assinaturas th, #p-assinaturas td {
  border:none; padding: 5px 14px; text-align:center; vertical-align:top; }
"""


def build_print_body():
    parts = []
    for s in SECTIONS:
        if s["id"] in PRINT_SKIP:
            continue
        parts.append(f'<section id="p-{s["id"]}">')
        parts.append(render_blocks(s["blocks"], "print"))
        parts.append("</section>")
    return "\n".join(parts)


def build_print_html():
    body = build_print_body()
    title = html.escape(DOC.get("title", "Contrato"))
    return (
        "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='utf-8'>"
        f"<title>{title}</title><style>" + PRINT_CSS + "</style></head>"
        "<body><div class='wrap'>" + body + "</div></body></html>"
    )


# ----------------------------------------------------------------------------- APP (leitura)
ROMAN = {"i": "I", "ii": "II", "iii": "III", "iv": "IV", "v": "V", "vi": "VI"}


def sec_title(sid, fallback):
    return SEC_META.get(sid, {}).get("title") or fallback


def sec_gloss(sid):
    return SEC_META.get(sid, {}).get("gloss", "")


def marker(sid):
    m = re.match(r"clausula-(\d+)", sid)
    if m:
        return f"{int(m.group(1)):02d}"
    if sid.startswith("anexo-"):
        return ROMAN.get(sid.split("-")[1], sid.split("-")[1].upper())
    return "·"


def short_title(s):
    """Titulo curto para a clausula/anexo a partir do titulo do MD."""
    t = s["title"]
    t = re.sub(r"^CL[ÁA]USULA\s+\d+\.\s*", "", t, flags=re.I)
    t = re.sub(r"^ANEXO\s+[IVX]+\.\s*", "", t, flags=re.I)
    t = t.strip()
    return t[:1].upper() + t[1:].lower() if t.isupper() else t


def doc_card(s):
    sid = s["id"]
    title = html.escape(sec_title(sid, short_title(s)))
    gloss = sec_gloss(sid)
    body = termify(render_blocks(s["blocks"], "app", skip_first_heading=True))
    gl = f'<p class="gloss">{html.escape(gloss)}</p>' if gloss else ""
    return (
        f'<section class="clause reveal" id="{sid}">'
        f'<div class="cl-head"><span class="cl-num">{marker(sid)}</span>'
        f'<div><h2>{title}</h2>{gl}</div></div>'
        f'<div class="cl-body">{body}</div>'
        f"</section>"
    )


def build_toc():
    items = ['<a href="#topo" data-target="topo"><span class="n">·</span>Visão geral</a>']
    if "considerandos" in SEC_BY_ID:
        items.append('<a href="#considerandos" data-target="considerandos"><span class="n">·</span>Considerandos</a>')
    items.append('<div class="sep"></div>')
    clauses = [s for s in SECTIONS if re.match(r"clausula-\d+", s["id"])]
    for s in clauses:
        sid = s["id"]
        items.append(f'<a href="#{sid}" data-target="{sid}"><span class="n">{marker(sid)}</span>{html.escape(sec_title(sid, short_title(s)))}</a>')
    if "assinaturas" in SEC_BY_ID:
        items.append('<div class="sep"></div>')
        items.append('<a href="#assinaturas" data-target="assinaturas"><span class="n">·</span>Assinaturas</a>')
    anexos = [s for s in SECTIONS if s["id"].startswith("anexo-")]
    if anexos:
        if "assinaturas" not in SEC_BY_ID:
            items.append('<div class="sep"></div>')
        for s in anexos:
            sid = s["id"]
            items.append(f'<a href="#{sid}" data-target="{sid}"><span class="n">{marker(sid)}</span>{html.escape(sec_title(sid, short_title(s)))}</a>')
    return "".join(items)


def build_hero():
    facts = "".join(
        f'<span class="fact"><i class="d {f.get("c","pine")}"></i>{html.escape(f["t"])}</span>'
        for f in META.get("facts", [])
    )
    pr = META.get("pricing")
    price = ""
    if pr:
        bars = []
        for r in pr.get("rows", []):
            gold = " gold" if r.get("gold") else ""
            bars.append(
                '<div class="barrow"><div class="lbl">'
                f'<span class="name">{html.escape(r["name"])} <span class="cond">· {html.escape(r["cond"])}</span></span>'
                f'<span class="val">{html.escape(r["val"])}<small>/mês</small></span></div>'
                f'<div class="track"><span class="fill{gold}" data-w="{r.get("w",100)}" style="--rw:0%"></span></div></div>'
            )
        price = (
            '<section class="price reveal"><div class="price-h">'
            f'<h3>{html.escape(pr.get("title",""))}</h3><span class="note">{html.escape(pr.get("note",""))}</span></div>'
            f'<div class="bars">{"".join(bars)}</div>'
            f'<div class="total"><span class="t-l">{html.escape(pr.get("totalLabel",""))}</span>'
            f'<span class="t-v">{html.escape(pr.get("totalVal",""))} <small>{html.escape(pr.get("totalSuffix",""))}</small></span></div></section>'
        )
    return (
        '<span id="topo"></span>'
        '<section class="hero">'
        f'<p class="kicker reveal">{html.escape(DOC.get("kicker",""))}</p>'
        f'<h1 class="htitle reveal" style="--d:60ms">{DOC.get("heroTitle","")}</h1>'
        f'<p class="hsub reveal" style="--d:120ms">{html.escape(DOC.get("heroSub",""))}</p>'
        '</section>'
        f'<section class="facts reveal">{facts}</section>'
        + price
    )


def build_considerandos():
    s = SEC_BY_ID.get("considerandos")
    if not s:
        return ""
    body = termify(render_blocks(s["blocks"], "app", skip_first_heading=True))
    return (
        '<p class="grouplbl reveal">Abertura</p>'
        '<section class="cons reveal" id="considerandos">'
        f'<h4>{html.escape(sec_title("considerandos","Considerandos"))}</h4>{body}</section>'
    )


def build_signatures():
    if "assinaturas" not in SEC_BY_ID:
        return ""
    cda = META.get("contratada", {})
    sub = cda.get("lines", [""])[0] if cda.get("lines") else ""
    return (
        '<p class="grouplbl reveal">Fecho</p>'
        '<section class="signs reveal" id="assinaturas">'
        '<p class="sign-intro">E, por estarem assim justas e contratadas, as Partes firmam o presente Contrato '
        'em 2 (duas) vias de igual teor, em <span class="tk">cidade</span>, <span class="tk">data</span>.</p>'
        '<div class="signgrid">'
        f'<div class="sigcard"><div class="sigline"></div><b>{html.escape(cda.get("name","CONTRATADA"))}</b>'
        f'<span>{html.escape(sub)}</span><span>Pedro Malafaia Rezende de Figueiredo · Sócio-administrador</span></div>'
        '<div class="sigcard"><div class="sigline"></div><b><span class="tk">razão social</span></b>'
        '<span><span class="tk">representante legal</span> · <span class="tk">cargo</span></span></div>'
        '</div>'
        '<p class="wit">Testemunhas: 1. ___________________ &nbsp;&nbsp; 2. ___________________</p>'
        '</section>'
    )


def build_clauses():
    clauses = [s for s in SECTIONS if re.match(r"clausula-\d+", s["id"])]
    cards = "".join(doc_card(s) for s in clauses)
    return '<p class="grouplbl reveal">As cláusulas</p>' + cards


def build_anexos():
    anexos = [s for s in SECTIONS if s["id"].startswith("anexo-")]
    if not anexos:
        return ""
    cards = "".join(doc_card(s) for s in anexos)
    return '<p class="grouplbl reveal">Os anexos</p>' + cards


APP_CSS = r"""
:root{
  --paper:#F7F4ED;--paper-2:#FBF9F4;--ink:#1C211E;--ink-soft:#3A423D;--muted:#7A817B;--faint:#A7ADA6;
  --line:#E6E1D6;--line-2:#EFEBE2;--card:#FFFDF9;
  --pine:#0E5B47;--pine-2:#0A4636;--pine-wash:#E7F0EB;--gold:#9A7416;--gold-wash:#F3ECDB;--rose:#9E3B2E;
  --shadow-sm:0 1px 2px rgba(28,33,30,.05);--shadow:0 2px 4px rgba(28,33,30,.04),0 14px 40px rgba(28,33,30,.07);
  --serif:"Spectral",Georgia,"Times New Roman",serif;--display:"Fraunces",Georgia,serif;
  --sans:"Schibsted Grotesk",system-ui,sans-serif;--maxw:1180px;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.65;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
  background:radial-gradient(1100px 520px at 88% -8%, #ECF1EA 0, rgba(236,241,234,0) 62%),
   radial-gradient(900px 480px at -6% 4%, #F1ECE0 0, rgba(241,236,224,0) 58%),var(--paper);
  background-attachment:fixed}
::selection{background:rgba(14,91,71,.16)}
a{color:var(--pine);text-decoration:none}
.progress{position:fixed;top:0;left:0;height:3px;width:0;z-index:120;
  background:linear-gradient(90deg,var(--pine),var(--gold));transition:width .12s linear}
header.top{position:sticky;top:0;z-index:100;background:rgba(247,244,237,.82);
  backdrop-filter:saturate(1.5) blur(12px);border-bottom:1px solid var(--line)}
.topin{max-width:var(--maxw);margin:0 auto;padding:13px 30px;display:flex;align-items:center;gap:16px}
.brand{display:flex;align-items:center;gap:12px}
.mark{width:38px;height:38px;border-radius:11px;flex:none;background:linear-gradient(150deg,var(--pine),var(--pine-2));
  color:#fff;display:grid;place-items:center;font-family:var(--display);font-weight:600;font-size:17px;
  box-shadow:0 4px 14px rgba(14,91,71,.28);letter-spacing:.02em}
.brand b{font-family:var(--sans);font-weight:600;font-size:15.5px;letter-spacing:-.01em;display:block;line-height:1.15}
.brand small{display:block;color:var(--muted);font-size:11.5px;font-weight:500;letter-spacing:.01em}
.spacer{flex:1}
.tag-doc{font-size:11.5px;font-weight:600;color:var(--pine);letter-spacing:.06em;text-transform:uppercase;
  background:var(--pine-wash);border:1px solid rgba(14,91,71,.14);padding:6px 12px;border-radius:999px}
@media(max-width:720px){.tag-doc{display:none}}
.shell{max-width:var(--maxw);margin:0 auto;padding:0 30px;display:grid;grid-template-columns:248px 1fr;gap:46px;align-items:start}
@media(max-width:980px){.shell{grid-template-columns:1fr;gap:0}}
aside.toc{position:sticky;top:86px;align-self:start;padding:30px 0 40px;max-height:calc(100vh - 96px);overflow-y:auto;
  scrollbar-width:thin;scrollbar-color:var(--line) transparent}
aside.toc::-webkit-scrollbar{width:5px}
aside.toc::-webkit-scrollbar-thumb{background:var(--line);border-radius:8px}
.toc-h{font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--faint);margin:0 0 14px 14px}
.toc nav{display:flex;flex-direction:column;gap:1px;position:relative}
.toc a{display:flex;align-items:baseline;gap:11px;padding:7px 12px 7px 14px;border-radius:9px;color:var(--muted);
  font-size:13.5px;font-weight:500;line-height:1.3;position:relative;transition:color .22s,background .22s;border-left:2px solid transparent}
.toc a .n{font-family:var(--display);font-size:12px;font-weight:600;color:var(--faint);min-width:20px;
  font-variant-numeric:tabular-nums;transition:color .22s}
.toc a:hover{color:var(--ink);background:rgba(14,91,71,.05)}
.toc a.active{color:var(--pine-2);background:var(--pine-wash);font-weight:600;border-left-color:var(--pine)}
.toc a.active .n{color:var(--pine)}
.toc .sep{height:1px;background:var(--line);margin:12px 14px}
@media(max-width:980px){
  aside.toc{position:static;max-height:none;overflow:visible;padding:0;border-bottom:1px solid var(--line);margin:0 -30px}
  .toc-h{display:none}
  .toc nav{flex-direction:row;flex-wrap:nowrap;overflow-x:auto;gap:6px;padding:14px 30px;scrollbar-width:none}
  .toc nav::-webkit-scrollbar{display:none}
  .toc .sep{display:none}
  .toc a{white-space:nowrap;border-left:0;border-bottom:2px solid transparent;border-radius:8px;padding:8px 12px}
  .toc a.active{border-left:0;border-bottom-color:var(--pine)}
}
main{padding:8px 0 120px;min-width:0}
.hero{padding:42px 0 8px}
.kicker{font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--pine)}
.kicker::before{content:"";display:inline-block;width:26px;height:1.5px;background:var(--gold);vertical-align:middle;margin-right:12px;transform:translateY(-3px)}
.htitle{font-family:var(--display);font-weight:500;font-size:clamp(40px,6.5vw,72px);line-height:.98;letter-spacing:-.02em;margin:.24em 0 .12em;font-optical-sizing:auto}
.htitle em{font-style:italic;color:var(--pine)}
.hsub{font-family:var(--serif);font-size:clamp(18px,2.4vw,22px);color:var(--ink-soft);font-style:italic;margin:0;max-width:34ch}
.parties{display:grid;grid-template-columns:1fr auto 1fr;gap:18px;align-items:stretch;margin:48px 0 6px}
.party{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:24px 26px;box-shadow:var(--shadow-sm);position:relative;overflow:hidden}
.party::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--pine)}
.party.b::before{background:var(--gold)}
.ptag{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--pine)}
.party.b .ptag{color:var(--gold)}
.party strong{display:block;font-family:var(--display);font-weight:500;font-size:23px;line-height:1.12;letter-spacing:-.01em;margin:9px 0 11px}
.pmeta{color:var(--muted);font-size:13px;line-height:1.6}
.pmeta span{display:block}
.plink{display:grid;place-items:center;color:var(--faint);font-family:var(--serif);font-style:italic;font-size:14px;position:relative}
.plink i{font-style:normal;width:42px;height:42px;border-radius:50%;border:1.5px dashed var(--line);display:grid;place-items:center;color:var(--pine);font-size:18px;margin-bottom:8px}
@media(max-width:760px){.parties{grid-template-columns:1fr}.plink{padding:6px 0}.plink i{margin:0 auto}}
.facts{display:flex;flex-wrap:wrap;gap:10px;margin:26px 0 4px}
.fact{display:inline-flex;align-items:center;gap:9px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:9px 16px;font-size:13px;font-weight:500;color:var(--ink-soft);box-shadow:var(--shadow-sm)}
.fact .d{width:7px;height:7px;border-radius:50%;flex:none}
.d.pine{background:var(--pine)}.d.gold{background:var(--gold)}.d.rose{background:var(--rose)}
.price{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:26px 30px;margin:40px 0 8px;box-shadow:var(--shadow)}
.price-h{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:22px;flex-wrap:wrap}
.price-h h3{font-family:var(--display);font-weight:500;font-size:21px;margin:0;letter-spacing:-.01em}
.price-h .note{font-size:12.5px;color:var(--muted)}
.bars{display:flex;flex-direction:column;gap:16px}
.barrow{display:grid;grid-template-columns:1fr;gap:6px}
.barrow .lbl{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.barrow .name{font-weight:600;font-size:14.5px}
.barrow .cond{font-size:12px;color:var(--muted);font-weight:400}
.barrow .val{font-family:var(--display);font-weight:600;font-size:18px;letter-spacing:-.01em;white-space:nowrap}
.barrow .val small{font-size:13px;color:var(--muted);font-weight:400;font-family:var(--sans)}
.track{height:13px;border-radius:8px;background:var(--pine-wash);overflow:hidden;position:relative}
.fill{position:absolute;inset:0 100% 0 0;border-radius:8px;background:linear-gradient(90deg,var(--pine-2),var(--pine));transition:right 1.1s cubic-bezier(.3,.7,.2,1)}
.fill.gold{background:linear-gradient(90deg,#7d5e10,var(--gold))}
.price.in .fill[data-w]{right:var(--rw)}
.total{display:flex;justify-content:space-between;align-items:baseline;margin-top:22px;padding-top:18px;border-top:1px solid var(--line);gap:12px;flex-wrap:wrap}
.total .t-l{font-size:13px;color:var(--muted);font-weight:500;text-transform:uppercase;letter-spacing:.05em}
.total .t-v{font-family:var(--display);font-weight:600;font-size:28px;letter-spacing:-.02em}
.total .t-v small{font-size:14px;color:var(--muted);font-weight:400;font-family:var(--sans)}
.grouplbl{font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--faint);margin:64px 0 6px;display:flex;align-items:center;gap:14px}
.grouplbl::after{content:"";flex:1;height:1px;background:var(--line)}
.cons{background:var(--gold-wash);border:1px solid rgba(154,116,22,.18);border-radius:18px;padding:26px 30px;margin:26px 0}
.cons h4{font-family:var(--display);font-weight:500;font-size:18px;margin:0 0 12px}
.cons p{font-family:var(--serif);font-size:15.5px;line-height:1.7;color:var(--ink-soft);margin:0 0 10px;text-align:justify}
.cons p:last-child{margin-bottom:0}
.clause{padding:40px 0 34px;border-bottom:1px solid var(--line-2);scroll-margin-top:96px;position:relative}
.clause:last-of-type{border-bottom:0}
.cl-head{display:flex;gap:20px;align-items:flex-start;margin-bottom:20px}
.cl-num{font-family:var(--display);font-weight:500;font-size:15px;color:var(--pine);flex:none;width:46px;height:46px;
  border-radius:13px;display:grid;place-items:center;background:var(--pine-wash);border:1px solid rgba(14,91,71,.16);
  font-variant-numeric:tabular-nums;transition:transform .4s cubic-bezier(.2,.7,.2,1),background .3s}
.clause:hover .cl-num{transform:translateY(-2px) rotate(-3deg);background:#dcece4}
.cl-head h2{font-family:var(--display);font-weight:500;font-size:clamp(24px,3vw,31px);line-height:1.06;letter-spacing:-.018em;margin:4px 0 0}
.gloss{font-family:var(--sans);font-size:14px;line-height:1.55;color:var(--muted);margin:11px 0 0;max-width:62ch;padding-left:14px;border-left:2px solid var(--gold)}
.cl-body{font-family:var(--serif);font-size:16.5px;line-height:1.78;color:var(--ink-soft);padding-left:66px}
@media(max-width:620px){.cl-body{padding-left:0}}
.cl-body p{margin:0 0 13px;text-align:justify;text-justify:inter-word;hyphens:auto}
.cl-body p.sub{margin-left:26px;margin-bottom:9px}
.cl-body p.cl{margin-left:0}
.cl-body strong{font-weight:500;color:var(--ink);background:linear-gradient(transparent 62%,rgba(154,116,22,.18) 62%)}
.cl-body em{font-style:italic}
.cl-body h2{font-family:var(--display);font-weight:500;font-size:18px;color:var(--pine-2);margin:24px 0 8px;letter-spacing:-.01em}
.cl-body h3,.cl-body h4{font-family:var(--display);font-weight:500;color:var(--pine-2);margin:18px 0 6px}
.cl-body ul{padding-left:22px;margin:10px 0}
.cl-body li{margin:5px 0}
.term{font-family:var(--sans);font-size:.86em;font-weight:600;letter-spacing:.01em;color:var(--pine-2);background:var(--pine-wash);padding:.5px 6px;border-radius:5px;white-space:nowrap}
.term.b{color:var(--gold);background:var(--gold-wash)}
.tk{font-family:var(--sans);font-size:.8em;font-weight:600;letter-spacing:.02em;color:var(--muted);background:rgba(122,129,123,.1);
  border:1px solid var(--line);border-bottom:1.5px dotted var(--faint);padding:1px 8px;border-radius:6px;white-space:nowrap;vertical-align:1px;cursor:default;transition:.2s}
.tk:hover{color:var(--pine);border-bottom-color:var(--pine);background:var(--pine-wash)}
.tw{overflow-x:auto;margin:18px 0;border-radius:14px;border:1px solid var(--line)}
table{border-collapse:collapse;width:100%;font-family:var(--sans);font-size:13.5px;background:var(--card)}
thead th{background:var(--pine);color:#fff;font-weight:600;text-align:left;padding:11px 15px;letter-spacing:.01em;white-space:nowrap}
tbody td{border-top:1px solid var(--line);padding:11px 15px;vertical-align:top;color:var(--ink-soft);line-height:1.5}
tbody tr:nth-child(even){background:var(--paper-2)}
tbody td:first-child{font-weight:500;color:var(--ink)}
.signs{padding:44px 0 8px}
.sign-intro{font-family:var(--serif);font-size:16.5px;color:var(--ink-soft);line-height:1.78;margin:0}
.signgrid{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:18px}
@media(max-width:620px){.signgrid{grid-template-columns:1fr}}
.sigcard{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:30px 26px 22px;text-align:center;box-shadow:var(--shadow-sm)}
.sigline{height:1px;background:var(--ink);opacity:.4;margin:38px 10px 12px}
.sigcard b{font-family:var(--display);font-weight:500;font-size:16px;display:block;line-height:1.3}
.sigcard span{display:block;color:var(--muted);font-size:13px;margin-top:3px}
.wit{font-family:var(--serif);color:var(--muted);font-size:14px;margin-top:26px;font-style:italic}
.reveal{opacity:0;transform:translateY(20px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1);transition-delay:var(--d,0ms)}
.reveal.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}}
.totop{position:fixed;right:26px;bottom:26px;z-index:90;width:46px;height:46px;border-radius:50%;border:1px solid var(--line);
  background:var(--card);color:var(--pine);box-shadow:var(--shadow);display:grid;place-items:center;cursor:pointer;
  opacity:0;transform:translateY(14px) scale(.9);transition:.3s;font-size:18px}
.totop.show{opacity:1;transform:none}
.totop:hover{background:var(--pine);color:#fff;border-color:var(--pine)}
footer{max-width:var(--maxw);margin:0 auto;padding:34px 30px 70px;color:var(--muted);font-size:13px;line-height:1.7}
footer .fline{border-top:1px solid var(--line);padding-top:24px;max-width:72ch}
footer b{color:var(--ink-soft);font-weight:600}
"""

APP_JS = r"""
const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const bar=$('#progress');
function onScroll(){
  const h=document.documentElement;
  const max=h.scrollHeight-h.clientHeight;
  const p=max>0?(h.scrollTop||document.body.scrollTop)/max:0;
  bar.style.width=(p*100).toFixed(2)+'%';
  $('#totop').classList.toggle('show',h.scrollTop>620);
}
document.addEventListener('scroll',onScroll,{passive:true});onScroll();
$('#totop').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12,rootMargin:'0px 0px -8% 0px'});
$$('.reveal').forEach(el=>io.observe(el));
const priceEl=$('.price');
if(priceEl){
  const pio=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){
    priceEl.classList.add('in');
    $$('.fill',priceEl).forEach(f=>f.style.setProperty('--rw',(100-(+f.dataset.w))+'%'));
    pio.disconnect();
  }});},{threshold:.4});
  pio.observe(priceEl);
}
const links=$$('#toc a');
const byId=Object.fromEntries(links.map(a=>[a.dataset.target,a]));
const targets=$$('main [id]').filter(el=>byId[el.id]);
let current=null;
const spy=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){
  if(current)current.classList.remove('active');
  const a=byId[e.target.id];
  if(a){a.classList.add('active');current=a;a.scrollIntoView({block:'nearest',inline:'nearest'});}
}});},{rootMargin:'-90px 0px -68% 0px',threshold:0});
targets.forEach(t=>spy.observe(t));
"""


def build_app_html():
    title = html.escape(DOC.get("title", "Contrato"))
    fonts = ("https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;"
             "0,9..144,600;1,9..144,400&family=Spectral:ital,wght@0,400;0,500;1,400&"
             "family=Schibsted+Grotesk:wght@400;500;600;700&display=swap")
    head = (
        "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        f"<title>{title}</title>"
        "<link rel='preconnect' href='https://fonts.googleapis.com'>"
        "<link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>"
        f"<link href='{fonts}' rel='stylesheet'>"
        "<style>" + APP_CSS + "</style></head>"
    )
    body = (
        "<body><div class='progress' id='progress'></div>"
        "<header class='top'><div class='topin'><div class='brand'>"
        "<span class='mark'>VT</span>"
        f"<span><b>{html.escape(DOC.get('brand','VITTA TECH'))}</b><small>{html.escape(DOC.get('brandSub',''))}</small></span>"
        "</div><span class='spacer'></span><span class='tag-doc'>Leitura explicada</span></div></header>"
        "<div class='shell'>"
        "<aside class='toc'><div class='toc-shell'><p class='toc-h'>Índice</p>"
        f"<nav id='toc'>{build_toc()}</nav></div></aside>"
        "<main>"
        + build_hero()
        + build_considerandos()
        + build_clauses()
        + build_signatures()
        + build_anexos()
        + "</main></div>"
        "<button class='totop' id='totop' aria-label='Voltar ao topo'>↑</button>"
        "<footer><p class='fline'>Esta é a <b>camada de leitura explicada</b> do contrato. As notas em verde-oliva "
        "resumem cada cláusula em linguagem simples e não substituem o texto. Os campos a preencher (razão social, "
        "CNPJ, datas) aparecem como marcadores e serão completados na versão final. <b>Não substitui parecer jurídico.</b></p></footer>"
        "<script>" + APP_JS + "</script></body></html>"
    )
    return head + body


def main():
    with open(OUT_PRINT, "w", encoding="utf-8") as f:
        f.write(build_print_html())
    with open(OUT_APP, "w", encoding="utf-8") as f:
        f.write(build_app_html())
    print("OK  (" + KEY + ")")
    print("  ->", OUT_PRINT)
    print("  ->", OUT_APP)
    print("  secoes:", len(SECTIONS), "| tokens:", len(FILL), "| glosas:", sum(1 for v in SEC_META.values() if v.get("gloss")))


if __name__ == "__main__":
    main()
