# Programa Ana & CRM — Hospital São Matheus

Repositório de trabalho da VITTA TECH para os agentes de IA do Hospital São Matheus (Bangu/RJ): a **Ana** (atendimento e agendamento via WhatsApp) e o futuro **agente de pós-atendimento** (pesquisa de satisfação proativa).

## Mapa do repositório

| Pasta | Conteúdo |
|---|---|
| `CONTEXT.md` | Glossário do domínio (linguagem canônica do projeto) |
| `docs/` | Arquitetura da integração de agendamento: visão geral, catálogo de funções, as 7 tools, fluxos conversacionais, SOP reescrito, guia de implementação n8n, ADRs e painel visual |
| `ana/prompt/` | System prompt da Ana em produção (`Ana_System_Prompt.md`) e visor HTML |
| `ana/workflows/` | Exports dos workflows n8n em produção (`Ana.json` + subfluxos) |
| `ana/api-mv/` | Documentação da API Global Health/MV (`doc_whatsapp_agendamento_1.10.pdf`) e, futuramente, os esquemas de banco MVBIKE e MVINTEGRA |
| `ana/briefings/` | Briefings da direção do hospital (Felipe Malafaia) |
| `pos-atendimento/` | Specs e templates Meta do agente de pós-atendimento (a construir) |
| `roadmap/` | Roadmap visual do programa e guia de condução do projeto |
| `contrato/` | Contrato de Serviços Contínuos da VITTA TECH (fonte, build e gerados) |

## Estado do sistema (jul/2026)

- **Em produção:** workflow `Ana` no n8n (Chatwoot + gpt-5.2 + RAG Google Sheets + funil Kanban). Sem integração com a API de agenda; agendamento real ainda não existe.
- **Projetado, não construído:** as 7 tools de agendamento via API Global Health/MV (ver `docs/02-arquitetura-agendamento.md` e `docs/05-guia-implementacao-n8n.md`).
- Os exports em `ana/workflows/` refletem a produção. Ao alterar um workflow no n8n, re-exportar o JSON para cá e commitar.

## Regras de trabalho

- O prompt da Ana é editado em `ana/prompt/Ana_System_Prompt.md` e colado no nó `Agente IA Hospital`; os dois devem permanecer idênticos.
- Decisões de arquitetura viram ADR em `docs/adr/`. Termos do domínio vivem no `CONTEXT.md`.
- O guia de execução com árvore de dependências é `roadmap/TODO.md`. Para atualizar a fronteira e receber orientação de próximos passos, digite `/check` numa sessão Claude Code aberta neste diretório.
