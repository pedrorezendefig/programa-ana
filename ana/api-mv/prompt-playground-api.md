# Prompt: construir o Playground da API Global Health

> **Como usar:** abra uma NOVA sessão Claude Code neste mesmo diretório (`~/PedroDev/Ana`) e cole tudo que está abaixo da linha. A sessão vai construir a aplicação completa. Criado em 07/jul/2026 pela sessão do smoke test.

---

Você vai construir um **playground local para estudar, testar e verificar a API de agendamento da Global Health (homologação)**: um front leve e agradável em HTML puro, servido por um backend Python mínimo que faz as chamadas reais à API. O usuário é o Pedro: ele quer apertar botões, preencher parâmetros, ver a resposta crua e ENTENDER cada chamada. Didática acima de tudo: o básico do básico, bem explicado, em pt-BR.

## Contexto (leia antes de codar)

Você está no repo do Programa Ana. Fontes que você DEVE consultar antes de montar os cards:

1. `ana/api-mv/doc_whatsapp_agendamento_1.10.pdf`: a doc oficial da API (16 páginas). Leia para confirmar os campos exatos de `POST /horarios/agendar`, `POST /anexos/*` e qualquer endpoint que este prompt não detalhe.
2. `docs/02-arquitetura-agendamento.md` (§4): como os endpoints se encadeiam no fluxo real de agendamento.
3. `ana/api-mv/smoke-test-gh.md`: o que já foi testado em 07/jul/2026 e as pegadinhas descobertas.

**Motivação extra do Pedro:** ele quer descobrir ONDE a API grava. O paciente criado via API (CPF `66301102770`, id 1681) NÃO aparece no Oracle de teste que ele acessa pelo DBeaver. Cada card de escrita deve exibir, junto da resposta, uma "dica de verificação no banco" (query SQL pronta para copiar) para ele conferir no DBeaver se o registro apareceu do lado do MV.

## Fatos técnicos obrigatórios (não descobrir de novo, não contrariar)

- **Base URL (homolog):** `https://dem.agenda.globalhealth.mv/rest/whatsapp`
- **Produção existe (`whatsapp.agenda.globalhealth.mv`) mas está PROIBIDA neste app.** Não incluir seletor de ambiente. Escreva isso num aviso do rodapé.
- **Autenticação:** header `Token: <valor>` (não é `Bearer`). O token está na variável `GH_TOKEN_HOMOLOG` do `.env` na **raiz do repo** (o `.env` está no .gitignore; jamais copie o valor para o código, para o HTML ou para qualquer arquivo commitado).
- **O token NUNCA vai ao navegador:** o front chama só o backend local, e o backend injeta o header e repassa para a GH (proxy same-origin; isso também elimina CORS).
- **`tipoAgendamento` aceita só `CONSULTA` ou `EXAME`, em CAIXA ALTA.** Minúsculo derruba a API com HTTP 500. Use `<select>` com as duas opções, nunca texto livre.
- **`GET /pessoas` sem match responde 200 com corpo VAZIO** (não 404). O front deve mostrar "200, corpo vazio: pessoa não encontrada" em vez de quebrar no JSON.parse.
- **Dois formatos de erro** coexistem: `{"sucesso": false, "mensagemErro": "..."}` (no agendar) e `{"mensagens": [{"tipo": "ERROR", "mensagem": "...", "parametros": []}]}` (com HTTP 500). Trate os dois e exiba legível.
- **Listas são paginadas:** `{"conteudo": [...], "paginaAnterior": "", "paginaSeguinte": ""}`.
- **Datas em ISO** (`YYYY-MM-DD`). **CPF sempre string** (zeros à esquerda importam).
- Latência típica: 500 a 800ms por chamada. Timeout sugerido: 30s.
- **Paciente-sonda para testes de leitura:** CPF `66301102770` (nome TESTE INTEGRACAO ANA VITTA, id 1681). Use como valor default dos campos de CPF.

## O que construir

Pasta `ana/api-mv/playground/` com DOIS arquivos, e nada mais:

### 1. `server.py` (backend, só biblioteca padrão do Python, zero pip install)

- `http.server` na porta **8777**. Rodar com: `python3 ana/api-mv/playground/server.py` (imprimir no console: "Playground em http://localhost:8777" e o resultado de um teste de token feito na subida).
- Rotas:
  - `GET /` serve o `index.html`.
  - `GET /api/status`: faz `GET /pessoas?cpf=66301102770` na GH e responde `{"backend": true, "gh_alcancavel": bool, "token_valido": bool, "latencia_ms": n}` (token válido = HTTP 200; inválido = 401/403).
  - `POST /api/gh`: o proxy. Body: `{"method": "GET|POST", "path": "/pessoas", "query": {...}, "body": {...|null}}`. O servidor valida que `path` começa com `/`, monta a URL na base de homolog, injeta o header `Token`, chama, e devolve `{"status": n, "latencia_ms": n, "corpo_cru": "<texto>", "json": {...|null}}`. Nunca siga URL absoluta vinda do front (só path relativo à base).
- Lê o `.env` da raiz do repo subindo diretórios a partir do próprio arquivo (mesma técnica de `ana/api-mv/scripts/query-mv.py`). Se `GH_TOKEN_HOMOLOG` faltar, morre com mensagem clara.

### 2. `index.html` (front, um arquivo só, HTML + CSS + JS vanilla, sem CDN, sem framework)

**Visual:** limpo e leve. Fundo claro, cartões brancos com sombra suave, fonte do sistema, largura máxima ~900px centralizada, título "Playground API Global Health (homolog)". JSON em monospace. Cores de status: verde (ok), âmbar (atenção), vermelho (erro). Sem itálico e sem sublinhado decorativo.

**Barra de status no topo (atualiza ao carregar e num botão "re-testar"):**
- Backend local: ok/fora (o fetch de `/api/status` respondeu?)
- API GH alcançável: ok/fora + latência
- Token: válido/inválido
- Três bolinhas coloridas + frase em português dizendo o veredito (ex.: "Conectado e autenticado: pode chamar as APIs").

**Cards de endpoint, agrupados em seções na ordem didática do fluxo real:**

Cada card tem: título em português, badge do método (GET azul, POST laranja), o path, **uma explicação de 1 a 3 frases em linguagem simples** (o que faz, quando se usa no fluxo da Ana), os campos de parâmetro (com `placeholder` explicando cada um e valor default quando existir), botão **Chamar**, e o painel de resposta (HTTP status colorido, latência, JSON formatado com indentação; corpo vazio vira a frase "200, corpo vazio: não encontrado").

Grupos e cards (explicações: escreva com suas palavras, simples; parâmetros conforme a doc oficial):

1. **Pessoas (o cadastro do paciente)**
   - `GET /pessoas` por CPF (default: a sonda). Explicar: "é o passo 1 de qualquer atendimento: a Ana descobre se o paciente já existe".
   - `GET /pessoas` por telefone. Explicar o atalho (o telefone do WhatsApp já é conhecido).
   - `POST /pessoas` criar (campos: cpf, nome, dataNascimento ISO, telefone, sexo M/F). AVISO vermelho: "cria registro REAL na homologação". Dica de verificação no banco: `SELECT CD_PACIENTE, NM_PACIENTE, NR_CPF FROM DBAMV.PACIENTE WHERE NR_CPF = '<cpf usado>';`
2. **Catálogo (o que dá para agendar)**
   - `GET /consultas?pesquisa=`: buscar especialidades de consulta.
   - `GET /exames?pesquisa=`: buscar exames.
   - Nota âmbar nos dois: "em 07/jul/2026 vinham vazios: massa de homolog não publicada (pedido GH-19)".
3. **Convênio e plano**
   - `GET /convenios?pesquisa=&idItemAgendamento=`: explicar que até "particular" é um convênio com id próprio (flag `particular: true`).
   - `GET /convenios/{idConvenio}/planos?idItemAgendamento=`.
4. **Prestadores e horários**
   - `GET /prestadores?pesquisa=&idItemAgendamento=&somentePrestadoresComHorario=true`.
   - `GET /agendas/v2?idItemAgendamento=&idConvenio=&idPlano=` (+ opcionais idPrestador, turno, dataInicial): "é a busca de horários livres".
   - `GET /consultas/tipos?idAgenda=`: primeira consulta vs retorno.
   - `GET /exames/perguntas?idItemAgendamento=&cpf=`: triagem do exame.
5. **Agendar e gerir (escrita!)**
   - `POST /horarios/agendar`: campos conforme a doc oficial (confira no PDF). AVISO vermelho + dica de verificação no banco: `SELECT CD_IT_AGENDA_CENTRAL, HR_AGENDA, CD_PACIENTE, TP_FORMA_AGENDAMENTO, CD_USUARIO, DT_GRAVACAO FROM DBAMV.IT_AGENDA_CENTRAL WHERE DT_GRAVACAO >= SYSDATE - 1 ORDER BY DT_GRAVACAO DESC;` e `SELECT * FROM DBAMV.ATENDIME_GLOBAL_HEALTH;` com a frase: "se aparecer aqui, a API grava no SEU banco; é a prova que você procura".
   - `GET /agendamentos?cpf=&tipoAgendamento=` (select CONSULTA/EXAME): listar agendamentos do paciente.
   - `GET /agendamentos/{id}`: consultar um agendamento e seu status (útil para conferir depois de um timeout).
   - `POST /horarios/reagendar` (idHorario, idAgendamentoAnterior): remarcar.
6. **Anexos e instruções (avançado, dobrável/colapsado por padrão)**
   - `POST /anexos/agendamento`, `POST /anexos/upload`, `GET /carteiras?cpf=`, `GET /horarios/{id}/instrucoes`, `GET /exames/instrucaoGeral`: um card simples cada, com a explicação curta; campos conforme o PDF.

**Histórico:** uma seção no fim com as últimas 20 chamadas da sessão (hora, método, path, status, latência), mais recente primeiro, e botão "limpar". Guardar só em memória da página.

## Critérios de pronto (verifique você mesmo antes de entregar)

1. `python3 ana/api-mv/playground/server.py` sobe sem pip install e imprime o teste de token.
2. Abrindo `http://localhost:8777`: a barra de status fica verde (com o `.env` atual) e a frase de veredito aparece.
3. Clicar "Chamar" no card do CPF-sonda traz o JSON do TESTE INTEGRACAO ANA VITTA.
4. O card de consultas mostra a resposta vazia SEM quebrar, com a nota âmbar explicando o porquê.
5. Forçar um erro (ex.: chamar agendamentos com um path adulterado ou body inválido) exibe o erro formatado, não uma tela quebrada.
6. Nenhum arquivo novo contém o token (grep antes de commitar) e o app não referencia produção.
7. Commit dos dois arquivos com mensagem clara (o repo tem convenções: sem em dash, trailer de coautoria do Claude).

## O que NÃO fazer

- Não usar framework, bundler, CDN, npm, pip: nada além de Python stdlib + HTML/CSS/JS vanilla.
- Não criar seletor de ambiente nem citar a URL de produção em lugar clicável.
- Não inventar endpoint que não esteja na doc oficial ou neste prompt; se o PDF divergir deste prompt, o PDF vence (e anote a divergência num comentário do card).
- Não colocar o token, nem trecho dele, em nenhum arquivo, log ou HTML.
