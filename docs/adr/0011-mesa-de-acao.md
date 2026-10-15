---
status: accepted
date: 2026-08-11
amended_by: 0028, 0031
---

# A home do Ana OS ganha a Mesa de ação: cards abertos agrupados por canal (dispare / comigo / aguardando), com ficha de hover e prompt por canal

Nasce da tarefa **OS12** (grilling de 11/ago/2026). A home do Ana OS substitui os dois cards de destaque ("fronteira" e "próxima proposta") pela **Mesa de ação**: todos os itens abertos do roadmap (tarefas a fazer, pendentes, propostas e radar) agrupados por **canal de ação**, respondendo a pergunta que a home não respondia: "o que eu toco agora, e o que está na mão de quem".

## Contexto

- Com o grafo limpo (nenhuma tarefa aberta em 11/ago), a home mostrava "estágio limpo" e apontava a P3 como "próxima proposta destravada". Verdade estrutural (a P3 não tem deps no grafo), mentira prática (a P3 espera a VPN da TST, caída desde 13/jul). **A home não sabia o que é externo.**
- A espera externa mais importante do programa (a GH-19, massa da homolog pedida em 07/jul) não era card em lugar nenhum: vivia em notas. Uma mesa de ação que não mostra a espera de 35 dias falha no propósito.
- O ritual `/check` já organiza o relatório em três canais (dispare hoje / sente comigo / aguardando terceiros), mas esse juízo morria no chat: não era dado.
- Vários itens abertos já tinham `prompt` no estilo certo (o da P2 guia a cobrança da VPN; o da V7 guia o painel da Cloudflare). Faltava o resto da estrutura.

## Decisões

| Decisão | Alternativa descartada | Por quê |
|---|---|---|
| **Mesa na home**, substituindo os destaques | Reformular a página Roadmap | O gesto diário é "o que toco agora" (home); o grafo responde "como se encadeia" e acabou de ganhar filtros (OS9) |
| **Três canais**: `dispare` / `comigo` / `aguardando` | Dois (externo/interno) | "Cobrança pronta não enviada" (dispare) e "enviado há 35 dias" (aguardando) são gestos diferentes; fundir os dois esconde exatamente o que a mesa quer mostrar |
| **Campo explícito `canal`** (+ `canal_desde`), curado por sessões e reconciliado pelo `/check` | Derivar de `dono`/`deps` | Propostas e radar não têm dono; o mesmo item muda de canal sem mudar de dono (P2 é dispare até a mensagem ir, aguardando depois); canal é juízo de situação, não atributo estrutural |
| **A GH-19 vira card** (pendente `GH19`) | Seguir como nota | Radar é "não impacta o objetivo" e a GH-19 impacta; pendente é a faixa das dívidas conscientes |
| **A UI move canal** (`canal`/`canal_desde` em item aberto, nada mais) | UI somente leitura (regra do ADR-0007: só Ideias) | O "enviei a mensagem" acontece fora de sessão; esperar o /check perde a data real, e "aguardando há N dias" depende dela. Ampliação cirúrgica: a UI não cria, não conclui, não edita título nem prompt |
| **Ficha de hover curada** `mesa {destrava, gesto}` por item aberto | Nota truncada no hover | A nota é registro denso; o hover precisa responder "por que eu tocaria nisso agora" e "qual o gesto", que não são deriváveis com confiança |
| **Sem histórico por card** | Log de movimentos estruturado | `canal` + `canal_desde` + o log do TODO.md já contam a história; um segundo histórico seria mais uma narrativa a sincronizar |
| **Card sem prompt é defeito visível** ("sem prompt ainda") | Botão simplesmente ausente | Defeito silencioso não gera correção |

## O contrato dos campos novos (itens abertos de qualquer faixa)

```
"canal":       "dispare" | "comigo" | "aguardando"
"canal_desde": "AAAA-MM-DD"  (quando o item entrou neste canal)
"mesa": { "destrava": "o que fechar este card libera",
          "gesto":    "o próximo movimento concreto" }
```

- Item **concluído** perde `canal`/`canal_desde`/`mesa` (e `prompt`, regra que já existia): a mesa é só de abertos.
- O prompt é **um por card**, rotulado pelo canal na UI: `dispare`/`aguardando` ganham "prompt de terminal" (a sessão guia ou redige a ação externa); `comigo` ganha "prompt de sessão" (executa a tarefa).
- O `/check` passa a ser fiador de `canal`, `canal_desde` e `mesa` na reconciliação, como já era de propostas e prompts.
- O server valida os campos novos; a regra do ADR-0007 fica reescrita: **a UI escreve Ideias e move canal de item aberto**. Todo o resto continua sendo ato de sessão.

## Sobre "nada deveria depender do externo"

Questionado no grilling e respondido com evidência: a documentação da API sustentou **construir** tudo (as 6 tools GH existem e estão costuradas no prompt), mas não substitui horários reais (não existe POST de catálogo na API GH, provado ao vivo em 06/ago/2026) nem a Prova no banco (VPN). O que sobrou de testável sem externo virou a tarefa **V16** (mini-roteiro GH no canal de teste: os fluxos das V12/V14/V15 nunca rodaram fora do playground). A ideia de massa simulada (mock para ensaiar o caminho feliz A1) foi **guardada na faixa de Ideias, não executada**: provaria o prompt contra um contrato imaginado, e a resposta verdadeira chega de graça quando a massa for publicada.

## Consequências

- A home passa a mostrar idade de espera ("aguardando há N dias"), o que cria pressão saudável de cobrança; o custo é curadoria: canal desatualizado mente, e a mitigação é o `/check` reconciliar a cada rodada.
- Dois campos curados novos (`canal`, `mesa`) entram no contrato do `roadmap.json`; sessões que concluem tarefa precisam removê-los junto com o `prompt`.
- A rota de escrita da UI cresce pela primeira vez desde o ADR-0007. O escopo estreito é deliberado; qualquer nova ampliação merece novo debate.
