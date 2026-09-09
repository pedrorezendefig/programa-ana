/* Retrato da Ana: lê dados/retrato.json e renderiza as quatro esferas.
   Nenhuma chamada além do próprio JSON: o retrato é datado, e a data está no rodapé.
   Contrato de links (ADR-0029): toda menção vira <a data-ir="<aba>/<alvo>">, e cada
   card de ferramenta, seção, capacidade e cadeia traz o bloco "Ligações" com a volta. */

(function () {
  "use strict";

  var DOC = null;
  var ABAS = ["faz", "regras", "busca", "global-health"];
  var ABA_ATUAL = null;
  var ROTULO_FAMILIA = { hospital: "API do Hospital", gh: "Global Health", nativa: "nativa da plataforma", "sem-leitura": "origem não lida", desconhecida: "destino não mapeado" };
  var SEC_POR_ID = {};

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function dataBr(iso) {
    var p = String(iso || "").split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : String(iso || "");
  }

  function ferramenta(nome) {
    return (DOC && DOC.ferramentas && DOC.ferramentas[nome]) || null;
  }

  /* ---------- links ---------- */
  function link(ir, html, classe, titulo) {
    return '<a class="' + esc(classe || "lig") + '" data-ir="' + esc(ir) + '" href="#' + esc(ir) + '"' +
      (titulo ? ' title="' + esc(titulo) + '"' : "") + ">" + html + "</a>";
  }

  function linkTool(nome, texto) {
    return ferramenta(nome) ? link("busca/tool-" + nome, esc(texto || nome), "tool-link") : esc(texto || nome);
  }

  function chipLink(ir, rotulo, classe) {
    return ir ? link(ir, esc(rotulo), "chip-link " + (classe || "")) : '<span class="chip-link morto">' + esc(rotulo) + "</span>";
  }

  /* nomes de ferramenta soltos na moldura viram link; nunca dentro de outro <a> */
  function ligarNomes(html) {
    var partes = String(html).split(/(<[^>]+>)/);
    var dentro = 0;
    return partes.map(function (p) {
      if (p.charAt(0) === "<") {
        if (/^<a[\s>]/i.test(p)) dentro++;
        else if (/^<\/a>/i.test(p)) dentro = Math.max(0, dentro - 1);
        return p;
      }
      if (dentro) return p;
      return p.replace(/\b([a-z]+(?:_[a-z]+)+)\b/g, function (m) { return ferramenta(m) ? linkTool(m) : m; });
    }).join("");
  }

  function prosa(texto) { return ligarNomes(esc(texto)); }

  var RESOLVE = {
    tool: function (n) { return ferramenta(n) ? "#busca/tool-" + n : null; },
    secao: function (n) {
      var s = null;
      Object.keys(SEC_POR_ID).forEach(function (id) { if (SEC_POR_ID[id].chave === n) s = SEC_POR_ID[id]; });
      return s ? "#regras/sec-" + s.id : null;
    }
  };

  function prosaMd(texto) {
    var h = MdProsa.inline(texto, RESOLVE)
      .replace(/<a class="md-link md-tool" data-tool="([^"]+)" href="#([^"]+)">/g, '<a class="md-link tool-link" data-ir="$2" href="#$2">')
      .replace(/<a class="md-link md-sec" data-sec="([^"]+)" href="#([^"]+)">/g, '<a class="md-link sec-link" data-ir="$2" href="#$2">');
    return ligarNomes(h);
  }

  function selo(nome) {
    var f = ferramenta(nome);
    var fam = f ? f.familia : "sem-leitura";
    var h = '<span class="selo-origem ' + esc(fam) + '">' + esc(ROTULO_FAMILIA[fam] || fam) + "</span>";
    if (f && f.existe === false) h += '<span class="selo-origem nao-existe">ainda não existe</span>';
    else if (f && f.concedida === false) h += '<span class="selo-origem nao-chama">a Ana não chama hoje</span>';
    return h;
  }

  function pill(nome, tem, motivo) {
    var f = ferramenta(nome);
    var fam = f ? f.familia : "sem-leitura";
    var pode = tem !== undefined ? tem : !!(f && f.concedida && f.existe);
    var miolo = '<span class="selo-origem ' + esc(fam) + '">' + esc(ROTULO_FAMILIA[fam] || fam) + "</span>" +
      esc(nome) + (pode ? "" : " · não tem");
    var attrs = ' class="tool-pill' + (pode ? "" : " nao") + '"' + (motivo ? ' title="' + esc(motivo) + '"' : "");
    if (f) return '<a' + attrs + ' data-ir="busca/tool-' + esc(nome) + '" href="#busca/tool-' + esc(nome) + '">' + miolo + "</a>";
    return "<span" + attrs + ">" + miolo + "</span>";
  }

  function ligacoes(grupos) {
    var vivos = grupos.filter(function (g) { return g.itens && g.itens.length; });
    if (!vivos.length) return "";
    return '<div class="ligacoes"><span class="micro">Ligações</span>' + vivos.map(function (g) {
      return '<div class="lig-grupo"><span class="lig-rot">' + esc(g.rotulo) + '</span><div class="lig-chips">' + g.itens.join("") + "</div></div>";
    }).join("") + "</div>";
  }

  function alvoElo(letra, id) {
    return "elo-" + String(letra).toLowerCase() + "-" + String(id).slice(String(letra).length);
  }

  function chipsSecoes(lista) {
    return (lista || []).map(function (s) { return chipLink(s.id ? "regras/sec-" + s.id : null, s.rotulo, "sec"); });
  }
  function chipsNos(lista) {
    return (lista || []).map(function (n) { return chipLink("regras/no-" + n.id, (n.secao ? n.secao + " " : "") + n.titulo, "no"); });
  }
  function chipsCaps(lista) {
    return (lista || []).map(function (c) { return chipLink("faz/cap-" + c.id, c.titulo, "cap"); });
  }
  function chipsTools(lista) {
    return (lista || []).map(function (t) { return pill(typeof t === "string" ? t : t.nome); });
  }

  /* ---------- abas ---------- */
  function mostrarAba(id, depois, imediato) {
    if (ABAS.indexOf(id) === -1) id = "faz";
    if (ABA_ATUAL === id) { if (depois) depois(); return; }
    var anterior = ABA_ATUAL;
    ABA_ATUAL = id;
    document.querySelectorAll(".abas button").forEach(function (b) {
      var ativa = b.dataset.aba === id;
      b.classList.toggle("ativa", ativa);
      b.setAttribute("aria-selected", ativa ? "true" : "false");
    });
    if (window.Filtros) Filtros.mostrar(id);
    var anim = !imediato && !Liga.reduzido() && anterior;
    var entra = document.getElementById("aba-" + id);
    var sai = anterior ? document.getElementById("aba-" + anterior) : null;
    if (sai) {
      sai.classList.remove("ativa", "entrando");
      if (anim) { sai.classList.add("saindo"); setTimeout(function () { sai.classList.remove("saindo"); }, 250); }
    }
    entra.classList.add("ativa");
    if (anim) { entra.classList.add("entrando"); setTimeout(function () { entra.classList.remove("entrando"); }, 260); }
    try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, 0); }
    if (depois) { if (anim) setTimeout(depois, 260); else depois(); }
  }

  document.querySelectorAll(".abas button").forEach(function (b) {
    b.addEventListener("click", function () {
      var aba = b.dataset.aba;
      Liga.escrever(aba, "", Filtros.ativos(aba), true);
      mostrarAba(aba);
    });
  });

  /* ---------- esfera 1: o que a Ana faz hoje ---------- */
  function renderFaz(e) {
    var p = e.placar;
    document.getElementById("placar").innerHTML =
      stat("Capacidades no retrato", e.total, "o que as regras prometem, uma a uma") +
      stat("Funciona", p.funciona, "no ar e com prova", "funciona") +
      stat("Em parte", p.parte, "responde, com ressalva", "parte") +
      stat("Ainda não", p["ainda-nao"], "escrito, não construído", "ainda-nao");
    document.getElementById("legenda-estados").innerHTML = e.legenda.map(function (l) {
      return '<span class="item"><span class="chip ' + esc(l.classe) + '">' + esc(l.rotulo) + "</span>" + esc(l.descricao) + "</span>";
    }).join("");
    document.getElementById("blocos-cap").innerHTML = e.blocos.map(function (b, bi) {
      return '<div class="bloco-cap" data-bloco="' + esc(Filtros.slug(b.nome)) + '"><h2>' + esc(b.nome) + '</h2><p class="lead">' + prosa(b.resumo) + '</p><div class="grade c2">' +
        b.capacidades.map(function (c, i) { return cap(c, b, bi * 4 + i); }).join("") + "</div></div>";
    }).join("");
  }

  function stat(rotulo, valor, detalhe, classe) {
    return '<div class="card stat fade-in-up' + (classe ? ' ' + classe : "") + '"><span class="rotulo">' + esc(rotulo) + '</span><span class="num-indicador">' + esc(valor) + "</span>" +
      '<span class="detalhe">' + esc(detalhe) + "</span></div>";
  }

  function estadoChip(classe, rotulo) {
    var cls = classe === "funciona" ? "funciona" : classe === "parte" ? "parte" : "ainda-nao";
    return '<span class="chip ' + cls + '">' + esc(rotulo) + "</span>";
  }

  function cap(c, b, i) {
    var tools = (c.ferramentas || []).map(function (f) {
      if (f.texto) return '<span class="tool-pill texto">' + esc(f.texto) + "</span>";
      return pill(f.nome, f.existe ? undefined : false, f.existe ? "" : "ainda não existe");
    });
    var texto = [c.titulo, c.secao, c.faz, c.prova, c.falta, c.estado_rotulo].concat((c.ferramentas || []).map(function (f) { return f.nome || f.texto; })).join(" ");
    return '<div class="card cap fade-in-up" id="cap-' + esc(c.id) + '" data-estado="' + esc(c.estado) + '" data-bloco="' + esc(Filtros.slug(b.nome)) + '" data-texto="' + esc(texto) + '" style="animation-delay:' + Math.min(i, 12) * 40 + 'ms">' +
      '<div class="topo"><h3>' + esc(c.titulo) + "</h3>" + estadoChip(c.estado, c.estado_rotulo) + "</div>" +
      '<span class="secao">' + esc(c.secao) + "</span>" +
      '<p class="faz">' + prosa(c.faz) + "</p>" +
      (c.prova ? '<p class="dado"><strong>Prova:</strong> ' + prosa(c.prova) + "</p>" : "") +
      (c.falta ? '<div class="falta"><strong>O que falta:</strong> ' + prosa(c.falta) + "</div>" : "") +
      ligacoes([
        { rotulo: "Seções das regras", itens: chipsSecoes(c.secoes) },
        { rotulo: "Ferramentas", itens: tools }
      ]) +
      "</div>";
  }

  /* ---------- esfera 2: as regras ---------- */
  async function renderRegras(r) {
    document.getElementById("regras-desde").textContent =
      "Regras em vigor desde " + dataBr(r.desde) + " (versão " + r.versao + ")";
    document.getElementById("regras-selos").innerHTML =
      '<span class="chip neutro">' + r.nos.length + " passos</span>" +
      '<span class="chip neutro">' + r.raias.length + " raias</span>" +
      '<span class="chip neutro">' + r.secoes.length + " seções</span>";
    document.getElementById("lead-anatomia").textContent =
      "As " + r.secoes.length + " seções das regras, na ordem em que aparecem, cada uma com as ferramentas que chama e o trecho exato do texto.";
    renderSecoes(r);
    await RetratoSop.montar(r, DOC.ferramentas, r.versao);
  }

  function renderSecoes(r) {
    var alvo = document.getElementById("secoes-prompt");
    alvo.innerHTML = r.secoes.map(function (s) {
      var trechos = s.trechos.map(function (tr, i) {
        var rot = "trecho " + (i + 1) + (tr.linhas ? ", linhas " + esc(tr.linhas) + " da versão " + esc(r.versao) : "");
        return '<details class="det-trecho"><summary><span class="zig">▶</span>' + rot + "</summary>" +
          '<div class="trecho">' + MdProsa.trecho(tr.texto, {}) + "</div></details>";
      }).join("");
      var texto = [s.rotulo, s.papel].concat(s.ferramentas, (s.nos || []).map(function (n) { return n.titulo; })).join(" ");
      return '<details class="secao-prompt" id="sec-' + esc(s.id) + '" data-tools="' + esc(s.ferramentas.join(" ")) + '" data-texto="' + esc(texto) + '">' +
        '<summary class="cab"><span class="zig">▶</span><h3>' + esc(s.rotulo) + "</h3>" +
        '<span class="conta-trechos">' + s.trechos.length + (s.trechos.length === 1 ? " trecho literal" : " trechos literais") + "</span></summary>" +
        '<div class="papel">' + prosaMd(s.papel) + "</div>" +
        ligacoes([
          { rotulo: "Ferramentas que esta seção chama", itens: chipsTools(s.ferramentas) },
          { rotulo: "Passos no mapa", itens: chipsNos(s.nos) },
          { rotulo: "Capacidades que dependem dela", itens: chipsCaps(s.capacidades) }
        ]) +
        trechos + "</details>";
    }).join("");

    var ind = document.getElementById("indice-prompt");
    ind.innerHTML = r.secoes.map(function (s) {
      return '<a href="#regras/sec-' + esc(s.id) + '" data-ir="regras/sec-' + esc(s.id) + '" data-sec="' + esc(s.id) + '">' + esc(s.rotulo) + "</a>";
    }).join("");
    if (window.IntersectionObserver) {
      var espiao = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) {
          if (!en.isIntersecting) return;
          ind.querySelectorAll("a").forEach(function (a) {
            a.classList.toggle("atual", "sec-" + a.dataset.sec === en.target.id);
          });
        });
      }, { rootMargin: "-25% 0px -65% 0px" });
      alvo.querySelectorAll(".secao-prompt").forEach(function (el) { espiao.observe(el); });
    }
    document.getElementById("btn-abrir-tudo").addEventListener("click", function () {
      alvo.querySelectorAll("details").forEach(function (d) { d.open = true; });
    });
    document.getElementById("btn-fechar-tudo").addEventListener("click", function () {
      alvo.querySelectorAll("details").forEach(function (d) { d.open = false; });
    });
  }

  /* ---------- esfera 3: onde ela busca ---------- */
  function renderBusca(b) {
    document.getElementById("busca-conferido").textContent =
      "A lista de ferramentas foi lida na plataforma na data do retrato. Quais delas a Ana pode chamar foi conferido em " + dataBr(b.conferido_em) + ".";
    var i = 0;
    function grupo(id, rotulo, resumo, lista, ponto) {
      if (!lista.length) return "";
      return '<div class="grupo-tools" data-origem="' + esc(id) + '"><div class="cab">' + (ponto ? '<span class="ponto-legenda ' + esc(id) + '"></span>' : "") + "<h3>" + esc(rotulo) + "</h3>" +
        '<span class="caption">' + lista.length + (lista.length === 1 ? " ferramenta" : " ferramentas") + "</span></div>" +
        (resumo ? '<p class="lead">' + prosa(resumo) + "</p>" : "") +
        '<div class="grade c3">' + lista.map(function (t) { return toolCard(t, i++); }).join("") + "</div></div>";
    }
    var grupos = b.grupos.map(function (g) { return grupo(g.id, g.rotulo, g.resumo, g.ferramentas, true); }).join("");
    grupos += grupo("por-criar", "Ferramentas por criar", "As cadeias da Global Health citam estas ferramentas. Elas ainda não existem: entram com a marcação final e com a gestão do agendado.", b.por_criar || [], false);
    grupos += grupo("sem-leitura", "Origem não lida", "Este retrato foi gerado sem ler a plataforma. Gere de novo antes de publicar.", b.sem_leitura || [], false);
    grupos += grupo("desconhecida", "Destino não mapeado", "", b.desconhecidas || [], false);
    document.getElementById("grupos-tools").innerHTML = grupos;
    montarCaminho(b);

    var QUEM = { hospital: "aplicativo do hospital", ana: "a Ana", gh: "agenda online" };
    document.getElementById("faixas-int").innerHTML = b.faixas.map(function (fx) {
      return '<div class="card faixa-int fade-in-up"><h3>' + esc(fx.rotulo) + '</h3><p class="lead">' + prosa(fx.resumo) + '</p><div class="passos">' +
        fx.passos.map(function (p, j) {
          return '<div class="passo"><span class="n">' + (j + 1) + "</span><h4>" + esc(p.titulo) + "</h4><p>" + prosa(p.texto) + "</p>" +
            '<span class="quem"><span class="chip neutro mini">' + esc(QUEM[p.raia] || p.raia) + "</span></span>" +
            (p.ferramenta ? '<div class="pills">' + pill(p.ferramenta) + "</div>" : "") +
            "</div>";
        }).join("") + "</div></div>";
    }).join("");
  }

  /* o caminho de uma mensagem: paciente, WhatsApp, Ana, a ferramenta, a fonte, a resposta */
  var CAMINHO = null;
  function montarCaminho(b) {
    var ORIGENS = { hospital: "API do Hospital", gh: "Global Health", nativa: "nativa da plataforma" };
    var resumo = {};
    b.grupos.forEach(function (g) { resumo[g.id] = g; });
    var est = { nos: [
      { id: "paciente", tipo: "inicio", texto: "O paciente escreve" },
      { id: "whatsapp", tipo: "passo", texto: "O WhatsApp entrega a mensagem à central de atendimento" },
      { id: "ana", tipo: "passo", texto: "A Ana lê a mensagem, aplica as regras e escolhe a ferramenta certa", sub: "Ela nunca responde valor, cobertura, preparo ou horário de memória." },
      { id: "quem", tipo: "decisao", texto: "Quem tem a resposta?", ramos: [
        { rotulo: "API do Hospital", tom: "hospital", no: { id: "fonte-hospital", tipo: "passo", texto: "O aplicativo do hospital responde", sub: "tabelas oficiais de valores e preparo, protocolos da ouvidoria" } },
        { rotulo: "Global Health", tom: "gh", no: { id: "fonte-gh", tipo: "passo", texto: "A agenda online responde", sub: "cadastro, especialidades, convênios, planos, horários livres" } },
        { rotulo: "nativa", tom: "nativa", no: { id: "fonte-nativa", tipo: "passo", texto: "A própria central de atendimento responde", sub: "etiqueta, nota interna, funil, base de conhecimento, hora" } }
      ] },
      { id: "monta", tipo: "passo", texto: "A ferramenta devolve o dado e a Ana monta a fala com o que a fonte devolveu", retorna_para: "ana", retorno_rotulo: "o paciente responde de novo" },
      { id: "resposta", tipo: "fim", texto: "O paciente lê a resposta" }
    ] };
    var palco = document.getElementById("caminho-palco");
    CAMINHO = Fluxo.montar(palco, est, { cardW: 300, fanW: 200, rotulo: "O caminho de uma mensagem", aoClicar: function (id) {
      var m = /^fonte-(.+)$/.exec(id);
      if (m) escolherOrigem(m[1]);
    } });
    var origens = document.getElementById("caminho-origens");
    origens.innerHTML = '<span class="f-rot">Origem</span>' + Object.keys(ORIGENS).map(function (o) {
      return '<button type="button" class="fchip" data-origem="' + o + '" aria-pressed="false"><span class="ponto-legenda ' + o + '"></span>' + esc(ORIGENS[o]) + "</button>";
    }).join("");
    origens.querySelectorAll(".fchip").forEach(function (bt) {
      bt.addEventListener("click", function () { escolherOrigem(bt.dataset.origem); });
    });
    var ORIGEM = null, passeio = null, controles = null;
    function caminhoDe(origem) { return ["paciente", "whatsapp", "ana", "quem", "fonte-" + origem, "monta", "resposta"]; }
    function escolherOrigem(o) {
      ORIGEM = o;
      origens.querySelectorAll(".fchip").forEach(function (bt) {
        var on = bt.dataset.origem === o;
        bt.classList.toggle("on", on); bt.setAttribute("aria-pressed", on ? "true" : "false");
      });
      CAMINHO.acender(caminhoDe(o));
      if (passeio) passeio.zerar();
      passeio = Fluxo.percorredor(CAMINHO, caminhoDe(o));
      controles = Fluxo.controles(document.getElementById("caminho-controles"), passeio);
      var g = resumo[o];
      document.getElementById("caminho-legenda").textContent = g ? ORIGENS[o] + ": " + g.resumo : "";
    }
    escolherOrigem("hospital");
    CAMINHO.escolherOrigem = escolherOrigem;
    document.getElementById("grupos-tools").addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      var card = e.target.closest(".tool-card");
      if (!card || !ORIGENS[card.dataset.origem]) return;
      escolherOrigem(card.dataset.origem);
      var el = document.getElementById("caminho-palco");
      if (el) { try { el.scrollIntoView({ block: "nearest", behavior: Liga.reduzido() ? "auto" : "smooth" }); } catch (x) { /* sem rolagem */ } }
    });
  }

  function toolCard(t, i) {
    var f = ferramenta(t.nome) || {};
    var pode = !!(f.concedida && f.existe);
    var texto = [t.nome, t.descricao, ROTULO_FAMILIA[t.familia]].concat((t.secoes || []).map(function (s) { return s.rotulo; })).join(" ");
    var elos = (t.elos || []).map(function (e) { return chipLink("global-health/" + alvoElo(e.cadeia, e.id), e.id + " " + e.titulo, "elo"); });
    var cadeias = (t.cadeias || []).map(function (l) { return chipLink("global-health/cad-" + String(l).toLowerCase(), "Cadeia " + l, "cad"); });
    return '<div class="card tool-card fade-in-up" id="tool-' + esc(t.nome) + '" data-origem="' + esc(t.familia) + '" data-pode="' + (pode ? "sim" : "nao") + '" data-texto="' + esc(texto) + '" style="animation-delay:' + Math.min(i, 12) * 35 + 'ms">' +
      '<span class="nome">' + esc(t.nome) + "</span>" +
      '<div class="linha" style="gap:6px;">' + selo(t.nome) + "</div>" +
      '<p class="faz">' + prosa(t.descricao) + "</p>" +
      ligacoes([
        { rotulo: "Seções das regras que a chamam", itens: chipsSecoes(t.secoes) },
        { rotulo: "Passos no mapa", itens: chipsNos(t.nos) },
        { rotulo: "Capacidades", itens: chipsCaps(t.capacidades) },
        { rotulo: "Cadeias da Global Health", itens: cadeias },
        { rotulo: "Elos", itens: elos }
      ]) +
      (!(t.secoes || []).length && !(t.nos || []).length ? '<div class="chama">Nenhuma seção das regras chama esta ferramenta pelo nome.</div>' : "") +
      "</div>";
  }

  /* ---------- esfera 4: Global Health ---------- */
  function renderGh(g) {
    document.getElementById("lista-da").innerHTML = g.da.map(function (t) { return "<li>" + prosa(t) + "</li>"; }).join("");
    document.getElementById("lista-nao-da").innerHTML = g.nao_da.map(function (t) { return "<li>" + prosa(t) + "</li>"; }).join("");
    document.getElementById("legenda-vereditos").innerHTML = g.legenda.map(function (l) {
      return '<span class="chip ' + esc(l.classe) + '">' + esc(l.rotulo) + "</span>";
    }).join("");
    document.getElementById("cadeias").innerHTML = g.cadeias.map(function (c, i) {
      var letra = String(c.letra).toLowerCase();
      return '<div class="card cadeia fade-in-up" id="cad-' + esc(letra) + '" data-letra="' + esc(letra) + '" style="animation-delay:' + i * 50 + 'ms">' +
        '<div class="cadeia-topo"><div class="letra">' + esc(c.letra) + '</div><div class="textos"><h3>' + esc(c.titulo) + "</h3><p>" + prosa(c.resumo) + "</p></div></div>" +
        ligacoes([
          { rotulo: "Ferramentas desta cadeia", itens: chipsTools(c.ferramentas) },
          { rotulo: "Seções das regras", itens: chipsSecoes(c.secoes) }
        ]) +
        '<div class="cadeia-corpo">' +
          '<div class="fluxo-col"><div class="fluxo-cabeca"><span class="micro">a cadeia, elo a elo</span><div class="fluxo-controles" id="cad-' + esc(letra) + '-controles"></div></div>' +
            '<div class="fluxo-palco" id="cad-' + esc(letra) + '-palco"></div></div>' +
          '<div class="conversa-col"><span class="micro">a conversa da Ana neste elo</span>' +
            '<p class="caption conversa-dica">Clique num elo do desenho, ou use "percorrer", para ver a conversa daquele momento.</p>' +
            c.elos.map(function (e) { return elo(e, c); }).join("") + "</div>" +
        "</div></div>";
    }).join("");
    g.cadeias.forEach(montarCadeia);
  }

  var CADEIAS = {};
  function tipoElo(e) {
    if (e.veredito === "recusa") return "decisao";
    if (e.veredito === "falha") return "falha";
    if (e.veredito === "ainda-nao" || e.veredito === "fora") return "tracejado";
    return "passo";
  }
  function montarCadeia(c) {
    var letra = String(c.letra).toLowerCase();
    var ultimo = c.elos[c.elos.length - 1];
    var nos = [{ id: "inicio", tipo: "inicio", texto: "Cadeia " + c.letra }];
    c.elos.forEach(function (e) {
      var no = { id: alvoElo(c.letra, e.id), tipo: tipoElo(e), texto: e.id + ". " + e.titulo, sub: e.veredito_rotulo + (e.ana_hoje === "faz" ? ". A Ana já faz." : e.ana_hoje === "ainda-nao" ? ". A Ana ainda não faz." : "") };
      if (e.veredito === "recusa") no.ramos = [{ rotulo: "a agenda recusa e diz o campo que falta", tom: "ambar" }];
      if (e.veredito === "conversa") no.tom = "hospital";
      nos.push(no);
    });
    var fecha = ultimo && (ultimo.veredito === "ainda-nao" || ultimo.veredito === "fora");
    nos.push({ id: "fim", tipo: fecha ? "fim-tracejado" : "fim", texto: fecha ? "Termina no que ainda não dá" : "Fim da cadeia" });
    var palco = document.getElementById("cad-" + letra + "-palco");
    var ctrl = Fluxo.montar(palco, { nos: nos }, { cardW: 300, minW: 340, rotulo: "Cadeia " + c.letra + ", elo a elo", aoClicar: function (id) { mostrarElo(letra, id, true); } });
    var caminho = nos.map(function (x) { return x.id; });
    var passeio = Fluxo.percorredor(ctrl, caminho, function (id) { mostrarElo(letra, id, false); });
    var controles = Fluxo.controles(document.getElementById("cad-" + letra + "-controles"), passeio);
    CADEIAS[letra] = { ctrl: ctrl, passeio: passeio, controles: controles };
  }
  function mostrarElo(letra, id, marcar) {
    var card = document.getElementById("cad-" + letra);
    if (!card) return;
    var alvo = document.getElementById(id);
    card.querySelectorAll(".conversa-col .elo.atual").forEach(function (x) { x.classList.remove("atual"); });
    var dica = card.querySelector(".conversa-dica");
    if (!alvo || !alvo.classList.contains("elo")) { if (dica) dica.hidden = false; return; }
    alvo.classList.add("atual");
    if (dica) dica.hidden = true;
    if (marcar) {
      var cd = CADEIAS[letra];
      if (cd) { cd.passeio.parar(); cd.ctrl.marcar(id); cd.controles.atualizar(); }
    }
  }
  function sincronizarCadeias() {
    Object.keys(CADEIAS).forEach(function (letra) {
      var card = document.getElementById("cad-" + letra);
      if (!card) return;
      var ids = [];
      card.querySelectorAll(".conversa-col .elo.filtrado").forEach(function (x) { ids.push(x.id); });
      CADEIAS[letra].ctrl.esmaecer(ids);
    });
  }
  document.addEventListener("filtros:aplicado", function (e) { if (e.detail && e.detail.aba === "global-health") sincronizarCadeias(); });
  document.addEventListener("liga:chegou", function (e) {
    var el = e.detail && e.detail.el;
    if (!el || !el.classList || !el.classList.contains("elo")) return;
    var card = el.closest(".cadeia");
    if (!card) return;
    e.preventDefault();
    mostrarElo(card.dataset.letra, el.id, true);
    var no = CADEIAS[card.dataset.letra] && CADEIAS[card.dataset.letra].ctrl.noEl(el.id);
    try { (no || card).scrollIntoView({ block: "center", behavior: Liga.reduzido() ? "auto" : "smooth" }); } catch (x) { /* sem rolagem */ }
  });

  function elo(e, c) {
    var conv = e.conversa || {};
    var texto = [e.id, e.titulo, e.texto, e.veredito_rotulo, e.ana_hoje_rotulo, conv.paciente, conv.ana, conv.nota]
      .concat((conv.ferramentas || []).map(function (f) { return f.nome; })).join(" ");
    var lado = '<div class="cab"><span class="num">' + esc(e.id) + "</span><h4>" + esc(e.titulo) + "</h4>" +
      '<span class="chip ' + esc(e.veredito) + '">' + esc(e.veredito_rotulo) + "</span></div>" +
      '<p class="explica">' + prosa(e.texto) + "</p>" +
      ((e.secoes || []).length ? '<div class="lig-chips elo-secoes"><span class="lig-rot">Regras</span>' + chipsSecoes(e.secoes).join("") + "</div>" : "");
    return '<div class="elo" id="' + esc(alvoElo(c.letra, e.id)) + '" data-veredito="' + esc(e.veredito) + '" data-texto="' + esc(texto) + '"><div class="lado agenda">' + lado + '</div><div class="lado">' + conversa(e) + "</div></div>";
  }

  function conversa(e) {
    var c = e.conversa || {};
    var h = '<div class="chat">';
    h += '<div class="linha" style="margin-bottom:2px;"><span class="chip ' + (e.ana_hoje === "faz" ? "funciona" : e.ana_hoje === "ainda-nao" ? "ainda-nao" : "fora") + '">' + esc(e.ana_hoje_rotulo) + "</span></div>";
    if (c.paciente) h += '<div class="balao paciente"><div class="quem">paciente</div>' + esc(c.paciente) + "</div>";
    if (c.ana0) h += '<div class="balao ana"><div class="quem">Ana</div>' + esc(c.ana0) + "</div>";
    if (c.paciente2) h += '<div class="balao paciente"><div class="quem">paciente</div>' + esc(c.paciente2) + "</div>";
    if (c.ferramentas && c.ferramentas.length) {
      h += '<div class="tools-chamadas"><span class="micro">chama</span>' + c.ferramentas.map(function (f) { return pill(f.nome, f.tem, f.motivo); }).join("") + "</div>";
    }
    if (c.ana) h += '<div class="balao ana"><div class="quem">Ana</div>' + esc(c.ana) + "</div>";
    if (c.nota) h += '<div class="nota-hoje">' + prosa(c.nota) + "</div>";
    h += "</div>";
    return h;
  }

  /* ---------- carga ---------- */
  async function carregar() {
    var carregando = document.getElementById("carregando");
    try {
      DOC = await fetch("dados/retrato.json").then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      });
    } catch (e) {
      carregando.textContent = "Não consegui ler o retrato (dados/retrato.json). " + e.message;
      return;
    }
    carregando.remove();
    var data = dataBr(DOC.gerado_em);
    document.getElementById("carimbo").textContent = "retrato de " + data;
    document.getElementById("rodape").textContent = "Retrato de " + data + ". Programa Ana, Hospital São Matheus, VITTA TECH.";
    DOC.esferas.regras.secoes.forEach(function (s) { SEC_POR_ID[s.id] = s; });

    Filtros.configurar(DOC);
    renderFaz(DOC.esferas.faz);
    renderBusca(DOC.esferas.busca);
    renderGh(DOC.esferas.global_health);
    await renderRegras(DOC.esferas.regras);

    Liga.registrar({
      trocarAba: mostrarAba,
      aoFiltro: function (aba, filtros) { Filtros.daUrl(aba, filtros); },
      lerFiltros: function (aba) { return Filtros.ativos(aba); }
    });
    Liga.iniciar();
  }

  carregar();
})();
