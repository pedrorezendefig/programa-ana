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
Agente de IA de atendimento e agendamento de pacientes via WhatsApp (fazer.ai agents + Chatwoot), com integração ao sistema hospitalar MV via API Global Health pendente. Entregável do Contrato de Serviços Contínuos: a **entrega funcional** (integração com o MV operante, fluxos testados, em produção) destrava +R$ 2.000 (total R$ 8.000); a **meta de desempenho (KPI)** destrava +R$ 1.000 (total R$ 9.000).

**Meta da Ana**:
Indicador de desempenho/maturidade da Ana, ainda **não definido**, que ao ser atingido destrava +R$ 1.000/mês. Marco pactuado por escrito no Termo de Entregável correspondente.
_Avoid_: KPI do Patamar 4; "evolução da Ana" (nome antigo; virou meta de KPI)

**Retell**:
Futuro agente de voz conversacional (plataforma Retell) para o mesmo cliente. Amadurece depois da Ana; entrará no Contrato de Serviços Contínuos como novo Anexo de Entregável.
_Avoid_: Retail

### Ana: linguagem do domínio

**fazer.ai agents (plataforma da Ana)**:
A plataforma que executa a Ana desde 29/jul/2026 (tenant `vitta-tech`): prompt, ferramentas nativas, base de conhecimento e vínculo com as inboxes do Chatwoot. Observabilidade das conversas no Chatwoot e do raciocínio/custos no Langfuse. O n8n está aposentado (decisão de 30/jul/2026; workflows a desativar, export preservado em `ana/workflows/`).
_Avoid_: "LangChain" como nome da plataforma (é o motor interno dela); tratar o n8n como cérebro vivo da Ana.

**Testes de viabilidade (sem GH)**:
O estágio atual do programa: provar que a Ana no fazer.ai agents segura o SOP no canal de teste, rodando gpt-5-mini e lendo as tabelas oficiais da [[base-ana-nocodb]] ao vivo, sem nenhuma chamada à Global Health. Concluído quando o Roteiro de cenários passa.
_Avoid_: misturar integração MV/GH neste estágio (é pendente, discutida em sessão própria).

**Base Ana (NocoDB)**:
A base editável que alimenta a Ana (decisão de 30/jul/2026, ADR-0006): serviço NocoDB no Coolify da VPS, com as 4 tabelas oficiais (consultas particulares, exames, estimativas de cirurgias, convênios por especialidade). O usuário de negócio edita numa tela de planilha na web; a Ana lê por tools HTTP sobre shared views públicas somente leitura; a mudança vale na resposta seguinte. Substituiu o Google Sheets como fonte (as planilhas viraram legado; xlsx brutos com dado pessoal ficam em `dados-locais/`, fora do git).
_Avoid_: voltar a ler valores do Google Sheets; expor tabela com dado pessoal em shared view; tratar a KB (`search_knowledge`) como fonte de valores (a precedência é das tabelas).

**Roteiro de cenários**:
O critério de pronto dos testes de viabilidade: cerca de 10 cenários (urgência, particular com valor vindo do Sheets, convênio, ouvidoria, fora de escopo) rodados no bot do Telegram, conferindo no Chatwoot a etapa/tag correta e no Langfuse as ferramentas chamadas.
_Avoid_: declarar teste concluído por conversa livre sem roteiro.

**Modos da Ana**:
A Ana é um único agente com três modos de comportamento (atendimento, comercial, ouvidoria), não subagentes. Decisão fechada no briefing do diretor (jun/2026). Quando a tag `ouvidoria` é aplicada, o modo comercial morre para aquela thread (regra de exclusão).
_Avoid_: subagentes, agentes especializados

**Canal principal (WhatsApp oficial)**:
O número de WhatsApp do hospital que concentra o volume real de pacientes (~20 mil mensagens/mês e a fila de não respondidas do baseline). Hoje está conectado ao Kommo e é atendido só por humanos; a Ana ainda não passa por ele. Levar a Ana para este canal é a entrega que ataca a fila e realiza o valor do programa.

**Canal de teste (Telegram)**:
Canal Telegram (bot SaoMatheusBot) plugado no Chatwoot onde a Ana opera hoje, respondida pelo fazer.ai agents. É o palco do Roteiro de cenários; sem o volume real do hospital.
_Avoid_: dizer "Ana em produção" sem qualificar o canal; "ligar o bot na plataforma nova" (a inbox do Telegram já está vinculada à Ana; o que faltava era aposentar o n8n).

**Kommo**:
CRM legado do hospital, onde o canal principal está plugado hoje e onde os atendentes trabalham; fonte do baseline congelado do documento-mestre. Sai de cena quando o canal principal migrar para o Chatwoot.
_Avoid_: buscar métricas da Ana no Kommo (a Ana não passa por lá)

**Transbordo seletivo**:
Política comercial decidida pela direção (jul/2026): a Ana fecha consulta e exame particular sozinha, 24/7; o humano entra só para cirurgia, procedimento e negociação de valores, além dos fallbacks técnicos. O SOP v2 já nasce com este desenho.
_Avoid_: "Ana aquece e o humano fecha" como regra geral (modelo anterior à decisão)

**Congelamento do Chatwoot (fase de testes)**:
Decisão de 06/jul/2026: enquanto a fase de testes da integração MV não termina, a configuração atual do Chatwoot (etapas, tags, estados, nomes) não muda. A estrutura da seção 4 do documento-mestre (funil de 7 etapas, famílias de tags, estados, SLA) é a espec-alvo para depois, discutida e configurada junto com a entrada no canal principal.

**Diferenciais**:
Colunas da tabela de consultas particulares da [[base-ana-nocodb]] que trazem o destaque do hospital por especialidade. São o insumo da ancoragem de valor no modo comercial (os `[Diferencial_1]`/`[Diferencial_2]` do SOP), lidos pela tool `consultar_precos_consultas` (sucessora da `Get_Consultas` do n8n).
_Avoid_: "justificativa de especialidade" (termo usado na conversa com o diretor; o mecanismo é este)

**Pós-atendimento**:
Agente novo, separado da Ana, proativo e analítico: dispara pesquisa de satisfação em massa (começando só pelo eletivo), classifica respostas e gera relatório por setor/profissional/período. Dois mecanismos: escuta interna (sem filtro) + motor de reputação Google (sem review gating). Pré-condição: fonte de dados do MV com desfecho. A Frente 4 foi estendida (jul/2026) com a gestão de avaliações do Google Meu Negócio: rascunhos de resposta gerados por IA, publicação só com aprovação humana (regra dura para avaliações negativas).
_Avoid_: "modo pesquisa da Ana" (é agente separado); review gating; publicar resposta a avaliação sem aprovação humana

**Paciente-sonda**:
O cadastro de teste TESTE INTEGRACAO ANA VITTA (CPF 66301102770, id 1681) criado de propósito na homologação da Global Health (07/jul/2026). É a referência fixa dos testes de leitura da API e da investigação sobre qual banco MV a homolog enxerga.
_Avoid_: apagar o registro; usar CPF de paciente real em teste.

**Base TST (Oracle do MV)**:
O banco Oracle de teste do MV que o DBeaver e a sessão Claude leem diretamente (prefixo `tst`, ~2,5 mil pacientes, base viva). Regra de acesso (07/jul/2026): homolog = leitura direta pela sessão; produção = só o Pedro, manualmente, no DBeaver. Não está confirmado que é o mesmo banco que a homologação da Global Health enxerga; até prova em contrário (pergunta GH-18), tratar como ambientes distintos.
_Avoid_: chamar de "produção"; assumir que escrita via API GH aparece nela sem verificar.

**Playground GH (bancada e roteiro)**:
A seção do [[ana-os]] dedicada ao ensaio da API GH de homologação (desde o ADR-0007 é seção, não mais o portal inteiro): a **bancada da API** (chamar cada endpoint da homologação, ver a resposta crua, painel "No banco" executável contra a Base TST e a [[prova-no-banco]] nas escritas) e o **roteiro por endpoint** (passo a passo com os dados mocados + query de conferência para colar no DBeaver: nas escritas, prova de inserção antes/depois; nos GETs, query espelho para bater com a resposta da API). Chamada ao vivo, só homologação/TST; produção jamais é chamada.
_Avoid_: apontar qualquer rota para produção; usar "playground" para o portal inteiro (o portal é o Ana OS).

**Atlas do banco (produção)**:
As páginas do portal que retratam o banco DBAMV de PRODUÇÃO: modelo real, relações, domínios, volumes, cruzamento com os endpoints da GH e a seção de insights para diretoria e novos fluxos. Nunca chama banco nenhum ao vivo: é alimentado pelos CSVs do [[pacote-de-absorcao]] depositados em `absorcao-producao/resultados/` (o servidor os expõe em leitura; `amostras/` nunca é servida). Nasce com hipóteses e ganha evidência conforme os CSVs chegam (C9).
_Avoid_: dado pessoal de paciente no atlas; confundir retrato da produção com a bancada homolog (cada página declara seu ambiente).

**Pacote de absorção (produção)**:
`ana/api-mv/absorcao-producao/`: queries prontas que o Pedro roda manualmente no DBeaver da PRODUÇÃO (única via permitida para produção), com instrução passo a passo e nome de arquivo de resultado pré-definido por query. Duas camadas de resultado: catálogo, contagens e domínios (commitáveis, sem dado pessoal) e amostras completas (pasta `resultados/amostras/`, ignorada pelo git). A pasta de resultados é a base de conhecimento que as sessões futuras leem para raciocinar sobre o banco real; parte das perguntas do C6 e o GH-18 se respondem empiricamente por ela. Ciclo: C7 (montar, Claude) → C8 (rodar, Pedro) → C9 (absorver, Claude).
_Avoid_: rodar o pacote pela sessão (produção é sempre manual, no DBeaver); credencial de produção no `.env`; dado pessoal em resultado commitável.

**Prova no banco**:
O veredito automático do Playground GH para chamadas de escrita: fotografa o resultado da query de verificação na Base TST antes da chamada, roda de novo depois, e mostra a diferença (a linha que apareceu ou mudou). Três desfechos: criou (diff visível), nada mudou, ou API recusou (sucesso: false). Desde a resposta da Dácilla (MV, 24/jul/2026), a prova só é decisiva na [[finalizacao-do-agendamento]]: nos passos intermediários (pessoas, anexos etc.) "nada mudou" é o comportamento esperado, porque esses dados moram no banco SaaS da GH, não no Soul.
_Avoid_: tratar "resposta 200 da API" como prova de escrita; esperar que POST /pessoas apareça na PACIENTE (não aparece por arquitetura, não por falha).

**Finalização do agendamento**:
O ato que efetiva a marcação: o `POST /horarios/agendar` (e seus derivados `reagendar` e o DELETE de cancelar). Fato oficial da MV (Dácilla, suporte MV, 24/jul/2026): a API de agendamento WhatsApp roda sobre o banco SaaS da Global Health (inacessível aos hospitais) e os dados do paciente só são gravados no Soul (banco MV) no momento da finalização. É o único ponto do fluxo onde faz sentido procurar o agendamento no Oracle. Na homolog, a hipótese é que o Soul correspondente seja a Base TST; provar isso é a forma atual da pergunta GH-18.
_Avoid_: procurar no Oracle efeitos de passos intermediários do fluxo; tratar GH-18 como respondida antes de uma finalização bem-sucedida aparecer na TST.

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

### Roadmap e cockpit

**Ana OS**:
O cockpit único do programa (decisão de 30/jul/2026, ADR-0007): o portal local em `localhost:8777` evolui, muda para a pasta `os/` na raiz e passa a reunir tudo numa navegação comum, no visual do `DESIGN.md` (estilo Aaply, tema claro): home com o roadmap e o painel de aplicações, diagrama de arquitetura dos canais, [[mapa-das-apis]], a bancada e o roteiro (o antigo Playground GH, agora seção), o [[atlas-do-banco]], insights de diretoria e a [[biblioteca]]. Substituiu o `roadmap/mapa.html` (aposentado em `roadmap/arquivo/` em 30/jul/2026). As regras de ambiente do ADR-0004 continuam valendo página a página.
_Avoid_: "playground" como nome do portal inteiro (virou seção do OS); manter mapa.html e OS vivos ao mesmo tempo; terceira "central" paralela.

**Roadmap do OS**:
A estrutura do roadmap dentro do Ana OS: **Estágio atual** (tarefas Vn, disciplinadas, espelho do TODO.md), **Pendente** (dívidas conscientes, uma linha cada) e a faixa de **Ideias**. Continua sem grafo de dependências, sem trilho da receita, sem criticidade derivada. Os dados vivem em arquivo JSON versionado (não em HTML); o `/check` reconcilia TODO.md com esse arquivo.
_Avoid_: "vista Foco"; trilho da receita, alavanca do dia, esforço P/M/G e criticidade (conceitos do mapa arquivado); reintroduzir mensalidade/KPI; card do n8n no painel; kanban de colunas.

**Ideias (faixa do roadmap)**:
Cards livres do Roadmap do OS: título + poucas linhas + link opcional para doc. Ideia não tem ID, dono nem dependência até ser puxada para o estágio (aí vira tarefa no TODO.md, com ficha e "pronto quando"). Únicos dados do OS editáveis pela interface: o server grava num único arquivo de dados do roadmap, por rota de escrita restrita (ADR-0007).
_Avoid_: promover ideia a tarefa sem passar pelo TODO.md; dar status/dono a card de ideia.

**Mapa das APIs**:
Página do Ana OS que organiza os endpoints da API GH de WhatsApp por tema (identificação, catálogo, disponibilidade, agendamento, anexos), cada um com **selo de testabilidade** derivado da dinâmica dos bancos ([[finalizacao-do-agendamento]]): *leitura de catálogo* (resposta da API é a prova), *escrita no SaaS GH* (testável só pela resposta; invisível no Oracle por arquitetura) e *finalização* (o único ponto com [[prova-no-banco]] na TST). Nasceu puxando a metade "catálogo e viabilidade" da GH1; a metade "onde encaixar no fluxo da Ana" segue Pendente.
_Avoid_: tratar a API GH como janela de leitura do banco MV (ela é puramente de agendamento; quem lê o MV é o Oracle TST direto, e o Atlas para produção).

**Biblioteca**:
Seção do Ana OS que exibe a documentação do repositório renderizada no navegador, a partir de uma **allowlist explícita** servida pelo server (CONTEXT.md, `docs/adr/`, `roadmap/`, os `.md` de `ana/api-mv/`, documento-mestre). A doc continua morando no git como fonte única; o OS só exibe. `dados-locais/` e `resultados/amostras/` são proibidos por regra no servidor.
_Avoid_: wiki externa ou cópia da doc; servir qualquer pasta fora da allowlist.

**Acervo do roadmap**:
`roadmap/arquivo/`: o roadmap anterior completo (TODO com as trilhas A-G, PENDENCIAS.md, mapas antigos), arquivado intacto. Os textos prontos para a Global Health e para o analista de TI moram lá, além do histórico das trilhas de banco MV, pós-atendimento e canal principal. O `mapa.html` de 30/jul/2026 (aposentado no mesmo dia pelo Ana OS) e o playground pré-OS (`ana/api-mv/arquivo/playground-pre-os/`) moram no acervo também.
_Avoid_: apagar; tratar o acervo como fonte do estado atual (é história, não fronteira).

**Pendente (bloco do roadmap)**:
A faixa do Roadmap do OS com as dívidas conscientes, uma linha cada: a metade restante da GH1 (desenhar onde as APIs Global Health entram no fluxo da Ana) e o sistema de protocolo da ouvidoria. Sem tarefas detalhadas até cada uma ser puxada para o estágio ativo.

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
