# Contrato Hospital São Matheus: como editar e publicar

Todo o material do contrato de Serviços Contínuos da VITTA TECH sai de **dois arquivos-fonte**.
Você edita a fonte e roda **um comando** para publicar no mesmo link de sempre.

## Link publicado (é sempre o mesmo)

**https://vitta-contrato-hospital-sao-matheus.vercel.app**

| Endereço | Página |
|---|---|
| `/` | Versão de leitura explicada (escada de valor, capacidades) |
| `/contrato` | O contrato formal, igual ao PDF (tela branca, como um visor) |
| `/contrato.pdf` | O PDF para download |

## Estrutura de pastas

```
contrato/
├── LEIA-ME.md        <- este arquivo
├── publicar.sh       <- publica no link acima (1 comando)
├── build.py          <- gera os HTMLs a partir de fonte/  (não precisa mexer)
├── build_site.py     <- monta o site publicável           (não precisa mexer)
├── fonte/            <- O QUE VOCÊ EDITA
│   ├── CONTRATO-servicos-continuos.md   (todo o texto do contrato)
│   └── meta-servicos.json               (preços da escada, notas e topo)
├── gerado/           <- saída do build (NÃO editar à mão; é sobrescrito)
│   ├── servicos-continuos-app.html      -> vira a página /
│   ├── servicos-continuos-print.html    -> vira a página /contrato
│   └── CONTRATO-servicos-continuos.pdf  -> vira /contrato.pdf
└── legado/           <- contrato antigo (patamares) e apoio; pode ignorar
```

## Qual arquivo vira qual página

| Página no site | Arquivo gerado | Vem da fonte |
|---|---|---|
| `/` (leitura) | `gerado/servicos-continuos-app.html` | `fonte/CONTRATO-...md` + `fonte/meta-servicos.json` |
| `/contrato` (formal) | `gerado/servicos-continuos-print.html` | `fonte/CONTRATO-...md` |
| `/contrato.pdf` | `gerado/CONTRATO-...pdf` | `fonte/CONTRATO-...md` |

Você **não edita os HTMLs**. Edita a **fonte**, e o build gera as três saídas de uma vez,
sempre em sincronia (o texto do site, do contrato formal e do PDF fica igual).

## O que editar para cada mudança

| Quero mudar... | Edite este arquivo |
|---|---|
| Texto do contrato: cláusulas, anexos, escopo, valores no corpo do texto | `fonte/CONTRATO-servicos-continuos.md` |
| A escada de preços (barras), as notas em verde e o título/subtítulo do topo | `fonte/meta-servicos.json` |

## Como publicar de novo (no mesmo link)

1. Edite o que quiser em `fonte/`.
2. No terminal, dentro desta pasta, rode:

   ```
   ./publicar.sh
   ```

Ele gera os HTMLs, gera o PDF, monta o site e sobe para a Vercel. No final imprime o link,
que é sempre o mesmo. Leva menos de um minuto.

> Precisa ter: `python3`, o Google Chrome instalado e o `vercel` logado
> (`vercel whoami` deve responder). Nesta máquina já está tudo pronto.
