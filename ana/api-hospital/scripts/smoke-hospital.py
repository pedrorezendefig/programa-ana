#!/usr/bin/env python3
"""Smoke test da API da Ana no Hospital Reunioes (PRODUCAO, so leitura): responde "a fonte das
tabelas esta de pe e cabe no que a Ana consegue ler?".

Uso:
  python3 ana/api-hospital/scripts/smoke-hospital.py

Le HOSPITAL_ANA_API_KEY do .env da raiz do repo (a mesma chave que vive no vault do fazer.ai como
hospital-ana-api-key). Nunca escreve: os endpoints de escrita da ouvidoria ficam fora deste script.

Alem do "responde 200?", cada endpoint e medido contra o TETO DE RESPOSTA da plataforma: o runtime
do fazer.ai agents corta o corpo de toda HTTP tool em 4.000 caracteres antes de entregar ao modelo
(default fixo de maxResponseChars, src/graph/tools/http.ts da 1.4.1). O que passa do teto o modelo
nao ve: ele afirma que o item nao existe, ou repete a chamada em loop. Foi assim que Pediatria e
Urologia sumiram da tool 1 (achado da V21).

Desde 19/ago/2026 a API escolhe o MODO da resposta pelo tamanho (ADR 0032 do repo Hospital, a V22):
"completo" com todos os campos, "resumo" so com nome e valor, "indice" so com os nomes. O corpo
declara o modo e a dica de como pedir o detalhe. Por isso o contrato aqui e por modo: cobrar campo
de "completo" numa resposta "resumo" acusa falha que nao existe. A chamada COM filtro tem que voltar
"completo" e trazer o que a Ana precisa para falar (o diferencial, o preparo, o caveat).

Resultado por linha: OK, CORTA (funciona mas o fim da tabela e invisivel a Ana) ou FALHOU.
"""
import json
import ssl
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = "https://api.hospitalsaomatheus.cloud/api/ana"

# Teto de corpo de resposta por chamada de HTTP tool na plataforma (fixo, nao configuravel).
TETO_PLATAFORMA = 4000

# endpoint -> contrato. Os campos sao POR MODO: a API resume sozinha quando a resposta cresce.
#   resumo   = o minimo que a resposta encolhida precisa manter (nunca some linha, so campo)
#   completo = o que a Ana precisa para cumprir o SOP quando pergunta por um item so
#   filtro   = (parametro, termo de teste) para provar o caminho do detalhe
CONTRATO = {
    "consultas-particulares": {
        "envelope": "consultas_particulares",
        "rotulos": ["especialidade"],
        "resumo": ["especialidade", "valor_rs"],
        "completo": ["especialidade", "valor_rs", "diferencial_1", "alta_demanda"],
        "filtro": ("especialidade", "Cardiologia"),
    },
    "exames": {
        "envelope": "exames",
        "rotulos": ["nome_exame"],
        "resumo": ["nome_exame", "valor_particular_rs"],
        "completo": ["nome_exame", "valor_particular_rs", "instrucoes_preparo_completas",
                     "convenio_aceito"],
        "filtro": ("exame", "Colonoscopia"),
    },
    "cirurgias-estimativas": {
        "envelope": "cirurgias_estimativas",
        "rotulos": ["procedimento"],
        "resumo": ["procedimento", "estimativa_total_rs"],
        "completo": ["procedimento", "estimativa_total_rs", "caveat_obrigatorio_ana"],
        "filtro": ("procedimento", "Apendicectomia"),
    },
    "convenios-especialidade": {
        "envelope": "convenios_especialidade",
        "rotulos": ["convenio", "especialidade"],
        "resumo": ["convenio", "especialidade", "cobre"],
        "completo": ["convenio", "especialidade", "cobre"],
        "filtro": ("convenio", "Amil"),
    },
}


def find_env():
    for parent in Path(__file__).resolve().parents:
        if (parent / ".env").is_file():
            return parent / ".env"
    sys.exit("ERRO: .env nao encontrado (esperado na raiz do repo, com HOSPITAL_ANA_API_KEY=...)")


def ler_var(arquivo, nome):
    if not arquivo.is_file():
        return None
    for line in arquivo.read_text().splitlines():
        if line.strip().startswith(f"{nome}="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def api_key():
    """A chave e a mesma que vive no vault do fazer.ai como hospital-ana-api-key.

    Fonte preferida: HOSPITAL_ANA_API_KEY no .env da raiz deste repo. Se nao estiver la, usa a
    original no repo Hospital (ANA_API_KEY em tokens/.env), para nao existir uma copia a mais do
    segredo so por causa deste script.
    """
    chave = ler_var(find_env(), "HOSPITAL_ANA_API_KEY")
    if chave:
        return chave
    origem = Path.home() / "PedroDev" / "Hospital" / "tokens" / ".env"
    chave = ler_var(origem, "ANA_API_KEY")
    if chave:
        return chave
    sys.exit(
        "ERRO: chave da API da Ana nao encontrada.\n"
        "      Esperada como HOSPITAL_ANA_API_KEY no .env da raiz deste repo,\n"
        f"      ou como ANA_API_KEY em {origem}."
    )


CTX = ssl.create_default_context()
KEY = api_key()


def call(path, com_chave=True):
    headers = {"Accept": "application/json"}
    if com_chave:
        headers["X-API-Key"] = KEY
    req = urllib.request.Request(BASE + path, method="GET", headers=headers)
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=30, context=CTX) as r:
            return r.status, r.read().decode("utf-8", "replace"), int((time.time() - t0) * 1000)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), int((time.time() - t0) * 1000)
    except Exception as e:
        return None, f"{type(e).__name__}: {e}", int((time.time() - t0) * 1000)


# O Ana OS nao chama producao (regra do server), entao quem mede e este script: ele
# grava a medida carimbada que a pagina os/integracao.html mostra sempre COM a data
# ao lado. Numero sem data mente sobre o frescor dele. (ADR-0017)
MEDIDA_JSON = Path(__file__).resolve().parents[3] / "os" / "dados" / "integracao-medida.json"


def gravar_medida(medida):
    try:
        MEDIDA_JSON.parent.mkdir(parents=True, exist_ok=True)
        MEDIDA_JSON.write_text(
            json.dumps(medida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"medida gravada em {MEDIDA_JSON.relative_to(MEDIDA_JSON.parents[2])}")
    except OSError as e:
        print(f"AVISO: nao consegui gravar a medida ({e}); o smoke em si nao foi afetado.")


def main():
    resultados = []
    medida = {
        "medido_em": time.strftime("%Y-%m-%d"),
        "teto_plataforma": TETO_PLATAFORMA,
        "base": BASE,
        "tabelas": {},
    }

    def check(nome, ok, detalhe):
        resultados.append((nome, ok, detalhe))
        print(f"[{ok:^6}] {nome}: {detalhe}")

    print(f"Smoke da API da Ana ({BASE})\n")

    # 1. A chave protege: sem header a API tem que recusar.
    code, _, _ = call("/consultas-particulares", com_chave=False)
    if code in (401, 403):
        check("auth fecha sem chave", "OK", f"HTTP {code} sem X-API-Key, como esperado")
    else:
        check("auth fecha sem chave", "FALHOU", f"HTTP {code} sem chave: o endpoint esta aberto")

    # 2. Cada tabela: responde, declara o modo, cabe no teto, e o filtro entrega o detalhe.
    for path, c in CONTRATO.items():
        code, raw, ms = call(f"/{path}")
        if code != 200:
            check(path, "FALHOU", f"HTTP {code}: {raw[:120]}")
            continue
        try:
            doc = json.loads(raw)
            itens = doc[c["envelope"]]
        except Exception:
            check(path, "FALHOU", f"200 mas sem o envelope '{c['envelope']}': {raw[:120]}")
            continue
        modo = doc.get("modo")
        if modo not in ("completo", "resumo", "indice"):
            check(path, "FALHOU", f"corpo sem o campo 'modo' (ou modo desconhecido: {modo!r})")
            continue
        esperados = c.get(modo, c["resumo"])
        faltando = [x for x in esperados if itens and x not in itens[0]]
        if faltando:
            check(path, "FALHOU", f"modo {modo} sem os campos do contrato: {', '.join(faltando)}")
            continue

        registro = {"itens": len(itens), "chars": len(raw), "modo": modo,
                    "cabe": len(raw) <= TETO_PLATAFORMA, "invisiveis": []}
        if registro["cabe"]:
            check(path, "OK", f"modo {modo}, {len(itens)} itens, {len(raw)} chars em {ms}ms "
                              f"(folga de {TETO_PLATAFORMA - len(raw)})")
        else:
            # A linha e visivel enquanto o corte nao a alcanca: o id e unico e aparece antes dela.
            visto = raw[:TETO_PLATAFORMA]
            registro["invisiveis"] = [
                " / ".join(str(r[x]) for x in c["rotulos"])
                for r in itens if str(r.get("id", "")) not in visto
            ]
            check(path, "CORTA", (
                f"modo {modo}, {len(itens)} itens, {len(raw)} chars: "
                f"{len(raw) - TETO_PLATAFORMA} alem do teto. "
                f"A Ana NAO enxerga: {', '.join(registro['invisiveis']) or '(o fim da ultima linha)'}"
            ))
        medida["tabelas"][path] = registro

        # 2b. O caminho do detalhe: sem ele, o modo resumo tira da Ana o que o SOP manda falar.
        param, termo = c["filtro"]
        code, raw, _ = call(f"/{path}?{param}={termo}")
        rotulo = f"{path} ?{param}="
        if code != 200:
            check(rotulo, "FALHOU", f"HTTP {code}: {raw[:120]}")
            continue
        try:
            doc = json.loads(raw)
            itens = doc[c["envelope"]]
        except Exception:
            check(rotulo, "FALHOU", f"200 mas sem o envelope: {raw[:120]}")
            continue
        if not itens:
            check(rotulo, "FALHOU", f"filtro por '{termo}' nao casou nada (o termo saiu da tabela?)")
            continue
        faltando = [x for x in c["completo"] if x not in itens[0]]
        if faltando:
            check(rotulo, "FALHOU", f"filtrado mas sem: {', '.join(faltando)}")
        elif doc.get("modo") != "completo":
            check(rotulo, "FALHOU", f"filtrado e ainda assim modo {doc.get('modo')}")
        else:
            check(rotulo, "OK", f"'{termo}' -> {len(itens)} item(ns), modo completo, "
                                f"{len(raw)} chars: o detalhe chega")
        medida["tabelas"][path]["filtro"] = {"parametro": param, "chars": len(raw)}

    # 3. Ouvidoria: existe o caminho de consulta? (id impossivel; nada e escrito)
    code, raw, _ = call("/ouvidoria/protocolos/0")
    if code == 404 and "rotocolo" in raw:
        check("ouvidoria (consulta)", "OK", "GET /ouvidoria/protocolos/{id} responde 404 tipado para id inexistente")
    elif code == 404:
        check("ouvidoria (consulta)", "FALHOU", "rota de consulta de protocolo nao existe")
    else:
        check("ouvidoria (consulta)", "OK", f"HTTP {code}")

    print()
    falhas = [r for r in resultados if r[1] == "FALHOU"]
    medida["veredito"] = "falhou" if falhas else ("corta" if any(
        not v["cabe"] for v in medida["tabelas"].values()) else "ok")
    gravar_medida(medida)
    cortes = [r for r in resultados if r[1] == "CORTA"]
    if falhas:
        print(f"VEREDITO: {len(falhas)} check(s) FALHARAM: a API tem problema real (ou a chave venceu).")
        sys.exit(1)
    if cortes:
        print(
            f"VEREDITO: API funcional, mas {len(cortes)} tabela(s) passam do teto de {TETO_PLATAFORMA} chars.\n"
            "          Virar a tool dessas tabelas hoje deixa a Ana cega para o fim da lista:\n"
            "          antes, o filtro server-side (?termo=) no endpoint, do lado do Hospital."
        )
        sys.exit(1)
    print("VEREDITO: tudo OK: as tabelas respondem, o contrato bate e todas cabem no que o modelo le.")


if __name__ == "__main__":
    main()
