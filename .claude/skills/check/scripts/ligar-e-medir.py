#!/usr/bin/env python3
"""Passo 0 do /check: liga o Ana OS (8777) e o Retrato (8778) se estiverem fora do ar,
e mede o estagio pelas Issues do GitHub (ADR-0031): issues fechadas sobre o total,
sem contar as de label `needs-triage` (o antigo radar). Le o GitHub pelo mesmo modulo que o Ana OS usa
(os/roadmap_github.py), para o /check e o cockpit nunca divergirem.

Uso: python3 .claude/skills/check/scripts/ligar-e-medir.py [--so-medir]
So le; nunca escreve nada.
"""
import os
import socket
import subprocess
import sys
import time

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
LOGS = "/tmp/ana-os-logs"
SERVICOS = [
    ("Ana OS", 8777, ["python3", "os/server.py"]),
    ("Retrato", 8778, ["python3", "-m", "http.server", "-d", "retrato", "8778", "--bind", "127.0.0.1"]),
]
# Chaves que o roadmap_github devolve: ready-for-human vira "dispare", ready-for-agent
# (e in-progress) vira "comigo". O antigo "aguardando" mora junto do ready-for-human.
CANAIS = [("dispare", "So o Pedro (ready-for-human): dispare hoje ou cobre de terceiros"),
          ("comigo", "Uma sessao resolve (ready-for-agent)")]

sys.path.insert(0, os.path.join(RAIZ, "os"))
import roadmap_github  # noqa: E402


def aberta(porta):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", porta)) == 0


def ligar():
    os.makedirs(LOGS, exist_ok=True)
    for nome, porta, cmd in SERVICOS:
        if aberta(porta):
            print(f"{nome}: ja estava no ar  http://localhost:{porta}")
            continue
        log = open(os.path.join(LOGS, f"{porta}.log"), "ab")
        subprocess.Popen(cmd, cwd=RAIZ, stdout=log, stderr=log, start_new_session=True)
        for _ in range(20):
            time.sleep(0.25)
            if aberta(porta):
                break
        estado = "ligado agora" if aberta(porta) else f"NAO SUBIU (veja {LOGS}/{porta}.log)"
        print(f"{nome}: {estado}  http://localhost:{porta}")


def dias(data):
    if not data:
        return None
    return max(0, int((time.time() - time.mktime(time.strptime(data, "%Y-%m-%d"))) // 86400))


def medir():
    try:
        d = roadmap_github.montar(fresco=True)
    except Exception as e:  # sem rede ou sem gh autenticado: o check segue e relata
        print(f"\nNAO CONSEGUI LER O GITHUB ({e}). Confira `gh auth status` e a rede.")
        return
    tarefas = d["tarefas"]
    feitas = [t for t in tarefas if t["status"] == "feito"]
    abertas = [t for t in tarefas if t["status"] != "feito"]
    total = len(tarefas)
    pct = round(100 * len(feitas) / total) if total else 0
    feitos_ids = {t["id"] for t in feitas}

    print()
    print(f"Termometro do estagio \"{d['estagio']}\" (Issues de {d['repo']}, lidas agora):")
    print(f"  {len(feitas)} de {total} issues fechadas = {pct}%  |  faltam {len(abertas)}")
    if feitas:
        print("  feitas: " + ", ".join(f"#{t['id']} {t['titulo']}" for t in feitas))
    print()
    print("O que falta, por canal:")
    for chave, rotulo in CANAIS:
        itens = [t for t in abertas if t.get("canal") == chave]
        if not itens:
            continue
        print(f"  {rotulo}:")
        for t in itens:
            trava = [dep for dep in t.get("deps", []) if dep not in feitos_ids]
            sufixo = f"  [bloqueada: espera #{', #'.join(trava)}]" if trava else ""
            idade = dias(t.get("canal_desde"))
            idade_txt = f"  (neste canal ha {idade} dia{'s' if idade != 1 else ''})" if idade is not None and chave == "dispare" else ""
            areas = ", ".join(t.get("areas") or []) or "sem area"
            print(f"    - [#{t['id']}{' ' + t['antes'] if t.get('antes') else ''}] {t['titulo']}{sufixo}{idade_txt}  [{areas}]")
            gesto = (t.get("mesa") or {}).get("gesto", "")
            if gesto:
                print(f"        gesto: {gesto}")
            faltas = [f for f, ok in (("gesto", gesto), ("prompt", t.get("prompt"))) if not ok]
            if faltas:
                print(f"        DEFEITO: sem {' e sem '.join(faltas)} no corpo da issue")
    sem_canal = [t for t in abertas if t.get("canal") not in dict(CANAIS)]
    if sem_canal:
        print("  SEM PAPEL DE TRIAGE (defeito: falta ready-for-human, ready-for-agent ou needs-triage): "
              + ", ".join("#" + t["id"] for t in sem_canal))
    radar = [r for r in d.get("radar", []) if r["status"] != "feito"]
    print()
    print(f"Fora do termometro: {len(radar)} item(ns) no radar (needs-triage)"
          + (": " + ", ".join(f"#{r['id']} (prio {r.get('prioridade')}/10)" for r in radar) if radar else "") + ".")
    print(f"Cockpit: http://localhost:8777/index.html#cockpit  |  Issues: https://github.com/{d['repo']}/issues")


if __name__ == "__main__":
    if "--so-medir" not in sys.argv:
        ligar()
    medir()
