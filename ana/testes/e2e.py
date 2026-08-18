#!/usr/bin/env python3
"""Bateria E2E da Ana pela inbox de API "Ana E2E" do Chatwoot.

Responde "a Ana faz o que o roteiro manda, num canal de verdade?". Cada cenario roda
numa conversa NOVA (contato novo), pelo mesmo pipeline do Telegram: Chatwoot recebe,
o fazer.ai agents responde, as tools rodam de verdade contra as APIs de producao.

Por que existe versionado: as baterias v2 e v3 (12/ago/2026) rodaram por um runner que
vivia num scratchpad de sessao e se perdeu, deixando a bateria irreproduzivel. Este e o
mesmo desenho, agora no repo (divida da V25 paga na V24).

Uso:
  python3 ana/testes/e2e.py ana/testes/cenarios/ouvidoria.json      # roda o arquivo inteiro
  python3 ana/testes/e2e.py ana/testes/cenarios/ouvidoria.json D2   # roda so o cenario D2

Le CHATWOOT_URL, CHATWOOT_ACCOUNT_ID e CHATWOOT_API_TOKEN do .env da raiz do repo.

Dois caminhos de leitura, de proposito:
  - Public API (a voz do paciente): manda a mensagem e le a resposta publica.
  - App API (a visao da equipe): le as notas internas (private_note) e as tags, que o
    paciente nunca ve. Sem esta parte nao da para provar o PASSO R1 nem o R3 da Secao 7.3.

O modo teste da plataforma exige `/teste` como primeira mensagem de cada conversa, e vale
tambem no canal de API (achado da V19). O runner manda esse turno sozinho.

Conversa de API nao tem card no kanban: o `kanban_move_card` roda e responde "nothing to
move" (limitacao conhecida desde o V6). Etapa se confere nos logs, nao aqui.
"""
import json
import re
import ssl
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

INBOX_IDENTIFIER = "N4gsq3mT4dCyZgy5vRNzEBxh"  # inbox "Ana E2E (API)", id 2
PRIMEIRO_TURNO = "/teste"  # exigido pelo modo teste da plataforma, inclusive no canal de API
ESPERA_MAX_S = 120  # teto por turno: a Ana encadeia varias tools em alguns passos
INTERVALO_S = 3

CTX = ssl.create_default_context()


def find_env():
    for parent in Path(__file__).resolve().parents:
        if (parent / ".env").is_file():
            return parent / ".env"
    sys.exit("ERRO: .env nao encontrado (esperado na raiz do repo)")


def ler_var(arquivo, nome):
    for linha in arquivo.read_text().splitlines():
        if linha.strip().startswith(f"{nome}="):
            return linha.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit(f"ERRO: {nome} ausente em {arquivo}")


ENV = find_env()
BASE = ler_var(ENV, "CHATWOOT_URL").rstrip("/")
CONTA = ler_var(ENV, "CHATWOOT_ACCOUNT_ID")
TOKEN = ler_var(ENV, "CHATWOOT_API_TOKEN")


def chamar(url, metodo="GET", corpo=None, headers=None):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    cabecalhos = {"Content-Type": "application/json", "Accept": "application/json"}
    cabecalhos.update(headers or {})
    req = urllib.request.Request(url, data=dados, headers=cabecalhos, method=metodo)
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=60) as r:
            texto = r.read().decode()
            return json.loads(texto) if texto else {}
    except urllib.error.HTTPError as e:
        sys.exit(f"ERRO {e.code} em {metodo} {url}: {e.read().decode()[:300]}")


def como_equipe(caminho, metodo="GET", corpo=None):
    """App API: o que a equipe ve (notas internas, tags)."""
    return chamar(f"{BASE}/api/v1/accounts/{CONTA}{caminho}", metodo, corpo, {"api_access_token": TOKEN})


def como_paciente(caminho, metodo="GET", corpo=None):
    """Public API do canal de API: o que o paciente manda e ve."""
    return chamar(f"{BASE}/public/api/v1/inboxes/{INBOX_IDENTIFIER}{caminho}", metodo, corpo)


def abrir_conversa(nome_contato):
    contato = como_paciente("/contacts", "POST", {"identifier": nome_contato, "name": nome_contato})
    source_id = contato["source_id"]
    conversa = como_paciente(f"/contacts/{source_id}/conversations", "POST", {})
    return source_id, conversa["id"]


def falar(source_id, conversa_id, texto):
    """Manda o turno do paciente e devolve as respostas publicas novas da Ana."""
    antes = {m["id"] for m in como_paciente(f"/contacts/{source_id}/conversations/{conversa_id}/messages")}
    como_paciente(f"/contacts/{source_id}/conversations/{conversa_id}/messages", "POST", {"content": texto})
    limite = time.time() + ESPERA_MAX_S
    while time.time() < limite:
        time.sleep(INTERVALO_S)
        msgs = como_paciente(f"/contacts/{source_id}/conversations/{conversa_id}/messages")
        novas = [m for m in msgs if m["id"] not in antes and m.get("message_type") in (1, "outgoing")]
        if novas:
            # Uma resposta e uma unica mensagem desde o ADR-0014 (split desligado). Se a
            # plataforma voltar a fatiar, uma pausa curta junta os pedacos antes de conferir.
            time.sleep(INTERVALO_S)
            msgs = como_paciente(f"/contacts/{source_id}/conversations/{conversa_id}/messages")
            novas = [m for m in msgs if m["id"] not in antes and m.get("message_type") in (1, "outgoing")]
            return [m.get("content") or "" for m in novas]
    return []


def notas_internas(conversa_id):
    msgs = como_equipe(f"/conversations/{conversa_id}/messages")
    payload = msgs.get("payload", msgs) if isinstance(msgs, dict) else msgs
    return [m.get("content") or "" for m in payload if m.get("private")]


def tags(conversa_id):
    return como_equipe(f"/conversations/{conversa_id}/labels").get("payload", [])


def conferir(cenario, falas, notas, etiquetas):
    """Avalia as assercoes do cenario. Devolve (passou, linhas do laudo)."""
    espera = cenario.get("espera", {})
    texto_paciente = "\n".join(falas)
    texto_notas = "\n".join(notas)
    laudo, ok = [], True

    def checa(rotulo, condicao, detalhe=""):
        nonlocal ok
        laudo.append(f"    [{'ok' if condicao else 'FALHOU'}] {rotulo}{detalhe}")
        if not condicao:
            ok = False

    for padrao in espera.get("paciente_ve", []):
        checa(f"paciente ve /{padrao}/", re.search(padrao, texto_paciente, re.I) is not None)
    for padrao in espera.get("paciente_nao_ve", []):
        achado = re.search(padrao, texto_paciente, re.I)
        checa(f"paciente NAO ve /{padrao}/", achado is None, f" (achou {achado.group(0)!r})" if achado else "")
    for padrao in espera.get("nota_interna", []):
        checa(f"nota interna /{padrao}/", re.search(padrao, texto_notas, re.I) is not None)
    for tag in espera.get("tags", []):
        checa(f"tag {tag}", tag in etiquetas, f" (tem: {etiquetas})" if tag not in etiquetas else "")
    return ok, laudo


def rodar(cenario, indice):
    nome_contato = f"E2E {cenario['id']} {indice}"
    print(f"\n=== {cenario['id']}: {cenario['nome']}")
    source_id, conversa_id = abrir_conversa(nome_contato)
    print(f"    conversa {conversa_id} ({BASE}/app/accounts/{CONTA}/conversations/{conversa_id})")

    falar(source_id, conversa_id, PRIMEIRO_TURNO)
    falas = []
    for turno in cenario["turnos"]:
        print(f"    > {turno}")
        respostas = falar(source_id, conversa_id, turno)
        if not respostas:
            print(f"    ! sem resposta em {ESPERA_MAX_S}s")
        for r in respostas:
            print(f"    < {r}")
        falas.extend(respostas)

    notas = notas_internas(conversa_id)
    etiquetas = tags(conversa_id)
    for n in notas:
        print(f"    [nota] {n}")
    print(f"    [tags] {etiquetas or 'nenhuma'}")

    ok, laudo = conferir(cenario, falas, notas, etiquetas)
    print("\n".join(laudo))
    print(f"    => {cenario['id']} {'PASSOU' if ok else 'FALHOU'}")
    return ok, conversa_id


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    arquivo = Path(sys.argv[1])
    filtro = sys.argv[2] if len(sys.argv) > 2 else None
    cenarios = json.loads(arquivo.read_text())["cenarios"]
    if filtro:
        cenarios = [c for c in cenarios if c["id"] == filtro]
        if not cenarios:
            sys.exit(f"ERRO: cenario {filtro} nao existe em {arquivo}")

    print(f"Bateria E2E: {arquivo.name} ({len(cenarios)} cenario(s)) na inbox Ana E2E de {BASE}")
    resultados = [rodar(c, i) for i, c in enumerate(cenarios, 1)]
    passaram = sum(1 for ok, _ in resultados if ok)
    print(f"\nVEREDITO: {passaram}/{len(resultados)} passaram")
    sys.exit(0 if passaram == len(resultados) else 1)


if __name__ == "__main__":
    main()
