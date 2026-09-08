# Chatwoot da fazer.ai: a leitura das versões

> Documento **vivo** (ADR-0024). Guarda o que só uma pessoa sabe: o que cada versão do Chatwoot significa **para a Ana**. Não guarda o placar de versões, que é vivo e apodrece: para saber onde a instância está agora, rode
>
> ```bash
> python3 ana/plataforma/scripts/fetch-chatwoot-releases.py
> ```
>
> ou abra o Mapa da Integração do Ana OS, que faz a mesma pergunta na hora.
>
> **Fronteira:** aqui é só o **Chatwoot** (`chatwoot.mala-ia.cloud`, edição Pro da fazer.ai). A **plataforma fazer.ai agents** (`agents.hospitalsaomatheus.cloud`, hoje 1.4.1) é outro produto, com outra numeração e outras notas; os achados dela vivem no radar V10, não aqui.

## A lente

Cada release nova responde quatro perguntas. Se não bate em nenhuma, não entra neste arquivo.

1. **Toca o caminho da Ana?** Bot, `agent_bot`, chamada de API por token, tags, inbox, handoff.
2. **Toca a evidência?** O que a bancada e o roteiro conferem no Chatwoot: etapa do kanban, tag, avisos de status.
3. **Toca o que o hospital vê?** Filas, abas de atribuição, permissões, quem pode apagar mensagem.
4. **Muda contrato que o `ana/bancada/e2e.py` usa?** A inbox de API "Ana E2E" fala pela Public API.

Onde ler: <https://fazer.ai/chatwoot-release-notes>. A página mostra só as 5 mais novas e esconde o resto atrás de um "Load more"; o script acima desempacota o acervo inteiro do HTML.

## A leitura de 26/ago/2026 (primeira, cobrindo fev a ago/2026)

Situação medida no dia: instância em `4.16.0-fazer-ai-pro.111` (de 29/jul/2026, o onboarding), última publicada `v4.17.0-fazer-ai-pro.120` (25/ago/2026), **9 versões de atraso**. Acervo lido: 148 releases (81 Pro, 67 CE), de 18/fev a 25/ago/2026.

### O que está na frente da instância

| Versão | Data | O que muda para a Ana | Lente |
|---|---|---|---|
| `.119` | 25/ago | **"Conversas que o bot deixava sem resposta."** Uma lentidão momentânea tirava a conversa do bot e ela ficava muda por mais que o paciente insistisse. Agora só sai do bot quando a entrega falha de verdade. | 1 |
| `.112` | 31/jul | **"Erros com token de acesso da API"** ao gerenciar **bots, etiquetas** e Captain. É a descrição exata do bug que o hotfix do radar **V8** remenda (500 em `/agent_bots` e `/labels`). Ver a ressalva abaixo. | 1 |
| `.120` | 25/ago | Conversa que está com um bot **sai da aba "Não atribuídas"** e passa a aparecer em "Todas", batendo com o contador. Muda a fila que a secretária enxerga. | 3 |
| `.116` | 17/ago | Resposta do agente aparecendo **duas vezes** no WhatsApp quando a confirmação de envio se perdia. Também: template de WhatsApp com imagem ou vídeo no cabeçalho voltou a ser aceito pela Meta. | 1 |
| `.115` | 14/ago | **Avisos de status somiam do histórico.** "Conversa resolvida", "reaberta" e mudanças de atribuição desapareciam ao recarregar a página. Isso é prova de handoff que evaporava na tela. Também: trava opcional de atribuição por quem atendeu primeiro (nasce desligada). | 2 |
| `.112` | 31/jul | Fim de conversa duplicada quando o mesmo contato fala por mais de um identificador do WhatsApp. | 1 |
| `.118` | 23/ago | WhatsApp mais confiável em envios, edições, reações e anexos. Mensagem que não consegue sair agora aparece como **falha** em vez de parecer entregue. Também: provedor novo **uazapi** (beta). | 1 |
| `.119` | 25/ago | Mensagem que chegou com a caixa desconectada entra aberta na fila quando ela volta, em vez de sumir. Também: histórico das conversas do celular ao conectar uma caixa Baileys. | 1 |
| `.113` | 12/ago | Filtro **"Está presente" / "Não está presente"** para atributo customizado em conversas, contatos e cards. Serve para achar o que ninguém tabulou. | 3 |

### O que já está instalado e vale lembrar

- **`ce.83` (09/jun):** número brasileiro com e sem o nono dígito resolve para o **mesmo contato**, e a resposta cai na conversa original. A instância já tem. Importante porque `{{contact_phone}}` chega às tools da Ana em E.164 e contato partido quebraria a busca por telefone (tools 5 e 6).
- **`ce.63` (01/mai):** administrador do sistema pode **esconder as abas "Não atribuídas" e "Todas"** para agentes. É a alavanca para desenhar a tela da secretária quando a Ana entrar no canal principal, e interage com a mudança da `.120`.
- **`pro.81` (01/mai):** permissões granulares de Chat Interno e Kanban por função personalizada.
- **`pro.110` (25/jul):** dá para impedir agente comum de **apagar mensagem**, mantendo o histórico inteiro. Relevante para trilha de auditoria num hospital.
- **`pro.99` e `pro.100` (jun):** automações de funil bem mais completas e a seção de relatórios de funil. Só valem depois que o Congelamento do Chatwoot terminar.

### As cautelas

1. **O `.112` não é prova de que a V8 morreu.** Em 06/ago a inspeção do fork CE mostrou o bug `Current.account` vivo em `v4.16.2-fazer-ai.91`, que é justamente a base CE da `.112`. Ou o fix é do lado Pro (repositório privado, não inspecionável daqui), ou a nota fala de outro caminho. **A prova é o teste depois de subir**, nunca a leitura da nota.
2. **Subir apaga o hotfix.** A correção de 1 linha em `app/controllers/api/v1/accounts/base_controller.rb` vive dentro do container e não sobrevive a um pull. Anotar o digest da imagem atual antes, como a V17 fez com o `agents-pro`.
3. **O caminho cruza três merges oficiais** (Chatwoot 4.16.1, 4.16.2 e 4.17.0), então tem migração de banco.
4. **A `.120` muda a fila.** Combinar com o hospital antes, se alguém já usa a aba "Não atribuídas" para saber o que precisa de gente.
5. **Congelamento do Chatwoot.** A decisão de 06/jul congela **configuração** (etapas, tags, estados, nomes) durante a fase de testes. Subir versão não é configurar, então não conflita, mas a `.120` muda comportamento de fila sem ninguém configurar nada: é exatamente o tipo de coisa que o congelamento existe para não deixar acontecer de surpresa.
