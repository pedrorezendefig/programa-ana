#!/usr/bin/env python3
"""Le as notas de versao do Chatwoot da fazer.ai e diz quantas versoes a Ana esta atras.

Uso:
  python3 ana/plataforma/scripts/fetch-chatwoot-releases.py            # placar + lista do atraso
  python3 ana/plataforma/scripts/fetch-chatwoot-releases.py --json     # despeja tudo em JSON
  python3 ana/plataforma/scripts/fetch-chatwoot-releases.py --todas    # imprime as 148, nao so o atraso

Por que este script existe (ADR-0024): a pagina https://fazer.ai/chatwoot-release-notes mostra
apenas as 5 releases mais novas e esconde o resto atras de um botao "Load more". Um scrape ingenuo
(firecrawl, WebFetch, curl + markdown) devolve as 5 e da a impressao de ter lido tudo. O acervo
inteiro ja vem no HTML, dentro do payload do Next.js (self.__next_f), entao a leitura completa e
uma questao de desempacotar, nao de clicar. Sem este script, cada sessao redescobre isso do zero.

O repo NAO guarda o dump das releases. A pagina e a fonte; este script e o caminho ate ela; a
leitura curada (o que cada release significa para a Ana) mora em ana/plataforma/chatwoot-releases.md.

A versao INSTALADA e perguntada ao vivo: GET {CHATWOOT_URL}/api devolve {"version": ...} sem exigir
credencial. CHATWOOT_URL sai do .env da raiz; sem ele, o script cai no host conhecido da instancia.
"""
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

PAGINA = "https://fazer.ai/chatwoot-release-notes"
CHATWOOT_PADRAO = "https://chatwoot.mala-ia.cloud"
TIMEOUT_S = 30

# A instancia da Ana roda a edicao Pro. As releases CE aparecem embutidas nas notas Pro
# ("Inclui mudancas do Chatwoot fazer.ai vX"), entao acompanhar a serie Pro cobre as duas.
EDICAO = "pro"


def ler_env(chave, padrao=""):
    caminho = Path(__file__).resolve().parents[3] / ".env"
    if not caminho.exists():
        return padrao
    for linha in caminho.read_text(encoding="utf-8", errors="replace").splitlines():
        if linha.strip().startswith("#") or "=" not in linha:
            continue
        k, _, v = linha.partition("=")
        if k.strip() == chave:
            return v.strip().strip("\"'")
    return padrao


def baixar_pagina():
    req = urllib.request.Request(PAGINA, headers={"User-Agent": "ana-os/fetch-chatwoot-releases"})
    with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
        return resp.read().decode("utf-8", "replace")


def desempacotar_payload(html):
    """Junta os pedacos do payload do Next.js num texto so."""
    pedacos = re.findall(r'self\.__next_f\.push\(\[1,(".*?")\]\)</script>', html, re.S)
    return "".join(json.loads(p) for p in pedacos)


def _fatiar_objeto(texto, inicio):
    """Devolve o objeto JSON que comeca em `inicio`, balanceando chaves fora de string."""
    profundidade = 0
    dentro_de_string = False
    escapado = False
    for i in range(inicio, len(texto)):
        c = texto[i]
        if escapado:
            escapado = False
            continue
        if c == "\\":
            escapado = True
            continue
        if c == '"':
            dentro_de_string = not dentro_de_string
            continue
        if dentro_de_string:
            continue
        if c == "{":
            profundidade += 1
        elif c == "}":
            profundidade -= 1
            if profundidade == 0:
                return texto[inicio:i + 1]
    raise ValueError("objeto de releases nao fecha no payload")


def resolver_referencias(payload, releases):
    """Troca os '$1c' das notas pelo texto real.

    O Next.js hoista texto longo repetido para um pedaco proprio do payload e deixa uma referencia
    no lugar. Sem isto, 6 releases (entre elas a .119 e a .116) chegam como a string "$1c" e somem
    da leitura sem erro nenhum: um jeito silencioso de perder justamente as notas mais compridas.
    """
    for r in releases:
        for idioma, texto in list(r.get("userNotes", {}).items()):
            if not (isinstance(texto, str) and texto.startswith("$")):
                continue
            ref = texto[1:]
            m = re.search(re.escape(ref) + r":T([0-9a-f]+),", payload)
            if not m:
                continue
            n_bytes = int(m.group(1), 16)
            bruto = payload[m.end():m.end() + n_bytes + 200]
            r["userNotes"][idioma] = bruto.encode("utf-8")[:n_bytes].decode("utf-8", "ignore")
    return releases


def ler_releases():
    payload = desempacotar_payload(baixar_pagina())
    inicio = payload.find('{"releases":[')
    if inicio < 0:
        raise ValueError("a pagina mudou de formato: nao achei o bloco de releases no payload")
    releases = json.loads(_fatiar_objeto(payload, inicio))["releases"]
    return resolver_referencias(payload, releases)


def versao_instalada():
    base = ler_env("CHATWOOT_URL", CHATWOOT_PADRAO).rstrip("/")
    try:
        with urllib.request.urlopen(base + "/api", timeout=TIMEOUT_S) as resp:
            return json.loads(resp.read().decode("utf-8", "replace")).get("version", "")
    except (urllib.error.URLError, OSError, ValueError) as e:
        print("aviso: nao consegui perguntar a versao instalada em %s (%s)" % (base, e), file=sys.stderr)
        return ""


def ordenar(releases):
    return sorted(releases, key=lambda r: r.get("publishedAt", ""))


def normalizar(tag):
    """A tag do GitHub vem com "v" na frente ("v4.17.0-fazer-ai-pro.120"); o GET /api do Chatwoot
    devolve a mesma versao sem ele ("4.16.0-fazer-ai-pro.111"). Comparar cru da atraso zero com a
    instancia nove versoes atrasada, que e o pior erro possivel aqui: silencioso e tranquilizador."""
    return (tag or "").strip().lstrip("vV")


def main():
    argumentos = set(sys.argv[1:])
    releases = ler_releases()

    if "--json" in argumentos:
        json.dump(releases, sys.stdout, ensure_ascii=False, indent=1)
        return 0

    pro = ordenar([r for r in releases if r.get("edition") == EDICAO])
    instalada = versao_instalada()
    tags = [normalizar(r["tagName"]) for r in pro]
    alvo = normalizar(instalada)
    atras = tags[tags.index(alvo) + 1:] if alvo in tags else []

    print("Chatwoot fazer.ai, edicao %s" % EDICAO)
    print("  publicadas : %d (%s ate %s)" % (len(pro), pro[0]["publishedAt"][:10], pro[-1]["publishedAt"][:10]))
    print("  instalada  : %s" % (instalada or "nao consegui ler"))
    print("  ultima     : %s (%s)" % (pro[-1]["tagName"], pro[-1]["publishedAt"][:10]))
    if alvo and alvo not in tags:
        print("  ATENCAO: a versao instalada nao aparece na lista Pro publicada.")
    print("  atraso     : %d versao(oes)" % len(atras))

    mostrar = pro if "--todas" in argumentos else [r for r in pro if normalizar(r["tagName"]) in atras]
    for r in mostrar:
        nota = (r.get("userNotes", {}).get("pt-BR") or r.get("userNotes", {}).get("en") or "").strip()
        print("\n" + "=" * 78)
        print("%s  (%s)" % (r["tagName"], r["publishedAt"][:10]))
        print(r.get("htmlUrl", ""))
        print()
        print(nota)
    return 0


if __name__ == "__main__":
    sys.exit(main())
