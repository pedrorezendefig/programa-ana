# Conectar o Claude Code / VS Code direto no Oracle do MV (homologação)

> Objetivo: a sessão Claude Code (e você, no terminal do VS Code) consultar o banco de HOMOLOGAÇÃO diretamente, sem o ciclo exportar-CSV-colar. Caminho: `python-oracledb` em **modo thick** (com Oracle Instant Client; ver por quê abaixo). Política combinada em 07/jul/2026: **homolog = acesso total da sessão; produção = só o Pedro, manualmente, no DBeaver.**

## Estado atual: INALCANÇÁVEL desde 13/jul/2026 (rede, não configuração)

Em 20/jul, com a HSM-VPN conectada: o túnel responde (gateway `10.11.12.1` em 13ms, rota `10.100.64/22` correta por `utun7`), mas `10.100.66.170:1521` não responde a ICMP nem TCP e o traceroute morre logo depois do concentrador. O DNS público (8.8.8.8 e 1.1.1.1) devolve esse mesmo IP privado, ou seja **a conexão sempre exigiu VPN**: a anotação original de 07/jul dizendo "sem VPN" está errada. Nada da configuração local mudou (credencial, driver, Instant Client e script seguem íntegros); falta liberação de rota/firewall do lado do MV para `10.100.64.0/22` na porta 1521, ou o servidor TST está parado. Enquanto isso, as queries são rodadas à mão no DBeaver.

## Configuração local: completa (07/jul/2026, tarde)

Conexão feita da sessão Claude, ponta a ponta. Todos os passos abaixo concluídos:

- [x] Passo 1: dados da conexão copiados da tela do DBeaver (print de 07/jul)
- [x] Passo 2: `.env` da raiz preenchido (campos `ORACLE_...`)
- [x] Passo 3: driver instalado (`oracledb` 4.0.1) + Instant Client 23.26 (modo thick)
- [x] Testado: `v$version` responde (Oracle 19c SE2) e `SELECT` em `DBAMV.PACIENTE` funciona (2.518 pacientes na base TST em 07/jul)

Dados da conexão (TST - MV, do DBeaver): **host** `dbtst1.9044.cloudmv.com.br`, porta `1521`, **Service Name** `tst19044.db9044.mv9044vcn.oraclevcn.com`, usuário `dbamv`. Atenção: uma anotação anterior deste doc chamava o `tst19044...oraclevcn.com` de "host"; ele é o **service name**, o host é o `dbtst1...cloudmv.com.br`.

### Por que modo thick (e não thin)

A senha do usuário `dbamv` está gravada no Oracle com o verifier antigo do 10g. O modo thin do `python-oracledb` recusa esse formato com o erro `DPY-3015: password verifier type 0x939 is not supported`. Solução adotada: modo thick, com o **Oracle Instant Client Basic Lite 23.26 (ARM64)** instalado em `~/oracle/instantclient_23_26` e apontado pelo `.env` (`ORACLE_CLIENT_DIR`). O script ativa o thick sozinho quando essa variável existe. (Alternativa futura: pedir ao analista um `ALTER USER ... IDENTIFIED BY ...` num banco com `SQLNET.ALLOWED_LOGON_VERSION` moderno regeneraria o verifier e liberaria o thin; não vale o incômodo agora.)

Instalação do Instant Client (feita via download direto da Oracle; o Homebrew travou em Command Line Tools desatualizados):

```bash
curl -sSLO https://download.oracle.com/otn_software/mac/instantclient/2326100/instantclient-basiclite-macos.arm64-23.26.1.0.0.dmg
hdiutil attach instantclient-basiclite-macos.arm64-23.26.1.0.0.dmg
mkdir -p ~/oracle && cp -R /Volumes/instantclient-basiclite-macos.arm64-23.26.1.0.0/ ~/oracle/instantclient_23_26
hdiutil detach /Volumes/instantclient-basiclite-macos.arm64-23.26.1.0.0
```

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
ORACLE_CLIENT_DIR=<pasta do Instant Client, p.ex. /Users/você/oracle/instantclient_23_26>
```

## Passo 3: instalar o driver (uma vez)

```bash
python3 -m pip install --user oracledb
```

Mais o Instant Client (ver bloco de instalação na seção "Por que modo thick").

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
