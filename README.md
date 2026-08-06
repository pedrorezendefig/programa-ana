# Programa Ana - Hospital São Matheus

Repositório de trabalho da VITTA TECH para os agentes de IA do Hospital São Matheus (Bangu/RJ). O produto principal é a **Ana**, agente de atendimento e agendamento via WhatsApp/Telegram, rodando na plataforma **fazer.ai agents** (com Chatwoot para as conversas e Langfuse para observabilidade e custo).

## Estado do programa (ago/2026)

- A Ana **migrou do n8n para a plataforma fazer.ai agents** (onboarding em 29/jul, tenant `vitta-tech`, agente id 1, modelo `gpt-5-mini`).
- As tabelas de negócio (preços de consultas, exames, estimativas de cirurgia, cobertura de convênios) vivem no **NocoDB** e são lidas ao vivo pela Ana via tools HTTP.
- O estágio de **testes de viabilidade foi concluído em 06/ago/2026**: os 10 cenários principais do Roteiro de cenários passaram (`roadmap/roteiro-cenarios.md`).
- A integração com o sistema MV do hospital (API Global Health) é o próximo horizonte, ainda em desenho (pendência GH1 no roadmap).
- O estado vivo do programa mora em `roadmap/TODO.md` (narrativa) e `os/dados/roadmap.json` (dados do cockpit). Os dois andam sempre juntos.

## Mapa do repositório

| Pasta | Conteúdo |
|---|---|
| `CONTEXT.md` | Glossário do domínio (linguagem canônica do projeto) |
| `CLAUDE.md` | Regras de trabalho para sessões Claude Code neste repositório |
| `roadmap/` | O estado do programa: `TODO.md` (verdade narrativa), `roteiro-cenarios.md` (critério de pronto do estágio, com resultados), e `arquivo/` (roadmap anterior, acervo de consulta) |
| `os/` | **Ana OS**, o cockpit local do programa: home com roadmap e grafo de execução, Mapa das APIs, arquitetura, bancada da API GH, Atlas da produção, Biblioteca de docs |
| `ana/prompt/` | Histórico do system prompt (o prompt vigente é editado direto na plataforma fazer.ai) |
| `ana/base-conhecimento/` | Snapshot das tabelas de negócio importadas no NocoDB |
| `ana/api-mv/` | Estudo do banco Oracle do MV (dicionário de colunas, scripts de consulta TST) e da API Global Health |
| `ana/workflows/` | Exports dos workflows da era n8n (desativados; acervo) |
| `ana/briefings/` | Briefings da direção do hospital |
| `docs/` | Arquitetura da integração de agendamento (era n8n; consulta) e ADRs em `docs/adr/` |
| `pos-atendimento/` | Specs do futuro agente de pós-atendimento (a construir) |
| `contrato/` | Contrato de Serviços Contínuos da VITTA TECH |

## Como entrar no projeto (passo a passo para sócios)

**1. Clonar e ler.** Só com o clone você já tem tudo que explica o programa, sem precisar de nenhuma chave:

- `roadmap/TODO.md`: onde estamos, o que foi feito, o que falta e por quê.
- `roadmap/roteiro-cenarios.md`: o que a Ana provou que sabe fazer, cenário por cenário.
- `CONTEXT.md`: o vocabulário (o que é kanban, handoff, tabela oficial, etc.).
- ADRs em `docs/adr/`: as decisões de arquitetura e as razões.

**2. Abrir o cockpit (opcional, recomendado).** Com Python 3 instalado:

```bash
python3 os/server.py
# abrir http://localhost:8777
```

A home mostra o roadmap, o grafo de execução e os painéis. As páginas que consultam APIs externas (bancada GH, conexão TST) precisam de credenciais e vão apontar isso; o resto funciona sem nada.

**3. Operar a Ana (exige acessos, fale com o Pedro).** O repositório documenta, mas a operação acontece nas plataformas:

- **Chatwoot** (conversas reais e de teste): conta criada por convite.
- **Langfuse** (custo e traces por resposta): conta criada por convite.
- **fazer.ai agents** (prompt, ferramentas e configuração do agente): operado via MCP em sessões Claude Code; o token é pessoal e nunca entra no git.
- **NocoDB** (tabelas de preços e cobertura): convite como editor quando for a hora (tarefa V9 do roadmap).

**4. Trabalhar com Claude Code (o fluxo padrão do projeto).** As sessões de trabalho usam o Claude Code aberto neste diretório. O comando `/check` lê o estado, reconcilia o roadmap e devolve orientação de próximos passos. O `CLAUDE.md` da raiz contém as regras que as sessões seguem (o que pode e o que não pode).

## Segurança: o que NUNCA entra neste repositório

O `.gitignore` já bloqueia, mas a regra vale para qualquer arquivo novo:

- **`.env`** (raiz): credenciais do Oracle TST e token da API Global Health de homologação. Cada pessoa recebe o seu por canal seguro (nunca por commit, nunca por grupo de WhatsApp).
- **`dados-locais/`** e **`amostras/`**: planilhas e extrações com dado pessoal de paciente (LGPD).
- **Tokens de plataforma** (Chatwoot admin, fazer.ai MCP, Cloudflare, Coolify): não têm arquivo no repo de propósito; vivem nos cofres/painéis de cada serviço.
- Credenciais de **produção** do hospital: jamais nesta máquina ou neste repo; produção é acessada só pelo Pedro, manualmente.

Na dúvida: se o arquivo tem senha, token ou nome/CPF de paciente, ele não entra no git.
