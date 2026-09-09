/* Ana OS: a chegada por link (ADR-0029, contrato de links).

   Regra: toda menção é link, todo link tem volta, e o link chega. Este script cuida
   da chegada em qualquer página do OS: quando a URL traz um #<alvo> (ao carregar,
   ao mudar o hash, ou num clique em <a href="#alvo">), ele espera o alvo existir
   (as páginas montam por fetch; teto de 5 s), abre o que estiver fechado no caminho
   (todo <details> ancestral, e o que a página registrar: painel, ficha, faixa
   recolhida), rola até o alvo com block "center" e o acende por 2 s com a classe
   .acesa (os.css: contorno de tinta e fundo interno; em SVG, um halo).

   Ids estáveis do contrato: sec-<id> e tool-<nome> (Mecanismo), cap-<id> e fam-<id>
   (Provas), no-<id> (Mapa do SOP), cad-<letra> e elo-<letra>-<n> (Global Health).
   Hash com "=" (#q=C14, #sec=2-3-1) é filtro da página, não alvo: fica com ela.

   Cada página registra o que precisa:
     Liga.resolver(function (id) { return el || null; })   // id fora do padrão -> elemento
     Liga.aoAbrir(function (id, el) { ... })               // abrir painel/ficha antes de rolar
     Liga.ir(id)                                           // navegação interna: grava o hash e chega
     Liga.chegar(id, cb)                                   // só a chegada, sem mexer na URL

   Cadeias e ferramentas: as cadeias vivem em cadeias.html (código, não JSON). O índice
   ferramenta -> elos sai de lá num <script id="cadeias-indice" type="application/json">,
   que o Mecanismo lê por fetch do próprio cadeias.html. O cadeias.html confere esse
   bloco contra as cadeias ao carregar e avisa no console se divergir. */

(function () {
  "use strict";

  var TETO_MS = 5000;
  var ACESA_MS = 2000;
  var resolvers = [];
  var aberturas = [];
  var apagar = null;

  function reduzMovimento() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function resolver(id) {
    var el = document.getElementById(id);
    for (var i = 0; !el && i < resolvers.length; i++) {
      try { el = resolvers[i](id) || null; } catch (e) { el = null; }
    }
    return el;
  }

  function esperar(id, cb) {
    var inicio = performance.now();
    (function tenta() {
      var el = resolver(id);
      if (el) return cb(el);
      if (performance.now() - inicio > TETO_MS) return cb(null);
      requestAnimationFrame(tenta);
    })();
  }

  function abrir(id, el) {
    var p = el;
    while (p) {
      if (p.tagName === "DETAILS" && !p.open) p.open = true;
      p = p.parentElement;
    }
    aberturas.forEach(function (fn) {
      try { fn(id, el); } catch (e) { console.error("liga: abertura falhou em " + id, e); }
    });
  }

  function acender(el) {
    if (apagar) apagar();
    el.classList.add("acesa");
    var t = setTimeout(function () { if (apagar) apagar(); }, ACESA_MS);
    apagar = function () {
      clearTimeout(t);
      apagar = null;
      /* a saída também é suave: a transição da classe só vale enquanto ela existe */
      el.style.transition = "box-shadow .5s ease, background-color .5s ease, filter .5s ease";
      el.classList.remove("acesa");
      setTimeout(function () { el.style.transition = ""; }, 600);
    };
  }

  function rolar(el, instantaneo) {
    var opts = {
      block: el.tagName === "SECTION" ? "start" : "center",
      inline: "nearest",
      behavior: (instantaneo || reduzMovimento()) ? "auto" : "smooth"
    };
    if (typeof el.scrollIntoView === "function") { el.scrollIntoView(opts); return; }
    var r = el.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top + r.height / 2 - window.innerHeight / 2, behavior: opts.behavior });
  }

  /* As páginas seguem montando depois da chegada (a lista de testes chega depois das
     famílias, a fronteira depois do circuito): se o corpo crescer nos 2,5 s seguintes,
     o alvo é re-centrado, sem animação. */
  var assentar = null;
  function assentarEm(el) {
    if (assentar) assentar();
    if (!window.ResizeObserver) return;
    var ro = new ResizeObserver(function () { rolar(el, true); });
    ro.observe(document.body);
    var t = setTimeout(function () { if (assentar) assentar(); }, 2500);
    assentar = function () { clearTimeout(t); ro.disconnect(); assentar = null; };
  }

  function chegar(id, cb) {
    if (!id) return;
    esperar(id, function (el) {
      if (!el) { if (cb) cb(null); return; }
      abrir(id, el);
      /* abrir um <details> ou um painel muda o layout: rola no frame seguinte */
      requestAnimationFrame(function () {
        rolar(el);
        assentarEm(el);
        if (el.tagName !== "SECTION") acender(el);
        if (cb) cb(el);
      });
    });
  }

  function idDoHash(h) {
    var m = /^#([A-Za-z0-9][\w.:-]*)$/.exec(h || "");
    return m ? m[1] : null;
  }

  function ir(id) {
    if (!id) return;
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
    chegar(id);
  }

  function aoCarregar() {
    var id = idDoHash(location.hash);
    if (id) chegar(id);
    /* registrado só agora, depois dos scripts da página: quem já intercepta o clique
       (e chama preventDefault) continua mandando; o resto chega por aqui */
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      var a = e.target.closest ? e.target.closest("a[href]") : null;
      if (!a) return;
      var href = a.getAttribute("href") || "";
      if (href.charAt(0) !== "#") return;
      var alvo = idDoHash(href);
      if (!alvo || !resolver(alvo)) return;
      e.preventDefault();
      ir(alvo);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aoCarregar);
  else aoCarregar();
  window.addEventListener("hashchange", function () {
    var id = idDoHash(location.hash);
    if (id) chegar(id);
  });

  window.Liga = {
    resolver: function (fn) { resolvers.push(fn); },
    aoAbrir: function (fn) { aberturas.push(fn); },
    ir: ir,
    chegar: chegar,
    idDoHash: idDoHash
  };
})();
