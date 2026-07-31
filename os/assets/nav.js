/* Ana OS: navegação comum. Cada página inclui:
     <script src="assets/nav.js" data-ambiente="local|homolog|producao" defer></script>
   e o header é injetado no topo do <body>. Adicionar página = 1 linha em PAGINAS. */

(function () {
  const PAGINAS = [
    { arquivo: "index.html", rotulo: "Cockpit" },
    { arquivo: "arquitetura.html", rotulo: "Arquitetura" },
    { arquivo: "apis.html", rotulo: "Mapa das APIs" },
    { arquivo: "bancada.html", rotulo: "Bancada" },
    { arquivo: "roteiro.html", rotulo: "Roteiro" },
    { arquivo: "atlas.html", rotulo: "Atlas" },
    { arquivo: "absorcao.html", rotulo: "Absorção" },
    { arquivo: "insights.html", rotulo: "Insights" },
    { arquivo: "tst.html", rotulo: "Conexão TST" },
    { arquivo: "biblioteca.html", rotulo: "Biblioteca" },
  ];
  const AMBIENTES = {
    homolog: { classe: "homolog", texto: "homolog GH · Oracle TST" },
    producao: { classe: "producao", texto: "retrato da produção (CSVs)" },
    local: { classe: "local", texto: "local" },
  };

  const scriptTag = document.currentScript;
  const ambiente = AMBIENTES[(scriptTag && scriptTag.dataset.ambiente) || "local"] || AMBIENTES.local;
  const atual = (location.pathname.split("/").pop() || "index.html");

  const nav = document.createElement("nav");
  nav.className = "os-nav";
  nav.innerHTML =
    '<a class="marca" href="index.html"><span class="glifo">A</span>Ana OS</a>' +
    '<div class="links">' +
    PAGINAS.map(function (p) {
      const ativo = p.arquivo === atual ? " ativo" : "";
      return '<a class="' + ativo.trim() + '" href="' + p.arquivo + '">' + p.rotulo + "</a>";
    }).join("") +
    "</div>" +
    '<span class="ambiente ' + ambiente.classe + '">' + ambiente.texto + "</span>";

  function inserir() { document.body.prepend(nav); }
  if (document.body) inserir();
  else document.addEventListener("DOMContentLoaded", inserir);
})();
