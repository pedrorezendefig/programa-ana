# Runbook: atualizar o fazer.ai agents e o Chatwoot

Escrito em 08/set/2026. Os dois rodam na VPS Hostinger (31.97.29.32) dentro do Coolify
(https://coolify.hospitalsaomatheus.cloud). Os dois usam imagem `:latest` do Harbor da fazer.ai,
então "atualizar" é: anotar o ponto de volta, fazer backup do banco, clicar em Redeploy, conferir.

Versões medidas em 08/set/2026:

| Produto | No ar | Última publicada | Onde ver |
|---|---|---|---|
| fazer.ai agents | 1.15.0 (subiu 08/set) | v1.15.0 (07/set) | `curl -s https://agents.hospitalsaomatheus.cloud/api/health` |
| Chatwoot Pro | 4.17.0-fazer-ai-pro.129 (subiu 08/set) | v4.17.0-fazer-ai-pro.129 | `curl -s https://chatwoot.mala-ia.cloud/api` |

Ordem recomendada: **agents primeiro** (destrava o gpt-5.6-luna, sem migração pesada),
**Chatwoot depois** (cruza 3 merges oficiais, tem migração de banco e apaga o hotfix da V8).
Fazer com a casa vazia (modo teste), nunca com paciente real na fila.

## 0. Antes de qualquer um dos dois

1. Na VPS, liste os containers e anote a imagem exata de cada um:

```bash
ssh root@31.97.29.32 "docker ps --format '{{.Names}} | {{.Image}} | {{.Status}}'"
```

2. Anote o digest da imagem atual (é o ponto de volta):

```bash
ssh root@31.97.29.32 "docker image inspect <IMAGEM_DO_PASSO_1> --format '{{index .RepoDigests 0}}'"
```

3. Backup do Postgres do serviço que vai subir (troque `<PG>` pelo nome do container postgres
   daquele serviço, visto no passo 1):

```bash
ssh root@31.97.29.32 "docker exec <PG> sh -c 'pg_dumpall -U \"\$POSTGRES_USER\"'" > backup-$(date +%Y%m%d)-<servico>.sql
```

Sem backup não tem volta: o agents a partir da 1.11 remove uma coluna do banco e só aceita
voltar até a 1.10.0. Voltar para a 1.4.1 exige restaurar o banco.

## 1. fazer.ai agents (1.4.1 -> 1.15.0)

FEITO em 08/set/2026. Digest anterior (rollback): `sha256:88c595012816a55ed60388f161c29fb65a97dc3bbb495686f1365cdccfb7297c`. Backup: `/root/backup-agents-20260908.sql` na VPS (63 MB). Containers: `agents-d9g4akmm6ljp40h8sbcene41` e `postgres-d9g4akmm6ljp40h8sbcene41`. Luna aplicado logo depois (seção 3).

Imagem: `harbor.fazer.ai/agents/fazer-ai/agents-pro:latest`. Migração e bootstrap rodam no boot
(CMD da imagem, nunca sobrescrever `command`).

1. Passo 0 (digest + backup do postgres do agents).
2. Coolify -> projeto "fazer.ai agents" -> serviço agents -> **Redeploy**. O Coolify puxa a `:latest` e sobe.
3. Conferir versão e saúde:

```bash
curl -s https://agents.hospitalsaomatheus.cloud/api/health
```

Esperado: `"version":"1.15.0"` e `"status":"ok"`.

4. Fumaça: no Telegram, conversa nova, `/teste` e uma pergunta de preço de Cardiologia. Conferir
   nos logs da plataforma que a tool rodou.
5. Conferir a aba Ferramentas: a 1.10 passou a recusar body de tool "escrito como objeto solto".
   Se alguma tool aparecer com erro ao salvar, ajustar o formato do body.

O que muda e toca a Ana (notas de versão 1.5 a 1.15):

- **1.5.0**: família gpt-5.6 roda com reasoning "none", tools param de ser recusadas. **É o destrava do Luna (ADR-0013).**
- **1.6.0**: `reasoningEffort` por agente, aba Geral. Nota privada no Chatwoot quando um turno falha.
- **1.9.0**: memória entre conversas vira resumo ao encerrar; vem LIGADO e custa 1 chamada de modelo a mais por atendimento. Desligar em Comportamento > Memória se não quiser.
- **1.10.0**: variáveis `{{esta_aberto}}`, `{{proximo_atendimento}}`, `{{horario_atendimento}}` (candidatas a substituir a Seção 10 escrita à mão).
- **1.11.0**: conserta o bot que silenciava depois de pico de carga. Piso de rollback = 1.10.0.
- **1.12.0**: logs dizem POR QUE o bot ficou calado (humano assumiu, modo teste). Teria mostrado o caso do Felipe.
- **1.15.0**: tique azul enquanto o agente pensa (só com Chatwoot atualizado); cliente não recebe mais resposta duplicada.

Rollback: no serviço do Coolify, setar a env `AGENTS_IMAGE` para
`harbor.fazer.ai/agents/fazer-ai/agents-pro@sha256:<DIGEST_DO_PASSO_0>` e Redeploy.
Se já passou da 1.11, restaurar o banco do backup antes.

## 2. Chatwoot Pro (.111 -> .129)

FEITO em 08/set/2026. Digest anterior (rollback): `sha256:965ec31b108bacdcfdf3f44e0cba8ab6263be7f3acf7027ea2eb6d98b768690d`. Backup: `/root/backup-chatwoot-20260908.sql`. Teste por token: 200 em tudo, hotfix da V8 aposentado. O `unhealthy` do postgres é falso: o healthcheck do compose chama `pg_isready` com argumento a mais (`too many command-line arguments (first is "chatwoot_production")`); falta `-d` antes do nome do banco. Consertar no compose do Coolify quando conveniente.

Containers: `chatwoot-31ey85oi92l8phsya80gf5wh`, `sidekiq-...`, `postgres-31ey85oi92l8phsya80gf5wh` (imagem `ghcr.io/fazer-ai/postgres-16-pgvector`), `redis-...`, `baileys-api-...`. **Alerta de 08/set: o postgres do Chatwoot está `unhealthy` no `docker ps` há semanas.** Conferir `docker inspect --format '{{json .State.Health}}' postgres-31ey85oi92l8phsya80gf5wh` e o log antes de subir; o backup do passo 0 é ainda mais importante aqui.

Imagem: `harbor.fazer.ai/chatwoot/fazer-ai/chatwoot-pro:latest`. Tarefa V32 do roadmap (ADR-0024).

1. Passo 0 (digest + backup do postgres do Chatwoot).
2. Avisar quem usa a aba "Não atribuídas": a `.120` tira dali a conversa que está com o bot.
3. Coolify -> serviço do Chatwoot -> **Redeploy**. A imagem é grande: o pull passa de 3 minutos, é normal.
4. Conferir versão:

```bash
curl -s https://chatwoot.mala-ia.cloud/api
```

Esperado: `"version":"4.17.0-fazer-ai-pro.128"`.

5. **Teste da V8** (o hotfix de 1 linha evaporou no pull; a `.112` promete o fix, mas só o teste prova):

```bash
set -a; . ./.env; set +a
curl -s -o /dev/null -w '%{http_code}\n' -H "api_access_token: $CHATWOOT_API_TOKEN" "$CHATWOOT_URL/api/v1/accounts/1/agent_bots"
curl -s -o /dev/null -w '%{http_code}\n' -H "api_access_token: $CHATWOOT_API_TOKEN" "$CHATWOOT_URL/api/v1/accounts/1/labels"
```

200 nos dois = V8 morreu, fechar no radar. 500 = reaplicar o hotfix
(`app/controllers/api/v1/accounts/base_controller.rb`, `Current.account` -> `current_account`,
detalhe na memória da instância) e cobrar a fazer.ai.

6. Rodar a bateria v3 da bancada e conferir a automação `/resolve` (Configurações > Automação).

Rollback: env `CHATWOOT_IMAGE` apontando para o digest anotado, Redeploy, e restaurar o banco se a
migração já rodou.

## 3. Depois: gpt-5.6-luna sem reasoning (ADR-0013)

Hoje (1.4.1) NÃO dá: o `modelConfig` só aceita provider/model/credentialRef/baseURL/temperature,
e a OpenAI recusa tools + reasoning no chat/completions para o Luna (400 medido em 12/ago).

Com o agents em 1.6.0 ou mais:

1. Agente Ana > aba Geral: modelo `gpt-5.6-luna`, reasoning effort `none` (a 1.5 já faz isso
   sozinha para a família 5.6; deixar explícito não custa).
2. Temperatura: o Luna é família reasoning; a plataforma descarta temperature para essas famílias.
3. Fumaça com tool (preço de Cardiologia) e conferir no log que não houve 400.
4. Rodar a bateria v3 antes de deixar em definitivo. Rollback = voltar para `gpt-5-mini`, temperature 1.
