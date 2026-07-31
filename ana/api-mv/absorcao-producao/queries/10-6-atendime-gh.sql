-- 10-6: retrato agregado de ATENDIME_GLOBAL_HEALTH na PRODUCAO
-- Bloco 10: nucleo assistencial
-- Saida: 10-6-atendime-gh.csv (camada commitavel, resultados/; so agregados,
--   a unica linha nominal possivel e a sonda)
-- Responde: C6-4 (quem popula e quando), GH-18, insight 13
-- Armadilha: NR_CPF aqui e NUMBER; todo cruzamento por CPF exige LPAD(TO_CHAR(NR_CPF), 11, '0')
SELECT 'TOTAL' AS dimensao,
       CAST(NULL AS VARCHAR2(20)) AS valor,
       COUNT(*)             AS qtd,
       MIN(DH_ATENDIMENTO)  AS primeiro,
       MAX(DH_ATENDIMENTO)  AS ultimo
FROM   DBAMV.ATENDIME_GLOBAL_HEALTH
UNION ALL
SELECT 'TP_ATENDIMENTO', TP_ATENDIMENTO, COUNT(*), MIN(DH_ATENDIMENTO), MAX(DH_ATENDIMENTO)
FROM   DBAMV.ATENDIME_GLOBAL_HEALTH
GROUP BY TP_ATENDIMENTO
UNION ALL
SELECT 'CPF_SONDA_LPAD', '66301102770', COUNT(*), MIN(DH_ATENDIMENTO), MAX(DH_ATENDIMENTO)
FROM   DBAMV.ATENDIME_GLOBAL_HEALTH
WHERE  LPAD(TO_CHAR(NR_CPF), 11, '0') = '66301102770'
ORDER BY 1, 3 DESC;
