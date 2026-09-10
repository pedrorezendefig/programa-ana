#!/usr/bin/env python3
"""Passo 0 do /check: liga o Ana OS (8777) e o Retrato (8778) se estiverem fora do ar,
e mede o estagio pelo os/dados/roadmap.json (cards feitos sobre o total).

Uso: python3 .claude/skills/check/scripts/ligar-e-medir.py [--so-medir]
So le o roadmap.json; nunca escreve nada.
"""
import json
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
CANAIS = [("dispare", "Dispare hoje"), ("comigo", "Sente comigo"), ("aguardando", "Aguardando terceiros")]


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


def medir():
    with open(os.path.join(RAIZ, "os", "dados", "roadmap.json"), encoding="utf-8") as f:
        d = json.load(f)
    tarefas = d.get("tarefas", [])
    feitas = [t for t in tarefas if t.get("status") == "feito"]
    abertas = [t for t in tarefas if t.get("status") != "feito"]
    total = len(tarefas)
    pct = round(100 * len(feitas) / total) if total else 0
    feitos_ids = {t["id"] for t in feitas}

    print()
    print(f"Termometro do estagio \"{d.get('estagio', '?')}\" (roadmap.json de {d.get('atualizado', '?')}):")
    print(f"  {len(feitas)} de {total} cards feitos = {pct}%  |  faltam {len(abertas)}")
    if feitas:
        print("  feitos: " + ", ".join(f"{t['id']} {t['titulo']}" for t in feitas))
    print()
    print("O que falta, por canal:")
    for chave, rotulo in CANAIS:
        itens = [t for t in abertas if t.get("canal") == chave]
        if not itens:
            continue
        print(f"  {rotulo}:")
        for t in itens:
            trava = [dep for dep in t.get("deps", []) if dep not in feitos_ids]
            sufixo = f"  [bloqueada: espera {', '.join(trava)}]" if trava else ""
            gesto = (t.get("mesa") or {}).get("gesto", "")
            print(f"    - [{t['id']}] {t['titulo']}{sufixo}")
            if gesto:
                print(f"        gesto: {gesto}")
    sem_canal = [t for t in abertas if t.get("canal") not in dict(CANAIS)]
    if sem_canal:
        print("  SEM CANAL (defeito de dados): " + ", ".join(t["id"] for t in sem_canal))
    pend = d.get("pendentes", [])
    radar = d.get("radar", [])
    print()
    print(f"Fora do termometro: {len(pend)} pendente(s), {len(radar)} item(ns) no radar.")


if __name__ == "__main__":
    if "--so-medir" not in sys.argv:
        ligar()
    medir()
