"""O Cockpit e o /check leem os papéis de triage, não as labels antigas.

As labels `canal:*` e `radar` da Ana migraram para os papéis do fluxo:
`canal:comigo` vira `ready-for-agent`; `canal:dispare` e `canal:aguardando`
viram `ready-for-human`; `radar` vira `needs-triage`. O `os/roadmap_github.py`
traduz o papel para a chave de canal que o Cockpit já desenha.
"""

from __future__ import annotations

import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "os"))
import roadmap_github  # noqa: E402

CORPO = "## Gesto\nmandar a mensagem\n## Prompt\ntexto"


def _item(*labels: str, eventos=()):
    it = {"number": 7, "title": "t", "state": "OPEN", "body": CORPO,
          "labels": [{"name": n} for n in labels]}
    return roadmap_github._issue_para_item(it, list(eventos), [])


def test_ready_for_human_cai_na_raia_do_pedro_com_a_idade_da_label() -> None:
    eventos = [{"event": "labeled", "label": {"name": "ready-for-human"}, "created_at": "2026-10-01T10:00:00Z"}]
    item = _item("ready-for-human", "area:global-health", eventos=eventos)
    assert (item["canal"], item["canal_desde"], item["radar"]) == ("dispare", "2026-10-01", False)


def test_ready_for_agent_e_in_progress_caem_na_raia_da_sessao() -> None:
    assert _item("ready-for-agent")["canal"] == "comigo"
    assert _item("in-progress")["canal"] == "comigo"


def test_needs_triage_e_o_radar_e_labels_antigas_nao_contam_mais() -> None:
    assert _item("needs-triage")["radar"] is True
    antigo = _item("canal:dispare", "radar")
    assert (antigo["canal"], antigo["radar"]) == (None, False)
