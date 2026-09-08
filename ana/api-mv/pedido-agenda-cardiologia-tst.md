# Pedido ao analista de TI: 1 agenda de teste no SoulMV TST (ADR-0023, V31)

> Mensagem pronta para o Pedro enviar por WhatsApp, junto com o PDF
> `tutorial-agenda-online-gh.pdf` (o guia oficial da MV "Disponibilização de
> agenda no ambiente Online"). Enviar as duas coisas na mesma conversa.

---

Oi, [nome]! Tudo bem? Preciso de uma ajuda pontual no SoulMV de TESTE para destravar os testes da Ana.

A gente está com o agendamento online de homologação da Global Health 100% vazio desde julho (sem especialidade, sem agenda), e isso trava os testes do bot. Descobri no guia oficial da MV (PDF em anexo) que a agenda aparece no online quando ela é cadastrada no Soul e ativada no Painel de Controle da GH. O Painel de homologação eu mesmo acesso; o que me falta é o cadastro no Soul de teste.

O pedido é pequeno, uma agenda só:

1. No SoulMV de TESTE (base TST), criar uma agenda de CARDIOLOGIA com:
   - um prestador de teste vinculado ao item de agendamento (tela "Item Agendamento x Prestador" do guia);
   - unidade de atendimento preenchida;
   - "Agenda Pública" = Sim e agenda ativa;
   - alguns horários livres nas próximas semanas.
2. Se a tela pedir convênio: pode deixar sem convênio, que eu ativo a exibição de agendas sem convênio no Painel da GH (o guia mostra essa opção).

E uma pergunta rápida, que ninguém nos respondeu ainda: o SoulMV de TESTE alimenta o ambiente de homologação da GH (dem.agenda.globalhealth.mv)? É esse ambiente que os nossos testes consultam.

Quando estiver de pé me avisa que eu confiro no Painel e rodo o teste daqui na hora. Qualquer dúvida o passo a passo com prints está no PDF (4 páginas). Valeu demais!

---

## Links oficiais (do WhatsApp do hospital, registrados em 26/ago/2026)

| O quê | Homolog (DEM, usar) | Produção (PROD, JAMAIS tocar) |
|---|---|---|
| Painel de Controle | https://dem.globalhealth.mv/adm/ | https://prod.globalhealth.mv/adm/ |
| Agendamento Online (visão do paciente) | https://dem.agenda.globalhealth.mv/agendar/?key=saomatheus | https://app.agenda.globalhealth.mv/agendar/?key=saomatheus |

Vídeo de treinamento (Agendamento Online + Painel de Controle): https://drive.google.com/file/d/1XdeYNwzNGG3WnSUnq-Of46GFS8tfFnRY/view?usp=sharing

## Depois do envio (para a sessão)

- Quando o analista avisar: Pedro confere no Painel GH homolog (tela Agenda > Itens Agendamento) e ativa o item de Cardiologia se estiver desligado.
- Prova: `python3 ana/api-mv/scripts/smoke-gh.py` deve sair de VAZIO para OK em `/consultas`.
- Na sequência: re-validar a vitrine da V15 (Cardiologia no playground, duas chamadas encadeadas) e conferir a Cadeia D destravando em `os/cadeias.html`.
