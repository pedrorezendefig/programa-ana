# Smoke test da API Global Health (homologação)

> Executado em 07/jul/2026, da sessão Claude Code, com o `GH_TOKEN_HOMOLOG` do `.env` (sub-passo da tarefa D1). Base: `https://dem.agenda.globalhealth.mv/rest/whatsapp`, header `Token`. Nenhuma chamada tocou produção.

## Veredito

**A API está funcional: autentica, lê e grava.** O que NÃO está pronto é a massa de homologação: os catálogos que alimentam o fluxo de agendamento estão vazios, então os subfluxos T2 a T7 não têm o que exercitar ainda. E ficou em aberto QUAL base MV a homolog da GH enxerga (a query de verificação abaixo decide).

## Chamadas e resultados

| # | Chamada | Resultado | Leitura |
|---|---|---|---|
| 1 | `GET /pessoas?cpf=<cpf real da base Oracle>` | 200, corpo VAZIO | Paciente que existe no Oracle acessado pelo DBeaver não existe para a API: ou a API aponta para outra base, ou `/pessoas` só enxerga o registro próprio da GH |
| 2 | `GET /consultas?pesquisa=CARDIOLOGIA` (e `CLINICA`, e vazio) | 200, `{"conteudo":[]}` | Catálogo de consultas vazio para o canal |
| 3 | `GET /exames?pesquisa=ULTRA` | 200, `{"conteudo":[]}` | Catálogo de exames vazio |
| 4 | `POST /pessoas` (CPF sintético válido `66301102770`, nome `TESTE INTEGRACAO ANA VITTA`) | **200, criou `id: 1681`** | **Escrita funciona**; data aceita em ISO (`1990-01-01`); resposta ecoa o objeto criado |
| 5 | `GET /pessoas?cpf=66301102770` | 200, retorna a pessoa | Persistiu e relê |
| 6 | `GET /pessoas?telefone=21999990000` | 200, retorna a pessoa | **Lookup por telefone confirmado** (achado D8 da pesquisa: atalho para reduzir fricção, já que o telefone do WhatsApp é input fixo) |
| 7 | `GET /agendamentos?cpf=...&tipoAgendamento=consulta` | **500** `{"mensagens":[{"tipo":"ERROR","mensagem":"Erro interno"}]}` | Enum em minúsculo derruba a API |
| 8 | `GET /agendamentos?cpf=...` e `...&tipoAgendamento=CONSULTA` ou `EXAME` | 200, `{"conteudo":[]}` | **Enum é CAIXA ALTA**; sem o parâmetro também funciona |

Latência típica observada: 500 a 800ms por chamada.

## Achados para a spec do D2

1. **`tipoAgendamento` aceita só `CONSULTA`/`EXAME` em caixa alta**; qualquer outro valor = HTTP 500. O subfluxo T6 precisa normalizar (`upper`) antes de chamar.
2. **Formato de erro não documentado**: além do `{"sucesso": false, "mensagemErro": ...}` do `/horarios/agendar`, existe `{"mensagens": [{"tipo": "ERROR", "mensagem": "Erro interno", "parametros": []}]}` com HTTP 500. Os nós HTTP precisam tratar os dois.
3. **`GET /pessoas` sem match responde 200 com corpo vazio** (não 404, não objeto vazio): o subfluxo T1 deve testar corpo vazio, não status.
4. **Datas em ISO** (`YYYY-MM-DD`) aceitas no `POST /pessoas`.
5. **Paginação**: respostas de lista vêm como `{"conteudo": [], "paginaAnterior": "", "paginaSeguinte": ""}`, confirmando o desenho do `mapa`/`dataPaginaSeguinte` do docs/02.

## A pergunta que a API não responde sozinha: qual MV ela enxerga?

O paciente de teste foi criado com sucesso via API. Se ele aparecer no Oracle que o Pedro acessa pelo DBeaver, **a homolog da GH e o banco explorado na Trilha C são o mesmo ambiente** (loop fechado). Se não aparecer, a GH mantém registro próprio ou aponta para outro MV, e isso vira pergunta formal.

### Queries de verificação (rodar no DBeaver ou via `scripts/query-mv.py`)

```sql
-- 1. O paciente de teste criado via API existe no PACIENTE deste banco?
SELECT CD_PACIENTE, NM_PACIENTE, NR_CPF, DT_CADASTRO, NM_USUARIO
FROM   DBAMV.PACIENTE
WHERE  NR_CPF = '66301102770';

-- 2. O id 1681 devolvido pela API bate com CD_PACIENTE?
SELECT CD_PACIENTE, NM_PACIENTE, NR_CPF
FROM   DBAMV.PACIENTE
WHERE  CD_PACIENTE = 1681;

-- 3. Alguma marcação gravada nas últimas 48h (assinatura de origem)?
SELECT CD_IT_AGENDA_CENTRAL, CD_AGENDA_CENTRAL, HR_AGENDA, CD_PACIENTE,
       TP_FORMA_AGENDAMENTO, TP_VISUALIZACAO, CD_USUARIO, DT_GRAVACAO
FROM   DBAMV.IT_AGENDA_CENTRAL
WHERE  DT_GRAVACAO >= SYSDATE - 2
ORDER  BY DT_GRAVACAO DESC;

-- 4. A interface GH ganhou linhas?
SELECT * FROM DBAMV.ATENDIME_GLOBAL_HEALTH;
```

Interpretação: query 1 com linha = mesmo ambiente (melhor cenário). Query 1 vazia = ambientes distintos; levar à GH. As queries 3 e 4 só fazem sentido depois que existir massa para agendar (hoje não há catálogo publicado).

## Perguntas para a Global Health (somar às GH-1..17 de `perguntas-global-health.md`)

- **GH-18:** A homolog (`dem.agenda...`) aponta para qual banco MV? É o mesmo Oracle da credencial read-only do hospital?
- **GH-19:** O que falta para a homolog ter massa utilizável: publicar escalas/agendas/itens para o canal? Quem configura (GH ou TI do hospital)? Podem publicar ao menos 1 consulta e 1 exame com horários?
- **GH-20:** `tipoAgendamento` fora do enum (`CONSULTA`/`EXAME`) retorna 500 "Erro interno" em vez de 400: é conhecido? Há outros enums sensíveis a caixa?
- **GH-21:** Confirmam o formato de erro `{"mensagens": [...]}` e a semântica de `GET /pessoas` vazio (200 sem corpo) fora da doc?

## Estado

- Paciente de teste deixado na homolog de propósito (CPF `66301102770`, id `1681`): é a sonda para a query de verificação. Nenhum agendamento criado (não há horário publicado).
- Próximos passos: rodar as queries de verificação no Oracle; pedir massa de homolog à GH (GH-19); seguir com o restante da D1 (token de produção + rate limit + contato técnico).
