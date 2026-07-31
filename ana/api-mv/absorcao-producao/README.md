# Pacote de absorção da produção (ciclo C8)

Data do pacote: 2026-07-22.

Este pacote é o roteiro para o Pedro tirar um retrato do banco MV de PRODUÇÃO usando apenas o DBeaver, manualmente, query a query. Os CSVs exportados aqui alimentam as páginas do portal local (`atlas.html`, `insights.html`, `absorcao.html`) e respondem as perguntas abertas do programa (GH-18 crítica, C6-1 a C6-6, insights de diretoria 1 a 13).

Nenhum script deste repositório executa essas queries: produção nunca é chamada por código. O `server.py` do playground só fala com a homolog GH e com o Oracle TST.

## Avisos que valem para a sessão inteira

- SOMENTE LEITURA: todas as queries são `SELECT` ou `WITH`. Não rode nada além do que está nos arquivos de `queries/`. Não edite, não crie, não apague nada no banco.
- Credencial de produção NUNCA entra no `.env` desta máquina, nem em arquivo do repositório. Ela vive só na conexão salva do DBeaver.
- LGPD: dado pessoal de paciente real (nome, CPF, telefone, e-mail) não pode aparecer em arquivo commitável nem nas páginas do portal. Todo resultado com dado de paciente vai para `resultados/amostras/`, que fica fora do git. Em dúvida sobre a camada, escolha `amostras/`.
- Exceção única de dado pessoal: o paciente-sonda `TESTE INTEGRACAO ANA VITTA` (CPF 66301102770, id 1681) é um cadastro fictício de teste e pode aparecer em queries e CSVs de conferência. As queries 10-5 e 10-6 já trazem guarda para que, se o CPF ou o id estiverem ocupados por um paciente real na produção, o nome saia omitido.
- Armadilha técnica: `ATENDIME_GLOBAL_HEALTH.NR_CPF` é NUMBER e perde zero à esquerda. Todo cruzamento por CPF nessa interface usa `LPAD(TO_CHAR(NR_CPF), 11, '0')`. As queries do pacote já fazem isso; não simplifique.

## Como conectar com segurança (DBeaver de produção)

1. Abra o DBeaver e use a conexão de PRODUÇÃO já salva (criada por você, manualmente; a credencial não existe em lugar nenhum do repositório).
2. Edite a conexão e ative as proteções antes de começar: em Geral, marque o tipo de conexão como `Production`; em Segurança (ou Geral, conforme a versão), marque `Somente leitura` (Read-only connection). Com isso o próprio DBeaver bloqueia qualquer escrita acidental.
3. Confirme que você está no banco certo (produção, não TST) olhando o nome da conexão na barra do editor SQL antes da primeira execução.
4. Abra um editor SQL novo nessa conexão e trabalhe query a query, como descrito abaixo. Não deixe abas de outras conexões abertas junto, para não colar no lugar errado.

## As duas camadas de resultado

| Camada | Pasta | O que entra | Git |
|---|---|---|---|
| Commitável | `resultados/` | Agregados, contagens, metadados de catálogo. Nenhum dado pessoal (exceção: a sonda) | Entra no repositório |
| Amostras | `resultados/amostras/` | Qualquer linha com dado de paciente real (bloco 99 inteiro) | NUNCA entra: a pasta está no `.gitignore` da raiz e o portal jamais a serve |

Atenção para quem clonar o repositório: como `resultados/amostras/` é ignorada por inteiro pelo git, ela não vem no clone. Crie a pasta manualmente antes do primeiro export do bloco 99:

```bash
mkdir -p ana/api-mv/absorcao-producao/resultados/amostras
```

## Convenção de nomes (o nome do CSV é contrato)

Padrão `bloco-sequência-slug`, a mesma família do ciclo C2 (`1-1-owners.csv`, `2-1-fks.csv`):

- `bloco`: 00, 10, 20, 30, 40, 90 ou 99 (dois dígitos, agrupa por tema).
- `sequência`: número da query dentro do bloco (1, 2, 3...).
- `slug`: resumo curto em minúsculas, palavras separadas por hífen, sem acento.
- Nos blocos 00 a 90, o arquivo `.sql` tem exatamente o mesmo nome-base do `.csv` que produz: `queries/10-4-motivos-alta.sql` gera `10-4-motivos-alta.csv`. No bloco 99, o CSV perde o prefixo `amostra-`: `queries/99-1-amostra-it-agenda-central.sql` gera `amostras/99-1-it-agenda-central.csv`. Na dúvida, copie sempre da linha `Saida:` do cabeçalho do `.sql`.

O nome do CSV é contrato com o portal: `atlas.html`, `insights.html` e `absorcao.html` referenciam esses nomes literalmente. Mudar um nome quebra a hidratação das páginas. Copie o nome do cabeçalho do próprio `.sql` (linha `Saida:`).

Formato de export no DBeaver: CSV, codificação UTF-8, separador vírgula, valores entre aspas duplas quando necessário, com linha de cabeçalho (mesmo formato dos CSVs já commitados do C2).

## Ordem de execução recomendada

1. Bloco 00 (catálogo e metadados): 00-1, 00-2, 00-3.
2. Bloco 10 (núcleo assistencial): 10-1 a 10-9.
3. Bloco 20 (cirurgia): 20-1.
4. Bloco 30 (internação, leitos e urgência): 30-1, 30-2.
5. Bloco 40 (faturamento e convênios): 40-1, 40-2.
6. Bloco 99 (amostras, sempre para `resultados/amostras/`): 99-1, 99-2, 99-3.
7. Bloco 90: BÔNUS OPCIONAL, a qualquer momento ou nunca. Só metadados dos owners DBADW e DBACP, nenhum dado de negócio. Pule sem culpa se o tempo apertar.

Os blocos 20, 30 e 40 são resilientes por construção: usam somente os catálogos Oracle (`ALL_TABLES`, `ALL_TAB_COLUMNS`, `ALL_TAB_COMMENTS`, `ALL_COL_COMMENTS`) e tabelas do núcleo já confirmadas, porque os nomes reais das tabelas de cirurgia, leito, urgência e faturamento na produção ainda não são conhecidos. Nomes clássicos do MV citados pela planilha do TI aparecem como padrões de descoberta, nunca como `FROM` direto. O refinamento com `FROM` direto fica para o ciclo 2 (C9), alimentado pelos CSVs 00-3, 20-1, 30-1 e 40-1.

## Passo a passo, query a query

Para cada arquivo de `queries/`, na ordem acima:

1. Abra o arquivo `.sql` no editor de texto (ou na página `absorcao.html` do portal, que tem botão de copiar) e copie o conteúdo inteiro.
2. Cole no editor SQL do DBeaver conectado à produção. Cada arquivo tem um único statement.
3. Execute e aguarde a grade de resultado. Se uma query falhar (por exemplo, coluna inexistente nessa versão do MV), anote a mensagem de erro, pule para a próxima e registre o ocorrido; não improvise SQL novo na hora.
4. Exporte a grade: clique com o botão direito na grade de resultado, `Export resultset...`, formato CSV, UTF-8, separador vírgula, com cabeçalho.
5. Nomeie o arquivo EXATAMENTE como indica a linha `Saida:` do cabeçalho do `.sql`.
6. Deposite no destino da camada: `resultados/` para os blocos 00 a 90; `resultados/amostras/` para o bloco 99, sem exceção.
7. Conferência opcional a cada depósito: recarregue `absorcao.html` no portal local; o checklist marca o CSV como depositado.

## Tabela-resumo: arquivo SQL, CSV, camada e o que responde

| Arquivo SQL | CSV de saída | Camada | O que responde |
|---|---|---|---|
| `queries/00-1-catalogo-tabelas.sql` | `00-1-catalogo-tabelas.csv` | commitável | C6-1 (retrato da produção), GH-19, base da descoberta 20/30/40, insights 4, 9, 10, 11 |
| `queries/00-2-colunas-nucleo.sql` | `00-2-colunas-nucleo.csv` | commitável | Estrutura da produção vs TST (pré-condição do dicionário C3), C6-3 (NULLABLE de CD_MOT_ALT), C6-6 |
| `queries/00-3-colunas-novos-dominios.sql` | `00-3-colunas-novos-dominios.csv` | commitável | Insumo do ciclo 2 (C9): colunas reais de cirurgia, leito e faturamento |
| `queries/10-1-funil-ocupacao-mensal.sql` | `10-1-funil-ocupacao-mensal.csv` | commitável | Insights 1, 3, 4, 5 (no-show, lead time, ocupação, funil); volume mensal real |
| `queries/10-2-dominios-agendamento.sql` | `10-2-dominios-agendamento.csv` | commitável | C6-5 (TP_FORMA_AGENDAMENTO), auditoria de canal da Ana, insight 7 |
| `queries/10-3-dominios-atendime.sql` | `10-3-dominios-atendime.csv` | commitável | C6-2 (TP_ATENDIMENTO), C6-5 (CD_SISTEMA), sinais de óbito e internação, insights 8 e 12 |
| `queries/10-4-motivos-alta.sql` | `10-4-motivos-alta.csv` | commitável | C6-3, armadilha do luto 63/64, insight 8, filtro de desfecho (E1) |
| `queries/10-5-sonda-gh18.sql` | `10-5-sonda-gh18.csv` | commitável | GH-18 CRÍTICA: para qual banco MV a homolog GH aponta |
| `queries/10-6-atendime-gh.sql` | `10-6-atendime-gh.csv` | commitável | C6-4 (quem popula a interface GH), GH-18, insight 13; demonstra a armadilha do LPAD |
| `queries/10-7-mix-convenio.sql` | `10-7-mix-convenio.csv` | commitável | GH-12, GH-17 e D1 (id do particular), insight 6 |
| `queries/10-8-ocupacao-prestador.sql` | `10-8-ocupacao-prestador.csv` | commitável | Insights 2 e 4 (janelas ociosas, realocação de oferta) |
| `queries/10-9-contactabilidade.sql` | `10-9-contactabilidade.csv` | commitável | Pauta E2 (opt-in), pacientes sem CPF (pergunta GH-18 do arquivo de perguntas), insight 12 |
| `queries/20-1-cirurgia-descoberta.sql` | `20-1-cirurgia-descoberta.csv` | commitável | Insight 11; nomes e volumes reais de cirurgia para o C9 |
| `queries/30-1-internacao-descoberta.sql` | `30-1-internacao-descoberta.csv` | commitável | Insights 9 e 10; nomes reais de internação, leito e urgência para o C9 |
| `queries/30-2-internacao-urgencia-mensal.sql` | `30-2-internacao-urgencia-mensal.csv` | commitável | Insights 9 e 10 (tempo até a alta, pressão da urgência); C6-2 com volume real |
| `queries/40-1-faturamento-descoberta.sql` | `40-1-faturamento-descoberta.csv` | commitável | Tabelas reais de faturamento, contas e TISS para o C9 |
| `queries/40-2-convenios-catalogo.sql` | `40-2-convenios-catalogo.csv` | commitável | GH-12 (convênios ativos), GH-17 e D1 (achar o particular), insight 6 |
| `queries/90-1-dw-reconhecimento.sql` | `90-1-dw-reconhecimento.csv` | commitável (BÔNUS OPCIONAL) | Reconhecimento dos owners DBADW e DBACP; só metadados, nenhum dado de negócio |
| `queries/99-1-amostra-it-agenda-central.sql` | `amostras/99-1-it-agenda-central.csv` | amostras (fora do git) | C6-6 (valores reais de slot), formato real das marcações |
| `queries/99-2-amostra-atendime.sql` | `amostras/99-2-atendime.csv` | amostras (fora do git) | Formato real dos atendimentos na produção |
| `queries/99-3-amostra-atendime-gh.sql` | `amostras/99-3-atendime-gh.csv` | amostras (fora do git) | C6-4 (formato real das linhas da interface GH, se existirem) |

## Mapa query x pergunta aberta

| Pergunta | Queries que respondem |
|---|---|
| GH-18 CRÍTICA (qual banco a homolog GH enxerga) | 10-5, 10-6, 99-3 |
| GH-12 / GH-17 / D1 (convênios ativos, id do particular) | 10-7, 40-2 |
| GH-18 do arquivo de perguntas (pacientes sem CPF) | 10-9 |
| GH-19 (contexto de massa; produção como referência do que existe) | 00-1, 10-1 |
| C6-1 (onde vive a produção, retrato dela) | 00-1, 00-2 |
| C6-2 (domínio de TP_ATENDIMENTO) | 10-3, 30-2 |
| C6-3 (CD_MOT_ALT: catálogo e obrigatoriedade) | 00-2 (NULLABLE), 10-4 |
| C6-4 (quem popula ATENDIME_GLOBAL_HEALTH) | 10-6, 99-3 |
| C6-5 (assinatura de origem: TP_FORMA_AGENDAMENTO, CD_SISTEMA) | 10-2, 10-3 |
| C6-6 (leitura de slot livre) | 00-2 (estrutura), 99-1 (valores reais) |
| Insights de diretoria 1 a 13 | 10-1, 10-2, 10-4, 10-6, 10-7, 10-8, 10-9, 20-1, 30-1, 30-2, 40-2 |

## Interpretação da 10-5 (a query mais importante do pacote)

- Linha `CPF_SONDA` com `nm_paciente` igual a `TESTE INTEGRACAO ANA VITTA`: a homolog GH enxerga e grava na produção. É grave; avisar imediatamente.
- Linha `CPF_SONDA` com nome omitido: o CPF está ocupado por OUTRO paciente real (o CPF da sonda tem dígito verificador válido e pode colidir). Não prova integração; investigar antes de concluir.
- Nenhuma linha `CPF_SONDA`: ambientes distintos (resultado esperado).
- Nenhum ramo da query expõe nome de paciente real: a guarda CASE omite o nome quando não for a sonda.

## Checklist final

- [ ] Os 17 CSVs obrigatórios dos blocos 00 a 40 estão em `resultados/`, cada um com o nome exato da tabela-resumo.
- [ ] O bônus 90-1 foi rodado ou conscientemente pulado (é opcional).
- [ ] As 3 amostras do bloco 99 estão em `resultados/amostras/`, e SÓ lá.
- [ ] `git status` não acusa nada dentro de `resultados/amostras/` (a pasta é ignorada; se aparecer algo, pare e revise antes de qualquer commit).
- [ ] Nenhum CSV em `resultados/` contém nome, CPF, telefone ou e-mail de paciente real (única exceção: a sonda TESTE INTEGRACAO ANA VITTA).
- [ ] A conexão de produção do DBeaver foi fechada ao terminar; nenhuma credencial foi copiada para fora do DBeaver.
- [ ] `absorcao.html` mostra todos os commitáveis como depositados; `atlas.html` e `insights.html` foram recarregadas e hidrataram com os dados novos.
- [ ] Rodar `/check` na próxima sessão para a digestão dos resultados (C8 conclui, C9 refina).
