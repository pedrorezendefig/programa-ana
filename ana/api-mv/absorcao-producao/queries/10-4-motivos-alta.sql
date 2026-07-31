-- 10-4: distribuicao real de CD_MOT_ALT nas altas, com a armadilha 63/64 marcada
-- Bloco 10: nucleo assistencial
-- Saida: 10-4-motivos-alta.csv (camada commitavel, resultados/)
-- Responde: C6-3 (catalogo usado e obrigatoriedade), armadilha do luto 63/64,
--   insight 8, base do filtro de desfecho (E1);
--   a linha com CD_MOT_ALT nulo mede alta sem motivo preenchido
SELECT a.CD_MOT_ALT,
       m.DS_MOT_ALT,
       m.TP_MOT_ALTA,
       CASE WHEN a.CD_MOT_ALT IN (63, 64) THEN 'S' ELSE 'N' END AS armadilha_luto_63_64,
       COUNT(*)       AS qtd,
       MIN(a.DT_ALTA) AS primeira_alta,
       MAX(a.DT_ALTA) AS ultima_alta
FROM   DBAMV.ATENDIME a
LEFT JOIN DBAMV.MOT_ALT m ON m.CD_MOT_ALT = a.CD_MOT_ALT
WHERE  a.DT_ALTA IS NOT NULL
GROUP BY a.CD_MOT_ALT, m.DS_MOT_ALT, m.TP_MOT_ALTA,
         CASE WHEN a.CD_MOT_ALT IN (63, 64) THEN 'S' ELSE 'N' END
ORDER BY qtd DESC;
