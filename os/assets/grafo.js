/* Ana OS: o grafo de execução do roadmap (ADR-0008, faixas por tema OS16),
   agora uma seção do Cockpit (ADR-0028). O index.html chama
     Grafo.montar(roadmap)   com o objeto que GET /api/roadmap já devolveu
     Grafo.abrir(id)         para abrir a ficha de um nó (painel lateral)
   A página precisa ter: #grafo-placar, #grafo-filtros, #grafo (com o svg #arestas dentro),
   o aside #grafo-painel com #grafo-painel-corpo e #grafo-btn-fechar (ids com prefixo
   desde o ADR-0030, porque o Cockpit divide a página com os motores do Retrato).
   Só leitura: nada grava. */

(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  const CADEADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>';

  let NOS = [];        /* [{id, titulo, tipo, estado, dono, nota, resumo, ficha, prompt, deps, travas, tema, mesa, canal}] */
  let FRONTEIRA = null;

  /* ---- temas (OS16): as áreas do programa, na ordem em que importam hoje.
     O tema de cada item vive no os/dados/roadmap.json (campo "tema"). ---- */
  const TEMAS = [
    ["agenda",    "Agenda Global Health",       "A integração com o MV pela API da Global Health: identificação, disponibilidade e marcação."],
    ["canal",     "Canal principal (WhatsApp)", "A estreia da Ana no número real do hospital: Chatwoot, transbordo e a estreia assistida."],
    ["base",      "Base Ana no Hospital",       "A fonte dos dados que a Ana consulta, hoje no app do hospital (ADR-0015, fechado na V26)."],
    ["ouvidoria", "Ouvidoria",                  "O canal de manifestações e o protocolo ANO-NNNN que a Ana informa ao paciente."],
    ["cerebro",   "Cérebro da Ana",             "Qual motor responde e como ele pensa: modelo, prompt e os roteiros que provam o comportamento."],
    ["os",        "Ana OS (cockpit)",           "O painel do programa: roadmap, mapas, circuito e a documentação viva."]
  ];
  const OUTRO_TEMA = ["outro", "Sem tema", "Itens ainda não classificados por área."];
  function infoTema(chave) {
    for (const t of TEMAS) if (t[0] === chave) return t;
    return OUTRO_TEMA;
  }

  /* ---- filtros (OS9): categoria exibida e donos ---- */
  const FILTRO = {
    cat: new Set(["feito", "fazer", "bloqueada", "pendente", "proposta"]),
    dono: new Set(["P", "C", "E"])
  };
  function categoriaDe(n) {
    if (n.tipo === "pendente") return "pendente";
    if (n.tipo === "proposta") return "proposta";
    return n.estado; /* feito | bloqueada | fazer */
  }
  function donosDe(n) { return n.dono ? n.dono.split(/[^PCE]+/).filter(Boolean) : []; }
  function visivel(n) {
    if (!FILTRO.cat.has(categoriaDe(n))) return false;
    const ds = donosDe(n); /* nó sem dono (proposta/pendente) não é afetado pelo filtro de dono */
    if (ds.length && !ds.some(d => FILTRO.dono.has(d))) return false;
    return true;
  }

  const ROT_CAT = [["feito", "feito"], ["fazer", "a fazer"], ["bloqueada", "bloqueada"], ["pendente", "pendente"], ["proposta", "proposta"]];
  const ROT_DONO = [["P", "Pedro"], ["C", "Claude"], ["E", "Externo"]];

  function renderFiltros() {
    const alvo = document.getElementById("grafo-filtros");
    const contaCat = {}, contaDono = { P: 0, C: 0, E: 0 };
    NOS.forEach(function (n) {
      const c = categoriaDe(n);
      contaCat[c] = (contaCat[c] || 0) + 1;
      donosDe(n).forEach(function (d) { if (contaDono[d] != null) contaDono[d]++; });
    });
    alvo.innerHTML =
      '<div class="grupo"><span class="rot-grupo">Status</span>' +
      ROT_CAT.map(function (par) {
        const lig = FILTRO.cat.has(par[0]);
        return '<button class="chip ' + par[0] + ' chip-filtro' + (lig ? "" : " desligado") +
          '" data-grupo="cat" data-chave="' + par[0] + '" aria-pressed="' + lig + '">' +
          par[1] + '<span class="n">' + (contaCat[par[0]] || 0) + "</span></button>";
      }).join("") + "</div>" +
      '<div class="grupo"><span class="rot-grupo">Dono</span>' +
      ROT_DONO.map(function (par) {
        const lig = FILTRO.dono.has(par[0]);
        return '<button class="chip contorno chip-filtro' + (lig ? "" : " desligado") +
          '" data-grupo="dono" data-chave="' + par[0] + '" aria-pressed="' + lig + '">' +
          par[1] + '<span class="n">' + contaDono[par[0]] + "</span></button>";
      }).join("") + "</div>";
    alvo.querySelectorAll(".chip-filtro").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const conjunto = btn.dataset.grupo === "cat" ? FILTRO.cat : FILTRO.dono;
        if (conjunto.has(btn.dataset.chave)) conjunto.delete(btn.dataset.chave);
        else conjunto.add(btn.dataset.chave);
        btn.classList.toggle("desligado");
        btn.setAttribute("aria-pressed", conjunto.has(btn.dataset.chave));
        aplicarFiltros();
      });
    });
  }

  /* ---- placar: quantas faltam, por tema (OS16) ---- */
  function abertosDe(chave) {
    return NOS.filter(n => n.tema === chave && n.estado !== "feito").length;
  }
  function renderPlacar() {
    const total = NOS.filter(n => n.estado !== "feito").length;
    const pecas = ['<button class="peca destaque" data-ir="grafo"><span class="n">' + total +
      '</span><span class="rot">abertas no total</span></button>'];
    TEMAS.forEach(function (t) {
      const n = abertosDe(t[0]);
      if (!n) return;
      pecas.push('<button class="peca" data-ir="faixa-' + t[0] + '"><span class="n">' + n +
        '</span><span class="rot">' + esc(t[1]) + "</span></button>");
    });
    const feitas = NOS.filter(n => n.estado === "feito").length;
    pecas.push('<button class="peca" data-ir="grafo"><span class="n">' + feitas +
      '</span><span class="rot">já concluídas</span></button>');
    const alvo = document.getElementById("grafo-placar");
    alvo.innerHTML = pecas.join("");
    alvo.querySelectorAll(".peca").forEach(function (b) {
      b.addEventListener("click", function () {
        const el = document.getElementById(b.dataset.ir);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  function aplicarFiltros() {
    esconderTip();
    NOS.forEach(function (n) {
      const el = document.getElementById("no-" + n.id);
      if (el) el.classList.toggle("oculto", !visivel(n));
    });
    document.querySelectorAll("#grafo .coluna").forEach(function (col) {
      const temVivo = col.querySelector(".no:not(.oculto)");
      col.style.display = temVivo ? "" : "none";
    });
    /* faixa sem nenhum nó visível sai inteira, com o cabeçalho junto (OS16) */
    document.querySelectorAll("#grafo .faixa").forEach(function (fx) {
      const temVivo = fx.querySelector(".no:not(.oculto)");
      fx.style.display = temVivo ? "" : "none";
    });
    requestAnimationFrame(desenharArestas);
  }

  /* ---- tooltip de ficha no hover (OS9) ---- */
  const TIP = document.createElement("div");
  TIP.className = "tooltip-ficha tooltip-grafo";
  document.body.appendChild(TIP);

  const ROT_CANAL = { dispare: "Dispare você", comigo: "Sente comigo", aguardando: "Aguardando terceiros" };

  function corta(txt, max) {
    const s = String(txt || "");
    return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
  }

  function mostrarTip(n, el) {
    let html = "";
    if (n.estado === "feito" && n.ficha) {
      /* nó concluído: a ficha do que entregou */
      html = '<div class="tt-rot">O que fez</div><div class="tt-txt">' + esc(n.ficha.fez) + "</div>" +
        '<div class="tt-rot">O que mudou</div><div class="tt-txt">' + esc(n.ficha.mudou) + "</div>" +
        '<div class="tt-rot">O valor</div><div class="tt-txt">' + esc(n.ficha.valor) + "</div>";
    } else if (n.estado !== "feito") {
      /* nó aberto: o que é, o que destrava, qual o gesto e o prompt para executar (OS16) */
      html = '<div class="tt-rot">' + esc(n.id) + " · o que é</div><div class=\"tt-txt\">" +
        esc(corta(n.resumo || n.nota || n.titulo, 210)) + "</div>";
      if (n.mesa && n.mesa.destrava) {
        html += '<div class="tt-rot">O que destrava</div><div class="tt-txt">' + esc(corta(n.mesa.destrava, 165)) + "</div>";
      }
      if (n.mesa && n.mesa.gesto) {
        html += '<div class="tt-rot">Seu gesto' + (n.canal && ROT_CANAL[n.canal] ? " · " + ROT_CANAL[n.canal] : "") +
          '</div><div class="tt-txt">' + esc(corta(n.mesa.gesto, 165)) + "</div>";
      }
      if (n.travas && n.travas.length) {
        html += '<div class="tt-rot">Espera</div><div class="tt-txt">' + esc(n.travas.join(", ")) + "</div>";
      }
      if (n.prompt) {
        html += '<div class="tt-rot">Prompt para executar</div><div class="tt-txt tt-prompt">' +
          esc(corta(n.prompt, 165)) + "</div>" +
          '<div class="tt-acao">Clique no cartão para ler o prompt inteiro e copiar</div>';
      }
    } else if (n.resumo || n.nota) {
      html = '<div class="tt-rot">Resumo</div><div class="tt-txt">' + esc(n.resumo || n.nota) + "</div>";
    } else return;
    TIP.innerHTML = html;
    TIP.classList.add("visivel");
    const r = el.getBoundingClientRect();
    let x = r.right + 12;
    if (x + 364 > window.innerWidth) x = Math.max(8, r.left - 364);
    /* mede a altura já renderizada: com o prompt o tooltip fica alto e precisa subir */
    const alt = TIP.getBoundingClientRect().height;
    const y = Math.max(12, Math.min(r.top, window.innerHeight - alt - 12));
    TIP.style.left = x + "px";
    TIP.style.top = y + "px";
  }
  function esconderTip() { TIP.classList.remove("visivel"); }
  document.addEventListener("scroll", esconderTip, true);

  /* ---- entrada: o objeto do roadmap já carregado pela página ---- */
  function montar(d) {
    const feitas = new Set(d.tarefas.filter(t => t.status === "feito").map(t => t.id));
    function montarNo(no, tipo) {
      const deps = no.deps || [];
      const travas = deps.filter(dep => !feitas.has(dep));
      const estado = (tipo === "tarefa" && no.status === "feito") ? "feito" : (travas.length ? "bloqueada" : "fazer");
      return { id: no.id, titulo: no.titulo, tipo: tipo, estado: estado, dono: no.dono || null,
               nota: no.nota || null, resumo: no.resumo || null, ficha: no.ficha || null,
               prompt: no.prompt || null, deps: deps, travas: travas,
               tema: no.tema || "outro", mesa: no.mesa || null, canal: no.canal || null };
    }
    NOS = [].concat(
      (d.tarefas || []).map(t => montarNo(t, "tarefa")),
      (d.pendentes || []).map(p => montarNo(p, "pendente")),
      (d.propostas || []).map(p => montarNo(p, "proposta"))
    );
    FRONTEIRA = NOS.find(n => n.tipo === "tarefa" && n.estado === "fazer") || null;
    renderFiltros();
    renderPlacar();
    desenhar();
    aplicarFiltros();
  }

  /* ---- layout (OS16): uma faixa por tema; dentro dela, colunas por estado ----
     Feito (o que já andou) - A fazer (destravado) - Bloqueado (espera dependência).
     Coluna sem nó não é desenhada: com o estágio recém-reiniciado, nada de coluna vazia de feitas. */
  const COLUNAS_FAIXA = [
    ["feito",     "Feito"],
    ["fazer",     "A fazer agora"],
    ["bloqueada", "Bloqueado por dependência"]
  ];

  function cartaoHtml(n, atraso) {
    const ehFronteira = FRONTEIRA && n.id === FRONTEIRA.id;
    const classes = ["no", n.estado === "feito" ? "feito" : "", n.estado === "bloqueada" ? "bloqueada" : "",
      n.tipo === "proposta" ? "proposta" : "", n.tipo === "pendente" ? "pendente-no" : "",
      ehFronteira ? "fronteira" : ""].filter(Boolean).join(" ");
    const chip = n.estado === "feito" ? '<span class="chip feito">feito</span>'
      : n.estado === "bloqueada" ? '<span class="chip bloqueada">bloqueada</span>'
      : n.tipo === "pendente" ? '<span class="chip pendente">pendente</span>'
      : n.tipo === "proposta" ? '<span class="chip proposta">proposta</span>'
      : '<span class="chip fazer">a fazer</span>';
    const trava = n.estado === "bloqueada"
      ? '<div class="trava">' + CADEADO + "aguarda " + n.travas.map(esc).join(", ") + "</div>" : "";
    return '<div class="' + classes + '" data-id="' + esc(n.id) + '" id="no-' + esc(n.id) + '"' +
      ' style="animation-delay:' + atraso + 'ms" tabindex="0" role="button"' +
      ' aria-label="' + esc(n.id + ": " + n.titulo) + '">' +
      '<div class="topo-no"><span class="id">' + esc(n.id) + "</span>" + chip + "</div>" +
      '<div class="titulo">' + esc(n.titulo) + "</div>" + trava + "</div>";
  }

  function desenhar() {
    const grafo = document.getElementById("grafo");
    grafo.querySelectorAll(".faixa").forEach(el => el.remove());

    const ordem = TEMAS.slice();
    if (NOS.some(n => !TEMAS.some(t => t[0] === n.tema))) ordem.push(OUTRO_TEMA);

    ordem.forEach(function (tema, ti) {
      const doTema = NOS.filter(n => infoTema(n.tema)[0] === tema[0]);
      if (!doTema.length) return;
      const abertos = doTema.filter(n => n.estado !== "feito").length;

      const faixa = document.createElement("section");
      faixa.className = "faixa" + (abertos ? "" : " sem-aberto recolhida");
      faixa.id = "faixa-" + tema[0];

      const colunas = COLUNAS_FAIXA.map(function (par) {
        const nos = doTema.filter(n => n.estado === par[0]);
        if (!nos.length) return "";
        return '<div class="coluna" data-col="' + par[0] + '"><div class="titulo-col">' + par[1] +
          " - " + nos.length + "</div>" +
          nos.map((n, i) => cartaoHtml(n, ti * 60 + i * 40)).join("") + "</div>";
      }).join("");

      faixa.innerHTML =
        '<div class="faixa-cabeca">' +
          "<h3>" + esc(tema[1]) + "</h3>" +
          '<span class="faixa-sub">' + esc(tema[2]) + "</span>" +
          '<span class="contador' + (abertos ? "" : " zerado") + '">' +
            (abertos ? abertos + (abertos > 1 ? " abertas" : " aberta") : "tudo feito") +
          "</span>" +
          (abertos ? "" : '<button class="alternar" type="button">mostrar as ' + doTema.length + " concluídas</button>") +
        "</div>" +
        '<div class="faixa-colunas">' + colunas + "</div>";
      const btnAlt = faixa.querySelector(".alternar");
      if (btnAlt) btnAlt.addEventListener("click", function () {
        const fechada = faixa.classList.toggle("recolhida");
        btnAlt.textContent = fechada ? "mostrar as " + doTema.length + " concluídas" : "recolher";
        requestAnimationFrame(desenharArestas);
      });
      grafo.appendChild(faixa);
    });

    const porIdNos = {};
    NOS.forEach(function (n) { porIdNos[n.id] = n; });
    grafo.querySelectorAll(".no").forEach(function (el) {
      el.addEventListener("click", function () { abrirFicha(el.dataset.id); });
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirFicha(el.dataset.id); } });
      el.addEventListener("mouseenter", function () { mostrarTip(porIdNos[el.dataset.id], el); });
      el.addEventListener("mouseleave", esconderTip);
      el.addEventListener("focus", function () { mostrarTip(porIdNos[el.dataset.id], el); });
      el.addEventListener("blur", esconderTip);
    });

    requestAnimationFrame(desenharArestas);
  }

  function desenharArestas() {
    const grafo = document.getElementById("grafo");
    const svg = document.getElementById("arestas");
    if (!grafo || !svg) return;
    const base = grafo.getBoundingClientRect();
    svg.setAttribute("width", grafo.scrollWidth);
    svg.setAttribute("height", grafo.scrollHeight);
    svg.setAttribute("viewBox", "0 0 " + grafo.scrollWidth + " " + grafo.scrollHeight);

    const porId = {};
    NOS.forEach(n => { porId[n.id] = n; });

    let caminhos = "";
    NOS.forEach(function (n) {
      const alvoEl = document.getElementById("no-" + n.id);
      if (!alvoEl || alvoEl.offsetParent === null) return; /* nó filtrado: sem aresta */
      n.deps.forEach(function (dep) {
        const origem = porId[dep];
        /* aresta só dentro da faixa: dependência que cruza tema aparece no cartão
           (chip "aguarda X") e na ficha, sem risco atravessando o desenho (OS16). */
        if (!origem || infoTema(origem.tema)[0] !== infoTema(n.tema)[0]) return;
        const origemEl = document.getElementById("no-" + dep);
        if (!origemEl || origemEl.offsetParent === null) return;
        const a = origemEl.getBoundingClientRect(), b = alvoEl.getBoundingClientRect();
        let x1 = a.right - base.left, y1 = a.top - base.top + a.height / 2;
        let x2 = b.left - base.left, y2 = b.top - base.top + b.height / 2;
        if (x2 < x1) { /* aresta dentro da mesma coluna ou para trás: sai por baixo */
          x1 = a.left - base.left + a.width / 2; y1 = a.bottom - base.top;
          x2 = b.left - base.left + b.width / 2; y2 = b.top - base.top;
          caminhos += caminho("M" + x1 + "," + y1 + " C" + x1 + "," + (y1 + 26) + " " + x2 + "," + (y2 - 26) + " " + x2 + "," + (y2 - 5), n, porId[dep]);
          return;
        }
        const folga = Math.max(30, (x2 - x1) * 0.45);
        caminhos += caminho("M" + x1 + "," + y1 + " C" + (x1 + folga) + "," + y1 + " " + (x2 - folga) + "," + y2 + " " + (x2 - 6) + "," + y2, n, porId[dep]);
      });
    });
    svg.innerHTML = caminhos;
  }

  function caminho(d, alvo, origem) {
    const ativa = alvo.estado === "fazer" && (!origem || origem.estado === "feito");
    const feita = alvo.estado === "feito";
    const cls = "aresta" + (ativa ? " ativa" : "") + (feita ? " feita" : "");
    /* seta: um triângulo no fim do trecho */
    const fim = d.match(/ ([\d.]+),([\d.]+)$/);
    let seta = "";
    if (fim) {
      const x = parseFloat(fim[1]), y = parseFloat(fim[2]);
      seta = '<path class="seta' + (ativa ? " ativa" : "") + '" d="M' + x + "," + y + " l-7,-4 v8 z\"/>";
    }
    return '<path class="' + cls + '" d="' + d + '"/>' + seta;
  }

  /* ---- painel lateral: a ficha do nó por extenso, com o prompt copiável ---- */

  function abrirFicha(id) {
    const n = NOS.find(x => x.id === id);
    if (!n) return;
    esconderTip();
    document.querySelectorAll(".no.aberto").forEach(el => el.classList.remove("aberto"));
    const el = document.getElementById("no-" + id);
    if (el) el.classList.add("aberto");
    history.replaceState(null, "", "#cockpit/no-" + id);

    const chip = n.estado === "feito" ? '<span class="chip feito">feito</span>'
      : n.estado === "bloqueada" ? '<span class="chip bloqueada">bloqueada</span>'
      : n.tipo === "pendente" ? '<span class="chip pendente">pendente</span>'
      : n.tipo === "proposta" ? '<span class="chip proposta">proposta</span>'
      : '<span class="chip fazer">a fazer</span>';

    const porId = {};
    NOS.forEach(x => { porId[x.id] = x; });
    const deps = n.deps.length
      ? '<div class="bloco"><span class="micro">Depende de</span><div class="deps-lista">' +
        n.deps.map(function (dep) {
          const dn = porId[dep];
          const ok = dn && dn.estado === "feito";
          return '<div class="dep-linha"><span class="ponto ' + (ok ? "verde" : "vermelho") + '"></span>' +
            '<strong>' + esc(dep) + "</strong> " + esc(dn ? dn.titulo : "") +
            (ok ? "" : ' <span class="caption">(pendente)</span>') + "</div>";
        }).join("") + "</div></div>" : "";

    const prompt = n.prompt
      ? '<div class="bloco"><span class="micro">Prompt do passo (colar no Claude Code)</span>' +
        '<pre class="prompt" style="margin-top:8px;">' + esc(n.prompt) + "</pre>" +
        '<div class="acoes"><button class="btn primario" id="btn-copiar">Copiar prompt</button></div></div>'
      : (n.estado === "feito"
        ? '<div class="bloco caption">Nó concluído: a história dele vive no <code>roadmap/TODO.md</code>.</div>'
        : '<div class="bloco caption">Este nó ainda não tem prompt registrado.</div>');

    document.getElementById("grafo-painel-corpo").innerHTML =
      '<div class="linha"><span class="id" style="font:700 13px/1 var(--font-mono);color:var(--cor-rotulo);">' + esc(n.id) + "</span>" + chip +
      (n.dono ? '<span class="caption">dono: ' + esc(n.dono) + "</span>" : "") + "</div>" +
      '<div class="titulo-no">' + esc(n.titulo) + "</div>" +
      (n.ficha
        ? '<div class="ficha-bloco"><span class="micro">O que fez</span><p>' + esc(n.ficha.fez) + "</p></div>" +
          '<div class="ficha-bloco"><span class="micro">O que mudou</span><p>' + esc(n.ficha.mudou) + "</p></div>" +
          '<div class="ficha-bloco"><span class="micro">O valor</span><p>' + esc(n.ficha.valor) + "</p></div>"
        : "") +
      ((n.nota || n.resumo) ? '<div class="bloco"><span class="micro">' + (n.ficha ? "Nota de registro" : "Resumo") + '</span>' +
        '<div class="card-interno" style="margin-top:8px;"><div class="linha-dado"><span>' + esc(n.nota || n.resumo) + "</span></div></div></div>" : "") +
      deps + prompt;

    const btn = document.getElementById("btn-copiar");
    if (btn) btn.onclick = async function () {
      try { await navigator.clipboard.writeText(n.prompt); }
      catch (e) {
        const ta = document.createElement("textarea");
        ta.value = n.prompt; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove();
      }
      btn.textContent = "Copiado ✓";
      setTimeout(() => { btn.textContent = "Copiar prompt"; }, 1600);
    };

    document.getElementById("grafo-painel").classList.add("aberto");
  }

  function fecharFicha() {
    const painel = document.getElementById("grafo-painel");
    if (!painel || !painel.classList.contains("aberto")) return;
    painel.classList.remove("aberto");
    document.querySelectorAll(".no.aberto").forEach(el => el.classList.remove("aberto"));
    history.replaceState(null, "", "#cockpit");
  }

  function ligar() {
    const btnFechar = document.getElementById("grafo-btn-fechar");
    if (btnFechar) btnFechar.onclick = fecharFicha;
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") fecharFicha(); });
    window.addEventListener("resize", function () { requestAnimationFrame(desenharArestas); });
  }
  if (document.body) ligar();
  else document.addEventListener("DOMContentLoaded", ligar);

  /* abrir a ficha vindo de fora (ex.: o botão "ver no grafo" da mesa) e rolar até o cartão */
  function abrir(id) {
    abrirFicha(id);
    const el = document.getElementById("no-" + id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  window.Grafo = { montar: montar, abrir: abrir };
})();
