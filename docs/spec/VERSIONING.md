# Versionamento

Como a versão da Ana é decidida hoje: não é. Este arquivo existe para quem chega do Hospital ou do IAE procurando a regra.

## Hoje

- **Sem deploy pelo repositório, sem versão de app.** O prompt e as ferramentas da Ana vivem na plataforma fazer.ai agents e mudam por sessão, com aprovação explícita do Pedro. O repositório guarda o histórico do prompt (`ana/prompt/`), a bancada e os scripts, não um app que sobe.
- **A subida termina no merge.** O `fechar_onda.py` mergeia o PR pela API depois do CI verde e para: não calcula versão, não cria tag, não grava `APP_VERSION`, não espera build nem health, não registra em `docs/spec/deploy/history.json`.
- **A regra que manda é a do `project.json`.** Enquanto o `services` de `docs/spec/deploy/project.json` estiver vazio, `/deploy status` diz que não há deploy e a subida trata todo PR como ferramenta. O `last_app_version` do `state.json` fica em `0.0.0`.

## Se um dia houver deploy

Quando algo da Ana passar a subir pelo repositório (um serviço com health check), os serviços entram no `project.json` e vale o esquema do Hospital, de onde o fluxo veio:

- versão semântica `vMAJOR.MINOR.PATCH`, decidida pela subida a partir do tipo dos commits do lote (`feat` sobe o minor, `fix`, `chore`, `refactor`, `docs` e afins sobem o patch, `!` ou `BREAKING CHANGE` sobe o major; vale o mais alto);
- fonte da verdade no `last_app_version` do `state.json`, conferido com a maior tag `vX.Y.Z`;
- nenhum commit de versão no PR: a subida cria a tag no squash.

Nesse dia, reescreva este arquivo e o `/deploy` no mesmo PR.
