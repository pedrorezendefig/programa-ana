/* Retrato da Ana: o contrato de links (ADR-0029).
   Toda menção é link, e todo link tem volta. Um link é <a data-ir="<aba>/<alvo>">:
   Liga.ir troca a aba, rola até #<alvo> e acende o alvo por dois segundos.
   A URL carrega destino e filtro: #<aba>/<alvo>?<filtros>. Liga lê a URL ao
   carregar e em hashchange (voltar e avançar do navegador), e escreve por
   Liga.url / Liga.escrever. Os ids de alvo são estáveis: cap-<id>, sec-<id>,
   no-<id>, tool-<nome>, cad-<letra>, elo-<letra>-<n>. */

var Liga = (function () {
  "use strict";

  /* O Ana OS carrega o mesmo motor com uma aba a mais (Cockpit), declarada antes
     em window.LIGA_ABAS; a primeira da lista e a aba de chegada (ADR-0030). */
  var ABAS = (window.LIGA_ABAS && window.LIGA_ABAS.slice()) || ["faz", "regras", "busca", "global-health"];
  var ganchos = { trocarAba: null, aoFiltro: null, lerFiltros: null };
  var ultimoHash = null;
  var timerAcesa = null;

  function reduzido() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function ler(hash) {
    var h = String(hash == null ? location.hash : hash).replace(/^#/, "");
    var caminho = h, q = "";
    var i = h.indexOf("?");
    if (i !== -1) { caminho = h.slice(0, i); q = h.slice(i + 1); }
    var partes = caminho.split("/");
    var aba = ABAS.indexOf(partes[0]) !== -1 ? partes[0] : ABAS[0];
    var alvo = partes[1] ? partes[1].replace(/[^A-Za-z0-9_.-]/g, "") : "";
    var filtros = {};
    if (q) {
      q.split("&").forEach(function (par) {
        if (!par) return;
        var kv = par.split("=");
        var k = decodeURIComponent(kv[0]);
        var v = decodeURIComponent((kv[1] || "").replace(/\+/g, " "));
        if (k) filtros[k] = v;
      });
    }
    return { aba: aba, alvo: alvo, filtros: filtros };
  }

  function url(aba, alvo, filtros) {
    var s = "#" + aba + (alvo ? "/" + alvo : "");
    var pares = [];
    Object.keys(filtros || {}).forEach(function (k) {
      var v = filtros[k];
      if (v === "" || v == null) return;
      pares.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
    });
    if (pares.length) s += "?" + pares.join("&");
    return s;
  }

  function escrever(aba, alvo, filtros, empurrar) {
    var u = url(aba, alvo, filtros);
    ultimoHash = u;
    if (u === location.hash) return;
    if (empurrar) history.pushState(null, "", u);
    else history.replaceState(null, "", u);
  }

  function acender(el) {
    document.querySelectorAll(".acesa").forEach(function (x) { x.classList.remove("acesa"); });
    el.classList.add("acesa");
    clearTimeout(timerAcesa);
    timerAcesa = setTimeout(function () { el.classList.remove("acesa"); }, 2000);
  }

  function abrirDetails(el) {
    var p = el;
    while (p && p !== document.body) {
      if (p.tagName === "DETAILS") p.open = true;
      p = p.parentElement;
    }
  }

  /* alvo: id ou o próprio elemento; origem "filtro" quando quem chama é um chip
     de filtro (Filtros.levar), para o ouvinte só rolar e acender, sem abrir painel */
  function chegar(alvo, origem) {
    if (!alvo) return false;
    var el = typeof alvo === "string" ? document.getElementById(alvo) : alvo;
    if (!el) return false;
    abrirDetails(el);
    if (window.Filtros && Filtros.escondido(el)) Filtros.limpar(ler().aba);
    var ev = new CustomEvent("liga:chegou", { detail: { el: el, alvo: el.id || alvo, origem: origem || "link" }, cancelable: true });
    document.dispatchEvent(ev);
    if (!ev.defaultPrevented) {
      /* alvo mais alto que meia tela vai pelo topo (o scroll-margin-top livra a barra fixa) */
      var alto = el.getBoundingClientRect().height > window.innerHeight * 0.5;
      try { el.scrollIntoView({ block: alto ? "start" : "center", behavior: reduzido() ? "auto" : "smooth" }); }
      catch (e) { el.scrollIntoView(); }
    }
    acender(el);
    return true;
  }

  function ir(destino) {
    var d = ler("#" + String(destino || ""));
    var filtros = ganchos.lerFiltros ? ganchos.lerFiltros(d.aba) : {};
    escrever(d.aba, d.alvo, filtros, true);
    if (ganchos.trocarAba) ganchos.trocarAba(d.aba, function () { chegar(d.alvo); });
    else chegar(d.alvo);
  }

  function aplicar(inicial) {
    var d = ler();
    ultimoHash = location.hash;
    if (ganchos.aoFiltro) ganchos.aoFiltro(d.aba, d.filtros);
    if (ganchos.trocarAba) ganchos.trocarAba(d.aba, function () { chegar(d.alvo); }, inicial);
    else chegar(d.alvo);
  }

  function registrar(g) {
    Object.keys(g || {}).forEach(function (k) { ganchos[k] = g[k]; });
  }

  function iniciar() {
    aplicar(true);
    window.addEventListener("hashchange", function () {
      if (location.hash === ultimoHash) return;
      aplicar(false);
    });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("[data-ir]") : null;
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    ir(a.getAttribute("data-ir"));
  });

  return { ler: ler, url: url, escrever: escrever, ir: ir, chegar: chegar, acender: acender,
           registrar: registrar, iniciar: iniciar, reduzido: reduzido, abas: ABAS };
})();
