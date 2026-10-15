---
status: accepted
date: 2026-07-30
amended_by: 0017, 0028
---

# Ana OS: o portal absorve o roadmap e vira o cockpit único do programa

O portal local de `localhost:8777` deixa de ser "o playground do mundo MV/GH" e vira o **Ana OS**: o cockpit único do Programa Ana, morando na pasta `os/` na raiz do repo, redesenhado por inteiro no estilo do `DESIGN.md` (referência Aaply: canvas cinza claro, amarelo elétrico, botões pill, cards arredondados, tema claro). Ele reúne, numa navegação comum:

- **Home/cockpit**: o roadmap (estágio enxuto + Pendente + faixa nova de **Ideias**) e o painel de aplicações com links.
- **Arquitetura**: diagrama vivo das conexões (Telegram → Chatwoot → fazer.ai agents → NocoDB/Langfuse; futuro WhatsApp oficial), no estilo de fluxo com cards e setas que é a assinatura do DESIGN.md.
- **Mapa das APIs**: endpoints da GH agrupados por tema, cada um com selo de testabilidade derivado da dinâmica dos bancos (leitura de catálogo / escrita no SaaS GH, invisível no Oracle / finalização, único ponto com prova no banco).
- **Playground GH** (bancada + roteiro), **Atlas**, **Absorção** e **Insights**: as páginas existentes, redesenhadas.
- **Biblioteca**: os `.md` do repo renderizados no navegador a partir de allowlist explícita.

O `roadmap/mapa.html` (mesa de trabalho de duplo clique, reconstruída na manhã do mesmo dia) **aposenta** para `roadmap/arquivo/` quando o OS entrar no ar. Os dados do roadmap saem de bloco embutido em HTML e passam a viver num **arquivo JSON versionado** dentro de `os/`; o server ganha **uma única rota de escrita**, restrita a esse arquivo, para a UI criar/editar cards (a faixa de Ideias em particular). Todas as demais regras de segurança seguem intactas: proxy só para homolog GH, Oracle TST somente SELECT, `amostras/` e `dados-locais/` nunca servidos, produção jamais.

Esta decisão **estende o ADR-0004** (a "mesa única" passa a incluir o roadmap e a documentação) e **supersede a decisão do mapa.html de 30/jul/2026** (o duplo clique perde para o endereço único; o roadmap passa a exigir o `server.py` rodando).

## Contexto

- Grilling de 30/jul/2026 (noite): o Pedro quer uma "central de front-ending", um OS da Ana, com roadmap expansivo para ideias, o estudo das APIs organizado por tema (o que dá e o que não dá para testar, dado que só o Oracle TST é consultável e o banco SaaS da GH é inacessível), documentação navegável e o visual do `DESIGN.md`.
- Já existiam duas mesas: o portal (6 páginas) e o mapa.html. Uma terceira central contradiria o próprio ADR-0004; a escolha foi fundir no portal, que já tem servidor com as regras de segurança prontas.
- A organização temática das APIs puxa a metade "catálogo e viabilidade" da pendente GH1; a metade "onde encaixar no fluxo da Ana" segue Pendente para sessão própria.

## Opções consideradas

| Opção | Veredito |
|---|---|
| Terceira central nova agregando links | Descartada: três portas para o mesmo assunto |
| mapa.html cresce e absorve tudo (duplo clique) | Descartada: `file://` não chama API nem lê CSVs; o playground seguiria mundo à parte |
| **Portal evolui e vira o Ana OS** | **Escolhida** |
| Redesign gradual (shell agora, páginas depois) | Recomendada pela sessão, recusada pelo Pedro: ele quer o visual coeso de saída |
| OS 100% leitura (ideias só via sessão) | Descartada: capturar ideia precisa ser gesto de segundos, senão o backlog morre |

## Consequências

- **Riscos assumidos**: o redesign completo de uma tacada reescreve páginas que funcionam (bancada, roteiro); exige teste de fumaça por página antes de aposentar as versões antigas. O roadmap deixa de abrir com duplo clique.
- A regra do CLAUDE.md "atualize os DOIS (TODO.md e mapa.html)" passa a ser "TODO.md e o JSON de dados do OS"; o `/check` reconcilia os dois. Atualizar o CLAUDE.md faz parte da implantação.
- `ana/api-mv/` segue existindo (scripts, dicionário, absorção); só as páginas e o server migram para `os/`, com os caminhos de absorção e da allowlist de docs ajustados.
- Tema claro apenas (o DESIGN.md é light); o dark mode do mapa antigo não é portado.
- GH1 é reformulada no Pendente: sobra a sessão de desenho do fluxo; o catálogo temático vira página do OS.
