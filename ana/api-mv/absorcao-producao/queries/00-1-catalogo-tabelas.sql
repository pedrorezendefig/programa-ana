-- 00-1: catalogo de tabelas por dominio na PRODUCAO
-- Bloco 00: catalogo e metadados
-- Saida: 00-1-catalogo-tabelas.csv (camada commitavel, resultados/)
-- Responde: C6-1 (retrato da producao), GH-19 (contexto de massa),
--   base da descoberta dos blocos 20/30/40, insights 4, 9, 10, 11
SELECT t.OWNER,
       t.TABLE_NAME,
       t.NUM_ROWS,
       t.LAST_ANALYZED,
       c.COMMENTS
FROM   ALL_TABLES t
LEFT JOIN ALL_TAB_COMMENTS c
       ON c.OWNER = t.OWNER
      AND c.TABLE_NAME = t.TABLE_NAME
WHERE  t.OWNER IN ('DBAMV', 'DBAPS')
  AND (   t.TABLE_NAME LIKE '%AGENDA%'
       OR t.TABLE_NAME LIKE '%ATENDIME%'
       OR t.TABLE_NAME LIKE '%PACIENTE%'
       OR t.TABLE_NAME LIKE '%CONVENIO%'
       OR t.TABLE_NAME LIKE '%CIRUR%'
       OR t.TABLE_NAME LIKE 'AVISO%'
       OR t.TABLE_NAME LIKE 'SOS_%'
       OR t.TABLE_NAME LIKE '%LEITO%'
       OR t.TABLE_NAME LIKE '%INTERNA%'
       OR t.TABLE_NAME LIKE '%URGENC%'
       OR t.TABLE_NAME LIKE '%EMERG%'
       OR t.TABLE_NAME LIKE '%TRIAGEM%'
       OR t.TABLE_NAME LIKE '%FATUR%'
       OR t.TABLE_NAME LIKE 'CONTA%'
       OR t.TABLE_NAME LIKE '%GUIA%'
       OR t.TABLE_NAME LIKE '%TISS%'
       OR t.TABLE_NAME LIKE '%GLOSA%'
       OR t.TABLE_NAME LIKE 'MOT_ALT%'
       OR t.TABLE_NAME LIKE 'MOTIVO_ALTA%'
       OR t.TABLE_NAME LIKE '%OBITO%'
       OR t.TABLE_NAME LIKE 'ESCALA%'
       OR t.TABLE_NAME LIKE 'ITEM_AGENDAMENTO%'
       OR t.TABLE_NAME LIKE 'EXA_RX%'
       OR t.TABLE_NAME LIKE 'PRESTADOR%')
ORDER BY t.NUM_ROWS DESC NULLS LAST, t.OWNER, t.TABLE_NAME;
