-- 10-9: contactabilidade da base de pacientes da PRODUCAO (somente agregados)
-- Bloco 10: nucleo assistencial
-- Saida: 10-9-contactabilidade.csv (camada commitavel, resultados/;
--   nenhuma linha individual, so contagens)
-- Responde: pauta E2 (opt-in), pergunta GH-18 do arquivo de perguntas
--   (quantos pacientes sem CPF), insight 12
SELECT COUNT(*) AS pacientes,
       SUM(CASE WHEN NR_CELULAR IS NOT NULL THEN 1 ELSE 0 END)       AS com_celular,
       SUM(CASE WHEN NR_CPF IS NOT NULL THEN 1 ELSE 0 END)           AS com_cpf,
       SUM(CASE WHEN EMAIL IS NOT NULL THEN 1 ELSE 0 END)            AS com_email,
       SUM(CASE WHEN SN_RECEBE_CONTATO = 'S' THEN 1 ELSE 0 END)      AS aceita_contato,
       SUM(CASE WHEN SN_NOTIFICACAO_SMS = 'S' THEN 1 ELSE 0 END)     AS aceita_sms,
       SUM(CASE WHEN SN_ATIVO = 'S' THEN 1 ELSE 0 END)               AS ativos
FROM   DBAMV.PACIENTE;
