#!/usr/bin/env python3
"""Playground da API Global Health (homologacao): backend local minimo.

Serve as paginas do portal (arquivos .html deste diretorio), os resultados
depositados da absorcao da producao (rotas /api/absorcao e /absorcao/, somente
leitura, nunca a subpasta amostras/) e faz proxy das chamadas para a API GH
injetando o token, que nunca chega ao navegador. So biblioteca padrao do Python, exceto o driver
oracledb (opcional): com ele, /api/sql executa as queries de verificacao do
painel "No banco" direto no Oracle TST, somente SELECT/WITH (mesma config e
mesma politica do scripts/query-mv.py).

Uso:
  python3 ana/api-mv/playground/server.py
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
PLAYGROUND_DIR = os.path.dirname(os.path.abspath(__file__))
ABSORCAO_DIR = os.path.abspath(os.path.join(PLAYGROUND_DIR, "..", "absorcao-producao", "resultados"))
PAGINAS_EXTENSOES = {".html"}
ABSORCAO_EXTENSOES = {".csv", ".md"}


def find_env():
    for parent in Path(__file__).resolve().parents:
        candidate = parent / ".env"
        if candidate.is_file():
            return candidate
    sys.exit("ERRO: .env nao encontrado subindo a partir de " + str(Path(__file__).resolve()))


def load_env(path):
    env = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


ENV = load_env(find_env())
TOKEN = ENV.get("GH_TOKEN_HOMOLOG")
if not TOKEN:
    sys.exit("ERRO: GH_TOKEN_HOMOLOG nao encontrado no .env da raiz do repo. "
             "Adicione a variavel (token de homologacao da Global Health) e rode de novo.")


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
        return {"ok": False, "erro": "apenas SELECT/WITH: escrita no banco e sempre deliberada, nunca pelo playground"}
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

    def _servir_pagina(self, path):
        """Serve uma pagina .html da raiz do playground (nenhum subdiretorio)."""
        if path == "/":
            path = "/index.html"
        nome = path.lstrip("/")
        if os.path.basename(path) != nome or os.path.splitext(nome)[1].lower() not in PAGINAS_EXTENSOES:
            self._json({"erro": "rota desconhecida"}, 404)
            return
        caminho = os.path.join(PLAYGROUND_DIR, nome)
        raiz = os.path.realpath(PLAYGROUND_DIR)
        if not os.path.realpath(caminho).startswith(raiz + os.sep) or not os.path.isfile(caminho):
            self._json({"erro": "rota desconhecida"}, 404)
            return
        self._arquivo(caminho, "text/html; charset=utf-8")

    def do_GET(self):
        if self.path == "/api/status":
            st = teste_token()
            st.update(teste_oracle())
            self._json(st)
        elif self.path == "/api/absorcao":
            self._json(listar_absorcao())
        elif self.path.startswith("/absorcao/"):
            self._servir_absorcao(self.path[len("/absorcao/"):])
        else:
            self._servir_pagina(self.path)

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
    print("Playground em http://localhost:%d" % PORTA, flush=True)
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
