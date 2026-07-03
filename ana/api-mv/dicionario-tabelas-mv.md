# Dicionário de tabelas do MV (visão inicial)

> Fonte: `Descrição das tabelas da MV.xlsx` (analista de TI do hospital, jul/2026). 6.553 tabelas com comentário, extraídas do Oracle via `user_tab_comments`. Este arquivo é a destilação orientada ao Programa Ana; a planilha é a fonte completa.

Query usada pelo analista (aba SQL da planilha):
```sql
SELECT table_name,
       comments
FROM user_tab_comments
ORDER BY table_name
```

## As 8 tabelas que o hospital já movimenta via banco

Lista passada pelo analista de TI como as tabelas 'que mexeram via banco' no contexto de agendamento:

| Tabela | Descrição no dicionário |
|---|---|
| `AGENDA_CENTRAL` | Agenda da Central de Marcações |
| `IT_AGENDA_CENTRAL` | Agendamentos (horários) de pacientes e procedimentos da Central de marcações |
| `ITEM_AGENDAMENTO` | Itens de Agendamento |
| `ESCALA_CENTRAL` | Cadastro de Escalas |
| `ESCALA_CENTRAL_ITEM_AGENDA` | Itens de Agendamento permitidos para a Escala |
| `GERACAO_AGENDA` | Tabela de solicitacao de criação das agendas. |
| `PACIENTE` | (sem comentário no banco) |
| `EXA_RX` | (sem comentário no banco) |

Leitura preliminar do encadeamento (a validar com queries): `ESCALA_CENTRAL` (escalas dos prestadores) libera `ITEM_AGENDAMENTO` (o que se agenda) via `ESCALA_CENTRAL_ITEM_AGENDA`; `GERACAO_AGENDA` solicita a criação das agendas que viram `AGENDA_CENTRAL` (a agenda da Central de Marcações); os horários marcados dos pacientes ficam em `IT_AGENDA_CENTRAL`, apontando para `PACIENTE`; `EXA_RX` deve ser o cadastro de exames de imagem.

## Achados notáveis

- `ATENDIME_GLOBAL_HEALTH`: Tabela de atendimentos integrados da Global Health
- `ATENDIME`: (sem comentário no banco)
- `ATENDIME` é a tabela clássica de atendimentos do MV (sem comentário no dicionário, mas central: é dela que o pós-atendimento precisa extrair atendimento + desfecho).

## Família AGENDA (109 tabelas)

| Tabela | Descrição |
|---|---|
| `AGENDA` |  |
| `AGENDAMENTO_ONCOLOGICO` | TABELA DE HORÁRIOS AGENDADOS DA ONCOLOGIA |
| `AGENDAMENTO_RESERVA_NF` | Tabela do agendamento de reserva de nota fiscal. |
| `AGENDA_CENTRAL` | Agenda da Central de Marcações |
| `AGENDA_CENTRAL_CONVENIO` | Convênios permitidos para a Agenda da Central de Marcações |
| `AGENDA_CENTRAL_GRU_AGEN_PAC` | Tabela de Agendamento de Grupos da Central de Marcação |
| `AGENDA_CENTRAL_ITEM_AGENDA` | Cadastro de Itens de Agendamento permitdos para a Agenda |
| `AGENDA_CENTRAL_SER_TIPO` | Cadastro de Serviços e Tipos de marcação permitidos para a Agenda |
| `AGENDA_CENTRAL_USUARIO` | Cadastro de Usuários com permissão a agendas particulares |
| `AGENDA_FILA_ESPERA` | Tabela de controle da Fila de Espera para a central de Agendamentos |
| `AGENDA_GERADA` | Tabela de agendas geradas por solicitacao |
| `AGENDA_GERADA_AUTOMATICA` | Tabela para registro de agendas criadas através da procedure prc_scma_gerar_agenda. |
| `AGENDA_ONCOLOGICA` | TABELA DE HORÁRIOS LIVRES DA ONCOLOGIA |
| `AGENDA_PRESTADOR_ONCOLOGICO` | Tabela de agenda prestador oncologico |
| `AGENDA_REMESSA` |  |
| `AGENDA_TURMA` | Cadastro de turmas do SCMA |
| `AGENDA_TURMA_CONVENIO` | Convênios das agendas das turmas. |
| `AGENDA_TURMA_FILA` |  |
| `AGENDA_TURMA_PACIENTE` |  |
| `AGENDA_TURMA_PRESTADOR` | Prestadores que atenderão as turmas |
| `CIRURGIA_AVISO_AGENDADA` | Tabelas de Cirurgias Pertencentes aos Avisos Cirúrgicos. |
| `CONTROLE_AGENDAMENTO_RESER_NF` | Tabela de controle do job de agendamento de reserva de nota fiscal. |
| `CONVENIO_PERFIL_AGENDAMENTO` | Cadastro de Convênio / Perfis de Agendamento |
| `ESCALA_CENTRAL_ITEM_AGENDA` | Itens de Agendamento permitidos para a Escala |
| `EXA_RX_ITEM_AGENDAMENTO` | Tabela de registro dos vinculos de exames de imagem com itens de agendamento para gerar fila de espera. |
| `FILA_ESPERA_AGENDAMENTO` | Fila de espera de pacientes que aguardam vagas para agendamento de consulta AMA |
| `GERACAO_AGENDA` | Tabela de solicitacao de criação das agendas. |
| `GERACAO_AGENDA_BACKGROUND` | Tabela que registra o status das gerações de agendas em background |
| `GRUPO_AGENDA` | Cadastro de Grupos para Agendamento |
| `GRUPO_AGENDA_PAC` | Paciente do Grupo p/ agendamento |
| `HISTORICO_AGENDA_ONCOLOGICA` | Tabela de HistÃ³rico da geraÃ§Ã£o de agendas de recursos oncolÃ³gicos. |
| `INDICACAO_AGENDA` | Registro de Indicação de agendamento para Pacientes |
| `INTERDICAO_AGENDAMENTO_ONCO` | TABELA DE INTERDIÇÃO DE AGENDAMENTO ONCOLOGICO |
| `ITEM_AGENDAMENTO` | Itens de Agendamento |
| `ITEM_AGENDAMENTO_COMPOSICAO` | Itens Lista dos itens de um item de agendamento do Tipo Composto |
| `ITEM_AGENDAMENTO_CONFLITO` | Itens que não podem ser agendados dentro de um certo período em relação a outros |
| `ITEM_AGENDAMENTO_EQUIPTO` | Equipamentos usados na realização do Item de Agendamento |
| `ITEM_AGENDAMENTO_PERFIL_AGDM` | Cadastro de Item de Agendamento / Perfis de Agendamento |
| `ITEM_AGENDAMENTO_PRESTADOR` | Itens de Agendamento realizados pelo Prestador |
| `ITEM_AGENDAMENTO_PRE_REQ` |  |
| `ITEM_AGENDAMENTO_RECURSO` | Recursos que realizam o Item de Agendamento |
| `IT_AGENDA` |  |
| `IT_AGENDA_CENTRAL` | Agendamentos (horários) de pacientes e procedimentos da Central de marcações |
| `IT_AGENDA_CENTRAL_EQUIPTO` | Tabela de equipamentos solicitados para o agendamento |
| `IT_CONFIG_USUARIO_AGENDAMENTO` | Tabela dos itens de configuração dos campos Default do usuario e/ou maquina para o agendamento. |
| `IT_GERACAO_AGENDA` | Tabela de periodos de criação das agendas. |
| `IT_LOG_COPIA_AGENDA` | Tabela que armazena as agendas geradas pela operação de cópia |
| `IT_MOVIMENTO_AGENDA_CENTRAL` | Registro dos horários de uma operação de marcações da Central |
| `IT_SOLICITACAO_AGENDAMENTO` | Tabela responsável em manter as solicitações de atendimentos da central de regulação |
| `JUSTIFICATIVA_AGENDAMENTO` | Tabela de Cadastro de Justificativa de Agendamento |
| `LOG_AGENDAMENTO_RESERVA_NF` | Tabela para registrar o log do processamento do agendamento de reservas de nf. |
| `LOG_COPIA_AGENDA` | Tabela onde serão armazenadas as operações de cópia |
| `LOG_ESCALA_CENTRAL_ITEM_AGENDA` | Log do Cadastro de Escalas por Item de Agendamento |
| `LOG_EXCLUSAO_AGENDAMENTO` |  |
| `LOG_ITEM_AGENDA` |  |
| `LOG_OPERA_AGENDA_CENTRAL` | Log de operações de Bloqueio, Desbloqueio e Exclusão de agendas / horários |
| `LOG_OPERA_AGENDA_TURMA` | Tabela para armazenar os logs de operação nas agendas das turmas. |
| `LOG_REAGENDAMENTO` | TABELA REFERENTE AS SOLICITACOES DE RE-AGENDAMENTO |
| `MOVIMENTO_AGENDA_CENTRAL` | Registro dos agendamentos em uma operação da Central de Marcações |
| `OPERA_AGENDA` | Tabela de Operações de Bloqueio e Desbloqueio de Agendas |
| `PERFIL_AGENDAMENTO` | Cadastro de Perfis de Agendamento |
| `PRAZO_AGENDAMENTO_AVISO` | Tabela que guarda os prazaos para agendamento em formato de texto. |
| `PRESTADOR_PERFIL_AGENDAMENTO` | Cadastro de Prestador / Perfis de Agendamento |
| `PW_AGENDA_DOMICILIAR` | Tabela de Agenda de Assistência Domiciliar |
| `PW_AGE_AGENDA_POR_RECURSO` | Agendas por recurso, para o prestador logado |
| `PW_ESPECIALID_ITEM_AGENDAMENTO` | Associação da especialidade com o item de agendamento |
| `PW_GERACAO_AGENDA_DOMICILIAR` | Tabela de Geração da Agenda Domiciliar |
| `PW_IT_AGENDA_DOMICILIAR` | Tabela do Tipo de Chamado da Agenda da Assistência Domiciliar |
| `PW_IT_AGENDA_TP_CHAMADO_DOMIC` | Tabela de log dos tipos de chamados da geração da agenda |
| `PW_IT_GERACAO_AGD_AGENDA_DOMIC` | Tabela de log das agendas geradas para cada escala |
| `PW_PESQUISA_AGENDA_CRITERIO` | Tabela que guarda as informações de geração automática dos critérios de saída das pesquisas |
| `PW_QRTZ_ESTADO_AGENDADOR` | Tabela utilizada pelo Quartz para controle do estado do agendador |
| `PW_QRTZ_GATILHOS_AGENDADOS` | Tabela utilizada pelo Quartz para controle de triggers agendadas |
| `REGISTRO_FLUXO_AGENDA` | Tabela de Integração das Informações da Agenda com o Registro de Fluxo de Tratamento |
| `RESTRICAO_AGENDAMENTO` | Restrição de agendamento mensal por convênio e especialidade. |
| `SER_DIS_PERFIL_AGENDAMENTO` | Cadastro de Serviço / Perfis de Agendamento |
| `SETOR_PERFIL_AGENDAMENTO` | Cadastro de Setor / Perfis de Agendamento |
| `SITE_AGENDAMENTO` | ARMAZENA INFORMAÇÕES SOBRE O AGENDAMENTO, PARA EXECUÇÃO DO SERVIÇO CONFIGURADO. |
| `SITE_AGENDAMENTO_PROJETO_SERV` | Relaciona agendamentos ao projeto e/ou serviço |
| `SOLICITACAO_AGENDAMENTO` | Tabela responsável em manter as solicitações de atendimentos da central de regulação |
| `SOLIC_AGENDAMENTO` | Solictação de Agendamento de Tratamento clínico |
| `SOS_IT_AGENDA_CIRU` |  |
| `TIP_MAR_PERFIL_AGENDAMENTO` | Cadastro de Tipo de Atendimento / Perfis de Agendamento |
| `TP_INDICACAO_AGENDA` | Tabela de Cadastro de Tipos de Indicacao de Agenda |
| `TROCPAC_AGENDA_TURMA_FILA` | Log da tabela AGENDA_TURMA_FILA |
| `TROCPAC_AGENDA_TURMA_PACIENTE` | Log da tabela AGENDA_TURMA_FILA |
| `USUARIO_AGENDA_CENTRAL` | Tabela que relaciona usuários para configuração de permissões no Sistema |
| `USUARIO_PERFIL_AGENDAMENTO` | Cadastro de Usuário / Perfis de Agendamento |
| `VDIC_AGENDA_SCMA` | Lista as Agendas da Central de Marcação |
| `VDIC_ATENDER_CONSULTA_AGENDADA` | Tabela dos atendimentos ambulatoriais agendados |
| `VDIC_ESCALA_AGENDA_SCMA` | Lista as Ecalas para geração de Agendas da Central de Marcação |
| `VDIC_GRUPO_AGENDAMENTO_SCMA` | Lista Grupos cadastrados para a Central de Marcação |
| `VDIC_HORARIOS_AGENDA_SCMA` |  |
| `VDIC_ITEM_AGENDAMENTO_CONFLITO` | Lista Itens de agendamento que possuem conflitos de realização com outos Itens da Central de Marcação |
| `VDIC_ITEM_AGENDAMENTO_EQUIPTO` | Lista Os Equipamentos que são requeridos para a realização de determinados Itens de Agendamento da Central de Marcação |
| `VDIC_ITEM_AGENDAMENTO_RECURSO` | Lista Os Recursos que realizam determinados Itens de Agendamento da Central de Marcação |
| `VDIC_ITEM_AGENDAMENTO_SCMA` | Lista Os Itens de Agendamento da Central de Marcação |
| `VDIC_ITEM_AGENDAMENT_PRESTADOR` | Lista Os Prestadores que realizam determinados Itens de Agendamento da Central de Marcação |
| `VDIC_LOG_OPERACAO_AGENDA_SCMA` | Registro de operações realizadas na agenda: Bloqueio / Desbloqueio de agenda, Exclusão de Agenda, Exclusão de horário, Cancelamento de Horário, Reversão de Cancelamento de horário |
| `VDIC_LOG_OPERA_AGENDA_CENTRAL` |  |
| `VDIC_MOVIMENTA_PAC_AGENDADO` |  |
| `VDIC_PERGUNTA_RESPOSTA_AGENDA` | Tabela de Plantões Agendados. |
| `VDIC_RECEPCAO_AGENDA` |  |
| `V_AGENDA` |  |
| `V_AGENDAMENTO` |  |
| `V_AGENDA_CENTRAL_GUPO_PAC` |  |
| `V_AMAP_AGENDA` |  |
| `V_AMAP_AGENDA_PAC` |  |
| `V_MANUTENCAO_AGENDA_TURMA` |  |

## Família ATENDIME / ALTA / ÓBITO (110 tabelas)

| Tabela | Descrição |
|---|---|
| `APOLICE_ATENDIMENTO` | Tabela vínculo entre atendimento e apólice |
| `ARQUIVO_ATENDIMENTO` |  |
| `ARQUIVO_ATENDIME_PESQUISA` | Tabela que guarda a ligação da pesquisa com o arquivo atendimento. |
| `ATENDIME` |  |
| `ATENDIMENTO_AUTORIZA_CRDP_ACOM` | Tabela De Atendimento a ser autorizado para fornecimento de refeições para o acompanhante pelo convênio. |
| `ATENDIMENTO_COPIA` |  |
| `ATENDIMENTO_SUS_CIHA` | Tabela da produção SUS para cálculo da filantropia na CIHA |
| `ATENDIMENTO_TIPO_AUDIT_ISOLAMT` | Tabela de cadastro dos itens de prescricao sobre auditoria de isolamento para o atendimento |
| `ATENDIMENTO_XML` | tabela de atendimentos importados do XML para o custos |
| `ATENDIME_ANT_PRO` | Tabela de cadastro dos produtos sobre auditoria para o atendimento |
| `ATENDIME_CASOS_CONFIDENCIAL` | Informações conficenciais da Consulta de atendimento Ambulatorial |
| `ATENDIME_CHAMADA_PAINEL` |  |
| `ATENDIME_CONSUMO` | Cadastro dados sobre Conta de Reposição de Consumo |
| `ATENDIME_GLOBAL_HEALTH` | Tabela de atendimentos integrados da Global Health |
| `ATENDIME_GRUPO_ASSISTENCIAL` | Tabela usada para cadastrar a movimentação do grupo assistencial |
| `ATENDIME_HCARE` |  |
| `ATENDIME_INDICE_ASIS` | Cadastro do estado de gravidade do paciente (ASIS) |
| `ATENDIME_INFO` |  |
| `ATENDIME_LAUDO_AIH` | Tabela de dados complementares para o Laudo AIH associados ao atendimento. |
| `ATENDIME_OBS_LACTARIO` |  |
| `ATENDIME_ORI_MEIO_MAG` | Tabela para guardar a informação do tipo de tratamento Planserv, por atendimento. |
| `ATENDIME_PRESTADOR_EXTERNO` | Tabela de relacionamento entre atendimentos e prestadores externos ao hospital |
| `ATENDIME_PROCEDIMENTO` | Tabela de Procedimentos do Atendimento. |
| `ATENDIME_PROC_PRO_INT` |  |
| `ATENDIME_PROGRAMA` | Tabela usada para cadastrar a movimentação dos leitos do programa SOS Emergencia |
| `ATENDIME_PRO_INT` |  |
| `ATENDIME_SESSAO` |  |
| `CAD_OBITO` |  |
| `CANCELAMENTO_DECL_OBITO` |  |
| `CARATER_ATENDIMENTO` | Caracteristicas do Atendimento Ambulatorial SUS. |
| `CEP_UNIDADE_ATENDIMENTO` | Tabela de faixa de ceps por unidade de atendimento |
| `CONFIGURA_ATENDIMENTO` |  |
| `CONFIG_USUARIO_ATENDIME` | Tabela de configuração dos campos Default do usuario e/ou maquina para o atendimento. |
| `DIAGNOSTICO_ATENDIME` | Diagnósticos atribuído ao paciente durante sua internação |
| `DIAGNOSTICO_ATENDIME_PROTOCOLO` | Protocolos do atendimento |
| `ENT_PRO_ATENDIMENTO` | Tabela que irá armazenar os atendimentos relacionados a entrada de nota fiscal de consignado |
| `EVOLUCAO_ATENDIME_ASIS` | Armazena os cinco indices da classificação ASIS (A,B,C,D,E)e seus respectivos pesos |
| `FA_CUSTO_ATENDIMENTO` |  |
| `FA_IT_CUSTO_ATENDIMENTO` | Tabela para lançamento dos item de custo atendimento. |
| `FFAS_ITENS_ATENDIMENTO` | Tabela de carga para faturamento sus ambulatorial. |
| `FFIS_ITENS_ATENDIMENTO` | Tabela de carga para faturamento sus internação. |
| `FNRM_REPASSE_ATENDIMENTO` | Tabela de valores de honorários por atendimento FNRM para o MV Custos |
| `GUIA_ATENDIMENTO_NORMA24` | Tabela da Norma 24 envio dos Egresos. |
| `GUIA_ATENDIME_OBITO_NORMA24` |  |
| `GUIA_ATENDIME_PROC_NORMA24` |  |
| `GUIA_ATENDIME_RN_NORMA24` |  |
| `HORARIO_PAINEL_ATENDIMENTO` | Monitoramento de sessões de oncologia |
| `IMVAPP_CONVENIO_TP_ATENDIMENTO` |  |
| `IT_CONFIG_USUARIO_ATENDIME` | Tabela dos itens de configuração dos campos Default do usuario e/ou maquina para o atendimento. |
| `LOG_EXCL_ATENDIME` |  |
| `LOG_EXPORT_ATENDIME` |  |
| `LOG_OPERACAO_ATENDIMENTO` | Tabela de log de operações de atendimentos |
| `LOG_PACIENTE_ATENDIME` | Tabela para guardar as informações do paciente em relação a um atendimento |
| `MODALIDADE_ATENDIMENTO` | Cadastro de modalidades de atendimento |
| `MULTI_EMPRESAS_MOD_ATENDIMENTO` | Tabela de relacionamento entre multi empresa e modalidade de atendimento SUS |
| `PACIENTE_OBITO` | Tabela de Registros de Pacientes que foram a obito para o processo de apagar os registros de agendamentos |
| `PAINEL_ATENDIMENTO` | Painel de atendimento |
| `PAINEL_DIG_ATENDIME` |  |
| `PENDENCIA_ATENDIMENTO` |  |
| `PRESTADOR_VINCULO_ATENDIME` | Tabela de vínculo do prestador provisório com o atendimento. |
| `PRIORID_ATENDIME_TRIAGEM` |  |
| `PROIB_ORIG_ATENDIME` | Tabela armazena configurações sobre proibição de origem de atendimento |
| `PT_EVOL_ATENDIME` | Tabela de informacoes de evolucao do atendimento do paciente para o sistema de portaria. |
| `PW_DIAGNOSTICO_ATENDIME_CID` | Armazena as informações históricas dos cid´s secundaários. |
| `PW_DIAGNOSTICO_ATENDIME_SNOMED` | Armazena as informações históricas dos diagnosticos secundários em SNOMED-CT. |
| `PW_ESPECIALIDADE_ATENDIMENTO` | tabela para o cadastro de especialidade por tipo de atendimento para o filtro do parecer. |
| `PW_GRUPO_DIAGNOSTICO_ATENDIME` | Tabela de versionamento dos registros da tabela DBAMV.DIAGNOSTICO_ATENDIME. |
| `PW_LISTA_AMB_ATENDIMENTO_SETOR` | AMB-Atendimentos do setor |
| `PW_LISTA_EM_ATENDIMENTO` | Registra a entrada no prontuário do paciente e controla a concorrência avisando quando outro profissional acessa o mesmo paciente simultaneamente |
| `PW_LISTA_EXT_ATENDIMENTO_SETOR` | EXT-Atendimentos do setor |
| `PW_RESPOSTA_EX_FIS_ATENDIME` | Tabela para Resposta Exame Fisico Atendimento |
| `PW_SETOR_TIPO_ATENDIMENTO` | Tabela que armazena os registros de relação entre setor e tipo do atendimento. |
| `REGRA_ATENDIMENTO` |  |
| `REGRA_ATENDIMENTO_PRO_FAT` |  |
| `REPASSE_VIRTUAL_ATENDIME` |  |
| `SACR_AUDITORIA_TRIAG_ATENDIME` | Tabela associativa entre SACR_AUDITORIA e TRIAGEM_ATENDIMENTO |
| `SACR_TRIAGEM_ATENDIME_HIST_TIP` | Tabela que armazena o histórico de tipos de triagens |
| `SOLICITACAO_ATENDIMENTO` | Tabela responsável em manter as solicitações de atendimentos da central de regulação |
| `SOLICITACAO_ATENDIMENTO_SIDRA` | Tabela da Solicitacao de Atendimento SIDRA. |
| `SOLIC_ATENDIMENTO_REGULACAO` | Tabela de solicitação de atendimento de regulação. |
| `STATUS_ARQUIVO_ATENDIMENTO` | Armazena os status possíveis dos arquivos anexos ao prontuário |
| `TBL_JOB_AVICIR_ATENDIME` |  |
| `TEMP_FFCH_FA_CUSTO_ATENDIMENTO` | TABELA TEMPORARIA PARA CONSOLIDACAO DO PACIENTE |
| `TIPO_ATENDIMENTO_APAC` | Tipo de Atendimento APAC |
| `TISS_ITGUIA_OBITO` | Estrutura dos CIDs de obito |
| `TP_ATENDIMENTO_CONFIGURACAO` | Tabela para configuração dos tipos de atendimento para verificação de preço ao lançar item. |
| `TRANSCRICAO_ATENDIMENTO` | Tabela que armazena a transcrição de um atendimento médico e o formulário gerado com base nela. |
| `TRIAGEM_ATENDIMENTO` | Cadastramento de pre-atendimento para classificacao de risco |
| `TRIAGEM_ATENDIMENTO_HISTORICO` | Histórico de Triagem Atendimento |
| `TRIAGEM_ATENDIMENTO_HIST_ALERG` | Tabela designada a guardar as informações referentes as substancias(Alergias) que a triagemAtendimentoHistorico possui no meomento de cada classificação |
| `TRIAG_ATENDIME_HIST_PAGU_AVAL` | Tabela associativa entre PAGU_AVALIACAO e TRIAGEM_ATENDIMENTO_HISTORICO |
| `TROCPAC_ATENDIME_HCARE` | Registro do atendimento home care |
| `TROCPAC_LOG_PACIENTE_ATENDIME` | TABELA PARA GUARDAR AS INFORMACÕES DO PACIENTE EM RELAÇÃO A UM ATENDIMENTO |
| `UNIDADE_ATENDIMENTO` | Unidade de atendimento da Central de Marcação |
| `UNIDADE_ATENDIMENTO_EMPRESA` | Tabela de cadastro da relação empresa com unidade de atendimento. |
| `UNIDADE_ATENDIMENTO_PERF_AGDM` | Cadastro de Unidade de Atendimento / Perfis de Agendamento |
| `USUARIO_UNID_ATENDIMENTO` | Tabela de Configuração de Acesso da Central de Marcação: Usuários X Unidade de Atendimento. |
| `VDIC_ATENDIMENTO` | Tabela Geral de Atendimentos |
| `VDIC_CONTA_ATENDIMENTO` | Contas dos pacientes que foram Internados |
| `VDIC_UNIDADE_ATENDIMENTO_SCMA` | Lista Unidades de Atendimento da Central de Marcação |
| `V_ATENDIME_GASES` |  |
| `V_ATENDIME_PRO_INVASIVO` |  |
| `V_CONSULTA_ATENDIME_PSIH` |  |
| `V_CONSULTA_REPASSE_ATENDIMENTO` |  |
| `V_DECLARACAO_OBITO` |  |
| `V_FFIS_ATENDIMENTOS_PACIENTE` |  |
| `V_IMVMICRODATA_ATENDIMENTOS` | View de Atendimento utilizada pela Microdata (Digital Clinic). |
| `V_LOTE_ATENDIMENTO` |  |
| `V_R_ATENDIMENTOS_CONVENIO` |  |
| `V_UNIDADE_ATENDIMENTO` |  |

## Família PACIENTE (129 tabelas)

| Tabela | Descrição |
|---|---|
| `AGENDA_TURMA_PACIENTE` |  |
| `AUXILIA_SUS_PACIENTE` | Tabela Auxiliar do SUS para Paciente. |
| `BIOMETRIA_PACIENTE` | Tabela das biometrias do paciente |
| `BIOMETRIA_PACIENTE_IMG` | Tabela de imagens dos dedos dos pacientes |
| `CARACT_CLINICA_PACIENTE` | Caracteristicas clinicas do paciente segundo indice ASIS |
| `CATEGORIA_PACIENTE` | Tabela que irá armazenar a categoria associada ao paciente |
| `CONFIGURACAO_PACIENTE` | Tabela de configuração do cadastro de paciente auxiliar. |
| `CONFIGURACAO_PACIENTE_AUX` | Tabela de configuração do cadastro de paciente auxiliar. |
| `CONFIGURA_PACIENTE` |  |
| `CONFIG_BIOMETRIA_PACIENTE` | Tabela para configuração da biometria do paciente |
| `CONSUMO_PACIENTE` |  |
| `CONTATO_PACIENTE` | Tabela de cadastro de telefones de contato do paciente |
| `CONTATO_PACIENTE_EXTERNO` | Tabela de Acompanhamento de Pacientes Externos |
| `COTA_PACIENTE` | Armazena dados complementares da marcação da consulta do paciente pelo sistema MVGERC |
| `ELEGIBILIDADE_PACIENTE` | REGISTROS DE SOLICITAÇÕES DE ELEGIBILIDADE DO PACIENTE NA OPERADORA |
| `ENDERECO_PACIENTE` | Tabela de cadastro de telefones do paciente |
| `ENVIO_DADOS_PACIENTE` | Tabela da Norma 24 envio do Padrão Geral de Saúde |
| `ESTADO_PACIENTE_PROG_SAUDE` | TABELA ESTADO DO PACIENTE. |
| `FOTO_PACIENTE` | Armzena fotos dos pacientes |
| `GRAVIDADE_PACIENTE_SIDRA` | Tabela da Gravidade do Paciente SIDRA. |
| `HIST_PACIENTE_PROGRAMA_SAUDE` | TABELA DE HISTÓRICO DO PACIENTE EM PROGRAMAS DE SAUDE. ESTÁ TABELA É UM ESPELHO DA CICLO DE VIDA DO PACIENTE NO PROGRAMA |
| `INDICACAO_PACIENTE` | Registro de Indicacao de Pacientes |
| `ITCONSUMO_PACIENTE` |  |
| `LIGACAO_PACIENTE` | Tabela para cadastramento das ligações telefônicas para cobrança mediante tarifação |
| `LOG_DOC_ORFAO_PACIENTE` | Tabela para logar quantos registros foram excluídos de um paciente com documentos orfaos. |
| `LOG_EXCLUSAO_PACIENTE` | Tabela de Log de Exclusão do Cadastro de Paciente |
| `LOG_PACIENTE_ATENDIME` | Tabela para guardar as informações do paciente em relação a um atendimento |
| `LOG_PACIENTE_PROGRAMA_SAUDE` | Log da tabela dbamv.paciente_programa_saude |
| `LOG_PRIORID_PACIENTE` | Tabela de log das prioridades do paciente. |
| `LOG_TRANSF_PACIENTE` |  |
| `LOG_UNIFICA_PACIENTE_INTEGRA` | Log de Unificação de Pacientes |
| `MVTO_PACIENTE` |  |
| `OUTROS_CONTATOS_PACIENTE` | Tabela de cadastro de telefones do paciente |
| `PACIENTE` |  |
| `PACIENTE_ADICIONAL` |  |
| `PACIENTE_CARTAO` |  |
| `PACIENTE_CONTA_SUS` | Tabela usada para guardar informações do paciente que foram exportadas |
| `PACIENTE_IDENTIDADE` |  |
| `PACIENTE_LISTA_COLUNA` | Tabela com a configuracao da lista de pacientes |
| `PACIENTE_MOTIVO_RESTRICAO_VSIT` | Tabela de vinculo do paciente com os motivos de restrição de visitas |
| `PACIENTE_OBITO` | Tabela de Registros de Pacientes que foram a obito para o processo de apagar os registros de agendamentos |
| `PACIENTE_PRIORIDADE` | Tabela de associação entre paciente e prioridade. |
| `PACIENTE_PROGRAMA_SAUDE` | Tabela de Paciente em Programas de Saude |
| `PACIENTE_RGHC` | Tabela de RGHC - identificador do paciente utilizado pelo hospital. |
| `PEP_SETOR_LISTA_PACIENTE` | Tabela mapeada juntamente com ConfiguracaoUsuarioSetor; identifica a qual ConfiguracaoUsuarioSetor o Setor está relacionado. |
| `PERFIL_ALERTA_PACIENTE` | Tabela de configuração dos perfis de alerta por paciente. |
| `POSICAO_PACIENTE_AMBULANCIA` | Tabela para armazenar posicao paciente dentro da ambulância. |
| `PRESTADOR_VINCULO_PACIENTE` | Tabela de Pacientes relacionados aos vínculos provisórios do Prestador |
| `PRE_PACIENTE` | Tabela de Pré-Cadastro de Paciente |
| `PRIORID_PACIENTE` | tabela de cadastro de prioridade de pacientes no agendamento |
| `PRIORID_PACIENTE_IT_AGEN_CTRAL` | tabela de relação do cadastro de prioridade de pacientes no agendamento |
| `PRIORID_PACIENTE_PED_RX` | tabela de relação do cadastro de prioridade de pacientes no exame de imagem |
| `PT_MVTO_PACIENTE` | Tabela utilizada para as movimentacoes de paciente do Portaria |
| `PW_ACPMT_PACIENTE_ONCO` | Tabela que armazena as informações do acompanhamento oncologico do paciente |
| `PW_ACPMT_PACIENTE_TRATAMENTO` |  |
| `PW_ALERGIA_PACIENTE` |  |
| `PW_CENTRAL_PACIENTE_VIP` | Tabela para armazenar os pacientes configurados como vip |
| `PW_CONFIG_INDICACAO_PACIENTE` | Tabela para guardar as indicações do paciente |
| `PW_DOC_OBSERVACAO_PACIENTE` | Tabela referente ao registro do documento clinico de observações por paciente. |
| `PW_FAMILIA_PACIENTE_ATN` | tabla de pacientes da familia |
| `PW_FAVORITO_PACIENTE` | TABELA QUE ARMAZENA PACIENTES FAVORITOS DO PRESTADOR |
| `PW_HIST_ACPMT_PACIENTE_ONCO` | Tabela que armazena o histórico do acompanhamento oncologico do paciente |
| `PW_HIST_ACPMT_PACIENTE_TRTM` |  |
| `PW_INDICACAO_PACIENTE` | Tabela para guardar as indicações do paciente |
| `PW_LISTA_PACIENTES_AVAL_FARM` | Avaliacao Farmceutica |
| `PW_LOG_OBSERVACAO_PACIENTE` | Tabela para armazenamento de log de informações relevantes do paciente. |
| `PW_OBSERVACAO_PACIENTE` | TABELA QUE ARMAZENA OS REGISTROS DE OBSERVAÇÕES DOS PACIENTES DURANTE OS ATENDIMENTOS. |
| `PW_PACIENTE_CRTE_ENTR_PESQ` | Tabela que guarda os pacientes elegíveis para a pesquisa |
| `PW_PACIENTE_CRTE_SAI_PESQ` | Tabela que contém os pacientes que estão na pesquisa e estão dentro do critério de saída |
| `PW_PACIENTE_C_ENTR_PESQ_HIST` | Tabela que guarda o histórico de movimentação de aceite do usuário à pesquisa |
| `PW_PACIENTE_ENTR_PESQ_MOV` | Tabela que guarda a última movimentação de aceite do usuário à pesquisa |
| `PW_PACIENTE_PESQ` | Tabela que contém os pacientes em pesquisa |
| `PW_PACIENTE_PESQ_HIST` |  |
| `PW_PONTUACAO_PACIENTE` | Tabela que guarda a pontuação dos pacientes. |
| `PW_POSICAO_PACIENTE` | Tabela de cadastro das posições do paciente na aferição (sentado, em pé, deitado, etc.). |
| `PW_PROBLEMA_PACIENTE` | Tabela para guardar os problemas do paciente |
| `PW_PROGRAMA_SAUDE_PACIENTE_ATP` | Tabela que armazena o programa de saï¿½de do paciente. |
| `PW_REGISTRO_OPINIAO_PACIENTE` | Tabela que armazena os registros de opiniões dos pacientes durante os atendimentos. |
| `PW_SENHA_PACIENTE_VIP` | Tabela para armazenar a senha de acesso ao prontuÃ¡rio de um determinado paciente |
| `PW_VACINA_DOSE_PACIENTE` | Tabela que armazena as doses das vacinas |
| `QTD_PROC_ATEND_PACIENTE` | Tabela com configuração de quantidade de atendimento por paciência num período. |
| `SACR_RESPOSTA_PACIENTE` | Tabela que armazena a resposta da pergunta da avaliação do paciente |
| `SAE_DIAGNOSTICO_PACIENTE` | Registro de diagnósticos de pacientes. |
| `SCR_RESPOSTA_PACIENTE` | Tabela que armazena a resposta da pergunta da avaliação do paciente |
| `SNOMEDCT_PACIENTE` |  |
| `STATUS_LISTA_PACIENTE` | Tabela com a lista de status utilizados nos filtros da lista de pacientes |
| `TEMP_PACIENTE_MV` |  |
| `TEMP_PROCESSA_PACIENTE` |  |
| `TIPO_PACIENTE` |  |
| `TIPO_PACIENTE_ITENS_EXAMINAR` |  |
| `TMPMV_CIHA_ORDEM_PACIENTE` | Tabela temporária de ordenação do prontuário do paciente no arquivo da CIHA |
| `TROCPAC_AGENDA_TURMA_PACIENTE` | Log da tabela AGENDA_TURMA_FILA |
| `TROCPAC_AUXILIA_SUS_PACIENTE` | TABELA AUXILIAR DO SUS PARA PACIENTE. |
| `TROCPAC_BIOMETRIA_PACIENTE` | Tabela de imagens dos dedos dos pacientes |
| `TROCPAC_BIOMETRIA_PACIENTE_IMG` | Tabela de imagens dos dedos dos pacientes |
| `TROCPAC_ELEGIBILIDADE_PACIENTE` | REGISTROS DE SOLICITAC?ES DE ELEGIBILIDADE DO PACIENTE NA OPERADORA |
| `TROCPAC_ENVIO_DADOS_PACIENTE` | TABELA DA NORMA 24 ENVIO DO PADR?O GERAL DE SAUDE |
| `TROCPAC_FOTO_PACIENTE` | Armzena Fotos dos Pacientes |
| `TROCPAC_INDICACAO_PACIENTE` | Registro de Indicação de Pacientes |
| `TROCPAC_LOG_PACIENTE_ATENDIME` | TABELA PARA GUARDAR AS INFORMACÕES DO PACIENTE EM RELAÇÃO A UM ATENDIMENTO |
| `TROCPAC_PACIENTE` | Tabela que Armazena as Informações do Same |
| `TROCPAC_PACIENTE_ADICIONAL` | Log da tabela PACIENTE_ADICIONAL |
| `TROCPAC_PACIENTE_CARTAO` | Armazena os logs da tabela PACIENTE_CARTAO |
| `TROCPAC_PACIENTE_PROGRA_SAUDE` | TABELA DE PACIENTE EM PROGRAMAS DE SAUDE |
| `TROCPAC_PACIENTE_RGHC` | TABELA DE RGHC - IDENTIFICADOR DO PACIENTE UTILIZADO PELO HOSPITAL. |
| `TROCPAC_PERFIL_ALERTA_PACIENTE` | Tabela de Configuração dos Perfis de Alerta por Paciente. |
| `TROCPAC_PW_PONTUACAO_PACIENTE` | Tabela que guarda a pontuação dos pacientes. |
| `USUARIO_COLUNA_CAD_PACIENTE` | Campos do cadastro de pacientes associados a usuários com permissão de alteração |
| `VDIC_ATENDER_PACIENTE` | View que seleciona dados do Atendimento x Pedido x Exames |
| `VDIC_CADASTRAR_PACIENTE` | Cadastro de Pacientes |
| `VDIC_CADASTRA_PACIENTE_RES` | Cadastro de Pacientes Resumido |
| `VDIC_CADASTRO_PACIENTE_RES` | Cadastro de Pacientes Resumido |
| `VDIC_CONFIG_PACIENTE` | Tabela com as configurações das colunas do paciente |
| `VDIC_FFCH_CONSOLIDA_PACIENTE` | View que seleciona os atendimentos consolidados. |
| `VDIC_INTERNAR_PACIENTE` | Internação de Pacientes |
| `VDIC_MOVIMENTAR_PACIENTE` | Movimentação do paciente durante o periodo de internação |
| `VDIC_MOVIMENTA_IMG_PACIENTE` |  |
| `VDIC_MOVIMENTA_PACIENTE` |  |
| `VDIC_MOVIMENTO_PACIENTE` | Cadastro de Movimento do Paciente |
| `VDIC_MOVIMETAR_PACIENTE` | Movimentação do paciente durante o periodo de internação |
| `VDIC_PACIENTE` | Cadastro de Pacientes |
| `VDIC_PACIENTES_GRUPO_SCMA` | Lista os Pacientes cadastradosno Grupo para a Central de Marcação |
| `V_AMAP_C_PACIENTE` |  |
| `V_COMPUTO_PACIENTE` |  |
| `V_CONSULTA_CONTAS_PACIENTE` |  |
| `V_FFIS_ATENDIMENTOS_PACIENTE` |  |
| `V_IMVMICRODATA_PACIENTES` | View de pacientes utilizada na integração com o Digital Clinic (Microdata). |
| `V_PACIENTES_HOMONIMOS` |  |
| `V_PW_LISTA_PRONTUARIO_PACIENTE` | View para listagem dos documentos de prontuário. |

## Família CONVENIO (70 tabelas)

| Tabela | Descrição |
|---|---|
| `AGENDA_CENTRAL_CONVENIO` | Convênios permitidos para a Agenda da Central de Marcações |
| `AGENDA_TURMA_CONVENIO` | Convênios das agendas das turmas. |
| `AUTORIZACAO_CONVENIO_AGDM` | Tabela Para Cadastro de autorização de convenio para empresa |
| `AUTORIZADOR_CONVENIO` | Tabela de relacionamento entre os convenios e as operadoras |
| `AUX_CONVENIO_NOTA` | TABELA PARA ARMAZENAR DADOS DOS LEGADOS DE GLOSA. ESTA TABELA APENAS SERÁ ALIMENTADA NA SUA CRIAÇÃO COM O RESULTADO SO SELECT. |
| `BLOQUEIO_EXAME_CONVENIO` | Tabela para armazenar as configurações de excessões do bloqueio de exames por convênio |
| `CONFIG_CONVENIO_ESTADO` | Tabela de configuracao do IASMPE/IPSEMG |
| `CONFIG_CONVENIO_ESTADO_EQUIPE` | Tabela de configuracao do IASMPE/IPSEMG calculo da equipe |
| `CONFIG_CONVENIO_ESTADO_EQUIPE2` | Tabela de configuração de valores do convenio estado |
| `CONFIG_RELATORIO_CONVENIO` | Configuração do Relatório de Resultado Convênio/SUS. |
| `CONF_EMPRESA_CONVENIO_TAXA_OP` | Tabela responsável pelas taxas por grupos de procedimentos |
| `CONVENIO` |  |
| `CONVENIOS_ORCAMENTO` | CONVENIOS - MV ORÇAMENTO |
| `CONVENIO_BANCARIO` | Tabela utilizada para armazenar os convênios bancários |
| `CONVENIO_CONF_TISS` | Tabela específica por Convênio para as configurações do TISS. |
| `CONVENIO_CONF_TISS_CONTRATADO` | Tabela de configuração do TISS por convênio - Contratado Solicitante |
| `CONVENIO_CONF_TISS_GLOSA` | Tabela de Glosas da configuração do convênio do TISS |
| `CONVENIO_INTEGRA_SOL_GUIA` |  |
| `CONVENIO_LOGOTIPO` | Tabela para armazenar o logotipo dos convênios |
| `CONVENIO_ORIGEM_SENHA_AUT` | Tabela responsável pelos convênios onde serão verificados os tipos de senhas |
| `CONVENIO_PERFIL_AGENDAMENTO` | Cadastro de Convênio / Perfis de Agendamento |
| `CONVENIO_PLANO_UC` |  |
| `CONVENIO_PL_CONTAS` |  |
| `CONVENIO_PROTOCOLO` | Tabela responsável por armazenar os convênios a serem verificados por protocolo |
| `CONVENIO_PRO_FAT` | Tabela de Configuração dos Procedimentos de Fatura Direta com o Convênio |
| `CONVENIO_PRO_FAT_ISENTO` | Tabela de procedimentos isentos de cobrança |
| `DOCUMENTO_CONVENIO_PLANO` | Tabela de cadastro dos documentos referentes ao convênio |
| `EMPRESA_CONVENIO` |  |
| `ESCALA_CENTRAL_CONVENIO` | Convênios permitidos para a Escala |
| `ESCALA_TURMA_CONVENIO` | Convênios das escalas das turmas |
| `FAIXA_GUIA_CONVENIO` |  |
| `GRUPO_VAL_CONVENIO` |  |
| `IMVAPP_CONVENIO_TP_ATENDIMENTO` |  |
| `ITEM_FAIXA_GUIA_CONVENIO` |  |
| `ITGRUPO_VAL_CONVENIO` | Tabela filha da GRUPO_VAL_CONVENIO |
| `ITMARCACAO_CONVENIO` |  |
| `LOG_CONVENIO_ESTADO` | Tabela de log para armazenar os dados do arquivo txt de importação |
| `LOG_ESCALA_CENTRAL_CONVENIO` | Log do Cadastro de Escalas por Convênio |
| `NOTA_FISCAL_FFCV_CONVENIO_RPS` | Tabela para armazenar o código do convênio no filtro de geração de NFe |
| `OPERADORA_CONVENIO` | Tabela criada para o cadastro de Operadoras das empresas de conectividade, que trabalham  junto aos convênios recebendo os arquivos em meio magnético e encaminhando aos convênios. |
| `ORIENTACAO_CONVENIO_ITEM_AGE` | Tabela de Orientação dos Convenios para o agendamento de exame/procedimento no SCMA |
| `PERFIL_AMBULATORIAL_CONVENIO` | Filtros Avançados do Perfil por Convênio |
| `PRESTADOR_CONVENIO_LIBERADO` |  |
| `PRODUCAO_CONVENIO_CIHA` | Tabela da produção da produção CIHA-SUS |
| `PW_CONFIG_TEMPO_AUTZ_CONVENIO` | Representa o tempo de autorização do convênio para os protocolos |
| `PW_CONVENIO_TIP_PRESC` | Esta tabela  responsvel por armazenar os convnios associados ao item e seus respectivos tipos de permisso |
| `PW_DISPOSITIVO_CONVENIO` |  |
| `P_ESCALA_CONVENIO` |  |
| `SITE_INTEGRA_CONVENIO` | Tabela de configuração da integração do TISS com o Sit-e. |
| `TAB_CONVENIO` |  |
| `TAB_CONVENIO_PT` |  |
| `TEMP_FFCH_DETALHE_CONVENIO` | Temporária de Resultado Convenio/SUS. |
| `TEMP_FFCH_RESUMO_CONVENIO` | Configuração do Relatório de Resultado Convênio/SUS. |
| `TIPO_CATEGORIA_CONVENIO` |  |
| `TIPO_DOCUMENTO_CONVENIO` | Tabela de documentos para convênio |
| `TIPO_SEGURADORA_CONVENIO` | Tabela onde serão cadastrado os tipos de seguradora do convenio |
| `TMPMV_GLOB_FFCV_CONVENIO_RPS` | Tabela para armazenar o código do convênio no filtro de geração de NFe |
| `TRANSFERE_EMPRESA_CONVENIO` | Tabela de regra de transferência de conta por empresa |
| `UNIDADES_CONVENIO_ORCAMENTO` | UNIDADES DE CONVENIOS - MV ORÇAMENTO |
| `USUARIO_CONVENIO` | Cadastro de Usuário para o Convenio |
| `VAL_EXA_CONVENIO` | Tabela para associar a ordenação do campo do exame no convenio |
| `VAL_PRO_CONVENIO_ESTADO` | Tabela de faturamento do convenio Estado |
| `VDIC_FATURAR_CONTA_CONVENIO` | Ítens de Faturamento de Convênios Esta view contém os principais informações do faturamento entre contas (cabeçalhos) e ítens (lançamentos), sendo que detalhamento é ao nível de ítens. Devido ao grande volume de informações tratadas por esta view, cobra-se atenção quanto à filtros mínimos, por exemplo: - RELATÓRIOS GERENCIAIS: -  Opções de filtros sugeridos:   intervalo de datas, convênios, faturas, empresa (caso o MV2000 esteja trabalhando em regimede multi-empresas) etc... - RELATÓRIOS OPERACIONAIS: - Opções de filtros sugeridos:   convenio, remessa, atendimento, conta, etc... ATENÇÃO:   A view retorna todos ítens de consumo dos pacientes, sendo que para obter somente os faturados (cobrados) deve-se filtrar também os campos "Item_pertence_pacote"  e também "Tipo_pagamento_item" que indicam ítens que não foram cobrados por pertencer à um pacote fechado ou que determinado procedimento foi executado por um prestador cooperado, respectivamente, além dechecar se é uma remessa fechada ou se for o caso uma conta fechada. |
| `VDIC_PROCEDIMENTO_CONVENIO` | View do Faturamento dos Procedimentos no convênio com o de para |
| `V_FNCP_ITEM_CONVENIO` |  |
| `V_FNRM_PRODUCAO_CONVENIO` |  |
| `V_FNRM_PRODUCAO_CONVENIO_CONC` |  |
| `V_IMVMICRODATA_CONVENIO` | View de Convênio utilizada pela Microdata (Digital Clinic). |
| `V_REPASSE_PAGAMENTO_CONVENIO` |  |
| `V_R_ATENDIMENTOS_CONVENIO` |  |
