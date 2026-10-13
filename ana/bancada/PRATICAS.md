# Práticas de teste da Ana

O que a skill `/testes` lê antes de montar ou revisar um cenário. Edite quando aprender algo novo; mantenha cada prática em um parágrafo curto, com o motivo.

## O que faz um bom cenário

1. **Um comportamento por cenário.** O cenário prova uma regra do SOP (um nó ou um caminho curto), não uma jornada inteira. Jornada inteira falha por dez motivos e não diz qual. O título diz a regra em uma frase.

2. **Gabarito objetivo primeiro, texto depois.** A máquina confere etiqueta, raia, handoff, ferramenta chamada e frase proibida. O `espere` em texto é para o humano ler a conversa gravada. Cenário que só tem `espere` não reprova nunca: cada cenário precisa de pelo menos uma conferência objetiva.

3. **Frase proibida vale mais que frase obrigatória.** A Ana muda a redação a cada rodada; o que não pode aparecer (CPF antes da urgência, valor com ponto decimal, nome de outra especialidade) é estável. `contem` literal só para dado fixo (um preço, um protocolo).

4. **Ferramenta esperada e ferramenta proibida.** Declare `tools` que precisam aparecer no trace. Para regra do tipo "não chama ferramenta sem pedido explícito" (nó E9), o cenário espera `tools: []` no turno.

5. **Estado final conferido.** Etiqueta, raia pelo trace e handoff no `confere`. Conversa de API não tem card no kanban: a raia vem do último `kanban_move_card` do trace (armadilha 6 do README).

6. **Dados de teste, nunca de paciente.** CPF e nome de teste, contato `TESTE BANCADA ANA <id>`. A conversa gravada vai para o git.

7. **O cenário manda o que um paciente mandaria.** Erro de digitação, mensagem curta, duas perguntas numa só, áudio transcrito mal. Mensagem bem escrita demais testa o prompt no melhor caso.

## Que cenários montar primeiro

8. **Buraco de cobertura antes de variação.** Nó do SOP sem cenário vale mais que o quarto cenário do mesmo preço. O relatório lista os nós e as capacidades sem cenário.

9. **Regra que mudou no prompt na última versão.** Cada mudança de prompt pede um cenário que prove a mudança e um que prove que o vizinho não quebrou (o "risco para os que passam" do diagnóstico).

10. **Entrada hostil e ambígua.** Paciente que pede duas coisas, que muda de assunto no meio, que insiste depois da recusa, que manda dado antes de ser pedido, que pergunta se é robô no meio da coleta. Um cenário por padrão.

11. **O caminho de erro.** GH fora, timeout, busca vazia, registro que falha (nós O12, S9, X8). São os nós menos testados e os que mais aparecem em produção.

12. **Despedida e encerramento.** Cenário que termina com a despedida espontânea do paciente, para provar que a Ana encerra e não reabre.

## Intermitência

13. **Três rodadas, sempre.** Um resultado só não separa regra quebrada de sorte. Falha em 3 de 3 é regra do prompt; falha em 1 de 3 é instrução fraca, ambiguidade ou dependência de tempo (horário, dia da semana).

14. **Cenário com hora.** Regra que depende do horário (tag `fora-horario`, `MENSAGEM_FDS`) só roda certo na janela certa. Anote no cenário a janela e deixe `manual` fora dela.

15. **Cenário exigente demais é bug do cenário.** Se a Ana faz o certo de um jeito que o gabarito não previu, ajuste o gabarito, não o prompt. Reescreva antes de abrir issue.

## Quando apagar ou reescrever

16. **Nunca falhou em dez rodadas e não cobre nó único:** candidato a apagar ou a ficar mais exigente.

17. **Dois cenários com os mesmos nós e as mesmas conferências:** deixe o que tem a entrada mais parecida com paciente de verdade.

18. **Cenário que cita regra que saiu do prompt:** reescreva ou apague no mesmo commit da mudança do prompt.

19. **Cenário que depende de dado que o hospital edita** (preço, convênio): o `espere` cita o valor; marque `atencao` com onde o valor vive, para a próxima pessoa saber por que mudou.
