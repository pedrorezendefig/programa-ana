# Prompt: time de agentes executa o roadmap inteiro (modo autônomo)

> Cole o bloco abaixo numa sessão fresca do Claude Code na raiz do repo.
> Origem: decisão do Pedro em 06/ago/2026, sessão da V12 ("loop engineering: sem bloqueante, sem intervenção minha, entregue").

---

Quero que você execute, em modo totalmente autônomo e usando um time de agentes em paralelo (use workflow/subagentes), todos os cards acionáveis do roadmap do Programa Ana. Eu não vou responder nada durante a execução: toda pergunta que surgir você decide sozinho pela opção recomendada e registra a decisão para eu revisar depois. Ao final, escreva o arquivo `resumo.md` na raiz do repositório e commite tudo.

## Antes de começar (leitura obrigatória, nesta ordem)

1. `CLAUDE.md` (raiz) e `CONTEXT.md`: regras da casa e glossário. Atenção aos termos Fachada de agenda, Paciente-sonda, Prova no banco, Finalização do agendamento, Cadeias.
2. `roadmap/TODO.md` (estado narrativo, ficha da V12) e `os/dados/roadmap.json` (os prompts oficiais de cada card vivem aqui: leia o campo `prompt` de cada um antes de executá-lo).
3. `docs/adr/0009-desenho-fluxo-gh.md` (o desenho da fachada de agenda que rege P5/P8).

## O mapa dos cards e o modo de execução de cada um

Ondas: dentro de uma onda os agentes rodam em paralelo; entre ondas, sequencial. Mutações na plataforma fazer.ai (tools, grants, prompt do agente) são SEMPRE serializadas: nunca dois agentes mexendo na plataforma ao mesmo tempo.

**Onda A (paralela, áreas disjuntas):**
- **P7** (proposta): mapa visual do SOP no Ana OS. Executar por inteiro seguindo o prompt do card (SVG à mão, visual do `os/DESIGN.md`, dados em `os/dados/sop-fluxo.json`, hover com o trecho literal do prompt v5.1 do agente, raias por jornada, versão do prompt carimbada). O "esboço para eu aprovar" do prompt vira decisão autônoma: monte o esboço, escolha a melhor estrutura e siga.
- **V8** (radar): verificar o hotfix do Chatwoot (só leitura: testar `/labels` e `/agent_bots`, conferir logs). NÃO redeployar nada; se o hotfix tiver evaporado, reaplicar a correção de 1 linha conforme a memória `fazer-ai-agents-instancia` e a ficha da V8.
- **OV1** (pendente): decidir o mecanismo de protocolo da ouvidoria em modo autônomo. Recomendação a seguir: protocolo sequencial numa tabela nova do NocoDB da Base Ana (formato ANO-NNNN), lido/gravado por tool HTTP; se a implementação exigir escrita autenticada no NocoDB que não dê para fazer com segurança sem segredo novo, implemente só o desenho (ADR + tabela criada + tool de leitura) e deixe a escrita documentada como pendência no resumo. Registrar a decisão como ADR novo.

**Onda B (sequencial, porque as duas mexem no prompt e nas tools do agente id 1):**
- **P8** (proposta): cadastro de paciente (`POST /pessoas`). Seguir o prompt do card. Regras duras: nome SEMPRE com prefixo TESTE (a API recusa nome com números: usar alfabeto fonético para variar), CPF sintético com dígito verificador válido, nunca dado real. Reusar a credencial `gh-homolog-token` do vault. `input_schema` no formato compacto nativo (achado da V12: JSON Schema padrão quebra a interpolação nesta instância). Prova no playground com trace nos logs.
- **P5** (proposta): horários livres na conversa. A GH-19 (massa de homolog vazia) impede a vitrine com slots reais: executar a MECÂNICA por inteiro (tools/proxy criados, prompt ajustado, tratamento de lista vazia provado no playground) e registrar que a vitrine destrava sozinha quando a Global Health publicar a massa. Sobre o proxy fino do ADR-0009: se a cadeia de chamadas couber em tools HTTP diretas com o que a plataforma suporta, prefira tools diretas nesta fase e documente o desvio consciente do ADR; só suba serviço novo no Coolify se for indispensável, e sem tocar em nenhum serviço existente.

**Bloqueados por fator externo (NÃO executar; documentar no resumo com evidência fresca):**
- **P3** (prova GH-18) e **P2** (religar VPN da TST): a VPN está caída desde 13/jul e religar depende da TI do hospital. Rode `python3 ana/api-mv/scripts/query-mv.py "SELECT 1 FROM DUAL"` uma vez para registrar o erro atual como evidência e siga em frente.
- **P6** (fim a fim): depende de P5 completa e P3. Além disso, finalização NUNCA roda em modo autônomo (regra abaixo).
- **V7** (radar, token Cloudflare): só o Pedro pode declarar o fim do uso. Pular, uma linha no resumo.

## Regras inegociáveis (valem para todos os agentes)

1. Somente homologação (`dem.agenda.globalhealth.mv`). Produção jamais, em nenhuma ferramenta.
2. NUNCA executar finalização: `POST /horarios/agendar`, `POST /horarios/reagendar`, `DELETE /agendamentos/{id}`. Nem no playground.
3. Oracle TST: somente leitura via `query-mv.py` (e a VPN está caída; não insistir).
4. Escrita na GH homolog: só cadastros de teste (prefixo TESTE, CPF sintético). O paciente-sonda (CPF 66301102770, id 1681) nunca é alterado nem apagado.
5. Chatwoot congelado (decisão de 06/jul): não criar/renomear etapas, tags ou inboxes.
6. Segredos nunca em prompt de agente, arquivo, commit ou saída de chat. Credencial GH existente: `gh-homolog-token` no vault (reusar; não criar credencial nova, o classificador de permissão bloqueia `credential_create` real).
7. Mutação na plataforma fazer.ai sempre com `dry_run` primeiro; conferir o preview antes de aplicar. Prompt do agente: após `prompt_set`, verificar por hash contra o texto pretendido (o resultado grande fica salvo em arquivo; compare o campo `diff.systemPrompt.after`).
8. Playground pelo MCP estoura timeout em turnos longos: o turno continua rodando no servidor. Prova de execução vem de `logs_query` (source playground, stage tool), com paciência de 1 a 3 minutos para indexar. Nunca reenviar mensagem achando que falhou sem checar o log.
9. `dados-locais/` e `resultados/amostras/` jamais em commit.

## Perguntas, grills e aprovações

Todo trecho de prompt de card que pedir entrevista, aprovação ou "espere o Pedro" vira decisão autônoma: escolha a opção que você recomendaria, execute, e registre em três lugares: na ficha do card no TODO.md (marcada como "decisão autônoma, a revisar"), no CONTEXT.md quando criar/alterar termo do domínio, e no `resumo.md`. Precedente da casa: a GH1 foi executada assim em 06/ago (ADR-0009).

## Registro e commits

- Cada card concluído (ou parcial) atualiza os DOIS espelhos: `roadmap/TODO.md` e `os/dados/roadmap.json` (mesmo ID; proposta puxada vira tarefa V13, V14... com status; card bloqueado ganha nota datada). Propostas e prompts que você não tocar devem ser preservados.
- Commits são feitos SÓ pelo orquestrador (nunca por subagente), um por card, na convenção do histórico (`git log`): minúsculas, prefixo da área, mensagem em pt-BR.
- Sem push: commits locais apenas.

## Entrega final: `resumo.md` na raiz

Escrever ao final (e commitar) com estas seções, em linguagem simples:
1. **O que foi entregue** (por card: o que existe agora e onde, com a prova).
2. **Decisões autônomas tomadas** (o quê, por quê, onde revisar).
3. **O que travou** (por card: causa, evidência, o que foi tentado).
4. **Correções no caminho** (bugs achados, como foram corrigidos).
5. **Estado da plataforma ao final** (tools, prompt do agente e versão, grants).
6. **Próximos passos recomendados** (o que só o Pedro pode destravar, em lista de ação).

Regra de estilo em tudo que for escrito: nunca usar travessão ou meia-risca; reescrever com vírgula, dois-pontos ou parênteses.
