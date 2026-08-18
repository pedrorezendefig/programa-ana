-- Virada da ouvidoria para a API do Hospital Reunioes (ADR-0015 fase 2, ADR-0016).
-- Rodar no SQL Editor do Supabase Studio do Hospital, na ORDEM abaixo, um passo por vez.
--
-- Por que existe: os 3 protocolos do NocoDB (2026-0001 a 0003) sao de teste da bateria v2
-- e NAO sao migrados (o painel /ouvidoria e lido pela diretoria e pelas secretarias; resumo
-- de teste seria lido como manifestacao real). So a sequence e adiantada, para que nenhum
-- numero ja dito numa conversa se repita. Decisao 6 do ADR-0016.
--
-- Nao existe caminho de API para isto em /api/ana/*, por desenho: escrita de sequence e
-- exclusao de linha nunca sao expostas a Ana.

-- ============================================================
-- PASSO 1 - Conferir o ponto de partida (so leitura)
-- Esperado: linhas = 0; last_value = 1 com is_called = false.
-- Se linhas > 0, PARE: ha registro que a virada nao previu.
-- ============================================================
SELECT count(*) AS linhas FROM ouvidoria_protocolos;
SELECT last_value, is_called FROM ouvidoria_protocolos_numero_seq;


-- ============================================================
-- PASSO 2 - Adiantar a numeracao, ANTES da bateria de prova
-- Esperado depois: last_value = 3, is_called = true.
-- O proximo registro nasce 2026-0004.
-- ============================================================
SELECT setval('ouvidoria_protocolos_numero_seq', 3);
SELECT last_value, is_called FROM ouvidoria_protocolos_numero_seq;


-- ============================================================
-- PASSO 3 - Ver o que a bateria deixou (so leitura)
-- Esperado: UMA linha, 2026-0004, categoria Demora, setor Pronto-Socorro.
-- Mais de uma linha = a Ana gravou duas vezes na mesma conversa (bug da Secao 7.3).
-- ============================================================
SELECT protocolo, data_abertura, prazo_resposta, status, categoria, setor, resumo
FROM ouvidoria_protocolos
ORDER BY numero;


-- ============================================================
-- PASSO 4 - Limpar, para o painel do hospital nascer vazio
--
-- CUIDADO: o DELETE nao tem WHERE de proposito, porque neste momento a tabela so tem a
-- linha da prova. Rodar este passo DEPOIS que o hospital comecar a usar de verdade apaga
-- manifestacao real. Vale so no dia da virada.
--
-- O setval e obrigatorio depois do DELETE: apagar linha nao devolve numero a sequence.
-- ============================================================
DELETE FROM ouvidoria_protocolos;
SELECT setval('ouvidoria_protocolos_numero_seq', 3);
SELECT count(*) AS linhas FROM ouvidoria_protocolos;
SELECT last_value, is_called FROM ouvidoria_protocolos_numero_seq;
