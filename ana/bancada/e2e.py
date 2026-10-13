#!/usr/bin/env python3
"""
Runner da bancada de cenarios da Ana (nivel 3 do roteiro).

Conduz cada cenario como uma conversa de verdade pela inbox de API "Ana E2E" do
Chatwoot, coleta as ferramentas que a Ana chamou nos logs da plataforma e aplica
as assercoes declaradas no arquivo de cenarios. Imprime placar e transcript.

Nasceu na V25 (18/ago/2026) para pagar a divida do runner antigo, que vivia em
scratchpad de sessao e se perdeu. Termo no CONTEXT.md: "Bancada de cenarios".

Desde o ADR-0032 (12/out/2026) cada cenario rodado grava a sua conversa em
ana/bancada/conversas/<id>.json, versionada no git e sobrescrita a cada bateria:
turnos (o que o paciente enviou, o que a Ana respondeu, as ferramentas do turno e
o caminho de nos do Mapa do SOP declarado no cenario), conferencias objetivas e
veredito. E o que o player do Ana OS toca. Termo no CONTEXT.md: "Conversa gravada".

Conferencias que a maquina faz (so o objetivo, sem juiz por IA): etiqueta, raia do
kanban, handoff, ferramenta chamada, frases proibidas (e, nos cenarios antigos de
integracao.json, os "contem" literais). O "espere" do cenario vai junto como texto.

Uso:
    python3 ana/bancada/e2e.py cenarios/capacidades.json --so C05-1
    python3 ana/bancada/e2e.py cenarios/capacidades.json
    python3 ana/bancada/e2e.py cenarios/integracao.json --so A1,A2,B1
    python3 ana/bancada/e2e.py cenarios/integracao.json --familia D
    python3 ana/bancada/e2e.py cenarios/capacidades.json --bateria v69 --rodada 1

Com --bateria e --rodada (ADR-0033) o runner grava sozinho o log em
resultados/bateria-<bateria>-rodada<n>.log, copia as conversas para
resultados/conversas-<bateria>-rodada<n>/ e anota as janelas em
resultados/janelas-<bateria>.txt. Sempre, com ou sem rodada, emite um evento por
linha em resultados/ao-vivo.jsonl (zerado a cada execucao): e o que a bancada ao
vivo (o painel do Claude Code em .claude/skills/bancada/) desenha em tempo real.

Cenario "manual" nao roda. Cenario "grava_producao" (registra ouvidoria de verdade)
so roda com --com-escrita.

Credenciais: SEMPRE do .env da raiz do repo, nunca no codigo.
    CHATWOOT_URL, CHATWOOT_ACCOUNT_ID, CHATWOOT_API_TOKEN   (obrigatorios)
    AGENTS_API_TOKEN                                        (opcional: sem ela,
                                                             o trace fica "nao coletado")
"""

import argparse
import json
import pathlib
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

RAIZ = pathlib.Path(__file__).resolve().parents[2]
AQUI = pathlib.Path(__file__).resolve().parent
CONVERSAS = AQUI / "conversas"   # a conversa gravada de cada cenario (ADR-0032), versionada
RESULTADOS = AQUI / "resultados"  # relatorios crus, logs e copias por rodada (fora do git)
AO_VIVO = RESULTADOS / "ao-vivo.jsonl"  # um evento por linha, para a bancada ao vivo (ADR-0033)
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


# ----------------------------------------------------------------- ao vivo (ADR-0033)

_ao_vivo = None   # o arquivo de eventos aberto pelo main(); fora dele, emitir() e no-op


def emitir(evento, **campos):
    """Grava um evento JSON por linha em resultados/ao-vivo.jsonl, com carimbo UTC.
    O painel da bancada ao vivo le esse arquivo; o log de texto continua igual."""
    if _ao_vivo is None:
        return
    linha = {"evento": evento, "t": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    linha.update(campos)
    _ao_vivo.write(json.dumps(linha, ensure_ascii=False) + "\n")
    _ao_vivo.flush()


class Tee:
    """Escreve no terminal e no log da rodada ao mesmo tempo, linha a linha."""

    def __init__(self, *saidas):
        self.saidas = saidas

    def write(self, texto):
        for s in self.saidas:
            s.write(texto)
            s.flush()

    def flush(self):
        for s in self.saidas:
            s.flush()


def veredito_gravado(pasta, cid):
    """O veredito da conversa gravada de um cenario numa pasta, ou None se nao ha."""
    arquivo = pasta / f"{cid}.json"
    if not arquivo.is_file():
        return None
    try:
        return json.loads(arquivo.read_text()).get("veredito")
    except (OSError, ValueError):
        return None


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

    def link(self, conversa_id):
        return f"{self.base}/app/accounts/{self.conta}/conversations/{conversa_id}"

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

    def estado(self, conversa_id):
        """(raia do kanban, status da conversa). A raia e o nome da coluna em que o
        card da conversa esta; None quando a conversa nao tem card."""
        status, d = self._admin(f"/conversations/{conversa_id}")
        if status != 200 or not isinstance(d, dict):
            return None, None
        raia = None
        card = d.get("kanban_task") or {}
        passo = card.get("board_step_id")
        for s in (card.get("board") or {}).get("steps", []):
            if s.get("id") == passo:
                raia = s.get("name")
        return raia, d.get("status")


# --------------------------------------------------------------------- trace

class Trace:
    """As ferramentas que a Ana chamou, lidas dos logs da plataforma."""

    def __init__(self, env):
        self.token = env.get("AGENTS_API_TOKEN")
        self.ligado = bool(self.token)

    def por_conversa(self, conversa_chatwoot, desde_iso):
        """[(turnId, nome_da_tool, createdAt)] na ordem em que aconteceram. None = nao coletado.

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
        return [(i.get("turnId"), (i.get("detail") or {}).get("tool"), i.get("createdAt"),
                 (i.get("detail") or {}).get("args") or {})
                for i in itens]


def resumir_trace(chamadas):
    """Devolve (lista_de_nomes, pior_repeticao_num_turno, detalhe_por_turno)."""
    if chamadas is None:
        return None, None, None
    nomes, por_turno = [], {}
    for turno, tool, *_ in chamadas:
        if not tool:
            continue
        nomes.append(tool)
        por_turno.setdefault(turno, []).append(tool)
    pior = 0
    for tools in por_turno.values():
        for t in set(tools) - TOOLS_DE_ESCRITURACAO:
            pior = max(pior, tools.count(t))
    return nomes, pior, por_turno


# As etapas do kanban, com o nome exato que a Ana passa ao kanban_move_card (o prompt
# manda usar o nome exato; duas trazem um travessao, escrito aqui como —).
ETAPAS = ["NOVO CONTATO", "EM ATENDIMENTO — ANA", "AGUARDANDO CONFIRMAÇÃO",
          "FILA COMERCIAL", "FILA ATENDIMENTO", "FILA OUVIDORIA", "SETOR RESPONSÁVEL",
          "AGENDADO", "ENCERRADO — RESOLVIDO", "ENCERRADO — DESISTÊNCIA"]


def raia_pelo_trace(chamadas):
    """A raia lida do trace, para a conversa sem card no kanban (a de API nunca tem:
    o move responde "nothing to move"). Devolve as etapas compativeis com o ultimo
    kanban_move_card, [] se a Ana nao moveu, None se o trace nao foi coletado.

    O log da plataforma mascara os argumentos como "string(<n>)": so o comprimento
    do nome da etapa sobrevive. Os comprimentos das etapas sao unicos, menos FILA
    COMERCIAL e FILA OUVIDORIA (14), que voltam as duas. Achado da bateria #18."""
    if chamadas is None:
        return None
    moves = [args for _, tool, _, args in chamadas if tool == "kanban_move_card"]
    if not moves:
        return []
    alvo = str(moves[-1].get("targetStep") or "")
    if alvo.startswith("string(") and alvo.endswith(")") and alvo[7:-1].isdigit():
        n = int(alvo[7:-1])
        return [e for e in ETAPAS if len(e) == n] or [f"etapa desconhecida de {n} caracteres"]
    return [alvo]


def tools_por_turno(chamadas, enviados):
    """Distribui as chamadas pelos turnos do cenario: cada chamada vai para o ultimo
    turno enviado antes dela (pelo carimbo createdAt do log). None = nao coletado."""
    if chamadas is None:
        return None
    saida = [[] for _ in enviados]
    for _, tool, quando, _ in chamadas:
        if not tool or not quando or not enviados:
            continue
        n = 0
        for i, enviado in enumerate(enviados):
            if datetime.fromisoformat(enviado) <= datetime.fromisoformat(quando.replace("Z", "+00:00")):
                n = i
        saida[n].append(tool)
    return saida


# ---------------------------------------------------------------- conferencias

def normalizar(texto):
    """Compara raia sem caixa, acento nem pontuacao: 'Encerrado, Resolvido' casa com
    'ENCERRADO RESOLVIDO' (o nome da coluna no Chatwoot traz um travessao)."""
    import unicodedata
    t = unicodedata.normalize("NFKD", str(texto or "")).encode("ascii", "ignore").decode()
    return " ".join("".join(c if c.isalnum() else " " for c in t.lower()).split())


def conf(turno, tipo, esperado, veio, ok):
    return {"turno": turno, "tipo": tipo, "esperado": esperado, "veio": veio, "ok": ok}


def checar(n, turno, resposta, tools_do_cenario, pior_repeticao):
    """As conferencias de um turno (n comeca em 1). A ferramenta e conferida contra o
    cenario inteiro, porque a janela de debounce pode empurrar a chamada para o turno
    vizinho; o detalhe por turno fica gravado para o player."""
    saida = []
    baixa = resposta.lower()

    for esperado in turno.get("contem", []):
        saida.append(conf(n, "contem", esperado, None, esperado.lower() in baixa))

    alternativas = turno.get("contem_algum", [])
    if alternativas:
        saida.append(conf(n, "contem_algum", alternativas, None,
                          any(a.lower() in baixa for a in alternativas)))

    for proibido in turno.get("nao_contem", []):
        achou = proibido.lower() in baixa
        saida.append(conf(n, "frase proibida", proibido, proibido if achou else None, not achou))

    if tools_do_cenario is not None:
        for t in turno.get("tools", []):
            saida.append(conf(n, "ferramenta", t, tools_do_cenario, t in tools_do_cenario))
        for t in turno.get("tools_proibidas", []):
            saida.append(conf(n, "ferramenta proibida", t, tools_do_cenario,
                              t not in tools_do_cenario))
        teto = turno.get("tools_max_por_turno")
        if teto is not None and pior_repeticao is not None:
            saida.append(conf(n, "repeticao de ferramenta", f"no maximo {teto}x por turno",
                              pior_repeticao, pior_repeticao <= teto))
    else:
        for t in turno.get("tools", []):
            saida.append(conf(n, "ferramenta", t, "trace nao coletado", None))

    return saida


def checar_fim(cenario, ultimo, fim, tools, notas):
    """As conferencias do fim da conversa, presas ao ultimo turno: etiqueta, raia,
    handoff e notas privadas."""
    confere = cenario.get("confere") or {}
    saida = []
    for etq in list(cenario.get("etiquetas", [])) + list(confere.get("etiquetas", [])):
        saida.append(conf(ultimo, "etiqueta", etq, fim["etiquetas"], etq in fim["etiquetas"]))
    if confere.get("raia") and fim["raia"] is None and fim.get("raia_pelo_trace") is not None:
        candidatas = fim["raia_pelo_trace"]
        veio = ("trace: kanban_move_card para " + " ou ".join(candidatas) if candidatas
                else "trace: nenhum kanban_move_card")
        saida.append(conf(ultimo, "raia", confere["raia"], veio,
                          normalizar(confere["raia"]) in {normalizar(c) for c in candidatas}))
    elif confere.get("raia"):
        saida.append(conf(ultimo, "raia", confere["raia"], fim["raia"],
                          normalizar(confere["raia"]) == normalizar(fim["raia"])))
    if "handoff" in confere:
        saida.append(conf(ultimo, "handoff", confere["handoff"], fim["handoff"],
                          None if fim["handoff"] is None else fim["handoff"] == confere["handoff"]))
    for esperada in cenario.get("notas_contem", []):
        saida.append(conf(ultimo, "nota privada", esperada, None,
                          any(esperada.lower() in nota.lower() for nota in notas)))
    return saida


def descrever(c):
    rotulo = {True: "", False: "FALHOU ", None: "nao conferido "}[c["ok"]]
    veio = "" if c["veio"] is None else f" (veio: {json.dumps(c['veio'], ensure_ascii=False)})"
    return f"turno {c['turno']}: {rotulo}{c['tipo']} {json.dumps(c['esperado'], ensure_ascii=False)}{veio}"


# ------------------------------------------------------------------- execucao

def rodar_cenario(canal, trace, cenario, arquivo):
    cid = cenario["id"]
    print(f"\n{'=' * 78}\n[{cid}] {cenario.get('titulo', '')}\n{'=' * 78}")
    emitir("cenario", id=cid, titulo=cenario.get("titulo", ""),
           turnos=len(cenario["turnos"]), anterior=veredito_gravado(CONVERSAS, cid))

    nome_contato = cenario.get("contato") or f"TESTE BANCADA ANA {cid}"
    resultado = {"id": cid, "arquivo": arquivo, "capacidade": cenario.get("capacidade"),
                 "familia": cenario.get("familia"), "titulo": cenario.get("titulo"),
                 "contato": nome_contato, "conversa_id": None, "inicio": None,
                 "turnos": [], "tools": None, "pior_repeticao": None,
                 "fim": None, "conferencias": [], "falhas": []}

    try:
        source_id, conversa_id = canal.abrir_conversa(nome_contato)
    except Exception as e:
        resultado["falhas"].append(f"nao consegui abrir a conversa: {e}")
        resultado["veredito"] = "erro"
        print(f"  ERRO: {e}")
        emitir("veredito", id=cid, veredito="erro", falhas=resultado["falhas"],
               turnos=[], fim=None)
        return resultado

    resultado["conversa_id"] = conversa_id
    # margem para tras: o log do turno pode ser carimbado antes do retorno da chamada
    desde_iso = (datetime.now(timezone.utc) - timedelta(minutes=2)).isoformat()
    resultado["inicio"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    print(f"  conversa #{conversa_id} (contato {nome_contato})")
    emitir("conversa", id=cid, conversa_id=conversa_id, contato=nome_contato,
           link=canal.link(conversa_id))

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

    enviados = []
    for n, turno in enumerate(cenario["turnos"]):
        texto = turno["envie"]
        print(f"\n  > paciente: {texto}")
        emitir("paciente", id=cid, n=n + 1, texto=texto, espere=turno.get("espere"),
               nos=turno.get("nos", []))
        enviados.append(datetime.now(timezone.utc).isoformat())
        try:
            canal.enviar(source_id, conversa_id, texto)
        except Exception as e:
            enviados.pop()
            resultado["falhas"].append(f"turno {n + 1}: {e}")
            break
        respostas = canal.esperar_resposta(source_id, conversa_id, vistos)
        for r in respostas:
            print(f"  < Ana: {r}")
        if not respostas:
            print("  < Ana: (nada em " + str(TETO_ESPERA_S) + "s)")
        emitir("ana", id=cid, n=n + 1, respostas=respostas)
        resultado["turnos"].append({
            "n": n + 1, "paciente": texto, "ana": respostas,
            "ferramentas": None, "nos": turno.get("nos", []),
            "espere": turno.get("espere"), "falha_se": turno.get("falha"),
            "conferencias": []})

    chamadas = trace.por_conversa(conversa_id, desde_iso)
    tools, pior, _ = resumir_trace(chamadas)
    resultado["tools"] = tools
    resultado["pior_repeticao"] = pior
    por_turno = tools_por_turno(chamadas, enviados)
    if por_turno is not None:
        for t, lista in zip(resultado["turnos"], por_turno):
            t["ferramentas"] = lista
    if tools is None:
        motivo = ("sem AGENTS_API_TOKEN no .env" if not trace.ligado
                  else "a rota de logs da plataforma nao respondeu")
        print(f"\n  trace: nao coletado ({motivo})")
        emitir("trace", id=cid, tools=None, motivo=motivo, por_turno=None)
    else:
        emitir("trace", id=cid, tools=tools, pior=pior, por_turno=por_turno)
        print(f"\n  trace: {len(tools)} chamada(s) -> {', '.join(tools) if tools else 'nenhuma'}")
        if pior and pior > 1:
            print(f"  ATENCAO: uma tool de dado foi repetida {pior}x no mesmo turno "
                  f"(assinatura do truncamento de 4.000 chars)")

    notas = canal.notas_privadas(conversa_id)
    raia, status = canal.estado(conversa_id)
    resultado["fim"] = {
        "etiquetas": canal.etiquetas(conversa_id),
        "raia": raia,
        # conversa de API nao tem card: a raia vem do ultimo kanban_move_card do trace
        "raia_pelo_trace": raia_pelo_trace(chamadas) if raia is None else None,
        "status": status,
        # handoff: a ferramenta no trace; sem trace, a conversa aberta para a equipe
        "handoff": ("handoff_to_human" in tools) if tools is not None
                   else (None if status is None else status == "open"),
    }

    for n, turno in enumerate(cenario["turnos"]):
        if n >= len(resultado["turnos"]):
            break
        gravado = resultado["turnos"][n]
        gravado["conferencias"] = checar(n + 1, turno, "\n".join(gravado["ana"]), tools, pior)
    if resultado["turnos"]:
        resultado["turnos"][-1]["conferencias"] += checar_fim(
            cenario, len(resultado["turnos"]), resultado["fim"], tools, notas)

    resultado["conferencias"] = [c for t in resultado["turnos"] for c in t["conferencias"]]
    resultado["falhas"] += [descrever(c) for c in resultado["conferencias"] if c["ok"] is False]
    if len(resultado["turnos"]) < len(cenario["turnos"]):
        resultado["veredito"] = "erro"
    else:
        resultado["veredito"] = "passou" if not resultado["falhas"] else "falhou"
    print(f"\n  VEREDITO: {resultado['veredito'].upper()}")
    for f in resultado["falhas"]:
        print(f"    - {f}")
    emitir("veredito", id=cid, veredito=resultado["veredito"], falhas=resultado["falhas"],
           turnos=[{"n": t["n"], "ferramentas": t["ferramentas"],
                    "conferencias": t["conferencias"]} for t in resultado["turnos"]],
           fim=resultado["fim"])
    return resultado


def gravar_conversa(r):
    """A conversa gravada (ADR-0032): um arquivo por cenario, versionado no git,
    sobrescrito a cada bateria. O historico das rodadas e o git log."""
    destino = CONVERSAS / f"{r['id']}.json"
    CONVERSAS.mkdir(exist_ok=True)
    doc = {k: r[k] for k in ("id", "arquivo", "capacidade", "familia", "titulo", "contato",
                             "conversa_id", "inicio", "turnos", "tools", "fim",
                             "veredito", "falhas")}
    doc["rodou_em"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    # o arquivo vai para o git: CPF sai mascarado, mesmo o de teste que o cenario envia
    texto = re.sub(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b", "***.***.***-**",
                   json.dumps(doc, ensure_ascii=False, indent=2))
    destino.write_text(texto + "\n")
    return destino


def main():
    p = argparse.ArgumentParser(description="Bancada de cenarios da Ana (nivel 3)")
    p.add_argument("cenarios", help="arquivo de cenarios (relativo a ana/bancada/ ou absoluto)")
    p.add_argument("--so", help="roda so estes ids, separados por virgula (ex.: A1,B1)")
    p.add_argument("--familia", help="roda so esta familia (ex.: D)")
    p.add_argument("--com-escrita", action="store_true",
                   help="roda tambem os cenarios que gravam fora da plataforma (grava_producao)")
    p.add_argument("--bateria", help="nome da bateria (ex.: v69); grava log e copia das conversas")
    p.add_argument("--rodada", type=int, help="numero da rodada dentro da bateria (ex.: 1)")
    args = p.parse_args()
    if bool(args.bateria) != (args.rodada is not None):
        sys.exit("ERRO: --bateria e --rodada andam juntos.")
    if args.bateria and not re.fullmatch(r"[A-Za-z0-9_.-]+", args.bateria):
        sys.exit("ERRO: --bateria so com letras, numeros, ponto, traco e sublinhado.")

    global _ao_vivo
    RESULTADOS.mkdir(exist_ok=True)
    _ao_vivo = AO_VIVO.open("w")
    rotulo = f"{args.bateria}-rodada{args.rodada}" if args.bateria else None
    if rotulo:
        sys.stdout = Tee(sys.__stdout__, (RESULTADOS / f"bateria-{rotulo}.log").open("w"))
        with (RESULTADOS / f"janelas-{args.bateria}.txt").open("a") as j:
            j.write(f"{args.bateria} rodada{args.rodada} inicio "
                    f"{datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}\n")

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
    pulados = []
    for c in list(cenarios):
        if c.get("manual") or not c.get("turnos"):
            pulados.append((c["id"], "manual: mostra so os passos"))
        elif c.get("grava_producao") and not args.com_escrita:
            pulados.append((c["id"], "grava fora da plataforma: so com --com-escrita"))
        else:
            continue
        cenarios.remove(c)
    for cid, motivo in pulados:
        print(f"  pulado {cid}: {motivo}")
    if not cenarios:
        sys.exit("ERRO: nenhum cenario para rodar com esse filtro.")

    env = ler_env()
    canal = Canal(env)
    trace = Trace(env)

    print(f"Bancada de cenarios da Ana: {caminho.name} ({len(cenarios)} cenario(s))")
    print(f"Canal: inbox '{INBOX_NOME}' do Chatwoot, modo teste com o prefixo {PREFIXO_MODO_TESTE}")
    print(f"Trace: {'ligado' if trace.ligado else 'DESLIGADO (sem AGENTS_API_TOKEN no .env)'}")

    rodadas_anteriores = {}
    if args.bateria:
        for k in range(1, args.rodada):
            pasta = RESULTADOS / f"conversas-{args.bateria}-rodada{k}"
            for c in cenarios:
                rodadas_anteriores.setdefault(c["id"], []).append(veredito_gravado(pasta, c["id"]))
    emitir("bateria", bateria=args.bateria, rodada=args.rodada, arquivo=caminho.name,
           cenarios=[{"id": c["id"], "titulo": c.get("titulo", "")} for c in cenarios],
           pulados=[{"id": cid, "motivo": m} for cid, m in pulados],
           trace_ligado=trace.ligado, rodadas_anteriores=rodadas_anteriores)

    resultados = []
    for i, c in enumerate(cenarios):
        if i:
            time.sleep(PAUSA_ENTRE_CENARIOS_S)
        r = rodar_cenario(canal, trace, c, caminho.name)
        resultados.append(r)
        if r["veredito"] != "erro" or r["turnos"]:
            print(f"  conversa gravada: {gravar_conversa(r).relative_to(RAIZ)}")

    passou = [r for r in resultados if r["veredito"] == "passou"]
    print(f"\n{'=' * 78}\nPLACAR: {len(passou)}/{len(resultados)}\n{'=' * 78}")
    for r in resultados:
        marca = {"passou": "OK    ", "falhou": "FALHOU", "erro": "ERRO  "}[r["veredito"]]
        print(f"  [{marca}] {r['id']:<5} {r.get('titulo', '')}")
        for f in r["falhas"]:
            print(f"            {f}")

    destino = RESULTADOS / f"{caminho.stem}-ultima-rodada.json"
    destino.write_text(json.dumps(resultados, ensure_ascii=False, indent=2))
    print(f"\nRelatorio completo: {destino.relative_to(RAIZ)}")

    if rotulo:
        copia = RESULTADOS / f"conversas-{rotulo}"
        shutil.rmtree(copia, ignore_errors=True)
        shutil.copytree(CONVERSAS, copia)
        print(f"Conversas da rodada: {copia.relative_to(RAIZ)}")
        with (RESULTADOS / f"janelas-{args.bateria}.txt").open("a") as j:
            j.write(f"{args.bateria} rodada{args.rodada} fim "
                    f"{datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')} "
                    f"placar {len(passou)}/{len(resultados)}\n")
    emitir("placar", passou=len(passou), total=len(resultados),
           resultados=[{"id": r["id"], "veredito": r["veredito"]} for r in resultados])
    _ao_vivo.close()
    return 0 if len(passou) == len(resultados) else 1


if __name__ == "__main__":
    sys.exit(main())
