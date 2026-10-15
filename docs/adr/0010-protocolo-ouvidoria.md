---
status: accepted
date: 2026-08-06
amended_by: 0015, 0016
---

# O protocolo da ouvidoria é um sequencial ANO-NNNN numa tabela própria do NocoDB, fora de qualquer shared view

Fecha a pendente **OV1**. A Ana passa a informar ao paciente um número de protocolo de ouvidoria no formato `ANO-NNNN` (ex.: `2026-0001`), gerado por uma tabela nova da Base Ana (`5_Ouvidoria_Protocolos`), gravada e lida por ferramentas HTTP da plataforma. O número **nunca é composto pelo modelo**: quem numera é o banco (autoincremento) e quem formata é uma coluna de fórmula do próprio NocoDB. A tabela é a única da Base Ana que **não** ganha shared view pública: ela é lida com credencial, ao contrário das quatro tabelas de valores.

Executada em modo autônomo por decisão do Pedro (06/ago/2026): a entrevista prevista no card virou decisão da sessão, com as escolhas de desenho marcadas para revisão na seção final.

## Contexto

- O SOP em produção proíbe a Ana de inventar protocolo (Regra Global "nunca invente números... todo protocolo vem de ferramenta"). Resultado prático hoje: a Seção 7.3 do prompt tem o texto "sua ocorrência foi registrada com o protocolo [protocolo]", mas **não existe ferramenta que produza esse número**. A frente 3 (ouvidoria 24/7) roda sem protocolo.
- O mecanismo antigo morreu na migração do n8n. O subfluxo `Registrar_reclamacao` (`ana/workflows/Registrar_reclamacao.json`) recebia o `protocolo` como **entrada** e apenas anexava a linha na aba `6_Ouvidoria_Log` do Google Sheets, com `Nome_Solicitante`, `CPF_Solicitante`, `Nome_Paciente` e a descrição. Foi exatamente essa aba que vazou pelo compartilhamento por link e motivou o ADR-0006.
- A tarefa com prazo de 5 dias úteis e o alerta em D+4, que sustentavam operacionalmente a promessa do script ("nossa equipe entrará em contato em até 5 dias úteis"), também ficaram no n8n. Hoje nada mede o cumprimento do prazo.
- A Base Ana (ADR-0006) funciona assim: as tools da Ana leem **shared views públicas somente leitura**, sem segredo nenhum; qualquer escrita exige autenticação. Nenhuma tabela com dado de paciente entrou nessa base até agora, por decisão do próprio ADR-0006.
- O protocolo de **agendamento** (numérico, devolvido pela Global Health em `Efetivar_agendamento`) é outro objeto e outro espaço de numeração. O formato com ano e hífen escolhido aqui torna os dois visualmente distinguíveis numa conversa.

## Opções consideradas

| Opção | Veredito |
|---|---|
| **Sequencial ANO-NNNN em tabela nova do NocoDB** | **Escolhida**: número curto, legível ao telefone, auditável, e a tabela já resolve status e prazo da manifestação. Custo de implantação medido em minutos |
| Usar o id da conversa do Chatwoot | Descartada: vaza detalhe de infraestrutura para o paciente, não é sequencial nem por ano, muda de significado se a instância for migrada, e ainda amarra um número público a um identificador interno de sistema |
| Esperar a integração com o MV | Descartada: adia por tempo indefinido uma frente que já está no ar 24/7 e que é justamente onde a promessa ao paciente é mais sensível. A ouvidoria não depende de agenda, e o MV não numera manifestação de ouvidoria hoje |
| Não dar protocolo nenhum | Descartada como estado final: é o que existe hoje. Continua sendo o comportamento correto de **falha** (ver Regra Híbrida abaixo), não o comportamento normal |

## A tabela `5_Ouvidoria_Protocolos`

Base Ana (`pigw746ba6w6l52`), no mesmo NocoDB das quatro tabelas de valores.

| Coluna | Tipo NocoDB | Quem preenche | Regra |
|---|---|---|---|
| `Id` | ID (autoincremento) | NocoDB | Base atômica da numeração. Nunca é dito ao paciente |
| `Protocolo` | Formula | NocoDB | `CONCAT(YEAR({Data_Abertura}), '-', RIGHT(CONCAT('000', {Id}), 4))`. É o único número que a Ana lê em voz alta. Se a versão do NocoDB não tiver `YEAR`, usar `LEFT(DATESTR({Data_Abertura}), 4)` no lugar |
| `Data_Abertura` | Created time | NocoDB | Carimbo do servidor. O modelo não escreve data, então não há data errada nem fuso divergente |
| `Conversa_Id` | SingleLineText | tool (ver ressalva) | Ponte para a conversa no Chatwoot, onde mora o conteúdo completo |
| `Categoria` | SingleLineText | tool | O `motivo_categoria` que o prompt já infere: Atendimento, Demora, Cobrança, Higiene, Conduta profissional, Infraestrutura, Elogio |
| `Setor` | SingleLineText | tool | O `setor_identificado` que o prompt já infere do relato |
| `Resumo` | LongText | tool | Uma a duas linhas em linguagem de relato ("paciente relata que..."). **Sem CPF, sem nomes (solicitante, paciente ou profissional), sem dado clínico** |
| `Status` | SingleSelect: Aberto (padrão), Respondido, Encerrado | equipe da ouvidoria | A tool não escreve; nasce Aberto |
| `Prazo_Resposta` | Formula | NocoDB | `DATEADD({Data_Abertura}, 7, 'day')`. Aproxima em dias corridos a promessa de 5 dias úteis, para o painel interno enxergar o vencido. Não é a promessa em si |

### Por que o banco numera, e não a ferramenta

A alternativa óbvia (a tool lê o último protocolo do ano e grava o seguinte) é uma leitura seguida de uma escrita, sem transação: duas manifestações simultâneas, num canal que atende 24 horas, podem ler o mesmo "último" e gravar o mesmo número. Protocolo repetido em canal que vira prova é um defeito caro e silencioso. O `Id` autoincremento do banco é atômico por construção, e a coluna de fórmula transforma o `Id` no formato final sem nenhuma lógica do lado da Ana. Ninguém pode inventar, truncar ou desalinhar o número.

**Consequência assumida:** o `NNNN` é um sequencial contínuo, não reinicia em janeiro. Depois de 42 manifestações em 2026, a primeira de 2027 será `2027-0043`. O prefixo continua dizendo o ano de abertura, a unicidade é garantida e ninguém precisa lembrar de zerar nada. Reiniciar por ano exigiria uma tabela de contadores (e a corrida de volta) ou um offset editado na fórmula toda virada de ano. Não vale o preço. Acima de 9999 registros o `RIGHT(...,4)` truncaria: no volume de uma ouvidoria hospitalar isso é década, e a correção é trocar 4 por 5 na fórmula.

### Ressalva sobre `Conversa_Id`

Não está confirmado que a plataforma fazer.ai exponha o id da conversa como variável interpolável no corpo de uma tool HTTP (`tool_create` não documenta variáveis de contexto). Enquanto isso não for confirmado com a fazer.ai, a coluna existe e fica vazia, e o vínculo se faz na direção inversa: o `Escalar_humano` já leva o resumo para a `FILA OUVIDORIA`, e o prompt passa a incluir o protocolo nesse resumo. A conversa aponta para o protocolo, em vez do protocolo apontar para a conversa. Se a variável existir, o campo passa a ser preenchido sem nenhuma outra mudança.

## Sigilo: esta tabela é um índice, não um dossiê

Duas regras inegociáveis, ambas herdadas do incidente que gerou o ADR-0006:

1. **A tabela não entra em shared view pública.** As quatro tabelas de valores são públicas porque não têm dado pessoal. Esta tem, por natureza, o rastro de uma queixa. Leitura e escrita passam por credencial.
2. **Identificação não desce para a tabela.** Nome, CPF, nome do paciente e o relato completo continuam onde já estão hoje: na conversa do Chatwoot, que tem controle de acesso, e no resumo do `Escalar_humano`. A tabela guarda o mínimo para rastrear e cobrar prazo (número, data, categoria, setor, status). Isso muda o desenho antigo do Sheets de propósito: se este banco vazar amanhã, o que sai é "2026-0007, Demora, Recepção, Aberto", não nome e CPF de quem reclamou.

## O fluxo na conversa (revisão da Seção 7.3 do prompt)

1. Coleta e confirmação do paciente seguem exatamente como estão hoje (Seções 7.1 e 7.2).
2. `registrar_ouvidoria` grava a linha e devolve o `Id`.
3. `consultar_protocolo_ouvidoria` devolve o campo `Protocolo` daquele `Id`.
4. **Só então** a Ana informa o número ao paciente. Antes disso ela não menciona protocolo, nem no condicional.
5. **Se qualquer uma das duas chamadas falhar:** Regra Híbrida. A Ana nunca inventa, nunca estima e nunca promete o número para depois na mesma frase em que erra. Ela acolhe, segue para `FILA OUVIDORIA` e `Escalar_humano`, e diz a verdade operacional, que é suficiente:
   ```
   Registrei seu relato e já encaminhei para a nossa ouvidoria.
   Nossa equipe vai entrar em contato em até 5 dias úteis.
   ```
6. **Nunca registrar duas vezes a mesma manifestação.** Uma gravação por conversa. Se houver dúvida se entrou, consultar pelo `Id` já devolvido, jamais gravar de novo (é o espelho da Regra 17 do agendamento).
7. O protocolo de ouvidoria (`2026-0007`) e o protocolo de agendamento (numérico, da Global Health) nunca se misturam: são ferramentas diferentes, formatos diferentes e momentos diferentes do SOP.

## Implementação por fases

| Fase | O quê | Quem | Estado |
|---|---|---|---|
| 1 | Desenho, spec da tabela e spec das tools | esta sessão | Feito (este ADR) |
| 2 | Criar a tabela `5_Ouvidoria_Protocolos` no NocoDB e gerar um API token | Pedro, no console | **Pendente**. Nenhuma via segura desta máquina cria tabela (ver abaixo) |
| 3 | Guardar o token no vault da plataforma e criar as duas tools | orquestrador, serializado | Pendente da fase 2 |
| 4 | Costurar a Seção 7.3 do prompt (a chamada das tools e o texto de falha) | orquestrador | Pendente da fase 3 |
| 5 | Colapsar as duas tools numa só, quando o proxy fino do ADR-0009 (P5) existir | mais tarde | Opcional, sem mudança de tabela nem de formato |

**Por que a fase 2 não foi executada nesta sessão:** o MCP `nocodb-base-ana` só tem ferramentas de **dados** (`queryRecords`, `createRecords`, `getTableSchema` e afins). Não existe nenhuma ferramenta de metadados, então criar tabela por ele é impossível. A única credencial de NocoDB nesta máquina é o token do próprio MCP (escopo `/mcp`), e a API de metadados do NocoDB exige um `xc-token` de API, que não existe aqui e não deve ser fabricado por uma sessão de agente. A escrita autenticada (fase 3) tem a mesma trava: depende de um segredo novo, criado pelo Pedro.

## Spec das ferramentas (para o orquestrador criar depois, não criadas agora)

Host: `nocodb-ucc0hkwgqdsa38p5xrwa1x0h.31.97.29.32.sslip.io`. `TABLE_ID` é o id que o NocoDB atribuir à tabela nova. Credencial no vault: **`nocodb-base-ana-token`**, tipo header, header `xc-token` (mesmo padrão da `gh-homolog-token`, que usa o header `Token`). `input_schema` no **formato compacto nativo** da instância, nunca JSON Schema padrão (achado da V12).

**`registrar_ouvidoria`** (risk_tier `medium`, escrita)
```
method: POST
url_template: https://<host>/api/v2/tables/<TABLE_ID>/records
allowed_hosts: ["nocodb-ucc0hkwgqdsa38p5xrwa1x0h.31.97.29.32.sslip.io"]
headers: {"Content-Type": "application/json", "Accept": "application/json"}
credential_ref: "nocodb-base-ana-token"
input_schema: {
  "categoria": {"type": "string", "required": true,
                "description": "Categoria inferida do relato: Atendimento, Demora, Cobranca, Higiene, Conduta profissional, Infraestrutura ou Elogio"},
  "setor":     {"type": "string", "required": true,
                "description": "Setor identificado no relato (ex.: Pronto-Socorro, Recepcao, Enfermagem, Faturamento). Usar 'Nao informado' se o relato nao permitir inferir"},
  "resumo":    {"type": "string", "required": true,
                "description": "Uma a duas linhas em linguagem de relato (paciente relata que...). NUNCA incluir CPF, nome de paciente, de solicitante ou de profissional, nem dado clinico"}
}
body: {"Categoria": "{{categoria}}", "Setor": "{{setor}}", "Resumo": "{{resumo}}"}
retorno esperado: [{"Id": 12}]
```

**`consultar_protocolo_ouvidoria`** (risk_tier `low`, leitura)
```
method: GET
url_template: https://<host>/api/v2/tables/<TABLE_ID>/records
allowed_hosts: [mesmo]
headers: {"Accept": "application/json"}
credential_ref: "nocodb-base-ana-token"
input_schema: {
  "id": {"type": "string", "required": true,
         "description": "O Id devolvido por registrar_ouvidoria nesta mesma conversa"}
}
query: {"where": "(Id,eq,{{id}})", "fields": "Protocolo", "limit": "1"}
retorno esperado: {"list": [{"Protocolo": "2026-0012"}]}
```

Na fase 5, as duas viram uma: `POST /ouvidoria/manifestacoes` no proxy fino, que insere, relê e devolve `{"protocolo": "2026-0012"}` numa chamada só. O token do NocoDB sai do vault e passa a viver no ambiente do proxy, e a plataforma deixa de falar autenticada com o banco.

## Decisões autônomas a revisar pelo Pedro

1. **O `NNNN` não reinicia por ano** (`2027-0043` depois de 42 registros em 2026). Trocar isso custa uma tabela de contadores e a corrida de volta.
2. **A tabela não guarda nome nem CPF**, ao contrário da `6_Ouvidoria_Log` do Sheets. Se a equipe da ouvidoria precisar identificar sem abrir o Chatwoot, isso muda o desenho e reabre a discussão de sigilo.
3. **Duas ferramentas encadeadas** (gravar e depois ler o número) enquanto o proxy não existe. Alternativa era esperar o proxy do P5, o que empurraria a ouvidoria para depois da agenda.
4. **Colunas além do mínimo pedido:** `Categoria` e `Setor` entraram porque o prompt já infere os dois e eles são o que a ouvidoria usa para rotear, sem identificar ninguém.
5. **`Prazo_Resposta` em dias corridos (7)** como aproximação dos 5 dias úteis. É indicador de painel, não promessa.

## Consequências

- A promessa de protocolo do script sai do limbo: hoje o prompt promete um número que nenhuma ferramenta produz. Até a fase 4 rodar, o comportamento correto continua sendo **não citar protocolo**.
- A Base Ana deixa de ser exclusivamente pública. Passa a existir uma tabela que só é acessível com token, e o token de API do NocoDB é amplo (alcança a base inteira, inclusive as quatro tabelas de valores). Mitigação: `allowed_hosts` restrito, `risk_tier` correto e a migração para o proxy na fase 5, que tira o segredo da plataforma.
- O prazo de 5 dias úteis volta a ser auditável. Com `Status` e `Prazo_Resposta` na tabela, dá para ver manifestação vencida sem abrir conversa nenhuma, o que o alerta D+4 do n8n fazia e ninguém substituiu.
- A tabela é o embrião do painel da ouvidoria para o hospital, na mesma tela de planilha que o negócio já usa para editar valores. Nenhuma ferramenta nova entra na vida do usuário.
- Nada foi criado na plataforma fazer.ai nesta sessão: nem tool, nem credencial, nem mudança de prompt.
