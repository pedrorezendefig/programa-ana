-- 90-1: BONUS OPCIONAL (fora do escopo do ciclo 1). Reconhecimento dos owners DBADW e DBACP
-- Bloco 90: bonus opcional
-- Saida: 90-1-dw-reconhecimento.csv (camada commitavel, resultados/)
-- Responde: so metadados, nenhum dado de negocio. Pular sem culpa se o tempo apertar
SELECT OWNER,
       COUNT(*)      AS tabelas,
       SUM(NUM_ROWS) AS linhas_estimadas
FROM   ALL_TABLES
WHERE  OWNER IN ('DBADW', 'DBACP')
GROUP BY OWNER
ORDER BY OWNER;
