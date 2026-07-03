# Perguntas técnicas: Global Health e TI do hospital

> Frente 7 da pesquisa ultracode (03/jul/2026). Resultado da leitura integral da doc oficial da API (`doc_whatsapp_agendamento_1.10.pdf`, 16 páginas; o portal oficial apidocs.globalhealth.mv publica a mesma v1.10 como vigente em jul/2026), da validação do desenho das 7 tools (`docs/02`) contra a doc, e da pesquisa pública do modelo de dados MV (Soul MV/MV2000, esquema DBAMV) em queries reais de hospitais em produção no GitHub. **Nenhuma conexão com banco foi feita** (exploração SQL é a Trilha 1, em outra sessão).

## Sumário do que a validação encontrou

1. A doc v1.10 cobre ~23 endpoints de agendamento eletivo. Autenticação por header `Token` estático, sem OAuth, sem expiração documentada. **O desenho das 7 tools está aderente: todos os endpoints usados existem e os parâmetros principais batem.** Foram encontradas 8 divergências/lacunas (abaixo), 1 grave.
2. A doc é omissa em tudo que é operacional: nenhum código HTTP de erro, nenhum rate limit, timeout, política de token ou webhook. O único formato de erro documentado é `{"sucesso": false, "mensagemErro": "..."}` no `/horarios/agendar`.
3. **Para o pós-atendimento a API não serve:** só expõe agendamentos ATIVOS (futuros) por CPF; nada de atendimento realizado, comparecimento, desfecho ou motivo de alta. O pós-atendimento nasce da leitura direta do Oracle (Trilha 1). Ponto de contato entre os dois mundos: `ATENDIME_GLOBAL_HEALTH` (lado MV) e o `protocolo`/`id` (lado GH).
4. **Atenção ao nome da tabela de desfecho:** no MV clássico ela se chama **`MOT_ALT`** (colunas `CD_MOT_ALT`, `DS_MOT_ALT`, `TP_MOT_ALTA`, `SN_ATIVO`), não `MOTIVO_ALTA`, e `TP_MOT_ALTA = 'O'` identifica óbito (confirmado em queries de produção de outros hospitais MV). As queries da Trilha 1 no `roadmap/TODO.md` devem incluir os dois nomes.

## Divergências do desenho das 7 tools vs doc v1.10 (corrigir no docs/02 antes de construir)

| # | Gravidade | Divergência | Correção |
|---|---|---|---|
| D1 | **Grave** | O fluxo "particular" do T2 pula `GET /convenios` e chamaria `/agendas/v2` sem `idConvenio`/`idPlano`. A doc NÃO marca esses parâmetros como opcionais (ao contrário de `idSubPlano`, `idPrestador`, `dataInicial`), e "particular" é um convênio como outro qualquer, com id próprio e flag `particular: true` no `GET /convenios`. Comportamento sem `idConvenio` é indefinido. | SEMPRE resolver o convênio, inclusive particular (filtrar `particular == true` na lista) e passar `idConvenio`/`idPlano`. Perguntar o id do convênio particular do hospital (pergunta GH-17). |
| D2 | Média | T2 aceita input `medico` mas o subfluxo nunca resolve nome → `idPrestador` (falta chamada a `GET /prestadores?pesquisa=&idItemAgendamento=`). | Incluir o passo, tratando 0 ou >1 resultados; usar `somentePrestadoresComHorario=true`. |
| D3 | Média | T4 lê `idHorario` do ESTADO, mas nada grava o horário escolhido no ESTADO (o `mapa` guarda todos, ninguém persiste a escolha). `POST /anexos/agendamento` exige `idHorario`. | T3 grava `horarioEscolhido: {ordem, idHorario, idAgenda}` no `agendamento_estado` (ou T4 recebe `numero_escolhido` da IA). |
| D4 | Média | `impedeRealizacao='N'` com `mensagem` não é tratado: a doc exige exibir a mensagem mesmo quando a alternativa NÃO impede (ex.: aviso de preparo). O desenho só trata o 'S'. | Concatenar as mensagens das alternativas 'N' escolhidas na resposta ao paciente. |
| D5 | Baixa | `modoHorarios` ignorado. O default `UM_POR_TURNO` retorna 1 horário por turno por dia; quando o paciente pedir "todos os horários de terça", o T2 não tem como listar (`modoHorarios=TODOS` + `data=`). | Aceitar a limitação no MVP ou adicionar input `dia_especifico?`. |
| D6 | Baixa | Campo `ordemChegada: true` no horário não tratado (provável agenda por ordem de chegada, sem hora fixa; semântica não documentada). | Sufixo "(ordem de chegada)" na lista após confirmar com a GH (pergunta GH-9). |
| D7 | Baixa | Endpoints úteis não usados: `GET /carteiras?cpf=` (pré-preencher convênio/plano/carteirinha de paciente recorrente); `GET /agendamentos/{id}` com `status` (verificação pós-`ERRO_API`, resolve a idempotência do edge case 7); `GET /horarios/{id}/instrucoes` e `/exames/instrucaoGeral` (responder "precisa de jejum?" ANTES de efetivar). | Candidatos à v2 das tools; o `GET /agendamentos` como verificação pós-timeout deve entrar já no MVP. |
| D8 | Informativa | `GET /pessoas?telefone=` existe e o telefone do WhatsApp já é input FIXO: lookup por telefone antes de pedir CPF reduziria fricção. | Manter CPF como confirmação de identidade (o telefone pode ser de terceiro); usar o lookup como atalho. |

## O que a doc NÃO responde (vira pergunta)

Códigos HTTP de erro por endpoint; formato de erro geral (o `{sucesso, mensagemErro}` vale só para agendar?); rate limit; timeout; transacionalidade da corrida de horário; idempotência de retry; validade/rotação do token; ambiente de homologação (massa de teste? efeito real?); webhooks (mudança de status não é notificada); enumeração de `status` (só "AGENDADO" aparece); anexos (formatos, tamanho máximo, retenção no S3, URL de origem precisa ser pública?); LGPD (retenção de CPF/carteirinha/triagem/pedido médico no S3 da GH, região AWS, DPA); semântica de `ordemChegada`, `tpHorario` e `identificador` do anexo; filtro por unidade em `/agendas/v2` (não existe; client-side?); paciente sem CPF (recém-nascido, estrangeiro) e dependente menor; formato da resposta de `GET /pessoas` quando não encontra.

## Perguntas para a Global Health

**Bloco A: contrato de erro**
1. Qual a tabela de códigos HTTP retornados por endpoint e o formato do body de erro fora do `/horarios/agendar`?
2. O `{sucesso:false, mensagemErro}` é o único formato de erro de negócio? Há catálogo de `mensagemErro` (para rotear sem parsear texto livre)?
3. Há rate limit? Qual o comportamento ao exceder (429? 503?)? Qual o limite de chamadas simultâneas que a API suporta (pico da Ana + eventual uso em massa)?
4. Qual o tempo típico de resposta do `/agendas/v2` e do `/anexos/upload`? Há timeout do lado de vocês?

**Bloco B: consistência e escrita**
5. O `POST /horarios/agendar` é transacional contra o MV? Dois clientes disputando o mesmo `idHorario`: o segundo sempre recebe `sucesso:false`?
6. Reenvio do mesmo POST após timeout de rede duplica o agendamento? Existe chave de idempotência ou dedupe por (cpf, idHorario)?
7. Quais os valores possíveis de `status` do agendamento? `GET /agendamentos` lista o que exatamente ("ativos")?
8. Cancelamentos/remarcações feitos pela central no MV aparecem via `GET /agendamentos`? Existe webhook ou plano de ter?
9. O que significa `ordemChegada: true` num horário? E `tpHorario` ("M")? E o campo `identificador` do anexo?

**Bloco C: ambiente, token, dados**
10. O ambiente `dem.` roda contra qual base? Podemos agendar à vontade em homologação sem efeito real? Há massa de teste (CPFs, convênios, agendas)?
11. Qual a política do token (expiração, rotação, escopo, IP allowlist)? Tokens separados homologação/produção? (Precisamos dos dois.)
12. Qual a lista de convênios ativos na API para o São Matheus?
13. O hospital usa sub-planos?
14. Anexos: formatos aceitos, tamanho máximo, e a URL de origem precisa ser pública? (nossas URLs de mídia do Chatwoot podem ter token na query string)
15. Retenção LGPD: por quanto tempo o arquivo fica no S3 de vocês? Em qual região AWS? Existe DPA/aditivo de tratamento de dados com o hospital?
16. Como somos avisados de breaking changes da API? (a doc já está na v1.10, com 10 versões de mudanças)
17. `/agendas/v2` sem `idConvenio` é suportado (busca "qualquer convênio") ou é erro? Qual o id do convênio "particular" do São Matheus? (decide a correção D1)
18. Pacientes sem CPF (recém-nascido, estrangeiro) e dependentes menores: como agendar?

## Perguntas para o TI do hospital (esquemas MVBIKE e MVINTEGRA)

**Bloco A: esquemas e acesso**
1. A planilha das 6.553 tabelas foi extraída conectado com qual usuário? As tabelas pertencem a qual owner (`DBAMV`? `MVBIKE`? `MVINTEGRA`?)? (A instalação clássica do Soul MV usa `DBAMV` como dono das tabelas de negócio; confirmar se aqui é igual ou se há sinônimos.)
2. O que exatamente são `MVBIKE` e `MVINTEGRA` nesta instalação: owners de tabelas, usuários de integração com grants, ou schemas de staging/réplica? "MVBIKE" é o nome correto (não seria MVBI, de BI)?
3. Podemos ter um usuário Oracle SOMENTE LEITURA (select em tabelas específicas)? Com quais grants, em qual janela de uso, e via VPN?
4. Existe réplica/DW para relatório (para as extrações diárias do pós-atendimento não pesarem no OLTP)? O Power BI (módulo SCMA) lê de onde?

**Bloco B: as 8 tabelas de agendamento**
5. `IT_AGENDA_CENTRAL`: confirmar colunas-chave: `CD_IT_AGENDA_CENTRAL` (PK), `CD_AGENDA_CENTRAL` (FK), `CD_PACIENTE`, `NM_PACIENTE`, `CD_ITEM_AGENDAMENTO`, `CD_CONVENIO`, `CD_TIP_MAR`, `TP_SITUACAO`, `SN_ATENDIDO`, `TP_PRESENCA_FALTA` (com `DH_PRESENCA_FALTA` e `CD_USUARIO_PRESENCA_FALTA`), `SN_ENCAIXE`, `CD_ATENDIMENTO`, `HR_AGENDA`. Quais os valores de `TP_SITUACAO` e de `TP_PRESENCA_FALTA`? (Nota: `SN_FALTA` parece ser coluna da `AGENDA_CENTRAL`, não da `IT_`; confirmar onde a falta é registrada.)
6. `AGENDA_CENTRAL`: confirmar `CD_AGENDA_CENTRAL` (PK), `CD_ESCALA_CENTRAL`, `CD_PRESTADOR`, `CD_SETOR`, `DT_AGENDA`, `HR_INICIO`, `HR_FIM`.
7. Qual campo diz que o paciente COMPARECEU (`SN_ATENDIDO = 'S'`? `TP_PRESENCA_FALTA`?), quem preenche (recepção? automático ao gerar atendimento?) e com que atraso? Qual o % de preenchimento real?
8. `IT_AGENDA_CENTRAL.CD_ATENDIMENTO` é preenchido quando o agendado vira atendimento? É a ponte agendamento → `ATENDIME`?
9. `EXA_RX` é o catálogo de exames de imagem? A realização está em `PED_RX`/`ITPED_RX` (`DT_REALIZADO`)? O pós-atendimento de exame deve olhar `ITPED_RX.DT_REALIZADO` ou o `ATENDIME`?
10. `PACIENTE`: quais campos de telefone celular estão efetivamente preenchidos (`NR_CELULAR`? `NR_DDD_CELULAR`? tabela `CONTATO_PACIENTE`?) e com que qualidade (% preenchido, formato)? O CPF está em qual coluna (`NR_CPF`?) e com que % de preenchimento? Há flag de consentimento de contato?

**Bloco C: desfecho / motivo de alta (crítico para o pós-atendimento)**
11. A tabela de motivos de alta aqui é `MOT_ALT` (`CD_MOT_ALT`, `DS_MOT_ALT`, `TP_MOT_ALTA`, `SN_ATIVO`) como no MV clássico? Ela não apareceu no dicionário destilado: existe com outro owner/nome?
12. `ATENDIME`: confirmar `CD_ATENDIMENTO`, `CD_PACIENTE`, `DT_ATENDIMENTO`, `HR_ATENDIMENTO`, `TP_ATENDIMENTO`, `DT_ALTA`, `HR_ALTA`, `CD_MOT_ALT`, `SN_OBITO`, `CD_SETOR_OBITO`, `CD_CONVENIO`, `CD_ESPECIALID`, `CD_PRESTADOR`.
13. Quais os valores de `TP_ATENDIMENTO` em uso no hospital? (Esperado por evidência pública: 'I' internação, 'A' ambulatorial, 'U' urgência, 'E' externo; 'H' existe em algumas instalações com significado variável, às vezes home care.) Qual identifica o pronto-socorro?
14. Precisamos do dump completo da tabela de motivos de alta (código, descrição, tipo) para configurar as EXCLUSÕES do disparo (óbito = `TP_MOT_ALTA = 'O'`? evasão? transferência? alta a pedido?).
15. Além de `MOT_ALT`, o óbito está sinalizado em `ATENDIME.SN_OBITO` e/ou `PACIENTE_OBITO`? Qual é a fonte de verdade para NUNCA contatar paciente falecido (inclusive óbito em atendimento POSTERIOR ao que dispararia a pesquisa)?
16. `ATENDIME_GLOBAL_HEALTH`: quais colunas tem (mapeia `CD_ATENDIMENTO` para o id/protocolo da GH?), qual rotina a popula, e serve para conciliar o agendado via WhatsApp com o atendimento real?
17. Volumetria: quantos atendimentos/dia por `TP_ATENDIMENTO` e quantos agendamentos/dia na central? (dimensiona os 25 a 35 mil disparos/mês do briefing)

**Bloco D: operação**
18. Há rotina batch que fecha/atualiza atendimentos com atraso (ex.: alta lançada no dia seguinte)? Qual o atraso típico entre alta real e `DT_ALTA` no banco?
19. Podemos criar VIEWS de leitura próprias (ex.: `V_POS_ATENDIMENTO_ELETIVO`) num schema separado, mantidas pelo TI?
20. O termo de atendimento assinado no balcão hoje menciona contato posterior por WhatsApp para pesquisa? (conecta com a pré-condição LGPD do pós-atendimento)

## Hipóteses de modelo de dados para a Trilha 1 (com nível de confiança)

Legenda: ALTA = coluna vista em query real de instalação MV em produção (fonte pública); MÉDIA = vista em view/artefato correlato; BAIXA = convenção de nomes.

**`ATENDIME`:** `CD_ATENDIMENTO` PK, `CD_PACIENTE` FK, `DT_ATENDIMENTO`/`HR_ATENDIMENTO`, `DT_ALTA`/`HR_ALTA`, `CD_MOT_ALT` FK, `SN_OBITO` ('S'/'N'), `CD_SETOR_OBITO`, `CD_CONVENIO`, `CD_ESPECIALID` (todas ALTA); `TP_ATENDIMENTO` com 'I'/'A'/'U'/'E' (ALTA) e 'H' variável por instalação (MÉDIA); `CD_PRESTADOR` (MÉDIA).

**`MOT_ALT`:** `CD_MOT_ALT` PK, `DS_MOT_ALT`, `TP_MOT_ALTA` ('O' = óbito, usado em query de mortalidade de hospital MV em produção), `SN_ATIVO` (todas ALTA).

**`PACIENTE`:** `CD_PACIENTE` PK, `NM_PACIENTE`, `DT_NASCIMENTO`, `TP_SEXO`, `NR_FONE` (ALTA); `NR_DDD_CELULAR`/`NR_CELULAR` (MÉDIA, podem estar em `CONTATO_PACIENTE`); `NR_CPF` (BAIXA, confirmar).

**`AGENDA_CENTRAL`:** `CD_AGENDA_CENTRAL` PK, `CD_ESCALA_CENTRAL` FK, `CD_PRESTADOR`, `CD_SETOR`, `DT_AGENDA`, `HR_INICIO`/`HR_FIM` (ALTA); `SN_FALTA` parece morar aqui (MÉDIA).

**`IT_AGENDA_CENTRAL`:** `CD_IT_AGENDA_CENTRAL` PK, `CD_AGENDA_CENTRAL` FK, `CD_PACIENTE`, `CD_CONVENIO`, `CD_ITEM_AGENDAMENTO` (ALTA); `HR_AGENDA`, `CD_TIP_MAR`, `TP_SITUACAO`, `SN_ATENDIDO`, `TP_PRESENCA_FALTA` + `DH_PRESENCA_FALTA` + `CD_USUARIO_PRESENCA_FALTA`, `SN_ENCAIXE`, `CD_ATENDIMENTO` (ponte para ATENDIME), `NR_ID_ENVIO_SMS` (MÉDIA-ALTA, via view `VDIC_RECEPCAO_AGENDA`).

**Outras:** `TIP_MAR` (tipos de marcação; hipótese de mapear 1:1 com o `idTipoMarcacao` da API, MÉDIA); `PED_RX`/`ITPED_RX` (`DT_REALIZADO` = realização do exame de imagem, ALTA); `PACIENTE_OBITO` (terceiro sinal de óbito, existência confirmada no dicionário do hospital); `SETOR`, `CONVENIO`/`CON_PLA`, `SAME` (ALTA); `ATENDIME_GLOBAL_HEALTH` (estrutura desconhecida, zero evidência pública: pergunta TI-16).

### Consulta-hipótese do pós-atendimento eletivo (validar na Trilha 1)

```sql
-- HIPOTESE (validar nomes/valores na Trilha 1; nao executar nesta sessao)
SELECT iac.cd_it_agenda_central,
       iac.cd_paciente,
       p.nm_paciente,
       p.nr_fone,               -- + celular (validar coluna)
       ac.dt_agenda,
       iac.hr_agenda,
       ac.cd_prestador,
       iac.sn_atendido,
       iac.cd_atendimento,
       a.dt_alta,
       ma.cd_mot_alt, ma.ds_mot_alt, ma.tp_mot_alta
FROM   it_agenda_central iac
JOIN   agenda_central ac  ON ac.cd_agenda_central = iac.cd_agenda_central
JOIN   paciente p         ON p.cd_paciente = iac.cd_paciente
LEFT JOIN atendime a      ON a.cd_atendimento = iac.cd_atendimento
LEFT JOIN mot_alt ma      ON ma.cd_mot_alt = a.cd_mot_alt
WHERE  TRUNC(ac.dt_agenda) = TRUNC(SYSDATE - 1)
  AND  iac.sn_atendido = 'S'
-- Exclusao dura de obito, por 3 sinais redundantes:
  AND NOT (a.sn_obito = 'S' OR ma.tp_mot_alta = 'O')
  AND iac.cd_paciente NOT IN (SELECT cd_paciente FROM paciente_obito)
  AND NOT EXISTS (SELECT 1 FROM atendime a2
                  WHERE a2.cd_paciente = iac.cd_paciente AND a2.sn_obito = 'S');
```

Riscos conhecidos da hipótese: `CD_ATENDIMENTO` pode não ser preenchido em todos os fluxos (fallback: casar `ATENDIME` por paciente + data + setor); `SN_ATENDIDO` depende da disciplina da recepção (medir % preenchido); valores de `TP_SITUACAO` desconhecidos; presença/nome de `MOT_ALT` na instalação local a confirmar.

## Fontes públicas do modelo MV (acesso 03/jul/2026)

- github.com/ronaldooracle/SQL-PARA-RELATORIOS-MV2000I-E-SOULMV (ATENDIME)
- github.com/WilliamSlackBros/EstudosCmdsSql NOT EXISTS.sql (colunas de ATENDIME)
- github.com/AmorimEureka/prj_gestao_a_vista stg_mot_alt.sql + schema.yml (MOT_ALT completo; stg_atendime com sn_obito)
- github.com/jefflima11/Projects-in-PL-SQL-and-SQL mix.sql (TP_MOT_ALTA='O'; TP_ATENDIMENTO)
- github.com/AmorimEureka/querys_oracle (query de mortalidade com SN_OBITO/CD_SETOR_OBITO; view VDIC_RECEPCAO_AGENDA com as colunas do SCMA)
- github.com/jcicero/scriptsmv agenda_scma.sql (AGENDA_CENTRAL/IT_AGENDA_CENTRAL; INSERTs reais)
- github.com/emmanuelrhad/ReportMV (relatórios SAME: pacientes agendados, óbitos)
- github.com/hersonpc/monitoramento-os-ses-go (view ambulatorial ATENDIME/MOT_ALT/IT_MARCACAO/TIP_MAR)
- github.com/Reniwtz/SQL-MVSoul-e-MV2000 (PED_RX/ITPED_RX/EXA_RX com DT_REALIZADO)
- mv.com.br/solucao/global-health e apidocs.globalhealth.mv (institucional; doc v1.10 vigente)
- MVBIKE/MVINTEGRA: **nenhuma evidência pública encontrada**; tratado como pergunta ao TI (bloco A).
