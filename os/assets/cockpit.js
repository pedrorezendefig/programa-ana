/* Ana OS: a aba Cockpit (ADR-0030), agora a aba do GitHub (ADR-0031). Responde uma
   pergunta só: o que eu faço agora. Lê GET /api/roadmap, que o server monta das Issues
   do repo pelo `gh`, e não grava nada: card novo, canal movido e card feito são
   comandos `gh` na sessão do terminal. Filtros (canal, área, estado, busca, com a
   contagem em cada opção, num menu próprio), o funil, a mesa de ação em raias por
   canal (ADR-0011), cada issue uma linha que abre no lugar com a ficha, o prompt e a
   linha do tempo (GET /api/issue/<n>), o grafo de execução (grafo.js) e o radar. */

(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function normal(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  let ROADMAP = null;
  const FILTRO = { canal: "", area: "", estado: "abertas", q: "" };

  const CANAIS_META = {
    dispare: { titulo: "Dispare hoje", desc: "depende só de você, em minutos" },
    comigo: { titulo: "Sente comigo", desc: "o Claude Code resolve numa sessão no terminal" },
    aguardando: { titulo: "Aguardando terceiros", desc: "já foi pedido; aqui se cobra" },
  };
  const AREAS_META = {
    "global-health": "Global Health", "ana": "Ana", "fazer-ai": "fazer.ai", "chatwoot": "Chatwoot",
    "app-hospital": "App do hospital", "os": "OS e Retrato",
  };
  const ESTADOS = [["abertas", "abertas"], ["bloqueadas", "bloqueadas"], ["feitas", "feitas"], ["todas", "todas"]];

  function hojeLocal() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function diasDesde(data) {
    if (!data) return null;
    const ms = new Date(hojeLocal()) - new Date(data);
    return Math.max(0, Math.round(ms / 86400000));
  }
  function dataBr(iso) {
    const p = String(iso || "").slice(0, 10).split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : String(iso || "");
  }
  function dataHoraBr(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return dataBr(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")) +
      " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  /* ---- os itens: tarefas e radar, com faixa e trava derivadas ---- */
  function feitasIds() {
    return new Set(ROADMAP.tarefas.filter(t => t.status === "feito").map(t => t.id));
  }
  function todosItens() {
    const feitas = feitasIds();
    return [].concat(
      ROADMAP.tarefas.map(t => Object.assign({ faixa: "tarefa" }, t)),
      (ROADMAP.radar || []).map(r => Object.assign({ faixa: "radar" }, r))
    ).map(it => Object.assign(it, { travas: (it.deps || []).filter(d => !feitas.has(d)) }));
  }
  function porId(id) { return todosItens().find(i => i.id === id); }

  /* um item passa pelo filtro f (todas as chaves, ou ignorando a chave `menos`) */
  function passa(it, f, menos) {
    if (menos !== "estado") {
      if (f.estado === "abertas" && it.status !== "fazer") return false;
      if (f.estado === "feitas" && it.status !== "feito") return false;
      if (f.estado === "bloqueadas" && !(it.status === "fazer" && it.travas.length)) return false;
    }
    if (menos !== "canal" && f.canal && it.canal !== f.canal) return false;
    if (menos !== "area" && f.area && (it.areas || []).indexOf(f.area) < 0) return false;
    if (menos !== "q" && f.q) {
      const alvo = normal([it.titulo, it.antes, it.id, (it.mesa || {}).gesto, (it.mesa || {}).destrava, it.nota].join(" "));
      if (alvo.indexOf(normal(f.q)) < 0) return false;
    }
    return true;
  }
  function filtrados() { return todosItens().filter(it => passa(it, FILTRO)); }
  function conta(chave, valor) {
    const f = Object.assign({}, FILTRO); f[chave] = valor;
    return todosItens().filter(it => passa(it, f)).length;
  }

  /* ---- filtros: canal, área, estado e busca; menu próprio (sem o <select> nativo),
     cada opção diz quantos traria ---- */
  let MENU = null; /* a chave do menu aberto */
  function renderFiltros() {
    const alvo = document.getElementById("filtros-cockpit");
    if (!alvo) return;
    const padrao = !FILTRO.canal && !FILTRO.area && FILTRO.estado === "abertas" && !FILTRO.q;
    function menu(chave, rotulo, opcoes, todas) {
      if (todas != null) opcoes = [["", todas]].concat(opcoes);
      const atual = opcoes.find(o => o[0] === FILTRO[chave]) || opcoes[0];
      const ligado = todas != null ? !!FILTRO[chave] : FILTRO[chave] !== "abertas";
      return '<div class="dd' + (MENU === chave ? " aberto" : "") + '" data-menu="' + chave + '">' +
        '<button type="button" class="dd-btn' + (ligado ? " on" : "") + '" aria-haspopup="listbox" aria-expanded="' + (MENU === chave) + '">' +
        '<span class="dd-rot">' + rotulo + '</span><span class="dd-val">' + esc(atual[1]) + '</span>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></button>' +
        '<div class="dd-menu" role="listbox" aria-label="' + rotulo + '">' + opcoes.map(o => {
          const n = conta(chave, o[0]); const on = FILTRO[chave] === o[0];
          return '<button type="button" class="dd-opt' + (on ? " on" : "") + '" role="option" aria-selected="' + on + '" data-v="' + esc(o[0]) + '"' + (n ? "" : " data-zero") + '>' +
            '<span class="dd-txt">' + esc(o[1]) + '</span><span class="dd-n">' + n + "</span></button>";
        }).join("") + "</div></div>";
    }
    alvo.innerHTML = '<div class="f-linha">' +
      '<label class="f-busca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
      '<input type="search" id="fc-q" placeholder="buscar nas issues" value="' + esc(FILTRO.q) + '" autocomplete="off" aria-label="Buscar"></label>' +
      menu("canal", "Canal", Object.keys(CANAIS_META).map(c => [c, CANAIS_META[c].titulo]), "todos") +
      menu("area", "Área", Object.keys(AREAS_META).map(a => [a, AREAS_META[a]]), "todas") +
      menu("estado", "Estado", ESTADOS, null) +
      '<span class="f-conta">' + filtrados().length + " de " + todosItens().length + "</span>" +
      (padrao ? "" : '<button type="button" class="btn mini f-limpar" id="fc-limpar">limpar</button>') + "</div>";
    const q = document.getElementById("fc-q");
    q.addEventListener("input", () => { FILTRO.q = q.value; renderTudo(true); });
    q.addEventListener("keydown", e => { if (e.key === "Escape") { q.value = ""; FILTRO.q = ""; renderTudo(); } });
    alvo.querySelectorAll(".dd").forEach(dd => {
      const chave = dd.dataset.menu;
      dd.querySelector(".dd-btn").addEventListener("click", e => { e.stopPropagation(); MENU = MENU === chave ? null : chave; marcarMenu(); });
      dd.querySelectorAll(".dd-opt").forEach(o => o.addEventListener("click", e => {
        e.stopPropagation(); FILTRO[chave] = o.dataset.v; MENU = null; renderTudo();
      }));
    });
    const lp = document.getElementById("fc-limpar");
    if (lp) lp.onclick = () => { FILTRO.canal = ""; FILTRO.area = ""; FILTRO.estado = "abertas"; FILTRO.q = ""; renderTudo(); };
  }
  /* abre e fecha o menu sem redesenhar a barra */
  function marcarMenu() {
    document.querySelectorAll("#filtros-cockpit .dd").forEach(dd => {
      const on = dd.dataset.menu === MENU;
      dd.classList.toggle("aberto", on);
      dd.querySelector(".dd-btn").setAttribute("aria-expanded", String(on));
    });
  }
  document.addEventListener("click", () => { if (MENU !== null) { MENU = null; marcarMenu(); } });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && MENU !== null) { MENU = null; marcarMenu(); } });

  /* ---- funil: uma faixa compacta com o total e a quebra por canal; clicar filtra ---- */
  function renderFunil() {
    const alvo = document.getElementById("funil");
    if (!alvo) return;
    const abertos = todosItens().filter(i => i.status === "fazer"); /* tarefas e radar: o que a mesa mostra */
    const abertas = abertos.filter(i => i.faixa === "tarefa");
    const tot = ROADMAP.totais || {};
    const cards = [
      { n: abertas.length, r: "pendentes", s: (tot.feitas || 0) + " de " + (tot.total || 0) + " feitas", cls: "total", on: FILTRO.estado === "abertas" && !FILTRO.canal, acao: () => { FILTRO.estado = "abertas"; FILTRO.canal = ""; } },
    ].concat(Object.keys(CANAIS_META).map(c => ({
      n: abertos.filter(i => i.canal === c).length, r: CANAIS_META[c].titulo, cls: "canal-" + c,
      on: FILTRO.canal === c, acao: () => { FILTRO.canal = FILTRO.canal === c ? "" : c; FILTRO.estado = "abertas"; },
    }))).concat([
      { n: abertas.filter(i => i.travas.length).length, r: "bloqueadas", on: FILTRO.estado === "bloqueadas", acao: () => { FILTRO.estado = FILTRO.estado === "bloqueadas" ? "abertas" : "bloqueadas"; FILTRO.canal = ""; } },
      { n: (ROADMAP.radar || []).filter(i => i.status === "fazer").length, r: "radar", on: false, acao: () => { document.getElementById("radar").scrollIntoView({ block: "start", behavior: Liga.reduzido() ? "auto" : "smooth" }); } },
    ]);
    alvo.innerHTML = cards.map((c, i) =>
      '<button type="button" class="funil-card ' + (c.cls || "") + (c.on ? " on" : "") + '" data-i="' + i + '" aria-pressed="' + c.on + '">' +
      '<span class="n">' + c.n + '</span><span class="r">' + esc(c.r) + '</span>' + (c.s ? '<span class="s">' + esc(c.s) + "</span>" : "") + "</button>").join("");
    alvo.querySelectorAll(".funil-card").forEach(el => {
      el.addEventListener("click", () => { cards[+el.dataset.i].acao(); renderTudo(); });
    });
  }

  /* ---- a mesa: uma raia por canal, empilhadas; cada issue é uma linha compacta
     (o formato do Hospital OS) que abre no lugar com a ficha, o prompt e a linha do tempo ---- */
  const ABERTOS = new Set();       /* ids das linhas abertas */
  const RAIAS_FECHADAS = new Set(); /* canais com a raia recolhida */
  const TEMPO = {};                 /* linha do tempo já lida, por número da issue */

  function chipsLinha(it) {
    const dias = diasDesde(it.canal_desde);
    const chips = (it.areas || []).map(a => '<span class="chip neutro">' + esc(AREAS_META[a] || a) + "</span>");
    if (it.faixa === "radar") chips.push('<span class="chip tag">radar' + (it.prioridade != null ? " " + it.prioridade + "/10" : "") + "</span>");
    if (it.status === "feito") chips.push('<span class="chip feito">feita' + (it.fechada_em ? " em " + dataBr(it.fechada_em) : "") + "</span>");
    if (it.em_curso) chips.push('<span class="chip preto">em curso</span>');
    if (it.status === "fazer" && it.travas.length) chips.push('<span class="chip bloqueada">aguarda #' + it.travas.join(", #") + "</span>");
    if (it.status === "fazer" && dias !== null)
      chips.push('<span class="chip ' + (it.canal === "aguardando" && dias >= 14 ? "tag" : "fora") + '">há ' + dias + " dia" + (dias === 1 ? "" : "s") + "</span>");
    if (it.status === "fazer" && !it.prompt) chips.push('<span class="chip tag">sem prompt</span>');
    if (it.status === "fazer" && !(it.mesa && it.mesa.gesto)) chips.push('<span class="chip tag">sem gesto</span>');
    return chips.join("");
  }

  function bloco(rotulo, texto) {
    return texto ? '<div class="mesa-bloco"><span class="micro">' + rotulo + '</span><p>' + esc(texto) + '</p></div>' : "";
  }
  function corpoLinha(it) {
    const rotuloPrompt = it.canal === "comigo" ? "Copiar prompt de sessão" : "Copiar prompt de terminal";
    return '<div class="lin-corpo">' +
      (it.status === "feito" && it.ficha
        ? bloco("O que fez", it.ficha.fez) + bloco("O que mudou", it.ficha.mudou) + bloco("O valor", it.ficha.valor)
        : (it.mesa ? bloco("Destrava", it.mesa.destrava) + bloco("O gesto", it.mesa.gesto) : "")) +
      bloco("Pronto quando", it.pronto_quando) +
      (it.travas.length ? '<div class="mesa-bloco"><span class="micro">Bloqueada por</span><p>' + it.travas.map(d => {
        const dep = porId(d); return '<a href="#cockpit/no-' + esc(d) + '">#' + esc(d) + "</a>" + (dep ? " " + esc(dep.titulo) : "");
      }).join("<br>") + '</p></div>' : "") +
      bloco("Nota de registro", it.nota) +
      '<div class="acoes">' +
      (it.prompt ? '<button class="btn mini principal" type="button" data-copiar="' + esc(it.id) + '">' + rotuloPrompt + '</button>' : "") +
      (it.faixa !== "radar" ? '<button class="btn mini" type="button" data-grafo="' + esc(it.id) + '">Ver no grafo</button>' : "") +
      (it.url ? '<a class="btn mini" href="' + esc(it.url) + '" target="_blank" rel="noopener">Abrir no GitHub ↗</a>' : "") +
      '<span class="caption">o estado muda por <code>gh</code> na sessão do terminal</span></div>' +
      '<div class="mesa-bloco linha-tempo-bloco" data-tempo="' + esc(it.numero) + '">' + htmlTempo(it.numero) + "</div></div>";
  }

  function linha(it, idx) {
    const aberto = ABERTOS.has(it.id);
    return '<article class="lin' + (aberto ? " aberta" : "") + '" id="lin-' + esc(it.id) + '">' +
      '<span class="lin-idx">' + String(idx + 1).padStart(2, "0") + '</span>' +
      '<div class="lin-main">' +
      '<button type="button" class="lin-cabeca" data-abrir="' + esc(it.id) + '" aria-expanded="' + aberto + '">' +
      '<span class="lin-num">#' + esc(it.id) + '</span><span class="lin-tit">' + esc(it.titulo) + "</span>" +
      (it.antes ? '<span class="lin-antes">antes ' + esc(it.antes) + "</span>" : "") + "</button>" +
      '<div class="lin-chips">' + chipsLinha(it) + "</div>" +
      (aberto ? corpoLinha(it) : "") + "</div>" +
      (it.url ? '<a class="lin-go" href="' + esc(it.url) + '" target="_blank" rel="noopener" aria-label="abrir a issue #' + esc(it.id) + ' no GitHub">↗</a>' : "") +
      "</article>";
  }

  function raia(chave, titulo, desc, itens) {
    const fechada = RAIAS_FECHADAS.has(chave);
    return '<section class="raia" data-canal="' + chave + '">' +
      '<button type="button" class="raia-cabeca" data-raia="' + chave + '" aria-expanded="' + !fechada + '">' +
      '<svg class="raia-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' +
      '<span class="raia-tit">' + esc(titulo) + '</span><span class="raia-n">' + itens.length + '</span>' +
      '<span class="raia-desc">' + esc(desc) + "</span></button>" +
      (fechada ? "" : '<div class="raia-corpo">' + (itens.map(linha).join("") || '<p class="mesa-vazia">nada aqui agora.</p>') + "</div>") +
      "</section>";
  }

  function renderMesa() {
    const itens = filtrados();
    const abertos = itens.filter(i => i.status === "fazer");
    const feitos = itens.filter(i => i.status === "feito");
    let raias = FILTRO.estado === "feitas" ? [] : Object.keys(CANAIS_META).map(canal => {
      if (FILTRO.canal && FILTRO.canal !== canal) return "";
      const doCanal = abertos.filter(i => i.canal === canal)
        .sort((a, b) => (diasDesde(b.canal_desde) || 0) - (diasDesde(a.canal_desde) || 0));
      return raia(canal, CANAIS_META[canal].titulo, CANAIS_META[canal].desc, doCanal);
    });
    if (FILTRO.estado === "feitas" || FILTRO.estado === "todas")
      raias.push(raia("feitas", "Feitas", "issues fechadas, com a ficha", feitos));
    const semCanal = abertos.filter(i => !i.canal);
    const alvo = document.getElementById("mesa");
    alvo.innerHTML = raias.join("") +
      (semCanal.length ? '<p class="caption">Sem label canal: (corrigir com <code>gh issue edit N --add-label canal:...</code>): ' +
        semCanal.map(i => "#" + esc(i.id)).join(" · ") + '</p>' : "");
    alvo.querySelectorAll("[data-raia]").forEach(b => b.addEventListener("click", () => {
      const c = b.dataset.raia;
      if (RAIAS_FECHADAS.has(c)) RAIAS_FECHADAS.delete(c); else RAIAS_FECHADAS.add(c);
      renderMesa();
    }));
    alvo.querySelectorAll("[data-abrir]").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.abrir;
      if (ABERTOS.has(id)) ABERTOS.delete(id); else ABERTOS.add(id);
      renderMesa();
    }));
    alvo.querySelectorAll("[data-copiar]").forEach(b => b.addEventListener("click", () => copiarPrompt(b, porId(b.dataset.copiar))));
    alvo.querySelectorAll("[data-grafo]").forEach(b => b.addEventListener("click", () => Grafo.abrir(b.dataset.grafo)));
    alvo.querySelectorAll("[data-tempo]").forEach(el => { if (!TEMPO[el.dataset.tempo]) carregarLinhaDoTempo(el.dataset.tempo); });
  }

  /* abre a linha de um item vindo de fora da mesa (o radar): tira do caminho
     o filtro que a esconderia, abre a raia e a linha, e rola até ela */
  function abrirNaMesa(id) {
    const it = porId(id);
    if (!it) return;
    if (!passa(it, FILTRO)) { FILTRO.canal = ""; FILTRO.area = ""; FILTRO.q = ""; FILTRO.estado = it.status === "feito" ? "todas" : "abertas"; }
    RAIAS_FECHADAS.delete(it.status === "feito" ? "feitas" : it.canal);
    ABERTOS.add(id);
    renderTudo();
    const el = document.getElementById("lin-" + id);
    if (el) el.scrollIntoView({ block: "center", behavior: Liga.reduzido() ? "auto" : "smooth" });
  }

  /* ---- a linha do tempo lida do GitHub, guardada para não reler a cada desenho ---- */
  function htmlTempo(numero) {
    const t = TEMPO[numero];
    if (!t || t.lendo) return '<span class="micro">Linha do tempo</span><p class="caption">lendo o GitHub...</p>';
    if (t.erro) return '<span class="micro">Linha do tempo</span><p class="caption">não consegui ler o GitHub: ' + esc(t.erro) + "</p>";
    return '<span class="micro">Linha do tempo (' + t.lista.length + ")</span>" +
      '<ul class="linha-tempo">' + t.lista.map(e =>
        '<li><span class="q">' + esc(dataHoraBr(e.quando)) + "</span><span" + (e.tipo === "comentario" ? ' class="comentario"' : "") + ">" +
        (e.quem ? "<strong>" + esc(e.quem) + "</strong> " : "") + esc(e.texto) + "</span></li>").join("") + "</ul>";
  }
  async function carregarLinhaDoTempo(numero) {
    TEMPO[numero] = { lendo: true }; /* evita disparar duas leituras da mesma issue */
    try {
      const d = await fetch("/api/issue/" + numero).then(r => r.json());
      if (!d.ok) throw new Error(d.erro || "falhou");
      TEMPO[numero] = { lista: d.linha_do_tempo };
    } catch (e) {
      TEMPO[numero] = { erro: e.message };
    }
    document.querySelectorAll('[data-tempo="' + numero + '"]').forEach(el => { el.innerHTML = htmlTempo(numero); });
  }
  async function copiarPrompt(btn, it) {
    if (!it || !it.prompt) return;
    try { await navigator.clipboard.writeText(it.prompt); }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = it.prompt; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
    const original = btn.textContent;
    btn.textContent = "Copiado ✓";
    setTimeout(() => { btn.textContent = original; }, 1600);
  }

  /* ---- radar: uma linha por item, fora do grafo ---- */
  function renderRadar() {
    const itens = (ROADMAP.radar || []).filter(r => r.status === "fazer").slice().sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0));
    const alvo = document.getElementById("radar");
    alvo.innerHTML = itens.map(r =>
      '<button class="radar-linha" type="button" data-mesa-id="' + esc(r.id) + '">' +
      '<span class="prio" title="prioridade ' + r.prioridade + ' de 10">' + (r.prioridade == null ? "?" : r.prioridade) + '</span>' +
      '<span class="id">#' + esc(r.id) + '</span>' +
      '<span class="tit">' + esc(r.titulo) + '</span>' +
      '<span class="chip bloqueada">' + esc(r.canal ? CANAIS_META[r.canal].titulo.toLowerCase() : "sem canal") + '</span>' +
      '</button>').join("") || '<p class="caption">Radar limpo: nada pendurado fora do grafo.</p>';
    alvo.querySelectorAll(".radar-linha").forEach(el => {
      el.addEventListener("click", () => abrirNaMesa(el.dataset.mesaId));
    });
  }

  /* ---- cabeçalho: estágio e as conexões ---- */
  async function status() {
    const el = document.getElementById("status-strip");
    if (!el) return;
    try {
      const s = await fetch("/api/status").then(r => r.json());
      el.innerHTML =
        '<span class="chip ' + (s.token_valido ? "feito" : "tag") + '">Global Health: ' +
        (s.token_valido ? "ok · " + s.latencia_ms + "ms" : s.gh_alcancavel ? "token não validou" : "fora de alcance") + '</span>' +
        '<span class="chip ' + (s.oracle_ok ? "feito" : "bloqueada") + '">Oracle TST: ' +
        (s.oracle_ok ? "ok · " + s.oracle_latencia_ms + "ms" : "sem conexão") + '</span>';
    } catch (e) {
      el.innerHTML = '<span class="chip tag">servidor fora do ar?</span>';
    }
  }

  /* ---- chegada por link no grafo (contrato de links, ADR-0029): #cockpit/no-4 ---- */
  document.addEventListener("liga:chegou", function (e) {
    const el = e.detail && e.detail.el;
    if (!el || !el.classList || !el.classList.contains("no") || !el.closest("#grafo")) return;
    const faixa = el.closest(".faixa.recolhida");
    if (faixa) {
      const btn = faixa.querySelector(".alternar");
      if (btn) btn.click(); else faixa.classList.remove("recolhida");
    }
    Grafo.abrir(el.id.replace(/^no-/, ""));
  });
  const corpoGrafo = document.getElementById("grafo-painel-corpo");
  if (corpoGrafo) corpoGrafo.addEventListener("click", function (e) {
    const dep = e.target.closest(".dep-linha strong");
    if (!dep) return;
    const id = dep.textContent.trim().replace(/^#/, "");
    if (document.getElementById("no-" + id)) Liga.ir("cockpit/no-" + id);
  });

  function renderTudo(soBusca) {
    if (!soBusca) renderFiltros();
    else {
      const c = document.querySelector("#filtros-cockpit .f-conta");
      if (c) c.textContent = filtrados().length + " de " + todosItens().length;
    }
    renderFunil();
    renderMesa();
  }

  async function carregar() {
    try {
      const r = await fetch("/api/roadmap").then(r => r.json());
      if (!r.ok) throw new Error(r.erro || "falhou");
      ROADMAP = r.roadmap;
    } catch (e) {
      document.getElementById("mesa").innerHTML = '<p class="caption">Não consegui ler o roadmap no GitHub (/api/roadmap): ' + esc(e.message) +
        '. O servidor está no ar e o <code>gh</code> está autenticado?</p>';
      return;
    }
    const sub = document.getElementById("hero-sub");
    if (sub) sub.textContent = ROADMAP.estagio + ". Lido do GitHub às " + String(ROADMAP.lido_em || "").slice(11, 16) + ".";
    const fonte = document.getElementById("mesa-fonte");
    if (fonte) fonte.innerHTML = 'Fonte: <a href="https://github.com/' + esc(ROADMAP.repo) + '/issues" target="_blank" rel="noopener">' + esc(ROADMAP.repo) + " ↗</a>.";
    renderTudo();
    Grafo.montar(ROADMAP);
    renderRadar();
    status();
  }

  carregar();
})();
