---
name: snapshot
description: "Mantém docs/spec/snapshots/ (estrutura, rotas, entidades, schema, migrations, integrações, fluxogramas) gerado a partir do repositório da Ana: os/server.py, o dicionário do MV e as chaves de env do código. Sintaxe `python3 .claude/skills/snapshot/scripts/snapshot.py [--check]`."
---

# snapshot

Gera os sete arquivos de `docs/spec/snapshots/` a partir do repositório, para quem chega ter um mapa do Programa Ana sem manter nada à mão. Os nomes são os mesmos do Hospital e do IAE: `ESTRUTURA.md`, `ROTAS.md`, `ENTIDADES.md`, `SCHEMA.md`, `MIGRATIONS.md`, `INTEGRACOES.md` e `FLUXOGRAMAS.md`. A aba Documentação > Mapa do painel lê esses arquivos por `tools/workflow-dashboard/areas.py` e `diagramas.py`, então o formato é o contrato.

## Como rodar

```bash
python3 .claude/skills/snapshot/scripts/snapshot.py           # regenera o que mudou
python3 .claude/skills/snapshot/scripts/snapshot.py --check   # só confere: sai com 1 e lista o que mudaria
```

O script não commita. Quem roda decide se o resultado entra no PR. Os arquivos não levam data, para o `--check` não acusar só o relógio.

## O que cada arquivo traz

| Arquivo | Fonte |
|---|---|
| `ESTRUTURA.md` | As pastas que o git conhece (rastreadas e novas não ignoradas), dois níveis abaixo de cada pasta da raiz. Ficam fora `dados-locais/`, `amostras/` e `__pycache__/`. |
| `ROTAS.md` | As rotas HTTP do `os/server.py` (o servidor local do Ana OS), lidas por AST dos `do_GET`/`do_POST`. A descrição é a primeira frase da docstring da função chamada. |
| `ENTIDADES.md` | As tabelas do MV já estudadas, lidas das seções `###` de `ana/api-mv/dicionario-colunas.md`. É o banco externo do hospital (Oracle, base TST), só leitura. |
| `SCHEMA.md` | O `erDiagram` dessas tabelas; as ligações saem do flowchart do fluxo do agendamento no mesmo dicionário. |
| `MIGRATIONS.md` | Uma linha: o programa não tem migrations próprias. |
| `INTEGRACOES.md` | O NOME das chaves de ambiente que o código lê, agrupadas por serviço externo (Global Health, Oracle MV, fazer.ai agents, Chatwoot). Nunca o valor. Fica fora `tools/` e `.claude/`. |
| `FLUXOGRAMAS.md` | O diagrama de contexto (paciente, Chatwoot, fazer.ai agents com a Ana, Langfuse, API do Hospital, Global Health, Oracle MV TST, Ana OS, Retrato), curado na constante `CONTEXTO` do script, no subset `flowchart TD` que o `diagramas.py` aceita. |

## Quando mexer no script

- Serviço externo novo com chave no código: some a linha em `SERVICOS`. Chave sem serviço mapeado cai em "Outras chaves".
- Tabela nova estudada: escreva a seção `### \`DBAMV.TABELA\`` no dicionário; o snapshot pega sozinho. O verbete de uma linha vai em `tools/workflow-dashboard/static/content/tabelas.js`.
- Peça nova no contexto: edite `CONTEXTO`. Nó com texto em `[...]`, quebra com `<br/>`, aresta `A -- rótulo --> B`; nada de parênteses no texto do nó.
