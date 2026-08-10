/* Ana OS: navegação comum (design Ledger, ADR-0008). Cada página inclui:
     <script src="assets/nav.js" data-ambiente="local|homolog|producao" defer></script>
   O script injeta a sidebar preta de ícones e a faixa do topo (trilha + selo de
   ambiente). Adicionar página = 1 entrada em PAGINAS (ícone SVG stroke 1.7). */

(function () {
  function icone(caminho) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + caminho + "</svg>";
  }

  const PAGINAS = [
    { arquivo: "index.html", rotulo: "Cockpit",
      svg: icone('<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>') },
    { arquivo: "roadmap.html", rotulo: "Roadmap (grafo)",
      svg: icone('<circle cx="5.5" cy="12" r="2.5"/><circle cx="18.5" cy="5.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/><path d="M7.8 10.8 16.2 6.6M7.8 13.2l8.4 4.2"/>') },
    { arquivo: "arquitetura.html", rotulo: "Arquitetura",
      svg: icone('<path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z"/><path d="M4 12.5L12 17l8-4.5"/><path d="M4 17L12 21.5 20 17"/>') },
    { arquivo: "sop.html", rotulo: "Mapa do SOP",
      svg: icone('<path d="M3.5 6.5h5M15.5 6.5h5M3.5 17.5h5M15.5 17.5h5"/><circle cx="12" cy="6.5" r="2.2"/><circle cx="12" cy="17.5" r="2.2"/><path d="M12 8.7v6.6"/>') },
    { arquivo: "circuito.html", rotulo: "Circuito da Ana",
      svg: icone('<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9.5 7V3.5M14.5 7V3.5M9.5 20.5V17M14.5 20.5V17M7 9.5H3.5M7 14.5H3.5M20.5 9.5H17M20.5 14.5H17"/>') },
    { arquivo: "apis.html", rotulo: "Mapa das APIs",
      svg: icone('<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>') },
    { arquivo: "bancada.html", rotulo: "Bancada",
      svg: icone('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7.5 9.5l3 2.5-3 2.5M13 15h3.5"/>') },
    { arquivo: "roteiro.html", rotulo: "Roteiro",
      svg: icone('<path d="M4 6.5l1.5 1.5L8.5 5M4 12.5l1.5 1.5L8.5 11M4 18.5L5.5 20 8.5 17"/><path d="M12 6.5h8M12 12.5h8M12 18.5h8"/>') },
    { arquivo: "cadeias.html", rotulo: "Cadeias",
      svg: icone('<circle cx="5" cy="12" r="2.6"/><circle cx="12" cy="5" r="2.6"/><circle cx="12" cy="19" r="2.6"/><circle cx="19" cy="12" r="2.6"/><path d="M7 10.2 10 6.8M14 6.8l3 3.4M7 13.8l3 3.4M14 17.2l3-3.4"/>') },
    { arquivo: "atlas.html", rotulo: "Atlas",
      svg: icone('<ellipse cx="12" cy="5.5" rx="8" ry="2.8"/><path d="M4 5.5v13c0 1.55 3.58 2.8 8 2.8s8-1.25 8-2.8v-13"/><path d="M4 12c0 1.55 3.58 2.8 8 2.8s8-1.25 8-2.8"/>') },
    { arquivo: "absorcao.html", rotulo: "Absorção",
      svg: icone('<path d="M12 3v10.5M8.5 10L12 13.5 15.5 10"/><path d="M3.5 14v3.5A2.5 2.5 0 0 0 6 20h12a2.5 2.5 0 0 0 2.5-2.5V14"/>') },
    { arquivo: "insights.html", rotulo: "Insights",
      svg: icone('<path d="M4 20V10M10 20V4M16 20v-7M21.5 20H3"/>') },
    { arquivo: "tst.html", rotulo: "Conexão TST",
      svg: icone('<path d="M9 7V3M15 7V3"/><path d="M6.5 7h11v4a5.5 5.5 0 0 1-11 0V7z"/><path d="M12 16.5V21"/>') },
    { arquivo: "biblioteca.html", rotulo: "Biblioteca",
      svg: icone('<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17.5H6.5A2.5 2.5 0 0 0 4 22V4.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>') },
  ];
  const AMBIENTES = {
    homolog: { classe: "homolog", texto: "homolog GH · Oracle TST" },
    producao: { classe: "producao", texto: "retrato da produção (CSVs)" },
    local: { classe: "local", texto: "local" },
  };

  const scriptTag = document.currentScript;
  const ambiente = AMBIENTES[(scriptTag && scriptTag.dataset.ambiente) || "local"] || AMBIENTES.local;
  const atual = (location.pathname.split("/").pop() || "index.html");
  const paginaAtual = PAGINAS.find(function (p) { return p.arquivo === atual; });

  const side = document.createElement("nav");
  side.className = "os-sidebar";
  side.setAttribute("aria-label", "Navegação do Ana OS");
  side.innerHTML =
    '<a class="logo" href="index.html" aria-label="Ana OS">A</a>' +
    '<div class="paginas">' +
    PAGINAS.map(function (p) {
      const ativo = p.arquivo === atual ? " ativo" : "";
      return '<a class="item' + ativo + '" href="' + p.arquivo + '" aria-label="' + p.rotulo + '">' +
        p.svg + '<span class="dica">' + p.rotulo + "</span></a>";
    }).join("") +
    "</div>";

  const topo = document.createElement("header");
  topo.className = "os-topo";
  topo.innerHTML =
    '<span class="trilha"><strong>Ana OS</strong> · ' +
    (paginaAtual ? paginaAtual.rotulo : atual) + "</span>" +
    '<span class="ambiente ' + ambiente.classe + '">' + ambiente.texto + "</span>";

  function inserir() { document.body.prepend(topo); document.body.prepend(side); }
  if (document.body) inserir();
  else document.addEventListener("DOMContentLoaded", inserir);
})();
