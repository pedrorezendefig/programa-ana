-- 99-1: amostra recente de marcacoes reais
-- Bloco 99: amostras (contem dado pessoal)
-- Saida: amostras/99-1-it-agenda-central.csv
-- Camada: amostras. Destino OBRIGATORIO: resultados/amostras/ (fora do git).
--   NUNCA commitar, NUNCA servir pelo portal
-- Responde: C6-6 (valores reais de slot livre e marcado), formato real das linhas
SELECT *
FROM   DBAMV.IT_AGENDA_CENTRAL
WHERE  CD_PACIENTE IS NOT NULL
  AND  DT_GRAVACAO >= ADD_MONTHS(SYSDATE, -3)
  AND  ROWNUM <= 50;
