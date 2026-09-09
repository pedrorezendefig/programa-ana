# Retrato da Ana

Site estático para o diretor do Hospital São Matheus (ADR-0028): o que a Ana faz hoje, as regras que ela segue, onde ela busca cada resposta e o que dá e o que não dá na Global Health. Sem servidor, sem segredo, sem dado ao vivo.

## Gerar o retrato

```bash
python3 retrato/gerar.py
```

O script lê os JSON do Ana OS (`os/dados/`), a curadoria (`retrato/curadoria.json`) e a lista de ferramentas na plataforma (token do `.env` da raiz, que nunca vai para o JSON), e grava `retrato/dados/retrato.json` carimbado com a data. Se a plataforma não responder, ele para com erro e não gera com dado velho.

Antes de gravar, ele varre o JSON contra a lista de proibidos (CPF, paciente-sonda, endereço de ambiente, token, credencial, código de tarefa) e recusa gerar se achar algo. Para conferir que a varredura pega:

```bash
python3 retrato/gerar.py --testar-proibidos
```

`--dry-run` monta e valida sem gravar. `--sem-plataforma` só serve para testar o HTML: marca as ferramentas como não lidas e não deve ser publicado.

## Conferir local

```bash
python3 -m http.server -d retrato 8778
```

Abrir `http://localhost:8778`.

## Publicar

Na raiz do repositório (o `vercel.json` aponta para esta pasta):

```bash
vercel
vercel --prod
```

## Regra do retrato

O JSON gerado é um retrato datado: o rodapé de toda aba diz "Retrato de DD/MM/AAAA". Depois de qualquer mudança nas regras, nas ferramentas ou nas provas, gere de novo, leia o que saiu e só então publique.
