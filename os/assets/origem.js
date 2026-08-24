/* Ana OS: o selo de origem da ferramenta (ADR-0018).

   Uma língua só, em três páginas: Mapa da Integração, Mapa do SOP e Circuito da Ana.
   O selo responde uma pergunta: quem responde esta chamada da Ana.

   Três famílias:
     hospital  ->  API do Hospital        (verde)
     gh        ->  Global Health          (azul, a cor do ambiente homolog no DESIGN.md)
     nativa    ->  nativa da plataforma   (areia)

   Regra do ADR-0017, estendida pelo ADR-0018: a família NAO fica escrita em JSON
   curado. Ela é derivada do host da urlTemplate que a plataforma declara agora, lida
   de /api/tools pelo os/server.py. Ferramenta que não aparece naquela rota é nativa,
   porque não sai da plataforma.

   A concessão (se a Ana pode ou não chamar a ferramenta) é outra coisa e NAO é viva:
   a instância 1.4.1 não expõe rota REST de grants, então ela vem carimbada por script
   em os/dados/grants-medida.json e aparece sempre com a data da conferência ao lado.

   Uso:
     var O = await OrigemDaFerramenta.carregar();   // busca /api/tools e o carimbo
     O.selo("consultar_exames")   -> {familia, rotulo, classe, ...}
     O.cartao("consultar_exames") -> HTML do selo (mais o de concessão, se houver)
*/

var OrigemDaFerramenta = (function () {
  "use strict";

  /* Os hosts vivem aqui, e não em cada página, porque a família é a mesma nas três.
     Host novo cai em "desconhecido" de propósito: o mapa precisa aprender sobre ele
     em vez de fingir que sabe. */
  var FAMILIAS = [
    { id: "hospital", host: "api.hospitalsaomatheus.cloud", rotulo: "API do Hospital" },
    { id: "gh", host: "dem.agenda.globalhealth.mv", rotulo: "Global Health" }
  ];

  var VIVO = null;    /* resposta de /api/tools */
  var GRANTS = null;  /* carimbo de os/dados/grants-medida.json */

  function familiaDaUrl(url) {
    if (!url) return null;
    for (var i = 0; i < FAMILIAS.length; i++) {
      if (url.indexOf(FAMILIAS[i].host) !== -1) return FAMILIAS[i];
    }
    return null;
  }

  function toolViva(nome) {
    if (!VIVO || !VIVO.ok) return null;
    for (var i = 0; i < VIVO.tools.length; i++) {
      if (VIVO.tools[i].name === nome) return VIVO.tools[i];
    }
    return null;
  }

  /* O veredito de uma ferramenta. Nunca devolve valor guardado como se fosse de agora:
     sem leitura da instância, o selo diz que não sabe. */
  function selo(nome) {
    if (!nome) return null;
    if (!VIVO || !VIVO.ok) {
      return {
        familia: "sem-leitura", classe: "sem-leitura",
        rotulo: "não consegui ler a instância",
        detalhe: (VIVO && VIVO.erro) || "a página não alcançou a plataforma",
        tool: null, concedida: null
      };
    }
    var t = toolViva(nome);
    if (!t) {
      /* Ausência de /api/v1/tools é o sinal da terceira família: a chamada não sai
         da plataforma. É o caso de assign_label, kanban_move_card, handoff_to_human,
         private_note, get_current_time e search_knowledge. */
      return {
        familia: "nativa", classe: "nativa", rotulo: "nativa da plataforma",
        detalhe: "não sai da plataforma: é ferramenta da própria fazer.ai agents.",
        tool: null, concedida: concessao(nome)
      };
    }
    var f = familiaDaUrl(t.urlTemplate);
    if (!f) {
      return {
        familia: "desconhecida", classe: "desconhecida", rotulo: "destino novo, não mapeado",
        detalhe: "a ferramenta aponta para um host que este mapa ainda não conhece: " + (t.urlTemplate || ""),
        tool: t, concedida: concessao(nome)
      };
    }
    return {
      familia: f.id, classe: f.id, rotulo: f.rotulo,
      detalhe: t.urlTemplate || "", tool: t, concedida: concessao(nome)
    };
  }

  /* A concessão vem carimbada, não viva. Devolve null quando não há carimbo. */
  function concessao(nome) {
    if (!GRANTS || !GRANTS.ferramentas) return null;
    var g = GRANTS.ferramentas[nome];
    if (g === undefined) return null;
    return { concedida: !!g, conferido_em: GRANTS.conferido_em };
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function dataBr(iso) {
    var p = String(iso || "").split("-");
    return p.length === 3 ? p[2] + "/" + p[1] : String(iso || "");
  }

  /* O HTML do selo, para colar dentro do cartão de uma ferramenta. Quando a Ana não
     tem a ferramenta concedida, sai um segundo selo com a data da conferência: nunca
     sem data, porque esse dado não é de agora. */
  function cartao(nome) {
    var s = selo(nome);
    if (!s) return "";
    var h = '<span class="selo-origem ' + s.classe + '">' + esc(s.rotulo) + "</span>";
    if (s.concedida && s.concedida.concedida === false) {
      h += '<span class="selo-origem nao-concedida">a Ana não pode chamar'
        + (s.concedida.conferido_em ? " · conferido em " + esc(dataBr(s.concedida.conferido_em)) : "")
        + "</span>";
    }
    return h;
  }

  async function carregar() {
    try {
      VIVO = await fetch("/api/tools").then(function (r) { return r.json(); });
    } catch (e) {
      VIVO = { ok: false, erro: String(e) };
    }
    try {
      GRANTS = await fetch("dados/grants-medida.json").then(function (r) {
        return r.ok ? r.json() : null;
      });
    } catch (e) {
      GRANTS = null;
    }
    return API;
  }

  /* ADR-0020, clausula 5: selo so para ferramenta que existe. Existe = aparece em
     /api/v1/tools OU no carimbo de grants. Nome fora das duas fontes e ferramenta
     inexistente (ex.: "agendar_horario", que ainda nao nasceu), e nao ganha selo. */
  function conhecida(nome) {
    if (toolViva(nome)) return true;
    return !!(GRANTS && GRANTS.ferramentas && GRANTS.ferramentas[nome] !== undefined);
  }

  var API = {
    carregar: carregar,
    selo: selo,
    cartao: cartao,
    conhecida: conhecida,
    familias: FAMILIAS,
    vivo: function () { return VIVO; },
    grants: function () { return GRANTS; }
  };
  return API;
})();
