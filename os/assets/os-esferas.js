/* Ana OS: a camada de operação por cima das quatro esferas (ADR-0030).

   As esferas são desenhadas pelos motores do Retrato da Ana (retrato.js, sop.js,
   fluxo.js, filtros.js, liga.js), alimentados por /api/retrato, montado ao vivo. Este
   script escuta "retrato:pronto" e acrescenta só o que o Retrato não mostra e um
   arquiteto precisa:
     O que a Ana faz hoje    os testes de cada capacidade, cada um com o seu cenário da
                             bancada e o botão que toca a conversa gravada no player
                             (player.js; as famílias saíram para os/arquivo/, ADR-0032)
     Onde ela busca          a chamada real de cada ferramenta (método e caminho, lidos
                             da plataforma) e a versão do Chatwoot
     Global Health           rodar cada elo na homologação (motor em cadeias-motor.js),
                             com entrada, saída, payload e resposta crua
   Nada aqui grava: o OS é só leitura (ADR-0028). */

(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  async function lerJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  function dataBr(iso) {
    const p = String(iso || "").split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : String(iso || "");
  }

  let DOC = null;

  document.addEventListener("retrato:pronto", function (e) {
    DOC = e.detail.doc;
    if (DOC.aviso) {
      const al = document.getElementById("aviso-plataforma");
      if (al) { al.hidden = false; al.textContent = "A plataforma não respondeu agora (" + DOC.aviso + "). As ferramentas aparecem sem origem até a próxima leitura."; }
    }
    montarTestes().catch(function (x) { console.error("testes", x); });
    montarChamadas().catch(function (x) { console.error("chamadas", x); });
    montarChatwoot().catch(function (x) { console.error("chatwoot", x); });
    montarGh();
    statusGh();
  });

  /* ============================================================ faz: os testes */
  async function montarTestes() {
    const comp = await lerJson("dados/comparacao.json");
    (comp.blocos || []).forEach(function (b) {
      (b.capacidades || []).forEach(function (c) {
        const card = document.getElementById("cap-" + c.id);
        const testes = c.testes || [];
        if (!card || !testes.length) return;
        card.insertAdjacentHTML("beforeend",
          '<details class="testes-cap"><summary><span class="zig">▶</span>' + testes.length + (testes.length === 1 ? " teste" : " testes") + "</summary>" +
          testes.map(teste).join("") + "</details>");
        card.dataset.texto = (card.dataset.texto || "") + " " + testes.map(function (t) { return t.envie + " " + t.espere; }).join(" ");
      });
    });
    if (window.Player) Player.decorar(document.getElementById("blocos-cap"));
  }

  function teste(t) {
    const chips = [];
    if (t.cenario) chips.push('<span class="chip mini ' + (t.manual ? "bloqueada" : "azul") + '">' + (t.manual ? "manual " : "cenário ") + esc(t.cenario) + "</span>");
    if (t.tag) chips.push('<span class="chip mini tag">' + esc(t.tag) + "</span>");
    if (t.raia) chips.push('<span class="chip mini bloqueada">' + esc(t.raia) + "</span>");
    if (t.handoff) chips.push('<span class="chip mini contorno">passa para humano</span>');
    if (t.chamada) chips.push('<code>' + esc(t.chamada) + "</code>");
    return '<div class="teste">' +
      '<div class="t-linha"><span class="t-rot">envie</span><span class="t-txt">' + esc(t.envie) + "</span></div>" +
      '<div class="t-linha"><span class="t-rot">espere</span><span class="t-txt">' + esc(t.espere) + "</span></div>" +
      (t.falha ? '<div class="t-linha"><span class="t-rot">falha se</span><span class="t-txt">' + esc(t.falha) + "</span></div>" : "") +
      (chips.length ? '<div class="t-chips">' + chips.join("") + "</div>" : "") +
      (t.obs ? '<p class="caption">' + esc(t.obs) + "</p>" : "") +
      (t.cenario && !t.manual && window.Player ? '<div class="t-tocar">' + Player.botao(t.cenario) + "</div>" : "") +
      "</div>";
  }

  /* ============================================================ busca: a chamada real */
  async function montarChamadas() {
    const r = await lerJson("/api/tools");
    const sel = document.getElementById("busca-vivo");
    if (!r.ok) { if (sel) sel.textContent = "Não li as ferramentas na plataforma agora: " + r.erro; return; }
    if (sel) sel.textContent = "Chamadas lidas da plataforma às " + String(r.lido_em || "").slice(11, 16) + ".";
    r.tools.forEach(function (t) {
      const card = document.getElementById("tool-" + t.name);
      if (!card) return;
      const url = String(t.urlTemplate || "").replace(/^https?:\/\//, "");
      const ancora = card.querySelector(".faz") || card.lastElementChild;
      ancora.insertAdjacentHTML("beforebegin",
        '<div class="chamada-viva"><span class="metodo ' + esc(String(t.method || "get").toLowerCase()) + '">' + esc(String(t.method || "GET").toUpperCase()) + "</span>" +
        '<code title="' + esc(t.urlTemplate || "") + '">' + esc(url) + "</code>" +
        '<span class="caption">ferramenta ' + esc(t.id) + (t.enabled === false ? " · desligada" : "") + (t.credentialRef ? " · credencial " + esc(t.credentialRef) : "") + "</span></div>");
    });
  }

  /* ============================================================ busca: a fronteira (Chatwoot) */
  async function montarChatwoot() {
    const alvo = document.getElementById("chatwoot");
    if (!alvo) return;
    const d = await lerJson("/api/chatwoot");
    if (!d.ok) { alvo.innerHTML = '<p class="caption">Não consegui ler as versões agora: ' + esc(d.erro) + "</p>"; return; }
    const atras = d.atrasadas || [];
    alvo.innerHTML =
      '<div class="linha" style="gap:8px;">' +
      '<span class="chip ' + (d.alerta ? "tag" : "feito") + '">' + (d.atraso === 0 ? "na versão corrente" : d.atraso + (d.atraso === 1 ? " versão atrás" : " versões atrás")) + "</span>" +
      (d.instalada_conhecida ? "" : '<span class="chip bloqueada">versão instalada fora da lista publicada</span>') +
      "</div>" +
      '<div class="card-interno" style="margin-top:12px;">' +
      '<div class="linha-dado"><span>Instalada na Ana</span><span class="v">' + esc(d.instalada) + "</span></div>" +
      '<div class="linha-dado"><span>Última publicada pela fazer.ai</span><span class="v">' + esc(d.ultima) + " · " + dataBr(d.ultima_em) + "</span></div>" +
      "</div>" +
      (atras.length ? '<div class="lig-chips" style="margin-top:10px;">' + atras.map(function (a) {
        return a.url ? '<a class="chip-link" href="' + esc(a.url) + '" target="_blank" rel="noopener">' + esc(a.tag) + " · " + dataBr(a.em) + "</a>" : '<span class="chip-link morto">' + esc(a.tag) + "</span>";
      }).join("") + "</div>" : "") +
      '<p class="caption" style="margin-top:10px;">Os dois números são lidos agora: a versão instalada vem do próprio Chatwoot, a última publicada vem das notas da fazer.ai. Atualizar é decisão do programa (ADR-0024).</p>';
  }

  /* ============================================================ global health: rodar */
  const CHIP = { ok: "feito", vazio: "azul", recusa: "selo-saas", bloqueado: "bloqueada", regra: "contorno", conversa: "pendente", falha: "tag" };

  function idElo(letra, id) { return "elo-" + String(letra).toLowerCase() + "-" + String(id).slice(1); }

  async function statusGh() {
    const el = document.getElementById("gh-status");
    if (!el) return;
    try {
      const r = await lerJson("/api/status");
      if (r.token_valido) el.innerHTML = '<span class="chip feito">homologação conectada · ' + r.latencia_ms + "ms</span>";
      else if (r.gh_alcancavel) el.innerHTML = '<span class="chip tag">a agenda responde, mas o token não validou</span>';
      else el.innerHTML = '<span class="chip tag">agenda fora de alcance</span>';
    } catch (x) { el.innerHTML = '<span class="chip tag">servidor do OS não respondeu</span>'; }
  }

  function montarGh() {
    if (!window.CadeiasMotor) return;
    CadeiasMotor.cadeias.forEach(function (c) {
      const letra = c.letra.toLowerCase();
      const card = document.getElementById("cad-" + letra);
      if (!card) return;
      const topo = card.querySelector(".cadeia-topo");
      topo.insertAdjacentHTML("beforeend",
        '<div class="op-cadeia"><div class="botoes">' +
        '<button class="btn mini" type="button" data-recomecar="' + letra + '">Recomeçar</button>' +
        '<button class="btn mini principal" type="button" data-rodar-cadeia="' + letra + '">Rodar tudo</button></div>' +
        (c.escrita ? '<span class="caption nota-escrita">' + esc(c.escrita) + "</span>" : "") +
        '<p class="caption placar-cadeia" hidden></p></div>');
      c.elos.forEach(function (e) {
        const el = document.getElementById(idElo(c.letra, e.id));
        if (!el) return;
        const lado = el.querySelector(".lado.agenda");
        if (!lado) return;
        lado.insertAdjacentHTML("beforeend", '<div class="operacao" data-letra="' + letra + '" data-elo="' + esc(e.id) + '"></div>');
      });
      renderCadeia(letra);
    });
    document.addEventListener("click", function (ev) {
      const b = ev.target.closest("[data-rodar-cadeia]");
      if (b) { rodarCadeia(b.dataset.rodarCadeia, b); return; }
      const e = ev.target.closest("[data-rodar-elo]");
      if (e) { rodarElo(e.dataset.letra, e.dataset.rodarElo); return; }
      const r = ev.target.closest("[data-recomecar]");
      if (r) recomecar(r.dataset.recomecar);
    });
  }

  function renderCadeia(letra) {
    const c = CadeiasMotor.porLetra(letra);
    c.elos.forEach(function (e) { renderOp(letra, e.id); });
  }

  function renderOp(letra, id) {
    const c = CadeiasMotor.porLetra(letra), e = CadeiasMotor.elo(letra, id);
    const box = document.querySelector('.operacao[data-letra="' + letra + '"][data-elo="' + id + '"]');
    if (!box || !e) return;
    const res = CadeiasMotor.resultado(letra, id);
    let h = "";
    if (e.soConversa) {
      h += '<div class="op-cab"><span class="chip mini pendente">só conversa</span><span class="caption">fora da Global Health: a resposta vem de outra origem</span></div>';
      box.innerHTML = h; return;
    }
    h += '<div class="op-cab"><span class="metodo ' + esc(e.metodo.toLowerCase()) + '">' + esc(e.metodo) + '</span><code class="path">' + esc(e.caminho) + "</code></div>";
    const entradas = CadeiasMotor.entradas(letra, id);
    if (entradas.length) {
      h += '<div class="io"><span class="micro">entrada</span>' + entradas.map(function (x) {
        const tem = x.valor !== undefined && x.valor !== null && x.valor !== "";
        return '<div class="io-linha"><span class="campo">' + esc(x.campo) + '</span><span class="valor' + (tem ? "" : " falta") + '">' + (tem ? esc(x.valor) : "ainda não veio") + '</span><span class="de">de: ' + esc(x.de) + '</span><span class="porque">' + esc(x.porque) + "</span></div>";
      }).join("") + "</div>";
    }
    const motivo = e.regra ? null : CadeiasMotor.motivo(letra, id);
    h += '<div class="acoes">';
    if (e.regra) {
      h += '<span class="chip mini contorno">não roda daqui</span><span class="caption">a finalização se prova na Bancada, com a prova no banco</span>';
    } else if (res && res.estado !== "bloqueado") {
      const chip = CadeiasMotor.ESTADO_CHIP[res.estado] || { texto: res.estado };
      h += '<span class="chip mini ' + (CHIP[res.estado] || "bloqueada") + '">' + esc(chip.texto) + "</span>" +
        '<span class="detalhe">' + esc(res.detalhe) + "</span>" +
        (res.resposta && res.resposta.latencia_ms ? '<span class="caption">' + res.resposta.latencia_ms + "ms</span>" : "") +
        '<button class="btn mini" type="button" data-letra="' + letra + '" data-rodar-elo="' + esc(id) + '"' + (motivo ? " disabled" : "") + ">Rodar de novo</button>";
    } else if (motivo) {
      h += '<span class="chip mini bloqueada">bloqueado</span><span class="caption">' + esc(motivo) + "</span>";
    } else {
      h += '<button class="btn mini principal" type="button" data-letra="' + letra + '" data-rodar-elo="' + esc(id) + '">Rodar elo</button>';
    }
    h += "</div>";
    if (res && res.saidas && res.saidas.length) {
      h += '<div class="io"><span class="micro">saída que segue</span>' + res.saidas.map(function (s) {
        return '<div class="io-linha"><span class="campo">' + esc(s.campo) + '</span><span class="valor">' + esc(s.valor) + '</span><span class="de">para: ' + esc(s.para) + '</span><span class="porque">' + esc(s.porque) + "</span></div>";
      }).join("") + "</div>";
    }
    if (res && res.resposta && res.resposta.pedido) {
      const p = res.resposta.pedido;
      h += "<details><summary>o que foi enviado</summary><pre>" + esc(p.method + " " + p.path + "\n" + JSON.stringify({ query: p.query, body: p.body }, null, 2)) + "</pre></details>";
    }
    if (res && res.resposta && res.resposta.corpo_cru) {
      const corpo = res.resposta.corpo_cru.length > 2500 ? res.resposta.corpo_cru.slice(0, 2500) + " (...)" : res.resposta.corpo_cru;
      h += "<details><summary>a resposta crua da agenda</summary><pre>" + esc("HTTP " + res.resposta.status + "\n" + corpo) + "</pre></details>";
    }
    box.innerHTML = h;

    /* o desenho da cadeia e a conversa refletem o resultado */
    const no = document.querySelector("#cad-" + letra + "-palco .fno[data-id=\"" + idElo(c.letra, id) + "\"]");
    if (no) {
      no.classList.remove("op-ok", "op-falha", "op-recusa", "op-vazio");
      if (res && res.estado !== "bloqueado") no.classList.add("op-" + (res.estado === "ok" ? "ok" : res.estado === "falha" ? "falha" : res.estado === "recusa" ? "recusa" : "vazio"));
    }
    const viva = CadeiasMotor.falaViva(letra, id);
    const elo = document.getElementById(idElo(c.letra, id));
    if (viva && elo) {
      const baloes = elo.querySelectorAll(".chat .balao.ana");
      const b = baloes[baloes.length - 1];
      if (b) { b.classList.add("vivo"); b.innerHTML = '<div class="quem">Ana · montada com a resposta real</div>' + esc(viva); }
    }
  }

  async function rodarElo(letra, id) {
    const box = document.querySelector('.operacao[data-letra="' + letra + '"][data-elo="' + id + '"] .acoes');
    if (box) box.innerHTML = '<span class="chip mini pendente">rodando...</span>';
    await CadeiasMotor.rodar(letra, id);
    renderCadeia(letra); /* os elos seguintes ganham as entradas novas */
  }

  async function rodarCadeia(letra, botao) {
    const c = CadeiasMotor.porLetra(letra);
    botao.disabled = true;
    const placarEl = botao.closest(".op-cadeia").querySelector(".placar-cadeia");
    placarEl.hidden = true;
    for (let i = 0; i < c.elos.length; i++) await rodarElo(letra, c.elos[i].id);
    const p = CadeiasMotor.placar(letra);
    const partes = [];
    if (p.ok) partes.push("<strong>" + p.ok + " funcionou</strong>");
    if (p.vazio) partes.push(p.vazio + " vazio esperado");
    if (p.recusa) partes.push(p.recusa + " recusa correta");
    if (p.bloqueado) partes.push(p.bloqueado + " bloqueado");
    if (p.regra) partes.push(p.regra + " não roda daqui");
    if (p.conversa) partes.push(p.conversa + " só conversa");
    if (p.falha) partes.push("<strong>" + p.falha + " falha real</strong>");
    placarEl.innerHTML = "Placar: " + partes.join(" · ");
    placarEl.hidden = false;
    botao.disabled = false;
  }

  function recomecar(letra) {
    CadeiasMotor.recomecar(letra);
    const card = document.getElementById("cad-" + letra);
    if (card) {
      const p = card.querySelector(".placar-cadeia");
      if (p) p.hidden = true;
      card.querySelectorAll(".fno").forEach(function (n) { n.classList.remove("op-ok", "op-falha", "op-recusa", "op-vazio"); });
    }
    renderCadeia(letra);
  }
})();
