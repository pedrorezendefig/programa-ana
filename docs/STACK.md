# Stack do programa Ana

O que o programa usa hoje, peça por peça. Peça nova entra aqui no mesmo PR que a traz.

## A Ana no ar

| Peça | Para que serve |
|---|---|
| WhatsApp (API da Meta) e Telegram | Os canais por onde o paciente conversa com a Ana. |
| Chatwoot | A central de atendimento: toda mensagem entra e sai por ela, e a equipe assume a conversa quando a Ana passa para humano. |
| fazer.ai agents | A plataforma onde a Ana roda: o prompt, as ferramentas e a configuração do agente. Operada pelo MCP da fazer.ai nas sessões do Claude Code. |
| Langfuse | Os traces de cada resposta e o custo por conversa. |
| API do Hospital | Dados do hospital que a Ana consulta (convênios, preparos, preços). |
| API Global Health | A agenda online do hospital: especialidades, horários, cadastro e marcação. Só homologação nas ferramentas locais. |
| Oracle do MV (base TST) | O banco do sistema do hospital, só leitura, para provar que a marcação chegou. Produção é só o Pedro, à mão. |

## As ferramentas do repositório

| Peça | Para que serve |
|---|---|
| Retrato da Ana (`retrato/`) | O site estático para o diretor do hospital, publicado na Vercel pelo Pedro. |
| Bancada (`ana/bancada/`) | Os cenários de conversa que testam a Ana de ponta a ponta, com o painel ao vivo no Claude Code. |
| GitHub (Issues, PRs e Actions) | O estado do programa e o fluxo de trabalho: cada mudança entra por issue e PR, com CI. |
| Claude Code | As sessões que planejam, implementam e revisam, pelas skills do fluxo (`/ask-ana`). |
