#!/usr/bin/env python3
"""
Divergimetro: nivel 1.5 da bancada de cenarios.

ARQUIVADO em 12/out/2026 (ADR-0032): o NocoDB esta desligado desde a V26 e a
migracao acabou, entao nao ha mais o que comparar. Fica aqui como acervo.

Compara, tabela por tabela, o que a API do app do Hospital devolve contra o que o
NocoDB (a fonte velha) ainda devolve, e mostra onde as duas ja andaram separadas.

Por que existe: a tela /admin/dados-atendimento promete "editou, valeu: a resposta
seguinte ja usa o dado novo", mas hoje isso so e verdade na tabela cuja tool ja
aponta para a API. Nas outras, quem edita no app nao muda a fala da Ana, e ninguem
percebe. Este script mede esse buraco sem gastar tempo de ninguem.

Ele tambem e a prova de paridade que a V26 (desligar o NocoDB) precisa: no dia do
corte, divergimetro zerado significa que nada se perde no caminho.

Uso:
    python3 ana/bancada/arquivo/divergimetro.py

Credenciais: SEMPRE do .env da raiz do repo.
    AGENTS_API_TOKEN     le as definicoes das tools na plataforma (de onde saem as
                         URLs do NocoDB, que assim nunca ficam escritas no repo)
    a chave da API do Hospital vem do mesmo lugar que o smoke-hospital.py usa.
"""

import importlib.util
import json
import pathlib
import re
import sys
import urllib.error
import urllib.request

RAIZ = pathlib.Path(__file__).resolve().parents[3]
PLATAFORMA = "https://agents.hospitalsaomatheus.cloud"

# tool na plataforma -> (endpoint da API do app, chave de identidade, renomes NocoDB->API)
TABELAS = [
    ("consultar_precos_consultas", "/consultas-particulares", ("especialidade",), {}),
    ("consultar_exames", "/exames", ("nome_exame",), {}),
    ("consultar_cirurgias_estimativas", "/cirurgias-estimativas", ("procedimento",), {}),
    ("consultar_convenios_especialidade", "/convenios-especialidade",
     ("convenio", "especialidade"), {"cobre_sn": "cobre"}),
]

# campos que so existem de um lado e nao contam como divergencia
IGNORAR = {"id", "ativo", "ultima_atualizacao"}


# ------------------------------------------------------------------ credenciais

def ler_env():
    caminho = RAIZ / ".env"
    if not caminho.is_file():
        sys.exit(f"ERRO: .env nao encontrado em {caminho}")
    env = {}
    for linha in caminho.read_text().splitlines():
        linha = linha.strip()
        if linha and not linha.startswith("#") and "=" in linha:
            k, v = linha.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def carregar_smoke():
    """Reaproveita a chave e a base do smoke-hospital.py, para nao existir uma copia a mais."""
    caminho = RAIZ / "ana" / "api-hospital" / "scripts" / "smoke-hospital.py"
    spec = importlib.util.spec_from_file_location("smoke_hospital", caminho)
    modulo = importlib.util.module_from_spec(spec)
    argv, sys.argv = sys.argv, [str(caminho)]
    try:
        spec.loader.exec_module(modulo)
    finally:
        sys.argv = argv
    return modulo


def buscar(url, headers=None):
    req = urllib.request.Request(url, headers={"Accept": "application/json", **(headers or {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8", errors="replace"))


# ------------------------------------------------------------------ normalizacao

MOEDA = re.compile(r"^R\$\s*([\d.]*\d)(?:,(\d{1,2}))?$")
DATA_BR = re.compile(r"^(\d{2})/(\d{2})/(\d{4})$")


def normalizar(valor):
    """Poe os dois lados na mesma lingua: 'R$ 45,00' e 45.0 sao o mesmo numero."""
    if valor is None:
        return None
    if isinstance(valor, bool):
        return valor
    if isinstance(valor, (int, float)):
        return round(float(valor), 2)
    texto = str(valor).strip()
    if texto == "":
        return None
    if texto in ("S", "s", "Sim", "sim"):
        return True
    if texto in ("N", "n", "Nao", "nao", "Não", "não"):
        return False
    m = MOEDA.match(texto)
    if m:
        inteiro = m.group(1).replace(".", "")
        return round(float(f"{inteiro}.{m.group(2) or '0'}"), 2)
    m = DATA_BR.match(texto)
    if m:
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    return re.sub(r"\s+", " ", texto)


def so_pontuacao(a, b):
    """True quando a unica diferenca e o travessao virando virgula.

    A migracao para o app trocou os travessoes por virgula em texto livre. Nao e
    perda de conteudo, e alinha com a regra da casa de nao usar travessao. Separar
    isso de divergencia de verdade e o que faz o veredito valer alguma coisa.
    """
    if not isinstance(a, str) or not isinstance(b, str):
        return False
    achatar = lambda t: re.sub(r"\s*[,—–]\s*", ",", t)
    return achatar(a) == achatar(b)


def chavear(linhas, chave):
    saida = {}
    for l in linhas:
        k = tuple(str(normalizar(l.get(c)) or "").lower() for c in chave)
        saida[k] = l
    return saida


def em_minusculas(linha, renomes):
    saida = {}
    for k, v in linha.items():
        nome = k.lower()
        saida[renomes.get(nome, nome)] = v
    return saida


# --------------------------------------------------------------------- comparar

def comparar(nocodb, api, chave, renomes):
    esq = chavear([em_minusculas(l, renomes) for l in nocodb
                   if normalizar(l.get("Ativo")) is not False], chave)
    dir_ = chavear(api, chave)

    so_nocodb = sorted(" / ".join(k) for k in esq.keys() - dir_.keys())
    so_api = sorted(" / ".join(k) for k in dir_.keys() - esq.keys())

    divergencias = []
    for k in sorted(esq.keys() & dir_.keys()):
        a, b = esq[k], dir_[k]
        for campo in sorted(set(a) & set(b) - IGNORAR):
            va, vb = normalizar(a[campo]), normalizar(b[campo])
            if va != vb:
                tipo = "pontuacao" if so_pontuacao(va, vb) else "conteudo"
                divergencias.append((" / ".join(k), campo, va, vb, tipo))
    return so_nocodb, so_api, divergencias


def encurtar(v, n=48):
    s = "(vazio)" if v is None else str(v)
    return s if len(s) <= n else s[: n - 1] + "…"


# ------------------------------------------------------------------------- main

def main():
    env = ler_env()
    token = env.get("AGENTS_API_TOKEN")
    if not token:
        sys.exit("ERRO: AGENTS_API_TOKEN nao esta no .env (preciso dele para ler as tools).")
    smoke = carregar_smoke()

    tools = buscar(f"{PLATAFORMA}/api/v1/tools", {"Authorization": f"Bearer {token}"})
    itens = tools.get("items") or tools.get("tools") or tools
    por_nome = {t["name"]: t for t in itens}

    print("Divergimetro da bancada (nivel 1.5): API do app do Hospital x NocoDB\n")
    total_graves = 0
    total_pontuacao = 0
    ja_migradas = 0

    for nome_tool, endpoint, chave, renomes in TABELAS:
        tool = por_nome.get(nome_tool)
        if not tool:
            print(f"[  ?   ] {nome_tool}: a tool nao existe mais na plataforma")
            continue
        url = tool["urlTemplate"]

        if "api.hospitalsaomatheus.cloud" in url:
            ja_migradas += 1
            print(f"[MIGRADA] {endpoint.lstrip('/'):<24} a tool ja le a API do app: "
                  f"editar no admin muda a fala da Ana")
            continue

        try:
            alvo = url
            for k, v in (tool.get("query") or {}).items():
                alvo += ("&" if "?" in alvo else "?") + f"{k}={v}"
            bruto = buscar(alvo)
            linhas_nocodb = bruto.get("list") or bruto.get("rows") or bruto
        except (urllib.error.URLError, urllib.error.HTTPError, ValueError) as e:
            print(f"[ ERRO ] {endpoint.lstrip('/'):<24} nao consegui ler o NocoDB: {e}")
            continue

        try:
            resposta = buscar(smoke.BASE + endpoint, {"X-API-Key": smoke.KEY})
            linhas_api = list(resposta.values())[0] if isinstance(resposta, dict) else resposta
        except (urllib.error.URLError, urllib.error.HTTPError, ValueError) as e:
            print(f"[ ERRO ] {endpoint.lstrip('/'):<24} nao consegui ler a API do app: {e}")
            continue

        so_nocodb, so_api, divergencias = comparar(linhas_nocodb, linhas_api, chave, renomes)
        de_conteudo = [d for d in divergencias if d[4] == "conteudo"]
        de_pontuacao = len(divergencias) - len(de_conteudo)
        graves = len(so_nocodb) + len(so_api) + len(de_conteudo)
        total_graves += graves
        total_pontuacao += de_pontuacao

        marca = "  OK  " if graves == 0 else "DIVERGE"
        resumo = f"NocoDB {len(linhas_nocodb)} linhas x API {len(linhas_api)} linhas"
        if graves:
            resumo += f": {graves} diferenca(s) de conteudo"
        if de_pontuacao:
            resumo += f" ({de_pontuacao} so de pontuacao, travessao virou virgula)"
        print(f"[{marca}] {endpoint.lstrip('/'):<24} {resumo}")
        print("          A Ana ainda le o NocoDB aqui: editar no admin NAO muda a fala dela.")
        for k in so_nocodb:
            print(f"          - so no NocoDB: {k}")
        for k in so_api:
            print(f"          - so na API:    {k}")
        for k, campo, va, vb, _ in de_conteudo:
            print(f"          - {k} | {campo}: NocoDB {encurtar(va)} x API {encurtar(vb)}")

    print()
    if total_graves == 0:
        print(f"VEREDITO: nenhuma divergencia de conteudo ({ja_migradas} tabela(s) ja migrada(s),"
              f" {total_pontuacao} diferenca(s) so de pontuacao).")
        print("          E a paridade que a V26 pede para desligar o NocoDB.")
    else:
        print(f"VEREDITO: {total_graves} divergencia(s) DE CONTEUDO entre as duas fontes"
              f" (mais {total_pontuacao} so de pontuacao).")
        print("          Conteudo divergente com a tool ainda no NocoDB significa que a Ana")
        print("          fala o dado velho enquanto o app mostra o novo.")
    print()
    print("Lembrete: onde a tool ainda le o NocoDB, a tela /admin/dados-atendimento promete")
    print("          'editou, valeu' e nao cumpre. Isso se resolve na V23, nao aqui.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
