/* Ana OS: a aba Cockpit (ADR-0030), agora a aba do GitHub (ADR-0031). Responde uma
   pergunta só: o que eu faço agora. Lê GET /api/roadmap, que o server monta das Issues
   do repo pelo `gh`, e não grava nada: card novo, canal movido e card feito são
   comandos `gh` na sessão do terminal. Filtros (canal, área, estado, busca, com a
   contagem em cada opção), o funil, a mesa de ação por canal (ADR-0011), o grafo de
   execução (grafo.js), o radar em uma linha por item e o card da issue com corpo,
   linha do tempo e comentários (GET /api/issue/<n>). */

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
    comigo: { titulo: "Sente comigo", desc: "uma sessão no terminal resolve" },
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

  /* ---- filtros: canal, área, estado e busca; cada opção diz quantos traria ---- */
  function renderFiltros() {
    const alvo = document.getElementById("filtros-cockpit");
    if (!alvo) return;
    const padrao = !FILTRO.canal && !FILTRO.area && FILTRO.estado === "abertas" && !FILTRO.q;
    function select(chave, rotulo, opcoes, todas) {
      return '<label class="f-grupo f-select"><span class="f-rot">' + rotulo + '</span>' +
        '<select data-chave="' + chave + '" aria-label="' + rotulo + '">' +
        (todas != null ? '<option value="">' + esc(todas) + " (" + conta(chave, "") + ")</option>" : "") +
        opcoes.map(o => '<option value="' + esc(o[0]) + '"' + (FILTRO[chave] === o[0] ? " selected" : "") + ">" +
          esc(o[1]) + " (" + conta(chave, o[0]) + ")</option>").join("") + "</select></label>";
    }
    alvo.innerHTML = '<div class="f-linha">' +
      '<label class="f-busca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
      '<input type="search" id="fc-q" placeholder="buscar nas issues" value="' + esc(FILTRO.q) + '" autocomplete="off" aria-label="Buscar"></label>' +
      select("canal", "Canal", Object.keys(CANAIS_META).map(c => [c, CANAIS_META[c].titulo]), "todos") +
      select("area", "Área", Object.keys(AREAS_META).map(a => [a, AREAS_META[a]]), "todas") +
      select("estado", "Estado", ESTADOS, null) +
      '<span class="f-conta">' + filtrados().length + " de " + todosItens().length + "</span>" +
      (padrao ? "" : '<button type="button" class="btn mini f-limpar" id="fc-limpar">limpar</button>') + "</div>";
    const q = document.getElementById("fc-q");
    q.addEventListener("input", () => { FILTRO.q = q.value; renderTudo(true); });
    q.addEventListener("keydown", e => { if (e.key === "Escape") { q.value = ""; FILTRO.q = ""; renderTudo(); } });
    alvo.querySelectorAll("select[data-chave]").forEach(s => {
      s.addEventListener("change", () => { FILTRO[s.dataset.chave] = s.value; renderTudo(); });
    });
    const lp = document.getElementById("fc-limpar");
    if (lp) lp.onclick = () => { FILTRO.canal = ""; FILTRO.area = ""; FILTRO.estado = "abertas"; FILTRO.q = ""; renderTudo(); };
  }

  /* ---- funil: o total pendente e a quebra por canal; clicar filtra ---- */
  function renderFunil() {
    const alvo = document.getElementById("funil");
    if (!alvo) return;
    const abertos = todosItens().filter(i => i.status === "fazer"); /* tarefas e radar: o que a mesa mostra */
    const abertas = abertos.filter(i => i.faixa === "tarefa");
    const tot = ROADMAP.totais || {};
    const cards = [
      { n: abertas.length, r: "pendentes", s: (tot.feitas || 0) + " de " + (tot.total || 0) + " feitas" + (tot.radar ? " · +" + tot.radar + " no radar" : ""), cls: "total", on: FILTRO.estado === "abertas" && !FILTRO.canal, acao: () => { FILTRO.estado = "abertas"; FILTRO.canal = ""; } },
    ].concat(Object.keys(CANAIS_META).map(c => ({
      n: abertos.filter(i => i.canal === c).length, r: CANAIS_META[c].titulo, s: CANAIS_META[c].desc,
      on: FILTRO.canal === c, acao: () => { FILTRO.canal = FILTRO.canal === c ? "" : c; FILTRO.estado = "abertas"; },
    }))).concat([
      { n: abertas.filter(i => i.travas.length).length, r: "bloqueadas", s: "esperam outra issue", on: FILTRO.estado === "bloqueadas", acao: () => { FILTRO.estado = FILTRO.estado === "bloqueadas" ? "abertas" : "bloqueadas"; FILTRO.canal = ""; } },
      { n: (ROADMAP.radar || []).filter(i => i.status === "fazer").length, r: "radar", s: "fora do grafo", on: false, acao: () => { document.getElementById("radar").scrollIntoView({ block: "start", behavior: Liga.reduzido() ? "auto" : "smooth" }); } },
    ]);
    alvo.innerHTML = cards.map((c, i) =>
      '<button type="button" class="funil-card ' + (c.cls || "") + (c.on ? " on" : "") + '" data-i="' + i + '">' +
      '<span class="n">' + c.n + '</span><span class="r">' + esc(c.r) + '</span><span class="s">' + esc(c.s) + "</span></button>").join("");
    alvo.querySelectorAll(".funil-card").forEach(el => {
      el.addEventListener("click", () => { cards[+el.dataset.i].acao(); renderTudo(); });
    });
  }

  /* ---- mesa de ação ---- */
  function chipsAreas(it) {
    return (it.areas || []).length ? '<div class="areas">' + it.areas.map(a => '<span class="chip neutro">' + esc(AREAS_META[a] || a) + "</span>").join("") + "</div>" : "";
  }
  function cardMesa(it) {
    const dias = diasDesde(it.canal_desde);
    const chips = ['<span class="chip ' + (it.faixa === "radar" ? "tag" : it.status === "feito" ? "feito" : "fazer") + '">' + (it.status === "feito" ? "feita" : it.faixa) + "</span>"];
    if (it.em_curso) chips.push('<span class="chip fazer">em curso</span>');
    if (it.status === "fazer" && it.travas.length) chips.push('<span class="chip bloqueada">aguarda #' + it.travas.join(", #") + "</span>");
    if (it.canal === "aguardando" && dias !== null)
      chips.push('<span class="chip ' + (dias >= 14 ? "tag" : "bloqueada") + '">há ' + dias + " dia" + (dias === 1 ? "" : "s") + "</span>");
    if (it.faixa === "radar" && it.prioridade != null) chips.push('<span class="chip bloqueada">prioridade ' + it.prioridade + "/10</span>");
    if (it.status === "fazer" && !it.prompt) chips.push('<span class="chip tag">sem prompt ainda</span>');
    if (it.status === "fazer" && !(it.mesa && it.mesa.gesto)) chips.push('<span class="chip tag">sem gesto</span>');
    return '<div class="card hover mesa-card" data-mesa-id="' + esc(it.id) + '" tabindex="0" role="button">' +
      '<span class="id-faixa" title="' + esc(it.antes ? "antes: " + it.antes : "") + '">#' + esc(it.id) + (it.antes ? ' <span class="micro">' + esc(it.antes) + "</span>" : "") + '</span>' +
      '<h4>' + esc(it.titulo) + '</h4>' + chipsAreas(it) +
      '<div class="rodape-card">' + chips.join("") + '</div></div>';
  }

  function renderMesa() {
    const itens = filtrados();
    const abertos = itens.filter(i => i.status === "fazer");
    const feitos = itens.filter(i => i.status === "feito");
    let cols = Object.keys(CANAIS_META).map(canal => {
      const doCanal = abertos.filter(i => i.canal === canal)
        .sort((a, b) => (diasDesde(b.canal_desde) || 0) - (diasDesde(a.canal_desde) || 0));
      if (FILTRO.canal && FILTRO.canal !== canal) return "";
      const meta = CANAIS_META[canal];
      return '<div class="mesa-col" data-canal="' + canal + '">' +
        '<div class="col-cabeca"><h3>' + meta.titulo + '</h3><span class="conta">' + doCanal.length + '</span></div>' +
        '<span class="caption">' + meta.desc + '</span>' +
        (doCanal.map(cardMesa).join("") || '<p class="mesa-vazia">nada aqui agora.</p>') +
        '</div>';
    });
    if (FILTRO.estado === "feitas" || FILTRO.estado === "todas") {
      cols.push('<div class="mesa-col" data-canal="feitas">' +
        '<div class="col-cabeca"><h3>Feitas</h3><span class="conta">' + feitos.length + '</span></div>' +
        '<span class="caption">issues fechadas, com a ficha no hover</span>' +
        (feitos.map(cardMesa).join("") || '<p class="mesa-vazia">nenhuma ainda.</p>') + '</div>');
    }
    if (FILTRO.estado === "feitas") cols = cols.slice(-1);
    const semCanal = abertos.filter(i => !i.canal);
    document.getElementById("mesa").innerHTML = cols.join("") +
      (semCanal.length ? '<p class="caption" style="grid-column: 1 / -1;">Sem label canal: (corrigir com <code>gh issue edit N --add-label canal:...</code>): ' +
        semCanal.map(i => "#" + esc(i.id)).join(" · ") + '</p>' : "");
    document.querySelectorAll(".mesa-card").forEach(el => {
      const it = itens.find(i => i.id === el.dataset.mesaId);
      el.addEventListener("mouseenter", () => mostrarTip(it, el));
      el.addEventListener("mouseleave", esconderTip);
      el.addEventListener("focus", () => mostrarTip(it, el));
      el.addEventListener("blur", esconderTip);
      el.addEventListener("click", () => abrirPainelMesa(it.id));
      el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirPainelMesa(it.id); } });
    });
  }

  /* tooltip de ficha no hover (padrão OS9): a mesa e o grafo usam o mesmo desenho */
  const TIP = document.createElement("div");
  TIP.className = "tooltip-ficha";
  document.body.appendChild(TIP);

  function mostrarTip(it, el) {
    let html = "";
    if (it.status === "feito" && it.ficha) {
      html = '<div class="tt-rot">O que fez</div><div class="tt-txt">' + esc(it.ficha.fez) + "</div>" +
        '<div class="tt-rot">O que mudou</div><div class="tt-txt">' + esc(it.ficha.mudou) + "</div>" +
        '<div class="tt-rot">O valor</div><div class="tt-txt">' + esc(it.ficha.valor) + "</div>";
    } else if (it.mesa) {
      html = '<div class="tt-rot">Destrava</div><div class="tt-txt">' + esc(it.mesa.destrava) + "</div>" +
        '<div class="tt-rot">O gesto</div><div class="tt-txt">' + esc(it.mesa.gesto) + "</div>";
    } else if (it.nota) {
      html = '<div class="tt-rot">Nota</div><div class="tt-txt">' + esc(it.nota) + "</div>";
    } else return;
    TIP.innerHTML = html;
    TIP.classList.add("visivel");
    const r = el.getBoundingClientRect();
    let x = r.right + 12;
    if (x + 364 > window.innerWidth) x = Math.max(8, r.left - 364);
    const y = Math.min(r.top, window.innerHeight - TIP.offsetHeight - 12);
    TIP.style.left = x + "px";
    TIP.style.top = Math.max(8, y) + "px";
  }
  function esconderTip() { TIP.classList.remove("visivel"); }
  document.addEventListener("scroll", esconderTip, true);

  /* ---- o card da issue: corpo, ações e a linha do tempo lida do GitHub ---- */
  function bloco(rotulo, texto) {
    return texto ? '<div class="mesa-bloco"><span class="micro">' + rotulo + '</span><p>' + esc(texto) + '</p></div>' : "";
  }
  function abrirPainelMesa(id) {
    const it = porId(id);
    const painel = document.getElementById("painel-mesa");
    if (!it) { painel.hidden = true; return; }
    document.querySelectorAll(".mesa-card, .radar-linha").forEach(el =>
      el.classList.toggle("ativo", el.dataset.mesaId === id));
    const dias = diasDesde(it.canal_desde);
    const rotuloPrompt = it.canal === "comigo" ? "Copiar prompt de sessão" : "Copiar prompt de terminal";
    const micro = ["#" + it.id + (it.antes ? " (antes " + it.antes + ")" : ""), it.faixa === "radar" ? "radar" : (it.status === "feito" ? "feita" + (it.fechada_em ? " em " + dataBr(it.fechada_em) : "") : "tarefa")]
      .concat(it.canal ? [CANAIS_META[it.canal].titulo.toLowerCase() + (dias !== null ? " há " + dias + " dia" + (dias === 1 ? "" : "s") : "")] : [])
      .concat((it.areas || []).map(a => AREAS_META[a] || a));
    painel.innerHTML =
      '<div class="linha"><div>' +
      '<span class="micro">' + esc(micro.join(" · ")) + '</span>' +
      '<h3 style="margin: 4px 0 0;">' + esc(it.titulo) + '</h3></div>' +
      '<button class="btn mini direita" type="button" id="fechar-mesa">fechar</button></div>' +
      (it.status === "feito" && it.ficha
        ? bloco("O que fez", it.ficha.fez) + bloco("O que mudou", it.ficha.mudou) + bloco("O valor", it.ficha.valor)
        : (it.mesa ? bloco("Destrava", it.mesa.destrava) + bloco("O gesto", it.mesa.gesto) : "")) +
      bloco("Pronto quando", it.pronto_quando) +
      (it.travas.length ? '<div class="mesa-bloco"><span class="micro">Bloqueada por</span><p>' + it.travas.map(d => {
        const dep = porId(d); return '<a href="#cockpit/no-' + esc(d) + '">#' + esc(d) + "</a>" + (dep ? " " + esc(dep.titulo) : "");
      }).join("<br>") + '</p></div>' : "") +
      bloco("Nota de registro", it.nota) +
      '<div class="acoes">' +
      (it.prompt ? '<button class="btn mini principal" type="button" id="copiar-mesa">' + rotuloPrompt + '</button>'
        : (it.status === "fazer" ? '<span class="chip tag">sem prompt ainda</span>' : "")) +
      (it.faixa !== "radar" ? '<button class="btn mini" type="button" id="ver-grafo">Ver no grafo</button>' : "") +
      (it.url ? '<a class="btn mini" href="' + esc(it.url) + '" target="_blank" rel="noopener">Abrir no GitHub ↗</a>' : "") +
      '<span class="caption">o estado muda por <code>gh</code> na sessão do terminal</span></div>' +
      '<div class="mesa-bloco" id="linha-tempo"><span class="micro">Linha do tempo</span><p class="caption">lendo o GitHub...</p></div>';
    painel.hidden = false;
    document.getElementById("fechar-mesa").onclick = fecharPainelMesa;
    const bc = document.getElementById("copiar-mesa");
    if (bc) bc.onclick = () => copiarPrompt(bc, it);
    const bg = document.getElementById("ver-grafo");
    if (bg) bg.onclick = () => Grafo.abrir(it.id);
    painel.scrollIntoView({ block: "nearest", behavior: Liga.reduzido() ? "auto" : "smooth" });
    carregarLinhaDoTempo(it.numero);
  }

  async function carregarLinhaDoTempo(numero) {
    const alvo = document.getElementById("linha-tempo");
    try {
      const d = await fetch("/api/issue/" + numero).then(r => r.json());
      if (!d.ok) throw new Error(d.erro || "falhou");
      if (!alvo || !alvo.isConnected) return;
      alvo.innerHTML = '<span class="micro">Linha do tempo (' + d.linha_do_tempo.length + ")</span>" +
        '<ul class="linha-tempo">' + d.linha_do_tempo.map(e =>
          '<li><span class="q">' + esc(dataHoraBr(e.quando)) + "</span><span" + (e.tipo === "comentario" ? ' class="comentario"' : "") + ">" +
          (e.quem ? "<strong>" + esc(e.quem) + "</strong> " : "") + esc(e.texto) + "</span></li>").join("") + "</ul>";
    } catch (e) {
      if (alvo) alvo.innerHTML = '<span class="micro">Linha do tempo</span><p class="caption">não consegui ler o GitHub: ' + esc(e.message) + "</p>";
    }
  }

  function fecharPainelMesa() {
    document.getElementById("painel-mesa").hidden = true;
    document.querySelectorAll(".mesa-card.ativo, .radar-linha.ativo").forEach(el => el.classList.remove("ativo"));
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
      el.addEventListener("click", () => abrirPainelMesa(el.dataset.mesaId));
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
