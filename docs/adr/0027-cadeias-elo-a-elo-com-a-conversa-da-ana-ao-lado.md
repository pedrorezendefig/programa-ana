---
status: accepted
date: 2026-09-08
amends: 0020
---

# As Cadeias rodam elo a elo, e cada elo mostra a conversa da Ana ao lado

Decisão do Pedro (08/set/2026): a página Cadeias do Ana OS deixa de ser só "rodar a história inteira e ler o placar". Cada elo passa a rodar sozinho, mostrar de onde veio cada valor de entrada e para onde vai cada valor de saída, e ter ao lado a conversa da Ana naquele momento: a fala do paciente, as ferramentas que ela chama e a mensagem que ela responde.

## Contexto

- Na manhã de 08/set o Pedro testou a Ana no Telegram e ela devolveu três horários reais de Cardiologia. A pergunta que veio em seguida não era "funcionou?", era "**como** ela achou isso? o que saiu de uma chamada e entrou na outra? por que 14 dias? por que o plano id 2?". A resposta existia nos logs da plataforma, mas espalhada em quatro chamadas com JSON cru.
- A página Cadeias (ADR-0007, OS8) já encadeava as chamadas, mas escondia a ligação: o botão rodava tudo de uma vez e o leitor via o veredito, não o id atravessando de um elo para o outro. E a Cadeia D ainda estava escrita para o mundo de 06/ago (bloqueada na GH-19, dois ids no `/agendas/v2`), quando desde 26/ago a cadeia tem quatro elos e três ids (V33).
- O Pedro quer testar "ponto a ponto, na própria página, simulando", em todos os cenários que a Ana cobre: consulta, exame, agendamento e cancelamento. E quer ver, pareado, o que estaria acontecendo na conversa enquanto a ferramenta roda.

## Decisão

1. **Cada elo é executável sozinho.** Botão "Rodar elo" por elo, "Rodar tudo" por cadeia, "Recomeçar" apaga o contexto. O contexto da cadeia (os ids guardados) sobrevive entre cliques, então o elo 4 só destrava depois dos elos 1 a 3. Elo sem pré-requisito aparece bloqueado com o motivo escrito ("precisa do id do plano").
2. **Entrada com origem, saída com destino.** Antes de rodar, cada elo lista os campos que vai mandar com o valor atual, de qual elo veio e por quê (a regra da tool ou do prompt que manda usar aquele valor). Depois de rodar, lista o que saiu e para qual elo segue. É a resposta visual à pergunta "o que de um output entrou como input do outro".
3. **A conversa da Ana pareada.** A coluna direita de cada elo mostra o paciente, as ferramentas chamadas naquele momento (com o selo de origem do ADR-0018 e a marca "não tem" quando a Ana não pode chamar) e a mensagem dela. Onde dá, a mensagem é montada com a resposta real do elo (a lista numerada de horários, os nomes dos prestadores). Onde a Ana ainda não tem a ferramenta, a nota diz o que ela faz hoje e onde isso está gated (P6, Seção 2.5 e 2.6).
4. **Elos "só conversa".** Momentos em que a Ana chama outra coisa que não a Global Health (preço na API do Hospital, etiqueta, handoff) entram como elo sem chamada, para a história ficar inteira sem a página deixar de ser de origem única. A faixa do topo passa a dizer "toda chamada desta página é Global Health".
5. **As seis cadeias cobrem o que a Ana faz:** A identificar e cadastrar, B paciente conhecido, C convênio pela agenda (ADR-0025, com horário do convênio), D consulta particular (a conversa real de 08/set, elo a elo, até o handoff e a finalização que não roda daqui), E exame (preço e preparo pela API do Hospital funcionam; a agenda de exame está vazia como a Cardiologia estava antes de 26/ago), F gerir e cancelar (listagem ao vivo; remarcar e cancelar seguem sendo finalização).
6. **Elos compartilhados.** Os quatro elos da Seção 2.3.1 são funções reutilizadas nas cadeias C e D, com a escolha do convênio parametrizada (pelo nome que o paciente disse, ou pela linha Particular). Um único lugar para a regra, dois cenários.

## Considered options

- **Deixar a página como estava e mandar o Pedro ler o log da plataforma:** rejeitado. O log tem os fatos, mas não conta a história nem liga output a input. Foi exatamente a pergunta que a sessão respondeu à mão antes de desenhar.
- **Página nova só para o passo a passo:** rejeitado. A Cadeias já é a página desta pergunta (ADR-0007). Uma página a mais repetiria o proxy, o status e a demo, contra o enxugamento do ADR-0019.
- **Simular a Ana de verdade (chamar o modelo pela página):** rejeitado por agora. A conversa pareada é curada do prompt e da conversa real, não gerada. Gerar exigiria a API da plataforma pela página e mudaria a natureza da tela (de prova de API para playground). O playground existe na plataforma.

## Consequências

- A Cadeia D reflete a realidade de 26/ago em diante: quatro elos, três ids, horários reais. A demo de 5 minutos foi reescrita: o Ato 2 mostra a Ana achando horário, não mais o catálogo vazio.
- Achado registrado na própria página: `GET /horarios/{id}/instrucoes` devolve HTTP 500 com idHorario real (medido em 08/set). Fica como "falha real" no elo D8 e como pergunta à Global Health.
- Achado de regra: duas linhas do `/convenios` têm `particular = true` (Particular e Funcionario). A descrição da tool 13 fala "a linha", no singular. A página escolhe pelo nome; a tool precisa da mesma frase.
- Achado de regra: a tool 14 manda pegar o primeiro plano (Particular Apartamento), sem perguntar. É decisão do programa: perguntar ao paciente ou fixar um padrão.
- `os/dados/grants-medida.json` está carimbado de 19/ago e não conhece as tools 13 e 14 nem a saída da tool 4 do grant (ADR-0025). A página Cadeias não lê esse arquivo (a concessão está na própria curadoria da página), mas o carimbo pede renovação.
