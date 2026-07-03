# TODO — Programa Ana

> Hub de pendências acionáveis, em três trilhas. O roadmap visual (`index.html`) conta a história; este arquivo é a lista de trabalho. Marcar com `[x]` ao concluir e commitar.

## Trilha 1 — Curva de aprendizado: banco MV (Oracle)

Objetivo: dominar o modelo de dados que sustenta agendamento (Fase 1) e desfecho de atendimento (Fase 3), começando pelas 8 tabelas que o hospital já movimenta via banco (ver `ana/api-mv/dicionario-tabelas-mv.md`).

- [ ] Conseguir credencial Oracle SOMENTE LEITURA com o TI (usuário, host, porta, service name) e confirmar em quais schemas as tabelas vivem (MVBIKE? MVINTEGRA?)
- [ ] Decidir o modo de execução (recomendação: conexão direta desta sessão via VPN + python-oracledb; fallback: Pedro executa o pacote de queries abaixo e cola os resultados)
- [ ] Rodar o Pacote 1 (estrutura) e gerar `ana/api-mv/dicionario-colunas.md`
- [ ] Rodar o Pacote 2 (relações e volumes) e desenhar o diagrama do fluxo de agendamento no banco
- [ ] Mapear onde vive o DESFECHO do atendimento (`ATENDIME` + motivo de alta/óbito) para o filtro do pós-atendimento
- [ ] Investigar `ATENDIME_GLOBAL_HEALTH` (a ponte MV ↔ Global Health): o que a integração grava lá?
- [ ] Cruzar o aprendizado com o Power BI (módulo SCMA, filtro de esquema MVBIKE/MVINTEGRA) para ver quais KPIs o hospital já acompanha
- [ ] Validar com o analista a leitura do encadeamento agenda → horário → paciente

### Pacote 1 — Estrutura (read-only, colar resultado de volta)

```sql
-- 1.1 Em qual schema vivem as tabelas-chave (e volume estimado pelas estatísticas)
SELECT owner, table_name, num_rows, last_analyzed
FROM   all_tables
WHERE  table_name IN ('AGENDA_CENTRAL','IT_AGENDA_CENTRAL','ITEM_AGENDAMENTO',
                      'ESCALA_CENTRAL','ESCALA_CENTRAL_ITEM_AGENDA','GERACAO_AGENDA',
                      'PACIENTE','EXA_RX','ATENDIME','ATENDIME_GLOBAL_HEALTH','MOTIVO_ALTA')
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
WHERE  c.table_name IN ('ATENDIME','ATENDIME_GLOBAL_HEALTH','MOTIVO_ALTA')
ORDER  BY c.table_name, c.column_id;
```

### Pacote 2 — Relações e amostras (rodar depois do Pacote 1)

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

-- 2.2 Amostra de horários da Central de Marcações (ajustar owner conforme 1.1)
SELECT *
FROM   IT_AGENDA_CENTRAL
WHERE  ROWNUM <= 5;

-- 2.3 Distribuição de motivos de alta (o candidato a filtro de desfecho)
SELECT ma.*
FROM   MOTIVO_ALTA ma
WHERE  ROWNUM <= 50;
```

## Trilha 2 — Execução do programa (espelho acionável do roadmap)

### Fase 0 — Hotfix (agora)
- [ ] Redigir `Ana_System_Prompt.md` corrigido (urgência Regra 1, Regra 6, exclusão ouvidoria↔comercial, guardrails jurídicos, acentuação, tag `fora-horario`, etapa órfã, Seção 8.4)
- [ ] Colar no nó `Agente IA Hospital` do n8n (ou aplicar via API key do n8n)
- [ ] Migrar token Chatwoot para Credential do n8n + rotacionar o token
- [ ] Re-exportar os workflows para `ana/workflows/` e commitar
- [ ] Rodar validação em sombra por período curto

### Trilha paralela — Pesquisa ultracode
- [ ] Disparar a sessão com `roadmap/prompt-sessao-ultracode.md` (Pedro)
- [ ] Revisar os 8 artefatos entregues e commitar decisões

### Fase 1 — Integração MV
- [ ] Token Global Health homolog + prod e limites de chamadas (EXTERNO)
- [ ] Construir subfluxos MVP na ordem T6 → T1 → T2 → T5 → T7
- [ ] Estado em `custom_attributes` + limpeza no `/reset`
- [ ] Classificador de urgência antes do agente
- [ ] SOP v2 no agente + etapa `FALHA AGENDAMENTO — FILA` + tags novas no Kanban
- [ ] Checklist de homologação → canário → produção
- [ ] Termo de Entregável da Ana (+R$ 2.000/mês)

### Fase 3 — Pós-atendimento (pré-condições)
- [ ] Fonte MV com serviço, data, setor/profissional e DESFECHO (depende da Trilha 1)
- [ ] Base legal LGPD do contato proativo (jurídico do hospital)
- [ ] Template utility de abertura + teste de classificação com amostra

## Trilha 3 — Insumos a coletar (fora do repo)

- [ ] Materiais adicionais que o Felipe disse que vai mandar (deixar em `ana/briefings/`)
- [ ] Esquemas MVBIKE e MVINTEGRA: confirmação de qual é o schema canônico de leitura
- [ ] Acesso/prints do Power BI (módulo SCMA) ou varredura via Chrome nesta sessão
- [ ] Decisão do Felipe: postura do convite ao Google (amplo vs contextual)
