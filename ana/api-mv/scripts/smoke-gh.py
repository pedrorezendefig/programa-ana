#!/usr/bin/env python3
"""Smoke test rapido da API Global Health (HOMOLOGACAO): responde "esta funcionando?".

Uso:
  python3 ana/api-mv/scripts/smoke-gh.py                  # so leituras (seguro, rode quando quiser)
  python3 ana/api-mv/scripts/smoke-gh.py --criar-paciente # + prova de escrita (cria 1 paciente de teste)

Le GH_TOKEN_HOMOLOG do .env da raiz do repo. Nunca toca producao.
Resultado por linha: OK (funciona), VAZIO (funciona mas sem massa publicada), FALHOU (problema real).
"""
import json
import random
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://dem.agenda.globalhealth.mv/rest/whatsapp"
CPF_SONDA = "66301102770"  # paciente de teste criado via API em 07/jul/2026 (id 1681)


def find_env():
    for parent in Path(__file__).resolve().parents:
        if (parent / ".env").is_file():
            return parent / ".env"
    sys.exit("ERRO: .env nao encontrado (esperado na raiz do repo, com GH_TOKEN_HOMOLOG=...)")


def token():
    for line in find_env().read_text().splitlines():
        if line.strip().startswith("GH_TOKEN_HOMOLOG="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("ERRO: GH_TOKEN_HOMOLOG ausente do .env")


CTX = ssl.create_default_context()
TOKEN = token()


def call(method, path, params=None, body=None):
    url = BASE + path + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(
        url, method=method,
        headers={"Token": TOKEN, "Accept": "application/json", "Content-Type": "application/json"},
        data=json.dumps(body).encode() if body is not None else None,
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=30, context=CTX) as r:
            return r.status, r.read().decode("utf-8", "replace"), int((time.time() - t0) * 1000)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), int((time.time() - t0) * 1000)
    except Exception as e:
        return None, f"{type(e).__name__}: {e}", int((time.time() - t0) * 1000)


def cpf_sintetico():
    n = [random.randint(0, 9) for _ in range(9)]
    d1 = (sum(a * b for a, b in zip(n, range(10, 1, -1))) * 10) % 11 % 10
    d2 = (sum(a * b for a, b in zip(n + [d1], range(11, 1, -1))) * 10) % 11 % 10
    return "".join(map(str, n + [d1, d2]))


def main():
    escrita = "--criar-paciente" in sys.argv
    resultados = []

    def check(nome, ok, detalhe):
        resultados.append((nome, ok, detalhe))
        print(f"[{ok:^6}] {nome}: {detalhe}")

    print(f"Smoke test GH homolog ({BASE})\n")

    # 1. Autenticacao + leitura (a sonda deve existir no registro da GH)
    code, raw, ms = call("GET", "/pessoas", {"cpf": CPF_SONDA})
    if code == 200 and CPF_SONDA in (raw or ""):
        check("auth + leitura /pessoas", "OK", f"200 em {ms}ms, sonda encontrada")
    elif code == 200:
        check("auth + leitura /pessoas", "ALERTA", f"200 em {ms}ms mas corpo vazio: a sonda sumiu do registro da GH")
    elif code in (401, 403):
        check("auth + leitura /pessoas", "FALHOU", f"HTTP {code}: token invalido/expirado")
    else:
        check("auth + leitura /pessoas", "FALHOU", f"HTTP {code}: {raw[:120]}")

    # 2. Catalogo de consultas
    code, raw, ms = call("GET", "/consultas", {"pesquisa": "CARDIOLOGIA"})
    try:
        conteudo = json.loads(raw).get("conteudo", None)
    except Exception:
        conteudo = None
    if code == 200 and conteudo:
        check("catalogo /consultas", "OK", f"{len(conteudo)} item(ns) publicados")
    elif code == 200 and conteudo == []:
        check("catalogo /consultas", "VAZIO", "API responde, mas nada publicado para o canal (pedido GH-19)")
    else:
        check("catalogo /consultas", "FALHOU", f"HTTP {code}: {raw[:120]}")

    # 3. Catalogo de exames
    code, raw, ms = call("GET", "/exames", {"pesquisa": "ULTRA"})
    try:
        conteudo = json.loads(raw).get("conteudo", None)
    except Exception:
        conteudo = None
    if code == 200 and conteudo:
        check("catalogo /exames", "OK", f"{len(conteudo)} item(ns) publicados")
    elif code == 200 and conteudo == []:
        check("catalogo /exames", "VAZIO", "API responde, mas nada publicado para o canal (pedido GH-19)")
    else:
        check("catalogo /exames", "FALHOU", f"HTTP {code}: {raw[:120]}")

    # 4. Listagem de agendamentos (enum em caixa alta!)
    code, raw, ms = call("GET", "/agendamentos", {"cpf": CPF_SONDA, "tipoAgendamento": "CONSULTA"})
    if code == 200:
        check("listagem /agendamentos", "OK", f"200 em {ms}ms")
    else:
        check("listagem /agendamentos", "FALHOU", f"HTTP {code}: {raw[:120]}")

    # 5. (opcional) escrita: cria paciente de teste novo e rele
    if escrita:
        cpf = cpf_sintetico()
        code, raw, ms = call("POST", "/pessoas", body={
            "cpf": cpf, "nome": "TESTE SMOKE ANA VITTA", "dataNascimento": "1990-01-01",
            "telefone": "21999990000", "sexo": "M",
        })
        if code == 200:
            code2, raw2, _ = call("GET", "/pessoas", {"cpf": cpf})
            if code2 == 200 and cpf in (raw2 or ""):
                check("escrita POST /pessoas + releitura", "OK", f"criado e relido (cpf de teste {cpf})")
            else:
                check("escrita POST /pessoas + releitura", "FALHOU", f"criou mas nao releu (HTTP {code2})")
        else:
            check("escrita POST /pessoas + releitura", "FALHOU", f"HTTP {code}: {raw[:120]}")

    print()
    falhas = [r for r in resultados if r[1] == "FALHOU"]
    vazios = [r for r in resultados if r[1] in ("VAZIO", "ALERTA")]
    if falhas:
        print(f"VEREDITO: {len(falhas)} check(s) FALHARAM: a API tem problema real (ou o token venceu).")
        sys.exit(1)
    if vazios:
        print("VEREDITO: API FUNCIONAL, mas sem massa de homologacao publicada (cobrar GH-19). Nada quebrado do nosso lado.")
    else:
        print("VEREDITO: tudo OK, inclusive com massa publicada. Pronto para exercitar o fluxo de agendamento.")


if __name__ == "__main__":
    main()
