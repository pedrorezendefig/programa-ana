---
status: accepted
date: 2026-08-19
amends: 0007
---

# As páginas do Ana OS não guardam o que a plataforma já sabe

Decisão do Pedro (18/ago/2026, noite, sessão de grilling do Mapa da Integração): quando um dado do Ana OS existe ao vivo numa fonte autoritativa, o JSON curado **não guarda esse dado**. Ele guarda só o que só uma pessoa sabe (para que serve, quando se usa, o que acontece quando falha) e busca o resto na fonte, na hora de renderizar. O que a página não pode buscar ao vivo aparece sempre com a data da medição ao lado. Nasce com a página `os/integracao.html` e passa a valer para toda página do OS.

## Contexto

- O Ana OS (ADR-0007) rende suas páginas a partir de JSON curados em `os/dados/`. O padrão até aqui é o do Mapa do SOP: o arquivo guarda tudo, inclusive trechos literais do prompt, e carrega um carimbo (`meta.versao_prompt`) mais uma regra escrita de revalidação por sessão. Funciona para o prompt, que só muda quando uma sessão o publica.
- Para as **ferramentas**, o mesmo padrão falhou de forma silenciosa. A `os/dados/circuito.json` guarda `"backend": "nocodb"` na tool 1. Em 14/ago a V21 apontou essa tool para `api.hospitalsaomatheus.cloud`. O arquivo virou mentira no mesmo dia, ninguém foi avisado, e a página seguiu afirmando o contrário com a mesma confiança de antes. O `meta.versao_prompt` dela ainda diz `v5.3`; o prompt no ar é o v6.4.
- A `os/arquitetura.html` desenha o NocoDB como a casa das quatro tabelas. Também deixou de ser verdade para uma delas, pelo mesmo motivo.
- A fonte autoritativa existe e é barata: a rota `GET /api/v1/tools` da plataforma devolve `urlTemplate`, `method`, `credentialRef` e `enabled` de cada ferramenta. O `ana/bancada/divergimetro.py` já lê essa rota com o `AGENTS_API_TOKEN` do `.env`, exatamente para não deixar as URLs do NocoDB escritas no repo.
- O `os/server.py` já carrega o `.env` e já serve rotas de API próprias (`/api/status`, `/api/roadmap`, `/api/sql`), então somar uma rota de leitura não muda a natureza do cockpit.
- Uma regra da casa limita o alcance: o server **não chama produção**. A API do Hospital é produção, então as medições que dependem dela (tamanho da resposta em caracteres, itens que passam do teto de 4.000, protocolos que devolvem 404) não podem ser feitas pela página.

## Decisão

1. **Dado que a plataforma sabe não entra no JSON.** URL, método, credencial e se a ferramenta está ligada nunca são escritos em arquivo do `os/dados/`. Vêm de `/api/v1/tools` na hora, por uma rota de leitura do `os/server.py`, e são casados com o nó do desenho pelo **nome** da ferramenta.
2. **Estado é derivado, nunca declarado.** O selo "já migrou" ou "ainda no NocoDB" não existe como campo. A página o deriva do host da URL viva. Virar uma tool na plataforma muda o desenho sozinho, sem ninguém lembrar de editar nada.
3. **Sem fonte, a página diz que não sabe.** Se o token faltar ou a plataforma não responder, o nó mostra "não consegui ler a instância". Nunca um valor guardado antes, apresentado como se fosse de agora.
4. **O que não dá para buscar, vem carimbado.** Medição que exige chamar produção é gravada por script (`smoke-hospital.py` passa a escrever `os/dados/integracao-medida.json`) e a página sempre mostra o número **com a data ao lado**. Medida velha muda de cor e pede que o smoke rode de novo. O número nunca aparece sozinho.
5. **O JSON curado guarda o que só gente sabe.** Para que serve a chamada, em que momento real do atendimento a Ana a usa, o que ela devolve, quais os limites, o que acontece quando falha, qual cenário da bancada a prova, e a âncora para o trecho do prompt. Nada disso está em lugar nenhum que uma máquina possa ler.
6. **Vale para trás também.** A `circuito.json` para de declarar o backend por ferramenta e passa a ler a mesma rota; a `arquitetura.html` deixa de afirmar quem é a casa das quatro tabelas e aponta para o Mapa da Integração.

## Considered options

- **Manter o padrão do Mapa do SOP (carimbo mais script de conferência):** rejeitado para ferramentas. É exatamente o que a `circuito.json` faz, e o resultado foi cinco dias de mentira sem sinal nenhum. O carimbo funciona para o prompt porque o prompt só muda quando uma sessão o publica, e a publicação é o momento natural de recarimbar. A ferramenta muda pelo console, por outra sessão, ou por outra pessoa, sem passar pelo repo.
- **A página ler `/api/v1/tools` direto do navegador:** rejeitado. Poria o `AGENTS_API_TOKEN` no HTML servido. O token fica no server, que já o lê do `.env`.
- **A página medir o tamanho das respostas ao vivo, com um botão:** rejeitado por ora. Daria o número sempre fresco, mas faria o Ana OS chamar a API de produção do Hospital, o que a regra do server proíbe. O carimbo com data resolve o problema honesto (não mentir sobre frescor) sem abrir a exceção. Se um dia a exceção for aberta, ela vira ADR próprio.
- **Não fazer a página e só consertar a `circuito.json`:** rejeitado. O conserto sozinho não resolve o que falta, que é o desenho das duas direções entre as duas aplicações, com estado de migração e provas. E a `circuito.json` voltaria a apodrecer na virada seguinte, porque a causa é o padrão, não o valor errado.

## Consequências

- O Ana OS passa a ter dois tipos de dado, e a diferença precisa ficar explícita em cada arquivo novo: o curado (prosa, escrito por gente) e o vivo (buscado na fonte). Página nova que misturar os dois sem separar volta a apodrecer.
- O cockpit ganha uma dependência de rede para renderizar por completo. É aceitável porque ele já é local e já depende do `.env` para a bancada, o Atlas e a conexão TST, e porque a falha é explícita na tela.
- O `smoke-hospital.py` ganha um efeito colateral: além de imprimir, grava a medição. Quem rodar o smoke alimenta a página sem saber, o que é o comportamento desejado.
- A `circuito.json` perde o campo `backend` de cada tool e o `meta.versao_prompt` dela deixa de valer como carimbo das ferramentas (segue valendo para os trechos do prompt).
- Custo aceito: uma página do OS aberta sem o server rodando mostra buracos. O OS nunca foi para ser aberto por `file://`, então isso não muda o uso real.
