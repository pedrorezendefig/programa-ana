---
status: accepted
date: 2026-08-26
---

# A versão do Chatwoot é decisão do programa, não detalhe de infra

Decisão do Pedro (26/ago/2026, sessão de grilling sobre as notas de versão da fazer.ai): a versão do Chatwoot que a Ana usa deixa de ser um número que alguém escolheu uma vez no onboarding e passa a ser um **fato rastreado do programa**. O atraso é medido ao vivo, a leitura das versões novas tem lente fixa e cai no `/check`, e subir de versão é **pré-requisito declarado** da Ana entrar num número de WhatsApp real.

## Contexto

- A Ana conversa **através** do Chatwoot. O canal, as tags, a etapa do kanban e o handoff para gente são todos do Chatwoot; a plataforma fazer.ai agents é o cérebro, mas a boca e os ouvidos são de lá. Um defeito no Chatwoot aparece como defeito da Ana.
- A instância roda `4.16.0-fazer-ai-pro.111`, escolhida no onboarding de **29/jul/2026** e nunca mais tocada. Em 26/ago/2026 a última publicada era `v4.17.0-fazer-ai-pro.120`: **9 versões de atraso**, e ninguém sabia. Não havia sinal em lugar nenhum do repo, do cockpit ou do `/check`.
- A leitura dessas 9 versões achou dois problemas que estão no ar hoje. A `.119` corrige **"conversas que o bot deixava sem resposta"**: uma lentidão momentânea tirava a conversa do bot e ela silenciava. A `.120` tira a conversa que está com um bot da aba "Não atribuídas", mudando a fila que a secretária vê. Nenhum dos dois é hipótese: são notas de release da versão que a instância não tem.
- A `.112` (31/jul) descreve **"erros com token de acesso da API ao gerenciar bots, etiquetas"**, que é a descrição exata do bug do radar **V8**, remendado desde 29/jul por uma correção de 1 linha aplicada **dentro do container**, que evapora em qualquer redeploy. O programa carrega esse hotfix como dívida frágil há quase dois meses, e o fix pode já existir sem ninguém ter olhado.
- Ler a página é mais difícil do que parece, e isso é parte da causa. <https://fazer.ai/chatwoot-release-notes> mostra **5** releases e esconde **143** atrás de um botão "Load more". Um scrape comum devolve as 5 e parece completo. O acervo inteiro já vem no HTML, no payload do Next.js, mas seis das notas mais compridas (entre elas a `.119` e a `.116`) chegam como referências não resolvidas e somem **sem erro nenhum**. Quem não sabe disso lê um recorte achando que leu tudo.
- O ADR-0017 já resolveu o problema gêmeo para as ferramentas: dado que a fonte sabe ao vivo não se escreve em arquivo, porque arquivo apodrece calado (a `circuito.json` passou cinco dias mentindo). A versão instalada é exatamente esse tipo de dado: `GET /api` do Chatwoot devolve `{"version": ...}` sem exigir credencial.
- O programa já tem um ritual que roda toda sessão de retomada: a skill `/check`. Rotina que depende de alguém lembrar não acontece; rotina pendurada num ritual que já existe, acontece.

## Decisão

1. **O placar de versões é vivo, nunca escrito.** Versão instalada vem de `GET {CHATWOOT_URL}/api`; última publicada vem da página da fazer.ai. Nenhum dos dois números entra em arquivo do repo. Vale a cláusula 3 do ADR-0017: sem fonte, a tela diz que não sabe, em vez de mostrar um valor velho com cara de fato.
2. **O Ana OS mostra o atraso.** Rota `/api/chatwoot` no `os/server.py` e um bloco no Mapa da Integração: instalada, última, quantas versões atrás. O atraso muda de cor quando passa de 3 versões.
3. **A leitura tem lente fixa.** Cada release nova responde quatro perguntas: toca o caminho da Ana (bot, token, tags, inbox, handoff)? toca a evidência que a bancada confere no Chatwoot (etapa, tag, avisos de status)? toca o que o hospital vê (filas, abas, permissões)? muda contrato que o `e2e.py` usa? Quem não bate em nenhuma não é registrado.
4. **A leitura curada mora no repo, o acervo não.** `ana/plataforma/chatwoot-releases.md` guarda o que só gente sabe: o que cada versão significa para a Ana. O dump das 148 releases não é versionado; o caminho até ele é o `ana/plataforma/scripts/fetch-chatwoot-releases.py`, que desempacota a página inteira e resolve as referências que somem calado.
5. **O `/check` cobra.** O ritual ganha um passo: comparar as duas versões e, havendo atraso, ler as releases novas com a lente e reportar. Atraso vira linha do relatório, como bloqueio externo parado.
6. **Subir versão é pré-requisito do WhatsApp real.** A Ana só vai para um número de WhatsApp de paciente com a instância na versão corrente. Sete das nove versões atrasadas são confiabilidade de WhatsApp; subir com a casa vazia é barato, subir com paciente dentro é caro. Nasce a tarefa **V32**.
7. **A nota de release não é prova.** A `.112` descreve o bug da V8, mas em 06/ago a inspeção do fork CE mostrou o defeito vivo na base CE dessa mesma release. O fechamento da V8 exige **teste por token em `/agent_bots` e `/labels` depois de subir**, nunca a leitura da nota.
8. **A fronteira é explícita.** Este ADR e o documento vivo cobrem só o Chatwoot. A plataforma fazer.ai agents tem numeração e notas próprias; os achados dela continuam no radar **V10**.

## Considered options

- **Guardar o acervo das 148 releases no repo:** rejeitado. São 300 KB de texto que a fonte já publica e que envelhece a cada release. O script custa menos e não mente. Se a fazer.ai tirar a página do ar, o script quebra alto, o que é melhor do que um arquivo silenciosamente velho.
- **Escrever a versão instalada num JSON do `os/dados/`:** rejeitado pelo ADR-0017. Seria repetir a `circuito.json`: o número certo no dia em que foi escrito, e mentira a partir do primeiro redeploy que ninguém anotou.
- **Deixar o upgrade no radar, junto da V8:** considerado com seriedade, porque a Ana está em modo teste e nenhum paciente real sofre o bug hoje. Rejeitado por causa da ordem: o custo de subir cresce quando a Ana estiver atendendo, e o radar não tem data. A tarefa puxa a V8 junto, o que resolve as duas dívidas numa janela só.
- **Assinar as notas por e-mail ou webhook, em vez de perguntar:** rejeitado por ora. A fazer.ai não oferece um feed, e um aviso que chega na caixa de entrada do Pedro compete com tudo o mais que chega lá. O `/check` já é o lugar onde ele olha o estado do programa de propósito.
- **Subir para a versão corrente automaticamente, sempre:** rejeitado. A `.120` muda a fila que a secretária vê sem ninguém configurar nada. Versão do canal do paciente é decisão, e decisão passa pelo Pedro.

## Consequências

- O programa ganha uma dívida visível que antes era invisível. Isso é o ponto, mas significa que o cockpit vai acusar atraso com frequência: o Chatwoot da fazer.ai publica de duas a três versões por semana. A régua de atenção é a lente, não o número: nove versões que não tocam a Ana valem menos que uma que toca.
- O `/check` fica um pouco mais longo e passa a depender de alcançar duas URLs externas. Se qualquer uma falhar, ele registra e segue, como já faz com o MCP da plataforma.
- O Mapa da Integração passa a falar de uma coisa que não é ferramenta. É coerente com o nome da página (a fronteira externa da Ana) e evita criar página nova para dois números.
- O hotfix da V8 ganha data de validade. Ou a V32 prova que ele não é mais necessário, ou prova que ainda é, e aí ele volta reaplicado e com evidência fresca. Nos dois casos a dívida sai do limbo em que está desde julho.
- Custo aceito: o `fetch-chatwoot-releases.py` depende do formato do payload do Next.js da página. Se a fazer.ai reconstruir o site, o script quebra. Ele falha alto, com mensagem dizendo que a página mudou de formato, em vez de devolver lista vazia.
