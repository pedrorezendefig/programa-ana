# Conectar o Claude Code / VS Code direto no Oracle do MV (homologação)

> Objetivo: a sessão Claude Code (e você, no terminal do VS Code) consultar o banco de HOMOLOGAÇÃO diretamente, sem o ciclo exportar-CSV-colar. Caminho: `python-oracledb` em **modo thin** (driver puro Python, sem instalar Oracle Client). Política combinada em 07/jul/2026: **homolog = acesso total da sessão; produção = só o Pedro, manualmente, no DBeaver.**

## Estado atual: ADIADO por decisão do Pedro (07/jul/2026)

Nada disto está feito ainda, de propósito: fica para quando você quiser. O que falta, na ordem:

- [ ] Passo 1: copiar os dados da conexão do DBeaver (host, porta, service/SID, usuário, senha)
- [ ] Passo 2: colar no `.env` da raiz (campos `ORACLE_...` abaixo)
- [ ] Passo 3: instalar o driver: `python3 -m pip install --user oracledb`
- [ ] Avisar a sessão Claude: eu testo a conexão e assumo as consultas dali em diante

Dado já conhecido para o Passo 1: o host da conexão atual é `tst19044.db9044.mv9044vcn.oraclevcn.com` (visto no DBeaver em 07/jul; repare no prefixo `tst`, mais um indício de ambiente de teste). Porta, service/SID, usuário e senha estão na tela Edit Connection do DBeaver.

## Passo 1: copiar os dados da conexão do DBeaver

No DBeaver: clique direito na conexão Oracle → **Edit Connection**. Anote:

- **Host** e **Port** (padrão Oracle: `1521`)
- **Database**: repare se está como **Service name** ou **SID** (é um seletor na tela; importa para o passo 2)
- **Username** e **Password** (a credencial read-only que o analista deu)

Se o DBeaver só conecta com a VPN ligada, a sessão Claude também vai precisar dela ligada.

## Passo 2: colar no `.env` da raiz do repo

O `.env` já está no `.gitignore` (nunca vai para o git). Adicionar estas linhas, preenchendo com o que veio do DBeaver:

```bash
ORACLE_HOST=<host do DBeaver>
ORACLE_PORT=1521
ORACLE_SERVICE=<service name>   # OU, se o DBeaver usa SID:
# ORACLE_SID=<sid>
ORACLE_USER=<usuário read-only>
ORACLE_PASSWORD=<senha>
```

## Passo 3: instalar o driver (uma vez)

```bash
python3 -m pip install --user oracledb
```

Se o macOS reclamar de ambiente gerenciado (PEP 668), usar um venv local (já ignorado pelo git):

```bash
python3 -m venv .venv-mv
.venv-mv/bin/pip install oracledb
# e chamar o script com .venv-mv/bin/python3 em vez de python3
```

## Passo 4: consultar

O runner está em `ana/api-mv/scripts/query-mv.py`. Exemplos:

```bash
# teste de fumaça da conexão
python3 ana/api-mv/scripts/query-mv.py "SELECT banner FROM v\$version"

# query direta
python3 ana/api-mv/scripts/query-mv.py "SELECT CD_PACIENTE, NR_CPF FROM DBAMV.PACIENTE WHERE NR_CPF = '66301102770'"

# de um arquivo .sql, exportando CSV
python3 ana/api-mv/scripts/query-mv.py -f minha-query.sql --csv resultado.csv

# mais linhas que o padrão (200)
python3 ana/api-mv/scripts/query-mv.py "SELECT * FROM DBAMV.MOT_ALT" --max-rows 500
```

Guarda-corpo embutido: o script só aceita `SELECT`/`WITH` (recusa INSERT/UPDATE/DELETE/DDL). É proposital: mesmo com acesso total à homolog, escrita no banco só de forma deliberada, nunca por acidente de sessão.

## Como a sessão Claude usa isso

Com o `.env` preenchido, basta pedir na sessão ("consulta X no banco") que eu chamo o script e leio o resultado direto, sem você exportar nada. Amostras com dado pessoal continuam com a regra de sempre: não entram no git (se eu salvar algo, vai para `resultados/amostras/`).

## VS Code (opcional, para você navegar visualmente)

A extensão oficial **Oracle SQL Developer Extension for VS Code** (publisher: Oracle) dá navegação de schema e editor SQL dentro do VS Code, com os mesmos dados de conexão do Passo 1. É um substituto do DBeaver, não do script; para as sessões Claude, o script é o caminho.

## Produção (quando existir credencial)

Não colocar credencial de produção no `.env` desta máquina de desenvolvimento. O combinado: consultas em produção o Pedro roda manualmente no DBeaver (e cola o resultado na sessão se precisar de digestão), com as mesmas regras de amostra fora do git.
