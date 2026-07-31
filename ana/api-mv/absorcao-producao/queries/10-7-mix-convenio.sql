-- 10-7: mix de convenios nas marcacoes dos ultimos 12 meses
-- Bloco 10: nucleo assistencial
-- Saida: 10-7-mix-convenio.csv (camada commitavel, resultados/)
-- Responde: GH-12, GH-17 e D1 (procurar o convenio particular no resultado),
--   insight 6
SELECT iac.CD_CONVENIO,
       c.NM_CONVENIO,
       COUNT(*) AS marcacoes_12m
FROM   DBAMV.IT_AGENDA_CENTRAL iac
LEFT JOIN DBAMV.CONVENIO c ON c.CD_CONVENIO = iac.CD_CONVENIO
WHERE  iac.CD_PACIENTE IS NOT NULL
  AND  iac.DT_GRAVACAO >= ADD_MONTHS(SYSDATE, -12)
GROUP BY iac.CD_CONVENIO, c.NM_CONVENIO
ORDER BY marcacoes_12m DESC;
