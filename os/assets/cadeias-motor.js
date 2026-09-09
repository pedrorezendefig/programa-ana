/* Ana OS: o motor das cadeias da Global Health (ADR-0027, extraído da página
   os/arquivo/cadeias.html no ADR-0030). Sem DOM: só as definições das seis cadeias
   (elo a elo, com entradas, pré-requisitos e a chamada real via /api/gh do server)
   e a API para rodar um elo, uma cadeia inteira ou recomeçar com dados novos.
   Quem desenha é a aba Global Health do index.html (os/assets/os-esferas.js).

   Uso:
     CadeiasMotor.cadeias                 as seis cadeias, na ordem
     CadeiasMotor.elo("D", "D3")          a definição do elo
     CadeiasMotor.motivo("D", "D3")       por que não roda ainda (ou null)
     CadeiasMotor.entradas("D", "D3")     [{campo, valor, de, porque}] com o contexto de agora
     await CadeiasMotor.rodar("D", "D3")  {estado, detalhe, resposta, saidas}
     CadeiasMotor.falaViva("D", "D5")     a fala da Ana montada com a resposta real (ou null)
     CadeiasMotor.recomecar("A")          contexto novo (a cadeia A sorteia outro paciente)
   Ambiente: só a homologação da Global Health, pelo server (token nunca no navegador). */

var CadeiasMotor = (function () {
"use strict";


/* ---------- infra ---------- */

async function gh(method, path, query, body) {
  const pedido = { method: method, path: path, query: query || {}, body: body || null };
  const resp = await fetch("/api/gh", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pedido),
  });
  const r = await resp.json();
  r.pedido = pedido;
  return r;
}

function conteudoDe(r) {
  if (r && r.json && Array.isArray(r.json.conteudo)) return r.json.conteudo;
  if (r && Array.isArray(r.json)) return r.json;
  return null;
}

function cpfSintetico() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv = (base, pesoInicial) => {
    const soma = base.reduce((acc, d, i) => acc + d * (pesoInicial - i), 0);
    return (soma * 10) % 11 % 10;
  };
  const d1 = dv(n, 10), d2 = dv(n.concat(d1), 11);
  return n.concat(d1, d2).join("");
}

function telefoneSintetico() {
  return "2199" + String(Math.floor(1000000 + Math.random() * 9000000));
}

function cpfBonito(c) {
  return c ? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : "";
}

const SUFIXOS_NOME = ["ALFA", "BRAVO", "CHARLIE", "DELTA", "ECO", "FOX", "GOLF",
  "HOTEL", "INDIA", "JULIET", "KILO", "LIMA", "MIKE", "NOVEMBER", "OSCAR",
  "PAPA", "QUEBEC", "ROMEO", "SIERRA", "TANGO", "UNIFORM", "VICTOR", "ZULU"];

function pessoaSintetica() {
  const ano = 1950 + Math.floor(Math.random() * 56);
  const mes = 1 + Math.floor(Math.random() * 12);
  const dia = 1 + Math.floor(Math.random() * 28);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    cpf: cpfSintetico(),
    telefone: telefoneSintetico(),
    nome: "TESTE DEMO ANA VITTA " + SUFIXOS_NOME[Math.floor(Math.random() * SUFIXOS_NOME.length)],
    dataNascimento: ano + "-" + pad(mes) + "-" + pad(dia),
    sexo: Math.random() < 0.5 ? "F" : "M",
  };
}

const SONDA = { cpf: "66301102770", nome: "TESTE INTEGRACAO ANA VITTA", id: 1681 };

/* Achata a resposta de /agendas/v2 em uma lista de horários com o médico. */
function horariosDe(r) {
  const lista = [];
  const agendas = (r && r.json && r.json.agendas) || [];
  agendas.forEach(a => (a.prestadores || []).forEach(p => (p.horarios || []).forEach(h => {
    lista.push({ idHorario: h.idHorario, idAgenda: h.idAgenda, data: h.data, hora: h.hora, medico: p.nomePrestadorRecurso, unidade: a.nomeUnidade });
  })));
  return lista;
}

function listaNumerada(horarios) {
  return horarios.slice(0, 5).map((h, i) => (i + 1) + ") " + h.data + " às " + h.hora + " com " + h.medico).join("\n");
}

/* ---------- ferramentas da Ana (selo de origem e concessão) ----------
   Concessão carimbada em os/dados/grants-medida.json (ADR-0018). As tools 13 e 14
   nasceram em 26/ago (V33) e entraram no grant na mesma noite; o carimbo é anterior. */
const T = {
  precos: { nome: "consultar_precos_consultas", origem: "hospital", tem: true },
  exames: { nome: "consultar_exames", origem: "hospital", tem: true },
  cpf: { nome: "buscar_paciente_por_cpf", origem: "gh", tem: true },
  tel: { nome: "buscar_paciente_por_telefone", origem: "gh", tem: true },
  cadastrar: { nome: "cadastrar_paciente", origem: "gh", tem: false, motivo: "fora do grant desde a V20 (ADR-0014); volta com a P6" },
  esp: { nome: "consultar_especialidades_agenda", origem: "gh", tem: true },
  conv: { nome: "consultar_convenios_agenda", origem: "gh", tem: true },
  planos: { nome: "consultar_planos_convenio", origem: "gh", tem: true },
  horarios: { nome: "consultar_horarios_livres", origem: "gh", tem: true },
  prest: { nome: "consultar_prestadores_agenda", origem: "gh", tem: true },
  listar: { nome: "listar_agendamentos", origem: "gh", tem: false, motivo: "não existe ainda: Seção 2.6, gated P6" },
  agendar: { nome: "agendar_horario", origem: "gh", tem: false, motivo: "não existe ainda: Seção 2.5, gated P6 (Prova no banco)" },
  reagendar: { nome: "reagendar_horario", origem: "gh", tem: false, motivo: "não existe ainda: Seção 2.6, gated P6" },
  cancelar: { nome: "cancelar_agendamento", origem: "gh", tem: false, motivo: "não existe ainda: Seção 2.6, gated P6" },
  tipos: { nome: "consultar_tipos_consulta", origem: "gh", tem: false, motivo: "não existe ainda: só faz sentido com a finalização (P6)" },
  carteira: { nome: "cadastrar_carteira", origem: "gh", tem: false, motivo: "não existe: a Ana nunca grava carteira" },
  label: { nome: "assign_label", origem: "nativa", tem: true },
  kanban: { nome: "kanban_move_card", origem: "nativa", tem: true },
  nota: { nome: "private_note", origem: "nativa", tem: true },
  handoff: { nome: "handoff_to_human", origem: "nativa", tem: true },
  attr: { nome: "set_custom_attribute", origem: "nativa", tem: true },
};
const ORIGEM_TXT = { gh: "Global Health", hospital: "API do Hospital", nativa: "nativa" };

/* ---------- estados ---------- */

const ESTADO_CHIP = {
  ok: { classe: "chip feito", texto: "funcionou" },
  vazio: { classe: "chip azul", texto: "vazio esperado" },
  recusa: { classe: "chip selo-saas", texto: "recusou certo" },
  bloqueado: { classe: "chip bloqueada", texto: "bloqueado" },
  regra: { classe: "chip contorno", texto: "não roda daqui" },
  conversa: { classe: "chip pendente", texto: "só conversa" },
  falha: { classe: "chip tag", texto: "falha real" },
};

/* ---------- helpers de resultado ---------- */

function falhaHttp(r) { return { estado: "falha", detalhe: "HTTP " + r.status, resposta: r }; }

/* Helpers de precisa(): devolvem o motivo do bloqueio ou null. */
const precisaItem = (c) => c.idItem ? null : "precisa do id do item agendável (elo da especialidade)";
const precisaConv = (c) => precisaItem(c) || (c.idConvenio ? null : "precisa do id do convênio (elo dos convênios)");
const precisaPlano = (c) => precisaConv(c) || (c.idPlano ? null : "precisa do id do plano (elo dos planos)");
const precisaHorario = (c) => c.horarios && c.horarios.length ? null : "precisa de um horário real (elo dos horários)";

/* Elos reaproveitados: a cadeia de quatro elos da Seção 2.3.1 aparece na C (convênio) e na D (particular).
   Cada elo pode declarar `secao` (a chave da seção do prompt naquele momento, como está no
   circuito.json); o link para a seção só nasce se ela existir lá (contrato de links, ADR-0029). */

function eloEspecialidade(id, conversa, refs) {
  /* refs: quem alimenta quem, por letra da cadeia (C1..C5 ou D2..D5), e a seção do prompt */
  return {
    id: id, metodo: "GET", caminho: "/consultas?pesquisa=CARDIOLOGIA", tool: T.esp, secao: refs.secao,
    explica: "Elo 1 da cadeia da Seção 2.3.1: a especialidade vira um item agendável com id. Sem esse id nada a jusante anda.",
    entradas: () => [{ campo: "pesquisa", valor: "CARDIOLOGIA", de: "o paciente", porque: "a especialidade que o paciente pediu, em CAIXA ALTA e sem acento (regra da descrição da tool 8)" }],
    precisa: () => null,
    async executar(ctx) {
      const r = await gh("GET", "/consultas", { pesquisa: "CARDIOLOGIA" });
      if (r.status !== 200) return falhaHttp(r);
      const c = conteudoDe(r) || [];
      const item = c.find(i => /cardio/i.test(i.nome) && !i.bloqueado);
      if (!item) return { estado: "vazio", detalhe: "nenhum item de Cardiologia publicado (conferir o Painel GH)", resposta: r };
      ctx.idItem = item.id; ctx.nomeItem = item.nome;
      return {
        estado: "ok", detalhe: item.nome + " (id " + item.id + ")", resposta: r,
        saidas: [{ campo: "id", valor: item.id, para: "todos os elos seguintes", porque: "é o idItemAgendamento; a Ana confere o campo nome antes de seguir, porque a busca casa por aproximação" }],
      };
    },
    conversa: conversa,
  };
}

function eloConvenios(id, escolha, conversa, refs) {
  /* escolha: {modo:"particular"} ou {modo:"nome", nome:"Unimed"} */
  return {
    id: id, metodo: "GET", caminho: "/convenios?idItemAgendamento={idItem}&size=100", tool: T.conv, secao: refs.secao,
    explica: "Elo 2: os convênios aceitos por ESTE item (a lista é escopada pela especialidade, ADR-0025). O particular é uma linha como as outras, com a marca particular = true.",
    entradas: (c) => [{ campo: "idItemAgendamento", valor: c.idItem, de: refs.item, porque: "o id que a especialidade devolveu; a lista muda de item para item" },
      { campo: "size", valor: 100, de: "a tool", porque: "a API pagina em 10; a tool 13 pede 100 fixo para a lista vir inteira" }],
    precisa: precisaItem,
    async executar(ctx) {
      const r = await gh("GET", "/convenios", { idItemAgendamento: ctx.idItem, size: 100 });
      if (r.status !== 200) return falhaHttp(r);
      const c = conteudoDe(r) || [];
      ctx.convenios = c;
      let esc, porque;
      if (escolha.modo === "particular") {
        esc = c.find(x => x.particular && /^particular$/i.test(x.nome)) || c.find(x => x.particular);
        porque = "fluxo particular: a linha com particular = true e nome Particular (Funcionario também tem a marca, por isso o nome decide)";
      } else {
        esc = c.find(x => new RegExp(escolha.nome, "i").test(x.nome));
        porque = "fluxo de convênio: a linha cujo nome bate com o que o paciente disse (" + escolha.nome + ")";
      }
      if (!c.length) return { estado: "vazio", detalhe: "0 convênios para o item " + ctx.idItem, resposta: r };
      if (!esc) { ctx.convenioAusente = true; return { estado: "ok", detalhe: c.length + " convênios, e " + escolha.nome + " NÃO está entre eles (a Ana nega a cobertura e oferece particular)", resposta: r }; }
      ctx.idConvenio = esc.id; ctx.nomeConvenio = esc.nome;
      return {
        estado: "ok", detalhe: c.length + " convênios; escolhido " + esc.nome + " (id " + esc.id + ")", resposta: r,
        saidas: [{ campo: "id", valor: esc.id, para: "planos e horários", porque: porque }],
      };
    },
    conversa: conversa,
  };
}

function eloPlanos(id, conversa, refs) {
  return {
    id: id, metodo: "GET", caminho: "/convenios/{idConvenio}/planos?idItemAgendamento={idItem}", tool: T.planos, secao: refs.secao,
    explica: "Elo 3: os planos do convênio escolhido. A regra da tool 14 manda pegar o PRIMEIRO da lista, a menos que o paciente tenha dito o nome do plano dele.",
    entradas: (c) => [{ campo: "idConvenio", valor: c.idConvenio, de: refs.conv, porque: "o id da linha escolhida na lista de convênios; vai no caminho da URL" },
      { campo: "idItemAgendamento", valor: c.idItem, de: refs.item, porque: "o mesmo item, para a API filtrar os planos válidos nessa especialidade" }],
    precisa: precisaConv,
    async executar(ctx) {
      const r = await gh("GET", "/convenios/" + ctx.idConvenio + "/planos", { idItemAgendamento: ctx.idItem });
      if (r.status !== 200) return falhaHttp(r);
      const c = conteudoDe(r) || [];
      ctx.planos = c;
      if (!c.length) return { estado: "vazio", detalhe: "0 planos para o convênio " + ctx.idConvenio + " (a cadeia para: PASSO A2)", resposta: r };
      ctx.idPlano = c[0].id; ctx.nomePlano = c[0].nome;
      return {
        estado: "ok", detalhe: c.length + " plano(s); escolhido " + c[0].nome + " (id " + c[0].id + ")", resposta: r,
        saidas: [{ campo: "id", valor: c[0].id, para: "horários", porque: "o primeiro da lista (ordem = 1), porque o paciente não disse o nome do plano. Aqui é um ponto de decisão do programa: perguntar ou fixar um padrão" }],
      };
    },
    conversa: conversa,
  };
}

function eloHorarios(id, conversa, refs) {
  return {
    id: id, metodo: "GET", caminho: "/agendas/v2?idItemAgendamento&idConvenio&idPlano", tool: T.horarios, secao: refs.secao,
    explica: "Elo 4, o último: exige os TRÊS ids. Faltando um, HTTP 500. Id inventado NÃO dá erro: devolve agendas vazio, que parece agenda sem horário. A Ana não manda data: a janela de 14 dias é padrão da GH.",
    entradas: (c) => [{ campo: "idItemAgendamento", valor: c.idItem, de: refs.item, porque: "a especialidade" },
      { campo: "idConvenio", valor: c.idConvenio, de: refs.conv, porque: "a linha de convênio escolhida" },
      { campo: "idPlano", valor: c.idPlano, de: refs.plano, porque: "o plano escolhido" }],
    precisa: precisaPlano,
    async executar(ctx) {
      const r = await gh("GET", "/agendas/v2", { idItemAgendamento: ctx.idItem, idConvenio: ctx.idConvenio, idPlano: ctx.idPlano });
      if (r.status !== 200) return falhaHttp(r);
      const hs = horariosDe(r);
      ctx.horarios = hs;
      const janela = r.json ? (r.json.dataInicial + " a " + r.json.dataFinal + ", " + r.json.diasPesquisados + " dias") : "";
      if (!hs.length) return { estado: "vazio", detalhe: "agendas vazio (" + janela + "): a Ana avisa e encaminha (PASSO A2)", resposta: r };
      const h = hs[0];
      return {
        estado: "ok", detalhe: hs.length + " horário(s) livre(s) na janela " + janela, resposta: r,
        saidas: [{ campo: "idHorario", valor: h.idHorario, para: "instruções e finalização", porque: "o primeiro horário da lista (a Ana só usa o que o paciente escolher pelo número)" },
          { campo: "idAgenda", valor: h.idAgenda, para: "tipos de consulta", porque: "a agenda do médico daquele horário" }],
      };
    },
    conversa: conversa,
  };
}

const REFS_C = { item: "C1", conv: "C2", plano: "C3", secao: "3.2" };
const REFS_D = { item: "D2", conv: "D3", plano: "D4", secao: "2.3.1" };

/* ---------- as seis cadeias ---------- */

const CADEIAS = [
  {
    letra: "A", titulo: "Paciente novo: identificar e cadastrar",
    resumo: "A prova de criação: o sistema confirma que o CPF não existe, aceita o cadastro e devolve o paciente novo por CPF e por telefone. O elo do telefone é o caminho real da Ana no WhatsApp.",
    escrita: "Cria 1 cadastro de teste (nome TESTE DEMO ANA VITTA + palavra) na homologação. CPF, telefone, nascimento e sexo são sorteados a cada Recomeçar. Não há como apagar pessoas pela API; os testes acumulam e isso é esperado.",
    preparar(ctx) { const p = pessoaSintetica(); ctx.p = p; ctx.cpf = p.cpf; ctx.tel = p.telefone; },
    elos: [
      {
        id: "A1", metodo: "GET", caminho: "/pessoas?cpf={cpf}", tool: T.cpf, secao: "Coleta",
        explica: "Fotografia do antes: esse CPF acabou de ser sorteado, então o certo é voltar vazio.",
        entradas: (c) => [{ campo: "cpf", valor: c.cpf, de: "o paciente", porque: "na Ana é o CPF que o paciente digitou, validado (11 dígitos) e sem pontos; aqui é sorteado com dígito verificador válido" }],
        precisa: () => null,
        async executar(ctx) {
          const r = await gh("GET", "/pessoas", { cpf: ctx.cpf });
          if (r.status !== 200) return falhaHttp(r);
          const achou = (r.corpo_cru || "").indexOf(ctx.cpf) >= 0;
          return achou
            ? { estado: "falha", detalhe: "CPF sintético já existia (colisão raríssima): Recomeçar", resposta: r }
            : { estado: "ok", detalhe: "0 encontrados para o CPF " + ctx.cpf + " (o esperado)", resposta: r, saidas: [{ campo: "conteudo", valor: "vazio", para: "A2", porque: "vazio significa paciente sem cadastro: é o que libera o cadastro" }] };
        },
        conversa: {
          ana0: "Ótimo! Me passa seu nome completo e CPF, por favor? Assim já deixo tudo pronto para o agendamento.",
          paciente: (c) => (c.p ? c.p.nome : "TESTE DEMO ANA VITTA") + ", " + cpfBonito(c.cpf || "00000000000"),
          tools: [T.cpf],
          nota: "A Ana só chama a busca depois de validar nome (duas palavras) e CPF (11 dígitos). Nascimento e telefone ela não pede (ADR-0014).",
        },
      },
      {
        id: "A2", metodo: "POST", caminho: "/pessoas", tool: T.cadastrar,
        explica: "A criação. A API devolve o id na hora. Regra medida em campo: nome com número é recusado (417).",
        entradas: (c) => [
          { campo: "nome", valor: c.p && c.p.nome, de: "A1", porque: "o nome que o paciente deu; sem números, senão 417" },
          { campo: "cpf", valor: c.cpf, de: "A1", porque: "o mesmo CPF que voltou vazio" },
          { campo: "telefone", valor: c.tel, de: "o WhatsApp", porque: "na Ana seria o número que conversa; aqui é sorteado" },
          { campo: "dataNascimento", valor: c.p && c.p.dataNascimento, de: "o paciente", porque: "obrigatória na API, em aaaa-mm-dd; hoje a Ana não pergunta" },
          { campo: "sexo", valor: c.p && c.p.sexo, de: "sorteio", porque: "campo aceito pela API, fora do fluxo da Ana" },
        ],
        precisa: () => null,
        async executar(ctx) {
          const r = await gh("POST", "/pessoas", null, ctx.p);
          if (r.status === 200 && r.json && r.json.id) {
            ctx.id = r.json.id;
            return { estado: "ok", detalhe: "criado " + ctx.p.nome + " com id " + r.json.id, resposta: r, saidas: [{ campo: "id", valor: r.json.id, para: "A3 e A4 (releitura)", porque: "o id novo do cadastro no SaaS da GH" }] };
          }
          return falhaHttp(r);
        },
        conversa: {
          tools: [T.cadastrar],
          nota: "<strong>Hoje a Ana não cadastra.</strong> A tool existe (id 7) mas está fora do grant (ADR-0014): sem finalização automática, cadastrar só cria lixo. Ela segue o agendamento e avisa a equipe no resumo que o paciente não tem cadastro. Volta com a P6, pedindo só o nascimento (o telefone vem de {{contact_phone}}).",
        },
      },
      {
        id: "A3", metodo: "GET", caminho: "/pessoas?cpf={cpf}", tool: T.cpf, secao: "Coleta",
        explica: "A releitura: o cadastro que não existia segundos atrás agora tem que voltar completo.",
        entradas: (c) => [{ campo: "cpf", valor: c.cpf, de: "A2", porque: "o mesmo CPF do cadastro" }],
        precisa: (c) => c.id ? null : "precisa do cadastro criado em A2",
        async executar(ctx) {
          const r = await gh("GET", "/pessoas", { cpf: ctx.cpf });
          const achou = r.status === 200 && (r.corpo_cru || "").indexOf(ctx.cpf) >= 0;
          return achou
            ? { estado: "ok", detalhe: "reencontrado pelo CPF (id " + ctx.id + ")", resposta: r }
            : { estado: "falha", detalhe: "criou mas não releu (HTTP " + r.status + ")", resposta: r };
        },
        conversa: {
          tools: [T.cpf],
          ana: (c) => "Confirma para mim: é para o agendamento no nome de " + (c.p ? c.p.nome : "...") + "?",
          nota: "Paciente com cadastro: a Ana confirma pelo nome que a API devolveu, sem ler o CPF de volta.",
        },
      },
      {
        id: "A4", metodo: "GET", caminho: "/pessoas?telefone={telefone}", tool: T.tel, secao: "Coleta",
        explica: "O elo de ouro: achar o paciente pelo telefone. É assim que a Ana identifica quem conversa quando não há CPF.",
        entradas: (c) => [{ campo: "telefone", valor: c.tel, de: "A2", porque: "só dígitos, com DDD, sem +55; na Ana vem do próprio contato do WhatsApp" }],
        precisa: (c) => c.id ? null : "precisa do cadastro criado em A2",
        async executar(ctx) {
          const r = await gh("GET", "/pessoas", { telefone: ctx.tel });
          const achou = r.status === 200 && (r.corpo_cru || "").indexOf(ctx.cpf) >= 0;
          return achou
            ? { estado: "ok", detalhe: "reencontrado pelo telefone " + ctx.tel, resposta: r }
            : { estado: "falha", detalhe: "não achou pelo telefone (HTTP " + r.status + ")", resposta: r };
        },
        conversa: {
          tools: [T.tel],
          nota: "Uso na Ana: só quando o paciente quer agendar e não tem o CPF à mão. A busca por CPF é a preferencial.",
        },
      },
      {
        id: "A5", metodo: "GET", caminho: "/agendamentos?cpf={cpf}&tipoAgendamento=CONSULTA", tool: T.listar,
        explica: "Coerência: paciente recém-criado não tem histórico. Lista vazia é o certo. O enum exige CAIXA ALTA (minúsculo = 500).",
        entradas: (c) => [{ campo: "cpf", valor: c.cpf, de: "A2", porque: "o paciente novo" }, { campo: "tipoAgendamento", valor: "CONSULTA", de: "fixo", porque: "CONSULTA ou EXAME, sempre em caixa alta" }],
        precisa: (c) => c.id ? null : "precisa do cadastro criado em A2",
        async executar(ctx) {
          const r = await gh("GET", "/agendamentos", { cpf: ctx.cpf, tipoAgendamento: "CONSULTA" });
          if (r.status !== 200) return falhaHttp(r);
          const c = conteudoDe(r) || [];
          return c.length === 0
            ? { estado: "vazio", detalhe: "0 agendamentos (o certo para paciente novo)", resposta: r }
            : { estado: "ok", detalhe: c.length + " agendamento(s)", resposta: r };
        },
        conversa: {
          tools: [T.listar],
          nota: "A Ana ainda não lista agendamentos (Seção 2.6, gated P6). Quando existir, este é o elo que evita marcar em duplicidade (PASSO F2).",
        },
      },
    ],
  },

  {
    letra: "B", titulo: "Paciente conhecido: o sonda de julho",
    resumo: "Persistência: o paciente-sonda (id 1681) foi criado pela API em 07/jul. Dois meses depois continua lá, íntegro, com carteiras e agendamentos coerentemente vazios.",
    elos: [
      {
        id: "B1", metodo: "GET", caminho: "/pessoas?cpf=66301102770", tool: T.cpf, secao: "Coleta",
        explica: "O sonda TESTE INTEGRACAO ANA VITTA. Voltar íntegro prova que o dado persiste no SaaS da GH.",
        entradas: () => [{ campo: "cpf", valor: SONDA.cpf, de: "o paciente", porque: "o CPF de teste fixo, criado de propósito em 07/jul (nunca CPF real)" }],
        precisa: () => null,
        async executar(ctx) {
          const r = await gh("GET", "/pessoas", { cpf: SONDA.cpf });
          const achou = r.status === 200 && (r.corpo_cru || "").indexOf(SONDA.cpf) >= 0;
          if (achou) ctx.sonda = true;
          return achou
            ? { estado: "ok", detalhe: "sonda íntegro desde 07/jul (id 1681)", resposta: r, saidas: [{ campo: "nome", valor: SONDA.nome, para: "a conversa", porque: "a Ana confirma o paciente pelo nome devolvido" }] }
            : { estado: "falha", detalhe: "sonda não encontrado (HTTP " + r.status + ")", resposta: r };
        },
        conversa: {
          paciente: SONDA.nome + ", " + cpfBonito(SONDA.cpf),
          tools: [T.cpf, T.attr],
          ana: "Confirma para mim: é para o agendamento no nome de " + SONDA.nome + "?",
          nota: "Desde o prompt v6.7 a Ana guarda nome_completo e cpf no contato (set_custom_attribute). Na conversa seguinte ela confirma pelo nome sem pedir CPF de novo.",
        },
      },
      {
        id: "B2", metodo: "GET", caminho: "/carteiras?cpf=66301102770", tool: T.carteira,
        explica: "Nunca criamos carteira para ele: lista vazia é coerência, não defeito.",
        entradas: () => [{ campo: "cpf", valor: SONDA.cpf, de: "B1", porque: "o mesmo paciente" }],
        precisa: () => null,
        async executar() {
          const r = await gh("GET", "/carteiras", { cpf: SONDA.cpf });
          if (r.status !== 200) return falhaHttp(r);
          const c = conteudoDe(r) || [];
          return { estado: c.length ? "ok" : "vazio", detalhe: c.length + " carteira(s)", resposta: r };
        },
        conversa: { tools: [T.carteira], nota: "A Ana não mexe com carteira de convênio. Quem cadastra carteira é a recepção." },
      },
      {
        id: "B3", metodo: "GET", caminho: "/agendamentos?cpf=66301102770&tipoAgendamento=CONSULTA", tool: T.listar,
        explica: "Nunca finalizamos agendamento para ele: a finalização é a fronteira da GH-18 (provar no banco do hospital).",
        entradas: () => [{ campo: "cpf", valor: SONDA.cpf, de: "B1", porque: "o mesmo paciente" }, { campo: "tipoAgendamento", valor: "CONSULTA", de: "fixo", porque: "caixa alta obrigatória" }],
        precisa: () => null,
        async executar(ctx) {
          const r = await gh("GET", "/agendamentos", { cpf: SONDA.cpf, tipoAgendamento: "CONSULTA" });
          if (r.status !== 200) return falhaHttp(r);
          const c = conteudoDe(r) || [];
          ctx.agendamentos = c;
          return { estado: c.length ? "ok" : "vazio", detalhe: c.length + " agendamento(s)", resposta: r };
        },
        conversa: { tools: [T.listar], nota: "Ainda sem ferramenta na Ana (P6). No dia em que existir, é o que responde “tenho consulta marcada?”." },
      },
    ],
  },

  {
    letra: "C", titulo: "Convênio: a cobertura vem da agenda (ADR-0025)",
    resumo: "O paciente diz o convênio. A Ana não olha mais tabela curada: pergunta à agenda online quais convênios atendem a especialidade, procura o nome, desce aos planos e busca horário. No fim, prova que a API valida: uma carteira incompleta de propósito é recusada.",
    escrita: "O único POST é deliberadamente incompleto: a expectativa é a recusa (HTTP 417). Nada é gravado, nada é excluído.",
    elos: [
      eloEspecialidade("C1", {
        paciente: "Tenho Unimed. Cardiologia cobre?",
        tools: [T.esp],
        nota: "Cobertura de convênio não é tabela: é a cadeia da agenda (Seção 3.2). O primeiro elo é o mesmo do particular.",
      }, REFS_C),
      eloConvenios("C2", { modo: "nome", nome: "Unimed" }, {
        tools: [T.conv],
        ana: (c) => c.convenioAusente
          ? "Não encontrei a Unimed na agenda de Cardiologia. Posso te encaminhar para a equipe confirmar, ou ver o valor particular?"
          : (c.nomeConvenio ? "Boa notícia: a " + c.nomeConvenio + " atende Cardiologia aqui. Quer que eu veja os horários disponíveis para você?" : "..."),
        nota: "A Ana procura o nome do paciente na lista (33 hoje) e nunca lê a lista crua. Convênio ausente = negativa clara + oferta do particular, sem inventar.",
      }, REFS_C),
      eloPlanos("C3", {
        tools: [T.planos],
        nota: "Plano é uso interno: a Ana não diz o nome ao paciente. Só pergunta se o paciente mencionar o plano dele.",
      }, REFS_C),
      {
        id: "C4", metodo: "GET", caminho: "/convenios/{idConvenio}/planos/{idPlano}/subPlanos", tool: null,
        explica: "O último nível da árvore, quando o plano tem subdivisões. Não faz parte da cadeia da Ana.",
        entradas: (c) => [{ campo: "idConvenio", valor: c.idConvenio, de: "C2", porque: "no caminho da URL" }, { campo: "idPlano", valor: c.idPlano, de: "C3", porque: "no caminho da URL" }, { campo: "idItemAgendamento", valor: c.idItem, de: "C1", porque: "escopo da especialidade" }],
        precisa: precisaPlano,
        async executar(ctx) {
          const r = await gh("GET", "/convenios/" + ctx.idConvenio + "/planos/" + ctx.idPlano + "/subPlanos", { idItemAgendamento: ctx.idItem });
          if (r.status !== 200) return falhaHttp(r);
          const c = conteudoDe(r) || [];
          return { estado: c.length ? "ok" : "vazio", detalhe: c.length + " sub-plano(s)", resposta: r };
        },
        conversa: { nota: "A Ana não desce até aqui: o elo 4 (horários) aceita o plano direto." },
      },
      eloHorarios("C5", {
        paciente: "sim",
        tools: [T.horarios],
        ana: (c) => c.horarios && c.horarios.length
          ? "Achei estes horários para Cardiologia pela " + (c.nomeConvenio || "seu convênio") + ":\n\n" + listaNumerada(c.horarios) + "\n\nMe diz o número da opção que você prefere?"
          : "A agenda online não me retornou horários agora. Nossa equipe vai entrar em contato para confirmar o melhor horário com você.",
        nota: "Mesma cadeia do particular, com o idConvenio do convênio. Provado no playground em 26/ago: Unimed Do Brasil com horário real.",
      }, REFS_C),
      {
        id: "C6", metodo: "POST", caminho: "/carteiras (incompleto de propósito)", tool: T.carteira,
        explica: "Sem o número da carteira, o certo é a API recusar. A mensagem citando o campo é regra de negócio do MV funcionando. Mock aceitaria qualquer coisa.",
        entradas: (c) => [{ campo: "cpf", valor: SONDA.cpf, de: "fixo", porque: "o sonda" }, { campo: "idConvenio", valor: c.idConvenio || 999999, de: c.idConvenio ? "C2" : "inventado", porque: "o convênio escolhido, ou um inventado se a cadeia não rodou" }, { campo: "nrCarteira", valor: "(omitido)", de: "de propósito", porque: "é o campo obrigatório que falta: o nome certo é nrCarteira, achado em 06/ago" }],
        precisa: () => null,
        async executar(ctx) {
          const r = await gh("POST", "/carteiras", null, { cpf: SONDA.cpf, idConvenio: ctx.idConvenio || 999999, idPlano: ctx.idPlano || 999999 });
          if (r.status === 417 || r.status === 400) {
            let msg = "";
            try { msg = r.json.mensagens[0].mensagem; } catch (e) { msg = "recusado"; }
            return { estado: "recusa", detalhe: "HTTP " + r.status + ": “" + msg + "”", resposta: r };
          }
          if (r.status === 200) return { estado: "falha", detalhe: "aceitou dado incompleto (inesperado)", resposta: r };
          return falhaHttp(r);
        },
        conversa: { tools: [T.carteira], nota: "A Ana nunca grava carteira. Este elo só prova que a API valida de verdade." },
      },
      {
        id: "C7", metodo: "DELETE", caminho: "/carteiras/{id}", tool: null,
        explica: "A exclusão fecha o ciclo da carteira. Só roda com uma carteira real criada antes.",
        entradas: () => [{ campo: "id", valor: null, de: "C6", porque: "o id de uma carteira criada, que não existe porque C6 é recusado de propósito" }],
        precisa: () => "sem carteira criada não há id para excluir",
        async executar() { return { estado: "bloqueado", detalhe: "sem carteira criada" }; },
        conversa: { nota: "Fora do escopo da Ana." },
      },
    ],
  },

  {
    letra: "D", titulo: "Consulta particular: os horários, elo por elo",
    resumo: "A conversa real de 08/set no Telegram, reproduzida elo a elo: preço pela API do Hospital, identificação do paciente, e a cadeia de quatro elos da Seção 2.3.1 até a lista numerada de horários. Termina no que a Ana faz hoje (anota e passa para a equipe) e no que ainda não faz (marcar sozinha).",
    elos: [
      {
        id: "D0", soConversa: true, tool: T.precos, secao: "2.3",
        explica: "Fora desta página: o preço vem da API do Hospital, não da Global Health. A Ana responde o valor direto e oferece a agenda.",
        conversa: {
          paciente: "quanto ta a consulta de cardiologia?",
          tools: [T.precos, T.label],
          ana: "A consulta de Cardiologia é R$ 380. Quer que eu veja os horários disponíveis para você?",
          nota: "Preço direto, sem diferencial na abertura (diferencial só na hesitação). Junto vai a etiqueta particular-aquecido.",
        },
      },
      {
        id: "D1", metodo: "GET", caminho: "/pessoas?cpf=66301102770", tool: T.cpf, secao: "Coleta",
        explica: "Identificação antes da agenda: a Seção 2.3.1 só roda depois de nome e CPF validados. Aqui usamos o sonda, para o paciente existir.",
        entradas: () => [{ campo: "cpf", valor: SONDA.cpf, de: "o paciente", porque: "CPF digitado, validado e sem pontos. Na conversa de 08/set a busca voltou vazia e a Ana seguiu mesmo assim (cadastro não é pré-requisito hoje)" }],
        precisa: () => null,
        async executar(ctx) {
          const r = await gh("GET", "/pessoas", { cpf: SONDA.cpf });
          if (r.status !== 200) return falhaHttp(r);
          const achou = (r.corpo_cru || "").indexOf(SONDA.cpf) >= 0;
          ctx.pacienteNome = achou ? SONDA.nome : null;
          return achou
            ? { estado: "ok", detalhe: "paciente encontrado: " + SONDA.nome, resposta: r, saidas: [{ campo: "nome", valor: SONDA.nome, para: "a confirmação e o resumo da escalada", porque: "a Ana confirma pelo nome e avisa a equipe se o paciente tem ou não cadastro" }] }
            : { estado: "vazio", detalhe: "sem cadastro: a Ana segue e avisa a equipe", resposta: r };
        },
        conversa: {
          paciente: "sim",
          ana0: "Ótimo! Me passa seu nome completo e CPF, por favor? Assim já deixo tudo pronto para o agendamento.",
          paciente2: SONDA.nome + ", " + cpfBonito(SONDA.cpf),
          tools: [T.cpf],
          ana: "Confirma para mim: é para o agendamento no nome de " + SONDA.nome + "?",
        },
      },
      eloEspecialidade("D2", {
        paciente: "sim",
        tools: [T.esp],
        nota: "Turno de 08/set às 11:33: quatro chamadas em 21 segundos, sem mensagem no meio. A primeira é esta. A Ana confere o nome “Consulta Cardiologica” antes de seguir: UROLOGIA e outras devolvem o item de Cardiologia por aproximação (trava da tool 8).",
      }, REFS_D),
      eloConvenios("D3", { modo: "particular" }, {
        tools: [T.conv],
        nota: "Escolha do modelo, sem perguntar ao paciente: a linha Particular (id 3). A lista tem 33 convênios e duas linhas com particular = true (Particular e Funcionario). O nome decidiu.",
      }, REFS_D),
      eloPlanos("D4", {
        tools: [T.planos],
        nota: "Dois planos voltaram: Particular Apartamento (id 2, ordem 1) e Particular Enfermaria (id 1). A tool manda pegar o primeiro. Foi o id 2.",
      }, REFS_D),
      eloHorarios("D5", {
        tools: [T.horarios],
        ana: (c) => c.horarios && c.horarios.length
          ? "Perfeito, Pedro. Achei estes horários para Cardiologia:\n\n" + listaNumerada(c.horarios) + "\n\nMe diz o número da opção que você prefere?"
          : "Prontinho! A agenda online não me retornou horários agora, então nossa equipe vai entrar em contato para confirmar o melhor horário com você.",
        nota: "A mensagem acima é montada com a resposta real deste elo (no máximo 5, com data, hora e médico). O turno TERMINA aqui: a Ana espera o número (PASSO 3).",
      }, REFS_D),
      {
        id: "D6", metodo: "GET", caminho: "/prestadores?idItemAgendamento={idItem}", tool: T.prest, secao: "2.3.1",
        explica: "Elo OPCIONAL, fora da cadeia: quem atende a especialidade. Publicado não quer dizer com horário livre (Charles aparece aqui e não tem vaga).",
        entradas: (c) => [{ campo: "idItemAgendamento", valor: c.idItem, de: "D2", porque: "a especialidade" }],
        precisa: precisaItem,
        async executar(ctx) {
          const r = await gh("GET", "/prestadores", { idItemAgendamento: ctx.idItem });
          if (r.status !== 200) return falhaHttp(r);
          const c = conteudoDe(r) || [];
          ctx.prestadores = c;
          return { estado: c.length ? "ok" : "vazio", detalhe: c.length + " profissional(is) publicado(s): " + c.map(p => p.nome.split(" ")[0]).join(", "), resposta: r };
        },
        conversa: {
          paciente: "quem atende cardiologia aí?",
          tools: [T.prest],
          ana: (c) => c.prestadores && c.prestadores.length
            ? "Na agenda de Cardiologia atendem " + c.prestadores.map(p => p.nome).join(", ") + ". Quer que eu veja os horários?"
            : "Não consigo ver a agenda de profissionais agora. Quer que eu encaminhe para a equipe?",
          nota: "Só quando o paciente pergunta quem atende. A Ana nunca promete que o nome citado tem horário.",
        },
      },
      {
        id: "D7", metodo: "GET", caminho: "/consultas/tipos?idAgenda={idAgenda}", tool: T.tipos,
        explica: "O tipo da consulta (primeira ou subsequente) vira o idTipoMarcacao da finalização. Sem idAgenda a API devolve 500.",
        entradas: (c) => [{ campo: "idAgenda", valor: c.horarios && c.horarios[0] && c.horarios[0].idAgenda, de: "D5", porque: "a agenda do horário escolhido (aqui, o primeiro da lista)" }],
        precisa: precisaHorario,
        async executar(ctx) {
          const r = await gh("GET", "/consultas/tipos", { idAgenda: ctx.horarios[0].idAgenda });
          if (r.status !== 200) return falhaHttp(r);
          const c = conteudoDe(r) || [];
          if (c.length) ctx.idTipo = (c.find(t => /PRIMEIRA/i.test(t.nome)) || c[0]).id;
          return { estado: c.length ? "ok" : "vazio", detalhe: c.map(t => t.nome + " (" + t.id + ")").join(", "), resposta: r, saidas: c.length ? [{ campo: "id", valor: ctx.idTipo, para: "D10 (finalização)", porque: "PRIMEIRA CONSULTA para paciente novo na especialidade" }] : [] };
        },
        conversa: { tools: [T.tipos], nota: "Sem ferramenta na Ana hoje. Só entra junto com a finalização (P6)." },
      },
      {
        id: "D8", metodo: "GET", caminho: "/horarios/{idHorario}/instrucoes", tool: null,
        explica: "As orientações do horário (preparo, chegada). Medido em 08/set: devolve HTTP 500 com idHorario real. Achado para a Global Health.",
        entradas: (c) => [{ campo: "idHorario", valor: c.horarios && c.horarios[0] && c.horarios[0].idHorario, de: "D5", porque: "o horário escolhido (aqui, o primeiro)" }],
        precisa: precisaHorario,
        async executar(ctx) {
          const r = await gh("GET", "/horarios/" + ctx.horarios[0].idHorario + "/instrucoes");
          if (r.status !== 200) return { estado: "falha", detalhe: "HTTP " + r.status + " com idHorario real: endpoint quebrado ou sem instrução cadastrada (perguntar à GH)", resposta: r };
          return { estado: "ok", detalhe: "instruções recebidas", resposta: r };
        },
        conversa: { nota: "Sem ferramenta na Ana. Se um dia vier preparo por aqui, a Ana repassaria antes de confirmar." },
      },
      {
        id: "D9", soConversa: true, tool: T.handoff, secao: "2.4A",
        explica: "Fora da GH: o paciente escolhe o número. A Ana registra a escolha e passa para a equipe. Quatro ferramentas nativas, nenhuma chamada à Global Health.",
        conversa: {
          paciente: "1",
          tools: [T.nota, T.label, T.kanban, T.handoff],
          ana: (c) => "Perfeito, Pedro! Anotei sua preferência de horário. Nossa equipe vai entrar em contato em breve para confirmar tudo com você.",
          nota: "<strong>Hoje quem marca é a equipe.</strong> private_note com o horário escolhido, tag agendamento-particular, card para FILA COMERCIAL e handoff com o resumo (especialidade, valor, horário, tem ou não cadastro). Trava dura: nunca escalar sem ter rodado consultar_horarios_livres nesta conversa.",
        },
      },
      {
        id: "D10", metodo: "POST", caminho: "/horarios/agendar (a finalização)", tool: T.agendar,
        explica: "O único ponto que grava no Oracle do hospital (a pergunta GH-18). Nunca roda desta página: finalização é ato deliberado, na Bancada, com a Prova no banco.",
        entradas: (c) => [
          { campo: "idHorario", valor: c.horarios && c.horarios[0] && c.horarios[0].idHorario, de: "D5", porque: "o horário que o paciente escolheu pelo número" },
          { campo: "idTipoMarcacao", valor: c.idTipo, de: "D7", porque: "primeira consulta ou subsequente" },
          { campo: "cpf", valor: SONDA.cpf, de: "D1", porque: "o paciente identificado" },
        ],
        regra: true,
        conversa: {
          tools: [T.agendar],
          nota: "Com a Seção 2.5 ativa (P6): resumo (especialidade, profissional, data, hora, valor), confirmação explícita, agendar_horario UMA vez, protocolo devolvido pela API, tag agendado-bot, card AGENDADO, sem handoff.",
        },
      },
    ],
  },

  {
    letra: "E", titulo: "Exame: preço e preparo funcionam, a agenda ainda não",
    resumo: "O que o exame tem que a consulta não tem: triagem que pode impedir (impedeRealizacao = S escala para humano), preparo e anexos que sobem para o S3 da GH. Tudo depende do exame publicado na agenda online, e hoje o catálogo de exames está vazio: o mesmo mecanismo que destravou a Cardiologia (cadastro no Soul + botão no Painel GH).",
    elos: [
      {
        id: "E0", soConversa: true, tool: T.exames, secao: "6.B",
        explica: "Fora desta página: valor e preparo vêm da tabela de exames da API do Hospital. É o que já funciona.",
        conversa: {
          paciente: "quanto custa o ecocardiograma?",
          tools: [T.exames],
          ana: "O Ecocardiograma particular é R$ [valor da tabela]. Quer agendar?",
          nota: "Valor direto, sem despejar o preparo (preparo é a Seção 5.D, só quando pedirem, com a mesma tool em modo completo).",
        },
      },
      {
        id: "E1", metodo: "GET", caminho: "/exames?pesquisa=ECOCARDIOGRAMA", tool: null, secao: "5.B",
        explica: "Seria o elo 1 da cadeia do exame: o idExame que alimenta triagem, preparo e anexos. Hoje volta vazio.",
        entradas: () => [{ campo: "pesquisa", valor: "ECOCARDIOGRAMA", de: "o paciente", porque: "o nome do exame, em caixa alta, como na especialidade" }],
        precisa: () => null,
        async executar(ctx) {
          const r = await gh("GET", "/exames", { pesquisa: "ECOCARDIOGRAMA" });
          if (r.status !== 200) return falhaHttp(r);
          const c = conteudoDe(r) || [];
          ctx.exames = c;
          if (c.length) { ctx.idExame = c[0].id; return { estado: "ok", detalhe: c.length + " exame(s) publicado(s): a agenda de exames destravou", resposta: r, saidas: [{ campo: "id", valor: c[0].id, para: "E2 a E5", porque: "o idExame" }] }; }
          return { estado: "vazio", detalhe: "0 exames publicados na agenda online (cadastrar no Soul TST e ligar no Painel GH, como foi com a Cardiologia)", resposta: r };
        },
        conversa: {
          paciente: "sim, particular",
          tools: [T.cpf, T.label, T.kanban, T.handoff],
          ana: "Anotei tudo, [primeiro nome]! Nossa equipe vai entrar em contato para combinar o horário e os detalhes do exame com você.",
          nota: "<strong>Hoje a Ana não consulta agenda de exame.</strong> Exame particular é a Seção 5.B: nome e CPF, busca, tag agendamento-particular, card SETOR RESPONSÁVEL e handoff.",
        },
      },
      {
        id: "E2", metodo: "GET", caminho: "/exames/perguntas?idItemAgendamento={idExame}", tool: null,
        explica: "A triagem: o questionário que decide se pode agendar. Alternativa com impedeRealizacao = S bloqueia e escala para humano.",
        entradas: (c) => [{ campo: "idItemAgendamento", valor: c.idExame, de: "E1", porque: "o exame é um item agendável; o doc oficial chama o parâmetro de idItemAgendamento" }],
        precisa: (c) => c.idExame ? null : "precisa de um exame publicado (E1)",
        async executar(ctx) {
          const r = await gh("GET", "/exames/perguntas", { idItemAgendamento: ctx.idExame });
          if (r.status !== 200) return falhaHttp(r);
          const c = conteudoDe(r) || [];
          return { estado: c.length ? "ok" : "vazio", detalhe: c.length + " pergunta(s) de triagem", resposta: r };
        },
        conversa: { nota: "Futuro: a Ana faria as perguntas uma a uma; resposta que impede = escalada, sem agendar." },
      },
      {
        id: "E3", metodo: "GET", caminho: "/exames/instrucaoGeral?idItemAgendamento={idExame}", tool: null, secao: "5.D",
        explica: "O preparo do exame segundo a agenda online (jejum, medicação).",
        entradas: (c) => [{ campo: "idItemAgendamento", valor: c.idExame, de: "E1", porque: "o mesmo id do exame, no nome que o doc oficial usa" }],
        precisa: (c) => c.idExame ? null : "precisa de um exame publicado (E1)",
        async executar(ctx) {
          const r = await gh("GET", "/exames/instrucaoGeral", { idItemAgendamento: ctx.idExame });
          if (r.status !== 200) return falhaHttp(r);
          return { estado: "ok", detalhe: "instrução geral recebida", resposta: r };
        },
        conversa: { tools: [T.exames], nota: "Hoje o preparo já sai da tabela do Hospital (Seção 5.D). Este elo seria a segunda fonte." },
      },
      {
        id: "E4", metodo: "GET", caminho: "/convenios?idItemAgendamento={idExame}&size=100", tool: T.conv, secao: "5.A",
        explica: "Os convênios do exame, escopados pelo item, como na consulta.",
        entradas: (c) => [{ campo: "idItemAgendamento", valor: c.idExame, de: "E1", porque: "o exame é um item agendável como a especialidade" }],
        precisa: (c) => c.idExame ? null : "precisa de um exame publicado (E1)",
        async executar(ctx) {
          const r = await gh("GET", "/convenios", { idItemAgendamento: ctx.idExame, size: 100 });
          if (r.status !== 200) return falhaHttp(r);
          const c = conteudoDe(r) || [];
          const p = c.find(x => x.particular);
          if (p) ctx.idConvenioEx = p.id;
          return { estado: c.length ? "ok" : "vazio", detalhe: c.length + " convênio(s)", resposta: r };
        },
        conversa: { tools: [T.conv], nota: "A Seção 5.A manda usar a mesma cadeia para cobertura de exame por convênio." },
      },
      {
        id: "E5", metodo: "GET", caminho: "/agendas/v2?idItemAgendamento={idExame}&idConvenio&idPlano", tool: T.horarios,
        explica: "Os horários do exame, com os três ids como na consulta.",
        entradas: (c) => [{ campo: "idItemAgendamento", valor: c.idExame, de: "E1", porque: "o exame" }, { campo: "idConvenio", valor: c.idConvenioEx, de: "E4", porque: "particular" }, { campo: "idPlano", valor: null, de: "planos", porque: "o primeiro plano do convênio (elo não montado aqui)" }],
        precisa: (c) => c.idConvenioEx ? "falta o elo dos planos do exame (montar quando houver exame publicado)" : "precisa do convênio do exame (E4)",
        async executar() { return { estado: "bloqueado", detalhe: "sem exame publicado" }; },
        conversa: { tools: [T.horarios], nota: "Mesma lista numerada da consulta." },
      },
      {
        id: "E6", metodo: "POST", caminho: "/anexos/agendamento", tool: null,
        explica: "Pergunta à API quais anexos o agendamento exige (pedido médico, carteirinha). Precisa do contexto: exame, convênio e horário.",
        entradas: (c) => [{ campo: "idExame", valor: c.idExame, de: "E1", porque: "o exame" }, { campo: "idHorario", valor: null, de: "E5", porque: "o horário escolhido" }],
        precisa: () => "exige exame, convênio e horário reais",
        async executar() { return { estado: "bloqueado", detalhe: "sem contexto de agendamento" }; },
        conversa: { nota: "Futuro: a Ana pediria a foto do pedido médico e subiria pelo /anexos/upload (S3 da GH)." },
      },
      {
        id: "E7", metodo: "POST", caminho: "/horarios/agendar (a finalização)", tool: T.agendar,
        explica: "Como na consulta: o exame também finaliza aqui e grava no Oracle. Nunca roda desta página.",
        entradas: () => [{ campo: "idHorario", valor: null, de: "E5", porque: "o horário escolhido" }],
        regra: true,
        conversa: { tools: [T.agendar], nota: "Gated P6, junto com a consulta." },
      },
    ],
  },

  {
    letra: "F", titulo: "Gerir o agendado: consultar, remarcar, cancelar",
    resumo: "Depois de agendar, o paciente consulta, remarca e cancela pelo mesmo canal. A listagem roda ao vivo hoje. Remarcar e cancelar são finalizações (gravam no Oracle) e ficam para a Bancada, com a Prova no banco.",
    elos: [
      {
        id: "F1", metodo: "GET", caminho: "/agendamentos?cpf=66301102770&tipoAgendamento=CONSULTA", tool: T.listar,
        explica: "A lista de agendamentos do paciente. Vazia porque nunca finalizamos nenhum pela API.",
        entradas: () => [{ campo: "cpf", valor: SONDA.cpf, de: "o paciente", porque: "identificado por nome e CPF antes de qualquer ação" }, { campo: "tipoAgendamento", valor: "CONSULTA", de: "fixo", porque: "CONSULTA ou EXAME, caixa alta" }],
        precisa: () => null,
        async executar(ctx) {
          const r = await gh("GET", "/agendamentos", { cpf: SONDA.cpf, tipoAgendamento: "CONSULTA" });
          if (r.status !== 200) return falhaHttp(r);
          const c = conteudoDe(r) || [];
          ctx.agendamentos = c;
          return c.length
            ? { estado: "ok", detalhe: c.length + " agendamento(s)", resposta: r, saidas: [{ campo: "id", valor: c[0].id, para: "F2, F3 e F4", porque: "o agendamento que o paciente quer ver, remarcar ou cancelar" }] }
            : { estado: "vazio", detalhe: "0 agendamentos (nunca finalizamos nenhum: coerente)", resposta: r };
        },
        conversa: {
          paciente: "quero cancelar minha consulta de cardiologia",
          ana0: "Claro. Me passa seu nome completo e CPF, por favor?",
          paciente2: SONDA.nome + ", " + cpfBonito(SONDA.cpf),
          tools: [T.cpf, T.nota, T.kanban, T.handoff],
          ana: "Anotei seu pedido de cancelamento, [primeiro nome]. Nossa equipe vai confirmar com você em breve.",
          nota: "<strong>Hoje a Ana não lista nem cancela.</strong> Ela identifica o paciente, registra o pedido (e o motivo, se dito) em private_note e escala para humano. Com a Seção 2.6 (P6): listar_agendamentos entra aqui.",
        },
      },
      {
        id: "F2", metodo: "GET", caminho: "/agendamentos/{id}", tool: null,
        explica: "O detalhe de um agendamento específico. Precisa de um id real vindo da listagem.",
        entradas: (c) => [{ campo: "id", valor: c.agendamentos && c.agendamentos[0] && c.agendamentos[0].id, de: "F1", porque: "o agendamento escolhido na lista" }],
        precisa: (c) => c.agendamentos && c.agendamentos.length ? null : "lista vazia: não há id de agendamento para detalhar",
        async executar(ctx) {
          const r = await gh("GET", "/agendamentos/" + ctx.agendamentos[0].id);
          if (r.status !== 200) return falhaHttp(r);
          return { estado: "ok", detalhe: "agendamento " + ctx.agendamentos[0].id + " detalhado", resposta: r };
        },
        conversa: { nota: "Futuro: a Ana confirma qual agendamento (“a consulta de 24/09 às 09:28 com a Dra. Norvandia?”) antes de agir." },
      },
      {
        id: "F3", metodo: "POST", caminho: "/horarios/reagendar", tool: T.reagendar,
        explica: "Remarcar é uma finalização: grava no Oracle como o agendar. Nunca roda desta página.",
        entradas: (c) => [{ campo: "idAgendamento", valor: c.agendamentos && c.agendamentos[0] && c.agendamentos[0].id, de: "F1", porque: "o agendamento atual" }, { campo: "idHorario", valor: null, de: "cadeia D", porque: "o horário novo, pela mesma cadeia de quatro elos" }],
        regra: true,
        conversa: { tools: [T.reagendar, T.label], nota: "Seção 2.6: repetir a cadeia de horários, confirmação explícita, reagendar_horario uma vez, tag remarcacao." },
      },
      {
        id: "F4", metodo: "DELETE", caminho: "/agendamentos/{id} (cancelar)", tool: T.cancelar,
        explica: "Cancelar também é finalização e também grava no Oracle. Nunca roda desta página.",
        entradas: (c) => [{ campo: "id", valor: c.agendamentos && c.agendamentos[0] && c.agendamentos[0].id, de: "F1", porque: "o agendamento confirmado pelo paciente" }],
        regra: true,
        conversa: {
          paciente: "sim, pode cancelar",
          tools: [T.cancelar, T.label, T.nota],
          ana: "Cancelado. Se quiser remarcar, é só me chamar por aqui.",
          nota: "Seção 2.6: confirmar explicitamente QUAL agendamento, cancelar_agendamento uma vez, tag cancelamento, motivo em private_note.",
        },
      },
    ],
  },
];

/* ---------- índice para o Mecanismo (contrato de links, ADR-0029) ----------
   ferramenta -> elos que a chamam (na chamada da API ou na conversa da Ana) e
   elo -> seção do prompt declarada. As cadeias são código, não JSON, então o
   circuito.html lê a cópia estática no <script id="cadeias-indice"> desta página,
   por fetch. Ao carregar, esta página confere a cópia contra o cálculo vivo e avisa
   no console se divergir. Para regerar: no console desta página,
   copy(JSON.stringify(indiceDasCadeias())) e cole no bloco. */
function idElo(elo) { return "elo-" + elo.id.charAt(0) + "-" + elo.id.slice(1); }

function indiceDasCadeias() {
  const cadeias = {}, ferramentas = {}, elos = {};
  CADEIAS.forEach(cadeia => {
    cadeias[cadeia.letra] = cadeia.titulo;
    cadeia.elos.forEach(elo => {
      const nomes = [];
      if (elo.tool) nomes.push(elo.tool.nome);
      ((elo.conversa && elo.conversa.tools) || []).forEach(t => { if (nomes.indexOf(t.nome) === -1) nomes.push(t.nome); });
      nomes.forEach(n => { (ferramentas[n] = ferramentas[n] || []).push({ cadeia: cadeia.letra, elo: elo.id, ancora: idElo(elo) }); });
      elos[elo.id] = { cadeia: cadeia.letra, ancora: idElo(elo), secao: elo.secao || null, tools: nomes };
    });
  });
  return { cadeias, ferramentas, elos };
}

/* ---------- API (ADR-0030) ---------- */

function porLetra(letra) {
  var l = String(letra || "").toUpperCase();
  for (var i = 0; i < CADEIAS.length; i++) if (CADEIAS[i].letra === l) return CADEIAS[i];
  return null;
}
function preparar(c) {
  c.ctx = {}; c.resultados = {};
  if (c.preparar) c.preparar(c.ctx);
}
CADEIAS.forEach(preparar);

function elo(letra, id) {
  var c = porLetra(letra);
  if (!c) return null;
  for (var i = 0; i < c.elos.length; i++) if (c.elos[i].id === id) return c.elos[i];
  return null;
}
function motivo(letra, id) {
  var c = porLetra(letra), e = elo(letra, id);
  if (!c || !e || e.soConversa || e.regra || !e.precisa) return null;
  return e.precisa(c.ctx);
}
function entradas(letra, id) {
  var c = porLetra(letra), e = elo(letra, id);
  return c && e && e.entradas ? e.entradas(c.ctx) : [];
}
async function rodar(letra, id) {
  var c = porLetra(letra), e = elo(letra, id);
  if (!c || !e) return null;
  var r;
  if (e.soConversa) r = { estado: "conversa", detalhe: "" };
  else if (e.regra) r = { estado: "regra", detalhe: "" };
  else {
    var m = e.precisa ? e.precisa(c.ctx) : null;
    if (m) r = { estado: "bloqueado", detalhe: m };
    else {
      try { r = await e.executar(c.ctx); }
      catch (x) { r = { estado: "falha", detalhe: "erro local: " + x.message }; }
    }
  }
  c.resultados[id] = r;
  return r;
}
function resultado(letra, id) {
  var c = porLetra(letra);
  return c ? (c.resultados[id] || null) : null;
}
function falaViva(letra, id) {
  var c = porLetra(letra), e = elo(letra, id);
  if (!c || !e || !e.conversa || typeof e.conversa.ana !== "function") return null;
  var r = c.resultados[id];
  if (!r || r.estado !== "ok") return null;
  return e.conversa.ana(c.ctx);
}
function recomecar(letra) {
  var c = porLetra(letra);
  if (c) preparar(c);
}
function placar(letra) {
  var c = porLetra(letra), p = {};
  if (!c) return p;
  Object.keys(c.resultados).forEach(function (id) {
    var r = c.resultados[id];
    if (r) p[r.estado] = (p[r.estado] || 0) + 1;
  });
  return p;
}

return {
  cadeias: CADEIAS, ESTADO_CHIP: ESTADO_CHIP, ORIGEM_TXT: ORIGEM_TXT, SONDA: SONDA,
  porLetra: porLetra, elo: elo, motivo: motivo, entradas: entradas, rodar: rodar,
  resultado: resultado, falaViva: falaViva, recomecar: recomecar, placar: placar,
  idElo: idElo, indice: indiceDasCadeias,
  contexto: function (letra) { var c = porLetra(letra); return c ? c.ctx : null; }
};
})();
