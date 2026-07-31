-- 00-3: colunas das tabelas dos dominios novos, so as com dados, na PRODUCAO
-- Bloco 00: catalogo e metadados
-- Saida: 00-3-colunas-novos-dominios.csv (camada commitavel, resultados/)
-- Responde: insumo do ciclo 2 (C9), habilita queries diretas de
--   cirurgia/leito/faturamento no proximo ciclo
SELECT c.TABLE_NAME,
       c.COLUMN_ID,
       c.COLUMN_NAME,
       c.DATA_TYPE,
       cc.COMMENTS
FROM   ALL_TAB_COLUMNS c
JOIN   ALL_TABLES t
       ON t.OWNER = c.OWNER
      AND t.TABLE_NAME = c.TABLE_NAME
      AND NVL(t.NUM_ROWS, 0) > 0
LEFT JOIN ALL_COL_COMMENTS cc
       ON cc.OWNER = c.OWNER
      AND cc.TABLE_NAME = c.TABLE_NAME
      AND cc.COLUMN_NAME = c.COLUMN_NAME
WHERE  c.OWNER = 'DBAMV'
  AND (   c.TABLE_NAME LIKE '%CIRUR%'
       OR c.TABLE_NAME LIKE 'AVISO%'
       OR c.TABLE_NAME LIKE '%LEITO%'
       OR c.TABLE_NAME LIKE '%INTERNA%'
       OR c.TABLE_NAME LIKE '%FATUR%'
       OR c.TABLE_NAME LIKE 'CONTA%'
       OR c.TABLE_NAME LIKE '%GUIA%')
ORDER BY c.TABLE_NAME, c.COLUMN_ID;
