# Notas do fluxo: Ana

O que só o programa da Ana tem, por cima do pacote do fluxo. Cada seção `## <skill>` é lida por `python3 .claude/skills/onda-enxuta/scripts/fluxo.py notas <skill>`. Fonte: PedroOS, `projetos/ana/fluxo-notas.md`; o instalador copia para `.claude/fluxo-notas.md`. Edite lá, não aqui.

## onda-implementador

Fatia que fala com o Oracle do MV ou com a Global Health usa só a base TST e a homologação, nunca produção.

## onda-revisor

Lentes extras, só must-fix:

- **Código:** travessão ou meia-risca no prompt da Ana, num roteiro da bancada ou numa página que o diretor lê.
- **Segurança:** token ou segredo em código, log ou resultado gravado (token da Global Health, credencial do Oracle, token da plataforma fazer.ai, do Chatwoot ou do Langfuse); dado de paciente (nome, CPF, telefone, carteirinha, prontuário) em arquivo versionado, amostra fora de `ana/api-mv/resultados/amostras/` ou saída de script. Chamada a produção é must-fix sempre: o Oracle do MV só na base TST e só `SELECT`/`WITH` (pelo `ana/api-mv/scripts/query-mv.py`), a Global Health só homologação; script que escreve no banco, aponta para URL de produção ou lê credencial de produção do `.env` impede o merge.
- **Com `Sensível:`** (script que fala com o Oracle, com a Global Health ou com a plataforma, ou mudança no prompt da Ana): filtro de somente leitura afrouxado no `query-mv.py`, SQL montado com entrada sem validação, URL de ambiente ou ID de tarefa que o `retrato/gerar.py` recusaria, dado de outro paciente devolvido pela ferramenta, e regra do prompt que deixa a Ana prometer, agendar ou informar o que a issue não pediu.
- **Perigo do merge:** porta "duas vias" num diff com envio externo (WhatsApp, Chatwoot, Global Health) ou mudança no prompt da Ana é must-fix (perigo subdeclarado).

## ship

- **Sem deploy:** a Ana não tem deploy pelo repositório; a subida termina no merge. Mudança no prompt ou nas ferramentas da Ana na plataforma fazer.ai é ato do Pedro, com aprovação explícita, fora da subida.
- **Pendência só humana:** credencial, ato na plataforma fazer.ai, resposta da Global Health.
