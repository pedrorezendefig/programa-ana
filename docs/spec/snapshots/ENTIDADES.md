# ENTIDADES.md
<!-- gerado por /snapshot; não editar à mão -->

Banco externo do hospital: o Oracle do MV (owner `DBAMV`), na base TST (teste), só leitura.
O programa não cria nem altera tabela nenhuma; o que está aqui são as tabelas já estudadas,
lidas de `ana/api-mv/dicionario-colunas.md`. Só as colunas que o dicionário cita, não a tabela inteira.

## IT_AGENDA_CENTRAL

> Origem: `ana/api-mv/dicionario-colunas.md`

No dicionário: o slot; 90 colunas, 13.125 linhas.

| Campo | Tipo | Constraints | Default | FK | Papel |
|-------|------|-------------|---------|-----|-------|
| `CD_IT_AGENDA_CENTRAL` | `NUMBER` | PK | - | - | PK do slot |
| `CD_AGENDA_CENTRAL` | `NUMBER` | - | - | `AGENDA_CENTRAL.CD_AGENDA_CENTRAL` | FK para a agenda do dia |
| `HR_AGENDA` | `DATE` | - | - | - | horário do slot |
| `CD_PACIENTE` | `NUMBER` | - | - | `PACIENTE.CD_PACIENTE` | nulo = slot livre; preenchido = marcado |
| `NM_PACIENTE` | - | - | - | - | dados soltos da marcação (redundantes com PACIENTE) |
| `DT_NASCIMENTO` | - | - | - | - | dados soltos da marcação (redundantes com PACIENTE) |
| `TP_SEXO` | - | - | - | - | dados soltos da marcação (redundantes com PACIENTE) |
| `CD_ITEM_AGENDAMENTO` | `NUMBER` | - | - | `ITEM_AGENDAMENTO.CD_ITEM_AGENDAMENTO` | o que foi marcado |
| `CD_CONVENIO` | `NUMBER` | - | - | - | pagador (particular tem convênio próprio, ver achado D1 do ultracode) |
| `CD_CON_PLA` | `NUMBER` | - | - | - | pagador (particular tem convênio próprio, ver achado D1 do ultracode) |
| `CD_SUB_PLANO` | `NUMBER` | - | - | - | pagador (particular tem convênio próprio, ver achado D1 do ultracode) |
| `NR_DDD_CELULAR` | - | - | - | - | contato informado NA marcação |
| `NR_CELULAR` | - | - | - | - | contato informado NA marcação |
| `NR_FONE` | - | - | - | - | contato informado NA marcação |
| `DS_EMAIL` | - | - | - | - | contato informado NA marcação |
| `TP_SITUACAO` | `VARCHAR2` | - | - | - | M marcado / A aguardando / E atendido / C cancelado (nulo nas amostras livres) |
| `SN_ATENDIDO` | `S/N` | - | - | - | estado do slot |
| `SN_ENCAIXE` | `S/N` | - | - | - | estado do slot |
| `SN_ENCAIXE_EXTRA` | `S/N` | - | - | - | estado do slot |
| `SN_BLOQUEADO` | `S/N` | - | - | - | estado do slot |
| `CD_ATENDIMENTO` | `NUMBER` | - | - | `ATENDIME.CD_ATENDIMENTO` | FK para ATENDIME quando vira atendimento |
| `CD_IT_AGENDA_PAI` | `NUMBER` | - | - | - | agrupa os horários de uma mesma marcação |
| `DT_GRAVACAO` | `DATE` | - | - | - | quando a marcação foi feita |
| `TP_FORMA_AGENDAMENTO` | `VARCHAR2` | - | - | - | forma/origem da marcação (domínio? C6) |
| `TP_VISUALIZACAO` | `VARCHAR2` | - | - | - | B balcão / I internet |
| `TP_PRESENCA_FALTA` | - | - | - | - | P/F: comparecimento (no-show) |
| `DH_PRESENCA_FALTA` | - | - | - | - | P/F: comparecimento (no-show) |
| `VL_NEGOCIADO` | `NUMBER` | - | - | - | valores do particular |
| `VL_PERC_DESCONTO` | `NUMBER` | - | - | - | valores do particular |
| `CD_SENHA` | - | - | - | - | autorização de convênio |
| `NR_GUIA` | - | - | - | - | autorização de convênio |
| `NR_CARTEIRA` | - | - | - | - | autorização de convênio |
| `DT_VALIDADE_CARTEIRA` | - | - | - | - | autorização de convênio |
| `DT_ENVIO_COMPROVANTE` | `DATE` | - | - | - | comprovante enviado (SMS legado) |

## AGENDA_CENTRAL

> Origem: `ana/api-mv/dicionario-colunas.md`

No dicionário: a agenda de um dia; 44 colunas, 425 linhas.

| Campo | Tipo | Constraints | Default | FK | Papel |
|-------|------|-------------|---------|-----|-------|
| `CD_AGENDA_CENTRAL` | - | PK | - | - | - |
| `TP_AGENDA` | - | - | - | - | - |
| `DT_AGENDA` | - | - | - | - | - |
| `HR_INICIO` | - | - | - | - | - |
| `HR_FIM` | - | - | - | - | - |
| `CD_PRESTADOR` | - | - | - | - | - |
| `CD_SETOR` | - | - | - | - | - |
| `CD_UNIDADE_ATENDIMENTO` | - | - | - | - | - |
| `QT_ATENDIMENTO` | - | - | - | - | - |
| `QT_ENCAIXES` | - | - | - | - | - |
| `QT_MARCADOS` | - | - | - | - | - |
| `QT_ENCAIXES_MARCADOS` | - | - | - | - | - |
| `DT_LIBERACAO` | - | - | - | - | - |
| `TP_HORARIO` | - | - | - | - | - |
| `SN_ATIVO` | - | - | - | - | - |
| `CD_ESCALA_CENTRAL` | - | - | - | `ESCALA_CENTRAL.CD_ESCALA_CENTRAL` | - |

## ESCALA_CENTRAL

> Origem: `ana/api-mv/dicionario-colunas.md`

No dicionário: o molde; 32 colunas, 237 linhas.

| Campo | Tipo | Constraints | Default | FK | Papel |
|-------|------|-------------|---------|-----|-------|
| `CD_ESCALA_CENTRAL` | - | PK | - | - | - |
| `TP_ESCALA` | - | - | - | - | - |
| `TP_DIA_SEMANA` | - | - | - | - | - |
| `HR_INICIO` | - | - | - | - | - |
| `HR_FIM` | - | - | - | - | - |
| `QT_ATENDIMENTO` | - | - | - | - | - |
| `QT_ENCAIXE` | - | - | - | - | - |
| `CD_PRESTADOR` | - | - | - | - | - |
| `CD_SETOR` | - | - | - | - | - |
| `CD_RECURSO_CENTRAL` | - | - | - | - | - |
| `CD_UNIDADE_ATENDIMENTO` | - | - | - | - | - |
| `QT_DIAS_LIBERACAO` | - | - | - | - | - |
| `SN_ATIVO` | - | - | - | - | - |
| `NR_IDADE_MINIMA` | - | - | - | - | - |
| `QT_PESO_MAXIMO` | - | - | - | - | - |
| `ESCALA_CENTRAL_ITEM_AGENDA` | - | - | - | - | - |
| `QT_MAX_ITEM_AGENDAMENTO` | - | - | - | - | - |

## ITEM_AGENDAMENTO

> Origem: `ana/api-mv/dicionario-colunas.md`

No dicionário: o catálogo; 21 colunas, 2.057 linhas.

| Campo | Tipo | Constraints | Default | FK | Papel |
|-------|------|-------------|---------|-----|-------|
| `CD_ITEM_AGENDAMENTO` | - | PK | - | - | - |
| `DS_ITEM_AGENDAMENTO` | - | - | - | - | - |
| `TP_ITEM` | - | - | - | - | - |
| `CD_EXA_RX` | - | - | - | `EXA_RX.CD_EXA_RX` | - |
| `CD_EXA_LAB` | - | - | - | - | - |
| `CD_PRO_FAT` | - | - | - | - | - |
| `HR_REALIZACAO` | - | - | - | - | - |
| `QT_DIAS_PREPARO` | - | - | - | - | - |
| `DT_TEMPO_PREPARO` | - | - | - | - | - |
| `QT_TEMPO_INTERVALO` | - | - | - | - | - |
| `TP_INTERVALO` | - | - | - | - | - |
| `SN_OBRIGA_PACIENTE_AGENDAMENTO` | - | - | - | - | - |
| `SN_OBRIGA_INDICACAO_CLINICA` | - | - | - | - | - |
| `SN_ATIVO` | - | - | - | - | - |
| `DS_MNEMONICO` | - | - | - | - | - |

## EXA_RX

> Origem: `ana/api-mv/dicionario-colunas.md`

No dicionário: exames de imagem; 36 colunas, 1.145 linhas.

| Campo | Tipo | Constraints | Default | FK | Papel |
|-------|------|-------------|---------|-----|-------|
| `CD_EXA_RX` | - | PK | - | - | - |
| `DS_EXA_RX` | - | - | - | - | - |
| `TP_SEXO` | - | - | - | - | - |
| `DS_ORIENTACAO` | - | - | - | - | - |
| `VL_TEMPO_MEDIO` | - | - | - | - | - |
| `NR_DIAS_ENTREGA` | - | - | - | - | - |
| `SN_ATIVO` | - | - | - | - | - |

## PACIENTE

> Origem: `ana/api-mv/dicionario-colunas.md`

No dicionário: 157 colunas, 2.499 linhas aqui.

| Campo | Tipo | Constraints | Default | FK | Papel |
|-------|------|-------------|---------|-----|-------|
| `CD_PACIENTE` | - | PK | - | - | - |
| `NM_PACIENTE` | - | - | - | - | - |
| `NM_SOCIAL_PACIENTE` | - | - | - | - | - |
| `SN_UTILIZA_NOME_SOCIAL` | - | - | - | - | - |
| `DT_NASCIMENTO` | - | - | - | - | - |
| `NR_CPF` | `VARCHAR2(11)` | - | - | - | - |
| `NR_CNS` | - | - | - | - | - |
| `NR_DDD_CELULAR` | - | - | - | - | - |
| `NR_CELULAR` | - | - | - | - | - |
| `NR_DDD_FONE` | - | - | - | - | - |
| `NR_FONE` | - | - | - | - | - |
| `SN_RECEBE_CONTATO` | - | - | - | - | - |
| `SN_NOTIFICACAO_SMS` | - | - | - | - | - |
| `TP_SITUACAO` | - | - | - | - | - |
| `SN_ATIVO` | - | - | - | - | - |
| `CD_PACIENTE_EXTERNO` | - | - | - | - | - |
| `CD_PACIENTE_INTEGRA` | - | - | - | - | - |
| `DS_HASH` | - | - | - | - | - |

## ATENDIME

> Origem: `ana/api-mv/dicionario-colunas.md`

No dicionário: o atendimento; 182 colunas, 29 linhas aqui.

| Campo | Tipo | Constraints | Default | FK | Papel |
|-------|------|-------------|---------|-----|-------|
| `CD_ATENDIMENTO` | - | PK | - | - | - |
| `CD_PACIENTE` | - | - | - | `PACIENTE.CD_PACIENTE` | quem e por qual pagador |
| `CD_CONVENIO` | - | - | - | - | quem e por qual pagador |
| `CD_CON_PLA` | - | - | - | - | quem e por qual pagador |
| `TP_ATENDIMENTO` | - | - | - | - | tipo (amostras: U, E, A; domínio completo a confirmar em C6: ambulatório/urgência/internação/externo) |
| `DT_ATENDIMENTO` | - | - | - | - | quando |
| `HR_ATENDIMENTO` | - | - | - | - | quando |
| `DT_CHEGADA_PACIENTE` | - | - | - | - | quando |
| `CD_PRESTADOR` | - | - | - | - | quem atendeu e onde |
| `CD_ESPECIALID` | - | - | - | - | quem atendeu e onde |
| `CD_SERVICO` | - | - | - | - | quem atendeu e onde |
| `CD_SETOR_LOCAL_FSCC` | - | - | - | - | quem atendeu e onde |
| `DT_ALTA` | - | - | - | - | alta administrativa vs médica |
| `HR_ALTA` | - | - | - | - | alta administrativa vs médica |
| `DT_ALTA_MEDICA` | - | - | - | - | alta administrativa vs médica |
| `CD_MOT_ALT` | - | - | - | `MOT_ALT.CD_MOT_ALT` | motivo da alta → MOT_ALT (nas amostras veio nulo mesmo com DT_ALTA: confirmar obrigatoriedade em C6) |
| `SN_OBITO` | - | - | - | - | sinais diretos de óbito |
| `CD_CID_OBITO` | - | - | - | - | sinais diretos de óbito |
| `NR_DECLARACAO_OBITO` | - | - | - | - | sinais diretos de óbito |
| `CD_SETOR_OBITO` | - | - | - | - | sinais diretos de óbito |
| `TP_ENCAMINHAMENTO_OBITO` | - | - | - | - | sinais diretos de óbito |
| `SN_RETORNO` | - | - | - | - | retorno |
| `DT_RETORNO` | - | - | - | - | retorno |
| `CD_ESCALA_DIA` | - | - | - | - | ponte de volta: qual escala/horário gerou o atendimento |
| `HR_AGENDA` | - | - | - | - | ponte de volta: qual escala/horário gerou o atendimento |
| `CD_SISTEMA` | - | - | - | - | qual sistema criou o atendimento (domínio? C6) |
| `SN_INTERNADO` | - | - | - | - | internação |
| `CD_LEITO` | - | - | - | - | internação |
| `CD_TIPO_INTERNACAO` | - | - | - | - | internação |
| `CD_MULTI_EMPRESA` | - | - | - | - | unidade |

## MOT_ALT

> Origem: `ana/api-mv/dicionario-colunas.md`

No dicionário: 28 motivos, catálogo real.

| Campo | Tipo | Constraints | Default | FK | Papel |
|-------|------|-------------|---------|-----|-------|
| `TP_MOT_ALTA` | - | - | - | - | - |

## ATENDIME_GLOBAL_HEALTH

> Origem: `ana/api-mv/dicionario-colunas.md`

No dicionário: interface GH; 10 colunas, 0 linhas.

| Campo | Tipo | Constraints | Default | FK | Papel |
|-------|------|-------------|---------|-----|-------|
| `CD_ATENDIMENTO` | - | - | - | - | - |
| `TP_ATENDIMENTO` | - | - | - | - | - |
| `NR_CPF` | `NUMBER` | - | - | - | - |
| `DH_ATENDIMENTO` | - | - | - | - | - |
| `DT_ALTA` | - | - | - | - | - |
| `CD_CID` | - | - | - | - | - |
| `DS_CID` | - | - | - | - | - |
| `DS_PRESTADOR` | - | - | - | - | - |
| `DS_ESPECIALIDADE` | - | - | - | - | - |
| `DS_ESTABELECIMENTO` | - | - | - | - | - |
