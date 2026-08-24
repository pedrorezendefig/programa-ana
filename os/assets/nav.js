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
    { arquivo: "integracao.html", rotulo: "Mapa da Integração",
      svg: icone('<rect x="2.5" y="6" width="6.5" height="12" rx="2"/><rect x="15" y="6" width="6.5" height="12" rx="2"/><path d="M9.5 9.8h5M12.8 7.9l2 1.9-2 1.9"/><path d="M14.5 14.2h-5M11.7 12.3l-2 1.9 2 1.9"/>') },
    { arquivo: "comparacao.html", rotulo: "Comparação",
      svg: icone('<path d="M12 3v18"/><path d="M6.5 7.5H4a1 1 0 0 0-.94 1.34L5 14a2.6 2.6 0 0 0 4.9 0l1.96-5.16A1 1 0 0 0 10.92 7.5H8.5"/><path d="M15.5 7.5H13a1 1 0 0 0-.94 1.34"/><path d="M20 7.5h-2.5"/><path d="M14 14l1.96-5.16A1 1 0 0 1 16.9 7.5"/><path d="M14 14a2.6 2.6 0 0 0 4.9 0l1.96-5.16A1 1 0 0 0 19.92 7.5"/>') },
    { arquivo: "testes.html", rotulo: "Testes manuais",
      svg: icone('<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8.5 3.5v2.5h7V3.5"/><path d="M8 11l2.2 2.2L14.5 9"/><path d="M8.5 17h7"/>') },
    { arquivo: "familias.html", rotulo: "Famílias da bancada",
      svg: icone('<path d="M9.5 3.5h5M10.5 3.5v4.8L5.6 16.6a2.6 2.6 0 0 0 2.3 3.9h8.2a2.6 2.6 0 0 0 2.3-3.9L13.5 8.3V3.5"/><path d="M7.5 14.5h9"/>') },
    { arquivo: "bancada.html", rotulo: "Bancada",
      svg: icone('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7.5 9.5l3 2.5-3 2.5M13 15h3.5"/>') },
    { arquivo: "cadeias.html", rotulo: "Cadeias",
      svg: icone('<circle cx="5" cy="12" r="2.6"/><circle cx="12" cy="5" r="2.6"/><circle cx="12" cy="19" r="2.6"/><circle cx="19" cy="12" r="2.6"/><path d="M7 10.2 10 6.8M14 6.8l3 3.4M7 13.8l3 3.4M14 17.2l3-3.4"/>') },
  ];
  const AMBIENTES = {
    homolog: { classe: "homolog", texto: "homolog GH · Oracle TST" },
    producao: { classe: "producao", texto: "retrato da produção (CSVs)" },
    local: { classe: "local", texto: "local" },
  };

  const scriptTag = document.currentScript;
  const ambiente = AMBIENTES[(scriptTag && scriptTag.dataset.ambiente) || "local"] || AMBIENTES.local;
  const atual = (location.pathname.split("/").pop() || "index.html");
  // Paginas arquivadas (ADR-0019) vivem em os/arquivo/: os links do menu sobem um nivel.
  const noArquivo = location.pathname.indexOf("/arquivo/") !== -1;
  const prefixo = noArquivo ? "../" : "";
  const paginaAtual = PAGINAS.find(function (p) { return p.arquivo === atual; });

  const side = document.createElement("nav");
  side.className = "os-sidebar";
  side.setAttribute("aria-label", "Navegação do Ana OS");
  side.innerHTML =
    '<a class="logo" href="' + prefixo + 'index.html" aria-label="Ana OS">A</a>' +
    '<div class="paginas">' +
    PAGINAS.map(function (p) {
      const ativo = p.arquivo === atual ? " ativo" : "";
      return '<a class="item' + ativo + '" href="' + prefixo + p.arquivo + '" aria-label="' + p.rotulo + '">' +
        p.svg + '<span class="dica">' + p.rotulo + "</span></a>";
    }).join("") +
    "</div>";

  const topo = document.createElement("header");
  topo.className = "os-topo";
  topo.innerHTML =
    '<span class="trilha"><strong>Ana OS</strong> · ' +
    (noArquivo ? "arquivo · " : "") +
    (paginaAtual ? paginaAtual.rotulo : atual) + "</span>" +
    '<span class="ambiente ' + ambiente.classe + '">' + ambiente.texto + "</span>";

  function inserir() { document.body.prepend(topo); document.body.prepend(side); }
  if (document.body) inserir();
  else document.addEventListener("DOMContentLoaded", inserir);
})();
