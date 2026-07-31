-- 99-2: amostra recente de atendimentos reais
-- Bloco 99: amostras (contem dado pessoal)
-- Saida: amostras/99-2-atendime.csv
-- Camada: amostras. Destino OBRIGATORIO: resultados/amostras/ (fora do git).
--   NUNCA commitar, NUNCA servir pelo portal
-- Responde: formato real das linhas de atendimento na producao
SELECT *
FROM   DBAMV.ATENDIME
WHERE  DT_ATENDIMENTO >= ADD_MONTHS(SYSDATE, -3)
  AND  ROWNUM <= 50;
