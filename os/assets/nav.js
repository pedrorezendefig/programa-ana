/* Ana OS: a sidebar preta (design Ledger, ADR-0008). No index.html a barra lateral
   larga já vem no HTML (marca, abas, aplicações e status); aqui só se preenche o
   grupo Aplicações (os/dados/apps.json), ícone e nome, abrindo em aba nova. Nas
   páginas arquivadas a sidebar estreita nasce aqui: logo e aplicações com tooltip. As páginas arquivadas em os/arquivo/ carregam este
   mesmo script e ganham também a faixa do topo (trilha + selo de ambiente):
     <script src="../assets/nav.js" data-ambiente="local|homolog|producao" defer></script> */

(function () {
  function icone(caminho) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + caminho + "</svg>";
  }

  const ICONES = {
    agents: icone('<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>'),
    chatwoot: icone('<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-5 4v-4A2.5 2.5 0 0 1 4 14.5z"/>'),
    langfuse: icone('<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>'),
    coolify: icone('<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>'),
    telegram: icone('<path d="M21 3L10.5 13.5"/><path d="M21 3l-6.5 18-4-7.5L3 9.5z"/>'),
    padrao: icone('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>')
  };
  function iconeDe(app) {
    const n = (app.nome + " " + app.url).toLowerCase();
    if (/agents|fazer/.test(n)) return ICONES.agents;
    if (/chatwoot/.test(n)) return ICONES.chatwoot;
    if (/langfuse/.test(n)) return ICONES.langfuse;
    if (/coolify/.test(n)) return ICONES.coolify;
    if (/telegram|t\.me/.test(n)) return ICONES.telegram;
    return ICONES.padrao;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  const AMBIENTES = {
    homolog: { classe: "homolog", texto: "homolog GH · Oracle TST" },
    producao: { classe: "producao", texto: "retrato da produção (CSVs)" },
    local: { classe: "local", texto: "local" },
  };

  const scriptTag = document.currentScript;
  const ambiente = AMBIENTES[(scriptTag && scriptTag.dataset.ambiente) || "local"] || AMBIENTES.local;
  const noArquivo = location.pathname.indexOf("/arquivo/") !== -1;
  const prefixo = noArquivo ? "../" : "";

  /* no index, a barra lateral larga já existe: só falta o grupo Aplicações */
  const lateral = !noArquivo && document.querySelector(".lateral #side-apps");

  const side = document.createElement("nav");
  side.className = "os-sidebar";
  side.setAttribute("aria-label", "Ana OS: aplicações");
  side.innerHTML =
    '<a class="logo" href="' + prefixo + 'index.html" aria-label="Ana OS, o Cockpit">A</a>' +
    '<div class="paginas" id="side-apps"></div>';

  fetch(prefixo + "dados/apps.json").then(function (r) { return r.json(); }).then(function (d) {
    const alvo = document.getElementById("side-apps");
    if (!alvo) return;
    alvo.innerHTML = (d.apps || []).map(function (a) {
      return '<a class="item" href="' + esc(a.url) + '" target="_blank" rel="noopener" aria-label="' + esc(a.nome) + '">' +
        iconeDe(a) + '<span class="' + (lateral ? "nome" : "dica") + '">' + esc(a.nome) + "</span></a>";
    }).join("");
  }).catch(function () { /* sem a lista, a sidebar fica só com o logo */ });

  function inserir() {
    if (lateral) return;
    document.body.prepend(side);
    if (!noArquivo) return;
    const topo = document.createElement("header");
    topo.className = "os-topo";
    topo.innerHTML =
      '<span class="trilha"><strong>Ana OS</strong> · arquivo · ' + esc(document.title.replace(/^Ana OS\s*·\s*/, "")) + "</span>" +
      '<span class="ambiente ' + ambiente.classe + '">' + ambiente.texto + "</span>";
    side.insertAdjacentElement("afterend", topo);
  }
  if (document.body) inserir();
  else document.addEventListener("DOMContentLoaded", inserir);
})();
