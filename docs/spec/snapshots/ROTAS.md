# ROTAS.md
<!-- gerado por /snapshot; não editar à mão -->

Rotas HTTP do Ana OS, o servidor local do cockpit (`python3 os/server.py`, porta 8777).
Método de extração: AST do `os/server.py`, lendo as comparações de `path` nos
`do_GET`/`do_POST`; a descrição é a primeira frase da docstring da função que a rota chama.
Nenhuma rota exige login: o servidor só escuta em 127.0.0.1 e recusa Host que não seja local.

## os (`os/server.py`)

| Método | Rota | O que faz | Auth |
|--------|------|-----------|------|
| GET | `/api/data` | Chama `painel.get_data()`. | não (só localhost) |
| GET | `/api/issue/{n}` | Chama `painel.collector.issue_detail()`. | não (só localhost) |
| GET | `/api/issue/{n}/timeline` | Chama `painel.collector.issue_timeline()`. | não (só localhost) |
| GET | `/api/status` | Testa o token com GET /pessoas?cpf=<sonda>. | não (só localhost) |
| GET | `/api/absorcao` | Lista os arquivos depositados na RAIZ de ABSORCAO_DIR (subpastas nunca aparecem). | não (só localhost) |
| GET | `/api/docs` | Catalogo da Biblioteca: raiz (arquivos explicitos) + grupos (dir, sem recursao). | não (só localhost) |
| GET | `/api/tools` | Le as definicoes de ferramentas na plataforma (ADR-0017). | não (só localhost) |
| GET | `/api/chatwoot` | Diz quantas versoes o Chatwoot da Ana esta atras do que a fazer.ai publicou (ADR-0024). | não (só localhost) |
| GET | `/api/cenarios` | Lê `CENARIOS_JSON`. | não (só localhost) |
| GET | `/api/conversas` | O que o player toca (ADR-0032): as conversas gravadas de ana/bancada/conversas/ (so a raiz, so .json) e os cenarios declarados (capacidades... | não (só localhost) |
| GET | `/api/roadmap` | `ler_roadmap()` (sem docstring) | não (só localhost) |
| GET | `/api/retrato` | Monta o retrato ao vivo com o retrato/gerar.py (ADR-0030). | não (só localhost) |
| GET | `/absorcao/*` | Serve UM arquivo da raiz de ABSORCAO_DIR. | não (só localhost) |
| GET | `/docs/*` | Serve UM .md da Biblioteca: /docs/<grupo>/<nome>. | não (só localhost) |
| POST | `/api/sql` | Executa um SELECT/WITH no Oracle TST e devolve {ok, colunas, linhas, truncado, latencia_ms}. | não (só localhost) |
| POST | `/api/gh` | Chama a API GH e devolve dict {status, latencia_ms, corpo_cru, json}. | não (só localhost) |
