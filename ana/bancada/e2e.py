#!/usr/bin/env python3
"""
Runner da bancada de cenarios da Ana (nivel 3 do roteiro).

Conduz cada cenario como uma conversa de verdade pela inbox de API "Ana E2E" do
Chatwoot, coleta as ferramentas que a Ana chamou nos logs da plataforma e aplica
as assercoes declaradas no arquivo de cenarios. Imprime placar e transcript.

Nasceu na V25 (18/ago/2026) para pagar a divida do runner antigo, que vivia em
scratchpad de sessao e se perdeu. Termo no CONTEXT.md: "Bancada de cenarios".

Uso:
    python3 ana/bancada/e2e.py cenarios/integracao.json
    python3 ana/bancada/e2e.py cenarios/integracao.json --so A1,A2,B1
    python3 ana/bancada/e2e.py cenarios/integracao.json --familia D

Credenciais: SEMPRE do .env da raiz do repo, nunca no codigo.
    CHATWOOT_URL, CHATWOOT_ACCOUNT_ID, CHATWOOT_API_TOKEN   (obrigatorios)
    AGENTS_API_TOKEN                                        (opcional: sem ela,
                                                             o trace fica "nao coletado")
"""

import argparse
import json
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

RAIZ = pathlib.Path(__file__).resolve().parents[2]
AQUI = pathlib.Path(__file__).resolve().parent
INBOX_NOME = "Ana E2E (API)"
PLATAFORMA = "https://agents.hospitalsaomatheus.cloud"

# a instancia roda em modo teste: sem este prefixo na primeira mensagem, a Ana nao responde
PREFIXO_MODO_TESTE = "/teste"

JANELA_SILENCIO_S = 10   # sem mensagem nova por este tempo = turno terminou
TETO_ESPERA_S = 150      # desiste do turno depois disso
PAUSA_ENTRE_CENARIOS_S = 3

# ferramentas de escrituracao da propria plataforma: repetir estas num turno e normal
# (o fluxo da ouvidoria, por exemplo, chama private_note duas vezes de proposito).
# A repeticao que interessa e a de tool HTTP de dado, sintoma do teto de 4.000 chars.
TOOLS_DE_ESCRITURACAO = {
    "private_note", "assign_label", "kanban_move_card", "set_custom_attribute",
    "get_current_time", "handoff_to_human", "skip_reply", "search_knowledge",
}


# --------------------------------------------------------------------------- env

def ler_env():
    caminho = RAIZ / ".env"
    if not caminho.is_file():
        sys.exit(f"ERRO: .env nao encontrado em {caminho}")
    env = {}
    for linha in caminho.read_text().splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        chave, valor = linha.split("=", 1)
        env[chave.strip()] = valor.strip().strip('"').strip("'")
    faltando = [k for k in ("CHATWOOT_URL", "CHATWOOT_ACCOUNT_ID", "CHATWOOT_API_TOKEN")
                if not env.get(k)]
    if faltando:
        sys.exit("ERRO: faltam no .env: " + ", ".join(faltando))
    return env


# ------------------------------------------------------------------------- http

def pedir(url, metodo="GET", headers=None, corpo=None, timeout=30):
    dados = None
    headers = dict(headers or {})
    headers.setdefault("Accept", "application/json")
    if corpo is not None:
        dados = json.dumps(corpo).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=dados, method=metodo, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            texto = r.read().decode("utf-8", errors="replace")
            return r.status, (json.loads(texto) if texto.strip() else None)
    except urllib.error.HTTPError as e:
        texto = e.read().decode("utf-8", errors="replace")
        return e.code, texto
    except Exception as e:  # rede fora, DNS, timeout
        return 0, str(e)


# ---------------------------------------------------------------------- chatwoot

class Canal:
    """A inbox de API do Chatwoot vista como um paciente que escreve e le."""

    def __init__(self, env):
        self.base = env["CHATWOOT_URL"].rstrip("/")
        self.conta = env["CHATWOOT_ACCOUNT_ID"]
        self.token = env["CHATWOOT_API_TOKEN"]
        self.identifier = self._achar_inbox()

    def _admin(self, caminho, metodo="GET", corpo=None):
        return pedir(f"{self.base}/api/v1/accounts/{self.conta}{caminho}",
                     metodo, {"api_access_token": self.token}, corpo)

    def _publico(self, caminho, metodo="GET", corpo=None):
        return pedir(f"{self.base}/public/api/v1/inboxes/{self.identifier}{caminho}",
                     metodo, {}, corpo)

    def _achar_inbox(self):
        status, d = self._admin("/inboxes")
        if status != 200 or not isinstance(d, dict):
            sys.exit(f"ERRO: nao consegui listar as inboxes do Chatwoot (HTTP {status}): {d}")
        for i in d.get("payload", []):
            if i.get("name") == INBOX_NOME and i.get("inbox_identifier"):
                return i["inbox_identifier"]
        sys.exit(f"ERRO: inbox '{INBOX_NOME}' nao encontrada, ou sem inbox_identifier.")

    def abrir_conversa(self, nome_contato):
        status, c = self._publico("/contacts", "POST", {"name": nome_contato})
        if status not in (200, 201) or not isinstance(c, dict):
            raise RuntimeError(f"contato nao criado (HTTP {status}): {c}")
        source_id = c.get("source_id") or (c.get("contact") or {}).get("source_id")
        if not source_id:
            raise RuntimeError(f"contato sem source_id: {c}")
        status, conv = self._publico(f"/contacts/{source_id}/conversations", "POST", {})
        if status not in (200, 201) or not isinstance(conv, dict):
            raise RuntimeError(f"conversa nao criada (HTTP {status}): {conv}")
        return source_id, conv["id"]

    def enviar(self, source_id, conversa_id, texto):
        status, m = self._publico(
            f"/contacts/{source_id}/conversations/{conversa_id}/messages",
            "POST", {"content": texto})
        if status not in (200, 201):
            raise RuntimeError(f"mensagem nao enviada (HTTP {status}): {m}")
        return m

    def mensagens(self, source_id, conversa_id):
        status, d = self._publico(f"/contacts/{source_id}/conversations/{conversa_id}/messages")
        if status != 200:
            return []
        return d if isinstance(d, list) else d.get("payload", [])

    def esperar_resposta(self, source_id, conversa_id, vistos):
        """Espera a Ana parar de falar. Devolve as mensagens novas dela (texto)."""
        inicio = time.time()
        ultima_novidade = None
        novas = []
        while time.time() - inicio < TETO_ESPERA_S:
            time.sleep(3)
            for m in self.mensagens(source_id, conversa_id):
                mid = m.get("id")
                if mid in vistos:
                    continue
                vistos.add(mid)
                # message_type 1 = outgoing (a Ana); 0 = incoming (o paciente)
                if m.get("message_type") in (1, "outgoing") and not m.get("private"):
                    conteudo = (m.get("content") or "").strip()
                    if conteudo:
                        novas.append(conteudo)
                        ultima_novidade = time.time()
            if ultima_novidade and time.time() - ultima_novidade >= JANELA_SILENCIO_S:
                return novas
        return novas

    def notas_privadas(self, conversa_id):
        status, d = self._admin(f"/conversations/{conversa_id}/messages")
        if status != 200:
            return []
        itens = d if isinstance(d, list) else (d or {}).get("payload", [])
        return [(m.get("content") or "").strip() for m in itens if m.get("private")]

    def etiquetas(self, conversa_id):
        status, d = self._admin(f"/conversations/{conversa_id}/labels")
        if status != 200 or not isinstance(d, dict):
            return []
        return d.get("payload", [])


# --------------------------------------------------------------------- trace

class Trace:
    """As ferramentas que a Ana chamou, lidas dos logs da plataforma."""

    def __init__(self, env):
        self.token = env.get("AGENTS_API_TOKEN")
        self.ligado = bool(self.token)

    def por_conversa(self, conversa_chatwoot, desde_iso):
        """[(turnId, nome_da_tool)] na ordem em que aconteceram. None = nao coletado.

        O elo entre as duas numeracoes e o threadId do log, no formato
        "1:1:<id da conversa no Chatwoot>". A plataforma numera as conversas por
        conta dela (Chatwoot 83 = plataforma 68), e o filtro conversationId da rota
        de logs pede o id DELA, nao o do Chatwoot. Casar pelo threadId dispensa a
        traducao e nao depende da rota /conversations, que devolve lista vazia de
        forma intermitente. Achados da V25, 18/ago/2026.
        """
        if not self.ligado:
            return None
        url = (f"{PLATAFORMA}/api/v1/logs?stage=tool&source=inbox&limit=200"
               f"&since={urllib.parse.quote(desde_iso)}")
        status, d = pedir(url, headers={"Authorization": f"Bearer {self.token}"})
        if status != 200 or not isinstance(d, dict):
            return None
        sufixo = f":{conversa_chatwoot}"
        itens = [i for i in reversed(d.get("items", []))          # a API devolve do mais novo
                 if str(i.get("threadId") or "").endswith(sufixo)]  # ao mais velho
        return [(i.get("turnId"), (i.get("detail") or {}).get("tool")) for i in itens]


def resumir_trace(chamadas):
    """Devolve (lista_de_nomes, pior_repeticao_num_turno, detalhe_por_turno)."""
    if chamadas is None:
        return None, None, None
    nomes, por_turno = [], {}
    for turno, tool in chamadas:
        if not tool:
            continue
        nomes.append(tool)
        por_turno.setdefault(turno, []).append(tool)
    pior = 0
    for tools in por_turno.values():
        for t in set(tools) - TOOLS_DE_ESCRITURACAO:
            pior = max(pior, tools.count(t))
    return nomes, pior, por_turno


# ---------------------------------------------------------------- assercoes

def checar(turno, resposta, tools_do_cenario, pior_repeticao):
    """Devolve a lista de falhas deste turno (vazia = passou)."""
    falhas = []
    baixa = resposta.lower()

    for esperado in turno.get("contem", []):
        if esperado.lower() not in baixa:
            falhas.append(f'nao contem "{esperado}"')

    alternativas = turno.get("contem_algum", [])
    if alternativas and not any(a.lower() in baixa for a in alternativas):
        falhas.append("nao contem nenhum de " + json.dumps(alternativas, ensure_ascii=False))

    for proibido in turno.get("nao_contem", []):
        if proibido.lower() in baixa:
            falhas.append(f'contem o proibido "{proibido}"')

    if tools_do_cenario is not None:
        for t in turno.get("tools", []):
            if t not in tools_do_cenario:
                falhas.append(f'a tool "{t}" nao aparece no trace')
        for t in turno.get("tools_proibidas", []):
            if t in tools_do_cenario:
                falhas.append(f'a tool proibida "{t}" foi chamada')
        teto = turno.get("tools_max_por_turno")
        if teto is not None and pior_repeticao is not None and pior_repeticao > teto:
            falhas.append(f"tool repetida {pior_repeticao}x num turno (teto {teto})")

    return falhas


# ------------------------------------------------------------------- execucao

def rodar_cenario(canal, trace, cenario, indice):
    cid = cenario["id"]
    print(f"\n{'=' * 78}\n[{cid}] {cenario.get('titulo', '')}\n{'=' * 78}")

    nome_contato = cenario.get("contato") or f"TESTE BANCADA ANA {cid}"
    resultado = {"id": cid, "familia": cenario.get("familia"),
                 "titulo": cenario.get("titulo"), "contato": nome_contato,
                 "turnos": [], "falhas": [], "conversa_id": None,
                 "tools": None, "pior_repeticao": None, "notas": [], "etiquetas": []}

    try:
        source_id, conversa_id = canal.abrir_conversa(nome_contato)
    except Exception as e:
        resultado["falhas"].append(f"nao consegui abrir a conversa: {e}")
        resultado["veredito"] = "erro"
        print(f"  ERRO: {e}")
        return resultado

    resultado["conversa_id"] = conversa_id
    # margem para tras: o log do turno pode ser carimbado antes do retorno da chamada
    desde_iso = (datetime.now(timezone.utc) - timedelta(minutes=2)).isoformat()
    resultado["inicio"] = desde_iso
    print(f"  conversa #{conversa_id} (contato {nome_contato})")

    # o modo teste exige /teste como mensagem SOZINHA: como prefixo colado no texto
    # a plataforma nao ativa e responde com uma nota privada (achado da V25).
    vistos = set()
    try:
        canal.enviar(source_id, conversa_id, PREFIXO_MODO_TESTE)
        time.sleep(4)
        for m in canal.mensagens(source_id, conversa_id):
            vistos.add(m.get("id"))
    except Exception as e:
        resultado["falhas"].append(f"nao consegui ativar o modo teste: {e}")

    for n, turno in enumerate(cenario["turnos"]):
        texto = turno["envie"]
        print(f"\n  > paciente: {texto}")
        try:
            canal.enviar(source_id, conversa_id, texto)
        except Exception as e:
            resultado["falhas"].append(f"turno {n + 1}: {e}")
            break
        respostas = canal.esperar_resposta(source_id, conversa_id, vistos)
        resposta = "\n".join(respostas)
        for r in respostas:
            print(f"  < Ana: {r}")
        if not respostas:
            print("  < Ana: (nada em " + str(TETO_ESPERA_S) + "s)")
        resultado["turnos"].append({"envie": texto, "resposta": resposta})

    chamadas = trace.por_conversa(conversa_id, desde_iso)
    tools, pior, por_turno = resumir_trace(chamadas)
    resultado["tools"] = tools
    resultado["pior_repeticao"] = pior
    if tools is None:
        motivo = ("sem AGENTS_API_TOKEN no .env" if not trace.ligado
                  else "a rota de logs da plataforma nao respondeu")
        print(f"\n  trace: nao coletado ({motivo})")
    else:
        print(f"\n  trace: {len(tools)} chamada(s) -> {', '.join(tools) if tools else 'nenhuma'}")
        if pior and pior > 1:
            print(f"  ATENCAO: uma tool de dado foi repetida {pior}x no mesmo turno "
                  f"(assinatura do truncamento de 4.000 chars)")

    resultado["notas"] = canal.notas_privadas(conversa_id)
    resultado["etiquetas"] = canal.etiquetas(conversa_id)

    for n, turno in enumerate(cenario["turnos"]):
        if n >= len(resultado["turnos"]):
            break
        falhas = checar(turno, resultado["turnos"][n]["resposta"], tools, pior)
        for f in falhas:
            resultado["falhas"].append(f"turno {n + 1}: {f}")

    for esperada in cenario.get("notas_contem", []):
        if not any(esperada.lower() in nota.lower() for nota in resultado["notas"]):
            resultado["falhas"].append(f'nenhuma nota privada contem "{esperada}"')
    for etq in cenario.get("etiquetas", []):
        if etq not in resultado["etiquetas"]:
            resultado["falhas"].append(f'a etiqueta "{etq}" nao foi aplicada')

    resultado["veredito"] = "passou" if not resultado["falhas"] else "falhou"
    print(f"\n  VEREDITO: {resultado['veredito'].upper()}")
    for f in resultado["falhas"]:
        print(f"    - {f}")
    return resultado


def main():
    p = argparse.ArgumentParser(description="Bancada de cenarios da Ana (nivel 3)")
    p.add_argument("cenarios", help="arquivo de cenarios (relativo a ana/bancada/ ou absoluto)")
    p.add_argument("--so", help="roda so estes ids, separados por virgula (ex.: A1,B1)")
    p.add_argument("--familia", help="roda so esta familia (ex.: D)")
    args = p.parse_args()

    caminho = pathlib.Path(args.cenarios)
    if not caminho.is_absolute():
        caminho = AQUI / args.cenarios
    if not caminho.is_file():
        sys.exit(f"ERRO: arquivo de cenarios nao encontrado: {caminho}")

    dados = json.loads(caminho.read_text())
    cenarios = dados["cenarios"] if isinstance(dados, dict) else dados

    if args.so:
        querido = {s.strip().upper() for s in args.so.split(",")}
        cenarios = [c for c in cenarios if c["id"].upper() in querido]
    if args.familia:
        cenarios = [c for c in cenarios if (c.get("familia") or "").upper() == args.familia.upper()]
    if not cenarios:
        sys.exit("ERRO: nenhum cenario casou com o filtro.")

    env = ler_env()
    canal = Canal(env)
    trace = Trace(env)

    print(f"Bancada de cenarios da Ana: {caminho.name} ({len(cenarios)} cenario(s))")
    print(f"Canal: inbox '{INBOX_NOME}' do Chatwoot, modo teste com o prefixo {PREFIXO_MODO_TESTE}")
    print(f"Trace: {'ligado' if trace.ligado else 'DESLIGADO (sem AGENTS_API_TOKEN no .env)'}")

    resultados = []
    for i, c in enumerate(cenarios):
        if i:
            time.sleep(PAUSA_ENTRE_CENARIOS_S)
        resultados.append(rodar_cenario(canal, trace, c, i))

    passou = [r for r in resultados if r["veredito"] == "passou"]
    print(f"\n{'=' * 78}\nPLACAR: {len(passou)}/{len(resultados)}\n{'=' * 78}")
    for r in resultados:
        marca = {"passou": "OK    ", "falhou": "FALHOU", "erro": "ERRO  "}[r["veredito"]]
        print(f"  [{marca}] {r['id']:<4} {r.get('titulo', '')}")
        for f in r["falhas"]:
            print(f"            {f}")

    destino = AQUI / "resultados" / f"{caminho.stem}-ultima-rodada.json"
    destino.parent.mkdir(exist_ok=True)
    destino.write_text(json.dumps(resultados, ensure_ascii=False, indent=2))
    print(f"\nRelatorio completo: {destino.relative_to(RAIZ)}")
    return 0 if len(passou) == len(resultados) else 1


if __name__ == "__main__":
    sys.exit(main())
