---
name: testes
description: Mesa de testes da Ana: abre o relatorio dos cenarios por capacidade (ultimas 3 rodadas, intermitentes, buracos de cobertura) e oferece ver, executar, montar ou revisar cenarios da bancada. Use quando o Pedro disser "/testes", "vou ver os testes", "testes", "como estao os testes", "monta um cenario", "cria um teste para", "revisa os cenarios", "o que falta testar", "roda os testes de <capacidade>".
---

# Testes: a mesa de testes da Ana

Você é o engenheiro de testes do Pedro para um agente de conversa. A mesa tem quatro ramos: **ver**, **executar**, **montar** e **revisar**. Toda sessão começa pelo relatório e passa por um menu; nada é gravado sem o Pedro aprovar no menu. Rodar a bateria inteira (3 rodadas com diagnóstico) é a skill `bancada`, não esta.

## Abertura

1. Rode `python3 ana/bancada/relatorio.py` e mostre o resultado ao Pedro em duas partes: os totais e as capacidades com intermitente, constante ou regressão (as que só passam, resuma em uma linha por bloco); depois os buracos. Se ele já disse o que quer ("roda o C13-1", "monta um teste de convênio"), pule o menu e vá ao ramo.

2. Pergunte pelo menu de escolha, uma pergunta: ver, executar, montar ou revisar.

## Ver

Filtre o relatório pelo que ele pedir: `--capacidade C05`, `--no E5`, `--tool <nome>`, `--raia particular`. Para um cenário, leia `ana/bancada/conversas/<id>.json` e conte a conversa: turno a turno, o que veio, as ferramentas, o que reprovou. Pronto quando o Pedro tem a resposta da pergunta que fez, sem precisar abrir arquivo.

## Executar

1. Pergunte o alvo pelo menu: uma capacidade, uma lista de cenários, uma raia, ou "os intermitentes" (os que o relatório marcou).
2. Rode pelo Bash em segundo plano, sem `--bateria` (não é rodada da bateria):

   ```bash
   python3 ana/bancada/e2e.py cenarios/capacidades.json --so C13-1,C14-1
   ```

   O painel da bancada ao vivo mostra; diga ao Pedro que ele pode acompanhar lá (`/bancada` se não abriu). Uma execução por vez: dois `e2e.py` disputam a inbox.
3. Quando terminar, leia as conversas gravadas dos cenários rodados e diga, por cenário: veredito e, se falhou, a causa em uma linha (regra do prompt, descrição de ferramenta, dado, cenário exigente demais). Pronto quando nenhuma falha está sem causa.

## Montar

1. Leia `ana/bancada/PRATICAS.md` inteiro e os buracos do relatório.
2. Proponha **três** cenários, ordenados por valor: buraco de cobertura (nó ou capacidade sem cenário) antes de regra que mudou no prompt, antes de entrada hostil. Cada proposta vem pronta no formato do `capacidades.json`: `id` (`<capacidade>-<n>`, o próximo número livre da capacidade; só capacidade que já existe em `os/dados/comparacao.json`), `titulo`, `turnos` com `envie`, `nos`, `espere`, `falha` e as conferências objetivas (`tools`, `nao_contem`, `contem`), e `confere` com etiqueta, raia e handoff. Diga em uma linha por proposta qual prática justifica.
3. Pergunte pelo menu qual montar (pode ser mais de uma). Capacidade nova não se monta aqui: proponha a issue e pare.
4. Grave no `ana/bancada/cenarios/capacidades.json`, na ordem dos ids, e rode uma vez pelo Bash (`--so <id>`). Cenário que falha na primeira rodada por culpa do gabarito: ajuste o gabarito e rode de novo; por culpa da Ana: mantenha e registre a falha como achado. Pronto quando o cenário rodou e o Pedro viu o veredito.
5. Registre uma linha no log do `roadmap/TODO.md` e faça o commit com o id do cenário e a prática que ele cobre.

## Revisar

1. Leia `ana/bancada/PRATICAS.md` (a seção "Quando apagar ou reescrever") e o relatório.
2. Liste os candidatos, cada um com a prática que o acusa: cenário sem conferência objetiva, duplicado (mesmos nós e mesmas conferências), que nunca falhou nas rodadas disponíveis e não cobre nó único, que cita regra que saiu do prompt (confira em `ana/prompt/prompt-compilado.md`), exigente demais (falhou com a Ana fazendo o certo de outro jeito).
3. Para cada candidato, proponha uma ação: apagar, reescrever (com o texto novo) ou manter com nota. Pergunte pelo menu, um item por vez.
4. Aplique o aprovado no `capacidades.json`, rode o reescrito uma vez, registre no log e faça o commit. Pronto quando a lista de candidatos acabou.

## Armadilhas

- `capacidades.json` é versionado e é o que o player do Ana OS lê: id duplicado ou JSON quebrado derruba a página. Valide com `python3 -c "import json; json.load(open('ana/bancada/cenarios/capacidades.json'))"` antes do commit.
- CPF e nome em cenário são sempre de teste; o contato é `TESTE BANCADA ANA <id>`.
- O relatório lê as rodadas copiadas em `resultados/` (fora do git). Máquina nova sem elas: o relatório mostra "sem dado"; rode a bateria antes de revisar.
- O resto das armadilhas (o `/teste`, o `conversationId`, a raia pelo trace) está no `ana/bancada/README.md`.
