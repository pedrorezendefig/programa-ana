<!--
PR template preenchido automaticamente pelo /ship a partir da Issue vinculada (gh issue view).
Pode editar manualmente. No modelo Pocock o contexto vive na Issue, não em chronicle/plano.
-->

## 💬 Valor entregue

<!--
Um parágrafo de 1 a 3 frases sobre o que a issue entrega para o paciente que conversa com a Ana ou
para quem opera o programa, escrito como quem explica ao diretor do hospital, que não é dev. Sem jargão
(sem endpoint, branch, componente, PR). Escreva a partir da issue e passe pelo humanizer antes de abrir o PR.
Exemplo: a Ana passa a dizer o preço da consulta particular de cardiologia direto da tabela oficial,
sem mandar o paciente ligar para a recepção.
-->

**O que muda:** <1 a 3 frases, na linguagem do diretor do hospital>

## 🎯 Contexto

<!-- Por que esta mudança importa para o paciente, para o hospital e para a operação da Ana. Vem do corpo da Issue. -->

## ✅ Critérios de aceite

<!-- Copiados da seção "Critérios de aceite" da Issue. Marcados conforme foram entregues (viram os testes do /tdd). -->

- [ ] critério 1
- [ ] critério 2

## 📊 Mudanças

<!--
Preenchido automaticamente por `/snapshot --diff <base>..HEAD`. Mostra o delta em rotas,
entidades, migrations e integrações. Se nada relevante mudou no snapshot, vem "_sem mudanças_".
-->

_gerado por `/snapshot --diff`_

## 🔎 Evidência

<!--
Antes e depois, nunca só "testes verdes". O teste exato que falhava e agora passa (nome e assert, em
pseudocódigo), a saída de comando que mudou, ou print quando a mudança é visual. PR de ferramenta: a
saída do script ou do comando antes e depois.
-->

- **Antes:**
- **Depois:**

## ⚠️ Perigo do merge

<!--
Porta de uma via (reverter o commit não desfaz): envio externo (WhatsApp, Chatwoot, Global Health),
escrita em dado de produção, mudança no prompt da Ana que vai para a plataforma fazer.ai, mudança em
.github/ ou nas skills da subida (ship, onda-enxuta, agentes ana-*). O resto é porta de duas vias:
um revert desfaz. Produção do Oracle e da Global Health nunca é chamada.
Raio: quem sente se der errado (o paciente no WhatsApp, a bancada, o Retrato, o próprio fluxo).
-->

**Porta:** <uma via | duas vias>, porque <motivo em uma linha>

**Raio:** <uma palavra ou expressão curta>

## 🔗 Links

- Issue: #N
- Snapshot atual: [`docs/spec/snapshots/`](./docs/spec/snapshots/)

## 🤖 Gates (ADR 0068)

- [ ] Ferramenta (nada em `ana/`): CI verde
- [ ] App: `ana-revisor` uma vez (com `Sensível:` se o `sensivel.py` acusar arquivo da lista `revisao-sensivel.txt`) e CI verde

## Closes

<!-- Closes #N (vincula e fecha a Issue do GitHub no merge) -->
