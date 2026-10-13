#!/usr/bin/env python3
"""
Relatorio dos testes da Ana por capacidade (a abertura da skill /testes).

Junta tres fontes, so leitura:
  - os cenarios de ana/bancada/cenarios/capacidades.json (o que existe para rodar);
  - os blocos e capacidades de os/dados/comparacao.json (a ordem do Ana OS e do Retrato);
  - as rodadas copiadas em ana/bancada/resultados/conversas-<bateria>-rodada<n>/ (o que
    aconteceu nas ultimas 3 rodadas) e a bateria anterior, para marcar regressao;
  - os nos e raias de os/dados/sop-fluxo.json (os buracos de cobertura).

Uso:
    python3 ana/bancada/relatorio.py                    # a bateria mais recente, tudo
    python3 ana/bancada/relatorio.py --bateria v69      # uma bateria pelo nome
    python3 ana/bancada/relatorio.py --capacidade C05   # so uma capacidade
    python3 ana/bancada/relatorio.py --no E5            # cenarios que passam pelo no E5
    python3 ana/bancada/relatorio.py --tool consultar_precos_consultas
    python3 ana/bancada/relatorio.py --raia particular  # cenarios cujos nos tocam a raia
    python3 ana/bancada/relatorio.py --buracos          # so a parte dos buracos

Saida em Markdown, para colar no chat. Nada e gravado.
"""

import argparse
import json
import pathlib
import re
import sys
from collections import Counter, defaultdict

RAIZ = pathlib.Path(__file__).resolve().parents[2]
AQUI = pathlib.Path(__file__).resolve().parent
CENARIOS = AQUI / "cenarios" / "capacidades.json"
COMPARACAO = RAIZ / "os" / "dados" / "comparacao.json"
SOP = RAIZ / "os" / "dados" / "sop-fluxo.json"
RESULTADOS = AQUI / "resultados"

LETRA = {"passou": "ok", "falhou": "X", "erro": "!", None: "-"}


def ler(caminho):
    return json.loads(caminho.read_text())


def baterias_disponiveis():
    """{nome: {n: pasta}} das rodadas copiadas, ordenado da mais recente para a mais antiga."""
    por_nome = defaultdict(dict)
    quando = {}
    for pasta in RESULTADOS.glob("conversas-*-rodada*"):
        m = re.fullmatch(r"conversas-(.+)-rodada(\d+)", pasta.name)
        if not m or not pasta.is_dir():
            continue
        nome, n = m.group(1), int(m.group(2))
        por_nome[nome][n] = pasta
        quando[nome] = max(quando.get(nome, 0), pasta.stat().st_mtime)
    return sorted(por_nome.items(), key=lambda kv: -quando[kv[0]])


def vereditos(pasta, cid):
    arquivo = pasta / f"{cid}.json"
    if not arquivo.is_file():
        return None
    try:
        return ler(arquivo).get("veredito")
    except (OSError, ValueError):
        return None


def classe(rodadas):
    """constante (falhou em todas), intermitente (em algumas), passa (todas ok), sem dado."""
    vistos = [v for v in rodadas if v is not None]
    if not vistos:
        return "sem dado"
    if all(v == "passou" for v in vistos):
        return "passa"
    if all(v != "passou" for v in vistos):
        return "constante"
    return "intermitente"


def main():
    p = argparse.ArgumentParser(description="Relatorio dos testes da Ana por capacidade")
    p.add_argument("--bateria", help="nome da bateria (padrao: a mais recente em resultados/)")
    p.add_argument("--capacidade", help="so esta capacidade (ex.: C05)")
    p.add_argument("--no", dest="no", help="so cenarios que passam por este no do SOP (ex.: E5)")
    p.add_argument("--tool", help="so cenarios que esperam esta ferramenta")
    p.add_argument("--raia", help="so cenarios cujos nos tocam esta raia do SOP (ex.: particular)")
    p.add_argument("--buracos", action="store_true", help="so a secao dos buracos de cobertura")
    args = p.parse_args()

    dados = ler(CENARIOS)
    cenarios = dados["cenarios"] if isinstance(dados, dict) else dados
    comp = ler(COMPARACAO)
    sop = ler(SOP)
    raia_do_no = {n["id"]: n["raia"] for n in sop["nos"]}
    rotulo_raia = {r["id"]: r["rotulo"] for r in sop["raias"]}
    titulo_no = {n["id"]: n.get("titulo", "") for n in sop["nos"]}

    baterias = baterias_disponiveis()
    atual = anterior = None
    if args.bateria:
        atual = next(((n, r) for n, r in baterias if n == args.bateria), None)
        if atual is None:
            sys.exit(f"ERRO: nenhuma rodada copiada de '{args.bateria}' em {RESULTADOS.relative_to(RAIZ)}")
        resto = [b for b in baterias if b[0] != args.bateria]
    else:
        atual = baterias[0] if baterias else None
        resto = baterias[1:]
    if resto:
        anterior = resto[0]

    def rodadas_de(cid, bateria):
        if not bateria:
            return []
        return [vereditos(bateria[1][n], cid) for n in sorted(bateria[1])]

    def nos_de(c):
        return {n for t in c.get("turnos", []) for n in t.get("nos", [])}

    def tools_de(c):
        return {x for t in c.get("turnos", []) for x in t.get("tools", [])}

    def passa_filtro(c):
        if args.capacidade and c.get("capacidade") != args.capacidade.upper():
            return False
        if args.no and args.no.upper() not in nos_de(c):
            return False
        if args.tool and args.tool not in tools_de(c):
            return False
        if args.raia and args.raia not in {raia_do_no.get(n) for n in nos_de(c)}:
            return False
        return True

    por_cap = defaultdict(list)
    for c in cenarios:
        por_cap[c.get("capacidade")].append(c)

    linhas = []
    nome_bat = atual[0] if atual else None
    linhas.append(f"# Testes da Ana por capacidade{f' ({nome_bat}, {len(atual[1])} rodada(s))' if atual else ' (nenhuma rodada copiada)'}")
    if anterior:
        linhas.append(f"Bateria anterior para regressao: {anterior[0]} (ultima rodada).")
    linhas.append("")

    totais = Counter()
    if not args.buracos:
        for bloco in comp["blocos"]:
            cabec = False
            for cap in bloco["capacidades"]:
                lista = [c for c in por_cap.get(cap["id"], []) if passa_filtro(c)]
                if not lista:
                    continue
                if not cabec:
                    linhas.append(f"## {bloco['nome']}")
                    cabec = True
                linhas.append(f"### {cap['id']} {cap['titulo']}  ({cap.get('estado', '?')})")
                linhas.append("| cenario | titulo | rodadas | classe | mudanca | tools esperadas | nos |")
                linhas.append("|---|---|---|---|---|---|---|")
                for c in lista:
                    if c.get("manual") or not c.get("turnos"):
                        linhas.append(f"| {c['id']} | {c.get('titulo', '')} | manual | - | - | - | - |")
                        totais["manual"] += 1
                        continue
                    rod = rodadas_de(c["id"], atual)
                    cl = classe(rod)
                    totais[cl] += 1
                    antes = rodadas_de(c["id"], anterior)
                    antes_v = next((v for v in reversed(antes) if v is not None), None)
                    agora_v = next((v for v in reversed(rod) if v is not None), None)
                    mud = "-"
                    if antes_v and agora_v:
                        if antes_v == "passou" and agora_v != "passou":
                            mud = "regrediu"
                        elif antes_v != "passou" and agora_v == "passou":
                            mud = "melhorou"
                    escrita = " (so com --com-escrita)" if c.get("grava_producao") else ""
                    linhas.append(
                        f"| {c['id']} | {c.get('titulo', '')}{escrita} | {' '.join(LETRA[v] for v in rod) or '-'} | {cl} | {mud} "
                        f"| {', '.join(sorted(tools_de(c))) or '-'} | {len(nos_de(c))} |")
                linhas.append("")
        linhas.append(f"Totais: {totais['passa']} passam, {totais['intermitente']} intermitentes, "
                      f"{totais['constante']} constantes, {totais['sem dado']} sem dado, {totais['manual']} manuais.")
        linhas.append("")

    # buracos
    linhas.append("## Buracos de cobertura")
    ids_cap = [cap["id"] for b in comp["blocos"] for cap in b["capacidades"]]
    sem_exec = [cid for cid in ids_cap if not any(c.get("turnos") and not c.get("manual") for c in por_cap.get(cid, []))]
    linhas.append(f"Capacidades sem cenario executavel ({len(sem_exec)} de {len(ids_cap)}): {', '.join(sem_exec) or 'nenhuma'}")
    cobertos = set()
    for c in cenarios:
        if c.get("turnos") and not c.get("manual"):
            cobertos |= nos_de(c)
    por_raia = defaultdict(list)
    for n in sop["nos"]:
        if n["id"] not in cobertos:
            por_raia[n["raia"]].append(n["id"])
    linhas.append(f"Nos do SOP sem cenario ({sum(len(v) for v in por_raia.values())} de {len(sop['nos'])}):")
    for raia, nos in por_raia.items():
        linhas.append(f"- {rotulo_raia.get(raia, raia)}: " + ", ".join(f"{n} ({titulo_no.get(n, '')})" for n in nos))
    contagem = Counter(n for c in cenarios if c.get("turnos") and not c.get("manual") for n in nos_de(c))
    mais = ", ".join(f"{n} x{k}" for n, k in contagem.most_common(5))
    linhas.append(f"Nos mais testados: {mais}")
    print("\n".join(linhas))


if __name__ == "__main__":
    main()
