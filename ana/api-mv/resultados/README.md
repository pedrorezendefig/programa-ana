# Resultados das queries de exploração do banco MV (Oracle)

Destino dos exports do DBeaver, conforme `ana/api-mv/queries-exploracao.md`.

- **Aqui na raiz:** estrutura e metadados (owners, colunas, comentários, FKs, MOT_ALT). Entram no git: são o insumo do dicionário de colunas (`C3`) e do mapa de desfecho (`C4`).
- **`amostras/`:** qualquer resultado com dados de paciente (nome, celular, CPF...). Fica **fora do git** (ver `.gitignore` na raiz do repo). O estudo acontece na sessão; o dado bruto não entra em histórico de versão.

Convenção de nome: número da query + resumo, ex.: `1-1-owners.csv`, `2-1-fks.csv`, `amostras/3-1-paciente.csv`.

Depois de salvar arquivos aqui, rode `/check` (ou só me avise na sessão): eu digiro os resultados e escrevo o dicionário e os diagramas.
