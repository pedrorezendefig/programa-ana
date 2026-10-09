---
status: accepted
date: 2026-10-09
amends: 0008, 0011, 0028, 0030
---

# O roadmap sai dos arquivos e vai para as Issues do GitHub; o Cockpit lê o `gh`

Decisão do Pedro (grilling de 09/out/2026, na volta depois de quatro semanas parado): os cards do roadmap deixam de viver em `roadmap/TODO.md` + `os/dados/roadmap.json` e passam a ser **Issues do repo privado `pedrorezendefig/programa-ana`**. O Cockpit do Ana OS vira a aba do GitHub: a mesma mesa, o mesmo grafo e o mesmo radar, agora lidos ao vivo pelo `gh`, com os filtros, o funil e o card da issue que o Hospital OS já tem. O `roadmap.json` morre; o `TODO.md` fica só com a narrativa.

## Contexto

- O estado morava em dois arquivos que precisavam concordar sempre, e o `/check` era o fiador do sync. Funcionou, mas custava um ritual por sessão e um arquivo JSON que ninguém lia direto.
- O repo do hospital (`hospital-reunioes`) já roda inteiro em GitHub Issues, com o **Hospital OS** (`tools/workflow-dashboard/`) lendo o `gh` ao vivo: filtros em dropdown, funil por fase, árvore de issues, card com linha do tempo e comentários. A regra de lá: "nada deriva de arquivo o que o GitHub já diz".
- O Pedro quer o mesmo conceito aqui, e quer ver os cards por categoria (Global Health, Ana, fazer.ai, Chatwoot, app do hospital, OS) e atribuir tudo a si para medir o tamanho de cada coisa.
- `propostas` e `pendentes` estavam vazios no `roadmap.json` de 10/set: os dois conceitos morrem sem perda.

## Decisão

1. **O GitHub é a única fonte dos cards.** Issue aberta é card aberto; issue fechada é card feito. Não existe espelho em arquivo. O `roadmap.json` sai de `os/dados/` (a última versão fica em `roadmap/arquivo/`), e a tabela de tarefas sai do `TODO.md`, que mantém só o parágrafo "Estado" e o log.
2. **Categorias são labels `area:`**, seis: `area:global-health`, `area:ana`, `area:fazer-ai`, `area:chatwoot`, `area:app-hospital`, `area:os`. Uma issue pode ter mais de uma. A primeira delas é o tema da faixa no grafo.
3. **O canal da mesa é label `canal:`**, uma por issue aberta, obrigatória: `canal:dispare`, `canal:comigo`, `canal:aguardando`. O "dono" (P/C/E) morre: o canal já diz quem move. A idade no canal ("há N dias") vem da data em que a label foi posta, lida dos eventos da issue; o campo `canal_desde` morre.
4. **O corpo da issue tem seções fixas**, lidas pela aba: `Antes: <ID antigo>` na primeira linha (só nas migradas), `## Destrava`, `## Gesto`, `## Pronto quando`, `## Prompt`, `## Bloqueada por` (uma linha `#N` por dependência, a mesma gramática do hospital) e `## Nota`. Issue aberta sem `## Gesto` ou sem `## Prompt` aparece como defeito no Cockpit, como hoje.
5. **A ficha de conclusão é um comentário** com `## Ficha` e três linhas (`Fez:`, `Mudou:`, `Valor:`), escrito ao fechar. É o que o hover do grafo mostra no nó feito.
6. **O radar é a label `radar`** mais a linha `Prioridade: N/10` no corpo. Fica fora do grafo e fora do termômetro, como antes.
7. **O estágio é um milestone.** Toda issue do estágio entra nele; ao fechar o estágio, fecha o milestone e nasce outro. Para os próximos estágios isso substitui o `roadmap/arquivo/`.
8. **O termômetro é issues fechadas sobre o total**, sem contar `radar`. O `/check` mede pelo `gh`, não mais por arquivo.
9. **O Cockpit vira a aba do GitHub**, no lugar, não ao lado. Mesa, grafo e radar ficam e ganham o que o Hospital OS tem: filtros (canal, área, estado, busca, com a contagem em cada opção), o funil (um card com o total pendente e um por canal) e o card da issue com o corpo, a linha do tempo e os comentários. Sem aba de PRs nem de Produção: o repo da Ana não usa PR.
10. **O OS continua só leitura.** Criar issue, mover canal e fechar seguem gestos de sessão no terminal, agora via `gh` em vez de editar JSON. O `/check` lê o `gh` e perde a reconciliação de dois arquivos.
11. **O servidor monta o mesmo JSON de antes a partir do GitHub.** A rota `/api/roadmap` continua existindo com a mesma forma (`estagio`, `tarefas`, `radar`, `mesa`, `prompt`, `deps`, `ficha`), agora preenchida por `gh issue list` e pelos eventos de cada issue, com cache curto em memória. O grafo e a mesa quase não mudam; o que muda é a fonte.
12. **Migração em 09/out/2026:** as 8 issues abertas e as 3 do radar nascem atribuídas ao Pedro; as 3 feitas (OS25, OS27, OS28) nascem e fecham na hora, com a ficha no comentário, para o estágio continuar em 3 de 11. As datas de `canal_desde` anteriores a hoje se perdem (a idade recomeça na data da label): perda aceita.

## Alternativas rejeitadas

- **Manter os arquivos e espelhar no GitHub:** três fontes para desincronizar em vez de duas. Rejeitada.
- **Sexta aba só para o GitHub, Cockpit intacto:** duas telas do mesmo roadmap. Rejeitada.
- **Ler as issues do repo do hospital dentro do Ana OS:** as 20 abertas de lá não tocam a Ana, a GH nem a fazer.ai. Rejeitada.
- **Não criar as issues já feitas:** o termômetro cairia para 0 de 8 e o estágio perderia o histórico. Rejeitada.

## Consequências

- O `/check` muda de rotina: passo 0 mede pelo `gh`; os passos 4, 8 e 9 (reconciliar e escrever os dois arquivos) somem; card novo, canal movido e card feito viram comandos `gh` na sessão.
- O Retrato não muda: ele nunca mostrou o roadmap (ADR-0028, decisão 3).
- Sem rede ou sem `gh` autenticado, o Cockpit mostra o motivo em vez da mesa. O OS é o lugar do agora (ADR-0017), então não há cache em disco.
- O repo tem que continuar privado: os corpos das issues citam o hospital, o ambiente de homologação e os nomes das ferramentas.
- A seção `## Prompt` é texto que o Pedro cola numa sessão do Claude Code. Quem escreve numa issue escreve, na prática, uma instrução para a sessão. Hoje só o Pedro tem acesso de escrita ao repo; se entrar colaborador, revisar o prompt antes de colar vira regra, e o Cockpit mostra quem editou por último na linha do tempo.
- O `os/server.py` só aceita pedidos com `Host` local (localhost ou 127.0.0.1): barreira contra DNS rebinding, já que as rotas passam a expor o conteúdo das issues e o detalhe de cada uma.
