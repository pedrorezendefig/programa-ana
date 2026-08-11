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

**Protocolo da ouvidoria**:
O número que a Ana informa ao paciente ao registrar uma manifestação, no formato ANO-NNNN (ex.: 2026-0007). Decisão da OV1 (06/ago/2026, ADR-0010, decisão autônoma a revisar): vive na tabela `5_Ouvidoria_Protocolos` da [[base-ana-nocodb]], numerado pelo autoincremento do NocoDB e formatado por coluna de fórmula, nunca composto pelo modelo. O NNNN é contínuo, não reinicia por ano. Diferente do protocolo de agendamento (numérico, devolvido pela Global Health), que nunca se mistura com este. É a única tabela da Base Ana sem shared view pública, e guarda só o índice da manifestação (data, categoria, setor, status, prazo): nome, CPF e relato ficam na conversa do Chatwoot. Se a gravação ou a leitura falhar, vale a Regra Híbrida e a Ana não cita número algum.
_Avoid_: a Ana compor ou estimar o número; nome ou CPF na tabela; shared view pública nesta tabela; ler o último protocolo e incrementar.

**Base TST (Oracle do MV)**:
O banco Oracle de teste do MV que o DBeaver e a sessão Claude leem diretamente (prefixo `tst`, ~2,5 mil pacientes, base viva). Regra de acesso (07/jul/2026): homolog = leitura direta pela sessão; produção = só o Pedro, manualmente, no DBeaver. Não está confirmado que é o mesmo banco que a homologação da Global Health enxerga; até prova em contrário (pergunta GH-18), tratar como ambientes distintos.
_Avoid_: chamar de "produção"; assumir que escrita via API GH aparece nela sem verificar.

**Playground GH (bancada e roteiro)**:
A seção do [[ana-os]] dedicada ao ensaio da API GH de homologação (desde o ADR-0007 é seção, não mais o portal inteiro): a **bancada da API** (chamar cada endpoint da homologação, ver a resposta crua, painel "No banco" executável contra a Base TST e a [[prova-no-banco]] nas escritas) e o **roteiro por endpoint** (passo a passo com os dados mocados + query de conferência para colar no DBeaver: nas escritas, prova de inserção antes/depois; nos GETs, query espelho para bater com a resposta da API). Chamada ao vivo, só homologação/TST; produção jamais é chamada.
_Avoid_: apontar qualquer rota para produção; usar "playground" para o portal inteiro (o portal é o Ana OS).

**Cadeias (página do Ana OS)**:
Seção do [[ana-os]] (06/ago/2026) que conta a API GH de homologação como seis histórias encadeadas do hospital, em que a resposta de um elo alimenta o seguinte, cobrindo os 22 endpoints do [[mapa-das-apis]]: A paciente novo chega pelo WhatsApp (GET antes com zero, POST /pessoas, GET reencontrando por CPF e por telefone), B paciente conhecido (o [[paciente-sonda]]), C convênio e carteiras (a árvore convênio → plano → sub-plano e a API recusando dado incompleto), D agendar consulta (especialidade → prestadores → convênio → horários → instruções/tipos → finalização), E agendar exame (triagem, preparo e anexos) e F gerir o agendado (listar, detalhar, remarcar, cancelar). Cada elo roda ao vivo pela página, com veredito (funcionou / vazio esperado / recusou / bloqueado), contagem de itens, e o payload enviado e a resposta crua expansíveis por clique. Os dados mocados da escrita são regenerados aleatoriamente a cada execução (CPF, telefone, nascimento, sexo), sempre com o nome-prefixo TESTE DEMO ANA VITTA. As finalizações (agendar, reagendar, cancelar) nunca rodam da página: são atos deliberados da bancada, com [[prova-no-banco]]. É a tela oficial da demonstração ao diretor, em dois atos (decisão de 06/ago/2026): Ato 1, o que funciona (Cadeia A ao vivo); Ato 2, o que a GH-19 trava (Cadeia D), transformando o catálogo vazio em argumento para o diretor cobrar a massa da Global Health.
_Avoid_: CPF real em demonstração; cadastro de teste sem o prefixo TESTE DEMO; tratar cadeia como teste de endpoint solto (isso é a bancada); rodar finalização pela página; esperar o catálogo publicado para só então demonstrar (a decisão foi demo em dois atos).

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

**Fachada de agenda (desenho GH1)**:
A decisão da sessão de desenho GH1 (06/ago/2026, ADR-0009): a Ana não ganha 22 tools, uma por endpoint da API GH; ela ganha as **7 ferramentas de agenda que o SOP reescrito já define** (`docs/04-sop-ana-reescrito.md`), cada uma encapsulando a cadeia de endpoints correspondente. Implementação por fases: P4 (identificação, tools HTTP diretas), P5 (disponibilidade e pré-requisitos, via proxy fino de orquestração na VPS), P6 (finalização e gestão, gated pela [[prova-no-banco]]/GH-18). Token GH sempre em credencial/vault, nunca no prompt do agente; sanitização de entrada (nome sem números, CPF 11 dígitos, enums em caixa alta) e tradução do 417 para a Regra Híbrida acontecem na fachada. A metade de **busca** da identificação está implementada desde 06/ago/2026 (V12): as tools `buscar_paciente_por_cpf` e `buscar_paciente_por_telefone` na plataforma, com a credencial `gh-homolog-token` no vault (tipo header, header `Token`) e o prompt do agente na v5.1 (seção Identificação de Paciente com guardrail de LGPD e o PASSO 3.5 do Princípio de Coleta: busca automática após CPF validado, resultado só no resumo interno da escalada). A fase P4 fechou em 07/ago/2026 (V14) com o **cadastro**: a tool `cadastrar_paciente` (`POST /pessoas` da homolog, id 7, risco medium) só dispara quando a busca por CPF volta vazia e o paciente confirma os quatro dados; o prompt está na v5.2 (PASSO 3.6 do Princípio de Coleta). Payload mínimo aceito pela API: nome, CPF, data de nascimento e telefone; sexo é opcional e ficou de fora para não custar uma pergunta. A sanitização é da fachada: nome sem números (417), CPF 11 dígitos e data em aaaa-mm-dd (a API grava a data crua, sem normalizar). Regras práticas da instância: `input_schema` das tools HTTP no **formato compacto nativo** (`{campo: {type, required, description}}`), porque a versão implantada não normaliza JSON Schema padrão (campo-fantasma e query vazio; achado da V12, no report V10); e o nome do campo do `input_schema` precisa ser **idêntico à chave do JSON** enviado no body, senão o valor chega vazio na API (achado da V14). O systemPrompt tem teto de 50.000 caracteres que o dry_run não valida (achado da V14). A fase P5 (disponibilidade) entrou em 07/ago/2026 (V15) com **tools HTTP diretas**, desvio consciente do proxy fino previsto no ADR-0009: a cadeia da via particular tem só dois elos (GET /consultas acha o item agendável, GET /agendas/v2 lista os horários; prestadores é informativo e o ramo de convênio segue no portal), e o antiloop que motivava o proxy virou regra de porta (elo 1 vazio para a cadeia; a mesma chamada nunca se repete com os mesmos argumentos). Três tools de leitura (ids 8, 9 e 10: `consultar_especialidades_agenda`, `consultar_horarios_livres`, `consultar_prestadores_agenda`), mesma credencial. Prompt na v5.3 (dieta de 49.991 para 49.353 caracteres: saíram as menções ao `resolve_conversation`, fora dos grants desde a V6, e duplicações literais entre prompt e descriptions; entrou a Seção 2.3.1 com os PASSO A1/A2/A3). Com a GH-19 pendente, o caso vazio é regra explícita: a Ana informa que a agenda online está indisponível, nunca sugere ou estima horário, nunca diz que está marcado, e cai na escalada da 2.4A; a vitrine com slots reais destrava sozinha quando a massa for publicada. O proxy volta a ser avaliado na P6. Correção de contrato (07/ago): `GET /pessoas` não usa o envelope `conteudo` (objeto puro quando encontra, corpo vazio quando não encontra), diferente de `/consultas`, `/prestadores`, `/convenios` e `/exames`.
_Avoid_: tool crua por endpoint no agente; token GH no prompt; a Ana prometer protocolo antes de a GH-18 estar provada; JSON Schema padrão em `input_schema` de tool HTTP da instância; a Ana expor ao paciente dado de cadastro que ele não informou; a Ana oferecer, estimar ou prometer horário que não veio de ferramenta nesta conversa; a Ana dizer que um horário está marcado, reservado ou garantido antes da P6.

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
O cockpit único do programa (decisão de 30/jul/2026, ADR-0007): o portal local em `localhost:8777` evolui, muda para a pasta `os/` na raiz e passa a reunir tudo numa navegação comum, no visual do `DESIGN.md` (desde 31/jul/2026, ADR-0008: referência refero, sidebar preta flutuante só de ícones, canvas claro, cards brancos arredondados, tema claro único; substituiu o estilo Aaply): home dashboard com indicadores funcionais do roadmap e o painel de aplicações, o [[grafo-de-execucao]], diagrama de arquitetura dos canais, [[mapa-das-apis]], a bancada e o roteiro (o antigo Playground GH, agora seção), o [[atlas-do-banco]], insights de diretoria e a [[biblioteca]]. Substituiu o `roadmap/mapa.html` (aposentado em `roadmap/arquivo/` em 30/jul/2026). As regras de ambiente do ADR-0004 continuam valendo página a página.
_Avoid_: "playground" como nome do portal inteiro (virou seção do OS); manter mapa.html e OS vivos ao mesmo tempo; terceira "central" paralela; estilo Aaply como referência (aposentado).

**Roadmap do OS**:
A estrutura do roadmap dentro do Ana OS: **Estágio atual** (tarefas Vn, disciplinadas, espelho do TODO.md), **Pendente** (dívidas conscientes, uma linha cada), a faixa de **Ideias** e a camada de [[propostas]]. Desde 31/jul/2026 (ADR-0008) é renderizado também como [[grafo-de-execucao]] em página própria; segue sem trilho da receita, sem criticidade derivada, com métricas sempre funcionais. Os dados vivem em arquivo JSON versionado (não em HTML); o `/check` reconcilia TODO.md com esse arquivo, preservando propostas e prompts (que não têm espelho narrativo).
_Avoid_: "vista Foco"; trilho da receita, alavanca do dia, esforço P/M/G e criticidade (conceitos do mapa arquivado); reintroduzir mensalidade/KPI; card do n8n no painel; kanban de colunas.

**Grafo de execução**:
A página Roadmap do Ana OS (ADR-0008): grafo SVG sem biblioteca externa que renderiza tarefas, pendentes e [[propostas]] como nós com dependências, em colunas da esquerda para a direita (feitas → estágio ativo → propostas → horizonte). Cada nó acionável tem o seu [[prompt-de-no]] com botão de copiar; nó feito aparece concluído, sem botão; nó bloqueado fica esmaecido mostrando quem o bloqueia. Reverte conscientemente o "sem grafo" do ADR-0007: o propósito é outro (mapa de leitura e execução, não mesa de arrastar cards).
_Avoid_: edição de nós pelo grafo (a única escrita da UI segue sendo a faixa de Ideias); tratar o grafo como fonte do estado (a fonte é TODO.md + roadmap.json).

**Mapa do SOP (página do Ana OS)**:
O retrato visual do comportamento da Ana (06/ago/2026, a proposta P7 executada como V13): `os/sop.html` desenha o SOP inteiro em oito raias (as cinco jornadas, mais entrada e saída transversais e a raia de apoio de prontuário/dúvidas), com etapas, decisões e chamadas de tool ligadas por setas. Cada nó carrega a âncora do prompt: o trecho literal, guardado em `os/dados/sop-fluxo.json`, que originou aquele passo. O mapa retrata um prompt congelado (a versão e a data de exportação ficam carimbadas no JSON e no cabeçalho da página) e não consulta a plataforma ao vivo. A re-validação é feita por sessão Claude, que reexporta o prompt e procura cada trecho como texto exato; trecho não encontrado é nó defasado. Não confundir com o SOP em texto (`docs/04-sop-ana-reescrito.md`), que é o documento de origem, nem com o [[grafo-de-execucao]], que mapeia tarefas do programa e não o comportamento do agente.
_Avoid_: tratar o mapa como fonte viva do prompt (é retrato datado); editar os trechos literais à mão; confundir com o grafo de execução.

**Circuito da Ana (página do Ana OS)**:
A visão do mecanismo (10/ago/2026, OS10): `os/circuito.html` costura três coisas que nenhuma outra página junta: o circuito de execução de um turno (paciente → Chatwoot → plataforma fazer.ai agents → gpt-5-mini → ferramentas → backends, com o trace no Langfuse), o catálogo das ferramentas concedidas ao agente (nativas, RAG e HTTP, com exemplo real estático de pedido e resposta vindo das provas registradas) e a anatomia do prompt (as seções na ordem do export, cada uma com as ferramentas que invoca e os trechos literais). Os dados vivem em `os/dados/circuito.json`; os trechos literais vêm do `os/dados/sop-fluxo.json` e seguem a mesma regra de re-validação por sessão do [[mapa-do-sop]]. Não existe LangChain nem n8n no circuito: quem orquestra é a plataforma fazer.ai agents. A página nunca chama API (quem roda ao vivo são Cadeias e Bancada). Desde a OS11 (11/ago/2026), o desenho carrega **fichas de hover** (tooltip padrão OS9, clique fixa): cada passo explica **o que entra / o que acontece / o que sai** (variando com o caminho selecionado), cada raia diz quem é e o que só ela faz, a **zona do laço** (a moldura tracejada dos passos 4 a 7) explica a repetição com exemplos reais das provas, fios mostram o que trafega e chips resumem o caminho; a lista abaixo do desenho é a versão narrativa das mesmas fichas. Divisão de altitude: a Arquitetura mostra as caixas dos serviços, o Mapa do SOP mostra as jornadas do paciente, o Circuito mostra o mecanismo de um turno.
_Avoid_: chamar API da página; tratar os exemplos estáticos como resposta atual do ambiente (são provas datadas); duplicar nela o conteúdo do Mapa do SOP ou da Arquitetura.

**Propostas (camada do roadmap)**:
Passos futuros recomendados pelas sessões Claude, com ID próprio (P1, P2...), deps e prompt, vivendo na chave `propostas` do `roadmap.json`. Renderizadas no grafo com visual distinto (tracejado). Proposta não é compromisso: não tem status nem dono, e não entra no TODO.md até o Pedro puxá-la para o estágio (aí vira tarefa com ficha e "pronto quando", nos dois arquivos). Trilha inicial P1..P6: demo do catálogo GH ao diretor, VPN da TST, prova da finalização (GH-18), tools GH de identificação, horários livres na conversa, agendamento fim a fim em homolog. O desenho do fluxo GH não é proposta: é a pendente GH1, que ganha posição no grafo (deps e prompt) sem mudar de natureza.
_Avoid_: dar status/dono a proposta; criar proposta como tarefa oficial sem decisão do Pedro; deixar proposta puxada sem espelho no TODO.md.

**Prompt de nó**:
O campo `prompt` dos nós acionáveis do `roadmap.json` (tarefas `fazer`, pendentes, propostas): texto pronto para o Pedro colar no Claude Code, em pt-BR, passo a passo para leigo. Tarefa manual do Pedro vira prompt do tipo "me guie enquanto eu faço, diga o que clicar e confira cada resultado"; tarefa técnica vira prompt que manda a sessão executar com ele acompanhando.
_Avoid_: prompt em nó feito (ruído); prompt que assume conhecimento técnico do Pedro; prompt em arquivo separado do roadmap.json.

**Ideias (faixa do roadmap)**:
Cards livres do Roadmap do OS: título + poucas linhas + link opcional para doc. Ideia não tem ID, dono nem dependência até ser puxada para o estágio (aí vira tarefa no TODO.md, com ficha e "pronto quando"). Únicos dados do OS editáveis pela interface: o server grava num único arquivo de dados do roadmap, por rota de escrita restrita (ADR-0007).
_Avoid_: promover ideia a tarefa sem passar pelo TODO.md; dar status/dono a card de ideia.

**Mapa das APIs**:
Página do Ana OS que organiza os endpoints da API GH de WhatsApp por tema (identificação, catálogo, disponibilidade, agendamento, anexos), cada um com **selo de testabilidade** derivado da dinâmica dos bancos ([[finalizacao-do-agendamento]]): *leitura de catálogo* (resposta da API é a prova), *escrita no SaaS GH* (testável só pela resposta; invisível no Oracle por arquitetura) e *finalização* (o único ponto com [[prova-no-banco]] na TST). Nasceu puxando a metade "catálogo e viabilidade" da GH1; a metade "onde encaixar no fluxo da Ana" foi fechada em 06/ago/2026 pela [[fachada-de-agenda]] (ADR-0009).
_Avoid_: tratar a API GH como janela de leitura do banco MV (ela é puramente de agendamento; quem lê o MV é o Oracle TST direto, e o Atlas para produção).

**Biblioteca**:
Seção do Ana OS que exibe a documentação do repositório renderizada no navegador, a partir de uma **allowlist explícita** servida pelo server (CONTEXT.md, `docs/adr/`, `roadmap/`, os `.md` de `ana/api-mv/`, documento-mestre). A doc continua morando no git como fonte única; o OS só exibe. `dados-locais/` e `resultados/amostras/` são proibidos por regra no servidor.
_Avoid_: wiki externa ou cópia da doc; servir qualquer pasta fora da allowlist.

**Acervo do roadmap**:
`roadmap/arquivo/`: o roadmap anterior completo (TODO com as trilhas A-G, PENDENCIAS.md, mapas antigos), arquivado intacto. Os textos prontos para a Global Health e para o analista de TI moram lá, além do histórico das trilhas de banco MV, pós-atendimento e canal principal. O `mapa.html` de 30/jul/2026 (aposentado no mesmo dia pelo Ana OS) e o playground pré-OS (`ana/api-mv/arquivo/playground-pre-os/`) moram no acervo também.
_Avoid_: apagar; tratar o acervo como fonte do estado atual (é história, não fronteira).

**Pendente (bloco do roadmap)**:
A faixa do Roadmap do OS com as dívidas conscientes, uma linha cada: hoje só o sistema de protocolo da ouvidoria (OV1). A GH1 (desenho do fluxo GH) foi puxada e concluída em 06/ago/2026 (ADR-0009); o token Cloudflare (V7) desceu para o radar. Sem tarefas detalhadas até cada uma ser puxada para o estágio ativo.

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
