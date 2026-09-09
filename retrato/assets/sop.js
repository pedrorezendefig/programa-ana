/* Retrato da Ana: o mapa das regras (SVG à mão), adaptado de os/sop.html.
   Layout vertical: a progressão (col) desce; os paralelos (linha) ficam lado a lado.
   Arestas ortogonais com cantos arredondados; salto de 2+ fileiras vira conector
   nomeado dentro do quadro. Sem leitura ao vivo: a família de cada ferramenta vem
   do próprio retrato.json.

   Contrato de links (ADR-0029): cada nó tem id no-<id>; o painel do nó liga para a
   seção das regras (regras/sec-...) e para as ferramentas (busca/tool-...); os
   filtros (raia, tipo, ferramenta, busca) esmaecem os nós que não passam.

   Uso: RetratoSop.montar(regras, ferramentas, versao) */

var RetratoSop = (function () {
  "use strict";

  var NO_L = 200, NO_A = 70, HGAP = 36, VGAP = 44;
  var PASSO_X = NO_L + HGAP;
  var PAD_X = 16, FAIXA_TOPO = 26, FAIXA_BASE = 26, FAIXA_GAP = 22;
  var ZONA_CAB = 64, ZONA_GAP = 40;
  var R_CANTO = 10;
  var DIM_LARG = 0;

  var DADOS = null, FERR = {}, VERSAO = "";
  var POR_ID = {}, GEO = {}, FAIXAS = {}, ROTAS = [], CHIPS = {}, LONGA = [];
  var ZONAS_GEO = {}, ZONA_DA_RAIA = {}, ABRE_ZONA = {};
  var FIXADO = null, RAIA_FOCO = null, FILTRO = null, SEC_ID = {};
  var ROTULO_FAMILIA = { hospital: "API do Hospital", gh: "Global Health", nativa: "nativa da plataforma", "sem-leitura": "origem não lida", desconhecida: "destino não mapeado" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function familia(nome) {
    var f = FERR[nome];
    return f ? f.familia : "sem-leitura";
  }

  function seloHtml(nome) {
    var f = FERR[nome];
    var fam = familia(nome);
    var h = '<span class="selo-origem ' + esc(fam) + '">' + esc(ROTULO_FAMILIA[fam] || fam) + "</span>";
    if (f && f.existe === false) h += '<span class="selo-origem nao-existe">ainda não existe</span>';
    else if (f && f.concedida === false) h += '<span class="selo-origem nao-chama">a Ana não chama hoje</span>';
    return h;
  }

  var medidor = document.createElement("canvas").getContext("2d");
  function pedacos(texto) {
    var res = [];
    String(texto).split(" ").forEach(function (p, wi) {
      var pre = wi > 0 ? " " : "";
      if (p.indexOf("_") > 0) {
        var partes = p.split("_");
        partes.forEach(function (q, i) {
          res.push({ pre: i === 0 ? pre : "", txt: q + (i < partes.length - 1 ? "_" : "") });
        });
      } else {
        res.push({ pre: pre, txt: p });
      }
    });
    return res;
  }

  function quebrar(texto, fonte, largura, maxLinhas) {
    medidor.font = fonte;
    var ps = pedacos(texto), linhas = [], atual = "";
    for (var i = 0; i < ps.length; i++) {
      var tentativa = atual ? atual + ps[i].pre + ps[i].txt : ps[i].txt;
      if (medidor.measureText(tentativa).width <= largura || !atual) { atual = tentativa; continue; }
      if (linhas.length === maxLinhas - 1) {
        for (var j = i; j < ps.length; j++) atual += ps[j].pre + ps[j].txt;
        while (medidor.measureText(atual + "…").width > largura && atual.length > 4) atual = atual.slice(0, -1);
        atual += "…";
        break;
      }
      linhas.push(atual);
      atual = ps[i].txt;
    }
    linhas.push(atual);
    return linhas;
  }

  /* ---------- conectores (chips de salto) ---------- */
  function calcularChips() {
    CHIPS = {};
    var ordem = {}, acc = 0;
    DADOS.raias.forEach(function (r) {
      var deles = DADOS.nos.filter(function (n) { return n.raia === r.id; });
      var minCol = Infinity, maxCol = 0;
      deles.forEach(function (n) {
        if (n.col < minCol) minCol = n.col;
        if (n.col > maxCol) maxCol = n.col;
      });
      deles.forEach(function (n) { ordem[n.id] = acc + n.col - minCol; });
      acc += maxCol - minCol + 1;
    });
    LONGA = DADOS.arestas.map(function (a) { return Math.abs(ordem[a.para] - ordem[a.de]) >= 2; });

    function add(id, chip) {
      (CHIPS[id] = CHIPS[id] || { lista: [] }).lista.push(chip);
    }
    DADOS.arestas.forEach(function (a, i) {
      if (!LONGA[i]) return;
      var desce = ordem[a.para] > ordem[a.de];
      add(a.de, { i: i, alvo: a.para, entrada: false, rot: (desce ? "→ " : "↩ ") + POR_ID[a.para].secao });
      add(a.para, { i: i, alvo: a.de, entrada: true, rot: "← " + POR_ID[a.de].secao });
    });

    medidor.font = "400 10px 'HP Simplified', sans-serif";
    Object.keys(CHIPS).forEach(function (id) {
      var c = CHIPS[id];
      c.lista.sort(function (x, y2) { return (x.entrada ? 0 : 1) - (y2.entrada ? 0 : 1); });
      var linhas = [[]], w = 0, maxW = NO_L - 22;
      c.lista.forEach(function (ch) {
        ch.w = Math.round(medidor.measureText(ch.rot).width) + 16;
        if (w + ch.w > maxW && linhas[linhas.length - 1].length) { linhas.push([]); w = 0; }
        linhas[linhas.length - 1].push(ch);
        w += ch.w + 5;
      });
      c.linhas = linhas;
    });
  }

  function alturaNo(id) {
    var c = CHIPS[id];
    return c ? 66 + c.linhas.length * 24 + 4 : NO_A;
  }

  /* ---------- layout ---------- */
  function calcular() {
    calcularChips();
    var maxLinha = 0;
    DADOS.nos.forEach(function (n) { if (n.linha > maxLinha) maxLinha = n.linha; });
    var largura = PAD_X * 2 + (maxLinha + 1) * PASSO_X - HGAP;

    ZONA_DA_RAIA = {}; ABRE_ZONA = {}; ZONAS_GEO = {};
    (DADOS.zonas || []).forEach(function (z) {
      z.raias.forEach(function (rid, i) {
        ZONA_DA_RAIA[rid] = z.id;
        if (i === 0) ABRE_ZONA[rid] = z.id;
      });
    });

    var y = 0;
    DADOS.raias.forEach(function (r) {
      if (ABRE_ZONA[r.id]) {
        var zid = ABRE_ZONA[r.id];
        if (y > 0) y += ZONA_GAP - FAIXA_GAP;
        ZONAS_GEO[zid] = { topo: y };
        y += ZONA_CAB + 12;
      }
      var deles = DADOS.nos.filter(function (n) { return n.raia === r.id; });
      var minCol = Infinity, maxCol = 0;
      deles.forEach(function (n) {
        if (n.col < minCol) minCol = n.col;
        if (n.col > maxCol) maxCol = n.col;
      });
      var fileiras = maxCol - minCol + 1;
      var altF = [];
      for (var k = 0; k < fileiras; k++) altF.push(NO_A);
      deles.forEach(function (n) {
        var h = alturaNo(n.id), k2 = n.col - minCol;
        if (h > altF[k2]) altF[k2] = h;
      });
      var somas = [], s = 0;
      altF.forEach(function (h) { somas.push(s); s += h + VGAP; });
      var altura = FAIXA_TOPO + s - VGAP + FAIXA_BASE;
      FAIXAS[r.id] = { topo: y, altura: altura, linhas: fileiras, qtd: deles.length };
      deles.forEach(function (n) {
        GEO[n.id] = { x: PAD_X + n.linha * PASSO_X, y: y + FAIXA_TOPO + somas[n.col - minCol], h: alturaNo(n.id) };
      });
      y += altura + FAIXA_GAP;
    });

    (DADOS.zonas || []).forEach(function (z) {
      var ult = FAIXAS[z.raias[z.raias.length - 1]];
      if (ZONAS_GEO[z.id] && ult) ZONAS_GEO[z.id].altura = ult.topo + ult.altura - ZONAS_GEO[z.id].topo;
    });

    tracarArestas();
    return { largura: largura, altura: y - FAIXA_GAP };
  }

  /* ---------- traçado das arestas curtas ---------- */
  function tracarArestas() {
    ROTAS = [];
    var setTop = {}, altoRow = {};
    DADOS.nos.forEach(function (n) {
      var g = GEO[n.id];
      setTop[g.y] = 1;
      if (!altoRow[g.y] || g.h > altoRow[g.y]) altoRow[g.y] = g.h;
    });
    var ROWS = Object.keys(setTop).map(Number).sort(function (a, b) { return a - b; });
    var IDXROW = {};
    ROWS.forEach(function (v, i) { IDXROW[v] = i; });
    function banda(i) {
      var t = ROWS[i] + altoRow[ROWS[i]];
      return { topo: t, base: i + 1 < ROWS.length ? ROWS[i + 1] : t + FAIXA_BASE - 6 };
    }

    var tipos = DADOS.arestas.map(function (a, i) {
      if (LONGA[i]) return "chip";
      var o = GEO[a.de], d = GEO[a.para];
      var drow = IDXROW[d.y] - IDXROW[o.y];
      if (drow === 1) return "gapD";
      if (drow === -1) return "gapU";
      if (Math.abs(d.x - o.x) > PASSO_X * 1.5) return "skip";
      return d.x > o.x ? "adjD" : "adjE";
    });

    var portas = {}, porLado = {};
    function porta(noId, lado, key, farX) {
      if (portas[key]) return;
      portas[key] = { no: noId, farX: farX };
      var pk = noId + ":" + lado;
      (porLado[pk] = porLado[pk] || []).push(key);
    }
    DADOS.arestas.forEach(function (a, i) {
      var o = GEO[a.de], d = GEO[a.para];
      if (tipos[i] === "gapD") {
        porta(a.de, "base", "e" + i + ":s", d.x + NO_L / 2);
        porta(a.para, "topo", "e" + i + ":d", o.x + NO_L / 2);
      } else if (tipos[i] === "gapU") {
        porta(a.de, "topo", "e" + i + ":s", d.x + NO_L / 2);
        porta(a.para, "base", "e" + i + ":d", o.x + NO_L / 2);
      } else if (tipos[i] === "skip") {
        porta(a.de, "base", "e" + i + ":s", d.x + NO_L / 2);
        porta(a.para, "base", "e" + i + ":d", o.x + NO_L / 2);
      }
    });
    Object.keys(porLado).forEach(function (pk) {
      var keys = porLado[pk].sort(function (ka, kb) { return portas[ka].farX - portas[kb].farX; });
      var g = GEO[portas[keys[0]].no];
      var passo = keys.length > 1 ? Math.min(24, (NO_L - 44) / (keys.length - 1)) : 0;
      keys.forEach(function (k, j) {
        portas[k].x = g.x + NO_L / 2 + (j - (keys.length - 1) / 2) * passo;
      });
    });

    var canais = {};
    function canal(key, bandaIdx, xs) {
      var c = canais[key] || (canais[key] = { banda: bandaIdx, x1: Infinity, x2: -Infinity });
      xs.forEach(function (x) {
        if (x < c.x1) c.x1 = x;
        if (x > c.x2) c.x2 = x;
      });
    }
    DADOS.arestas.forEach(function (a, i) {
      var o = GEO[a.de], d = GEO[a.para];
      if (tipos[i] === "gapD" || tipos[i] === "skip") {
        canal("e" + i, IDXROW[o.y], [portas["e" + i + ":s"].x, portas["e" + i + ":d"].x]);
      } else if (tipos[i] === "gapU") {
        canal("e" + i, IDXROW[d.y], [portas["e" + i + ":s"].x, portas["e" + i + ":d"].x]);
      }
    });
    var porBanda = {};
    Object.keys(canais).forEach(function (k) {
      (porBanda[canais[k].banda] = porBanda[canais[k].banda] || []).push(k);
    });
    Object.keys(porBanda).forEach(function (bi) {
      var keys = porBanda[bi].sort(function (ka, kb) { return canais[ka].x1 - canais[kb].x1; });
      var slots = [];
      keys.forEach(function (k) {
        var c = canais[k];
        for (var s = 0; s < slots.length; s++) {
          var livre = slots[s].every(function (o2) { return c.x1 > o2.x2 + 12 || o2.x1 > c.x2 + 12; });
          if (livre) { slots[s].push(c); c.slot = s; return; }
        }
        slots.push([c]);
        c.slot = slots.length - 1;
      });
      var b = banda(+bi), K = slots.length;
      var passo = K > 1 ? Math.min(11, (b.base - b.topo - 10) / (K - 1)) : 0;
      keys.forEach(function (k) {
        var c = canais[k];
        c.y = (b.topo + b.base) / 2 + (c.slot - (K - 1) / 2) * passo;
      });
    });

    var RECIP = {};
    DADOS.arestas.forEach(function (a) { RECIP[a.de + ">" + a.para] = true; });

    DADOS.arestas.forEach(function (a, i) {
      var o = GEO[a.de], d = GEO[a.para], sx, dx, cA, off;
      var oB = o.y + o.h, dT = d.y, dB = d.y + d.h;
      var rt = null;
      if (tipos[i] === "chip") { ROTAS[i] = null; return; }
      if (tipos[i] === "gapD") {
        sx = portas["e" + i + ":s"].x; dx = portas["e" + i + ":d"].x; cA = canais["e" + i].y;
        rt = { pts: [[sx, oB], [sx, cA], [dx, cA], [dx, dT - 7]], seta: { x: dx, y: dT - 7, ang: 90 }, rot: { x: (sx + dx) / 2, y: cA } };
      } else if (tipos[i] === "gapU") {
        sx = portas["e" + i + ":s"].x; dx = portas["e" + i + ":d"].x; cA = canais["e" + i].y;
        rt = { pts: [[sx, o.y], [sx, cA], [dx, cA], [dx, dB + 7]], seta: { x: dx, y: dB + 7, ang: -90 }, rot: { x: (sx + dx) / 2, y: cA } };
      } else if (tipos[i] === "skip") {
        sx = portas["e" + i + ":s"].x; dx = portas["e" + i + ":d"].x; cA = canais["e" + i].y;
        rt = { pts: [[sx, oB], [sx, cA], [dx, cA], [dx, dB + 7]], seta: { x: dx, y: dB + 7, ang: -90 }, rot: { x: (sx + dx) / 2, y: cA } };
      } else if (tipos[i] === "adjD") {
        off = RECIP[a.para + ">" + a.de] ? (a.de < a.para ? -7 : 7) : 0;
        rt = { pts: [[o.x + NO_L, o.y + NO_A / 2 + off], [d.x - 7, d.y + NO_A / 2 + off]], seta: { x: d.x - 7, y: d.y + NO_A / 2 + off, ang: 0 }, rot: { x: (o.x + NO_L + d.x) / 2, y: o.y + NO_A / 2 + off - 10 } };
      } else {
        off = RECIP[a.para + ">" + a.de] ? (a.de < a.para ? -7 : 7) : 0;
        rt = { pts: [[o.x, o.y + NO_A / 2 + off], [d.x + NO_L + 7, d.y + NO_A / 2 + off]], seta: { x: d.x + NO_L + 7, y: d.y + NO_A / 2 + off, ang: 180 }, rot: { x: (o.x + d.x + NO_L) / 2, y: o.y + NO_A / 2 + off - 10 } };
      }
      ROTAS[i] = rt;
    });
  }

  function caminhoOrto(pts, r) {
    var p = [];
    pts.forEach(function (q) {
      var u = p[p.length - 1];
      if (u && Math.abs(u[0] - q[0]) < 0.01 && Math.abs(u[1] - q[1]) < 0.01) return;
      p.push([q[0], q[1]]);
    });
    for (var i = p.length - 2; i > 0; i--) {
      if ((Math.abs(p[i - 1][0] - p[i][0]) < 0.01 && Math.abs(p[i][0] - p[i + 1][0]) < 0.01) ||
          (Math.abs(p[i - 1][1] - p[i][1]) < 0.01 && Math.abs(p[i][1] - p[i + 1][1]) < 0.01)) p.splice(i, 1);
    }
    function xy(q) { return (Math.round(q[0] * 10) / 10) + "," + (Math.round(q[1] * 10) / 10); }
    function rumo(de, para, dist) {
      var vx = para[0] - de[0], vy = para[1] - de[1];
      var n = Math.hypot(vx, vy) || 1;
      return [de[0] + vx / n * dist, de[1] + vy / n * dist];
    }
    var d = "M" + xy(p[0]);
    for (var j = 1; j < p.length - 1; j++) {
      var a = p[j - 1], b = p[j], c = p[j + 1];
      var rj = Math.min(r, Math.hypot(b[0] - a[0], b[1] - a[1]) / 2, Math.hypot(c[0] - b[0], c[1] - b[1]) / 2);
      d += " L" + xy(rumo(b, a, rj)) + " Q" + xy(b) + " " + xy(rumo(b, c, rj));
    }
    return d + " L" + xy(p[p.length - 1]);
  }

  /* ---------- desenho ---------- */
  function desenhar() {
    var dim = calcular();
    DIM_LARG = dim.largura;
    var svg = document.getElementById("svg");
    svg.setAttribute("width", dim.largura);
    svg.setAttribute("height", dim.altura);
    svg.setAttribute("viewBox", "0 0 " + dim.largura + " " + dim.altura);

    var partes = [];
    (DADOS.zonas || []).forEach(function (z) {
      var zg = ZONAS_GEO[z.id];
      if (!zg) return;
      partes.push('<rect class="zona-trilho" x="0" y="' + zg.topo + '" width="4" height="' + zg.altura + '" rx="2"/>');
      partes.push('<g class="zona-cab" data-zona="' + esc(z.id) + '" tabindex="0" role="button" aria-label="Bloco ' + esc(z.rotulo) + '">' +
        '<title>' + esc(z.rotulo) + '</title>' +
        '<rect x="12" y="' + zg.topo + '" width="' + (dim.largura - 12) + '" height="' + ZONA_CAB + '" rx="14"/>' +
        '<text class="z-rot" x="30" y="' + (zg.topo + 26) + '">' + esc(z.rotulo) + '</text>' +
        '<text class="z-sub" x="30" y="' + (zg.topo + 44) + '">' + esc(z.raias.length + (z.raias.length === 1 ? " raia" : " raias")) + '</text>' +
        '<text class="z-front" x="' + (dim.largura - 20) + '" y="' + (zg.topo + 26) + '" text-anchor="end">clique: o que este bloco faz</text>' +
        '</g>');
    });

    DADOS.raias.forEach(function (r) {
      var f = FAIXAS[r.id];
      partes.push('<rect class="faixa" data-raia="' + esc(r.id) + '" x="12" y="' + f.topo + '" width="' + (dim.largura - 12) + '" height="' + f.altura + '" rx="20"/>');
    });

    partes.push('<g id="camada-arestas">' + DADOS.arestas.map(aresta).join("") + "</g>");
    partes.push('<g id="camada-nos">' + DADOS.nos.map(no).join("") + "</g>");

    svg.innerHTML = partes.join("");
    montarGutter();
    ligarEventos();
    if (FILTRO) filtrar(FILTRO);
  }

  function aresta(a, i) {
    var rt = ROTAS[i];
    if (!rt) return "";
    var seta = '<path class="seta" data-i="' + i + '" d="M0,0 l-8,-4.5 v9 z" transform="translate(' + rt.seta.x + "," + rt.seta.y + ") rotate(" + rt.seta.ang + ')"/>';
    var rot = "";
    if (a.rotulo && rt.rot) {
      var larg = a.rotulo.length * 5.4 + 12;
      var mx = Math.min(Math.max(rt.rot.x, larg / 2 + 6), DIM_LARG - larg / 2 - 6);
      rot = '<rect class="rot-aresta-fundo" data-i="' + i + '" x="' + (mx - larg / 2) + '" y="' + (rt.rot.y - 9) + '" width="' + larg + '" height="15" rx="7"/>' +
        '<text class="rot-aresta" data-i="' + i + '" x="' + mx + '" y="' + (rt.rot.y + 2) + '" text-anchor="middle">' + esc(a.rotulo) + "</text>";
    }
    return '<path class="aresta" data-i="' + i + '" d="' + caminhoOrto(rt.pts, R_CANTO) + '"/>' + seta + rot;
  }

  function no(n) {
    var g = GEO[n.id];
    var fonte = n.tipo === "ferramenta" ? "400 11px ui-monospace, SFMono-Regular, Menlo, monospace" : "400 12px 'HP Simplified', sans-serif";
    var linhas = quebrar(n.titulo, fonte, NO_L - 26, 3);
    var y0 = NO_A / 2 - (linhas.length - 1) * 7 + 7;
    var barra = (n.tipo === "mensagem" || n.tipo === "fim")
      ? '<rect class="barra" x="0" y="14" width="3" height="' + (g.h - 28) + '" rx="1.5"/>' : "";

    var pontos = "";
    if (n.tipo === "ferramenta" && n.ferramentas && n.ferramentas.length) {
      var vistas = [], px = NO_L - 14;
      n.ferramentas.forEach(function (t) {
        var fam = familia(t);
        if (vistas.indexOf(fam) !== -1) return;
        vistas.push(fam);
        pontos += '<circle class="ponto-origem ' + esc(fam) + '" cx="' + px + '" cy="14" r="4.5"><title>' + esc(ROTULO_FAMILIA[fam] || fam) + "</title></circle>";
        px -= 13;
      });
    }

    var chips = "";
    var c = CHIPS[n.id];
    if (c) c.linhas.forEach(function (linha, li) {
      var cx = 12, cy = 64 + li * 24;
      linha.forEach(function (ch) {
        var alvo = POR_ID[ch.alvo];
        chips += '<g class="chip-lig" data-i="' + ch.i + '" data-alvo="' + esc(ch.alvo) + '" tabindex="0" role="link">' +
          "<title>" + esc((ch.entrada ? "vem de: " : "vai para: ") + alvo.secao + " " + alvo.titulo) + "</title>" +
          '<rect x="' + cx + '" y="' + cy + '" width="' + ch.w + '" height="18" rx="9"/>' +
          '<text x="' + (cx + ch.w / 2) + '" y="' + (cy + 12.5) + '" text-anchor="middle">' + esc(ch.rot) + "</text></g>";
        cx += ch.w + 5;
      });
    });

    return '<g class="no ' + esc(n.tipo) + '" id="no-' + esc(n.id) + '" data-id="' + esc(n.id) + '" data-raia="' + esc(n.raia) + '" data-tipo="' + esc(n.tipo) + '" data-tools="' + esc((n.ferramentas || []).join(" ")) + '" tabindex="0" role="button" aria-label="' + esc(n.secao + ": " + n.titulo) + '" transform="translate(' + g.x + "," + g.y + ')">' +
      '<rect class="corpo" x="0" y="0" width="' + NO_L + '" height="' + g.h + '" rx="14"/>' + barra +
      '<text class="rot" x="13" y="17">' + esc(n.secao) + "</text>" +
      linhas.map(function (t, i) { return '<text class="tit" x="13" y="' + (y0 + i * 14) + '">' + esc(t) + "</text>"; }).join("") +
      chips + pontos +
      '<rect class="halo" x="-2" y="-2" width="' + (NO_L + 4) + '" height="' + (g.h + 4) + '" rx="16"/>' +
      "</g>";
  }

  function montarGutter() {
    var g = document.getElementById("gutter");
    var zonaPorId = {};
    (DADOS.zonas || []).forEach(function (z) { zonaPorId[z.id] = z; });
    var partes = [], primeira = true;
    DADOS.raias.forEach(function (r) {
      if (ABRE_ZONA[r.id]) {
        var z = zonaPorId[ABRE_ZONA[r.id]];
        partes.push('<div class="zona-g" style="height:' + (ZONA_CAB + 12) + "px" + (primeira ? "" : ";margin-top:" + (ZONA_GAP - FAIXA_GAP) + "px") +
          '"><span class="z-nome">' + esc(z.rotulo) + "</span></div>");
        primeira = false;
      }
      var f = FAIXAS[r.id];
      partes.push('<div class="raia-rot" data-raia="' + esc(r.id) + '" style="height:' + f.altura + "px;margin-bottom:" + FAIXA_GAP + 'px" tabindex="0" role="button"><div class="fixo">' +
        '<span class="conta">' + f.qtd + " passos</span>" +
        '<span class="nome">' + esc(r.rotulo) + "</span>" +
        '<span class="nota">' + esc(r.nota) + "</span></div></div>");
    });
    g.innerHTML = partes.join("");
  }

  /* ---------- interação ---------- */
  function ligarEventos() {
    document.querySelectorAll("#svg .no").forEach(function (el) {
      var id = el.dataset.id;
      el.addEventListener("mouseenter", function () { if (!FIXADO) mostrar(id, false); });
      el.addEventListener("focus", function () { if (!FIXADO) mostrar(id, false); });
      el.addEventListener("mouseleave", function () { if (!FIXADO) limpar(); });
      el.addEventListener("click", function () { fixar(id); });
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fixar(id); } });
    });
    document.querySelectorAll("#gutter .raia-rot").forEach(function (el) {
      el.addEventListener("click", function () { focarRaia(el.dataset.raia); });
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); focarRaia(el.dataset.raia); } });
    });
    document.querySelectorAll("#svg .zona-cab").forEach(function (el) {
      el.addEventListener("click", function () { mostrarZona(el.dataset.zona); });
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); mostrarZona(el.dataset.zona); } });
    });
    document.querySelectorAll("#svg .chip-lig").forEach(function (el) {
      el.addEventListener("click", function (e) { e.stopPropagation(); irAte(el.dataset.alvo); });
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); irAte(el.dataset.alvo); } });
    });
  }

  function irAte(id) {
    if (FIXADO !== id) fixar(id);
    var el = document.querySelector('#svg .no[data-id="' + id + '"]');
    if (!el) return;
    var r = el.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + r.top + r.height / 2 - window.innerHeight / 2);
  }

  function acender(id) {
    document.querySelectorAll("#svg .aresta, #svg .seta, #svg .rot-aresta, #svg .rot-aresta-fundo, #svg .chip-lig").forEach(function (el) { el.classList.remove("acesa"); });
    document.querySelectorAll("#svg .no.ativo").forEach(function (el) { el.classList.remove("ativo"); });
    if (!id) return;
    var alvo = document.querySelector('#svg .no[data-id="' + id + '"]');
    if (alvo) alvo.classList.add("ativo");
    DADOS.arestas.forEach(function (a, i) {
      if (a.de !== id && a.para !== id) return;
      document.querySelectorAll('#svg [data-i="' + i + '"]').forEach(function (el) { el.classList.add("acesa"); });
    });
  }

  function mostrar(id, fixando) {
    var n = POR_ID[id];
    if (!n) return;
    acender(id);

    var entram = DADOS.arestas.filter(function (a) { return a.para === id; });
    var saem = DADOS.arestas.filter(function (a) { return a.de === id; });
    function lista(titulo, arr, campo) {
      if (!arr.length) return "";
      return '<div class="bloco"><span class="micro">' + titulo + '</span><div class="lista-lig">' +
        arr.map(function (a) {
          var alvo = POR_ID[a[campo]];
          return '<div><a class="lig-no" data-ir="regras/no-' + esc(alvo.id) + '" href="#regras/no-' + esc(alvo.id) + '">' +
            "<strong>" + esc(alvo.secao) + "</strong> " + esc(alvo.titulo) + "</a>" +
            (a.rotulo ? ' <span class="caption">(' + esc(a.rotulo) + ")</span>" : "") + "</div>";
        }).join("") + "</div></div>";
    }

    var tools = n.ferramentas.length
      ? '<div class="bloco"><span class="micro">Ferramentas que este passo chama</span>' +
        n.ferramentas.map(function (t) {
          var nome = FERR[t]
            ? '<a class="nome-tool tool-link" data-ir="busca/tool-' + esc(t) + '" href="#busca/tool-' + esc(t) + '">' + esc(t) + "</a>"
            : '<code class="nome-tool">' + esc(t) + "</code>";
          return '<div class="linha-tool">' + nome + seloHtml(t) + "</div>";
        }).join("") + "</div>"
      : "";
    var sid = SEC_ID[n.secao];
    var secao = sid
      ? '<div class="bloco"><span class="micro">Seção das regras</span><div class="lista-lig"><div><a class="lig-sec" data-ir="regras/sec-' + esc(sid.id) + '" href="#regras/sec-' + esc(sid.id) + '">' + esc(sid.rotulo) + "</a></div></div></div>"
      : "";

    var trechos = n.trechos.map(function (t, i) {
      return '<div class="bloco"><span class="micro">Trecho literal das regras, versão ' + esc(VERSAO) + (t.linhas ? ", linhas " + esc(t.linhas) : "") + "</span>" +
        '<pre class="trecho" id="trecho-' + i + '">' + MdProsa.trecho(t.texto, {}) + "</pre></div>";
    }).join("");

    var raia = DADOS.raias.filter(function (r) { return r.id === n.raia; })[0];

    document.getElementById("painel-corpo").innerHTML =
      '<div class="linha"><span class="chip contorno">' + esc(n.secao) + "</span>" +
      '<span class="chip neutro">' + esc(rotuloTipo(n.tipo)) + "</span>" +
      '<span class="caption">' + esc(raia ? raia.rotulo : n.raia) + "</span></div>" +
      '<div class="titulo-no">' + esc(n.titulo) + "</div>" +
      '<div class="card-interno" style="font-size:14px;">' + MdProsa.inline(n.resumo, {}) + "</div>" +
      secao + tools + trechos +
      lista("Chega de", entram, "de") + lista("Segue para", saem, "para") +
      (fixando ? '<p class="fixado">Passo fixado. Esc ou o X fecham e liberam o mouse.</p>' : "");

    var painel = document.getElementById("painel");
    painel.classList.toggle("interativa", !!fixando);
    painel.classList.add("aberto");
  }

  function rotuloTipo(t) {
    var achado = DADOS.tipos.filter(function (x) { return x.id === t; })[0];
    return achado ? achado.rotulo : t;
  }

  function mostrarZona(zid) {
    var z = (DADOS.zonas || []).filter(function (x) { return x.id === zid; })[0];
    if (!z) return;
    FIXADO = "zona:" + zid;
    acender(null);
    var raias = z.raias.map(function (rid) {
      var r = DADOS.raias.filter(function (x) { return x.id === rid; })[0];
      return '<span class="chip contorno">' + esc(r ? r.rotulo : rid) + "</span>";
    }).join("");
    document.getElementById("painel-corpo").innerHTML =
      '<div class="linha"><span class="chip neutro">Bloco de regras</span></div>' +
      '<div class="titulo-no">' + esc(z.rotulo) + "</div>" +
      '<div class="card-interno" style="font-size:14px;">' + esc(z.nota || "") + "</div>" +
      '<div class="bloco"><span class="micro">Raias deste bloco</span><div class="linha" style="margin-top:7px;">' + raias + "</div></div>" +
      '<p class="fixado">Ficha fixada. Esc ou o X fecham.</p>';
    var painel = document.getElementById("painel");
    painel.classList.add("interativa");
    painel.classList.add("aberto");
  }

  function fixar(id) {
    if (!POR_ID[id]) return;
    if (FIXADO === id) { limparFixo(); return; }
    FIXADO = id;
    mostrar(id, true);
  }

  function limpar() {
    acender(null);
    var painel = document.getElementById("painel");
    painel.classList.remove("aberto");
    painel.classList.remove("interativa");
  }

  function limparFixo() {
    FIXADO = null;
    limpar();
  }

  function focarRaia(id) {
    if (window.Filtros) { Filtros.alternar("regras", "raia", id); return; }
    filtrar({ raia: RAIA_FOCO === id ? "" : id });
  }

  function normal(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  /* filtro da esfera: raia, tipo, ferramenta e busca livre; devolve {n, m} */
  function filtrar(f) {
    FILTRO = f || {};
    RAIA_FOCO = FILTRO.raia || null;
    var q = normal(FILTRO.q).trim();
    var passa = {}, n = 0;
    DADOS.nos.forEach(function (no) {
      var ok = (!FILTRO.raia || no.raia === FILTRO.raia) &&
        (!FILTRO.tipo || no.tipo === FILTRO.tipo) &&
        (!FILTRO.ferramenta || (no.ferramentas || []).indexOf(FILTRO.ferramenta) !== -1);
      if (ok && q) ok = normal(no.secao + " " + no.titulo + " " + no.resumo + " " + (no.ferramentas || []).join(" ")).indexOf(q) !== -1;
      passa[no.id] = ok;
      if (ok) n++;
    });
    var algum = n < DADOS.nos.length;
    document.querySelectorAll("#svg .no").forEach(function (el) {
      el.classList.toggle("apagado", !passa[el.dataset.id]);
    });
    DADOS.arestas.forEach(function (a, i) {
      var apagada = algum && !(passa[a.de] && passa[a.para]);
      document.querySelectorAll('#svg [data-i="' + i + '"]').forEach(function (el) { el.classList.toggle("apagada", apagada); });
    });
    document.querySelectorAll("#gutter .raia-rot").forEach(function (el) {
      el.classList.toggle("focada", RAIA_FOCO === el.dataset.raia);
      el.classList.toggle("apagada", !!RAIA_FOCO && RAIA_FOCO !== el.dataset.raia);
    });
    document.querySelectorAll("#svg .faixa").forEach(function (el) {
      el.classList.toggle("apagada", !!RAIA_FOCO && RAIA_FOCO !== el.dataset.raia);
    });
    return { n: n, m: DADOS.nos.length };
  }

  async function montar(regras, ferramentas, versao) {
    DADOS = regras; FERR = ferramentas || {}; VERSAO = versao || regras.versao || "";
    POR_ID = {}; SEC_ID = {};
    DADOS.nos.forEach(function (n) { POR_ID[n.id] = n; });
    (DADOS.secoes || []).forEach(function (s) { SEC_ID[s.chave] = s; });
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* segue com a fallback */ } }
    desenhar();

    /* chegada por link (Liga.ir): fixa o nó e deixa a rolagem padrão levar até ele */
    document.addEventListener("liga:chegou", function (e) {
      var el = e.detail && e.detail.el;
      if (!el || !el.classList || !el.classList.contains("no")) return;
      FIXADO = null;
      fixar(el.dataset.id);
    });
    document.getElementById("btn-fechar").onclick = limparFixo;
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") limparFixo(); });
    window.addEventListener("resize", function () {
      requestAnimationFrame(function () { desenhar(); if (FIXADO && POR_ID[FIXADO]) mostrar(FIXADO, true); });
    });
  }

  return { montar: montar, seloHtml: seloHtml, filtrar: function (f) { return DADOS ? filtrar(f) : { n: 0, m: 0 }; },
           redesenhar: function () { if (DADOS) desenhar(); } };
})();
