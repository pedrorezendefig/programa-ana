/* Ana OS: o player, a tela que toca uma conversa gravada da bancada (ADR-0032, decisões 4 a 6).

   Lê /api/conversas (as gravações de ana/bancada/conversas/ e os cenários declarados) e
   abre por cima da página com o endereço #tocar=<id>. Paciente em balão cinza à esquerda,
   Ana em azul-marinho à direita, cada ferramenta chamada como chip entre os balões, o
   "espere" do cenário ao lado da resposta e cada conferência que falhou numa faixa
   vermelha com "esperado / veio". Ao lado, o fluxograma do caminho declarado no cenário:
   o nó acende no turno dele e fica vermelho se a conferência daquele turno falhou.
   Avança por "próximo"; o play anda um passo a cada 4 s. Esc fecha.

   Três portas: o botão de cada teste das capacidades (Player.botao, montado pelo
   os-esferas.js), o "tocar a jornada" no lugar do "percorrer" do Mapa do SOP, e o bloco
   "tocar" de cada ferramenta. Cenário sem gravação mostra "nunca rodou" e não toca.
   Só conversa real, nunca exemplo escrito à mão. Só no OS, nunca no Retrato. */

var Player = (function () {
  "use strict";

  var MS_PLAY = 4000;
  var DADOS = null, CARREGANDO = null, DOC = null;
  var CEN = {};            /* id -> cenário declarado */
  var ESTADO = null;       /* o que está tocando */
  var VOLTA = { hash: "", foco: null };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function valor(v) {
    if (v === null || v === undefined) return "nada";
    if (Array.isArray(v)) return v.length ? v.join(", ") : "nenhuma";
    if (v === true) return "sim";
    if (v === false) return "não";
    return String(v);
  }
  function quando(iso) {
    var d = new Date(iso || "");
    if (isNaN(d)) return "";
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function carregar() {
    if (!CARREGANDO) {
      CARREGANDO = fetch("/api/conversas").then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).then(function (d) {
        DADOS = d;
        (d.cenarios || []).forEach(function (c) { if (c.id && !CEN[c.id]) CEN[c.id] = c; });
        return d;
      }).catch(function (x) {
        console.warn("player: não li as conversas gravadas", x);
        DADOS = { conversas: {}, cenarios: [] };
        return DADOS;
      });
    }
    return CARREGANDO;
  }
  function REGRAS() { return DOC && DOC.esferas ? DOC.esferas.regras : { nos: [], raias: [] }; }
  /* o Retrato prefixa os nós com "n" (nE1); o cenário declara o id do Mapa do SOP (E1) */
  function idSop(n) { return String(n.id).replace(/^n(?=[A-Z])/, ""); }
  function gravada(id) { return DADOS && DADOS.conversas ? DADOS.conversas[id] || null : null; }

  /* ============================================================ as portas */

  /* o botão de um cenário: o rótulo final sai do decorar, quando as gravações chegam */
  function botao(id) {
    return '<button type="button" class="btn mini tocar" data-tocar="' + esc(id) + '">tocar ' + esc(id) + "</button>";
  }
  function decorarBotao(b) {
    var g = gravada(b.dataset.tocar);
    b.classList.toggle("nunca", !g);
    b.classList.toggle("falhou", !!(g && g.veredito !== "passou"));
    b.innerHTML = g
      ? '<span class="tri" aria-hidden="true"></span>tocar ' + esc(b.dataset.tocar) + '<span class="ponto ' + (g.veredito === "passou" ? "ok" : "falha") + '" title="' + esc(g.veredito) + '"></span>'
      : "nunca rodou · " + esc(b.dataset.tocar);
  }
  function decorar(raiz) {
    return carregar().then(function () {
      (raiz || document).querySelectorAll("[data-tocar]").forEach(decorarBotao);
    });
  }

  /* os cenários que passam por uma raia do Mapa do SOP ou chamam uma ferramenta */
  function nosDe(c) {
    var g = gravada(c.id), out = [];
    var turnos = g && g.turnos && g.turnos.length ? g.turnos : c.turnos || [];
    turnos.forEach(function (t) { (t.nos || []).forEach(function (n) { if (out.indexOf(n) === -1) out.push(n); }); });
    return out;
  }
  function primeiro(ids) {
    for (var i = 0; i < ids.length; i++) if (gravada(ids[i])) return ids[i];
    return ids[0];
  }
  function cenariosDaRaia(rid) {
    if (!DOC) return [];
    var daRaia = {};
    REGRAS().nos.forEach(function (n) { if (n.raia === rid) daRaia[idSop(n)] = 1; });
    return (DADOS.cenarios || []).filter(function (c) {
      return !c.manual && nosDe(c).some(function (n) { return daRaia[n]; });
    }).map(function (c) { return c.id; });
  }
  function cenariosDaFerramenta(nome) {
    return (DADOS.cenarios || []).filter(function (c) {
      if (c.manual) return false;
      var g = gravada(c.id);
      if (g && (g.tools || []).indexOf(nome) !== -1) return true;
      return (c.turnos || []).some(function (t) { return (t.tools || []).indexOf(nome) !== -1; });
    }).map(function (c) { return c.id; });
  }

  /* Mapa do SOP: o "percorrer a jornada" vira "tocar a jornada" (ADR-0032, decisão 5).
     O sop.js é do Retrato e redesenha o gutter a cada resize: o OS só troca o rótulo
     depois de cada desenho e toma o clique antes dele, sem mexer no motor. */
  function rotularJornadas() {
    if (!DADOS || !DOC) return;
    document.querySelectorAll("#gutter .f-jornada").forEach(function (b) {
      var ids = cenariosDaRaia(b.dataset.raia);
      var t = ids.length ? "tocar a jornada (" + ids.length + (ids.length === 1 ? " cenário)" : " cenários)") : "sem cenário gravável";
      if (b.textContent !== t) b.textContent = t;
      b.disabled = !ids.length;
      b.classList.remove("on");
    });
  }
  function ligarJornadas() {
    var g = document.getElementById("gutter");
    if (g && window.MutationObserver) new MutationObserver(rotularJornadas).observe(g, { childList: true, subtree: true, characterData: true });
    rotularJornadas();
    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("#gutter .f-jornada") : null;
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      var ids = cenariosDaRaia(b.dataset.raia);
      if (!ids.length) return;
      var raia = (REGRAS().raias || []).filter(function (r) { return r.id === b.dataset.raia; })[0];
      abrir(primeiro(ids), { rotulo: "jornada " + (raia ? raia.rotulo : b.dataset.raia), ids: ids });
    }, true);
  }

  /* As ferramentas: toca o primeiro cenário que a chama, com a lista quando há mais */
  function ligarFerramentas() {
    document.querySelectorAll("#grupos-tools .tool-card").forEach(function (card) {
      var nome = card.id.replace(/^tool-/, "");
      var velho = card.querySelector(".tocar-tool");
      if (velho) velho.remove();
      var ids = cenariosDaFerramenta(nome);
      var h = '<div class="tocar-tool"><span class="micro">na bancada</span>';
      if (!ids.length) h += '<span class="caption">nenhum cenário chama esta ferramenta</span>';
      else {
        var p = primeiro(ids);
        h += '<button type="button" class="btn mini tocar" data-tocar="' + esc(p) + '" data-tocar-ferramenta="' + esc(nome) + '">' + esc(p) + "</button>";
        if (ids.length > 1) h += '<span class="caption">também em</span>' + ids.filter(function (x) { return x !== p; }).map(function (x) {
          return '<button type="button" class="tocar-link" data-tocar="' + esc(x) + '" data-tocar-ferramenta="' + esc(nome) + '">' + esc(x) + "</button>";
        }).join("");
      }
      card.insertAdjacentHTML("beforeend", h + "</div>");
    });
    document.querySelectorAll("#grupos-tools .tocar-tool .btn.tocar").forEach(decorarBotao);
    document.querySelectorAll("#grupos-tools .tocar-link").forEach(function (b) {
      var g = gravada(b.dataset.tocar);
      b.classList.toggle("nunca", !g);
      b.classList.toggle("falhou", !!(g && g.veredito !== "passou"));
      b.title = g ? "rodou em " + quando(g.rodou_em) + ", " + g.veredito : "nunca rodou";
    });
  }

  /* ============================================================ o player */

  function montarCasca() {
    if (document.getElementById("player")) return;
    document.body.insertAdjacentHTML("beforeend",
      '<div class="player-fundo" id="player" hidden>' +
      '<div class="player" role="dialog" aria-modal="true" aria-labelledby="player-titulo">' +
      '<header class="player-cab"><div class="player-ident" id="player-ident"></div>' +
      '<button class="btn icone" type="button" id="player-fechar" aria-label="Fechar (Esc)">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>' +
      '<div class="player-lista" id="player-lista" hidden></div>' +
      '<div class="player-corpo" id="player-corpo"></div>' +
      '<footer class="player-pe" id="player-pe"></footer>' +
      "</div></div>");
    document.getElementById("player-fechar").addEventListener("click", function () { fechar(true); });
    document.getElementById("player").addEventListener("click", function (e) {
      if (e.target.id === "player") fechar(true);
    });
  }

  function passosDe(g) {
    var p = [];
    (g.turnos || []).forEach(function (t, k) { p.push({ tipo: "paciente", k: k }); p.push({ tipo: "ana", k: k }); });
    return p;
  }

  function abrir(id, ctx, semHistorico) {
    montarCasca();
    parar();
    if (!ESTADO) {
      VOLTA.foco = document.activeElement;
      if (!/^#tocar=/.test(location.hash)) VOLTA.hash = location.hash;
    }
    var g = gravada(id), c = CEN[id] || null;
    if (ctx === undefined && ESTADO && ESTADO.ctx && ESTADO.ctx.ids.indexOf(id) !== -1) ctx = ESTADO.ctx;
    ESTADO = { id: id, g: g, c: c, ctx: ctx || null, passos: g ? passosDe(g) : [], i: -1, timer: null, fluxo: null };
    if (!semHistorico && location.hash !== "#tocar=" + id) history.pushState(null, "", "#tocar=" + encodeURIComponent(id));
    document.getElementById("player").hidden = false;
    document.documentElement.classList.add("player-aberto");
    render();
    if (g) proximo();
    document.getElementById("player-fechar").focus();
  }

  function fechar(mexerNoEndereco) {
    if (!ESTADO) return;
    parar();
    ESTADO = null;
    document.getElementById("player").hidden = true;
    document.documentElement.classList.remove("player-aberto");
    if (mexerNoEndereco && /^#tocar=/.test(location.hash)) history.replaceState(null, "", VOLTA.hash || location.pathname + location.search);
    if (VOLTA.foco && VOLTA.foco.focus) { try { VOLTA.foco.focus({ preventScroll: true }); } catch (x) { /* sem foco */ } }
  }

  function render() {
    var e = ESTADO, g = e.g, c = e.c;
    var titulo = (g && g.titulo) || (c && c.titulo) || "cenário sem título";
    var chips = [];
    if (g) {
      chips.push('<span class="chip mini ' + (g.veredito === "passou" ? "feito" : "tag") + '">' + esc(g.veredito) + "</span>");
      chips.push('<span class="caption">rodou em ' + esc(quando(g.rodou_em)) + (g.conversa_id ? " · conversa " + esc(g.conversa_id) + " no Chatwoot" : "") + "</span>");
    } else chips.push('<span class="chip mini bloqueada">nunca rodou</span>');
    document.getElementById("player-ident").innerHTML =
      '<span class="micro">conversa gravada · ' + esc(e.id) + (c && c.capacidade ? ' · <a href="#faz/cap-' + esc(c.capacidade) + '" data-player-ir="faz/cap-' + esc(c.capacidade) + '">' + esc(c.capacidade) + "</a>" : "") + "</span>" +
      '<h3 id="player-titulo">' + esc(titulo) + "</h3>" +
      '<div class="player-chips">' + chips.join("") + "</div>";

    var lista = document.getElementById("player-lista");
    if (e.ctx && e.ctx.ids.length > 1) {
      lista.hidden = false;
      lista.innerHTML = '<span class="micro">' + esc(e.ctx.rotulo) + "</span>" + e.ctx.ids.map(function (x) {
        var gx = gravada(x);
        return '<button type="button" class="tocar-link' + (x === e.id ? " atual" : "") + (gx ? (gx.veredito !== "passou" ? " falhou" : "") : " nunca") + '" data-tocar="' + esc(x) + '"' + (x === e.id ? ' aria-current="true"' : "") + ">" + esc(x) + "</button>";
      }).join("");
    } else { lista.hidden = true; lista.innerHTML = ""; }

    var corpo = document.getElementById("player-corpo");
    if (!g) {
      var cmd = c && !c.manual ? "python3 ana/bancada/e2e.py cenarios/" + (c.arquivo || "capacidades.json") + " --so " + e.id : "";
      corpo.innerHTML = '<div class="player-nunca"><span class="chip bloqueada">nunca rodou</span>' +
        "<p>" + (c && c.manual ? "Cenário manual: não roda pela bancada, e por isso não tem conversa para tocar." : c ? "Este cenário ainda não tem conversa gravada. O player só toca conversa real." : "Não existe cenário com este id na bancada.") + "</p>" +
        (cmd ? '<p class="caption">Para gravar, rode no terminal:</p><pre>' + esc(cmd) + "</pre>" : "") + "</div>";
      document.getElementById("player-pe").innerHTML = "";
      return;
    }
    var nos = nosDe(c || { id: e.id, turnos: g.turnos });
    corpo.innerHTML = '<div class="player-conversa" id="player-conversa" aria-live="polite"></div>' +
      (nos.length && DOC ? '<div class="player-fluxo"><span class="micro">o caminho no Mapa do SOP</span><div class="fluxo-palco" id="player-fluxo"></div></div>' : "");
    corpo.classList.toggle("com-fluxo", !!(nos.length && DOC));
    if (nos.length && DOC && window.Fluxo) montarFluxo(nos);
    document.getElementById("player-pe").innerHTML =
      '<span class="caption" id="player-passo"></span>' +
      '<div class="player-botoes">' +
      '<button type="button" class="btn mini" id="player-recomecar">do início</button>' +
      '<button type="button" class="btn mini" id="player-play" aria-pressed="false">play</button>' +
      '<button type="button" class="btn mini principal" id="player-proximo">próximo</button></div>';
    document.getElementById("player-proximo").onclick = function () { parar(); proximo(); };
    document.getElementById("player-play").onclick = alternarPlay;
    document.getElementById("player-recomecar").onclick = function () { parar(); e.i = -1; document.getElementById("player-conversa").innerHTML = ""; proximo(); };
  }

  function montarFluxo(nos) {
    var porId = {};
    REGRAS().nos.forEach(function (n) { porId[idSop(n)] = n; });
    var est = { nos: [{ id: "inicio", tipo: "inicio", texto: "o paciente escreve" }].concat(nos.map(function (id) {
      var n = porId[id] || { titulo: id, secao: "" };
      return { id: id, tipo: n.tipo === "decisao" ? "decisao" : "passo", texto: id + ". " + (n.titulo || ""), sub: [n.secao].concat(n.ferramentas || []).filter(Boolean).join(" · ") };
    })) };
    ESTADO.fluxo = Fluxo.montar(document.getElementById("player-fluxo"), est, { cardW: 260, rotulo: "Caminho declarado no cenário " + ESTADO.id });
    ESTADO.nosDoTurno = (ESTADO.g.turnos || []).map(function (t, k) {
      var d = t.nos && t.nos.length ? t.nos : (ESTADO.c && ESTADO.c.turnos[k] ? ESTADO.c.turnos[k].nos || [] : []);
      return d;
    });
  }

  function falhasDo(t) { return (t.conferencias || []).filter(function (x) { return x.ok === false; }); }

  function htmlPasso(p) {
    var t = ESTADO.g.turnos[p.k];
    if (p.tipo === "paciente") {
      return '<div class="pl-linha paciente"><div class="pl-balao paciente"><div class="quem">paciente · turno ' + (p.k + 1) + "</div>" + esc(t.paciente) + "</div></div>";
    }
    var h = "";
    if (t.ferramentas === null || t.ferramentas === undefined) h += '<div class="pl-tools"><span class="pl-tool sem">ferramentas não coletadas</span></div>';
    else if (t.ferramentas.length) h += '<div class="pl-tools">' + t.ferramentas.map(function (f) {
      return '<a class="pl-tool" href="#busca/tool-' + esc(f) + '" data-player-ir="busca/tool-' + esc(f) + '"><span class="micro">ferramenta</span>' + esc(f) + "</a>";
    }).join("") + "</div>";
    var ana = (t.ana || []).length ? t.ana : null;
    h += '<div class="pl-linha ana">' +
      (t.espere ? '<aside class="pl-espere"><span class="micro">espere</span>' + esc(t.espere) + (t.falha_se ? '<span class="micro">falha se</span>' + esc(t.falha_se) : "") + "</aside>" : "") +
      '<div class="pl-respostas">' + (ana ? ana.map(function (m) { return '<div class="pl-balao ana"><div class="quem">Ana</div>' + esc(m) + "</div>"; }).join("")
        : '<div class="pl-balao ana mudo"><div class="quem">Ana</div>não respondeu</div>') + "</div></div>";
    var conf = t.conferencias || [], falhas = falhasDo(t);
    falhas.forEach(function (x) {
      h += '<div class="pl-falha"><strong>' + esc(x.tipo) + "</strong>" +
        '<span>esperado: <code>' + esc(valor(x.esperado)) + "</code></span>" +
        '<span>veio: <code>' + esc(valor(x.veio)) + "</code></span></div>";
    });
    var oks = conf.filter(function (x) { return x.ok; });
    if (oks.length) h += '<p class="pl-oks caption">' + oks.length + (oks.length === 1 ? " conferência ok: " : " conferências ok: ") + oks.map(function (x) { return esc(x.tipo); }).join(", ") + "</p>";
    return h;
  }

  function proximo() {
    var e = ESTADO;
    if (!e || !e.g) return;
    if (e.i >= e.passos.length - 1) { parar(); atualizarPe(); return; }
    e.i++;
    var conv = document.getElementById("player-conversa");
    var div = document.createElement("div");
    div.className = "pl-passo";
    div.innerHTML = htmlPasso(e.passos[e.i]);
    conv.appendChild(div);
    try { div.scrollIntoView({ block: "end", behavior: Fluxo && Fluxo.reduzido() ? "auto" : "smooth" }); } catch (x) { div.scrollIntoView(); }
    acenderFluxo();
    atualizarPe();
    if (e.i >= e.passos.length - 1) parar();
  }

  /* o nó acende no turno declarado e fica vermelho se a conferência daquele turno falhou */
  function acenderFluxo() {
    var e = ESTADO, f = e.fluxo;
    if (!f) return;
    var p = e.passos[e.i];
    f.svg.querySelectorAll(".fno").forEach(function (el) { el.classList.remove("op-ok", "op-falha", "atual"); });
    var vistos = { inicio: 1 }, estado = {};
    for (var k = 0; k <= p.k; k++) {
      var fim = k < p.k || p.tipo === "ana";
      var falhou = fim && falhasDo(e.g.turnos[k]).length > 0;
      (e.nosDoTurno[k] || []).forEach(function (id) { vistos[id] = 1; if (fim) estado[id] = falhou ? "op-falha" : "op-ok"; });
    }
    Object.keys(estado).forEach(function (id) { var el = f.noEl(id); if (el) el.classList.add(estado[id]); });
    f.esmaecer(f.ordem.filter(function (id) { return !vistos[id]; }));
    var doTurno = e.nosDoTurno[p.k] || [];
    var alvo = p.tipo === "paciente" ? doTurno[0] : doTurno[doTurno.length - 1];
    if (alvo) {
      f.marcar(alvo);
      var el = f.noEl(alvo);
      var palco = document.getElementById("player-fluxo");
      if (el && palco && palco.parentElement.scrollHeight > palco.parentElement.clientHeight) {
        try { el.scrollIntoView({ block: "nearest", behavior: "auto" }); } catch (x) { /* sem rolagem */ }
      }
    }
  }

  function atualizarPe() {
    var e = ESTADO;
    if (!e || !e.g) return;
    var el = document.getElementById("player-passo");
    if (el) el.textContent = "passo " + (e.i + 1) + " de " + e.passos.length + (e.i >= e.passos.length - 1 ? " · fim da conversa" : "");
    var px = document.getElementById("player-proximo");
    if (px) px.disabled = e.i >= e.passos.length - 1;
    var pl = document.getElementById("player-play");
    if (pl) { pl.textContent = e.timer ? "pausar" : "play"; pl.setAttribute("aria-pressed", e.timer ? "true" : "false"); pl.disabled = !e.timer && e.i >= e.passos.length - 1; }
  }

  function alternarPlay() {
    var e = ESTADO;
    if (!e) return;
    if (e.timer) { parar(); atualizarPe(); return; }
    e.timer = setInterval(proximo, MS_PLAY);
    atualizarPe();
  }
  function parar() {
    if (ESTADO && ESTADO.timer) { clearInterval(ESTADO.timer); ESTADO.timer = null; }
  }

  /* ============================================================ endereço e teclado */

  function idDoHash(h) {
    var m = /^#tocar=([A-Za-z0-9_.-]+)$/.exec(decodeURIComponent(h || ""));
    return m ? m[1] : null;
  }

  /* #tocar=<id> não é uma aba: o Liga mandaria para o Cockpit. O player toma o
     hashchange antes dele (captura na window) e o resto segue para o Liga. */
  window.addEventListener("hashchange", function (ev) {
    var id = idDoHash(location.hash);
    if (id) {
      ev.stopImmediatePropagation();
      carregar().then(function () { abrir(id, undefined, true); });
    } else if (ESTADO) fechar(false);
  }, true);

  /* chegada direta por #tocar=<id>: a página de baixo é a capacidade do cenário */
  var CHEGADA = idDoHash(location.hash);
  if (CHEGADA) {
    var cap = /^(C\d+)-\d+$/.exec(CHEGADA);
    history.replaceState(null, "", cap ? "#faz/cap-" + cap[1] : "#faz");
  }

  document.addEventListener("keydown", function (e) {
    if (!ESTADO) return;
    if (e.key === "Escape") { e.preventDefault(); fechar(true); }
    else if (e.key === "ArrowRight" && !e.altKey && !e.metaKey) { e.preventDefault(); parar(); proximo(); }
  });

  document.addEventListener("click", function (e) {
    var ir = e.target.closest ? e.target.closest("[data-player-ir]") : null;
    if (ir && ESTADO) {
      e.preventDefault();
      var destino = ir.getAttribute("data-player-ir");
      fechar(true);
      if (window.Liga) Liga.ir(destino);
      return;
    }
    var b = e.target.closest ? e.target.closest("[data-tocar]") : null;
    if (!b) return;
    e.preventDefault();
    var id = b.dataset.tocar, ctx;
    if (b.dataset.tocarFerramenta) {
      var ids = cenariosDaFerramenta(b.dataset.tocarFerramenta);
      ctx = { rotulo: "cenários que chamam " + b.dataset.tocarFerramenta, ids: ids };
    }
    carregar().then(function () { abrir(id, ctx); });
  });

  document.addEventListener("retrato:pronto", function (e) {
    DOC = e.detail.doc;
    carregar().then(function () {
      ligarJornadas();
      ligarFerramentas();
      if (CHEGADA) { var id = CHEGADA; CHEGADA = null; setTimeout(function () { abrir(id); }, 0); }
    });
  });

  return { botao: botao, decorar: decorar, abrir: abrir, fechar: fechar };
})();
