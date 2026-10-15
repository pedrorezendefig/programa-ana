---
status: accepted
date: 2026-08-20
amends: 0018, 0019
amended_by: 0021, 0027
---

# Testes manuais como decima pagina, e o selo de origem no cockpit inteiro

Decisão do Pedro (20/ago/2026, sessão de grilling): o cockpit ganha a página **Testes manuais** (a décima, aberta horas depois de o ADR-0019 fechar em nove), o **selo de origem** do ADR-0018 se estende às páginas que ficaram de fora, e cada teste ganha uma **faixa de assertividade derivada**: máquina ou humano, nunca escrita à mão.

## Contexto

- Os testes copiáveis já existiam, mas escondidos: 35 testes (envie / espere / falhou se) dentro das fichas das 30 capacidades da Comparação, e 26 cenários com checagem literal (`contem` / `nao_contem`) em `ana/bancada/cenarios/integracao.json`. Não havia lugar único para sentar e rodar uma bateria manual, nem etiqueta dizendo qual teste uma máquina consegue julgar sozinha.
- O Pedro quer dois destinos claros: cenário com checagem exata vai para a automação (via API do fazer.ai agents, quando essa frente abrir); teste com expectativa em prosa, multi-turno ou com julgamento de tom fica para o humano copiar e colar no Telegram.
- O ADR-0018 pôs o selo de origem em três páginas (Integração, SOP, Circuito). Comparação, Bancada, Cadeias e Arquitetura seguiram sem dizer quem responde cada chamada, exatamente a pergunta que o selo nasceu para responder.
- No Circuito, a lista de passos repetia por extenso o entra/acontece/sai que o hover já conta, e a anatomia do prompt (41 seções, 88 trechos) era uma parede de cards sem navegação.

## Decisão

1. **Nasce a página Testes manuais** (`os/testes.html`), a décima do menu. Exceção consciente ao ADR-0019: ela não guarda dado novo nenhum. Lê `os/dados/comparacao.json` e os cenários da bancada (servidos pela rota nova `/api/cenarios` do `os/server.py`) e apresenta os 61 testes prontos para uso, com botão de copiar em cada mensagem, turno a turno. O critério do ADR-0019 continua valendo: página sem dado próprio não apodrece.
2. **Assertividade é derivada, em duas faixas.** Teste com asserção literal por máquina (`contem` / `nao_contem` / `tools`) cai na faixa **máquina roda** (insumo da futura automação pela API do fazer.ai agents). Teste com expectativa em prosa cai na faixa **humano roda**. Nenhum campo de nota entra em JSON curado, na linha dos ADR-0017/0018.
3. **A página abre pelas faixas, não pelas capacidades.** Primeiro "para você rodar no Telegram", depois "para a máquina rodar"; dentro de cada faixa, os testes se agrupam pelos blocos de capacidade da Comparação. Capacidade sem teste aparece marcada como "aguardando a Global Health", nunca some.
4. **O selo de origem passa a valer no cockpit inteiro.** Página mista (Comparação, Testes manuais, Arquitetura) mostra o selo por item, derivado pelo `assets/origem.js`; página de origem única (Bancada e Cadeias, ambas 100% Global Health homolog) mostra uma faixa fixa no topo em vez de repetir o mesmo selo em cada card. Emenda a cláusula 3 do ADR-0018: de "três páginas" para "toda página que desenha ferramenta".
5. **Selo só para ferramenta que existe.** Nome que não está em `/api/v1/tools` nem no carimbo de grants (`grants-medida.json`) não ganha selo: a ausência das duas fontes significa ferramenta inexistente, não nativa.
6. **O Circuito perde a repetição e ganha navegação.** A lista de passos mostra só número, raia e título (a ficha entra/acontece/sai vive no hover, que a lista também ganha). A anatomia do prompt vira acordeão de dois níveis (seção e trecho) com índice lateral fixo das 41 seções e os botões "abrir tudo" / "fechar tudo", tudo fechado ao carregar.

## Considered options

- **Modo teste dentro da Comparação, sem página nova:** rejeitado. A Comparação compara prometido contra entregue; rodar bateria é outro trabalho, e chegar num teste exigiria achar a capacidade e abrir a ficha. A página nova custa um item de menu e zero dado novo.
- **Nota de assertividade 1 a 10 curada à mão:** rejeitado. É o campo que os ADR-0017/0018 mataram: ninguém atualiza quando o teste muda. A faixa derivada da forma da asserção não mente.
- **Selo por item também na Bancada e nas Cadeias:** rejeitado. Dezenas de selos idênticos numa página de origem única viram papel de parede; a faixa no topo diz o mesmo uma vez.

## Consequências

- O menu volta a crescer: 10 páginas. O critério de entrada fica registrado: página nova só quando o trabalho é novo e o dado é derivado.
- O `os/server.py` ganha a rota de leitura `/api/cenarios` (o arquivo de cenários vive fora de `os/`); nenhuma escrita nova.
- Quando a automação pela API do fazer.ai agents nascer, a faixa "máquina roda" já é a lista de entrada dela.
- O CONTEXT.md atualiza os verbetes Ana OS e Selo de origem e ganha o verbete Testes manuais.
