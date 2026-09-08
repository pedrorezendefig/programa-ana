# Pedido ao analista de TI: massa de cenários no SoulMV TST

> Escrito em 26/ago/2026, depois que a agenda de Cardiologia entrou no ar (V31).
> Substitui o `pedido-agenda-cardiologia-tst.md`, que já foi resolvido sem precisar do analista.
> Enviar por WhatsApp junto com o PDF `tutorial-agenda-online-gh.pdf`.

---

Oi, [nome]! Tudo bem? Preciso de mais uma ajuda pontual no SoulMV de **TESTE**, para os testes da Ana.

A agenda de **Cardiologia** já está funcionando no agendamento online de homologação: 4 médicos publicados e horários aparecendo certinho. Obrigado! Agora preciso de mais variedade para testar os cenários que ainda não consigo exercitar.

São três pedidos, todos na base TST:

**1. Uma especialidade a mais, de preferência Ortopedia.**
Mesma receita da Cardiologia: agenda pública no Soul, com prestador vinculado ao item de agendamento, unidade preenchida e alguns horários livres. Com duas especialidades eu consigo testar se a Ana acerta qual é qual.

**2. Horários espalhados em mais dias.**
Hoje só existe horário em 27 e 28/08. Se der para deixar horário livre em uns 4 ou 5 dias diferentes das próximas duas semanas, eu consigo testar o paciente que pede "semana que vem" ou "só de manhã".

**3. Um exame publicado, qualquer um.**
Hoje o catálogo de exames está 100% vazio. Um exame só (Raio-X, Ultrassom, o que for mais fácil) já me destrava o fluxo inteiro de exame, que nunca foi testado.

E uma pergunta que segue em aberto: **o SoulMV de TESTE alimenta o ambiente de homologação da Global Health** (`dem.agenda.globalhealth.mv`)? É esse o ambiente que os nossos testes consultam.

O passo a passo com prints está no PDF em anexo (4 páginas). O que for feito no Soul eu mesmo ativo no Painel da Global Health e testo aqui na hora.

Valeu demais!

---

## Notas internas (não enviar)

**Estado da homolog, revalidado endpoint por endpoint em 26/ago/2026 (noite):**

| O quê | Medido |
|---|---|
| Consultas publicadas | **1** (`1843` Consulta Cardiologica) |
| Exames publicados | **0** |
| Convênios do item 1843 | **32** (Particular = id 3) |
| Prestadores publicados | **4** (21 Amanda, 51 Charles, 140 Norvandia, 160 Ricardo) |
| Prestadores **com horário** | **3** (o Charles não tem) |
| Horários livres | **4**, em 3 agendas (990, 994, 1010), em **2 dias** (27 e 28/08) |
| Planos por convênio | Particular **2**, Allianz **6**, Unimed **104**, Sul America **876** |

O horizonte foi varrido **14 janelas de 14 dias, até março de 2027**: os 4 horários são tudo o que
existe. Não é recorte de data.

**O catálogo de exames está vazio de verdade, e não é parâmetro faltando.** Testadas 11 formas de
chamar `GET /exames` (sem parâmetro, `size=100`, `page`, `pesquisa` vazia, `pesquisa` com termo,
`idItemAgendamento`, `idUnidade`): **todas HTTP 200 com zero itens**. A doc oficial v1.10 confirma que
o endpoint não tem parâmetro obrigatório. Não há exame cadastrado.

**O que cada pedido destrava:**

1. **Especialidade nova** fecha a ressalva do ADR-0025 (provar que a lista de convênios muda por
   especialidade, hoje provado só pelo negativo) e mata na raiz o falso positivo do filtro `pesquisa`,
   que hoje devolve "Consulta Cardiologica" para quem procura UROLOGIA, NEUROLOGIA, GINECOLOGIA ou
   DERMATOLOGIA. A trava está na descrição da tool 8, mas dado real é prova melhor que trava.
2. **Mais dias** destrava a preferência de data e a paginação por `dataPaginaSeguinte`, e enche a lista
   numerada de 5 opções, que hoje nunca passa de 4.
3. **Um exame** destrava a Cadeia E inteira (triagem, `solicitarAnexo`, `obrigarAnexo`, preparo,
   `/exames/perguntas`, `/exames/instrucaoGeral`), que nunca rodou uma vez sequer.

**Fora do pedido, para a Global Health** (perguntas 19 a 21 de `perguntas-global-health.md`):
o filtro `pesquisa` de `/consultas` **casa por aproximação e devolve a especialidade errada** (procurar
UROLOGIA, NEUROLOGIA, GINECOLOGIA ou DERMATOLOGIA devolve "Consulta Cardiologica"; ORTOPEDIA e
PEDIATRIA devolvem vazio, como deveriam); e `GET /convenios/{id}/planos` devolve **876 planos** para a
Sul America, sem a Ana ter como escolher o certo.

**Correção de um erro meu, registrada para não se repetir:** eu havia anotado que
`GET /horarios/{id}/instrucoes` estava com defeito (HTTP 500 com id real). **Não está.** A doc v1.10
(página do endpoint) exige `?idItemAgendamento=&idConvenio=`, e eu chamava sem eles. Com os parâmetros
certos responde **HTTP 200** com `{"instrucoes": ""}` (consulta não tem preparo, o que faz sentido).
O mesmo vale para `/exames/instrucaoGeral` (exige `idItemAgendamento`) e `/exames/perguntas` (exige
`idItemAgendamento` e `cpf`): os dois respondem 200 quando chamados como a doc manda. **Regra: nesta
API, HTTP 500 costuma ser parâmetro obrigatório faltando, não defeito.** Conferir a doc antes de
chamar de bug.

**`somentePrestadoresComHorario=true` é INUTILIZÁVEL na prática, e isso foi medido.** A doc v1.4
anuncia o parâmetro em `GET /prestadores`, e ele até responde certo (devolve 3, some o Charles). Mas
**estoura 60 segundos em 5 de 5 tentativas**; sem o parâmetro, o mesmo endpoint responde em 577 a
933 ms. Foi descartado da tool 10 por isso: uma ferramenta que trava um minuto deixa a Ana muda no
WhatsApp. Virou a pergunta 22 para a Global Health.

**Defeito nosso, achado e corrigido na mesma sessão:** a tool 10 `consultar_prestadores_agenda`
chamava `GET /prestadores?pesquisa=CARDIOLOGIA`, e esse parâmetro **devolve lista vazia** nesta API.
A tool estava quebrada desde a V15 (07/ago), sem ninguém notar, porque o catálogo vazio mascarava o
defeito: vazio por falta de massa e vazio por chamada errada são indistinguíveis. Trocada para
`idItemAgendamento`, passou a devolver os 4 profissionais. Prova no playground: "quais cardiologistas
atendem?" agora lista os quatro nomes e oferece consultar horários, sem prometer disponibilidade.

**Lição:** enquanto uma API responde vazio por falta de dado, ela esconde os erros de chamada. Toda
tool escrita naquele período merece um teste agora que existe massa.
