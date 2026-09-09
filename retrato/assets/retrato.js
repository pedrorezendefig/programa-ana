/* Retrato da Ana: lê dados/retrato.json e renderiza as quatro esferas.
   Nenhuma chamada além do próprio JSON: o retrato é datado, e a data está no rodapé. */

(function () {
  "use strict";

  var DOC = null;
  var ABAS = ["faz", "regras", "busca", "global-health"];
  var ROTULO_FAMILIA = { hospital: "API do Hospital", gh: "Global Health", nativa: "nativa da plataforma", "sem-leitura": "origem não lida", desconhecida: "destino não mapeado" };

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
    return '<span class="tool-pill' + (pode ? "" : " nao") + '"' + (motivo ? ' title="' + esc(motivo) + '"' : "") + ">" +
      '<span class="selo-origem ' + esc(fam) + '">' + esc(ROTULO_FAMILIA[fam] || fam) + "</span>" +
      esc(nome) + (pode ? "" : " · não tem") + "</span>";
  }

  /* ---------- abas ---------- */
  function abaDoHash() {
    var h = (location.hash || "").replace("#", "");
    return ABAS.indexOf(h) !== -1 ? h : "faz";
  }

  function mostrarAba(id, empurrar) {
    ABAS.forEach(function (a) {
      document.getElementById("aba-" + a).classList.toggle("ativa", a === id);
    });
    document.querySelectorAll(".abas button").forEach(function (b) {
      var ativa = b.dataset.aba === id;
      b.classList.toggle("ativa", ativa);
      b.setAttribute("aria-selected", ativa ? "true" : "false");
    });
    if (empurrar) history.replaceState(null, "", "#" + id);
    if (id === "regras") RetratoSop.redesenhar();
    window.scrollTo(0, 0);
  }

  document.querySelectorAll(".abas button").forEach(function (b) {
    b.addEventListener("click", function () { mostrarAba(b.dataset.aba, true); });
  });
  window.addEventListener("hashchange", function () { mostrarAba(abaDoHash(), false); });

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
    document.getElementById("blocos-cap").innerHTML = e.blocos.map(function (b) {
      return '<div class="bloco-cap"><h2>' + esc(b.nome) + '</h2><p class="lead">' + esc(b.resumo) + '</p><div class="grade c2">' +
        b.capacidades.map(cap).join("") + "</div></div>";
    }).join("");
  }

  function stat(rotulo, valor, detalhe, classe) {
    return '<div class="card stat"><span class="rotulo">' + esc(rotulo) + '</span><span class="num-indicador">' + esc(valor) + "</span>" +
      '<span class="detalhe">' + (classe ? '<span class="chip ' + classe + '">' + esc(rotulo.toLowerCase()) + "</span> " : "") + esc(detalhe) + "</span></div>";
  }

  function cap(c) {
    var fs = (c.ferramentas || []).map(function (f) {
      if (f.texto) return '<span class="tool-pill">' + esc(f.texto) + "</span>";
      return pill(f.nome, f.existe ? undefined : false, f.existe ? "" : "ainda não existe");
    }).join("");
    return '<div class="card cap" id="cap-' + esc(c.id) + '">' +
      '<div class="topo"><h3>' + esc(c.titulo) + '</h3><span class="chip ' + esc(c.estado) + '">' + esc(c.estado_rotulo) + "</span></div>" +
      '<span class="secao">' + esc(c.secao) + "</span>" +
      '<p class="faz">' + esc(c.faz) + "</p>" +
      (c.prova ? '<p class="dado"><strong>Prova:</strong> ' + esc(c.prova) + "</p>" : "") +
      (c.falta ? '<div class="falta"><strong>O que falta:</strong> ' + esc(c.falta) + "</div>" : "") +
      (fs ? '<div class="pills">' + fs + "</div>" : "") +
      "</div>";
  }

  /* ---------- esfera 2: as regras ---------- */
  function renderRegras(r) {
    document.getElementById("regras-desde").textContent =
      "Regras em vigor desde " + dataBr(r.desde) + " (versão " + r.versao + ")";
    document.getElementById("regras-selos").innerHTML =
      '<span class="chip neutro">' + r.nos.length + " passos</span>" +
      '<span class="chip neutro">' + r.raias.length + " raias</span>" +
      '<span class="chip neutro">' + r.secoes.length + " seções</span>";
    document.getElementById("lead-anatomia").textContent =
      "As " + r.secoes.length + " seções das regras, na ordem em que aparecem, cada uma com as ferramentas que chama e o trecho exato do texto.";
    RetratoSop.montar(r, DOC.ferramentas, r.versao);
    renderSecoes(r);
  }

  function renderSecoes(r) {
    var alvo = document.getElementById("secoes-prompt");
    alvo.innerHTML = r.secoes.map(function (s) {
      var badges = s.ferramentas.length
        ? '<div class="badges">' + s.ferramentas.map(function (t) { return pill(t); }).join("") + "</div>"
        : "";
      var trechos = s.trechos.map(function (tr, i) {
        var rot = "trecho " + (i + 1) + (tr.linhas ? ", linhas " + esc(tr.linhas) + " da versão " + esc(r.versao) : "");
        return '<details class="det-trecho"><summary><span class="zig">▶</span>' + rot + "</summary>" +
          '<div class="trecho">' + MdProsa.trecho(tr.texto, {}) + "</div></details>";
      }).join("");
      return '<details class="secao-prompt" id="sec-' + esc(s.id) + '">' +
        '<summary class="cab"><span class="zig">▶</span><h3>' + esc(s.rotulo) + "</h3>" +
        '<span class="conta-trechos">' + s.trechos.length + (s.trechos.length === 1 ? " trecho literal" : " trechos literais") + "</span></summary>" +
        '<div class="papel">' + MdProsa.inline(s.papel, {}) + "</div>" + badges + trechos + "</details>";
    }).join("");

    var ind = document.getElementById("indice-prompt");
    ind.innerHTML = r.secoes.map(function (s) {
      return '<a href="#regras" data-sec="' + esc(s.id) + '">' + esc(s.rotulo) + "</a>";
    }).join("");
    ind.addEventListener("click", function (e) {
      var a = e.target.closest("a[data-sec]");
      if (!a) return;
      e.preventDefault();
      var el = document.getElementById("sec-" + a.dataset.sec);
      if (!el) return;
      el.open = true;
      el.classList.add("acesa");
      setTimeout(function () { el.classList.remove("acesa"); }, 2200);
      el.scrollIntoView({ block: "center" });
    });
    if (window.IntersectionObserver) {
      var espiao = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) {
          if (!en.isIntersecting) return;
          ind.querySelectorAll("a").forEach(function (a) {
            a.classList.toggle("atual", "sec-" + a.dataset.sec === en.target.id);
          });
        });
      }, { rootMargin: "-15% 0px -75% 0px" });
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
    var grupos = b.grupos.map(function (g) {
      return '<div class="grupo-tools"><div class="cab"><span class="ponto-legenda ' + esc(g.id) + '"></span><h3>' + esc(g.rotulo) + "</h3>" +
        '<span class="caption">' + g.ferramentas.length + (g.ferramentas.length === 1 ? " ferramenta" : " ferramentas") + "</span></div>" +
        '<p class="lead">' + esc(g.resumo) + "</p>" +
        '<div class="grade c3">' + g.ferramentas.map(toolCard).join("") + "</div></div>";
    }).join("");
    if (b.sem_leitura && b.sem_leitura.length) {
      grupos += '<div class="grupo-tools"><div class="cab"><h3>Origem não lida</h3></div><p class="lead">Este retrato foi gerado sem ler a plataforma. Gere de novo antes de publicar.</p><div class="grade c3">' +
        b.sem_leitura.map(toolCard).join("") + "</div></div>";
    }
    if (b.desconhecidas && b.desconhecidas.length) {
      grupos += '<div class="grupo-tools"><div class="cab"><h3>Destino não mapeado</h3></div><div class="grade c3">' + b.desconhecidas.map(toolCard).join("") + "</div></div>";
    }
    document.getElementById("grupos-tools").innerHTML = grupos;

    var QUEM = { hospital: "aplicativo do hospital", ana: "a Ana", gh: "agenda online" };
    document.getElementById("faixas-int").innerHTML = b.faixas.map(function (fx) {
      return '<div class="card faixa-int"><h3>' + esc(fx.rotulo) + '</h3><p class="lead">' + esc(fx.resumo) + '</p><div class="passos">' +
        fx.passos.map(function (p, i) {
          return '<div class="passo"><span class="n">' + (i + 1) + "</span><h4>" + esc(p.titulo) + "</h4><p>" + esc(p.texto) + "</p>" +
            '<span class="quem"><span class="chip neutro" style="font-size:11px;padding:4px 9px;">' + esc(QUEM[p.raia] || p.raia) + "</span></span>" +
            (p.ferramenta ? '<div class="pills" style="margin-top:4px;">' + pill(p.ferramenta) + "</div>" : "") +
            "</div>";
        }).join("") + "</div></div>";
    }).join("");
  }

  function toolCard(t) {
    var secs = (t.secoes || []).length
      ? '<div class="chama">Chamada por: ' + t.secoes.map(function (s) { return '<span class="chip neutro">' + esc(s.rotulo) + "</span>"; }).join("") + "</div>"
      : '<div class="chama">Nenhuma seção das regras chama esta ferramenta pelo nome.</div>';
    return '<div class="card tool-card"><span class="nome">' + esc(t.nome) + "</span>" +
      '<div class="linha" style="gap:6px;">' + selo(t.nome) + "</div>" +
      '<p class="faz">' + esc(t.descricao) + "</p>" + secs + "</div>";
  }

  /* ---------- esfera 4: Global Health ---------- */
  function renderGh(g) {
    document.getElementById("lista-da").innerHTML = g.da.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    document.getElementById("lista-nao-da").innerHTML = g.nao_da.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    document.getElementById("legenda-vereditos").innerHTML = g.legenda.map(function (l) {
      return '<span class="chip ' + esc(l.classe) + '">' + esc(l.rotulo) + "</span>";
    }).join("");
    document.getElementById("cadeias").innerHTML = g.cadeias.map(function (c) {
      return '<div class="card cadeia" id="cadeia-' + esc(c.letra) + '">' +
        '<div class="cadeia-topo"><div class="letra">' + esc(c.letra) + '</div><div class="textos"><h3>' + esc(c.titulo) + "</h3><p>" + esc(c.resumo) + "</p></div></div>" +
        '<div class="colunas-cab"><span class="micro">o que a agenda online responde</span><span class="micro">a conversa da Ana neste elo</span></div>' +
        c.elos.map(elo).join("") + "</div>";
    }).join("");
  }

  function elo(e) {
    var lado = '<div class="cab"><span class="num">' + esc(e.id) + "</span><h4>" + esc(e.titulo) + "</h4>" +
      '<span class="chip ' + esc(e.veredito) + '">' + esc(e.veredito_rotulo) + "</span></div>" +
      '<p class="explica">' + esc(e.texto) + "</p>";
    return '<div class="elo"><div class="lado">' + lado + '</div><div class="lado">' + conversa(e) + "</div></div>";
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
    if (c.nota) h += '<div class="nota-hoje">' + esc(c.nota) + "</div>";
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

    renderFaz(DOC.esferas.faz);
    renderBusca(DOC.esferas.busca);
    renderGh(DOC.esferas.global_health);
    mostrarAba(abaDoHash(), false);
    /* o mapa mede texto com canvas e não depende de estar visível; desenha depois das fontes */
    renderRegras(DOC.esferas.regras);
  }

  carregar();
})();
