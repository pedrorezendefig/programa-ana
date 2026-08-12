#!/usr/bin/env python3
"""Compila o prompt da Ana a partir da fonte do trio lógico (ADR-0012).

Fonte (este diretório):
  nucleo-comum.md          esqueleto transversal, com o marcador {{BLOCOS_SOP}}
  bloco-orquestradora.md   triagem, identificação, convênio, apoio, encerramento
  bloco-particular.md      valores, ancoragem, agendamento particular (P6 gated)
  bloco-ouvidoria.md       manifestações

Uso:
  python3 compilar.py            -> gera prompt-compilado.md (P6 fora)
  python3 compilar.py --com-p6   -> inclui os trechos <!-- @gated:P6 --> (só após GH-19/GH-18)

O texto dos blocos é publicado como está; regiões entre <!-- @gated:... --> e
<!-- @/gated:... --> são removidas por padrão. A publicação na plataforma é feita
por sessão Claude via prompt_set, carimbando a versão no log do roadmap.
"""
import re
import sys
from pathlib import Path

AQUI = Path(__file__).parent
BLOCOS = [
    ("ANA ORQUESTRADORA", "bloco-orquestradora.md",
     "triagem de urgência, identificação, convênio, confirmação, prontuário, dúvidas, fora do horário, encerramento"),
    ("PARTICULAR", "bloco-particular.md",
     "valores, ancoragem, agendamento particular de consultas e exames, cirurgias"),
    ("OUVIDORIA", "bloco-ouvidoria.md",
     "manifestações, guardrails jurídicos, registro"),
]
GATED_RE = re.compile(r"<!-- @gated:\S+.*?<!-- @/gated:\S+ -->\n?", re.DOTALL)


def banner(nome: str, escopo: str) -> str:
    return (
        "<!-- =============================================================== -->\n"
        f"<!-- BLOCO LÓGICO: {nome} ({escopo}) -->\n"
        "<!-- =============================================================== -->\n"
    )


def compilar(com_p6: bool) -> str:
    nucleo = (AQUI / "nucleo-comum.md").read_text()
    partes = []
    for nome, arquivo, escopo in BLOCOS:
        corpo = (AQUI / arquivo).read_text()
        if not com_p6:
            corpo = GATED_RE.sub("", corpo)
        partes.append(banner(nome, escopo) + "\n" + corpo.strip("\n"))
    sop = "\n\n".join(partes)
    if "{{BLOCOS_SOP}}" not in nucleo:
        sys.exit("erro: marcador {{BLOCOS_SOP}} ausente em nucleo-comum.md")
    return nucleo.replace("{{BLOCOS_SOP}}", sop)


if __name__ == "__main__":
    com_p6 = "--com-p6" in sys.argv
    prompt = compilar(com_p6)
    destino = AQUI / "prompt-compilado.md"
    destino.write_text(prompt)
    print(f"gerado: {destino}")
    print(f"tamanho: {len(prompt)} chars (P6 {'INCLUÍDO' if com_p6 else 'fora'})")
    if len(prompt) > 100_000:
        print("AVISO: acima do teto de 100.000 da plataforma")
