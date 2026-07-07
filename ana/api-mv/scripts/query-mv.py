#!/usr/bin/env python3
"""Consulta read-only ao Oracle do MV (homologacao) a partir do terminal ou da sessao Claude.

Uso:
  python3 ana/api-mv/scripts/query-mv.py "SELECT owner, table_name FROM all_tables WHERE ROWNUM <= 5"
  python3 ana/api-mv/scripts/query-mv.py -f query.sql
  python3 ana/api-mv/scripts/query-mv.py "SELECT ..." --csv saida.csv --max-rows 500

Credenciais: lidas do .env na raiz do repo (fora do git). Variaveis esperadas:
  ORACLE_HOST, ORACLE_PORT (default 1521), ORACLE_SERVICE (ou ORACLE_SID),
  ORACLE_USER, ORACLE_PASSWORD
Driver: python-oracledb em modo thin (sem Oracle Client):
  python3 -m pip install --user oracledb
Politica: SELECT/WITH apenas; producao e manual no DBeaver (ver conexao-oracle.md).
"""
import argparse
import csv
import sys
from pathlib import Path


def find_env():
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / ".env"
        if candidate.is_file():
            return candidate
    sys.exit("ERRO: .env nao encontrado subindo a partir de " + str(here))


def load_env(path):
    env = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def main():
    ap = argparse.ArgumentParser(description="Consulta read-only ao Oracle do MV (homolog)")
    ap.add_argument("sql", nargs="?", help="query SQL entre aspas")
    ap.add_argument("-f", "--file", help="arquivo .sql com a query")
    ap.add_argument("--csv", help="salvar resultado completo neste CSV")
    ap.add_argument("--max-rows", type=int, default=200, help="limite de linhas exibidas/exportadas (default 200)")
    args = ap.parse_args()

    if not args.sql and not args.file:
        ap.error("passe a query entre aspas ou use -f arquivo.sql")
    sql = Path(args.file).read_text() if args.file else args.sql
    sql = sql.strip().rstrip(";")

    # guarda-corpo: somente leitura
    primeiro_token = ""
    for linha in sql.splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("--"):
            continue
        primeiro_token = linha.split()[0].upper()
        break
    if primeiro_token not in ("SELECT", "WITH"):
        sys.exit(f"ERRO: apenas SELECT/WITH sao permitidos (query comeca com '{primeiro_token}'). Escrita no banco e deliberada, nao por script.")

    env = load_env(find_env())
    faltando = [k for k in ("ORACLE_HOST", "ORACLE_USER", "ORACLE_PASSWORD") if not env.get(k)]
    if faltando or not (env.get("ORACLE_SERVICE") or env.get("ORACLE_SID")):
        sys.exit("ERRO: preencha no .env: " + ", ".join(faltando + ["ORACLE_SERVICE ou ORACLE_SID"]) + " (ver ana/api-mv/conexao-oracle.md)")

    try:
        import oracledb
    except ImportError:
        sys.exit("ERRO: driver ausente. Instale com: python3 -m pip install --user oracledb")

    host = env["ORACLE_HOST"]
    port = int(env.get("ORACLE_PORT", "1521"))
    if env.get("ORACLE_SERVICE"):
        dsn = f"{host}:{port}/{env['ORACLE_SERVICE']}"
    else:
        dsn = oracledb.makedsn(host, port, sid=env["ORACLE_SID"])

    with oracledb.connect(user=env["ORACLE_USER"], password=env["ORACLE_PASSWORD"], dsn=dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            colunas = [d[0] for d in cur.description]
            linhas = cur.fetchmany(args.max_rows + 1)

    truncado = len(linhas) > args.max_rows
    linhas = linhas[: args.max_rows]

    def texto(v):
        if v is None:
            return ""
        return str(v)

    if args.csv:
        with open(args.csv, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f, delimiter=";")
            w.writerow(colunas)
            w.writerows([[texto(v) for v in linha] for linha in linhas])
        print(f"{len(linhas)} linha(s) salvas em {args.csv}" + (" (TRUNCADO no --max-rows)" if truncado else ""))
        return

    # tabela alinhada no terminal (celulas longas cortadas em 60 chars)
    dados = [[texto(v)[:60] for v in linha] for linha in linhas]
    larguras = [max(len(c), *(len(l[i]) for l in dados)) if dados else len(c) for i, c in enumerate(colunas)]
    print(" | ".join(c.ljust(larguras[i]) for i, c in enumerate(colunas)))
    print("-+-".join("-" * w for w in larguras))
    for l in dados:
        print(" | ".join(l[i].ljust(larguras[i]) for i in range(len(colunas))))
    print(f"\n{len(dados)} linha(s)" + (" (TRUNCADO: use --max-rows maior ou --csv)" if truncado else ""))


if __name__ == "__main__":
    main()
