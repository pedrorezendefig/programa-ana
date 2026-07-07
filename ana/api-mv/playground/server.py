#!/usr/bin/env python3
"""Playground da API Global Health (homologacao): backend local minimo.

Serve o index.html e faz proxy das chamadas para a API GH injetando o token,
que nunca chega ao navegador. So biblioteca padrao do Python.

Uso:
  python3 ana/api-mv/playground/server.py
  Abrir http://localhost:8777

Token: variavel GH_TOKEN_HOMOLOG do .env na raiz do repo (fora do git).
Ambiente: SOMENTE homologacao. Producao e proibida neste app.
"""
import json
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
AQUI = Path(__file__).resolve().parent


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

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            html = (AQUI / "index.html").read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(html)))
            self.end_headers()
            self.wfile.write(html)
        elif self.path == "/api/status":
            self._json(teste_token())
        else:
            self._json({"erro": "rota desconhecida"}, 404)

    def do_POST(self):
        if self.path != "/api/gh":
            self._json({"erro": "rota desconhecida"}, 404)
            return
        try:
            tamanho = int(self.headers.get("Content-Length", 0))
            pedido = json.loads(self.rfile.read(tamanho).decode("utf-8"))
        except (ValueError, TypeError):
            self._json({"erro": "body invalido: esperava JSON"}, 400)
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
    servidor = ThreadingHTTPServer(("127.0.0.1", PORTA), Handler)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrado.")


if __name__ == "__main__":
    main()
