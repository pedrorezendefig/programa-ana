/* Ana OS: a aba Cockpit (ADR-0030). Responde uma pergunta só: o que eu faço agora.
   Mesa de ação (itens abertos por canal, ADR-0011), o grafo de execução (grafo.js) e
   o radar em uma linha por item. Lê GET /api/roadmap e não grava nada (ADR-0028):
   card novo, card feito e canal movido nascem por sessão no terminal. */

(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  let ROADMAP = null;

  const CANAIS_META = {
    dispare: { titulo: "Dispare hoje", desc: "depende só de você, em minutos" },
    comigo: { titulo: "Sente comigo", desc: "uma sessão no terminal resolve" },
    aguardando: { titulo: "Aguardando terceiros", desc: "já foi pedido; aqui se cobra" },
  };
  const ROT_FAIXA = { tarefa: "tarefa", pendente: "pendente", proposta: "proposta", radar: "radar" };

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
    const p = String(iso || "").split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : String(iso || "");
  }

  function itensMesa() {
    const d = ROADMAP;
    return [].concat(
      d.tarefas.filter(t => t.status === "fazer").map(t => Object.assign({ faixa: "tarefa" }, t)),
      (d.pendentes || []).map(p => Object.assign({ faixa: "pendente" }, p)),
      (d.propostas || []).map(p => Object.assign({ faixa: "proposta" }, p)),
      (d.radar || []).map(r => Object.assign({ faixa: "radar" }, r)));
  }

  /* ---- mesa de ação ---- */
  function cardMesa(it) {
    const dias = diasDesde(it.canal_desde);
    const chips = ['<span class="chip ' + (it.faixa === "radar" ? "tag" : it.faixa === "tarefa" ? "fazer" : it.faixa) + '">' + ROT_FAIXA[it.faixa] + "</span>"];
    if (it.canal === "aguardando" && dias !== null)
      chips.push('<span class="chip ' + (dias >= 14 ? "tag" : "bloqueada") + '">há ' + dias + " dia" + (dias === 1 ? "" : "s") + "</span>");
    if (it.faixa === "radar") chips.push('<span class="chip bloqueada">prioridade ' + it.prioridade + "/10</span>");
    if (!it.prompt) chips.push('<span class="chip tag">sem prompt ainda</span>');
    return '<div class="card hover mesa-card" data-mesa-id="' + esc(it.id) + '" tabindex="0" role="button">' +
      '<span class="id-faixa">' + esc(it.id) + '</span>' +
      '<h4>' + esc(it.titulo) + '</h4>' +
      '<div class="rodape-card">' + chips.join("") + '</div></div>';
  }

  function renderMesa() {
    const itens = itensMesa();
    const cols = Object.keys(CANAIS_META).map(canal => {
      const doCanal = itens.filter(i => i.canal === canal)
        .sort((a, b) => (diasDesde(b.canal_desde) || 0) - (diasDesde(a.canal_desde) || 0));
      const meta = CANAIS_META[canal];
      return '<div class="mesa-col" data-canal="' + canal + '">' +
        '<div class="col-cabeca"><h3>' + meta.titulo + '</h3><span class="conta">' + doCanal.length + '</span></div>' +
        '<span class="caption">' + meta.desc + '</span>' +
        (doCanal.map(cardMesa).join("") || '<p class="mesa-vazia">nada aqui agora.</p>') +
        '</div>';
    });
    const semCanal = itens.filter(i => !i.canal);
    document.getElementById("mesa").innerHTML = cols.join("") +
      (semCanal.length ? '<p class="caption" style="grid-column: 1 / -1;">Sem canal (corrigir numa sessão no terminal): ' +
        semCanal.map(i => esc(i.id)).join(" · ") + '</p>' : "");
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
    if (it.mesa) {
      html = '<div class="tt-rot">Destrava</div><div class="tt-txt">' + esc(it.mesa.destrava) + "</div>" +
        '<div class="tt-rot">O gesto</div><div class="tt-txt">' + esc(it.mesa.gesto) + "</div>";
    } else if (it.resumo || it.nota) {
      html = '<div class="tt-rot">Resumo</div><div class="tt-txt">' + esc(it.resumo || it.nota) + "</div>";
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

  function abrirPainelMesa(id) {
    const it = itensMesa().find(i => i.id === id);
    const painel = document.getElementById("painel-mesa");
    if (!it) { painel.hidden = true; return; }
    document.querySelectorAll(".mesa-card, .radar-linha").forEach(el =>
      el.classList.toggle("ativo", el.dataset.mesaId === id));
    const dias = diasDesde(it.canal_desde);
    const rotuloPrompt = it.canal === "comigo" ? "Copiar prompt de sessão" : "Copiar prompt de terminal";
    painel.innerHTML =
      '<div class="linha"><div>' +
      '<span class="micro">' + esc(it.id) + " · " + esc(ROT_FAIXA[it.faixa]) +
      (it.canal ? " · " + esc(CANAIS_META[it.canal].titulo).toLowerCase() : "") +
      (dias !== null ? " · neste canal há " + dias + " dia" + (dias === 1 ? "" : "s") : "") + '</span>' +
      '<h3 style="margin: 4px 0 0;">' + esc(it.titulo) + '</h3></div>' +
      '<button class="btn mini direita" type="button" id="fechar-mesa">fechar</button></div>' +
      (it.mesa ? '<div class="mesa-bloco"><span class="micro">Destrava</span><p>' + esc(it.mesa.destrava) + '</p></div>' +
        '<div class="mesa-bloco"><span class="micro">O gesto</span><p>' + esc(it.mesa.gesto) + '</p></div>' : "") +
      ((it.nota || it.resumo) ? '<div class="mesa-bloco"><span class="micro">Nota de registro</span><p>' + esc(it.nota || it.resumo) + '</p></div>' : "") +
      '<div class="acoes">' +
      (it.prompt ? '<button class="btn mini principal" type="button" id="copiar-mesa">' + rotuloPrompt + '</button>'
        : '<span class="chip tag">sem prompt ainda</span>') +
      (it.faixa !== "radar" ? '<button class="btn mini" type="button" id="ver-grafo">Ver no grafo</button>' : "") +
      '<span class="caption">o canal muda por sessão no terminal</span></div>';
    painel.hidden = false;
    document.getElementById("fechar-mesa").onclick = fecharPainelMesa;
    const bc = document.getElementById("copiar-mesa");
    if (bc) bc.onclick = () => copiarPrompt(bc, it.id);
    const bg = document.getElementById("ver-grafo");
    if (bg) bg.onclick = () => Grafo.abrir(it.id);
    painel.scrollIntoView({ block: "nearest", behavior: Liga.reduzido() ? "auto" : "smooth" });
  }

  function fecharPainelMesa() {
    document.getElementById("painel-mesa").hidden = true;
    document.querySelectorAll(".mesa-card.ativo, .radar-linha.ativo").forEach(el => el.classList.remove("ativo"));
  }

  async function copiarPrompt(btn, id) {
    const todos = [].concat(ROADMAP.tarefas, ROADMAP.pendentes || [], ROADMAP.propostas || [], ROADMAP.radar || []);
    const no = todos.find(n => n.id === id);
    if (!no || !no.prompt) return;
    try { await navigator.clipboard.writeText(no.prompt); }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = no.prompt; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
    const original = btn.textContent;
    btn.textContent = "Copiado ✓";
    setTimeout(() => { btn.textContent = original; }, 1600);
  }

  /* ---- radar: uma linha por item, fora do grafo ---- */
  function renderRadar() {
    const itens = (ROADMAP.radar || []).slice().sort((a, b) => b.prioridade - a.prioridade);
    const alvo = document.getElementById("radar");
    alvo.innerHTML = itens.map(r =>
      '<button class="radar-linha" type="button" data-mesa-id="' + esc(r.id) + '">' +
      '<span class="prio" title="prioridade ' + r.prioridade + ' de 10">' + r.prioridade + '</span>' +
      '<span class="id">' + esc(r.id) + '</span>' +
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

  /* ---- chegada por link no grafo (contrato de links, ADR-0029): #cockpit/no-V37 ---- */
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
    const id = dep.textContent.trim();
    if (document.getElementById("no-" + id)) Liga.ir("cockpit/no-" + id);
  });

  async function carregar() {
    try {
      const r = await fetch("/api/roadmap").then(r => r.json());
      ROADMAP = r.roadmap;
    } catch (e) {
      document.getElementById("mesa").innerHTML = '<p class="caption">Não consegui ler o roadmap (/api/roadmap). O servidor está no ar?</p>';
      return;
    }
    const sub = document.getElementById("hero-sub");
    if (sub) sub.textContent = ROADMAP.estagio + ". Atualizado em " + dataBr(ROADMAP.atualizado) + ".";
    renderMesa();
    Grafo.montar(ROADMAP);
    renderRadar();
    status();
  }

  carregar();
})();
