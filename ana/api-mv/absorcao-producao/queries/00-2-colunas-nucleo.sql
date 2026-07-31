-- 00-2: colunas e comentarios das tabelas do nucleo, na PRODUCAO
-- Bloco 00: catalogo e metadados
-- Saida: 00-2-colunas-nucleo.csv (camada commitavel, resultados/)
-- Responde: confirma que a estrutura da producao bate com a TST (pre-condicao
--   de todo o dicionario C3), C6-3 (NULLABLE de CD_MOT_ALT), C6-6 (estrutura)
SELECT c.TABLE_NAME,
       c.COLUMN_ID,
       c.COLUMN_NAME,
       c.DATA_TYPE,
       c.DATA_LENGTH,
       c.NULLABLE,
       cc.COMMENTS
FROM   ALL_TAB_COLUMNS c
LEFT JOIN ALL_COL_COMMENTS cc
       ON cc.OWNER = c.OWNER
      AND cc.TABLE_NAME = c.TABLE_NAME
      AND cc.COLUMN_NAME = c.COLUMN_NAME
WHERE  c.OWNER = 'DBAMV'
  AND  c.TABLE_NAME IN ('PACIENTE', 'ATENDIME', 'IT_AGENDA_CENTRAL',
                        'AGENDA_CENTRAL', 'ESCALA_CENTRAL', 'ITEM_AGENDAMENTO',
                        'EXA_RX', 'ATENDIME_GLOBAL_HEALTH', 'MOT_ALT',
                        'PACIENTE_OBITO', 'CONVENIO', 'CON_PLA', 'PRESTADOR')
ORDER BY c.TABLE_NAME, c.COLUMN_ID;
