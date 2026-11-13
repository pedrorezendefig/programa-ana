# Fluxos Conversacionais

Roteiros e diagramas de cada jornada. Cada fluxo mostra o **caminho feliz pela API** e o **ponto de decisão híbrido** (sucesso → `AGENDADO`; bloqueio/falha → fila humana). As falas seguem o estilo da Ana: PT-BR, acolhedor, frases curtas, uma pergunta por mensagem, sem markdown.

> Convenção dos diagramas: retângulo = ação/fala da Ana · losango = decisão · 🔧 = chamada de tool · verde = sucesso · âmbar = fallback humano.

---

## 1. Agendar consulta — Particular

A Sheet dá o discurso comercial (diferenciais + valor); a API dá o horário e executa.

```mermaid
flowchart TD
    S[Paciente: quero agendar cardiologia] --> E1[Pergunta acolhedora: convenio ou particular?]
    E1 --> P[Particular]
    P --> G1[🔧 Get_Consultas: diferenciais + valor]
    G1 --> T1[🔧 Aplicar_tag: particular-aquecido]
    T1 --> D[🔧 Buscar_disponibilidade]
    D --> Q{Item bloqueado<br/>ou sem horario?}
    Q -->|Sim| FB[Acolhe + fila + Escalar_humano]:::fb
    Q -->|Nao| L[Mostra horarios numerados]
    L --> ESC[Paciente escolhe numero]
    ESC --> CPF[Coleta e valida nome + CPF]
    CPF --> ID[🔧 Identificar_paciente / Cadastrar]
    ID --> TIPO[🔧 Pre_requisitos: tipo de consulta]
    TIPO --> CONF[Resumo + Posso confirmar?]
    CONF --> OK{Paciente confirma?}
    OK -->|Nao| L
    OK -->|Sim| EF[🔧 Efetivar_agendamento]
    EF --> R{sucesso true?}
    R -->|Sim| FIM[Da protocolo + Atualizar_lead AGENDADO + tag agendado-bot]:::ok
    R -->|Nao| FB
    classDef ok fill:#16a34a,stroke:#15803d,color:#fff;
    classDef fb fill:#b45309,stroke:#92400e,color:#fff;
```

**Roteiro (exemplo):**
```
Paciente: quero marcar uma consulta de cardiologia
Ana: Claro! Você vai usar convênio ou prefere agendar como particular? Pergunto para já verificar tudo certinho.
Paciente: particular
Ana: Aqui no São Matheus você conta com cardiologistas e estrutura de diagnóstico completa.
     A consulta de cardiologia é R$ 120. Posso verificar os horários disponíveis?
Paciente: pode
Ana: Encontrei estes horários:
     1 - 03/06 às 11h, Dra. Fernanda
     2 - 04/06 às 13h45, Dra. Caroline
     Qual número fica melhor?
Paciente: 1
Ana: Para confirmar o agendamento, pode me passar seu nome completo e CPF?
Paciente: Paciente Teste, 000.000.000-00
Ana: Confirmando: consulta de cardiologia, 03/06 às 11h, com a Dra. Fernanda, no valor de R$ 120. Posso confirmar?
Paciente: sim
Ana: Prontinho, sua consulta está agendada!
     Protocolo 725782, dia 03/06 às 11h, na Rua Silva Cardoso, 689. Posso ajudar em mais algo?
```

---

## 2. Agendar consulta — Convênio

O portal (`centraldemarcacao.com.br`) deixa de ser o caminho principal e vira **fallback**.

```mermaid
flowchart TD
    S[Paciente: tenho Unimed, quero ortopedia] --> CONV[🔧 Buscar_disponibilidade<br/>resolve convenio + plano + item]
    CONV --> Q{Cobre? Tem horario?}
    Q -->|Nao cobre / bloqueado| OFF[Oferece particular ou fallback]:::fb
    Q -->|Sim| CART[Pede carteirinha + valida nome/CPF]
    CART --> ID[🔧 Identificar_paciente]
    ID --> L[Mostra horarios numerados]
    L --> ESC[Paciente escolhe numero]
    ESC --> CONF[Resumo + confirma?]
    CONF --> EF[🔧 Efetivar_agendamento]
    EF --> R{sucesso true?}
    R -->|Sim| FIM[Protocolo + AGENDADO + agendado-bot]:::ok
    R -->|Nao| PORTAL[Fallback: tag agendamento-convenio +<br/>AGUARDANDO CONFIRMACAO + manda link do portal]:::fb
    classDef ok fill:#16a34a,stroke:#15803d,color:#fff;
    classDef fb fill:#b45309,stroke:#92400e,color:#fff;
```

> **O comportamento de hoje (link do portal + "me avisa se conseguiu?") é exatamente o ramo de fallback.** Nada do que já funciona é descartado.

---

## 3. Agendar exame (com triagem e anexos)

Diferença para consulta: `Pre_requisitos_agendamento` traz **perguntas de triagem** (com bloqueio por `impedeRealizacao`) e pode exigir **anexos**.

```mermaid
flowchart TD
    S[Paciente: quero agendar uma tomografia] --> D[🔧 Buscar_disponibilidade tipo=exame]
    D --> L[Mostra horarios numerados] --> ESC[Paciente escolhe numero]
    ESC --> PRE[🔧 Pre_requisitos: perguntas do exame]
    PRE --> ASK[Ana faz as perguntas de triagem]
    ASK --> IMP{Alguma resposta<br/>impedeRealizacao = S?}
    IMP -->|Sim| BLOQ[Informa o motivo, nao agenda, escala]:::fb
    IMP -->|Nao| ANX{Exige anexo?}
    ANX -->|Sim| UP[🔧 Gerenciar_anexos: pede e sobe o arquivo]
    ANX -->|Nao| CONF
    UP --> CONF[Resumo + confirma?]
    CONF --> EF[🔧 Efetivar_agendamento]
    EF --> R{sucesso true?}
    R -->|Sim| FIM[Protocolo + instrucoes de preparo + AGENDADO]:::ok
    R -->|Nao| FB[Fallback humano]:::fb
    classDef ok fill:#16a34a,stroke:#15803d,color:#fff;
    classDef fb fill:#b45309,stroke:#92400e,color:#fff;
```

**Trecho de triagem:**
```
Ana: Antes de agendar preciso confirmar uma coisa: você está grávida ou suspeita de gravidez?
Paciente: não
Ana: Para este exame é necessário o pedido médico. Pode enviar a foto ou o PDF aqui no chat?
Paciente: [envia imagem]
Ana: Recebi, obrigada! Confirmando: tomografia de crânio, 05/06 às 12h, na unidade Centro. Posso confirmar?
Paciente: sim
Ana: Agendado! Protocolo 725782, 05/06 às 12h. Preparo: jejum de 4 horas. Posso ajudar em mais algo?
```

---

## 4. Consultar agendamentos

Substitui a antiga Seção 4 ("acesse o portal").

```mermaid
flowchart TD
    S[Paciente: quais sao meus agendamentos?] --> CPF[Coleta e valida CPF]
    CPF --> LST[🔧 Listar_agendamentos]
    LST --> H{Tem agendamentos?}
    H -->|Nao| NONE[Nao localizei. Quer agendar um agora?]
    H -->|Sim| SHOW[Le a lista numerada] --> NEXT[Oferece: confirmar / remarcar / cancelar]
```

```
Ana: Você tem 1 agendamento ativo:
     Consulta de cardiologia, 03/06 às 11h, unidade Centro. Protocolo 725782.
     Quer confirmar, remarcar ou cancelar?
```

---

## 5. Remarcar

```mermaid
flowchart TD
    S[Paciente: quero remarcar] --> LST[🔧 Listar_agendamentos] --> PICK[Paciente escolhe qual]
    PICK --> D[🔧 Buscar_disponibilidade do mesmo item] --> NEW[Paciente escolhe novo horario]
    NEW --> CONF["Resumo de/para: de 03/06 11h para 06/06 15h40. Confirma?"]
    CONF --> OK{Confirma?}
    OK -->|Sim| RE[🔧 Remarcar_ou_cancelar acao=reagendar]
    OK -->|Nao| NEW
    RE --> R{sucesso?}
    R -->|Sim| FIM[Novo protocolo + tag remarcacao]:::ok
    R -->|Nao| FB[Fallback humano]:::fb
    classDef ok fill:#16a34a,stroke:#15803d,color:#fff;
    classDef fb fill:#b45309,stroke:#92400e,color:#fff;
```

---

## 6. Cancelar (confirmação reforçada)

```mermaid
flowchart TD
    S[Paciente: quero cancelar] --> LST[🔧 Listar_agendamentos] --> PICK[Paciente escolhe qual]
    PICK --> CONF["Voce quer mesmo cancelar a consulta de 03/06 11h?<br/>Essa acao nao pode ser desfeita."]
    CONF --> OK{Sim inequivoco?}
    OK -->|Nao| HOLD[Mantem o agendamento]
    OK -->|Sim| CAN[🔧 Remarcar_ou_cancelar acao=cancelar]
    CAN --> R{status 200?}
    R -->|Sim| FIM[Confirma cancelamento + tag cancelamento<br/>+ oferece reagendar]:::ok
    R -->|Nao| FB[Fallback humano]:::fb
    classDef ok fill:#16a34a,stroke:#15803d,color:#fff;
    classDef fb fill:#b45309,stroke:#92400e,color:#fff;
```

```
Paciente: quero cancelar minha consulta
Ana: Você tem a consulta de cardiologia de 03/06 às 11h. Quer mesmo cancelar? Essa ação não pode ser desfeita.
Paciente: sim, pode cancelar
Ana: Pronto, sua consulta foi cancelada. Quer que eu procure um novo horário?
```

---

## 7. Máquina de estados do Kanban (visão de funil)

Como o card caminha pelas etapas, com os pontos automáticos da Ana:

```mermaid
stateDiagram-v2
    [*] --> NOVO_CONTATO
    NOVO_CONTATO --> EM_ATENDIMENTO_ANA: Ana identifica o motivo
    EM_ATENDIMENTO_ANA --> AGENDADO: Efetivar_agendamento sucesso (auto)
    EM_ATENDIMENTO_ANA --> FILA_COMERCIAL: particular sem API
    EM_ATENDIMENTO_ANA --> AGUARDANDO_CONFIRMACAO: convenio via portal (fallback)
    EM_ATENDIMENTO_ANA --> FALHA_AGENDAMENTO_FILA: erro tecnico da API
    EM_ATENDIMENTO_ANA --> FILA_OUVIDORIA: reclamacao
    EM_ATENDIMENTO_ANA --> SETOR_RESPONSAVEL: prontuario / exame particular
    AGUARDANDO_CONFIRMACAO --> AGENDADO: paciente confirmou no portal
    AGENDADO --> ENCERRADO_RESOLVIDO: sem pendencias
    EM_ATENDIMENTO_ANA --> ENCERRADO_DESISTENCIA: paciente desistiu
    FALHA_AGENDAMENTO_FILA --> AGENDADO: humano resolveu
    ENCERRADO_RESOLVIDO --> [*]
    ENCERRADO_DESISTENCIA --> [*]
```

> `AGENDADO` (auto) e `FALHA AGENDAMENTO — FILA` são as novidades. As demais etapas e transições são as de hoje.

---

## 8. Resumo dos pontos de confirmação e fallback

| Jornada | Confirmação obrigatória antes de | Sinais que levam ao humano |
|---|---|---|
| Agendar consulta/exame | `Efetivar_agendamento` | `BLOQUEADO`, `SEM_HORARIOS`, `NAO_AGENDADO`, `BLOQUEIO_EXAME`, `ERRO_API`, `ERRO_ANEXO` |
| Remarcar | `Remarcar_ou_cancelar` (reagendar) | `NAO_AGENDADO`, `ERRO_API` |
| Cancelar | `Remarcar_ou_cancelar` (cancelar) — **"sim" inequívoco** | `ERRO_API` |
| Consultar | — (leitura) | `ERRO_API` |
