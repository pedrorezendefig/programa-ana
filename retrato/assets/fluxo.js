/* Retrato da Ana: fluxogramas na gramática visual do aplicativo do hospital (ADR-0029,
   decisão 4; gramática do renderer próprio do app): terminais em pílula (início em
   azul-marinho, fim em verde), passos em card branco com badge numerado, decisões em card
   âmbar com badge "?" e ramos rotulados em chip, retornos em curva pela lateral direita,
   terminal tracejado para o "ainda não". Layout vertical determinístico, sem motor de grafo.

   Estrutura: { nos: [ { id, tipo, texto, sub, rotulo, ramos, retorna_para, retorno_rotulo } ] }
     tipo: inicio | passo | decisao | tracejado | falha | fim | fim-tracejado
     ramos (só em decisao): [ { rotulo, tom, no } ]  com no = um nó desenhado em leque
       abaixo da decisão; sem "no", o ramo vira só um chip na seta que segue.
     rotulo: chip na seta que sai do nó.  retorna_para: curva de retorno a um nó anterior.

   Percorrer: Fluxo.passeador(...) é o motor de passos (400 ms por passo, sem autoplay,
   e sob prefers-reduced-motion vira só o "próximo" estático); Fluxo.montar devolve um
   controlador com acender / percorrer / parar / recomecar / proximo / marcar / esmaecer. */

var Fluxo = (function () {
  "use strict";

  var FONTE = window.FLUXO_FONTE || "'HP Simplified', system-ui, sans-serif"; /* o OS mede com a fonte dele */
  var MS_PASSO = 400;
  var INSTANCIAS = 0;
  var UID = "";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function n(v) { return String(Math.round(v * 10) / 10); }
  function reduzido() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  var medidor = document.createElement("canvas").getContext("2d");
  function quebrar(texto, tam, largura, maxLinhas) {
    medidor.font = "400 " + tam + "px " + FONTE;
    var palavras = String(texto || "").split(/\s+/), linhas = [], atual = "";
    for (var i = 0; i < palavras.length; i++) {
      var t = atual ? atual + " " + palavras[i] : palavras[i];
      if (medidor.measureText(t).width <= largura || !atual) { atual = t; continue; }
      linhas.push(atual);
      atual = palavras[i];
    }
    linhas.push(atual);
    if (maxLinhas && linhas.length > maxLinhas) {
      linhas = linhas.slice(0, maxLinhas);
      var u = linhas[maxLinhas - 1];
      while (medidor.measureText(u + "…").width > largura && u.length > 3) u = u.slice(0, -1);
      linhas[maxLinhas - 1] = u + "…";
    }
    return linhas;
  }
  function larguraTexto(texto, tam) {
    medidor.font = "400 " + tam + "px " + FONTE;
    return medidor.measureText(String(texto || "")).width;
  }

  /* ---------- layout ---------- */
  function calcular(est, opt) {
    var CARD_W = opt.cardW || 250, FAN_W = opt.fanW || 190, FAN_GAP = 16, GAP = 34, TOP = 18, PAD = 12;
    var TAM = 13, LH = 17, TAM_SUB = 11.5, BADGE = 26, TERM_H = 34;
    var temRetorno = est.nos.some(function (x) { return x.retorna_para; });
    var chipRetorno = 0;
    est.nos.forEach(function (x) { if (x.retorna_para && x.retorno_rotulo) chipRetorno = Math.max(chipRetorno, larguraTexto(x.retorno_rotulo, 12) + 16); });
    var fanMax = 0;
    est.nos.forEach(function (x) {
      if (x.ramos && x.ramos.some(function (r) { return r.no; })) {
        var k = x.ramos.filter(function (r) { return r.no; }).length;
        fanMax = Math.max(fanMax, k * FAN_W + (k - 1) * FAN_GAP);
      }
    });
    var PAD_X = 22;
    var colW = Math.max(CARD_W, fanMax);
    var cx = PAD_X + colW / 2;
    var largura = PAD_X * 2 + colW + (temRetorno ? 56 + Math.max(0, chipRetorno / 2 - 22) : 0);

    var nos = [], arestas = [], chips = [], geo = {};
    var numero = 0, y = TOP, anterior = null, anteriorRotulo = "", anteriorTomChip = "neutro";

    function medir(no, w) {
      var terminal = no.tipo === "inicio" || no.tipo === "fim" || no.tipo === "fim-tracejado";
      if (terminal) {
        var tw = larguraTexto(no.texto, 14) + 58;
        return { w: Math.max(96, tw), h: TERM_H, linhas: [no.texto], sub: [] };
      }
      var larg = w - PAD * 2 - BADGE;
      var linhas = quebrar(no.texto, TAM, larg, 4);
      var sub = no.sub ? quebrar(no.sub, TAM_SUB, larg, 3) : [];
      var h = Math.max(46, PAD * 2 + linhas.length * LH + (sub.length ? sub.length * 15 + 4 : 0));
      return { w: w, h: h, linhas: linhas, sub: sub };
    }

    function colocar(no, x, yy, w) {
      var m = medir(no, w);
      var terminal = no.tipo === "inicio" || no.tipo === "fim" || no.tipo === "fim-tracejado";
      var g = { id: no.id, tipo: no.tipo, x: terminal ? x + (w - m.w) / 2 : x, y: yy, w: m.w, h: m.h,
                linhas: m.linhas, sub: m.sub, numero: null, classe: no.classe || "", no: no };
      if (no.tipo === "passo" || no.tipo === "falha" || no.tipo === "tracejado") g.numero = ++numero;
      geo[no.id] = g;
      nos.push(g);
      return g;
    }

    function seta(de, para, d, rotulo, tom, chipXY) {
      var a = { de: de, para: para, d: d };
      arestas.push(a);
      if (rotulo) chips.push({ de: de, para: para, rotulo: rotulo, tom: tom || "neutro", x: chipXY[0], y: chipXY[1] });
    }

    est.nos.forEach(function (no) {
      var g = colocar(no, cx - CARD_W / 2, y, CARD_W);
      if (anterior) {
        var a = geo[anterior];
        seta(anterior, no.id, "M " + n(cx) + " " + n(a.y + a.h) + " V " + n(g.y - 6), anteriorRotulo, anteriorTomChip, [cx, (a.y + a.h + g.y) / 2]);
      }
      anteriorRotulo = no.rotulo || "";
      anteriorTomChip = no.rotulo_tom || "neutro";
      var ramosNo = (no.ramos || []).filter(function (r) { return r.no; });
      var ramosChip = (no.ramos || []).filter(function (r) { return !r.no; });
      if (ramosChip.length && !no.rotulo) { anteriorRotulo = ramosChip.map(function (r) { return r.rotulo; }).join(" / "); anteriorTomChip = ramosChip[0].tom || "neutro"; }
      if (!ramosNo.length) { anterior = no.id; y = g.y + g.h + GAP; return; }

      /* leque: os ramos com nó lado a lado abaixo da decisão, convergindo depois */
      var k = ramosNo.length, total = k * FAN_W + (k - 1) * FAN_GAP;
      var x0 = cx - total / 2;
      var busY = g.y + g.h + 18;
      var fanY = busY + 30;
      var fundo = 0, filhos = [];
      ramosNo.forEach(function (r, i) {
        var fx = x0 + i * (FAN_W + FAN_GAP);
        var fg = colocar(r.no, fx, fanY, FAN_W);
        fg.ramo = r.rotulo; fg.tom = r.tom;
        var fcx = fx + FAN_W / 2;
        var d = "M " + n(cx) + " " + n(g.y + g.h) + " V " + n(busY - 8) +
          (Math.abs(fcx - cx) < 1 ? " V " + n(fanY - 6)
            : " Q " + n(cx) + " " + n(busY) + " " + n(cx + (fcx > cx ? 8 : -8)) + " " + n(busY) +
              " H " + n(fcx + (fcx > cx ? -8 : 8)) + " Q " + n(fcx) + " " + n(busY) + " " + n(fcx) + " " + n(busY + 8) + " V " + n(fanY - 6));
        seta(no.id, r.no.id, d, r.rotulo, r.tom, [fcx, fanY - 15]);
        fundo = Math.max(fundo, fg.y + fg.h);
        filhos.push(fg);
      });
      var bus2 = fundo + 18;
      var apos = est.nos[est.nos.indexOf(no) + 1];
      if (apos) {
        filhos.forEach(function (fg) {
          var fcx = fg.x + fg.w / 2;
          var d = "M " + n(fcx) + " " + n(fg.y + fg.h) + " V " + n(bus2 - 8) +
            (Math.abs(fcx - cx) < 1 ? " V " + n(bus2 + 30 - 6)
              : " Q " + n(fcx) + " " + n(bus2) + " " + n(fcx + (cx > fcx ? 8 : -8)) + " " + n(bus2) +
                " H " + n(cx + (cx > fcx ? -8 : 8)) + " Q " + n(cx) + " " + n(bus2) + " " + n(cx) + " " + n(bus2 + 8) + " V " + n(bus2 + 30 - 6));
          seta(fg.id, apos.id, d, "", "", [0, 0]);
        });
      }
      /* o próximo nó não recebe seta do "anterior": já recebeu dos filhos do leque */
      anterior = null;
      anteriorRotulo = "";
      y = bus2 + 30;
    });

    /* retornos em curva pela direita */
    est.nos.forEach(function (no) {
      if (!no.retorna_para || !geo[no.retorna_para] || !geo[no.id]) return;
      var de = geo[no.id], para = geo[no.retorna_para];
      var trilho = PAD_X + colW + 34;
      var y0 = de.y + de.h / 2, y1 = para.y + para.h / 2;
      var d = "M " + n(de.x + de.w) + " " + n(y0) + " H " + n(trilho - 10) + " Q " + n(trilho) + " " + n(y0) + " " + n(trilho) + " " + n(y0 - 10) +
        " V " + n(y1 + 10) + " Q " + n(trilho) + " " + n(y1) + " " + n(trilho - 10) + " " + n(y1) + " H " + n(para.x + para.w + 6);
      arestas.push({ de: no.id, para: no.retorna_para, d: d, retorno: true });
      if (no.retorno_rotulo) chips.push({ de: no.id, para: no.retorna_para, rotulo: no.retorno_rotulo, tom: "neutro", x: trilho, y: (y0 + y1) / 2, vertical: true });
    });

    var altura = 0;
    nos.forEach(function (g) { altura = Math.max(altura, g.y + g.h); });
    return { largura: largura, altura: altura + 18, nos: nos, arestas: arestas, chips: chips, geo: geo, cx: cx };
  }

  /* ---------- desenho ---------- */
  /* A paleta do app do hospital, a do Retrato. O Ana OS troca pela dele em window.FLUXO_PALETA (ADR-0030). */
  var P = {
    principal: "#2B2E7E",
    principalClara: "#3B6FB6",
    principalTinta: "#EEF0FB",
    principalFio: "#C7CBE8",
    branco: "#FFFFFF",
    verde: "#88D7A4",
    verdeFio: "#5FBE8A",
    verdeTexto: "#14532D",
    verdeTinta: "#E8F6EE",
    verdeTintaFio: "#A9DEC2",
    verdeTexto2: "#1F7A4D",
    mudo: "#94A3B8",
    texto2: "#64748B",
    texto: "#1E293B",
    borda: "#E2E8F0",
    borda2: "#CBD5E1",
    sombra: "#0F172A",
    superficie2: "#F1F5F9",
    texto3: "#475569",
    ambarTinta: "#FFF9EF",
    ambarFio: "#F2C078",
    ambarTexto: "#7A4E12",
    vermelhoTinta: "#FDEEEE",
    vermelhoFio: "#F3BFBF",
    vermelhoTexto: "#B4443E"
  };
  Object.keys(window.FLUXO_PALETA || {}).forEach(function (k) { P[k] = window.FLUXO_PALETA[k]; });
  var TONS = {
    sim: { fill: P.verdeTinta, stroke: P.verdeTintaFio, texto: P.verdeTexto2 },
    nao: { fill: P.vermelhoTinta, stroke: P.vermelhoFio, texto: P.vermelhoTexto },
    neutro: { fill: P.superficie2, stroke: P.borda2, texto: P.texto3 },
    hospital: { fill: P.principalTinta, stroke: P.principalFio, texto: P.principal },
    gh: { fill: P.ambarTinta, stroke: P.ambarFio, texto: P.ambarTexto },
    nativa: { fill: P.superficie2, stroke: P.borda2, texto: P.texto3 },
    ambar: { fill: P.ambarTinta, stroke: P.ambarFio, texto: P.ambarTexto }
  };

  function texto(g, cor, tam, x, alinhamento) {
    var lh = 17, y0 = g.y + g.h / 2 - ((g.linhas.length - 1) * lh + (g.sub.length ? g.sub.length * 15 + 4 : 0)) / 2 + 5;
    var out = g.linhas.map(function (l, i) {
      return '<text x="' + n(x) + '" y="' + n(y0 + i * lh) + '" text-anchor="' + alinhamento + '" font-size="' + tam + '" fill="' + cor + '" font-family="' + FONTE + '">' + esc(l) + "</text>";
    }).join("");
    var ys = y0 + g.linhas.length * lh - 2;
    out += g.sub.map(function (l, i) {
      return '<text x="' + n(x) + '" y="' + n(ys + i * 15) + '" text-anchor="' + alinhamento + '" font-size="11.5" fill="' + P.texto2 + '" font-family="' + FONTE + '">' + esc(l) + "</text>";
    }).join("");
    return out;
  }

  function badgeNumero(cx, cy, numero) {
    return '<circle class="fbadge" cx="' + n(cx) + '" cy="' + n(cy) + '" r="11" fill="' + P.principalTinta + '" stroke="' + P.principalFio + '" stroke-width="1.2"/>' +
      '<text x="' + n(cx) + '" y="' + n(cy + 4) + '" text-anchor="middle" font-size="12" fill="' + P.principal + '" font-family="' + FONTE + '">' + numero + "</text>";
  }
  function badgeDecisao(cx, cy) {
    return '<rect x="' + n(cx - 8) + '" y="' + n(cy - 8) + '" width="16" height="16" rx="3" transform="rotate(45 ' + n(cx) + " " + n(cy) + ')" fill="' + P.branco + '" stroke="' + P.ambarFio + '" stroke-width="1.5"/>' +
      '<text x="' + n(cx) + '" y="' + n(cy + 4.5) + '" text-anchor="middle" font-size="12" fill="' + P.ambarTexto + '" font-family="' + FONTE + '">?</text>';
  }
  function badgeTracejado(cx, cy) {
    return '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="11" fill="' + P.branco + '" stroke="' + P.borda2 + '" stroke-width="1.4" stroke-dasharray="3 2"/>' +
      '<text x="' + n(cx) + '" y="' + n(cy + 4) + '" text-anchor="middle" font-size="11" fill="' + P.texto2 + '" font-family="' + FONTE + '">…</text>';
  }

  function no(g) {
    var cy = g.y + g.h / 2, tx = g.x + 12 + 26 + 4;
    var corpo = "", miolo = "";
    var tipo = g.tipo, tom = g.tom && TONS[g.tom];
    if (tipo === "inicio") {
      corpo = '<rect x="' + n(g.x) + '" y="' + n(g.y) + '" width="' + n(g.w) + '" height="' + g.h + '" rx="17" fill="' + P.principal + '" filter="url(#fsombra' + UID + ')"/>' +
        '<path d="M ' + n(g.x + 18) + " " + n(g.y + 11) + ' l 10 6 l -10 6 z" fill="' + P.branco + '" opacity="0.9"/>';
      miolo = '<text x="' + n(g.x + g.w / 2 + 8) + '" y="' + n(cy + 5) + '" text-anchor="middle" font-size="14" fill="' + P.branco + '" font-family="' + FONTE + '">' + esc(g.linhas[0]) + "</text>";
    } else if (tipo === "fim") {
      corpo = '<rect x="' + n(g.x) + '" y="' + n(g.y) + '" width="' + n(g.w) + '" height="' + g.h + '" rx="17" fill="' + P.verde + '" stroke="' + P.verdeFio + '" stroke-width="1.5" filter="url(#fsombra' + UID + ')"/>' +
        '<path d="M ' + n(g.x + 16) + " " + n(cy) + ' l 4.5 4.5 l 8 -8.5" stroke="' + P.verdeTexto + '" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
      miolo = '<text x="' + n(g.x + g.w / 2 + 8) + '" y="' + n(cy + 5) + '" text-anchor="middle" font-size="14" fill="' + P.verdeTexto + '" font-family="' + FONTE + '">' + esc(g.linhas[0]) + "</text>";
    } else if (tipo === "fim-tracejado") {
      corpo = '<rect x="' + n(g.x) + '" y="' + n(g.y) + '" width="' + n(g.w) + '" height="' + g.h + '" rx="17" fill="' + P.branco + '" stroke="' + P.mudo + '" stroke-width="1.5" stroke-dasharray="5 4"/>';
      miolo = '<text x="' + n(g.x + g.w / 2) + '" y="' + n(cy + 5) + '" text-anchor="middle" font-size="14" fill="' + P.texto2 + '" font-family="' + FONTE + '">' + esc(g.linhas[0]) + "</text>";
    } else if (tipo === "decisao") {
      corpo = '<rect x="' + n(g.x) + '" y="' + n(g.y) + '" width="' + g.w + '" height="' + g.h + '" rx="8" fill="' + P.ambarTinta + '" stroke="' + P.ambarFio + '" stroke-width="1.5" filter="url(#fsombra' + UID + ')"/>';
      miolo = badgeDecisao(g.x + 12 + 13, cy) + texto(g, P.ambarTexto, 13, tx, "start");
    } else if (tipo === "tracejado") {
      corpo = '<rect x="' + n(g.x) + '" y="' + n(g.y) + '" width="' + g.w + '" height="' + g.h + '" rx="8" fill="' + P.branco + '" stroke="' + P.mudo + '" stroke-width="1.4" stroke-dasharray="5 4"/>';
      miolo = badgeTracejado(g.x + 12 + 13, cy) + texto(g, P.texto2, 13, tx, "start");
    } else if (tipo === "falha") {
      corpo = '<rect x="' + n(g.x) + '" y="' + n(g.y) + '" width="' + g.w + '" height="' + g.h + '" rx="8" fill="' + P.vermelhoTinta + '" stroke="' + P.vermelhoFio + '" stroke-width="1.5" filter="url(#fsombra' + UID + ')"/>';
      miolo = badgeNumero(g.x + 12 + 13, cy, g.numero) + texto(g, P.vermelhoTexto, 13, tx, "start");
    } else {
      var fill = tom ? tom.fill : P.branco, stroke = tom ? tom.stroke : P.borda, cor = tom ? tom.texto : P.texto;
      corpo = '<rect x="' + n(g.x) + '" y="' + n(g.y) + '" width="' + g.w + '" height="' + g.h + '" rx="8" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5" filter="url(#fsombra' + UID + ')"/>';
      miolo = (g.numero != null ? badgeNumero(g.x + 12 + 13, cy, g.numero) : "") + texto(g, cor, 13, g.numero != null ? tx : g.x + 12, "start");
    }
    var halo = '<rect class="fhalo" x="' + n(g.x - 3) + '" y="' + n(g.y - 3) + '" width="' + n(g.w + 6) + '" height="' + (g.h + 6) + '" rx="' + (tipo.indexOf("fim") === 0 || tipo === "inicio" ? 20 : 11) + '" fill="none" stroke="' + P.principalClara + '" stroke-width="2.5"/>';
    return '<g class="fno ' + esc(tipo) + (g.classe ? " " + esc(g.classe) : "") + '" data-id="' + esc(g.id) + '" tabindex="0" role="button" aria-label="' + esc(g.no.texto) + '">' + corpo + miolo + halo + "</g>";
  }

  function chip(c) {
    var t = TONS[c.tom] || TONS.neutro;
    var w = Math.max(44, larguraTexto(c.rotulo, 12) + 16), h = 22;
    var x = c.x - w / 2, y = c.y - h / 2;
    return '<g class="fchip-ramo" data-de="' + esc(c.de) + '" data-para="' + esc(c.para) + '"><rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + h + '" rx="11" fill="' + t.fill + '" stroke="' + t.stroke + '" stroke-width="1.2"/>' +
      '<text x="' + n(c.x) + '" y="' + n(c.y + 4.5) + '" text-anchor="middle" font-size="12" fill="' + t.texto + '" font-family="' + FONTE + '">' + esc(c.rotulo) + "</text></g>";
  }

  function defs() {
    return '<defs><marker id="fponta' + UID + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="' + P.mudo + '"/></marker>' +
      '<marker id="fponta-acesa' + UID + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="' + P.principal + '"/></marker>' +
      '<filter id="fsombra' + UID + '" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="1" stdDeviation="1.6" flood-color="' + P.sombra + '" flood-opacity="0.10"/></filter></defs>';
  }

  function svg(lay, opt) {
    var minW = Math.min(lay.largura, opt.minW || 560);
    return '<svg class="fluxo-svg" viewBox="0 0 ' + n(lay.largura) + " " + n(lay.altura) + '" width="' + n(lay.largura) + '" height="' + n(lay.altura) + '" style="min-width:' + n(minW) + 'px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(opt.rotulo || "Fluxograma") + '">' +
      defs() +
      lay.arestas.map(function (a) {
        return '<path class="faresta' + (a.retorno ? " retorno" : "") + '" data-de="' + esc(a.de) + '" data-para="' + esc(a.para) + '" d="' + a.d + '" fill="none" stroke="' + P.mudo + '" stroke-width="1.8" marker-end="url(#fponta' + UID + ')"/>';
      }).join("") +
      lay.nos.map(no).join("") +
      lay.chips.map(chip).join("") +
      "</svg>";
  }

  /* ---------- ponto correndo pela aresta ---------- */
  function correrPonto(svgEl, pathEl, ms, depois) {
    if (!pathEl || reduzido()) { setTimeout(depois, ms); return function () {}; }
    var ponto = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ponto.setAttribute("class", "fponto");
    ponto.setAttribute("r", "5");
    svgEl.appendChild(ponto);
    var len = 0;
    try { len = pathEl.getTotalLength(); } catch (e) { len = 0; }
    var t0 = null, vivo = true, raf = null;
    function quadro(ts) {
      if (!vivo) return;
      if (t0 === null) t0 = ts;
      var t = Math.min(1, (ts - t0) / ms);
      var e = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      var p = len ? pathEl.getPointAtLength(e * len) : { x: 0, y: 0 };
      ponto.setAttribute("cx", p.x); ponto.setAttribute("cy", p.y);
      if (t < 1) { raf = requestAnimationFrame(quadro); return; }
      vivo = false; ponto.remove(); depois();
    }
    raf = requestAnimationFrame(quadro);
    return function cancelar() { vivo = false; if (raf) cancelAnimationFrame(raf); ponto.remove(); };
  }

  /* ---------- motor de passos ---------- */
  function passeador(o) {
    var i = -1, rodando = false, timer = null, cancelar = null;
    var ms = o.intervalo || MS_PASSO;
    var api = null;
    function mudou() { if (api && api.aoMudar) api.aoMudar(); }
    function irPara(k) {
      var anterior = i; i = k;
      o.aoPasso(i, o.passos[i], anterior);
      mudou();
    }
    function tick() {
      if (!rodando) return;
      if (i + 1 >= o.passos.length) { rodando = false; if (o.aoFim) o.aoFim(); mudou(); return; }
      var prox = i + 1;
      if (i === -1) { irPara(prox); timer = setTimeout(tick, reduzido() ? 0 : ms); return; }
      cancelar = o.entre ? o.entre(i, prox, function () {
        cancelar = null;
        if (!rodando) return;
        irPara(prox);
        timer = setTimeout(tick, 0);
      }) : null;
      if (!o.entre) { irPara(prox); timer = setTimeout(tick, ms); }
    }
    function parar() {
      rodando = false;
      clearTimeout(timer);
      if (cancelar) { cancelar(); cancelar = null; }
      if (o.aoParar) o.aoParar(i);
      mudou();
    }
    api = {
      iniciar: function () {
        if (rodando) return;
        if (i >= o.passos.length - 1) { i = -1; if (o.aoLimpar) o.aoLimpar(); }
        rodando = true; tick();
      },
      parar: parar,
      recomecar: function () { parar(); i = -1; if (o.aoLimpar) o.aoLimpar(); rodando = true; tick(); },
      proximo: function () {
        parar();
        if (i + 1 >= o.passos.length) { i = -1; if (o.aoLimpar) o.aoLimpar(); }
        irPara(i + 1);
        if (i + 1 >= o.passos.length && o.aoFim) o.aoFim();
      },
      zerar: function () { parar(); i = -1; if (o.aoLimpar) o.aoLimpar(); },
      rodando: function () { return rodando; },
      indice: function () { return i; },
      total: function () { return o.passos.length; },
      aoMudar: null
    };
    return api;
  }

  /* botões de percorrer: percorrer / parar / recomeçar; sob reduced-motion: próximo / recomeçar */
  function controles(el, ctrl, rotulos) {
    var r = rotulos || {};
    var rm = reduzido();
    el.innerHTML =
      (rm ? '<button type="button" class="btn principal f-proximo">' + esc(r.proximo || "próximo") + "</button>"
          : '<button type="button" class="btn principal f-percorrer">' + esc(r.percorrer || "percorrer") + "</button>" +
            '<button type="button" class="btn f-parar" hidden>parar</button>') +
      '<button type="button" class="btn f-recomecar" hidden>recomeçar</button>' +
      '<span class="caption f-estado"></span>';
    var bPer = el.querySelector(".f-percorrer"), bPar = el.querySelector(".f-parar"), bRec = el.querySelector(".f-recomecar"), bProx = el.querySelector(".f-proximo");
    var estado = el.querySelector(".f-estado");
    function atualizar() {
      var i = ctrl.indice(), t = ctrl.total(), rod = ctrl.rodando();
      if (bPer) { bPer.hidden = rod; }
      if (bPar) { bPar.hidden = !rod; }
      bRec.hidden = i < 0;
      estado.textContent = i < 0 ? "" : (i + 1) + " de " + t + (rod ? "" : (i + 1 >= t ? ", fim" : ", parado"));
    }
    if (bPer) bPer.addEventListener("click", function () { ctrl.iniciar(); atualizar(); });
    if (bPar) bPar.addEventListener("click", function () { ctrl.parar(); atualizar(); });
    if (bProx) bProx.addEventListener("click", function () { ctrl.proximo(); atualizar(); });
    bRec.addEventListener("click", function () { if (rm) { ctrl.zerar(); ctrl.proximo(); } else ctrl.recomecar(); atualizar(); });
    ctrl.aoMudar = atualizar;
    atualizar();
    return { atualizar: atualizar };
  }

  /* ---------- montagem de um fluxograma com controlador ---------- */
  function montar(container, est, opt) {
    opt = opt || {};
    UID = "-" + (++INSTANCIAS);
    var uid = UID;
    var lay = calcular(est, opt);
    container.innerHTML = svg(lay, opt);
    var svgEl = container.querySelector("svg");
    var ordem = est.nos.map(function (x) { return x.id; });

    function noEl(id) { return svgEl.querySelector('.fno[data-id="' + id + '"]'); }
    function arestaEl(de, para) { return svgEl.querySelector('.faresta[data-de="' + de + '"][data-para="' + para + '"]'); }
    function limparClasses(cls) {
      svgEl.querySelectorAll("." + cls).forEach(function (e) { e.classList.remove(cls); });
    }

    var ctrl = {
      svg: svgEl, layout: lay,
      /* destaque persistente de um caminho (ids); vazio apaga */
      acender: function (ids) {
        limparClasses("aceso"); limparClasses("fora");
        if (!ids || !ids.length) return;
        var set = {};
        ids.forEach(function (id) { set[id] = 1; });
        svgEl.querySelectorAll(".fno").forEach(function (e) { e.classList.toggle("fora", !set[e.dataset.id]); e.classList.toggle("aceso", !!set[e.dataset.id]); });
        svgEl.querySelectorAll(".faresta, .fchip-ramo").forEach(function (e) {
          var ok = set[e.dataset.de] && set[e.dataset.para];
          e.classList.toggle("fora", !ok); e.classList.toggle("aceso", !!ok);
        });
      },
      marcar: function (id) {
        limparClasses("atual");
        var e = id && noEl(id);
        if (e) e.classList.add("atual");
      },
      feito: function (id) { var e = noEl(id); if (e) e.classList.add("feito"); },
      limpar: function () {
        limparClasses("atual"); limparClasses("feito");
        svgEl.querySelectorAll(".aresta-feita").forEach(function (e) { e.classList.remove("aresta-feita"); e.setAttribute("marker-end", "url(#fponta" + uid + ")"); });
      },
      esmaecer: function (ids) {
        limparClasses("esmaecido");
        (ids || []).forEach(function (id) { var e = noEl(id); if (e) e.classList.add("esmaecido"); });
      },
      correr: function (de, para, depois) {
        var p = arestaEl(de, para);
        if (p) { p.classList.add("aresta-feita"); p.setAttribute("marker-end", "url(#fponta-acesa" + uid + ")"); }
        return correrPonto(svgEl, p, MS_PASSO, depois);
      },
      ordem: ordem,
      noEl: noEl
    };

    if (opt.aoClicar) {
      svgEl.querySelectorAll(".fno").forEach(function (e) {
        e.addEventListener("click", function () { opt.aoClicar(e.dataset.id); });
        e.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); opt.aoClicar(e.dataset.id); } });
      });
    }
    return ctrl;
  }

  /* percorredor padrão sobre um fluxograma montado: acende nó a nó, ponto pela aresta */
  function percorredor(ctrl, caminho, aoPasso) {
    var p = passeador({
      passos: caminho,
      aoPasso: function (i, id, anterior) {
        if (anterior >= 0) ctrl.feito(caminho[anterior]);
        ctrl.marcar(id);
        var e = ctrl.noEl(id);
        if (e && e.scrollIntoView) { try { e.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" }); } catch (x) { /* sem rolagem */ } }
        if (aoPasso) aoPasso(id, i);
      },
      entre: function (i, j, depois) { return ctrl.correr(caminho[i], caminho[j], depois); },
      aoLimpar: function () { ctrl.limpar(); }
    });
    return p;
  }

  return { montar: montar, calcular: calcular, passeador: passeador, controles: controles, percorredor: percorredor,
           correrPonto: correrPonto, reduzido: reduzido, MS_PASSO: MS_PASSO };
})();
