-- 99-3: amostra da interface Global Health
-- Bloco 99: amostras (contem dado pessoal)
-- Saida: amostras/99-3-atendime-gh.csv
-- Camada: amostras. Destino OBRIGATORIO: resultados/amostras/ (fora do git).
--   NUNCA commitar, NUNCA servir pelo portal
-- Responde: C6-4 (formato real das linhas da interface GH, se existirem), GH-18
SELECT *
FROM   DBAMV.ATENDIME_GLOBAL_HEALTH
WHERE  ROWNUM <= 50;
