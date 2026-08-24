/* Ana OS: mini-Markdown dos trechos literais do prompt (enriquecimento da OS19).
   Os trechos guardados em sop-fluxo.json e circuito.json sao texto cru do prompt,
   com **negrito**, `codigo`, "> " de citacao e "#### " de titulo. Este modulo
   renderiza essa prosa e transforma referencias em link:
     - `nome_de_tool`  -> resolve.tool(nome)  (ex.: circuito.html#tool-nome)
     - Secao 2.3 / Secoes 3 e 10 -> resolve.secao(numero)
     - Regra 9 / Regra Global 13 -> resolve.regra(numero)
   Cada resolve.* devolve um href (string) ou null (fica texto puro). Os <a>
   saem com classes md-tool / md-sec / md-regra e data-* correspondentes, para a
   pagina interceptar o clique quando o destino for interno. Nao ha conteudo de
   usuario aqui: tudo vem dos JSON curados do repositorio. */

(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* prosa de uma linha (ja sem os marcadores de bloco) */
  function inline(txt, resolve) {
    var r = resolve || {};
    var html = esc(txt);

    /* codigo primeiro, para o negrito nao entrar dentro do <code> */
    html = html.replace(/`([^`\n]+)`/g, function (m, corpo) {
      var code = "<code>" + corpo + "</code>";
      var href = r.tool ? r.tool(corpo) : null;
      return href
        ? '<a class="md-link md-tool" data-tool="' + corpo + '" href="' + esc(href) + '">' + code + "</a>"
        : code;
    });

    html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");

    if (r.secao) {
      /* o numero de secao e "2", "2.3.1" ou "2.4A"; o ponto final da frase fica de fora */
      var NUM = "[0-9][0-9A-Za-z]*(?:\\.[0-9A-Za-z]+)*";
      html = html.replace(
        new RegExp("(Seç(?:ão|ões)\\s+)((?:" + NUM + ")(?:(?:,\\s*|\\s+e\\s+)" + NUM + ")*)", "g"),
        function (m, prefixo, numeros) {
          var ligados = numeros.replace(new RegExp(NUM, "g"), function (n) {
            var href = r.secao(n);
            return href
              ? '<a class="md-link md-sec" data-sec="' + n + '" href="' + esc(href) + '">' + n + "</a>"
              : n;
          });
          return prefixo + ligados;
        }
      );
    }

    if (r.regra) {
      html = html.replace(/(Regras?\s+Globa(?:l|is)\s+|Regra\s+)(\d+)/g, function (m, prefixo, n) {
        var href = r.regra(n);
        return href
          ? prefixo + '<a class="md-link md-regra" data-regra="' + n + '" href="' + esc(href) + '">' + n + "</a>"
          : m;
      });
    }

    return html;
  }

  /* trecho literal completo (multilinha, vai dentro de um bloco com pre-wrap) */
  function trecho(txt, resolve) {
    return String(txt == null ? "" : txt).split("\n").map(function (linha) {
      var m;
      if (/^```/.test(linha)) {
        /* cerca de codigo do prompt: fica no texto (fidelidade), mas discreta */
        return '<span class="md-fence">' + esc(linha) + "</span>";
      }
      if ((m = linha.match(/^>\s?(.*)$/))) {
        return '<span class="md-quote">' + inline(m[1], resolve) + "</span>";
      }
      if ((m = linha.match(/^#{2,6}\s+(.*)$/))) {
        return '<strong class="md-h">' + inline(m[1], resolve) + "</strong>";
      }
      return inline(linha, resolve);
    }).join("\n");
  }

  window.MdProsa = { inline: inline, trecho: trecho };
})();
