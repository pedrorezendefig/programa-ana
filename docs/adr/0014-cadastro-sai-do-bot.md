---
status: accepted
date: 2026-08-12
---

# Cadastro de paciente sai do bot: nome + CPF é o único bloco cadastral da conversa

Decisão do Pedro (12/ago/2026, sessão de grilling sobre os achados da bateria E2E v2): a Ana **deixa de cadastrar paciente** no sistema de agendamento (Global Health). Em toda a conversa, o único bloco de dados que ela pede é **nome completo + CPF**. Data de nascimento e telefone não são perguntados em nenhum fluxo: o telefone a equipe já tem pelo próprio WhatsApp, e o cadastro completo passa a ser feito pela equipe humana no momento de confirmar o agendamento.

## Contexto

- A V14 tinha entregue a primeira escrita do bot na GH: a tool `cadastrar_paciente` (POST /pessoas, homolog), acionada quando `buscar_paciente_por_cpf` voltava vazia (PASSO 3.6 do prompt até a v6.2). O contrato da GH exige os quatro campos: nome, cpf, telefone e dataNascimento, todos obrigatórios.
- Na bateria v2 (12/ago, conversa 56 do Chatwoot), o caminho funcionou tecnicamente (GH id 1697 criado), mas a conversa ficou burocrática: pergunta de nascimento e telefone, resumo de confirmação e a corrida de chunks que gerou a falsa "dupla confirmação". O Pedro julgou a experiência ruim para um lead quente: dado demais, atrito demais, cara de formulário.
- Alternativa estudada: puxar o telefone do webhook. A pesquisa no código-fonte da 1.4.1 (concluída horas depois da decisão; `ana/plataforma/pesquisa-contact-phone-http-tools.md`) provou que a via EXISTE e é confiável: `{{contact_phone}}` no body/campo fixo de HTTP tool é injetado server-side a partir do espelho do webhook (lista fechada de 10 variáveis; formato E.164 com `+`; nome fora da lista vira string vazia em silêncio, e o playground nunca tem contexto de contato, o que explica os nulos vistos). Ou seja: o telefone era resolvível sem perguntar. A decisão se sustenta pelos outros dois pilares: a **data de nascimento** não tem webhook que resolva (continuaria custando pergunta e confirmação), e a experiência de formulário no lead quente foi o incômodo central do Pedro.

## Decisão

1. O prompt (v6.3) remove o PASSO 3.6 e toda menção a cadastro, nascimento e telefone. O Princípio de Coleta vira: pedir nome+CPF (uma mensagem), validar, rodar `buscar_paciente_por_cpf` internamente e, se vazia, apenas anotar "paciente sem cadastro no sistema" no resumo interno da escalada.
2. O grant da tool `cadastrar_paciente` (id 7) sai do agente 1. A definição da tool fica guardada na plataforma, desabilitada de uso pelo agente.
3. A equipe humana cadastra o paciente na GH/MV ao confirmar o agendamento, com os dados que o processo dela exigir.

## Volta planejada

O cadastro pelo bot **volta junto com a finalização de agendamento** (P6, seção 2.5 gated do bloco particular): quando GH-19 (massa do catálogo) e GH-18 (prova no banco) destravarem e o bot passar a gravar agendamento de verdade, o cadastro de paciente novo volta a ser pré-condição executável pelo bot (re-granting da tool 7 e reintrodução do passo no prompt). Na volta, o telefone deve vir automático via `{{contact_phone}}` como campo fixo do body (sem o modelo no meio, ver pesquisa citada acima; atenção ao formato E.164 com `+`, a GH quer só dígitos com DDD, transformação a resolver na fachada), restando ao paciente apenas a data de nascimento. Este ADR não descarta a V14: suspende o uso dela no fluxo conversacional até o fluxo ter valor de ponta a ponta.

## Consequências

- Conversa mais curta e humana no caminho quente do particular (preço → nome+CPF → agenda → equipe), sem coleta de dado que o bot não usa hoje para nada além do POST.
- O resumo interno da escalada ganha o campo "tem/não tem cadastro" como informação de trabalho para a equipe.
- O cadastro de teste GH id 1697 (TESTE GOLF HOTEL) permanece na homolog como sonda de busca positiva.
- Riscos aceitos: a equipe faz um passo a mais por lead novo; se o volume crescer antes de P6, a decisão volta à mesa com números.
