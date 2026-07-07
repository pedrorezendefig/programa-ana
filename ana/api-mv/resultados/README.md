# Resultados das queries de exploração do banco MV (Oracle)

Destino dos exports do DBeaver, conforme `ana/api-mv/queries-exploracao.md`.

- **Aqui na raiz:** estrutura e metadados (owners, colunas, comentários, FKs, MOT_ALT). Entram no git: são o insumo do dicionário de colunas (`C3`) e do mapa de desfecho (`C4`).
- **`amostras/`:** qualquer resultado com dados de paciente (nome, celular, CPF...). Fica **fora do git** (ver `.gitignore` na raiz do repo). O estudo acontece na sessão; o dado bruto não entra em histórico de versão.

Convenção de nome: número da query + resumo, ex.: `1-1-owners.csv`, `2-1-fks.csv`, `amostras/3-1-paciente.csv`.

Depois de salvar arquivos aqui, rode `/check` (ou só me avise na sessão): eu digiro os resultados e escrevo o dicionário e os diagramas.

## Inventário (07/jul/2026)

| Arquivo | Query | Conteúdo |
|---|---|---|
| `1-1-owners.csv` | 1.1 | owner (`DBAMV`) + volumetria das 13 tabelas |
| `1-2-colunas-agendamento.csv` | 1.2 | colunas + comentários das 8 tabelas de agendamento |
| `1-3-colunas-atendimento.csv` | 1.3 | colunas de ATENDIME, ATENDIME_GLOBAL_HEALTH, MOT_ALT, MOTIVO_ALTA, PACIENTE_OBITO |
| `2-1-fks.csv` | 2.1 | FKs entre as tabelas-chave (e as filhas de PACIENTE/ATENDIME) |
| `2-3-motivos-alta.csv` | 2.3 | catálogo real `MOT_ALT` (28 motivos, tipos A/D/T/O) |
| `amostras/2-2-it-agenda-central.csv` | 2.2 | 5 slots reais, com dado de paciente (fora do git) |
| `amostras/3-1-paciente.csv` ... `3-5-agenda-central.csv` | 3.1 a 3.5 | amostras dirigidas (fora do git) |

Nota: a query 3.4 (`ATENDIME_GLOBAL_HEALTH`) retornou 0 linhas: a tabela existe e está vazia neste banco (nenhum agendamento via API GH jamais registrado aqui). Digestão completa em `../dicionario-colunas.md`.
