---
status: accepted
date: 2026-09-09
amends: 0007, 0011, 0019
amended_by: 0029, 0030, 0031
---

# O Retrato da Ana nasce para o diretor, e o Ana OS vira cinco abas só de leitura

Decisão do Pedro (grilling de 09/set/2026): o que vai para a Vercel não é o Ana OS. Nasce um segundo produto, o **Retrato da Ana**, um site estático em `retrato/` que mostra ao diretor do hospital o que a Ana faz, as regras que ela segue, onde ela busca cada resposta e o que dá e o que não dá na Global Health. O Ana OS continua local, cai de 11 para 5 abas, perde toda escrita pela tela, e o roadmap é reiniciado com nove cards escritos do ponto em que o programa está.

## Contexto

- O Pedro quer publicar na Vercel abas direcionadas ao prompt, às capacidades, às ferramentas, às integrações e ao que a Global Health permite, em linguagem funcional para o diretor. Mas o cockpit de hoje não sobe: das 11 abas, só Arquitetura e Famílias são estáticas. As outras nove chamam o `os/server.py` para algo (ferramentas ao vivo pelo ADR-0017, proxy da GH homolog, Oracle TST, versão do Chatwoot). Na Vercel não há servidor com o `.env`, e o token nunca pode ir ao navegador (ADR-0004).
- O inventário das abas mostrou que 11 páginas respondem a 5 perguntas. Cockpit e Roadmap respondem "o que eu faço hoje". Arquitetura, Circuito e Mapa da Integração respondem "como a Ana funciona", desenhando as mesmas ferramentas três vezes. Comparação, Testes manuais e Famílias respondem "o que ela faz e como eu provo", uma lendo a outra. Bancada e Cadeias respondem "o que a GH responde", e desde o ADR-0027 cada elo roda sozinho nas Cadeias.
- O roadmap aberto tinha cinco itens vivos (V29, V35, GH19 já resolvida, P3, P6), três com nome de código da Global Health no título, mais três hotfixes no radar e duas ideias mortas. O Pedro pediu "reset disso tudo": cards enxutos, nítidos, do que falta a partir de onde a Ana está.
- O Pedro decidiu que nenhum card nasce pela tela: ele pede no terminal e a sessão escreve nos dois arquivos. A escrita da UI do ADR-0011 (Ideias e o gesto "marquei: disparado") perde o motivo de existir.

## Decisão

1. **Dois produtos.** O Ana OS segue local, cockpit do Pedro. O Retrato da Ana é um site estático novo, em `retrato/` na raiz, irmão de `os/`, sem servidor, sem segredo, sem dado ao vivo. A Vercel aponta para essa pasta.
2. **Quatro esferas no Retrato**, uma aba com nome cada, no topo da página: (1) **O que a Ana faz hoje**, das capacidades da Comparação, promete versus entrega, com prova; (2) **As regras da Ana**, o prompt completo como está, o Mapa do SOP inteiro e a anatomia das seções com as ferramentas que cada uma chama; (3) **Onde ela busca a resposta**, ferramentas e integrações numa esfera só, por origem (API do Hospital, Global Health, nativa); (4) **Global Health: o que dá e o que não dá**, as cadeias A a F com a conversa da Ana ao lado, sem payload, só o veredito, e a lista curada do que ainda não dá.
3. **O "o que falta" mora dentro de cada esfera**, como estado do item (funciona, em parte, ainda não). Não há aba de próximos passos no Retrato. O roadmap é do OS.
4. **Miolo literal, moldura de diretor.** Os nós do SOP e as seções do prompt mostram o texto exato. Só a moldura muda: títulos, subtítulos, legendas, nomes das raias, e "prompt congelado" vira "regras em vigor desde a data".
5. **Script de retrato.** `retrato/gerar.py` lê a plataforma (ferramentas e grants), a Comparação, o SOP, o Circuito, a Integração e as Cadeias, e grava um único JSON carimbado com a data em `retrato/dados/`. O site inteiro traz "retrato de DD/MM/AAAA" no rodapé. O Retrato é o caso do ADR-0017 em que o dado não pode ser lido ao vivo: vem gravado por script, sempre com a data ao lado.
6. **Regra de saída.** O `gerar.py` recusa gerar se encontrar no JSON de saída CPF, nome do paciente-sonda, URL de ambiente, token, nome de credencial do vault ou ID de tarefa do roadmap. A página leva `noindex`. Link sem senha: quem tem o link, vê.
7. **Visual.** Os tokens do `DESIGN.md` (cores, fontes, cards, chips), para os dois produtos parecerem da mesma família. A navegação é diferente: quatro abas nomeadas no topo, sem sidebar e sem ícone.
8. **O Ana OS cai para cinco abas**, uma por pergunta: **Cockpit** (home com a mesa de ação e o grafo de execução logo abaixo), **Mecanismo** (Circuito, com o desenho da Arquitetura como abertura e as faixas ida, volta e fronteira do Mapa da Integração, mais a versão do Chatwoot), **Mapa do SOP** (só ele: 81 nós não dividem tela), **Provas** (Comparação em cima, a lista de Testes manuais embaixo, e o código do cenário abrindo a família), **Global Health** (as Cadeias). A Bancada da API GH vai intacta para `os/arquivo/`, aberta por URL direta, para quando precisar do endpoint cru e do SQL para o DBeaver. Nada se perde: cada aba absorvida vira seção da que a absorve.
9. **O OS vira só leitura.** Some a faixa de Ideias, some o formulário, some o botão "marquei: disparado" e some a rota `POST /api/roadmap`. Card novo, card concluído e canal movido nascem só por sessão no terminal, nos dois arquivos (TODO.md e roadmap.json). O `/check` deixa de reconciliar escrita de tela.
10. **Roadmap reiniciado.** As tarefas feitas do estágio anterior saem do grafo e vão para `roadmap/arquivo/`, com o roadmap.json anterior guardado inteiro. O estágio novo nasce com nove cards, título em linguagem de ação, sem código da GH: a GH aceita a marcação (hoje 417), a marcação aparece no banco do MV, a Ana marca, remarca e cancela de ponta a ponta, a GH publica a agenda de exames, a bancada fecha 16 de 16, o app do hospital espelha a GH, a Ana entra no WhatsApp real, o Ana OS com cinco abas, e o Retrato no ar. Os três hotfixes seguem no radar; as duas ideias antigas morrem (uma já puxada, a outra morta com a massa). Cards a mais só depois de o Pedro ver a esfera de capacidades.

## Considered options

- **Subir o Ana OS inteiro na Vercel, escondendo as abas de operação:** rejeitado. O "ao vivo" quebra sem servidor, o diretor vê IDs de tarefa e "homolog", e cada aba nova do cockpit passaria a ter dois públicos.
- **Cinco esferas, com ferramentas separadas de integrações:** rejeitado. Para o diretor, ferramenta e integração são a mesma coisa: onde a Ana busca a resposta. O selo de origem já faz essa junção no cockpit.
- **Uma frase de diretor por cima de cada nó do SOP:** rejeitado. Seriam 81 traduções curadas à mão, envelhecendo a cada versão do prompt. A moldura basta.
- **Retrato sem dado da plataforma:** rejeitado. A esfera "Onde ela busca" perderia a informação principal. O script de retrato resolve, com data.
- **Manter uma escrita na tela (só o "marquei: disparado"):** rejeitado pelo Pedro. Um caminho só para mudar estado, o terminal.
- **Seis abas no OS, com a Bancada no menu:** rejeitado. Desde o ADR-0027 cada elo roda sozinho nas Cadeias; a Bancada crua fica por URL.
- **Retrato com senha da Vercel:** rejeitado. Plano pago e senha para o diretor lembrar; a lista de proibidos no script já tira do ar o que não pode sair.

## Consequências

- Nasce `retrato/` (HTML, `gerar.py`, `dados/`), e um `vercel.json` na raiz apontando para ela.
- `os/` perde seis páginas do menu (Roadmap, Arquitetura, Integração, Testes, Famílias, Bancada), cinco absorvidas e uma arquivada, e o `nav.js` passa a ter cinco itens. O `server.py` perde `POST /api/roadmap`.
- `os/dados/roadmap.json` perde a chave `ideias` e ganha um estágio novo; o anterior vai para `roadmap/arquivo/`. O `roadmap/TODO.md` reinicia, com o log preservado no arquivo.
- O `CONTEXT.md` ganha o termo Retrato da Ana, e as entradas Ana OS, Mesa de ação e Ideias registram a mudança.
- A skill `/check` precisa parar de esperar a faixa de Ideias e a escrita de tela.
- Publicar é ato do Pedro: `vercel` na raiz, depois de rodar o `gerar.py` e ler o que saiu.
