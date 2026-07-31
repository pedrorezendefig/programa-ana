-- 10-5: teste GH-18. O paciente-sonda criado via API homolog existe na PRODUCAO?
-- Bloco 10: nucleo assistencial
-- Saida: 10-5-sonda-gh18.csv (camada commitavel, resultados/)
-- Responde: GH-18 CRITICA (para qual banco MV a homolog GH aponta)
-- Interpretacao: linha CPF_SONDA com nm_paciente TESTE INTEGRACAO ANA VITTA = a homolog GH
--   enxerga e grava na producao (grave, avisar imediatamente).
-- Linha CPF_SONDA com o nome oculto pela guarda = o CPF esta ocupado por OUTRO paciente real (colisao de
--   CPF valido, nao prova integracao; investigar antes de concluir).
-- Nenhuma linha CPF_SONDA = ambientes distintos (esperado).
-- Nenhum ramo expoe nome de paciente real: a guarda CASE omite o nome quando nao for a sonda.
SELECT 'CPF_SONDA'          AS verificacao,
       TO_CHAR(CD_PACIENTE) AS cd_paciente,
       CASE WHEN NM_PACIENTE = 'TESTE INTEGRACAO ANA VITTA'
            THEN NM_PACIENTE
            ELSE 'CPF OCUPADO POR OUTRO PACIENTE (nome omitido)' END AS nm_paciente,
       CASE WHEN NM_PACIENTE = 'TESTE INTEGRACAO ANA VITTA'
            THEN DT_CADASTRO
            ELSE CAST(NULL AS DATE) END AS dt_cadastro
FROM   DBAMV.PACIENTE
WHERE  NR_CPF = '66301102770'
UNION ALL
SELECT 'ID_1681',
       TO_CHAR(CD_PACIENTE),
       CASE WHEN NM_PACIENTE = 'TESTE INTEGRACAO ANA VITTA'
            THEN NM_PACIENTE
            ELSE 'OCUPADO POR OUTRO PACIENTE (nome omitido)' END,
       CASE WHEN NM_PACIENTE = 'TESTE INTEGRACAO ANA VITTA'
            THEN DT_CADASTRO
            ELSE CAST(NULL AS DATE) END
FROM   DBAMV.PACIENTE
WHERE  CD_PACIENTE = 1681;
