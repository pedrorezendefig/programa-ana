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
> | 1.5. Divergímetro | a fonte nova e o NocoDB dizem a mesma coisa (a paridade que a V26 pede) | `python3 ana/bancada/divergimetro.py` | segundos, automático |
> | 2. Espelho | a edição humana no app chega na fala da Ana | edição manual no admin + playground | minutos, semi-manual |
> | 3. Conversa | os cenários abaixo, ponta a ponta no canal real | `python3 ana/bancada/e2e.py cenarios/integracao.json` | minutos, automático |
>
> **Veredito:** as famílias A (espelho) e D (ouvidoria) são bloqueantes: são a razão de existir da migração. A família C (cobertura) é bloqueante por tabela: enquanto a tabela não couber no teto, a tool dela não vira. Falha em B ou E vira item de ajuste.

---

## O teto de 4.000 caracteres (leia antes de escrever cenário novo)

O runtime do fazer.ai agents corta o corpo de resposta de **toda** HTTP tool em 4.000 caracteres antes de entregar ao modelo (`maxResponseChars`, default fixo em `src/graph/tools/http.ts` da 1.4.1; não é configurável na instância). O que passa do teto o modelo **não vê**: ele afirma que o item não existe, ou repete a chamada em loop até desistir.

Isso derrubou a Pediatria e a Urologia na virada da tool 1 (V21) e é o motivo de a família C existir. **Regra para todo cenário novo: pergunte pelo primeiro E pelo último item da tabela** (na ordem em que a API devolve). Perguntar só pelo começo da lista é o erro que deixou o bug passar por três baterias.

Estado medido em 18/ago/2026, noite (`smoke-hospital.py`):

| Tabela | chars | itens | cabe? |
|---|---|---|---|
| cirurgias-estimativas | 3.269 | 3 | sim (folga de 731) |
| convenios-especialidade | 4.730 | 20 | não: perde Unimed/Obstetrícia, Ortopedia e Pediatria |
| consultas-particulares | 5.959 | 10 | não: perde Ortopedia, Pediatria e Urologia |
| exames | 7.418 | 10 | não: perde MAPA 24h, Raio-X, Tomografia e Ultrassonografia Abdominal |

As consultas pioraram de 17 para 18/ago (de 2 para 3 invisíveis) só porque a Ginecologia foi
ativada no app. Ninguém mexeu na Ana. **É a demonstração mais limpa do problema: uma decisão
de negócio numa tela de admin muda, sem aviso, quais outros itens a Ana consegue enxergar.**

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
- **Precedente:** validado na V21 com a Ginecologia inativa. **Desde 18/ago/2026 a Ginecologia está ativa** (decisão do Pedro: o hospital passa a ofertá-la em particular), então não há mais caso permanente de especialidade inativa: o A2 precisa desativar uma na hora, como a rodada 1 fez com a Dermatologia.

### A3. Texto novo aparece na fala
- **Edite:** troque o `diferencial_1` de uma especialidade por uma frase reconhecível.
- **Esperado:** na hesitação do paciente ("achei caro"), a Ana usa a frase nova.
- **Falha se:** repetir o diferencial antigo (sinal de cache em algum ponto da cadeia).

### A4. Item novo nasce e é ofertado
- **Edite:** cadastre uma **especialidade** nova no admin (ex.: "AAA TESTE INTEGRACAO ANA"). Não use exame: os exames ainda leem o NocoDB, então criar exame no app não prova nada até a V23.
- **Batize o item para o começo da lista.** A API ordena por nome, e só o começo cabe no teto. Item de teste com nome do fim da lista reprova pelo teto, não pelo espelho: mede a coisa errada.
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

### D4. Gravação quebrada não vira número inventado
- **Monte:** aponte a tool 11 `registrar_ouvidoria` para uma rota inexistente da mesma API (404), e **restaure logo depois**.
- **Envie:** um fluxo de reclamação completo, até "pode registrar".
- **Esperado:** a mensagem de acolhimento sem protocolo nenhum; nenhuma linha nova no painel.
- **Falha se:** citar qualquer número, inclusive no condicional.
- Veio do runner da V24, consolidado na bancada em 18/ago/2026.

### D5. Paciente volta com o número
- **Envie:** "registrei uma reclamação com vocês, o protocolo é ANO-NNNN, tem novidade?", com um protocolo que exista.
- **Esperado:** a Seção 7.5: a Ana confirma que encontrou e informa **o número, a data de abertura e o prazo de resposta**, e então escala. Nunca lê o `status` nem o `resumo`.
- **Falha se:** ler o status ("sua manifestação já foi respondida" a quem nunca recebeu retorno é dano grave), repetir o teor do relato, ou **encontrar e não informar data e prazo** (o paciente sai sem saber quando esperar retorno).
- Veio do runner da V24, consolidado na bancada em 18/ago/2026.

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

### Rodada 1: 18/ago/2026 (prompt v6.3.2, só a tool 1 na API)

Primeira prova do espelho, com o Pedro editando no app e a sessão medindo as três camadas.

| Cenário | Veredito | Evidência |
|---|---|---|
| A1 valor alterado | **passou** | Cardiologia 380 → 395 no admin: a API devolveu `395.0` na chamada seguinte, `ultima_atualizacao` carimbou `2026-08-18` (hoje em BRT, com o container em UTC) e a Ana passou a responder "R$ 395" numa conversa nova. Revertido para 380 e reconferido. |
| A2 especialidade desativada | **passou** | Dermatologia desativada: sumiu da API (8 ativas) e a Ana respondeu "não tenho o preço da consulta de Dermatologia na nossa tabela oficial. Quer que eu encaminhe para a equipe confirmar?", sem inventar valor e **sem afirmar que o hospital não atende** (a distinção que o E2 exige). Reativada em seguida. |
| B1 formato do número | **passou** | `395.0` virou "R$ 395" na fala, sem vazar o formato do JSON. |
| A3, A4 | não rodados | ficam para a rodada da V25. |
| C, D, E | não rodados | C e E dependem das tools 2-4 (V23); D depende da ouvidoria virada (V24). |

**Achado da rodada (registra o quanto o teto é frágil):** com a Dermatologia desativada, a resposta caiu de 5.410 para 4.848 chars e a **Pediatria voltou a ser visível** ao modelo, sobrando só a Urologia fora. Ou seja, desativar um item no app **muda quais outros itens a Ana enxerga**, sem ninguém perceber. Reforça que a V22 (filtro server-side) é pré-requisito, não melhoria.

**Ponto de atenção, não bloqueante:** nas duas perguntas por item ausente a Ana chamou `consultar_precos_consultas` de 2 a 5 vezes no mesmo turno antes de responder. Ela conclui certo, mas o padrão de re-chamada é o mesmo sintoma do truncamento; vale reavaliar depois da V22, quando a resposta couber inteira.

### Rodada 2: 18/ago/2026, noite (prompt sha `2d0fc436`, tool 1 e tools 11-12 na API)

Primeira bateria do runner versionado (`ana/bancada/e2e.py`, nasce nesta rodada). Chão medido
no momento da bateria: `smoke-hospital.py` reprovando 3 tabelas, prompt no ar byte a byte igual
à fonte `ana/prompt/` (53.251 chars, sha `2d0fc436`), tool 1 em `api.hospitalsaomatheus.cloud`,
tools 11 e 12 já na API (trabalho da V24, em sessão paralela).

| Cenário | Veredito | Evidência |
|---|---|---|
| A3 texto novo | **passou** | `diferencial_1` da Cardiologia trocado por "Resultado do eletrocardiograma no mesmo dia da consulta"; na hesitação a Ana disse "aqui o eletrocardiograma sai no mesmo dia da consulta". Revertido. |
| A4 item novo | **passou** | especialidade "AAA TESTE INTEGRACAO ANA" (R$ 1,00) criada no admin e ofertada pela Ana na conversa seguinte, sem redeploy. Removida ao final. |
| B1 formato do número | **passou** | "R$ 380", sem vazar o formato do JSON. |
| B2 booleano | **passou** | com `alta_demanda: true`, disse "Cardiologia costuma ter alta demanda, então às vezes há poucas vagas": urgência natural, sem cara de campo de banco. |
| B3 preparo de exame | não rodado | exames ainda no NocoDB (V23). |
| C1a primeiro item | **passou** | Cardiologia certa, com **1** chamada da tool. |
| **C1b último item** | **falhou** | Urologia invisível. A Ana disse "não tenho o valor da consulta de Urologia na nossa tabela" e chamou `consultar_precos_consultas` **10 vezes no mesmo turno**. Primeira vez que a assinatura do truncamento virou número medido, não impressão. |
| **C2 catálogo** | **falhou** | listou **7 de 10** ativas: faltaram Ortopedia, Pediatria e Urologia, e a Ana afirmou a lista com confiança, sem saber que foi cortada. 7 chamadas da tool no turno. |
| D1 manifestação registrada | **passou** | protocolo **2026-0005** dito ao paciente e presente no Postgres via `GET /ouvidoria/protocolos/2026-0005`; `registrar_ouvidoria` **uma** vez no trace, tag `ouvidoria` aplicada, e a nota `PROTOCOLO 2026-0005` gravada no Chatwoot (o PASSO R3 novo da V24). |
| D2 continuidade da numeração | **passou** | NocoDB termina em 2026-0003; o Postgres tem 0004 e 0005 e não tem 0001 a 0003. A sequence continuou do último, sem reiniciar e sem repetir. |
| D3 índice, não dossiê | **passou, com ressalva** | o registro tem só categoria, setor, resumo, datas e status: **nenhum nome, CPF ou dado clínico**. O dossiê ficou na nota privada do Chatwoot. Ressalva: `conversa_id` chegou **vazio** (o bug de interpolação da 1.4.1 persiste); a ponte painel a conversa hoje é buscar o número do protocolo no Chatwoot, pela nota do PASSO R3. |
| E2 item inexistente | **passou** | Reumatologia: "não encontrei o valor... quer que eu encaminhe para a equipe confirmar?", sem afirmar que o hospital não atende. |
| E1, E3 | não rodados | mexem no `vault:6`, que serve as tools 1, 11 e 12 ao mesmo tempo: quebrar a credencial derrubaria as sessões paralelas da V22 e da V24. Ficam para uma janela em que a Ana esteja parada. |

**Placar: 9 passaram, 3 falharam, 4 não rodados.** As duas falhas são a mesma causa (o teto de
4.000 chars) e as duas famílias bloqueantes fecharam verdes: **A completa (A1 a A4)** e
**D completa (D1 a D3)**.

**Divergímetro (nível 1.5, nasce nesta rodada):** **zero divergência de conteúdo** entre a API
do app e o NocoDB nas quatro tabelas. As 16 diferenças encontradas são todas travessão virando
vírgula em texto livre. É a paridade registro a registro que a issue #293 do Hospital pede para
o cutover da V26.

**Achado 1, o que a família C mede de verdade.** A C1b deu o primeiro número duro do
truncamento: **10 chamadas da mesma tool num turno**. E a C2 mostrou o caso mais perigoso: a
Ana não erra visivelmente, ela **responde uma lista incompleta com confiança**. Um paciente de
Pediatria ouve "atendemos particular em Cardiologia, Cirurgia Geral, Dermatologia, Ginecologia,
Neurologia, Obstetrícia e Oftalmologia" e vai embora. Não há sinal de erro em lugar nenhum.

**Achado 2, a tela do admin promete o que não cumpre em 3 das 4 abas.** O topo do
`/admin/dados-atendimento` diz *"Editou, valeu: a resposta seguinte já usa o dado novo"*. Isso
só é verdade em Consultas particulares. Em Exames, Estimativas de cirurgias e Convênios por
especialidade, a Ana ainda lê o NocoDB: quem editar ali sai achando que resolveu, e a Ana segue
falando o dado velho. Enquanto a V23 não entra, a tela é uma armadilha ligada em produção. O
divergímetro passa a medir esse buraco a cada rodada.

**Achado 3, os protocolos velhos ficaram para trás.** `GET /ouvidoria/protocolos/2026-0001` a
`0003` devolvem 404: eles vivem só no NocoDB. A tool 12 já aponta para a API, então um paciente
que volte citando um desses três ouve "não consegui localizar esse número". Risco baixo (os três
são testes de 12/ago, nenhum foi informado a paciente real), mas é item de checklist do cutover
da V26: migrar as linhas antigas ou aceitar a perda por escrito.

**Achado 4, a Seção 7.5 encontra e não conta.** A D5 é a única falha da rodada que não vem do
teto de caracteres. A consulta funciona ponta a ponta e a Ana confirma que achou, mas engole o
número, a data de abertura e o prazo. O paciente sai sabendo menos do que quando entrou. A
proteção que mais importava segurou (ela não leu o `status`), então é ajuste de redação da
Seção 7.5, não defeito da migração. Volta para a linha da V24.

**Consolidação dos runners (18/ago/2026).** A V24, em sessão paralela, versionou um segundo
runner em `ana/testes/`. Os dois viraram um só em `ana/bancada/`, que é o que tem coleta de
trace: sem ela a família C não teria número nenhum. Os cenários de ouvidoria da V24 que a
bancada não cobria foram portados e viraram o **D4** e o **D5** deste roteiro.

**Ponto de atenção da rodada 1 revisitado.** As re-chamadas de tool continuam: 10 na C1b, 7 na
C2, 6 na E2. Nos cenários em que a resposta cabe (C1a, B1, B2, A3, A4), a tool é chamada **uma
vez só**. Isso fecha o diagnóstico: a re-chamada não é manha do modelo, é ele procurando o que
o teto escondeu. A V22 resolve as duas coisas de uma vez.
