# VITTA TECH: Contratos e Soluções

Contexto do relacionamento comercial entre a VITTA TECH (empresa do Pedro) e o cliente do setor de saúde: o contrato de prestação de serviços e as soluções de software que ele cobre.

## Language

### Estrutura contratual

**Contrato de Serviços Contínuos**:
O contrato (único) da relação. A mensalidade é a **soma dos Entregáveis aceitos e em operação**, numa escada de valor que cresce conforme cada entrega entra no ar: Aplicativo do hospital (R$ 5.000/mês vigentes) → Site e Central de Comando (+R$ 1.000) → Ana no WhatsApp (+R$ 2.000) → Meta de desempenho da Ana (+R$ 1.000), até R$ 9.000/mês. A frente do Site e da Central de Comando é tocada por Lucas e Rib, com Pedro auxiliando.
_Avoid_: contrato de consultoria; "patamar"; dois contratos separados (a ideia de um "Contrato Ana" à parte foi descartada na consolidação, ver ADR-0002).

**Entregável**:
Cada solução ou marco que, ao ser aceito e entrar em operação, acrescenta o seu valor à mensalidade. São modulares e somam na ordem em que são aceitos. O desenvolvimento e os estudos de viabilidade das entregas futuras já estão incluídos na mensalidade vigente, até que cada uma seja aceita.

**Anexo de Entregável**:
Anexo do contrato que descreve uma entrega aceita e o valor mensal que ela destrava. A pilha de anexos cresce conforme as entregas acontecem.

**Termo de Entregável**:
Documento de 1 a 2 páginas assinado no aceite de uma entrega: descreve o que foi entregue, vira Anexo de Entregável do contrato e faz o novo valor mensal passar a incidir, independentemente de aditivo.
_Avoid_: termo de aceite de marco, aditivo (o termo dispensa aditivo formal)

**Proteção de dados (LGPD)**:
No contrato, os papéis Controlador (cliente) e Operador (VITTA), a segurança e os incidentes estão na Cláusula 8. Um Anexo de Proteção de Dados (DPA) standalone mais detalhado é opção para quando a Ana entrar em operação com dados sensíveis de saúde.
_Avoid_: DPA por contrato (só há um contrato agora)

### Soluções

**Aplicativo do hospital**:
Aplicação web já em produção, hoje voltada à gestão de reuniões (atas, assinaturas digitais, pendências) e em evolução contínua para além de reuniões. Sustenta os R$ 5.000/mês vigentes; a mensalidade cobre também o desenvolvimento e os estudos de viabilidade das próximas entregas (entre elas a Ana), até cada uma ser aceita.
_Avoid_: App de Reuniões (nome antigo, restrito demais)

**Site e Central de Comando**:
Site institucional do cliente mais a Central de Comando a ele integrada. O aceite do **MVP do site** destrava +R$ 1.000/mês (mensalidade total R$ 6.000), que cobre a entrega e a gestão/evolução contínua (frente de Lucas e Rib).

**Central de Comando**:
Painel administrativo que centraliza a gestão dos ativos digitais do hospital: consome as métricas do site, traz um CMS para editar o conteúdo do site direto por lá, tem recursos de IA e integra APIs externas (entre elas a da Meta/Instagram). Integrada ao Site e entregue/evoluída na mesma esteira contínua, dentro do mesmo +R$ 1.000.

**Ana**:
Agente de IA de atendimento e agendamento de pacientes via WhatsApp (n8n + Chatwoot), integrado ao sistema hospitalar MV via API Global Health. Entregável do Contrato de Serviços Contínuos: a **entrega funcional** (integração com o MV operante, fluxos testados, em produção) destrava +R$ 2.000 (total R$ 8.000); a **meta de desempenho (KPI)** destrava +R$ 1.000 (total R$ 9.000).

**Meta da Ana**:
Indicador de desempenho/maturidade da Ana, ainda **não definido**, que ao ser atingido destrava +R$ 1.000/mês. Marco pactuado por escrito no Termo de Entregável correspondente.
_Avoid_: KPI do Patamar 4; "evolução da Ana" (nome antigo; virou meta de KPI)

**Retell**:
Futuro agente de voz conversacional (plataforma Retell) para o mesmo cliente. Amadurece depois da Ana; entrará no Contrato de Serviços Contínuos como novo Anexo de Entregável.
_Avoid_: Retail

### Ana: linguagem do domínio

**Modos da Ana**:
A Ana é um único agente com três modos de comportamento (atendimento, comercial, ouvidoria), não subagentes. Decisão fechada no briefing do diretor (jun/2026). Quando a tag `ouvidoria` é aplicada, o modo comercial morre para aquela thread (regra de exclusão).
_Avoid_: subagentes, agentes especializados

**Canal principal (WhatsApp oficial)**:
O número de WhatsApp do hospital que concentra o volume real de pacientes (~20 mil mensagens/mês e a fila de não respondidas do baseline). Hoje está conectado ao Kommo e é atendido só por humanos; a Ana ainda não passa por ele. Levar a Ana para este canal é a entrega que ataca a fila e realiza o valor do programa.

**Canal de teste (Telegram)**:
Canal Telegram plugado no Chatwoot onde a Ana opera hoje, usado para testes e validação (hotfix, integração MV), sem o volume real do hospital.
_Avoid_: dizer "Ana em produção" sem qualificar o canal; enquanto a migração não acontece, "produção" significa o ambiente vivo do n8n respondendo o canal de teste.

**Kommo**:
CRM legado do hospital, onde o canal principal está plugado hoje e onde os atendentes trabalham; fonte do baseline congelado do documento-mestre. Sai de cena quando o canal principal migrar para o Chatwoot.
_Avoid_: buscar métricas da Ana no Kommo (a Ana não passa por lá)

**Transbordo seletivo**:
Política comercial decidida pela direção (jul/2026): a Ana fecha consulta e exame particular sozinha, 24/7; o humano entra só para cirurgia, procedimento e negociação de valores, além dos fallbacks técnicos. O SOP v2 já nasce com este desenho.
_Avoid_: "Ana aquece e o humano fecha" como regra geral (modelo anterior à decisão)

**Congelamento do Chatwoot (fase de testes)**:
Decisão de 06/jul/2026: enquanto a fase de testes da integração MV não termina, a configuração atual do Chatwoot (etapas, tags, estados, nomes) não muda. A estrutura da seção 4 do documento-mestre (funil de 7 etapas, famílias de tags, estados, SLA) é a espec-alvo para depois, discutida e configurada junto com a entrada no canal principal.

**Diferenciais**:
Coluna da base de conhecimento (hoje Google Sheets, aba de consultas particulares) que traz o destaque do hospital por especialidade. É o insumo da ancoragem de valor no modo comercial (os `[Diferencial_1]`/`[Diferencial_2]` do SOP). Já funcional em produção via `Get_Consultas`.
_Avoid_: "justificativa de especialidade" (termo usado na conversa com o diretor; o mecanismo é este)

**Pós-atendimento**:
Agente novo, separado da Ana, proativo e analítico: dispara pesquisa de satisfação em massa (começando só pelo eletivo), classifica respostas e gera relatório por setor/profissional/período. Dois mecanismos: escuta interna (sem filtro) + motor de reputação Google (sem review gating). Pré-condição: fonte de dados do MV com desfecho. A Frente 4 foi estendida (jul/2026) com a gestão de avaliações do Google Meu Negócio: rascunhos de resposta gerados por IA, publicação só com aprovação humana (regra dura para avaliações negativas).
_Avoid_: "modo pesquisa da Ana" (é agente separado); review gating; publicar resposta a avaliação sem aprovação humana

**Paciente-sonda**:
O cadastro de teste TESTE INTEGRACAO ANA VITTA (CPF 66301102770, id 1681) criado de propósito na homologação da Global Health (07/jul/2026). É a referência fixa dos testes de leitura da API e da investigação sobre qual banco MV a homolog enxerga.
_Avoid_: apagar o registro; usar CPF de paciente real em teste.

**Playground GH**:
Ferramenta local de estudo da API de agendamento da Global Health: permite chamar cada endpoint da homologação, ver a resposta crua e conferir no Oracle onde a API grava. Fala somente com a homologação; produção é proibida nele.

**Hotfix do prompt**:
Primeira fase de execução (decisão desta sessão): corrigir o prompt em produção antes da integração MV. Escopo: triagem de urgência como nova Regra Global 1, Regra 6 reescrita (Ana assume "assistente virtual"), exclusão comercial↔ouvidoria, guardrails jurídicos da ouvidoria e ajustes menores.

### Programa (documento-mestre)

**Documento-mestre**:
`Documento-Mestre_Programa-Ana-CRM.md`, na raiz do repo: o registro vivo do programa mantido com a direção do hospital. O log de decisões (seção 7) e as questões em aberto (seção 8) são a memória compartilhada; decisão fechada lá não se reabre, e o roadmap do repo deve se manter coerente com elas.

**Frentes (1 a 4)**:
As quatro frentes do programa: 1 atendimento e agendamento autônomo no WhatsApp; 2 captura e conversão do paciente particular; 3 ouvidoria 24/7; 4 voz do paciente e pós-atendimento (inclui a reputação no Google).

**Fases do Programa**:
Fase 1: Ana no WhatsApp (frentes 1 a 4 conforme maturidade). Fase 2: agente de voz no telefone. "Fase" sem qualificador refere-se a estas; as etapas internas de execução são as trilhas do TODO.
_Avoid_: numerar entregas internas como "Fase N" solta (colide com as fases do programa)

### Pessoas e partes

**VITTA TECH**:
VITTA TECH Desenvolvimento de Software Customizável LTDA, a CONTRATADA. Assina e fatura o contrato; Lucas e Rib se resolvem internamente, sem aparecer para o cliente.

## Flagged ambiguities

- **"Patamar"** era o conceito do contrato único antigo (faixas 5k→6k→8k→9k acionadas por marcos). Na estrutura atual **deixa de existir como termo**: a mensalidade é a soma dos Entregáveis aceitos. Os valores totais coincidem (R$ 5/6/8/9 mil), mas a lógica é modular, não de "faixas". Não usar "patamar".
- **"Consultoria"**: não há rubrica "consultoria" no contrato. O estudo e a viabilidade da Ana (e de outras entregas futuras) correm **incluídos na mensalidade vigente** do Aplicativo do hospital, até o respectivo Entregável ser aceito. Não chamar isso de consultoria nem de linha separada.
- **Um contrato, não dois**: chegou-se a desenhar um "Contrato Ana" separado (ADR-0001); a decisão foi revista e tudo está num **contrato único** (ADR-0002). A Ana é Entregável, não contrato.

## Example dialogue

— *"O cliente aceitou a Ana no WhatsApp. E agora?"*
— *"Assinamos o Termo de Entregável da Ana. Ele vira um Anexo de Entregável do contrato e os R$ 2.000/mês passam a incidir no mês seguinte: a mensalidade sobe de R$ 6.000 para R$ 8.000."*
— *"E quando começarmos o agente de voz?"*
— *"O Retell entra como novo Anexo de Entregável do mesmo contrato, sem contrato novo: só o termo com escopo e valor."*
