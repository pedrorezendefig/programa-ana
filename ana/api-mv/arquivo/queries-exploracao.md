# Pacotes de queries: exploração do banco MV (Oracle)

> Todas somente leitura. Executar com usuário read-only, de preferência via conexão direta na sessão Claude (VPN + python-oracledb). Fallback: rodar no SQL Developer/DBeaver e colar os resultados na sessão. Referenciado pela tarefa C2 do `roadmap/TODO.md`.

## Pacote 1: estrutura

```sql
-- 1.1 Em qual schema vivem as tabelas-chave (e volume estimado pelas estatísticas)
SELECT owner, table_name, num_rows, last_analyzed
FROM   all_tables
WHERE  table_name IN ('AGENDA_CENTRAL','IT_AGENDA_CENTRAL','ITEM_AGENDAMENTO',
                      'ESCALA_CENTRAL','ESCALA_CENTRAL_ITEM_AGENDA','GERACAO_AGENDA',
                      'PACIENTE','EXA_RX','ATENDIME','ATENDIME_GLOBAL_HEALTH',
                      'MOT_ALT','MOTIVO_ALTA','PACIENTE_OBITO')
ORDER  BY table_name;

-- 1.2 Colunas + comentários das 8 tabelas de agendamento
SELECT c.table_name, c.column_id, c.column_name, c.data_type, c.nullable, cc.comments
FROM   all_tab_columns c
LEFT   JOIN all_col_comments cc
       ON cc.owner = c.owner AND cc.table_name = c.table_name AND cc.column_name = c.column_name
WHERE  c.table_name IN ('AGENDA_CENTRAL','IT_AGENDA_CENTRAL','ITEM_AGENDAMENTO',
                        'ESCALA_CENTRAL','ESCALA_CENTRAL_ITEM_AGENDA','GERACAO_AGENDA',
                        'PACIENTE','EXA_RX')
ORDER  BY c.table_name, c.column_id;

-- 1.3 Colunas do núcleo de atendimento/desfecho (pós-atendimento)
SELECT c.table_name, c.column_id, c.column_name, c.data_type, cc.comments
FROM   all_tab_columns c
LEFT   JOIN all_col_comments cc
       ON cc.owner = c.owner AND cc.table_name = c.table_name AND cc.column_name = c.column_name
WHERE  c.table_name IN ('ATENDIME','ATENDIME_GLOBAL_HEALTH','MOT_ALT','MOTIVO_ALTA','PACIENTE_OBITO')
ORDER  BY c.table_name, c.column_id;
```

## Pacote 2: relações e amostras (rodar depois do Pacote 1)

```sql
-- 2.1 Chaves estrangeiras entre as tabelas-chave (quem aponta para quem)
SELECT a.table_name  AS filha,
       a.constraint_name,
       b.table_name  AS pai,
       acc.column_name AS coluna_filha
FROM   all_constraints a
JOIN   all_constraints b ON b.constraint_name = a.r_constraint_name AND b.owner = a.r_owner
JOIN   all_cons_columns acc ON acc.constraint_name = a.constraint_name AND acc.owner = a.owner
WHERE  a.constraint_type = 'R'
AND   (a.table_name IN ('AGENDA_CENTRAL','IT_AGENDA_CENTRAL','ITEM_AGENDAMENTO',
                        'ESCALA_CENTRAL','ESCALA_CENTRAL_ITEM_AGENDA','GERACAO_AGENDA','EXA_RX')
   OR  b.table_name IN ('AGENDA_CENTRAL','ITEM_AGENDAMENTO','PACIENTE','ATENDIME'))
ORDER  BY a.table_name;

-- 2.2 Amostra de horários da Central de Marcações (prefixar owner conforme 1.1)
SELECT * FROM IT_AGENDA_CENTRAL WHERE ROWNUM <= 5;

-- 2.3 Motivos de alta (candidato a filtro de desfecho do pós-atendimento)
-- Pesquisa ultracode (03/jul): no MV clássico a tabela é MOT_ALT
-- (CD_MOT_ALT, DS_MOT_ALT, TP_MOT_ALTA, SN_ATIVO), com TP_MOT_ALTA = 'O' = óbito.
-- Tentar MOT_ALT primeiro; MOTIVO_ALTA como fallback. Hipóteses de joins completas
-- (incluindo a consulta-base do pós-atendimento) em ana/api-mv/perguntas-global-health.md.
SELECT * FROM MOT_ALT WHERE ROWNUM <= 50;
```

## Pacote 3: amostras dirigidas (rodar depois dos Pacotes 1 e 2)

> Prefixar cada tabela com o owner descoberto na query 1.1 (ex.: `DBAMV.PACIENTE`).
> ATENÇÃO: os resultados deste pacote contêm dados pessoais (nome, celular com DDD).
> Salvar SEMPRE em `ana/api-mv/resultados/amostras/`, que fica fora do git (.gitignore).

```sql
-- 3.1 Paciente: ver as colunas de contato reais (celular com DDD, telefone, e-mail)
SELECT * FROM PACIENTE WHERE ROWNUM <= 5;

-- 3.2 Item de agendamento: a unidade que a Central de Marcações manipula
SELECT * FROM ITEM_AGENDAMENTO WHERE ROWNUM <= 5;

-- 3.3 Atendimento: núcleo do pós-atendimento (tipo, datas, motivo de alta)
SELECT * FROM ATENDIME WHERE ROWNUM <= 5;

-- 3.4 Ponte com a API Global Health: como um agendamento via API aparece no banco
SELECT * FROM ATENDIME_GLOBAL_HEALTH WHERE ROWNUM <= 5;

-- 3.5 Agenda central e horários: estrutura viva da agenda
SELECT * FROM AGENDA_CENTRAL WHERE ROWNUM <= 5;
```

## Como exportar e onde salvar (DBeaver)

1. Rodar a query → clicar com o botão direito na grade de resultados → **Export resultset** → CSV (UTF-8, separador `;`).
2. Nomear pelo número da query: `1-1-owners.csv`, `1-2-colunas-agendamento.csv`, `2-1-fks.csv`...
3. Salvar em:
   - `ana/api-mv/resultados/` → estrutura e metadados (Pacotes 1 e 2, exceto 2.2): entram no git.
   - `ana/api-mv/resultados/amostras/` → qualquer resultado com dados de paciente (2.2 e todo o Pacote 3): fora do git.
4. Avisar na sessão Claude (`/check` ou mensagem): eu digiro os arquivos, escrevo o dicionário de colunas (C3) e o diagrama do fluxo de agendamento.
