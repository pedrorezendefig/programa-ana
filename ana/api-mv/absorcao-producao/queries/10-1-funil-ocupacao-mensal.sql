-- 10-1: funil mensal (marcado, compareceu, atendido) e ocupacao de agenda, 24 meses
-- Bloco 10: nucleo assistencial
-- Saida: 10-1-funil-ocupacao-mensal.csv (camada commitavel, resultados/)
-- Responde: insights 1, 3, 4, 5 (no-show, lead time, ocupacao, funil);
--   volume mensal real da producao; GH-19 (contexto de massa)
WITH funil AS (
  SELECT TRUNC(ac.DT_AGENDA, 'MM')                                    AS mes,
         COUNT(*)                                                     AS slots_com_paciente,
         SUM(CASE WHEN iac.TP_SITUACAO = 'C' THEN 1 ELSE 0 END)       AS cancelados,
         SUM(CASE WHEN iac.SN_ATENDIDO = 'S' THEN 1 ELSE 0 END)       AS atendidos,
         SUM(CASE WHEN iac.TP_PRESENCA_FALTA = 'P' THEN 1 ELSE 0 END) AS presencas,
         SUM(CASE WHEN iac.TP_PRESENCA_FALTA = 'F' THEN 1 ELSE 0 END) AS faltas,
         SUM(CASE WHEN iac.CD_ATENDIMENTO IS NOT NULL THEN 1 ELSE 0 END) AS com_atendimento,
         ROUND(AVG(ac.DT_AGENDA - iac.DT_GRAVACAO), 1)                AS lead_time_medio_dias
  FROM   DBAMV.IT_AGENDA_CENTRAL iac
  JOIN   DBAMV.AGENDA_CENTRAL ac
         ON ac.CD_AGENDA_CENTRAL = iac.CD_AGENDA_CENTRAL
  WHERE  iac.CD_PACIENTE IS NOT NULL
    AND  ac.DT_AGENDA >= ADD_MONTHS(TRUNC(SYSDATE, 'MM'), -24)
  GROUP BY TRUNC(ac.DT_AGENDA, 'MM')
),
ocupacao AS (
  SELECT TRUNC(ac.DT_AGENDA, 'MM')       AS mes,
         SUM(ac.QT_ATENDIMENTO)          AS capacidade,
         SUM(ac.QT_MARCADOS)             AS marcados,
         SUM(ac.QT_ENCAIXES_MARCADOS)    AS encaixes_marcados
  FROM   DBAMV.AGENDA_CENTRAL ac
  WHERE  ac.DT_AGENDA >= ADD_MONTHS(TRUNC(SYSDATE, 'MM'), -24)
  GROUP BY TRUNC(ac.DT_AGENDA, 'MM')
)
SELECT COALESCE(f.mes, o.mes)  AS mes,
       f.slots_com_paciente,
       f.cancelados,
       f.atendidos,
       f.presencas,
       f.faltas,
       f.com_atendimento,
       f.lead_time_medio_dias,
       o.capacidade,
       o.marcados,
       o.encaixes_marcados
FROM   funil f
FULL OUTER JOIN ocupacao o ON o.mes = f.mes
ORDER BY 1;
