# Roteiro de integração: Base Ana no Hospital Reuniões

> **O que valida:** a cadeia inteira que o ADR-0015 criou, nas duas direções.
> **Ida (leitura):** alguém do hospital edita um valor na área admin do app → Postgres → `GET /api/ana/*` → tool HTTP → modelo → a resposta que o paciente lê no WhatsApp.
> **Volta (escrita):** o paciente relata uma queixa → a Ana grava pela API → o protocolo ANO-NNNN existe no banco → a manifestação aparece no painel de ouvidoria do hospital.
>
> Os roteiros de cenários v1 a v3 validam **o que a Ana fala** (o SOP). Este valida **de onde vem o que ela fala** (a fonte do dado). São complementares: uma mudança de prompt roda o v3; uma mudança de fonte, endpoint ou tool roda este.
>
> **Como rodar:** três níveis, do mais barato ao mais caro. O nível 1 é pré-requisito dos outros dois: se ele reprova, não adianta conversar com a Ana.
>
> | Nível | O que prova | Como | Custo |
> |---|---|---|---|
> | 1. Contrato | a API responde, o formato bate e **cabe** no que o modelo lê | `python3 ana/api-hospital/scripts/smoke-hospital.py` | segundos, automático |
> | 2. Espelho | a edição humana no app chega na fala da Ana | edição manual no admin + playground | minutos, semi-manual |
> | 3. Conversa | os cenários abaixo, ponta a ponta no canal real | bateria E2E pela inbox de API | minutos, automático |
>
> **Veredito:** as famílias A (espelho) e D (ouvidoria) são bloqueantes: são a razão de existir da migração. A família C (cobertura) é bloqueante por tabela: enquanto a tabela não couber no teto, a tool dela não vira. Falha em B ou E vira item de ajuste.

---

## O teto de 4.000 caracteres (leia antes de escrever cenário novo)

O runtime do fazer.ai agents corta o corpo de resposta de **toda** HTTP tool em 4.000 caracteres antes de entregar ao modelo (`maxResponseChars`, default fixo em `src/graph/tools/http.ts` da 1.4.1; não é configurável na instância). O que passa do teto o modelo **não vê**: ele afirma que o item não existe, ou repete a chamada em loop até desistir.

Isso derrubou a Pediatria e a Urologia na virada da tool 1 (V21) e é o motivo de a família C existir. **Regra para todo cenário novo: pergunte pelo primeiro E pelo último item da tabela** (na ordem em que a API devolve). Perguntar só pelo começo da lista é o erro que deixou o bug passar por três baterias.

Estado medido em 17/ago/2026 (`smoke-hospital.py`):

| Tabela | chars | itens | cabe? |
|---|---|---|---|
| cirurgias-estimativas | 3.269 | 3 | sim (folga de 731) |
| convenios-especialidade | 4.730 | 20 | não: perde Unimed/Obstetrícia, Ortopedia e Pediatria |
| consultas-particulares | 5.410 | 9 | não: perde Pediatria e Urologia |
| exames | 7.418 | 10 | não: perde MAPA 24h, Raio-X, Tomografia e Ultrassonografia Abdominal |

---

## Família A: espelho da edição (bloqueante)

O que a migração promete ao hospital: *"edito na minha tela e a Ana passa a falar isso"*. Cada cenário tem três medições: **antes** (API + Ana), **edição** (humana, no admin), **depois** (API + Ana), e termina revertendo.

### A1. Valor alterado vale na conversa seguinte
- **Antes:** pergunte no playground "quanto custa a consulta de cardiologia?" e anote o valor.
- **Edite:** no admin do app, mude o valor de Cardiologia (ex.: 380 → 395).
- **Esperado:** `GET /api/ana/consultas-particulares` já devolve `395.0` na chamada seguinte (sem redeploy, sem esperar cache); a Ana, perguntada de novo, responde R$ 395,00 numa conversa nova.
- **Falha se:** a API demorar a refletir, a Ana responder o valor velho, ou responder o novo em formato errado (ver B1).
- **Reverta** e confirme que a Ana volta ao valor original.

### A2. Especialidade desativada some da oferta
- **Edite:** desative uma especialidade ativa no admin (ex.: Dermatologia).
- **Esperado:** ela some da resposta da API (o filtro é server-side); a Ana não a oferta e não inventa valor: cai na Regra Global 13 e encaminha ao humano.
- **Falha se:** a Ana citar valor de especialidade inativa, ou afirmar que o hospital não atende quando a especialidade só saiu do particular.
- **Precedente:** Ginecologia (inativa) já é o caso permanente, validado na V21.

### A3. Texto novo aparece na fala
- **Edite:** troque o `diferencial_1` de uma especialidade por uma frase reconhecível.
- **Esperado:** na hesitação do paciente ("achei caro"), a Ana usa a frase nova.
- **Falha se:** repetir o diferencial antigo (sinal de cache em algum ponto da cadeia).

### A4. Item novo nasce e é ofertado
- **Edite:** cadastre um exame novo no admin (ex.: "TESTE INTEGRACAO ANA").
- **Esperado:** a Ana passa a informá-lo quando perguntada pelo nome exato.
- **Falha se:** o item novo não aparecer na API, ou aparecer e a Ana não enxergar (verifique o teto: item novo empurra o fim da lista para fora).
- **Limpe** o item de teste ao final.

---

## Família B: fidelidade do formato (a Ana não distorce o dado)

A migração trocou os tipos: `"R$ 380,00"` virou `380.0`, `"S"/"N"` virou booleano, `10/03/2026` virou `2026-03-10`.

### B1. Número vira moeda brasileira
- **Envie:** "quanto custa a consulta de cardiologia?"
- **Esperado:** "R$ 380,00" (ou "R$ 380"), nunca "R$ 380.0", "380 reais" ou "R$ 380,00 reais".
- **Falha se:** vazar o formato do JSON na fala.

### B2. Booleano não vira fala estranha
- **Envie:** pergunta de preço de especialidade com `alta_demanda: true`.
- **Esperado:** no máximo um senso de urgência natural ("as agendas costumam encher rápido"); o campo é insumo interno.
- **Falha se:** a Ana disser "alta demanda: verdadeiro" ou algo com cara de campo de banco.

### B3. Preparo de exame sai literal
- **Envie:** "qual o preparo da colonoscopia?"
- **Esperado:** as instruções da tabela, sem inventar item nem omitir passo.
- **Falha se:** resumir a ponto de perder uma instrução clínica.

---

## Família C: cobertura da tabela inteira (bloqueante por tabela)

O cenário que teria pego o bug da V21 antes de ele existir.

### C1. Primeiro e último item de cada tabela
- **Envie**, em conversas separadas, uma pergunta pelo **primeiro** e outra pelo **último** item de cada tabela virada (a ordem é a que a API devolve; `smoke-hospital.py` lista quem está fora do teto).
- **Esperado:** as duas respondidas com o dado correto.
- **Falha se:** a Ana disser que não encontrou, ou chamar a tool várias vezes seguidas sem responder (assinatura clássica do truncamento).
- Hoje: Pediatria e Urologia (consultas), Raio-X e Tomografia (exames) e Unimed/Pediatria (convênios) são os alvos que reprovam.

### C2. Pergunta de catálogo ("o que vocês atendem?")
- **Envie:** "quais especialidades vocês atendem particular?"
- **Esperado:** a lista completa das ativas.
- **Falha se:** faltar qualquer especialidade ativa (o teto corta o fim da lista, e a Ana não sabe que foi cortada).

---

## Família D: ouvidoria, a direção da escrita (bloqueante)

### D1. Manifestação registrada chega ao painel do hospital
- **Envie:** o fluxo de reclamação do cenário 19 do roteiro v3.
- **Esperado:** `registrar_ouvidoria` e `consultar_protocolo_ouvidoria` no trace; o número ANO-NNNN dito ao paciente; e a manifestação **visível no painel de ouvidoria do app**, com o mesmo número.
- **Falha se:** o protocolo dito ao paciente não existir no painel, ou o painel mostrar um número diferente.

### D2. Continuidade da numeração
- **Esperado:** o primeiro protocolo gerado no Postgres continua do último número usado no NocoDB, sem reiniciar e sem repetir (a sequence nasce do último; ADR-0015).
- **Falha se:** a numeração voltar para 0001 tendo protocolos anteriores informados a pacientes.

### D3. Índice, não dossiê
- **Esperado:** o registro no app não tem nome, CPF, telefone nem dado clínico; a identificação vive só na conversa do Chatwoot, ligada por `Conversa_Id`.
- **Falha se:** qualquer dado pessoal aparecer no painel.
- **Atenção:** `{{conversation_id}}` não interpolava no body na 1.4.1 (achado da V19, report V10). Confirme se o `Conversa_Id` chega preenchido na conversa real; se chegar nulo, o elo entre índice e dossiê se perde.

---

## Família E: robustez (a Regra Híbrida com fonte nova)

### E1. API indisponível não vira invenção
- **Provoque:** remova a credencial da tool no console (ou aponte para um path inexistente) e pergunte um preço.
- **Esperado:** a Ana diz que não conseguiu consultar e encaminha ao humano, sem citar valor nenhum.
- **Falha se:** inventar valor, ou responder de memória um valor que viu antes na conversa.
- **Precedente:** provado com 401 real na V21; restaure a credencial logo em seguida.

### E2. Item inexistente cai na Regra Global 13
- **Envie:** "quanto custa a consulta de reumatologia?" (não está na tabela).
- **Esperado:** não afirma nem nega de memória; encaminha para confirmação humana.
- **Falha se:** afirmar que o hospital não atende (a tabela é de particular, não é o catálogo do hospital inteiro).

### E3. Chave rotacionada
- **Esperado:** trocar o segredo no vault (mesmo nome de entrada) faz a Ana voltar a funcionar sem tocar na definição da tool.
- **Falha se:** exigir editar a tool (sinal de que o segredo está preso à definição, e não à referência do vault).

---

## Registro do resultado

Cada rodada anota, por cenário: **passou / falhou / não rodado**, a data, a versão do prompt no ar e o veredito do `smoke-hospital.py` do dia. Falha bloqueante volta para ajuste antes de qualquer virada de tool nova. O resultado consolidado vira ficha da tarefa no `roadmap/TODO.md` e no `os/dados/roadmap.json`, como manda a regra da casa.
