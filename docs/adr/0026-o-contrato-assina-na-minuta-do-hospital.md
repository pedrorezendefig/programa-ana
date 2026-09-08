---
status: accepted
date: 2026-08-31
---

# O contrato assina na minuta do hospital, com SLA enxuto e reajuste pelo IPCA

Decisão do Pedro (31/ago/2026, sessão de grilling sobre o retorno do jurídico): a VITTA TECH aceita negociar sobre a minuta reescrita pelo jurídico do Hospital São Matheus, em vez de insistir no texto próprio. A resposta preenche os dois campos em amarelo (reajuste e SLA) e pede exatamente duas correções de mérito. O texto de `contrato/fonte/` deixa de ser o documento que vai a assinatura e vira material de leitura e histórico.

## Contexto

- Em 02/jul/2026 o Felipe enviou a minuta da VITTA TECH ao hospital e se declarou em conflito de interesse, pedindo que a condução ficasse com a administração (Josiane), sem participação dele.
- Em 13/07/2026 o jurídico (Ana Camelo) devolveu o contrato **reescrito no modelo padrão do hospital**, com o contratante identificado: AMA Assistência Médica Alternativa Ltda - EPP, representada pelo Lauro Menezes Lima. A cadeia chegou ao Pedro em 27/ago, via encaminhamento do Felipe.
- O coração da minuta da VITTA TECH sobreviveu intacto: tabela modular de preços (R$ 5.000 / 6.000 / 8.000 / 9.000 com Termo de Entregável), propriedade intelectual com licença perpétua pós-término e entrega de código-fonte, LGPD com o hospital como Controladora, Anexos I e II, prazo indeterminado com aviso de 30 dias, foro RJ.
- O jurídico marcou em amarelo dois campos para preencher: o índice de reajuste (Cláusula 3ª, §4º) e os prazos de resposta e solução por gravidade de falha, com multa de abatimento (Cláusula 6ª, nova).
- A reescrita trouxe três sobras do modelo padrão, sem destaque: a Cláusula 2ª diz que o serviço é **presencial em horário comercial** (e chama o contrato de "aditivo"), contradizendo a própria Cláusula 1ª ("continuada e remota"); a Cláusula 12ª, §4º permite **rescisão imediata por descumprimento de qualquer cláusula**, sem prazo de cura, contradizendo o §2º da mesma cláusula; e a Cláusula 11ª tem parágrafos de contrato presencial (limpeza do local, circulação no hospital).

## Decisão

1. **Negociar sobre a minuta deles.** Brigar por formato custa semanas e o conteúdo essencial sobreviveu. O go-live pede contrato assinado logo.
2. **Reajuste: IPCA (IBGE), anual**, a contar da assinatura. Padrão de mercado, fácil de aceitar.
3. **SLA enxuto, do tamanho de uma operação de uma pessoa:** Grave: resposta em 4 horas úteis, solução em 48 horas corridas; Média: resposta em 1 dia útil, solução em 5 dias úteis; Leve: resposta em 2 dias úteis, solução em 15 dias úteis. Horário útil: segunda a sexta, 9h às 18h.
4. **Multa: 5% de abatimento por descumprimento, com teto de 10% da mensalidade no mês**, e pedido de que o abatimento seja a única penalidade pelo atraso (no lugar de "sem prejuízo de outras sanções").
5. **Duas correções de mérito, e só elas:** a Cláusula 2ª volta a dizer prestação **remota e continuada** (reuniões presenciais quando acordadas), e a rescisão imediata da 12ª, §4º passa a exigir notificação por escrito e 15 dias para sanar.
6. **As sobras da Cláusula 11ª ficam.** Limpeza de local e circulação no hospital não obrigam a VITTA TECH a nada que ela vá fazer; pedir a remoção só alonga a rodada.
7. A resposta vai por e-mail do Pedro à Josiane, com o jurídico em cópia, sem passar pelo Felipe (conflito de interesse declarado por ele mesmo).

## Considered options

- **Exigir a volta da minuta da VITTA TECH:** rejeitado. O formato é do hospital, o conteúdo é nosso; a briga seria por vaidade e custaria a data do go-live.
- **SLA de mercado (resposta em 1 hora, solução em 24 horas):** rejeitado. Prazo assinado vira multa; uma pessoa só não sustenta esse número em férias, viagem ou doença.
- **Aceitar tudo e só preencher os amarelos:** rejeitado. Assinar obrigação de trabalho presencial e rescisão imediata sem prazo de cura é risco real, não detalhe.
- **Pedir a limpeza completa da Cláusula 11ª:** rejeitado por ora. Cada item a mais é uma rodada a mais com o jurídico; os parágrafos não mordem.

## Consequências

- O SLA deixa de ser informal: estourar 48 horas numa falha grave passa a custar dinheiro. O monitoramento da Ana e do aplicativo ganha um motivo contratual, não só técnico.
- `contrato/fonte/CONTRATO-servicos-continuos.md` e o site publicado na Vercel continuam existindo como versão de leitura, mas quem vale é o documento do hospital. Mudança futura de escopo se negocia sobre a minuta deles.
- O marco do KPI da Ana segue "[a ser definido entre as Partes]" no contrato, como na nossa minuta; a definição fica para o Termo de Entregável correspondente.
- Se o jurídico recusar alguma das duas correções, a decisão volta ao Pedro; nenhuma das duas é cosmética.
