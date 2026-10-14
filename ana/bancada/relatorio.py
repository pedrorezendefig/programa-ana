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
    python3 ana/bancada/relatorio.py --json             # o mesmo dado, para a aba Testes do painel

Saida em Markdown, para colar no chat (ou JSON com --json). Nada e gravado.
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
PRECOS = AQUI / "precos.json"
CONVERSAS = AQUI / "conversas"

# As ferramentas da Global Health (ADR-0009, ADR-0025): cenario que chama uma delas, ou
# capacidade com estado "gh" no comparativo, depende da GH. Derivado, nunca escrito a mao
# por capacidade (issue #24).
TOOLS_GH = {"buscar_paciente_por_cpf", "buscar_paciente_por_telefone", "cadastrar_paciente",
            "consultar_especialidades_agenda", "consultar_horarios_livres",
            "consultar_prestadores_agenda", "consultar_convenios_agenda", "consultar_planos_convenio"}
TETO_MENSAGENS_ANA = 8  # grilling de 13/out/2026: a Meta cobra cada resposta da Ana

# De onde vem cada buraco de cobertura (pedido do Pedro, 13/out/2026): o leitor precisa
# saber se o buraco e nosso ou de terceiro. Derivado do estado da capacidade no
# comparativo, das ferramentas do no e dos cenarios manuais; nunca escrito a mao.
ORIGENS = [
    {"chave": "gh", "rotulo": "Global Health: homologacao vazia", "de_quem": "terceiros",
     "descricao": "A API responde e o codigo esta pronto, mas a base de homologacao nao tem "
                  "paciente, agenda nem catalogo. O cenario so prova o caminho sem a GH. "
                  "Depende da massa da GH (#4, #5)."},
    {"chave": "planejado", "rotulo": "ainda nao desenvolvido", "de_quem": "nos, atras da GH",
     "descricao": "Escrito no SOP ou no desenho, fora do prompt ou sem ferramenta. A escrita "
                  "(marcar, remarcar, cancelar) espera a GH aceitar a marcacao (#4)."},
    {"chave": "manual", "rotulo": "so com gente ou quebrando algo de proposito", "de_quem": "nos",
     "descricao": "Nao da para testar so conversando: precisa de duas pessoas, de derrubar uma "
                  "credencial, de olhar um painel ou de esperar o horario."},
    {"chave": "escrever", "rotulo": "falta escrever o cenario", "de_quem": "nos",
     "descricao": "A Ana ja faz; ninguem escreveu o cenario ainda."},
]

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
        # a copia herda a data da pasta conversas/ (copytree preserva): a hora real
        # da rodada e a do arquivo mais novo dentro dela
        recente = max((f.stat().st_mtime for f in pasta.glob("*.json")), default=pasta.stat().st_mtime)
        quando[nome] = max(quando.get(nome, 0), recente)
    return sorted(por_nome.items(), key=lambda kv: -quando[kv[0]])


def vereditos(pasta, cid):
    arquivo = pasta / f"{cid}.json"
    if not arquivo.is_file():
        return None
    try:
        return ler(arquivo).get("veredito")
    except (OSError, ValueError):
        return None


def custo_gravado(pasta, cid):
    """{modelo, mensagens_ana, openai_usd, meta_brl, chamadas} da conversa gravada numa
    rodada, ou None se a rodada nao mediu (bateria anterior ao #24)."""
    arquivo = pasta / f"{cid}.json"
    if not arquivo.is_file():
        return None
    try:
        doc = ler(arquivo)
    except (OSError, ValueError):
        return None
    c = doc.get("custo")
    if not c:
        return None
    return {**c, "chamadas": (doc.get("uso") or {}).get("chamadas")}


def precos_info():
    """{conferido_em, dias, vencido, meta_brl_por_mensagem, cambio} para o cabecalho."""
    try:
        d = ler(PRECOS)
    except (OSError, ValueError):
        return None
    try:
        from datetime import date
        dias = (date.today() - date.fromisoformat(d.get("conferido_em", ""))).days
    except ValueError:
        dias = None
    return {"conferido_em": d.get("conferido_em"), "dias": dias,
            "vencido": dias is None or dias > 60,
            "meta_brl_por_mensagem": (d.get("meta") or {}).get("service_brl_por_mensagem"),
            "cambio_brl_por_usd": d.get("cambio_brl_por_usd")}


def media(valores):
    v = [x for x in valores if x is not None]
    return round(sum(v) / len(v), 6) if v else None


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
    p.add_argument("--json", action="store_true", help="imprime o dado estruturado em vez do Markdown")
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

    def mudanca_de(cid):
        antes = rodadas_de(cid, anterior)
        agora = rodadas_de(cid, atual)
        antes_v = next((v for v in reversed(antes) if v is not None), None)
        agora_v = next((v for v in reversed(agora) if v is not None), None)
        if antes_v and agora_v:
            if antes_v == "passou" and agora_v != "passou":
                return "regrediu"
            if antes_v != "passou" and agora_v == "passou":
                return "melhorou"
        return None

    total_nos = len(sop["nos"]) or 1
    fatia = lambda nos: round(100 * len(nos) / total_nos, 1)

    def custo_de(cid):
        """O custo da ultima rodada que mediu, dentro da bateria atual."""
        if not atual:
            return None
        for n in sorted(atual[1], reverse=True):
            c = custo_gravado(atual[1][n], cid)
            if c:
                return c
        return None

    def normalizar_secao(x):
        return str(x or "").lower().replace(".", "-").strip()

    caps_comp = {cap["id"]: cap for b in comp["blocos"] for cap in b["capacidades"]}
    cap_da_secao = {}
    for cid, cap in caps_comp.items():
        for sid in cap.get("secao_ids") or []:
            cap_da_secao.setdefault(normalizar_secao(sid), cid)

    def manuais_de(cid):
        return [c for c in por_cap.get(cid, []) if c.get("manual") or not c.get("turnos")]

    def tem_executavel(cid):
        return any(c.get("turnos") and not c.get("manual") for c in por_cap.get(cid, []))

    def origem_da_capacidade(cid):
        """gh, planejado, manual ou escrever, para capacidade sem cenario executavel."""
        estado = caps_comp.get(cid, {}).get("estado")
        if estado == "gh":
            return "gh"
        if estado == "planejado":
            return "planejado"
        if manuais_de(cid):
            return "manual"
        return "escrever"

    def porque_da_capacidade(cid):
        cap = caps_comp.get(cid, {})
        if cap.get("falta"):
            return cap["falta"]
        passos = [c.get("passos") for c in manuais_de(cid) if c.get("passos")]
        return " ".join(passos) if passos else cap.get("faz", "")

    def origem_do_no(n):
        if set(n.get("tools") or []) & TOOLS_GH:
            return "gh"
        cid = cap_da_secao.get(normalizar_secao(n.get("secao")))
        if cid and not tem_executavel(cid):
            return origem_da_capacidade(cid)
        return "escrever"

    if args.json:
        blocos = []
        for bloco in comp["blocos"]:
            caps = []
            for cap in bloco["capacidades"]:
                lista = [c for c in por_cap.get(cap["id"], []) if passa_filtro(c)]
                itens = []
                for c in lista:
                    manual = bool(c.get("manual") or not c.get("turnos"))
                    rod = [] if manual else rodadas_de(c["id"], atual)
                    custo = None if manual else custo_de(c["id"])
                    itens.append({
                        "id": c["id"], "titulo": c.get("titulo", ""), "manual": manual,
                        "escrita": bool(c.get("grava_producao")),
                        "rodadas": rod, "classe": "manual" if manual else classe(rod),
                        "mudanca": None if manual else mudanca_de(c["id"]),
                        "tools": sorted(tools_de(c)), "nos": sorted(nos_de(c)),
                        "raias": sorted({raia_do_no.get(n) for n in nos_de(c) if raia_do_no.get(n)}),
                        "fatia_sop": fatia(nos_de(c)),
                        "depende_gh": bool(tools_de(c) & TOOLS_GH) or cap.get("estado") == "gh",
                        "custo": custo,
                        "alerta_mensagens": bool(custo and (custo.get("mensagens_ana") or 0) > TETO_MENSAGENS_ANA),
                    })
                nos_cap = {n for c in lista for n in nos_de(c)}
                exec_ = [i for i in itens if not i["manual"]]
                caps.append({"id": cap["id"], "titulo": cap["titulo"], "estado": cap.get("estado"),
                             "faz": cap.get("faz", ""), "falta": cap.get("falta", ""),
                             "tools_texto": cap.get("tools", ""),
                             "fatia_sop": fatia(nos_cap),
                             "depende_gh": cap.get("estado") == "gh" or any(i["depende_gh"] for i in itens),
                             "funciona": (None if not exec_ else all(i["classe"] == "passa" for i in exec_)),
                             "custo_medio": {
                                 "openai_usd": media(i["custo"]["openai_usd"] for i in exec_ if i["custo"]),
                                 "meta_brl": media(i["custo"]["meta_brl"] for i in exec_ if i["custo"]),
                                 "mensagens_ana": media(i["custo"]["mensagens_ana"] for i in exec_ if i["custo"]),
                             },
                             "cenarios": itens})
            nos_bloco = {n for cap in caps for c in por_cap.get(cap["id"], []) for n in nos_de(c)}
            com_cenario = [cap for cap in caps if any(not i["manual"] for i in cap["cenarios"])]
            blocos.append({"nome": bloco["nome"], "resumo": bloco.get("resumo", ""),
                           "fatia_sop": fatia(nos_bloco),
                           "capacidades_total": len(caps),
                           "funcionam": sum(1 for cap in com_cenario if cap["funciona"]),
                           "nao_funcionam": sum(1 for cap in com_cenario if cap["funciona"] is False),
                           "sem_cenario": len(caps) - len(com_cenario),
                           "dependem_gh": sum(1 for cap in caps if cap["depende_gh"]),
                           "custo_medio": {
                               "openai_usd": media(cap["custo_medio"]["openai_usd"] for cap in caps),
                               "meta_brl": media(cap["custo_medio"]["meta_brl"] for cap in caps),
                               "mensagens_ana": media(cap["custo_medio"]["mensagens_ana"] for cap in caps),
                           },
                           "capacidades": caps})
        ids_cap = [cap["id"] for b in comp["blocos"] for cap in b["capacidades"]]
        sem_exec = [cid for cid in ids_cap
                    if not any(c.get("turnos") and not c.get("manual") for c in por_cap.get(cid, []))]
        cobertos = set()
        for c in cenarios:
            if c.get("turnos") and not c.get("manual"):
                cobertos |= nos_de(c)
        nos_sem = defaultdict(list)
        for n in sop["nos"]:
            if n["id"] not in cobertos:
                nos_sem[n["raia"]].append({"id": n["id"], "titulo": titulo_no.get(n["id"], ""),
                                           "origem": origem_do_no(n)})
        caps_buraco = [{"id": cid, "titulo": caps_comp[cid].get("titulo", ""),
                        "estado": caps_comp[cid].get("estado"),
                        "origem": origem_da_capacidade(cid), "porque": porque_da_capacidade(cid),
                        "manuais": [{"id": c["id"], "titulo": c.get("titulo", ""), "passos": c.get("passos", "")}
                                    for c in manuais_de(cid)]}
                       for cid in sem_exec]
        # cenario executavel numa capacidade que espera a GH: passa, mas so pelo desvio
        # (a Ana avisa que a agenda nao respondeu e encaminha), porque a homologacao esta vazia
        desvio_gh = [{"id": c["id"], "capacidade": c.get("capacidade"), "titulo": c.get("titulo", ""),
                      "porque": caps_comp.get(c.get("capacidade"), {}).get("falta", "")}
                     for c in cenarios
                     if c.get("turnos") and not c.get("manual")
                     and caps_comp.get(c.get("capacidade"), {}).get("estado") == "gh"]
        por_origem = {o["chave"]: {"capacidades": sum(1 for cb in caps_buraco if cb["origem"] == o["chave"]),
                                   "nos": sum(1 for ns in nos_sem.values() for x in ns if x["origem"] == o["chave"])}
                      for o in ORIGENS}
        todos = [i for b in blocos for cap in b["capacidades"] for i in cap["cenarios"] if i["custo"]]
        saida = {
            "bateria": atual[0] if atual else None,
            "rodadas": sorted(atual[1]) if atual else [],
            "anterior": anterior[0] if anterior else None,
            "precos": precos_info(),
            "custo_medio": {
                "openai_usd": media(i["custo"]["openai_usd"] for i in todos),
                "meta_brl": media(i["custo"]["meta_brl"] for i in todos),
                "mensagens_ana": media(i["custo"]["mensagens_ana"] for i in todos),
                "medidos": len(todos),
            },
            "teto_mensagens_ana": TETO_MENSAGENS_ANA,
            "raias": [{"id": r["id"], "rotulo": r["rotulo"]} for r in sop["raias"]],
            "blocos": blocos,
            "buracos": {
                "capacidades_sem_cenario": sem_exec, "total_capacidades": len(ids_cap),
                "origens": ORIGENS, "por_origem": por_origem,
                "capacidades": caps_buraco, "desvio_gh": desvio_gh,
                "nos_sem_cenario": [{"raia": r, "rotulo": rotulo_raia.get(r, r), "nos": ns}
                                    for r, ns in nos_sem.items()],
                "total_nos": len(sop["nos"]),
            },
        }
        print(json.dumps(saida, ensure_ascii=False))
        return

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
                    mud = mudanca_de(c["id"]) or "-"
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
    linhas.append(f"Capacidades sem cenario executavel ({len(sem_exec)} de {len(ids_cap)}):")
    for cid in sem_exec:
        o = next(x for x in ORIGENS if x["chave"] == origem_da_capacidade(cid))
        linhas.append(f"- {cid} {caps_comp[cid].get('titulo', '')}: {o['rotulo']} ({o['de_quem']}). {porque_da_capacidade(cid)}")
    desvio = [c["id"] for c in cenarios if c.get("turnos") and not c.get("manual")
              and caps_comp.get(c.get("capacidade"), {}).get("estado") == "gh"]
    if desvio:
        linhas.append(f"Passam so pelo desvio (a GH responde vazio e a Ana encaminha): {', '.join(desvio)}")
    cobertos = set()
    for c in cenarios:
        if c.get("turnos") and not c.get("manual"):
            cobertos |= nos_de(c)
    por_raia = defaultdict(list)
    no_por_id = {n["id"]: n for n in sop["nos"]}
    for n in sop["nos"]:
        if n["id"] not in cobertos:
            por_raia[n["raia"]].append(n["id"])
    linhas.append(f"Nos do SOP sem cenario ({sum(len(v) for v in por_raia.values())} de {len(sop['nos'])}):")
    for raia, nos in por_raia.items():
        linhas.append(f"- {rotulo_raia.get(raia, raia)}: " + ", ".join(
            f"{n} ({titulo_no.get(n, '')}; {origem_do_no(no_por_id[n])})" for n in nos))
    contagem = Counter(n for c in cenarios if c.get("turnos") and not c.get("manual") for n in nos_de(c))
    mais = ", ".join(f"{n} x{k}" for n, k in contagem.most_common(5))
    linhas.append(f"Nos mais testados: {mais}")
    print("\n".join(linhas))


if __name__ == "__main__":
    main()
