# Retrato da Ana

Site estático para o diretor do Hospital São Matheus (ADR-0028): o que a Ana faz hoje, as regras que ela segue, onde ela busca cada resposta e o que dá e o que não dá na Global Health. Sem servidor, sem segredo, sem dado ao vivo.

Desde o ADR-0029 o Retrato veste o design system do aplicativo do hospital (fonte HP Simplified, azul-marinho, cantos pequenos, vidro só na barra fixa e no painel), obedece o contrato de links (toda menção é link, todo link tem volta), tem filtros em toda esfera e três fluxogramas com botão de percorrer.

## Gerar o retrato

```bash
python3 retrato/gerar.py
```

O script lê os JSON curados de `os/dados/`, a curadoria (`retrato/curadoria.json`) e a lista de ferramentas na plataforma (token do `.env` da raiz, que nunca vai para o JSON), grava as ligações inversas (quem menciona quem: ferramenta, seção, passo do mapa, capacidade, cadeia e elo) e escreve `retrato/dados/retrato.json` carimbado com a data. Se a plataforma não responder, ele para com erro e não gera com dado velho.

Antes de gravar, ele varre o JSON contra a lista de proibidos (CPF, paciente-sonda, endereço de ambiente, token, credencial, código de tarefa) e recusa gerar se achar algo. Travessão na moldura também derruba a geração (os títulos vindos do mapa são convertidos; o miolo literal das regras não se toca). Para conferir que a varredura pega:

```bash
python3 retrato/gerar.py --testar-proibidos
```

`--dry-run` monta e valida sem gravar. `--sem-plataforma` só serve para testar o HTML: marca as ferramentas como não lidas e não deve ser publicado.

## Conferir local

```bash
python3 -m http.server -d retrato 8778
```

Abrir `http://localhost:8778`.

## Navegar e filtrar pela URL

A URL carrega a esfera, o alvo e o filtro: `#<esfera>/<alvo>?<filtros>`.

| Exemplo | O que abre |
|---|---|
| `#faz` | a esfera "O que a Ana faz hoje" |
| `#faz?estado=ainda-nao` | só as capacidades que ainda não existem |
| `#faz?bloco=ouvidoria&q=protocolo` | o bloco Ouvidoria, filtrado pela palavra "protocolo" |
| `#regras/sec-2-3-1` | a seção 2.3.1 das regras, aberta e acesa |
| `#regras/no-nP3` | o passo P3 do mapa, com a ficha aberta |
| `#regras?raia=particular&tipo=ferramenta` | só as chamadas de ferramenta da raia Particular |
| `#regras?ferramenta=assign_label` | os passos que chamam essa ferramenta (os outros esmaecem) |
| `#busca/tool-consultar_horarios_livres` | a ficha da ferramenta, acesa |
| `#busca?origem=gh&pode=nao` | ferramentas da Global Health que a Ana não pode chamar hoje |
| `#global-health/cad-d` | a cadeia D |
| `#global-health/elo-d-10` | o elo D10, com a conversa da Ana ao lado |
| `#global-health?veredito=recusa` | só os elos com recusa de propósito |

Os ids de alvo são estáveis: `cap-<id>`, `sec-<id>`, `no-<id>`, `tool-<nome>`, `cad-<letra>`, `elo-<letra>-<n>`. Chegar por link troca a esfera, rola até o alvo e o acende por dois segundos. A busca livre (`q=`) filtra ao digitar; o botão "limpar" zera tudo.

## Os três fluxogramas

- **O caminho de uma mensagem** (esfera "Onde ela busca"): clique numa origem ou numa ferramenta do catálogo para acender o caminho dela; "percorrer" corre um ponto pelo desenho.
- **Cada cadeia da Global Health, elo a elo**: passo numerado quando funciona, decisão âmbar na recusa de propósito, card tracejado no "ainda não"; o percorrer avança um elo por vez e a conversa da Ana daquele elo aparece na coluna ao lado (clicar num elo também mostra).
- **Percorrer a jornada** no mapa das regras: botão em cada raia; acende os passos na ordem das setas e abre o trecho literal de cada um. O botão "parar" fica dentro da ficha, que é fixa.

Nada roda sozinho ao abrir a página. Com "reduzir movimento" ligado no sistema, os botões viram "próximo" e o destaque é estático.

## Publicar

Na raiz do repositório (o `vercel.json` aponta para esta pasta):

```bash
vercel
vercel --prod
```

## Regra do retrato

O JSON gerado é um retrato datado: o rodapé de toda aba diz "Retrato de DD/MM/AAAA". Depois de qualquer mudança nas regras, nas ferramentas ou nas provas, gere de novo, leia o que saiu e só então publique.
