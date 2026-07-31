-- 40-1: descoberta das tabelas de faturamento, contas e TISS na PRODUCAO
-- Bloco 40: faturamento e convenios
-- Saida: 40-1-faturamento-descoberta.csv (camada commitavel, resultados/)
-- Responde: alimenta o ciclo 2 (C9) para receita por convenio, glosa e conta
-- Candidatas conhecidas: FFAS_ITENS_ATENDIMENTO, FFIS_ITENS_ATENDIMENTO,
--   VDIC_FATURAR_CONTA_CONVENIO (usadas como PADRAO de descoberta, nunca como FROM direto)
SELECT t.OWNER,
       t.TABLE_NAME,
       t.NUM_ROWS,
       t.LAST_ANALYZED,
       c.COMMENTS
FROM   ALL_TABLES t
LEFT JOIN ALL_TAB_COMMENTS c
       ON c.OWNER = t.OWNER
      AND c.TABLE_NAME = t.TABLE_NAME
WHERE  t.OWNER = 'DBAMV'
  AND (   t.TABLE_NAME LIKE 'FFAS%'
       OR t.TABLE_NAME LIKE 'FFIS%'
       OR t.TABLE_NAME LIKE '%FATUR%'
       OR t.TABLE_NAME LIKE 'CONTA%'
       OR t.TABLE_NAME LIKE '%GLOSA%'
       OR t.TABLE_NAME LIKE '%TISS%'
       OR t.TABLE_NAME LIKE 'NOTA_FISCAL%'
       OR t.TABLE_NAME LIKE '%REPASSE%')
ORDER BY t.NUM_ROWS DESC NULLS LAST, t.TABLE_NAME;
