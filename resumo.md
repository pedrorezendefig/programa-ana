# Resumo da execução autônoma do roadmap (06 e 07/ago/2026)

Sessão em modo totalmente autônomo, com time de agentes em duas ondas: Onda A em paralelo (P7, V8, OV1, áreas disjuntas) e Onda B sequencial (P8 e depois P5, as únicas que mexeram na plataforma fazer.ai, nunca duas ao mesmo tempo). Toda pergunta prevista nos cards virou decisão autônoma registrada. Um commit por card, sem push. Nenhuma finalização de agendamento foi executada, nenhuma produção foi tocada, nenhum segredo passou por prompt, arquivo ou chat.

## 1. O que foi entregue (por card)

**P7 virou V13, Mapa visual do SOP no Ana OS (feito).** Página nova `os/sop.html` (SVG à mão, visual do DESIGN.md, item "Mapa do SOP" na sidebar) e dados em `os/dados/sop-fluxo.json`. O SOP inteiro em 8 raias (urgência, particular, convênio, exames, ouvidoria, mais entrada/regras globais, coleta/escalada/encerramento e apoio de prontuário/dúvidas). Hover mostra e clique fixa o painel com o trecho literal do prompt que rege cada nó; clique na raia isola a jornada. Prova: todos os trechos validados como substring exata do prompt exportado da plataforma; ao final da sessão o mapa foi re-validado contra a v5.3 e está em 77 nós, 106 arestas e 95 trechos, 0 ausentes.

**V8, verificação do hotfix do Chatwoot (feita, só leitura).** Hotfix intacto no container (linha 11 do `base_controller.rb` com `current_account`), zero respostas 5xx em todo o log desde 29/jul (106 mil linhas na janela de 7 dias), containers de pé há 8 dias sem restart, rotas vivas (401 sem credencial, não 500). Nada foi reaplicado nem redeployado. Prova: ficha V8 do radar atualizada com a evidência datada.

**OV1, protocolo da ouvidoria (decidido; implementação vira OV2).** Nasce o **ADR-0010**: protocolo sequencial ANO-NNNN na tabela nova `5_Ouvidoria_Protocolos` da Base Ana, numerado pelo autoincremento do banco e formatado por coluna de fórmula (o modelo nunca compõe número). Tabela sem shared view pública e sem dado pessoal (índice, não dossiê). A implementação não rodou por falta de via segura: criar tabela exige a API de metadados do NocoDB e um token novo, que só o Pedro deve gerar. Specs completas das duas tools prontas no ADR. Prova: `docs/adr/0010-protocolo-ouvidoria.md`, termo novo no CONTEXT.md, pendente OV2 no roadmap.

**P8 virou V14, cadastro de paciente pela Ana (feito).** Tool id 7 `cadastrar_paciente` (POST /pessoas da homolog, credencial `gh-homolog-token` do vault, risco medium, primeira tool de escrita da Ana) e prompt na v5.2 com o PASSO 3.6 (cadastro só após busca por CPF vazia e confirmação explícita dos quatro dados). Prova real no playground: paciente sintético TESTE FOXTROT LIMA (CPF 39709294318, dígitos verificadores válidos) criado na homolog com **id 1693**, incluindo um 417 real ("Data de nascimento é obrigatória") tratado corretamente pela Ana no meio do fluxo, e o fluxo seguindo sozinho (tag, kanban, handoff). Fase P4 do ADR-0009 fechada.

**P5 virou V15, horários livres na conversa (mecânica completa; vitrine aguarda GH-19).** Três tools de leitura (ids 8-10: especialidades, horários livres, prestadores) e prompt na v5.3 (Seção 2.3.1: lista numerada de até 5 horários quando houver; caso vazio informa indisponibilidade com honestidade e escala; nunca dizer que horário está marcado). Prova no playground: pedido de cardiologia chama a cadeia (elo 1 devolve vazio), a Ana responde a indisponibilidade e escala; no teste de pressão ("me dá qualquer horário") ela fez zero chamadas e não inventou nada. A vitrine com slots reais destrava sozinha quando a Global Health publicar a massa, sem nenhuma mudança de configuração.

## 2. Decisões autônomas tomadas (a revisar pelo Pedro)

Registradas também nas fichas do TODO.md e, quando de domínio, no CONTEXT.md.

- **OV1**: numeração pelo banco (nunca "ler e incrementar": corrida em canal 24/7); NNNN contínuo, sem reiniciar por ano; tabela sem nome nem CPF (inversão deliberada do desenho do Sheets que vazou); duas tools encadeadas até o proxy existir; colunas Categoria/Setor/Prazo além do mínimo. Onde revisar: seção "Decisões autônomas" do ADR-0010.
- **V13/P7**: o esboço para aprovação virou decisão (8 raias com duas transversais e uma de apoio; hover mostra e clique fixa; rótulos de aresta sob demanda; 5 formas de nó). O recorte dos 72 nós originais é leitura curada do SOP, não extração mecânica: vale passar o olho. Onde revisar: ficha V13 e a própria página.
- **V14/P8**: campo `sexo` fora da tool (a API aceita sem; economiza uma pergunta ao paciente); `telefone` obrigatório (é o elo de reencontro no WhatsApp); risco medium; data fixada em aaaa-mm-dd (a API grava cru). Onde revisar: ficha V14.
- **V15/P5**: **desvio consciente do ADR-0009**, tools HTTP diretas em vez do proxy fino no Coolify (a cadeia particular tem só 2 elos; o antiloop virou regra de porta; o proxy não se paga com catálogo vazio e volta a ser avaliado na P6, onde nasce com requisito claro). Dieta do prompt: cortadas as 6 menções ao `resolve_conversation` (tool fora dos grants desde a V6) e duplicações literais entre prompt e descriptions; nenhuma regra viva cortada; log corte a corte no scratchpad da sessão. Onde revisar: ficha V15 e termo Fachada de agenda no CONTEXT.md.
- **Numeração dos cards**: propostas puxadas viraram V13 (P7), V14 (P8) e V15 (P5); OV1 manteve o ID como tarefa (precedente da GH1) e a implementação virou a pendente OV2.

## 3. O que travou (por card, com evidência)

- **P3 (prova GH-18) e P2 (VPN da TST)**: a VPN segue caída desde 13/jul. Evidência fresca de 06/ago: `python3 ana/api-mv/scripts/query-mv.py "SELECT 1 FROM DUAL"` falha com **ORA-12170, timeout TCP de 20s para 10.100.66.170:1521**. Religar depende da TI do hospital (textos prontos em `roadmap/arquivo/`). Nada foi tentado além do teste de conexão, por regra.
- **P6 (fim a fim)**: não executada, por dupla razão: finalização nunca roda em modo autônomo (regra do programa) e depende de P3 (GH-18) e da massa da GH-19. A mecânica que a antecede (identificação, cadastro, disponibilidade) ficou pronta nas V12/V14/V15.
- **GH-19 (massa de homolog)**: re-evidenciada em 07/ago (18h38 a 18h50 UTC): `/consultas`, `/prestadores`, `/convenios` e `/exames` todos 200 com `conteudo: []`; `/agendas/v2` com 500 "Erro interno" sem ids reais. Auth e latência saudáveis. É o único bloqueio da vitrine de horários.
- **V7 (token Cloudflare)**: pulada; só o Pedro pode declarar o fim do uso.
- **OV1 fase 2**: criar a tabela e o token do NocoDB exige segredo novo que a sessão não deve fabricar; ficou como pendente OV2 com passo a passo pronto.
- **V8, teste por token**: o teste ponta a ponta dos endpoints via token foi bloqueado pelo classificador de permissões (corretamente); a prova ficou por inspeção do arquivo e ausência de 5xx.

## 4. Correções no caminho (bugs achados e o que foi feito)

- **Interpolação de body na plataforma**: o body de tool HTTP só substitui `{{campo}}` quando o nome do campo do input_schema é idêntico à chave do JSON. O primeiro cadastro saiu com dataNascimento vazio (417); corrigido renomeando o campo. Regra registrada no CONTEXT.md e no report V10.
- **Teto de 50.000 caracteres do systemPrompt, sem validação no dry_run**: o preview aceita e o apply recusa com too_big. O prompt estava a 9 caracteres do teto após a v5.2; a dieta da V15 abriu 647 de folga. Virou o item **R1 do radar** (prio 6): a P6 não cabe sem reestruturação do prompt.
- **Contrato do GET /pessoas**: não usa o envelope `conteudo` (objeto puro quando encontra, corpo vazio quando não encontra), diferente do resto da API; o parâmetro é `telefone` apesar de a mensagem de erro dizer "celular". Registrado no CONTEXT.md; docs falavam "lista vazia" (impreciso mas funcional).
- **Divergência de parâmetro do /agendas/v2**: docs/02 usa `idItemAgendamento`, a página Cadeias usa `idConsulta`. A tool 9 seguiu o docs/02; é o primeiro teste quando a massa chegar (corrigir é um tool_update).
- **Mapa do SOP defasado pela própria sessão**: a v5.2/v5.3 quebrou 9 âncoras da v5.1; re-validação rodada no final (5 nós e 8 arestas novos, 95 trechos, 0 ausentes).
- **Prompt prometia protocolo que nenhuma ferramenta produzia** (achado da OV1): o subfluxo n8n recebia o número como entrada, e o alerta D+4 do prazo morreu na migração. O ADR-0010 devolve a auditabilidade.
- **MCP fazer.ai instável no fim da sessão**: o agente de re-validação não conseguiu reexportar o prompt (socket fechado em 6 tentativas) e validou contra o export feito às 15h38 do mesmo dia (49.353 caracteres, o tamanho exato da v5.3). Reexportar quando o MCP voltar; divergência apareceria como trecho ausente.

## 5. Estado da plataforma ao final (tenant vitta-tech, agente id 1)

- **Prompt: v5.3**, 49.353 de 50.000 caracteres (folga 647), aplicado com dry_run, diff e verificação por sha256 em cada mudança (v5.1 -> v5.2 -> v5.3; os exports estão no scratchpad da sessão).
- **Grants**: 8 tools nativas + 1 RAG (Base Hospital São Matheus) + **10 tools HTTP**: ids 1-4 (tabelas da Base Ana, NocoDB), ids 5-6 (buscas por CPF e telefone, V12), id 7 (`cadastrar_paciente`, V14), ids 8-10 (`consultar_especialidades_agenda`, `consultar_horarios_livres`, `consultar_prestadores_agenda`, V15). Nada foi removido dos grants.
- **Credenciais**: só a `gh-homolog-token` existente (vault:4) foi reutilizada; nenhuma credencial nova criada.
- **Homolog GH**: pacientes de teste acumulados (não há DELETE de pessoa): 1691 e 1692 (sondagens de payload) e 1693 (a prova da V14), além dos anteriores 1685/1686 das Cadeias. O paciente-sonda 1681 está íntegro e intocado.
- **Chatwoot**: congelado como manda a regra; hotfix intacto, nenhuma etapa/tag/inbox criada ou renomeada.
- **VPS/Coolify**: nenhum serviço criado, alterado ou reiniciado.

## 6. Próximos passos recomendados (o que só o Pedro destrava)

1. **Cobrar a massa de homolog (GH-19)**: a cobrança pronta está em `ana/api-mv/cobranca-massa-homolog.md`. É o único bloqueio da vitrine de horários; quando publicarem, rodar o cenário de cardiologia no playground e conferir as duas chamadas encadeadas (re-validação descrita na ficha V15).
2. **Cobrar a TI do hospital pela VPN da TST** (textos prontos em `roadmap/arquivo/`): destrava P3 (GH-18) e, com ela, o gate da P6.
3. **OV2, protocolo da ouvidoria**: criar a tabela `5_Ouvidoria_Protocolos` na tela do NocoDB (colunas e fórmulas prontas para colar no ADR-0010) e gerar o token para o vault (`nocodb-base-ana-token`); a sessão seguinte cria as tools e costura a Seção 7.3.
4. **Revisar as decisões autônomas** da seção 2, em especial: sexo fora do cadastro, telefone obrigatório, tools diretas sem proxy (desvio do ADR-0009) e o NNNN contínuo do protocolo.
5. **Report à fazer.ai** (radar V10, agora com 4 achados): resolve_conversation descarta a mensagem final; input_schema sem normalização de JSON Schema; interpolação do body exige campo idêntico à chave; dry_run do prompt_set não valida o teto de 50k.
6. **Dieta estrutural do prompt (radar R1)** antes da P6: sobram 647 caracteres e a finalização não cabe; o caminho provável é mover blocos estáticos para a base de conhecimento.
7. **Passar o olho no Mapa do SOP** (`localhost:8777/sop.html`): o recorte dos nós é leitura curada; conferir se algum ramo importante ficou implícito.
