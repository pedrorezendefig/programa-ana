-- 10-8: ocupacao de agenda por prestador nos ultimos 6 meses
-- Bloco 10: nucleo assistencial
-- Saida: 10-8-ocupacao-prestador.csv (camada commitavel, resultados/;
--   prestador e profissional, nao paciente)
-- Responde: insights 2 e 4 (janelas ociosas, realocacao de oferta)
SELECT ac.CD_PRESTADOR,
       p.NM_PRESTADOR,
       COUNT(*)                AS agendas,
       SUM(ac.QT_ATENDIMENTO)  AS capacidade,
       SUM(ac.QT_MARCADOS)     AS marcados,
       ROUND(100 * SUM(ac.QT_MARCADOS) / NULLIF(SUM(ac.QT_ATENDIMENTO), 0), 1) AS pct_ocupacao
FROM   DBAMV.AGENDA_CENTRAL ac
LEFT JOIN DBAMV.PRESTADOR p ON p.CD_PRESTADOR = ac.CD_PRESTADOR
WHERE  ac.DT_AGENDA >= ADD_MONTHS(TRUNC(SYSDATE), -6)
  AND  ac.SN_ATIVO = 'S'
GROUP BY ac.CD_PRESTADOR, p.NM_PRESTADOR
ORDER BY pct_ocupacao NULLS LAST, capacidade DESC;
