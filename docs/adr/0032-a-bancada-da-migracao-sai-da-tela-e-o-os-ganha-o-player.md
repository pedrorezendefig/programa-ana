---
status: accepted
date: 2026-10-09
amends: 0022, 0029, 0030
---

# A bancada da migração sai da tela, os testes manuais viram cenários e o OS ganha o player

Decisão do Pedro (grilling de 09/out/2026, 16 decisões, todas no recomendado): a seção "provas da bancada" (famílias A a E) sai do Ana OS, os testes manuais das capacidades viram cenários da bancada com conversa gravada, e o OS ganha o **player**, uma tela que toca uma conversa real do paciente com a Ana.

## Contexto

- As famílias A a E nasceram para provar a migração do NocoDB para o app do hospital (ADR-0015, ADR-0022). A migração acabou em 19/ago/2026 e o NocoDB está parado. O nível 1.5 (Divergímetro) só compara o app com o NocoDB. A seção ficou confusa: mistura prova de migração encerrada com prova da Ana de hoje.
- 26 das 30 capacidades têm teste manual com a frase do paciente e os campos objetivos (etiqueta, raia, handoff, ferramenta), mas nenhum guarda a resposta real da Ana. Resposta real só existia nos 26 cenários de `ana/bancada/cenarios/integracao.json`, e só da última rodada, num arquivo fora do git.
- O "percorrer a jornada" do Mapa do SOP anda rápido demais e não mostra uma conversa. Os filtros escondem itens mas não levam até eles.

## Decisão

1. **A seção da bancada sai da tela** e vai para `os/arquivo/`. Os cenários B, C, D e E e a família A (manual) viram testes das capacidades dos blocos "A Base Ana" e "Ouvidoria". O Divergímetro morre: `divergimetro.py` vai para `ana/bancada/arquivo/`.
2. **Os testes manuais viram cenários** em `ana/bancada/cenarios/capacidades.json`, rodados pelo `e2e.py` no canal de teste real. A máquina confere só o objetivo (etiqueta, raia, handoff, ferramenta chamada, frases proibidas). O texto "espere" não vira nota automática: o player o mostra ao lado da resposta para o Pedro julgar. Sem juiz por IA.
3. **A conversa gravada fica versionada**: um arquivo por cenário em `ana/bancada/conversas/<id>.json`, dentro do git, sobrescrito a cada bateria. O histórico das rodadas é o `git log`. Os contatos são de teste, sem dado de paciente.
4. **O player** abre por cima da página, fecha com Esc e tem endereço (`#tocar=<id>`, contrato de links do ADR-0029). Paciente em balão cinza à esquerda, Ana em azul-marinho à direita, ferramenta chamada como chip entre os balões, conferência falha em faixa vermelha com "esperado / veio". Avança com "próximo"; o play opcional anda uns 4 s por passo. Cenário sem conversa gravada mostra "nunca rodou" e não toca. Só conversa real, nunca exemplo escrito à mão.
5. **O player aparece em três lugares**: nos testes de cada capacidade, nas jornadas do Mapa do SOP (o "percorrer" vira o player: conversa à esquerda, fluxograma à direita, cada nó acende no turno que o cenário declara, e fica vermelho se a conferência daquele turno falhar) e nas ferramentas (toca o primeiro cenário que a chama, com lista quando há mais de um).
6. **Só no Ana OS.** O Retrato fica sem player por enquanto: o `gerar.py` recusa contato de teste.
7. **Todo filtro leva até a seção**: em todas as abas, o chip filtra e rola até o primeiro item que bate, com um destaque rápido.

## Consequências

- O OS continua só leitura: a bateria roda no terminal, o OS só lê `ana/bancada/conversas/`.
- Cenário de agendamento chama a Global Health em homologação; enquanto a massa não existir, a conversa gravada mostra a saída de escape, e isso é a prova honesta.
- Capacidade sem cenário automatizável (A, D2, D3, manuais) fica sem play e mostra só os passos.
