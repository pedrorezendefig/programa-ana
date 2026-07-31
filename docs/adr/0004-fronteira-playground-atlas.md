---
status: accepted
date: 2026-07-22
---

# Playground vira portal único multi-página; fronteira de ambientes passa a ser por página

Todo o conhecimento operacional do ecossistema MV/Global Health se concentra num único lugar: o **Playground GH** (`ana/api-mv/playground/`, servido por `server.py` em `localhost:8777`), que deixa de ser uma página só e vira um **portal local completo, com várias páginas**: a bancada da API (o `index.html` atual), o roteiro por endpoint (passo a passo com dados mocados + query de conferência para o DBeaver), as páginas do **Atlas do banco de produção** (modelo real, domínios, volumes, cruzamento com a API) e a seção de **insights de diretoria e novos fluxos**. A ideia anterior de um atlas em arquivo separado (decidida e revertida no mesmo grilling de 22/jul/2026, por pedido do Pedro) morre aqui: um só localhost, cheio de páginas.

A fronteira de ambientes, que antes seria por ferramenta, passa a ser garantida por três regras:

1. **Chamada ao vivo, só homologação.** O `server.py` continua falando apenas com a API GH de homolog e com o Oracle TST (somente SELECT). Nenhuma rota chama produção, nunca.
2. **Produção entra só como conhecimento estático.** As páginas do atlas são alimentadas pelos CSVs que o Pedro deposita em `ana/api-mv/absorcao-producao/resultados/` depois de rodar o pacote manualmente no DBeaver da produção (única via permitida). O servidor expõe essa pasta em leitura para as páginas; a subpasta `amostras/` (dado pessoal, fora do git) nunca é servida nem renderizada.
3. **Cada página declara seu ambiente.** Páginas de homolog/TST e páginas de retrato da produção são rotuladas de forma visível, para nunca se confundir o que é bancada de teste com o que é fato da operação real.

## Contexto

- Política de acesso vigente (07/jul/2026): homolog = leitura direta pela sessão; produção = só o Pedro, manualmente, no DBeaver, credencial nunca no `.env`. Desde 13/jul a rede da VPN não alcança nem a TST da sessão, então "queries prontas + Pedro executa" é o único caminho para qualquer banco.
- Nem Pedro nem o TI sabem como o MV funciona de verdade em produção (tabelas relevantes, relações, domínios, como a API GH toca o banco). O ciclo C7 (montar o pacote e o portal) → C8 (rodar na produção) → C9 (absorver nos CSVs e preencher o atlas) ataca isso.
- O Pedro quer uma mesa única: manter atlas e playground como artefatos separados criaria duas portas para o mesmo assunto.

## Opções consideradas

| Opção | Veredito |
|---|---|
| Atlas em HTML separado (duplo clique) + playground intocado | Revertida pelo Pedro no próprio grilling: queria um localhost único e completo |
| Tudo dentro do `index.html` atual (uma página gigante) | Descartada: o arquivo já tem ~1.900 linhas; páginas separadas com navegação comum escalam melhor |
| **Portal multi-página no mesmo servidor local** | **Escolhida**: um endereço só (`localhost:8777`), navegação comum, fronteira por página e por regra de chamada** |

## Consequências

- Futuras sessões sabem onde escrever cada achado: comportamento da API homolog e conferências TST vão para a bancada e o roteiro; qualquer fato sobre produção vai para as páginas do atlas e para `absorcao-producao/`.
- Regra de dados por camada: resultado commitável (catálogo, contagens, domínios) não carrega dado pessoal; amostras completas ficam em `absorcao-producao/resultados/amostras/`, fora do git e fora do servidor.
- O `server.py` ganha duas responsabilidades novas e pequenas (servir páginas estáticas do diretório do playground e os CSVs commitáveis da absorção), sem mudar as regras de segurança existentes (token fora do navegador, SELECT-only, homolog-only).
- Quando os CSVs do C8 chegam, as páginas do atlas passam de "hipótese" a "evidência" sem reescrever o portal: elas leem os arquivos depositados.
