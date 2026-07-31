-- 30-2: volume mensal por tipo de atendimento e internacao, com tempo medio ate a alta
-- Bloco 30: internacao, leitos e urgencia
-- Saida: 30-2-internacao-urgencia-mensal.csv (camada commitavel, resultados/)
-- Responde: insights 9 e 10 (tempo ate a alta, pressao da urgencia);
--   C6-2 (interpretacao de TP_ATENDIMENTO com volume real)
-- Nota: o significado de cada TP_ATENDIMENTO (U, E, A...) ainda depende da C6-2;
--   aqui medimos o volume real de cada valor
SELECT TRUNC(a.DT_ATENDIMENTO, 'MM') AS mes,
       a.TP_ATENDIMENTO,
       a.SN_INTERNADO,
       COUNT(*) AS qtd,
       ROUND(AVG(a.DT_ALTA - a.DT_ATENDIMENTO), 2) AS dias_ate_alta_medio,
       SUM(CASE WHEN a.SN_OBITO = 'S' THEN 1 ELSE 0 END) AS obitos
FROM   DBAMV.ATENDIME a
WHERE  a.DT_ATENDIMENTO >= ADD_MONTHS(TRUNC(SYSDATE, 'MM'), -24)
GROUP BY TRUNC(a.DT_ATENDIMENTO, 'MM'), a.TP_ATENDIMENTO, a.SN_INTERNADO
ORDER BY 1, 2, 3;
