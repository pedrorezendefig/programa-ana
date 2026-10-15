# SCHEMA.md
<!-- gerado por /snapshot; não editar à mão -->

Banco externo do hospital: o Oracle do MV (owner `DBAMV`), na base TST (teste), só leitura.
O programa não cria nem altera tabela nenhuma; o que está aqui são as tabelas já estudadas,
lidas de `ana/api-mv/dicionario-colunas.md`. Só as colunas que o dicionário cita, não a tabela inteira.
Ligação contínua: chave declarada no fluxo do dicionário; tracejada: referência sem FK formal.
`ND`: tipo que o dicionário não registra. A ficha completa de cada tabela está em ENTIDADES.

## Diagrama ER (Mermaid)

```mermaid
erDiagram
    AGENDA_CENTRAL ||--o{ IT_AGENDA_CENTRAL : "CD_AGENDA_CENTRAL"
    ATENDIME ||--o{ IT_AGENDA_CENTRAL : "CD_ATENDIMENTO"
    ESCALA_CENTRAL ||..o{ AGENDA_CENTRAL : "CD_ESCALA_CENTRAL"
    ESCALA_CENTRAL ||--o{ ESCALA_CENTRAL_ITEM_AGENDA : "CD_ESCALA_CENTRAL"
    ESCALA_CENTRAL ||..o{ GERACAO_AGENDA : "CD_ESCALA"
    EXA_RX ||--o{ ITEM_AGENDAMENTO : "CD_EXA_RX"
    ITEM_AGENDAMENTO ||--o{ ESCALA_CENTRAL_ITEM_AGENDA : "CD_ITEM_AGENDAMENTO"
    ITEM_AGENDAMENTO ||--o{ IT_AGENDA_CENTRAL : "CD_ITEM_AGENDAMENTO"
    MOT_ALT ||--o{ ATENDIME : "CD_MOT_ALT"
    PACIENTE ||--o{ ATENDIME : "CD_PACIENTE"
    PACIENTE ||--o{ IT_AGENDA_CENTRAL : "CD_PACIENTE"
    PACIENTE ||..o{ PACIENTE_OBITO : "CD_PACIENTE"

    IT_AGENDA_CENTRAL {
        NUMBER CD_IT_AGENDA_CENTRAL PK
        NUMBER CD_AGENDA_CENTRAL FK
        NUMBER CD_PACIENTE FK
        NUMBER CD_ITEM_AGENDAMENTO FK
        NUMBER CD_ATENDIMENTO FK
        DATE HR_AGENDA
        _ mais_colunas "+28"
    }

    AGENDA_CENTRAL {
        ND CD_AGENDA_CENTRAL PK
        ND CD_ESCALA_CENTRAL FK
        ND TP_AGENDA
        ND DT_AGENDA
        ND HR_INICIO
        ND HR_FIM
        _ mais_colunas "+10"
    }

    ESCALA_CENTRAL {
        ND CD_ESCALA_CENTRAL PK
        ND TP_ESCALA
        ND TP_DIA_SEMANA
        ND HR_INICIO
        ND HR_FIM
        ND QT_ATENDIMENTO
        _ mais_colunas "+11"
    }

    ITEM_AGENDAMENTO {
        ND CD_ITEM_AGENDAMENTO PK
        ND CD_EXA_RX FK
        ND DS_ITEM_AGENDAMENTO
        ND TP_ITEM
        ND CD_EXA_LAB
        ND CD_PRO_FAT
        _ mais_colunas "+9"
    }

    EXA_RX {
        ND CD_EXA_RX PK
        ND DS_EXA_RX
        ND TP_SEXO
        ND DS_ORIENTACAO
        ND VL_TEMPO_MEDIO
        ND NR_DIAS_ENTREGA
        _ mais_colunas "+1"
    }

    PACIENTE {
        ND CD_PACIENTE PK
        ND NM_PACIENTE
        ND NM_SOCIAL_PACIENTE
        ND SN_UTILIZA_NOME_SOCIAL
        ND DT_NASCIMENTO
        VARCHAR2 NR_CPF
        _ mais_colunas "+12"
    }

    ATENDIME {
        ND CD_ATENDIMENTO PK
        ND CD_PACIENTE FK
        ND CD_MOT_ALT FK
        ND CD_CONVENIO
        ND CD_CON_PLA
        ND TP_ATENDIMENTO
        _ mais_colunas "+24"
    }

    MOT_ALT {
        ND TP_MOT_ALTA
    }

    ATENDIME_GLOBAL_HEALTH {
        ND CD_ATENDIMENTO
        ND TP_ATENDIMENTO
        NUMBER NR_CPF
        ND DH_ATENDIMENTO
        ND DT_ALTA
        ND CD_CID
        _ mais_colunas "+4"
    }
```
