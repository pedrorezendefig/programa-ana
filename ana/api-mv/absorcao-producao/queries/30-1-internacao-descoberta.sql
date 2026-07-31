-- 30-1: descoberta das tabelas de internacao, leitos e urgencia na PRODUCAO
-- Bloco 30: internacao, leitos e urgencia
-- Saida: 30-1-internacao-descoberta.csv (camada commitavel, resultados/)
-- Responde: insights 9 e 10; alimenta o ciclo 2 (C9)
-- Candidatas conhecidas: ATENDIME_PROGRAMA, VDIC_INTERNAR_PACIENTE, VDIC_MOVIMENTAR_PACIENTE
--   (usadas como PADRAO de descoberta, nunca como FROM direto)
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
  AND (   t.TABLE_NAME LIKE '%LEITO%'
       OR t.TABLE_NAME LIKE '%INTERNA%'
       OR t.TABLE_NAME LIKE '%URGENC%'
       OR t.TABLE_NAME LIKE '%EMERG%'
       OR t.TABLE_NAME LIKE '%TRIAGEM%'
       OR t.TABLE_NAME LIKE 'MVTO%'
       OR t.TABLE_NAME LIKE '%MOVIMENT%')
ORDER BY t.NUM_ROWS DESC NULLS LAST, t.TABLE_NAME;
