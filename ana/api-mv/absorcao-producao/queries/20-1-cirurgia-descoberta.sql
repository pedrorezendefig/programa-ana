-- 20-1: descoberta das tabelas de cirurgia e centro cirurgico na PRODUCAO
-- Bloco 20: cirurgia e centro cirurgico
-- Saida: 20-1-cirurgia-descoberta.csv (camada commitavel, resultados/)
-- Responde: insight 11; alimenta o ciclo 2 (C9) com os nomes e volumes reais
-- Candidatas conhecidas pela planilha do TI: CIRURGIA_AVISO_AGENDADA, SOS_IT_AGENDA_CIRU
--   (usadas como PADRAO de descoberta, nunca como FROM direto: um FROM em tabela
--   inexistente quebraria a sessao)
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
  AND (   t.TABLE_NAME LIKE '%CIRUR%'
       OR t.TABLE_NAME LIKE 'AVISO%'
       OR t.TABLE_NAME LIKE 'SOS_%')
ORDER BY t.NUM_ROWS DESC NULLS LAST, t.TABLE_NAME;
