---
status: accepted
date: 2026-09-09
amends: 0028, 0029, 0017, 0027
---

# O Ana OS é uma página só: o esqueleto do Retrato vestido de Ledger, com a camada de operação por cima

Decisão do Pedro (terceiro grilling de 09/set/2026): o Ana OS estava obeso. Cinco abas com 340 KB de HTML, textos que explicavam de novo o que o mapa ao lado já mostrava, e três páginas desenhando as mesmas ferramentas. O Retrato da Ana, nascido dois grillings antes, já era a versão curada, ligada e filtrável de quatro dessas abas. O OS passa a ser o Retrato com o motor aberto: uma página só, Cockpit mais as quatro esferas com os mesmos nomes, desenhadas pelos mesmos motores JS, lendo o dado ao vivo, com a roupa Ledger e uma camada de operação que só um arquiteto precisa.

## Contexto

- O Pedro descreveu o OS como "uma obesidade de informação": muita coisa, falando da mesma coisa, pouco navegável. Ele queria algo mais simples, mais enxuto, com muitas ligações, e técnico só na medida em que um arquiteto precisa, na tangência com o funcional.
- O leitor do OS mudou. Deixa de ser só o Pedro e passa a incluir quem pegar o programa depois (um analista de TI do hospital, alguém da fazer.ai). O OS precisa se explicar sozinho.
- Quatro das cinco abas do OS tinham par direto no Retrato: Provas era "O que a Ana faz hoje", Mapa do SOP era "As regras da Ana", Mecanismo era "Onde ela busca a resposta", Global Health era Global Health. Só o Cockpit não tinha par.
- Os motores do Retrato (`liga.js`, `filtros.js`, `fluxo.js`, `sop.js`, `retrato.js`) já implementavam o contrato de links do ADR-0029, os filtros por esfera e os fluxogramas com percorrer. O OS tinha o seu próprio `liga.js` e nada dos outros.
- O `retrato/gerar.py` já montava, a partir de `os/dados/` e da plataforma, o documento com as ligações inversas calculadas. Só gravava em arquivo, para a Vercel.

## Decisão

1. **O leitor é um arquiteto.** O OS escreve para o Pedro e para quem pegar o programa depois. Nada depende da memória de quem lê: IDs, ambientes e nomes de código aparecem, mas com uma frase que os explica.
2. **Só o esqueleto do Retrato, não a roupa.** O OS ganha as abas nomeadas no topo numa barra fixa translúcida, a barra de filtros por esfera, o painel lateral de detalhe e os fluxogramas com percorrer. Mantém o Ledger do `DESIGN.md` (Poppins e Inter, preto sobre claro, cards sem sombra, sidebar preta). Roupa diferente diz em qual dos dois produtos você está.
3. **As mesmas quatro esferas, com os mesmos nomes e a mesma ordem do Retrato**, mais o Cockpit na frente: Cockpit, O que a Ana faz hoje, As regras da Ana, Onde ela busca a resposta, Global Health: o que dá e o que não dá. Um mapa só para os dois produtos.
4. **A regra de corte.** O OS mostra o que o Retrato mostra, mais três camadas, e nada além: (a) o ao vivo: selo de origem lido da plataforma, a chamada real de cada ferramenta (método e caminho), a versão do Chatwoot, o botão de rodar cada elo na Global Health; (b) a prova crua: os testes manuais de cada capacidade e as famílias da bancada, com o código do cenário; (c) o Cockpit. Sai do menu tudo o que era texto explicativo repetindo o desenho ao lado: os quatro níveis de teste, o caminho de um teste manual, os comandos e artifícios, as travas, as oito regras de ouro, as dez raias do kanban, as oito etiquetas, "ao redor do fluxo", "o trecho futuro: agendamento no MV", "por que esta seção não envelhece", "o que fica de fora" e a demonstração de cinco minutos. Tudo isso segue intacto nas páginas arquivadas.
5. **O OS continua lendo o dado vivo.** Não lê o `retrato.json` publicado. O `os/server.py` ganha a rota `/api/retrato`, que importa o `retrato/gerar.py` e chama a mesma função `montar` em processo, a cada pedido (cache de 60 s em memória), lendo `os/dados/` e a plataforma. Uma lógica de montagem só, sem a varredura de proibidos (o OS é local) e sem gravar arquivo. É a regra do ADR-0017 aplicada ao Retrato: o OS é o lugar do agora; o Retrato é a foto com data. A página diz "lido agora, HH:MM" onde o Retrato diz "retrato de DD/MM/AAAA".
6. **Os motores do Retrato são fonte única.** O server serve `retrato/assets/*.js` por `/retrato/`, só JS e CSS, nunca fontes, logo ou dados. Os motores ganharam ganchos pequenos para o OS: lista de abas configurável (`window.LIGA_ABAS`, a primeira é a de chegada), URL do dado (`window.RETRATO_DADOS`), fonte de medição dos textos (`window.FLUXO_FONTE`), paleta dos fluxogramas (`window.FLUXO_PALETA`) e o evento `retrato:pronto` ao fim da montagem. O Retrato não muda de comportamento.
7. **A roupa é CSS, e CSS é forkado de propósito.** `os/assets/esferas.css` reescreve as classes do `retrato.css` nos tokens Ledger e escopa o que colide (os nós do mapa do SOP em `#svg`, os cartões do grafo em `#grafo`). O esqueleto (HTML e JS) é compartilhado; a roupa é de cada produto, como o ADR-0029 já decidia.
8. **O Cockpit responde uma pergunta só: o que eu faço agora.** Ficam a mesa de ação e o grafo. O radar vira uma linha por item, abaixo do grafo, com a prioridade num círculo. As aplicações externas (plataforma, Chatwoot, Langfuse, Coolify, bot do Telegram) viram ícones na sidebar, que já existia e é só ícone. O cabeçalho de indicadores some: o placar do grafo já conta o que falta. Os parágrafos de manual viram uma linha curta.
9. **A camada de operação vive num script à parte** (`os/assets/os-esferas.js`), que escuta `retrato:pronto` e acrescenta o que a regra de corte permite. O motor das cadeias saiu da página antiga para `os/assets/cadeias-motor.js`, sem DOM, com API para rodar um elo, uma cadeia inteira ou recomeçar; a aba Global Health desenha a cadeia com o motor do Retrato e põe, em cada elo, a chamada real, a entrada de cada valor (de onde veio e por quê), o botão de rodar, o resultado, a saída que segue, o que foi enviado e a resposta crua. Quando o elo roda com sucesso, a fala da Ana ao lado é montada com a resposta real.
10. **As páginas antigas vão intactas para `os/arquivo/`** (`cockpit.html`, `circuito.html`, `sop.html`, `comparacao.html`, `cadeias.html`), com os caminhos de assets corrigidos, fora do menu, por URL direta. Os nomes das abas mudam; a URL do OS passa a ser `index.html#<aba>/<alvo>`, a mesma gramática do Retrato.
11. **Os textos passam por um passe de escrita humana.** As descrições do roadmap (mesa, notas, radar) e as molduras das abas perdem os tiques de texto de máquina: contraste "não X, mas Y", fechos de uma linha, tríades forçadas, rótulos em negrito, palavras infladas. Fatos ficam; enfeite sai.

## Considered options

- **Manter as cinco páginas e só cortar gordura dentro de cada uma:** rejeitado. Continuaria com dois esqueletos (OS e Retrato) e dois vocabulários de aba para o mesmo conteúdo.
- **Vestir o OS também com o design system do hospital:** rejeitado pelo Pedro. O que pesa é o esqueleto; a roupa diferente ajuda a distinguir os dois produtos, e o ADR-0029 já tinha decidido que o OS fica no Ledger.
- **O OS ler o `retrato.json` publicado:** rejeitado. O OS ficaria datado como o Retrato e rodar o `gerar.py` viraria passo obrigatório antes de olhar o cockpit. O OS é o lugar do agora (ADR-0017).
- **Portar a montagem do `gerar.py` para JavaScript e calcular as ligações no navegador:** rejeitado na execução. Seriam 600 linhas duplicadas; importar o script em processo no server dá o mesmo resultado, vivo, com uma lógica só.
- **Copiar os motores do Retrato para `os/assets/`:** rejeitado. Cópia diverge em silêncio; o server serve a pasta original.
- **Cockpit com os cinco blocos (indicadores, mesa, grafo, radar, aplicações):** rejeitado. Três dos cinco falavam do mesmo estágio de jeitos diferentes.
- **Manter o botão de rodar elo só na Bancada arquivada:** rejeitado. Rodar cada elo é a camada ao vivo que dá sentido ao OS na aba Global Health (ADR-0027).

## Consequências

- `os/index.html` é reescrito como página única; `os/assets/esferas.css`, `os/assets/cockpit.js`, `os/assets/os-esferas.js` e `os/assets/cadeias-motor.js` nascem; `os/assets/nav.js` vira sidebar de logo e aplicações; `os/assets/grafo.js` ganha ids com prefixo `grafo-`. O `os/assets/liga.js` antigo segue existindo só para as páginas arquivadas.
- `os/server.py` ganha `/api/retrato` e `/retrato/<x>.js|.css`. As regras de segurança não mudam: token nunca no navegador, GH só homologação, produção proibida.
- `retrato/gerar.py` passa a ter dois chamadores: a linha de comando (grava o `retrato.json` publicado, com a varredura) e o server do OS (monta em memória, sem varredura). A função `montar` é o contrato.
- `retrato/assets/*.js` ganham os ganchos da decisão 6. Verificação de regressão do Retrato: zero erros de console, 768 links e nenhum morto, cores do hospital intactas.
- Verificação do OS: zero erros de console a 1360 e 390 px, sem rolagem horizontal, 774 links e nenhum morto, o elo B1 rodado de verdade na homologação, chegada acesa por link, mesa abrindo o painel.
- `CONTEXT.md` atualiza Ana OS e Contrato de links e ganha o termo Camada de operação; `DESIGN.md` ganha a seção do esqueleto do Retrato no Ledger; `CLAUDE.md` descreve a página única.
- O `/check` não muda: continua reconciliando TODO.md e roadmap.json.
