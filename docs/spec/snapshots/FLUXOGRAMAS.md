# FLUXOGRAMAS.md
<!-- gerado por /snapshot; não editar à mão -->

Diagramas curados no `snapshot.py` (não saem do código). Subset `flowchart TD` aceito
pelo `coletor/diagramas.py` do PedroOS.

## Contexto: quem conversa com quem

```mermaid
flowchart TD
    PAC[Paciente<br/>no WhatsApp] -- manda mensagem --> CW[Chatwoot<br/>inbox do atendimento]
    CW -- Agent Bot --> ANA[fazer.ai agents<br/>com a Ana]
    ANA -- responde --> CW
    ANA -- traces --> LF[Langfuse]
    ANA -- preços e ouvidoria --> APIH[API do Hospital]
    ANA -- agenda --> GH[Global Health<br/>API de agendamento]
    GH -- finalização grava --> MV[Oracle MV TST<br/>só leitura daqui]
    SCR[Scripts locais<br/>query-mv, smoke-gh, gerar.py] -- homologação --> GH
    SCR -- SELECT --> MV
    SCR -- lista ferramentas --> ANA
    SCR -- gera --> RET[Retrato<br/>na Vercel]
    RET -- lê ferramentas --> ANA
```

O paciente fala só com o WhatsApp do hospital; o Chatwoot entrega a conversa à Ana
na fazer.ai agents, que registra cada execução no Langfuse. A Ana lê preços e grava a
ouvidoria na API do Hospital e marca pela Global Health, que só grava no Oracle do MV
na finalização. Os scripts locais chamam a homologação da Global Health,
consultam a base TST em leitura e montam o Retrato publicado na Vercel.
