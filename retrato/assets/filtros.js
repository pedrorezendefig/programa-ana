/* Retrato da Ana: filtros em toda esfera (ADR-0029, decisão 3).
   Barra fixa abaixo das abas: busca livre (filtra ao digitar) mais chips.
   Faz: estado e bloco. Regras: raia, tipo de nó e ferramenta (os nós que não a
   chamam esmaecem; as seções que não a chamam somem). Busca: origem e "pode
   chamar hoje". Global Health: veredito. O filtro vai para a URL
   (#<aba>?estado=ainda-nao&q=...) e volta dela ao carregar.
   Ligar um chip (ou escolher no select) também leva até o primeiro item que
   bate, com o destaque rápido da chegada por link (ADR-0032, decisão 7). */

var Filtros = (function () {
  "use strict";

  var CONFIG = {};
  var ESTADO = {};
  var ABA = null;
  var PRONTO = false;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function slug(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function normal(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function vazio(aba) {
    var f = {};
    ((CONFIG[aba] && CONFIG[aba].grupos) || []).forEach(function (g) { f[g.chave] = ""; }); /* aba sem filtro: só a busca */
    f.q = "";
    return f;
  }

  function limparObj(aba, obj) {
    var f = vazio(aba);
    Object.keys(f).forEach(function (k) { if (obj && obj[k] != null) f[k] = String(obj[k]); });
    return f;
  }

  function ativos(aba) {
    var f = ESTADO[aba] || vazio(aba), s = {};
    Object.keys(f).forEach(function (k) { if (f[k]) s[k] = f[k]; });
    return s;
  }

  /* ---------- configuração por esfera ---------- */
  function configurar(doc) {
    var e = doc.esferas;
    var blocos = e.faz.blocos.map(function (b) { return { v: slug(b.nome), r: b.nome }; });
    var raias = e.regras.raias.map(function (r) { return { v: r.id, r: r.rotulo }; });
    var tipos = e.regras.tipos.map(function (t) { return { v: t.id, r: t.rotulo }; });
    var nomes = Object.keys(doc.ferramentas || {}).sort();
    var tools = nomes.map(function (n) { return { v: n, r: n }; });
    var vereditos = [], vistos = {};
    e.global_health.legenda.forEach(function (l) {
      if (vistos[l.classe]) return;
      vistos[l.classe] = 1;
      vereditos.push({ v: l.classe, r: l.rotulo });
    });

    CONFIG = {
      faz: {
        itens: "#blocos-cap .cap", pais: "#blocos-cap .bloco-cap", unidade: ["capacidade", "capacidades"],
        grupos: [
          { chave: "estado", rotulo: "Estado", opcoes: [{ v: "funciona", r: "funciona" }, { v: "parte", r: "em parte" }, { v: "ainda-nao", r: "ainda não" }] },
          { chave: "bloco", rotulo: "Bloco", opcoes: blocos }
        ]
      },
      regras: {
        unidade: ["passo", "passos"], especial: "regras",
        grupos: [
          { chave: "raia", rotulo: "Raia", opcoes: raias },
          { chave: "tipo", rotulo: "Tipo de passo", opcoes: tipos },
          { chave: "ferramenta", rotulo: "Ferramenta", opcoes: tools, select: true, todas: "todas as ferramentas" }
        ]
      },
      busca: {
        itens: "#grupos-tools .tool-card", pais: "#grupos-tools .grupo-tools", unidade: ["ferramenta", "ferramentas"],
        grupos: [
          { chave: "origem", rotulo: "Origem", opcoes: [{ v: "hospital", r: "API do Hospital" }, { v: "gh", r: "Global Health" }, { v: "nativa", r: "nativa da plataforma" }] },
          { chave: "pode", rotulo: "A Ana", opcoes: [{ v: "sim", r: "pode chamar hoje" }, { v: "nao", r: "não pode" }] }
        ]
      },
      "global-health": {
        itens: "#cadeias .elo", pais: "#cadeias .cadeia", unidade: ["elo", "elos"],
        grupos: [{ chave: "veredito", rotulo: "Veredito", opcoes: vereditos }]
      }
    };
    Object.keys(CONFIG).forEach(function (aba) { if (!ESTADO[aba]) ESTADO[aba] = vazio(aba); });
    PRONTO = true;
  }

  /* ---------- barra ---------- */
  function montarBarra(aba) {
    var cfg = CONFIG[aba], f = ESTADO[aba];
    var barra = document.getElementById("filtros");
    if (!barra) return;
    if (!cfg) { barra.innerHTML = ""; barra.classList.remove("com-filtro"); return; } /* aba sem filtro (o Cockpit do OS) */
    var h = '<div class="f-linha">' +
      '<label class="f-busca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
      '<input type="search" id="f-q" placeholder="buscar nesta esfera" value="' + esc(f.q) + '" autocomplete="off" aria-label="Buscar"></label>';
    cfg.grupos.forEach(function (g) {
      if (g.select) {
        h += '<label class="f-grupo f-select"><span class="f-rot">' + esc(g.rotulo) + '</span><select data-chave="' + esc(g.chave) + '" aria-label="' + esc(g.rotulo) + '">' +
          '<option value="">' + esc(g.todas || "todas") + '</option>' +
          g.opcoes.map(function (o) { return '<option value="' + esc(o.v) + '"' + (f[g.chave] === o.v ? " selected" : "") + ">" + esc(o.r) + "</option>"; }).join("") +
          "</select></label>";
        return;
      }
      h += '<div class="f-grupo" role="group" aria-label="' + esc(g.rotulo) + '"><span class="f-rot">' + esc(g.rotulo) + "</span>" +
        g.opcoes.map(function (o) {
          var on = f[g.chave] === o.v;
          return '<button type="button" class="fchip' + (on ? " on" : "") + '" data-chave="' + esc(g.chave) + '" data-valor="' + esc(o.v) + '" aria-pressed="' + (on ? "true" : "false") + '">' + esc(o.r) + "</button>";
        }).join("") + "</div>";
    });
    h += '<span class="f-conta" id="f-conta"></span>' +
      '<button type="button" class="btn f-limpar" id="f-limpar">limpar</button></div>';
    barra.innerHTML = h;

    var q = document.getElementById("f-q");
    q.addEventListener("input", function () { definir(aba, "q", q.value, true); });
    q.addEventListener("keydown", function (e) { if (e.key === "Escape") { q.value = ""; definir(aba, "q", "", true); } });
    barra.querySelectorAll(".fchip").forEach(function (b) {
      b.addEventListener("click", function () { alternar(aba, b.dataset.chave, b.dataset.valor); });
    });
    barra.querySelectorAll("select[data-chave]").forEach(function (s) {
      s.addEventListener("change", function () { definir(aba, s.dataset.chave, s.value); if (s.value) levar(aba); });
    });
    document.getElementById("f-limpar").addEventListener("click", function () { limpar(aba); });
    atualizarBarra(aba);
  }

  function atualizarBarra(aba) {
    var f = ESTADO[aba];
    var barra = document.getElementById("filtros");
    if (!barra) return;
    barra.querySelectorAll(".fchip").forEach(function (b) {
      var on = f[b.dataset.chave] === b.dataset.valor;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    barra.querySelectorAll("select[data-chave]").forEach(function (s) { s.value = f[s.dataset.chave] || ""; });
    var q = document.getElementById("f-q");
    if (q && q.value !== f.q) q.value = f.q;
    var algum = Object.keys(f).some(function (k) { return !!f[k]; });
    var limparBtn = document.getElementById("f-limpar");
    if (limparBtn) limparBtn.hidden = !algum;
    barra.classList.toggle("com-filtro", algum);
  }

  /* ---------- aplicação ---------- */
  function aplicar(aba) {
    if (!PRONTO || !CONFIG[aba]) return;
    var cfg = CONFIG[aba], f = ESTADO[aba], q = normal(f.q).trim();
    var n = 0, m = 0;
    if (cfg.especial === "regras") {
      var r = window.RetratoSop ? RetratoSop.filtrar({ q: q, raia: f.raia, tipo: f.tipo, ferramenta: f.ferramenta }) : { n: 0, m: 0 };
      n = r.n; m = r.m;
      document.querySelectorAll("#secoes-prompt .secao-prompt").forEach(function (el) {
        var ok = true;
        if (f.ferramenta) ok = (" " + (el.dataset.tools || "") + " ").indexOf(" " + f.ferramenta + " ") !== -1;
        if (ok && q) ok = normal(el.dataset.texto || el.textContent).indexOf(q) !== -1;
        el.classList.toggle("filtrado", !ok);
      });
      document.querySelectorAll("#indice-prompt a").forEach(function (a) {
        var sec = document.getElementById("sec-" + a.dataset.sec);
        a.classList.toggle("filtrado", !!(sec && sec.classList.contains("filtrado")));
      });
    } else {
      document.querySelectorAll(cfg.itens).forEach(function (el) {
        m++;
        var ok = true;
        cfg.grupos.forEach(function (g) {
          if (!ok || !f[g.chave]) return;
          var v = el.dataset[g.chave] || "";
          ok = (" " + v + " ").indexOf(" " + f[g.chave] + " ") !== -1;
        });
        if (ok && q) ok = normal(el.dataset.texto || el.textContent).indexOf(q) !== -1;
        if (ok) n++;
        el.classList.toggle("filtrado", !ok);
      });
      if (cfg.pais) {
        document.querySelectorAll(cfg.pais).forEach(function (p) {
          var vivos = p.querySelectorAll(cfg.itens.split(" ").pop() + ":not(.filtrado)").length;
          p.classList.toggle("filtrado", vivos === 0);
        });
      }
    }
    document.dispatchEvent(new CustomEvent("filtros:aplicado", { detail: { aba: aba, n: n, m: m } }));
    var conta = document.getElementById("f-conta");
    if (conta && ABA === aba) {
      var algum = Object.keys(f).some(function (k) { return !!f[k]; });
      conta.textContent = algum ? n + " de " + m + " " + cfg.unidade[1] : m + " " + (m === 1 ? cfg.unidade[0] : cfg.unidade[1]);
    }
  }

  function gravarUrl(aba) {
    if (window.Liga && ABA === aba) Liga.escrever(aba, "", ativos(aba), false);
  }

  function definir(aba, chave, valor, semBarra) {
    if (!ESTADO[aba]) return;
    ESTADO[aba][chave] = valor || "";
    aplicar(aba);
    if (!semBarra) atualizarBarra(aba); else atualizarBarra(aba);
    gravarUrl(aba);
  }

  function alternar(aba, chave, valor) {
    var liga = ESTADO[aba][chave] !== valor;
    definir(aba, chave, liga ? valor : "");
    if (liga) levar(aba);
  }

  /* o primeiro item visível que bate: nas regras, o nó mais à esquerda do
     fluxograma (depois o mais alto); nas outras esferas, o primeiro na ordem da página */
  function primeiro(aba) {
    var cfg = CONFIG[aba];
    if (!cfg) return null;
    if (cfg.especial === "regras") {
      var nos = Array.prototype.slice.call(document.querySelectorAll("#svg .no:not(.apagado)"));
      nos.sort(function (a, b) {
        var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return ra.left - rb.left || ra.top - rb.top;
      });
      return nos[0] || null;
    }
    return document.querySelector(cfg.itens.split(",").map(function (s) { return s.trim() + ":not(.filtrado)"; }).join(",")) || null;
  }

  /* um comportamento só para todo chip de filtro: rola até o item e o acende.
     Durante a rolagem o mouse parado passa por cima de nós do fluxograma; LEVANDO
     avisa o hover do Mapa do SOP para não abrir o painel por engano. */
  var LEVANDO_ATE = 0;
  function levar(aba, el) {
    el = el || primeiro(aba);
    if (!el) return;
    LEVANDO_ATE = Date.now() + 1200;
    if (window.Liga) Liga.chegar(el, "filtro");
    else try { el.scrollIntoView({ block: "center" }); } catch (x) { /* sem rolagem */ }
  }

  function limpar(aba) {
    if (!CONFIG[aba]) return;
    ESTADO[aba] = vazio(aba);
    aplicar(aba);
    atualizarBarra(aba);
    gravarUrl(aba);
  }

  function mostrar(aba) {
    ABA = aba;
    if (!PRONTO) return;
    montarBarra(aba);
    aplicar(aba);
  }

  /* chamado pela Liga ao ler a URL: define o estado da esfera sem escrever de volta */
  function daUrl(aba, filtros) {
    if (!CONFIG[aba]) return;
    ESTADO[aba] = limparObj(aba, filtros);
    if (ABA === aba) { atualizarBarra(aba); }
    aplicar(aba);
  }

  function escondido(el) {
    var p = el;
    while (p && p !== document.body) {
      if (p.classList && p.classList.contains("filtrado")) return true;
      p = p.parentElement;
    }
    return false;
  }

  return { configurar: configurar, mostrar: mostrar, aplicar: aplicar, definir: definir, alternar: alternar,
           limpar: limpar, daUrl: daUrl, levar: levar, levando: function () { return Date.now() < LEVANDO_ATE; }, ativos: ativos, escondido: escondido, slug: slug, valor: function (aba, chave) { return ESTADO[aba] ? ESTADO[aba][chave] : ""; } };
})();
