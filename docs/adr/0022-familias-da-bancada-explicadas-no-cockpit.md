---
status: accepted
date: 2026-08-24
amends: 0019
---

# As famílias da bancada ganham página própria no cockpit

Decisão do Pedro (24/ago/2026): os códigos A1, C1b, D5, E3 apareciam no cockpit sem explicação de onde vêm nem do que provam. Nasce a página **Famílias da bancada** (`os/familias.html`, a décima primeira do menu), que explica cada família por dentro: a promessa que ela vigia, a anatomia de cada cenário e o histórico das rodadas.

## Contexto

- O roteiro `roadmap/roteiro-integracao-hospital.md` define as cinco famílias (A espelho, B formato, C cobertura, D ouvidoria, E robustez), os cenários de cada uma e o registro das rodadas (18 a 21/ago/2026). É prosa longa, feita para quem executa, não para quem quer entender o mapa.
- A página Testes manuais lista os cenários da bancada como testes rodáveis, mas não explica o que uma família significa, por que existe, nem o que já passou em qual rodada.
- O Pedro esbarrou nos códigos (E1, D4, E3) sem conseguir responder "isso é o quê? devo me preocupar?": a resposta existia, espalhada em 400 linhas de roteiro.

## Decisão

1. **Nasce `os/dados/familias.json`**, curadoria do roteiro: por família, a promessa, o peso (bloqueante ou ajuste) e a explicação; por cenário, os passos (monte, edite, envie, espere, falha se, reverta), o perigo quando toca produção, as variantes por tabela, o histórico por rodada datada e a situação de hoje. O roteiro segue sendo a verdade; o JSON é o espelho curado para o OS, na linha do ADR-0017 (rodada nova no roteiro pede atualização da curadoria).
2. **Nasce a página Famílias da bancada**, exceção consciente ao teto do ADR-0019 pela mesma régua do ADR-0020: trabalho novo (entender o porquê, não rodar), dado derivado, página que não guarda nada.
3. **A anatomia é visual:** cada cenário abre num stepper de passos com cores por tipo (preparo, envio, esperado, falha), aviso de perigo em destaque, variantes com bolinha de estado, e o histórico das rodadas em linha do tempo. Cenário da bancada linka para a página Testes (busca pelo id); cenário manual é marcado como tal.
4. **Divisão de trabalho:** a página Testes responde "o que eu rodo agora"; a Famílias responde "o que essa prova significa e como ela está". Uma lista, a outra explica.

## Considered options

- **Explicar as famílias dentro da página Testes:** rejeitado. A Testes é uma lista de execução compacta; a anatomia (passos, rodadas, perigos) a deixaria pesada de novo, desfazendo a OS21.
- **Linkar direto para o roteiro em markdown:** rejeitado. O roteiro é a fonte e continua, mas 400 linhas de prosa não respondem "devo me preocupar com o E1?" num olhar.
- **Derivar o JSON automaticamente do markdown:** rejeitado. O roteiro é prosa livre; um parser quebraria em silêncio. A curadoria é pequena (5 famílias, 18 cenários) e muda só quando há rodada nova.

## Consequências

- O menu vai a 11 páginas. A régua de entrada segue a do ADR-0020: trabalho novo, dado derivado, página sem estado.
- Rodada nova registrada no roteiro pede a atualização de `familias.json` (vereditos e situação de hoje). É curadoria consciente, não automática.
- O CONTEXT.md ganha o verbete Famílias da bancada; o CLAUDE.md passa a listar 11 páginas.
