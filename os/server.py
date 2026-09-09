#!/usr/bin/env python3
"""Ana OS: backend local do cockpit do Programa Ana (ADR-0007).

Evolucao do server do Playground GH (ADR-0004), mesmas regras de seguranca:
  - Chamada ao vivo SO para a API GH de homologacao (token nunca chega ao navegador).
  - Oracle TST somente SELECT/WITH (mesma politica do scripts/query-mv.py).
  - Producao entra apenas como conhecimento estatico (CSVs da absorcao); a
    subpasta amostras/ (dado pessoal) nunca e servida.
O que o OS acrescenta:
  - Paginas e assets (css/js/json/woff2) servidos de os/.
  - /api/roadmap: leitura de os/dados/roadmap.json. So leitura (ADR-0028):
    card novo, card feito e canal movido nascem por sessao no terminal.
  - /api/docs e /docs/...: a Biblioteca, allowlist explicita de .md do repo.
    dados-locais/ e resultados/amostras/ ficam fora por construcao.

Uso:
  python3 os/server.py
  Abrir http://localhost:8777

Token: variavel GH_TOKEN_HOMOLOG do .env na raiz do repo (fora do git).
Ambiente: SOMENTE homologacao. Producao e proibida neste app.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BASE_URL = "https://dem.agenda.globalhealth.mv/rest/whatsapp"
PORTA = 8777
TIMEOUT_S = 30
CPF_SONDA = "66301102770"
METODOS_PERMITIDOS = {"GET", "POST", "DELETE"}
SQL_MAX_LINHAS = 200

OS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.dirname(OS_DIR)
ABSORCAO_DIR = os.path.join(REPO_DIR, "ana", "api-mv", "absorcao-producao", "resultados")
ROADMAP_JSON = os.path.join(OS_DIR, "dados", "roadmap.json")
# Cenarios da bancada (ADR-0020): a pagina Testes manuais le o arquivo que vive
# fora de os/. Leitura de UM arquivo fixo, nunca de uma pasta.
CENARIOS_JSON = os.path.join(REPO_DIR, "ana", "bancada", "cenarios", "integracao.json")
# Parser das notas de versao do Chatwoot (ADR-0024). O server NAO tem copia da logica:
# ele importa o mesmo script que uma sessao roda na mao, para os dois nunca divergirem.
RELEASES_SCRIPT = os.path.join(REPO_DIR, "ana", "plataforma", "scripts", "fetch-chatwoot-releases.py")

ESTATICOS = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".woff2": "font/woff2",
    ".svg": "image/svg+xml",
    ".md": "text/markdown; charset=utf-8",
}
ABSORCAO_EXTENSOES = {".csv", ".md"}

# Biblioteca: allowlist explicita (ADR-0007). Grupos de diretorio sao lidos
# SEM recursao (subpastas como roadmap/arquivo/ ficam de fora) e so .md.
# dados-locais/ e amostras/ nunca entram aqui.
DOCS_GRUPOS = {
    "adr": {"titulo": "Decisões (ADRs)", "dir": os.path.join(REPO_DIR, "docs", "adr")},
    "roadmap": {"titulo": "Roadmap", "dir": os.path.join(REPO_DIR, "roadmap")},
    "api-mv": {"titulo": "Mundo MV / Global Health", "dir": os.path.join(REPO_DIR, "ana", "api-mv")},
    "os": {"titulo": "Ana OS", "dir": OS_DIR},
}
DOCS_RAIZ = {"titulo": "Programa", "arquivos": [
    "CONTEXT.md", "CLAUDE.md", "README.md", "Documento-Mestre_Programa-Ana-CRM.md",
]}


def find_env():
    for parent in Path(__file__).resolve().parents:
        candidate = parent / ".env"
        if candidate.is_file():
            return candidate
    return None


def load_env(path):
    env = {}
    if path is None:
        return env
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


ENV = load_env(find_env())
TOKEN = ENV.get("GH_TOKEN_HOMOLOG", "")
if not TOKEN:
    print("AVISO: .env ausente ou sem GH_TOKEN_HOMOLOG. O OS sobe normalmente; "
          "as paginas que chamam a API GH (bancada, roteiro) e o Oracle TST vao "
          "responder erro ate as credenciais existirem (ver README, passo 5).", flush=True)


def call_gh(method, path, query=None, body=None):
    """Chama a API GH e devolve dict {status, latencia_ms, corpo_cru, json}.

    status 0 = nao alcancou a API (rede/DNS/timeout); corpo_cru traz o motivo.
    """
    url = BASE_URL + path
    query = {k: v for k, v in (query or {}).items() if v not in (None, "")}
    if query:
        url += "?" + urllib.parse.urlencode(query)
    data = None
    headers = {"Token": TOKEN, "Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    inicio = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
            status = resp.status
            corpo = resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        status = e.code
        corpo = e.read().decode("utf-8", "replace")
    except (urllib.error.URLError, OSError) as e:
        latencia = int((time.monotonic() - inicio) * 1000)
        return {"status": 0, "latencia_ms": latencia,
                "corpo_cru": "Nao alcancou a API GH: " + str(getattr(e, "reason", e)),
                "json": None}
    latencia = int((time.monotonic() - inicio) * 1000)
    try:
        parsed = json.loads(corpo) if corpo.strip() else None
    except ValueError:
        parsed = None
    return {"status": status, "latencia_ms": latencia, "corpo_cru": corpo, "json": parsed}


# ---------------------------------------------------------------- tools ao vivo

PLATAFORMA_URL = "https://agents.hospitalsaomatheus.cloud"

# Campos que a pagina pode mostrar. credentialRef e uma REFERENCIA (ex.: "vault:6"),
# nunca o segredo. Nada alem disto sai daqui.
TOOL_CAMPOS = ("id", "name", "label", "method", "urlTemplate", "credentialRef", "enabled")


def ler_tools():
    """Le as definicoes de ferramentas na plataforma (ADR-0017).

    O Ana OS nao guarda URL, credencial nem estado de ferramenta em arquivo: quando a
    pagina precisa disso, ela pergunta a fonte. O token fica aqui no server, lido do
    .env, e nunca chega ao navegador.

    Devolve {ok: true, tools: [...], lido_em: ...} ou {ok: false, erro: "..."}: a pagina
    mostra o erro em vez de um valor guardado antes, que seria mentira com cara de fato.
    """
    token = ENV.get("AGENTS_API_TOKEN", "")
    if not token:
        return {"ok": False, "erro": "AGENTS_API_TOKEN ausente no .env"}
    req = urllib.request.Request(
        PLATAFORMA_URL + "/api/v1/tools",
        headers={"Authorization": "Bearer " + token, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
            doc = json.loads(resp.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as e:
        return {"ok": False, "erro": "a plataforma respondeu HTTP %s" % e.code}
    except (urllib.error.URLError, OSError, ValueError) as e:
        return {"ok": False, "erro": "nao alcancou a plataforma: %s" % getattr(e, "reason", e)}
    brutas = doc.get("tools", doc if isinstance(doc, list) else [])
    tools = [{c: t.get(c) for c in TOOL_CAMPOS} for t in brutas]
    return {"ok": True, "tools": tools, "lido_em": time.strftime("%Y-%m-%dT%H:%M:%S")}


# A pagina de releases da fazer.ai custa alguns segundos para desempacotar e muda poucas
# vezes por semana. Cache em memoria (nunca em arquivo, ADR-0017): morre com o server.
_CHATWOOT_CACHE = {"em": 0.0, "resposta": None}
CHATWOOT_CACHE_S = 600
CHATWOOT_ATRASO_ALERTA = 3


def _releases_modulo():
    """Importa o fetch-chatwoot-releases.py pelo caminho (o nome tem hifen, entao nao da import)."""
    import importlib.util
    spec = importlib.util.spec_from_file_location("fetch_chatwoot_releases", RELEASES_SCRIPT)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def ler_chatwoot():
    """Diz quantas versoes o Chatwoot da Ana esta atras do que a fazer.ai publicou (ADR-0024).

    Os dois numeros sao vivos: a versao instalada vem de GET {CHATWOOT_URL}/api e a ultima
    publicada vem da pagina https://fazer.ai/chatwoot-release-notes. Nenhum dos dois e escrito
    em arquivo. Sem fonte, devolve o erro: a pagina prefere dizer que nao sabe.
    """
    agora = time.time()
    if _CHATWOOT_CACHE["resposta"] and agora - _CHATWOOT_CACHE["em"] < CHATWOOT_CACHE_S:
        return _CHATWOOT_CACHE["resposta"]
    try:
        rel = _releases_modulo()
        pro = rel.ordenar([r for r in rel.ler_releases() if r.get("edition") == rel.EDICAO])
        tags = [rel.normalizar(r["tagName"]) for r in pro]
        instalada = rel.versao_instalada()
        alvo = rel.normalizar(instalada)
        conhecida = alvo in tags
        atras = tags[tags.index(alvo) + 1:] if conhecida else []
        resposta = {
            "ok": True,
            "instalada": instalada,
            "instalada_conhecida": conhecida,
            "ultima": pro[-1]["tagName"],
            "ultima_em": pro[-1]["publishedAt"][:10],
            "atraso": len(atras),
            "alerta": len(atras) >= CHATWOOT_ATRASO_ALERTA,
            "atrasadas": [
                {"tag": r["tagName"], "em": r["publishedAt"][:10], "url": r.get("htmlUrl", "")}
                for r in pro if rel.normalizar(r["tagName"]) in atras
            ],
            "lido_em": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }
    except (OSError, ValueError, urllib.error.URLError, ImportError, AttributeError) as e:
        resposta = {"ok": False, "erro": "nao consegui ler as versoes do Chatwoot: %s" % e}
    _CHATWOOT_CACHE.update({"em": agora, "resposta": resposta})
    return resposta


_oracle_iniciado = False


def conectar_oracle():
    """Abre conexao com o Oracle TST (mesma config e .env do scripts/query-mv.py)."""
    global _oracle_iniciado
    faltando = [k for k in ("ORACLE_HOST", "ORACLE_USER", "ORACLE_PASSWORD") if not ENV.get(k)]
    if faltando or not (ENV.get("ORACLE_SERVICE") or ENV.get("ORACLE_SID")):
        raise RuntimeError("preencha no .env: " + ", ".join(faltando + ["ORACLE_SERVICE ou ORACLE_SID"]))
    try:
        import oracledb
    except ImportError:
        raise RuntimeError("driver ausente: python3 -m pip install --user oracledb")
    if not _oracle_iniciado:
        # senha do dbamv usa verifier 10g (DPY-3015): modo thick com o Instant Client do .env
        if ENV.get("ORACLE_CLIENT_DIR"):
            oracledb.init_oracle_client(lib_dir=ENV["ORACLE_CLIENT_DIR"])
        _oracle_iniciado = True
    host = ENV["ORACLE_HOST"]
    port = int(ENV.get("ORACLE_PORT", "1521"))
    if ENV.get("ORACLE_SERVICE"):
        # timeout curto de conexao: sem rede/VPN o erro volta em ~5s, nao nos 20s default
        dsn = "%s:%d/%s?transport_connect_timeout=5" % (host, port, ENV["ORACLE_SERVICE"])
    else:
        dsn = oracledb.makedsn(host, port, sid=ENV["ORACLE_SID"])
    return oracledb.connect(user=ENV["ORACLE_USER"], password=ENV["ORACLE_PASSWORD"], dsn=dsn)


def rodar_sql(sql):
    """Executa um SELECT/WITH no Oracle TST e devolve {ok, colunas, linhas, truncado, latencia_ms}.

    Qualquer outra coisa (escrita, DDL) e recusada: a politica e a mesma do query-mv.py.
    """
    sql = (sql or "").strip().rstrip(";")
    primeiro = ""
    for linha in sql.splitlines():
        linha = linha.strip()
        if linha and not linha.startswith("--"):
            primeiro = linha.split()[0].upper()
            break
    if primeiro not in ("SELECT", "WITH"):
        return {"ok": False, "erro": "apenas SELECT/WITH: escrita no banco e sempre deliberada, nunca pelo Ana OS"}
    inicio = time.monotonic()
    try:
        with conectar_oracle() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                colunas = [d[0] for d in cur.description]
                linhas = cur.fetchmany(SQL_MAX_LINHAS + 1)
    except Exception as e:
        msg = str(e).splitlines()[0] if str(e) else repr(e)
        return {"ok": False, "erro": msg, "latencia_ms": int((time.monotonic() - inicio) * 1000)}
    latencia = int((time.monotonic() - inicio) * 1000)
    truncado = len(linhas) > SQL_MAX_LINHAS
    linhas = linhas[:SQL_MAX_LINHAS]

    def celula(v):
        if v is None or isinstance(v, (int, float, str)):
            return v
        return str(v)

    return {"ok": True, "colunas": colunas,
            "linhas": [[celula(v) for v in linha] for linha in linhas],
            "truncado": truncado, "latencia_ms": latencia}


def teste_oracle():
    r = rodar_sql("SELECT 1 FROM DUAL")
    return {"oracle_ok": r["ok"],
            "oracle_msg": None if r["ok"] else r.get("erro"),
            "oracle_latencia_ms": r.get("latencia_ms")}


def listar_absorcao():
    """Lista os arquivos depositados na RAIZ de ABSORCAO_DIR (subpastas nunca aparecem)."""
    arquivos = []
    if os.path.isdir(ABSORCAO_DIR):
        for nome in sorted(os.listdir(ABSORCAO_DIR)):
            if nome.startswith("."):
                continue
            if os.path.splitext(nome)[1].lower() not in ABSORCAO_EXTENSOES:
                continue
            caminho = os.path.join(ABSORCAO_DIR, nome)
            if not os.path.isfile(caminho):
                continue
            info = os.stat(caminho)
            arquivos.append({"nome": nome, "bytes": info.st_size,
                             "modificado_epoch": int(info.st_mtime)})
    return {"ok": True, "arquivos": arquivos}


def teste_token():
    """Testa o token com GET /pessoas?cpf=<sonda>. Retorna o dict de status da API local."""
    r = call_gh("GET", "/pessoas", {"cpf": CPF_SONDA})
    return {
        "backend": True,
        "gh_alcancavel": r["status"] != 0,
        "token_valido": r["status"] == 200,
        "latencia_ms": r["latencia_ms"],
    }


# ---------- Biblioteca (allowlist de .md do repo) ----------

def _nome_md_valido(nome):
    return ("/" not in nome and "\\" not in nome and ".." not in nome
            and not nome.startswith(".") and nome.lower().endswith(".md"))


def listar_docs():
    """Catalogo da Biblioteca: raiz (arquivos explicitos) + grupos (dir, sem recursao)."""
    grupos = []
    raiz = []
    for nome in DOCS_RAIZ["arquivos"]:
        caminho = os.path.join(REPO_DIR, nome)
        if os.path.isfile(caminho):
            raiz.append({"grupo": "raiz", "nome": nome, "bytes": os.path.getsize(caminho),
                         "modificado_epoch": int(os.stat(caminho).st_mtime)})
    grupos.append({"id": "raiz", "titulo": DOCS_RAIZ["titulo"], "arquivos": raiz})
    for gid, g in DOCS_GRUPOS.items():
        arquivos = []
        if os.path.isdir(g["dir"]):
            for nome in sorted(os.listdir(g["dir"])):
                if not _nome_md_valido(nome):
                    continue
                caminho = os.path.join(g["dir"], nome)
                if not os.path.isfile(caminho):
                    continue
                arquivos.append({"grupo": gid, "nome": nome, "bytes": os.path.getsize(caminho),
                                 "modificado_epoch": int(os.stat(caminho).st_mtime)})
        grupos.append({"id": gid, "titulo": g["titulo"], "arquivos": arquivos})
    return {"ok": True, "grupos": grupos}


def caminho_doc(grupo, nome):
    """Resolve um doc da allowlist ou devolve None. Sanitizacao em camadas."""
    nome = urllib.parse.unquote(nome)
    if not _nome_md_valido(nome):
        return None
    if grupo == "raiz":
        if nome not in DOCS_RAIZ["arquivos"]:
            return None
        base = REPO_DIR
    elif grupo in DOCS_GRUPOS:
        base = DOCS_GRUPOS[grupo]["dir"]
    else:
        return None
    caminho = os.path.join(base, nome)
    raiz_real = os.path.realpath(base)
    if not os.path.realpath(caminho).startswith(raiz_real + os.sep) or not os.path.isfile(caminho):
        return None
    return caminho


# ---------- Roadmap (so leitura, ADR-0028) ----------

def ler_roadmap():
    with open(ROADMAP_JSON, encoding="utf-8") as f:
        return json.load(f)


class Handler(BaseHTTPRequestHandler):
    def _json(self, obj, status=200):
        corpo = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def _arquivo(self, caminho, content_type):
        with open(caminho, "rb") as f:
            corpo = f.read()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def _servir_absorcao(self, nome):
        """Serve UM arquivo da raiz de ABSORCAO_DIR. Sanitizacao em camadas, todas obrigatorias."""
        nome = urllib.parse.unquote(nome)
        if "/" in nome or "\\" in nome or ".." in nome or nome.startswith("."):
            self._json({"erro": "arquivo desconhecido"}, 404)
            return
        ext = os.path.splitext(nome)[1].lower()
        if ext not in ABSORCAO_EXTENSOES:
            self._json({"erro": "arquivo desconhecido"}, 404)
            return
        caminho = os.path.join(ABSORCAO_DIR, nome)
        raiz = os.path.realpath(ABSORCAO_DIR)
        if not os.path.realpath(caminho).startswith(raiz + os.sep) or not os.path.isfile(caminho):
            self._json({"erro": "arquivo desconhecido"}, 404)
            return
        tipo = "text/csv; charset=utf-8" if ext == ".csv" else "text/markdown; charset=utf-8"
        self._arquivo(caminho, tipo)

    def _servir_doc(self, resto):
        """Serve UM .md da Biblioteca: /docs/<grupo>/<nome>."""
        partes = resto.split("/")
        if len(partes) != 2:
            self._json({"erro": "doc desconhecido"}, 404)
            return
        caminho = caminho_doc(partes[0], partes[1])
        if not caminho:
            self._json({"erro": "doc desconhecido"}, 404)
            return
        self._arquivo(caminho, "text/markdown; charset=utf-8")

    def _servir_estatico(self, path):
        """Serve paginas da raiz de os/ e assets/dados (1 nivel, extensoes da allowlist)."""
        if path == "/":
            path = "/index.html"
        rel = path.lstrip("/")
        partes = rel.split("/")
        if len(partes) == 1:
            permitido = os.path.splitext(rel)[1].lower() == ".html"
        elif len(partes) == 2 and partes[0] == "arquivo":
            # paginas arquivadas (ADR-0019): fora do menu, mas abrem por URL direta
            permitido = os.path.splitext(rel)[1].lower() == ".html"
        elif len(partes) == 2 and partes[0] in ("assets", "dados"):
            permitido = os.path.splitext(rel)[1].lower() in ESTATICOS
        elif len(partes) == 3 and partes[0] == "assets" and partes[1] == "fonts":
            permitido = os.path.splitext(rel)[1].lower() in (".woff2", ".css")
        else:
            permitido = False
        if not permitido or ".." in rel or rel.startswith("."):
            self._json({"erro": "rota desconhecida"}, 404)
            return
        caminho = os.path.join(OS_DIR, *partes)
        raiz = os.path.realpath(OS_DIR)
        if not os.path.realpath(caminho).startswith(raiz + os.sep) or not os.path.isfile(caminho):
            self._json({"erro": "rota desconhecida"}, 404)
            return
        self._arquivo(caminho, ESTATICOS[os.path.splitext(rel)[1].lower()])

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/status":
            st = teste_token()
            st.update(teste_oracle())
            self._json(st)
        elif path == "/api/absorcao":
            self._json(listar_absorcao())
        elif path == "/api/docs":
            self._json(listar_docs())
        elif path == "/api/tools":
            self._json(ler_tools())
        elif path == "/api/chatwoot":
            self._json(ler_chatwoot())
        elif path == "/api/cenarios":
            try:
                with open(CENARIOS_JSON, encoding="utf-8") as f:
                    self._json({"ok": True, "cenarios": json.load(f)})
            except (OSError, ValueError) as e:
                self._json({"ok": False, "erro": str(e)}, 500)
        elif path == "/api/roadmap":
            try:
                self._json({"ok": True, "roadmap": ler_roadmap()})
            except (OSError, ValueError) as e:
                self._json({"ok": False, "erro": str(e)}, 500)
        elif path.startswith("/absorcao/"):
            self._servir_absorcao(path[len("/absorcao/"):])
        elif path.startswith("/docs/"):
            self._servir_doc(path[len("/docs/"):])
        else:
            self._servir_estatico(path)

    def do_POST(self):
        if self.path not in ("/api/gh", "/api/sql"):
            self._json({"erro": "rota desconhecida"}, 404)
            return
        try:
            tamanho = int(self.headers.get("Content-Length", 0))
            pedido = json.loads(self.rfile.read(tamanho).decode("utf-8"))
        except (ValueError, TypeError):
            self._json({"erro": "body invalido: esperava JSON"}, 400)
            return
        if self.path == "/api/sql":
            self._json(rodar_sql(str(pedido.get("sql", ""))))
            return
        metodo = str(pedido.get("method", "")).upper()
        path = str(pedido.get("path", ""))
        if metodo not in METODOS_PERMITIDOS:
            self._json({"erro": "method deve ser GET, POST ou DELETE"}, 400)
            return
        if not path.startswith("/") or path.startswith("//") or "://" in path:
            self._json({"erro": "path deve ser relativo a base de homologacao (comecar com /)"}, 400)
            return
        resultado = call_gh(metodo, path, pedido.get("query") or {}, pedido.get("body"))
        self._json(resultado)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.log_date_time_string(), fmt % args))


def main():
    print("Ana OS em http://localhost:%d" % PORTA, flush=True)
    print("Testando o token na homologacao da GH...", flush=True)
    st = teste_token()
    if not st["gh_alcancavel"]:
        print("  API GH: FORA DE ALCANCE (rede/DNS/timeout). O servidor sobe mesmo assim.", flush=True)
    elif st["token_valido"]:
        print("  API GH: alcancavel. Token: VALIDO (HTTP 200 em %dms)." % st["latencia_ms"], flush=True)
    else:
        print("  API GH: alcancavel, mas o token NAO validou (nao veio HTTP 200).", flush=True)
    print("Testando a conexao com o Oracle TST...", flush=True)
    ora = teste_oracle()
    if ora["oracle_ok"]:
        print("  Oracle TST: conectado (%dms). Prova no banco ativa." % ora["oracle_latencia_ms"], flush=True)
    else:
        print("  Oracle TST: SEM conexao (%s). As queries do painel 'No banco' ficam so para copiar." % ora["oracle_msg"], flush=True)
    servidor = ThreadingHTTPServer(("127.0.0.1", PORTA), Handler)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrado.")


if __name__ == "__main__":
    main()
