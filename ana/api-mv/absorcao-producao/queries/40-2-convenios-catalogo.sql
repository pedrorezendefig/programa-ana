-- 40-2: catalogo de convenios da PRODUCAO com uso em marcacoes e atendimentos (12 meses)
-- Bloco 40: faturamento e convenios
-- Saida: 40-2-convenios-catalogo.csv (camada commitavel, resultados/)
-- Responde: GH-12 (convenios ativos), GH-17 e D1 (achar o particular), insight 6
SELECT c.CD_CONVENIO,
       c.NM_CONVENIO,
       (SELECT COUNT(*)
        FROM   DBAMV.IT_AGENDA_CENTRAL iac
        WHERE  iac.CD_CONVENIO = c.CD_CONVENIO
          AND  iac.CD_PACIENTE IS NOT NULL
          AND  iac.DT_GRAVACAO >= ADD_MONTHS(SYSDATE, -12)) AS marcacoes_12m,
       (SELECT COUNT(*)
        FROM   DBAMV.ATENDIME a
        WHERE  a.CD_CONVENIO = c.CD_CONVENIO
          AND  a.DT_ATENDIMENTO >= ADD_MONTHS(SYSDATE, -12)) AS atendimentos_12m
FROM   DBAMV.CONVENIO c
ORDER BY marcacoes_12m DESC, atendimentos_12m DESC;
