import os, shutil, sys, json

SRC = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]  # pasta de saida; basename = nome do projeto Vercel

APP = os.path.join(SRC, "gerado", "servicos-continuos-app.html")
PRINT = os.path.join(SRC, "gerado", "servicos-continuos-print.html")
PDF = os.path.join(SRC, "gerado", "CONTRATO-servicos-continuos.pdf")

if os.path.exists(OUT):
    shutil.rmtree(OUT)
os.makedirs(OUT)

# Campos preenchiveis da CONTRATANTE. Chave = placeholder (sem colchetes) usado no contrato.
# Assinatura eletronica (ClickSign etc.): representante, cargo, CPF, datas e cidade sao
# resolvidos pela plataforma, entao ficam fora do contrato e do formulario.
FIELDS = [
    ("RAZÃO SOCIAL DA CONTRATANTE", "Razão social da contratante", "Hospital ..."),
    ("NOME FANTASIA", "Nome fantasia", "Hospital de Clínicas ..."),
    ("CNPJ", "CNPJ", "00.000.000/0001-00"),
    ("ENDEREÇO COMPLETO", "Endereço completo", "Rua, nº, bairro, cidade/UF, CEP"),
]

# Valores ja conhecidos da CONTRATANTE: o site abre com o formulario e o contrato pre-preenchidos
# (editaveis; o que o usuario salvar no localStorage sobrepoe estes padroes).
DEFAULTS = {
    "RAZÃO SOCIAL DA CONTRATANTE": "AMA ASSISTENCIA MEDICA ALTERNATIVA LTDA - EPP",
    "NOME FANTASIA": "HOSPITAL DE CLINICAS SAO MATHEUS",
    "CNPJ": "00.937.991/0002-14",
    "ENDEREÇO COMPLETO": "Rua Silva Cardoso, 689, Bangu, Rio de Janeiro/RJ, CEP 21.810-031",
}
DEFAULTS_JS = "var VITTA_DEFAULTS = " + json.dumps(DEFAULTS, ensure_ascii=False) + ";"

# CTA dourado com halo pulsante (coeso com o "gold" do contrato) + estilos do modal.
CTA_CSS = """
<style>
@keyframes vittaHalo{
  0%{box-shadow:0 6px 18px rgba(154,116,22,.34),0 0 0 0 rgba(224,190,90,.60)}
  70%{box-shadow:0 6px 18px rgba(154,116,22,.34),0 0 0 13px rgba(224,190,90,0)}
  100%{box-shadow:0 6px 18px rgba(154,116,22,.34),0 0 0 0 rgba(224,190,90,0)}
}
.vitta-cta-dados{
  display:inline-flex;align-items:center;gap:9px;font-family:inherit;
  font-size:14.5px;font-weight:800;letter-spacing:.01em;color:#14261F;
  cursor:pointer;white-space:nowrap;margin-right:10px;padding:12px 22px;
  border-radius:999px;border:1px solid #8a6712;
  background:linear-gradient(135deg,#F0CE63 0%,#C79A28 55%,#A97F17 100%);
  animation:vittaHalo 2.4s ease-out infinite;
  transition:transform .18s ease,filter .18s ease;
}
.vitta-cta-dados:hover{transform:translateY(-1px) scale(1.04);filter:brightness(1.06)}
.vitta-cta-dados:active{transform:scale(.98)}
.vitta-cta-dados svg{width:17px;height:17px;flex:none}
@media (prefers-reduced-motion:reduce){.vitta-cta-dados{animation:none}}
</style>
"""

# index.html = versao de leitura. Botoes no header: preencher (CTA dourado) + ver contrato -> /contrato
btn_dados = ("<button type='button' onclick='vittaOpenForm()' class='vitta-cta-dados' "
             "aria-label='Preencher dados da contratante'>"
             "<svg viewBox='0 0 24 24' fill='none' stroke='#14261F' stroke-width='2.2' "
             "stroke-linecap='round' stroke-linejoin='round'><path d='M12 20h9'/>"
             "<path d='M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'/></svg>"
             "Preencher dados da contratante</button>")
btn = ("<a href='/contrato' style=\"display:inline-flex;align-items:center;gap:6px;font-size:12.5px;"
       "font-weight:600;color:#fff;background:#0E5B47;border:1px solid #0E5B47;padding:7px 13px;"
       "border-radius:999px;text-decoration:none;letter-spacing:.02em;white-space:nowrap\">"
       "Ver contrato na íntegra &rarr;</a>")

# Modal de preenchimento (HTML + CSS + JS). Salva em localStorage; o contrato le e preenche.
rows = "".join(
    "<label style=\"display:block;margin:0 0 11px\">"
    "<span style=\"display:block;font-size:12px;font-weight:600;color:#33413c;margin:0 0 4px\">{label}</span>"
    "<input data-tok=\"{tok}\" placeholder=\"{ph}\" "
    "style=\"width:100%;box-sizing:border-box;font-size:14px;padding:9px 11px;border:1px solid #cdd6d2;"
    "border-radius:8px;font-family:inherit\"></label>".format(label=lb, tok=tk, ph=ph)
    for tk, lb, ph in FIELDS
)

# Campo do marco de desempenho (KPI) da Ana - conceitualmente separado dos dados cadastrais.
marco = ("<div style=\"margin:16px 0 4px;padding-top:16px;border-top:1px solid #e6e1d6\">"
         "<div style=\"font-size:13px;font-weight:700;color:#0E5B47\">Marco de desempenho da Ana (KPI)</div>"
         "<div style=\"font-size:12px;color:#6b726c;margin:2px 0 9px;line-height:1.45\">Condição que faz a "
         "mensalidade subir para R$ 9.000. Opcional: pode ficar em branco para definir depois.</div>"
         "<textarea data-tok=\"marco a ser definido entre as Partes\" rows=\"2\" "
         "placeholder=\"ex.: atingir 70% de agendamentos concluídos pela Ana, sem intervenção humana, por 3 meses consecutivos\" "
         "style=\"width:100%;box-sizing:border-box;font-size:14px;padding:9px 11px;border:1px solid #cdd6d2;"
         "border-radius:8px;font-family:inherit;resize:vertical;line-height:1.45\"></textarea></div>")

FORM_BLOCK = CTA_CSS + """
<div id="vitta-form-ov" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(15,30,25,.45);
  align-items:flex-start;justify-content:center;overflow:auto;padding:32px 16px">
  <div role="dialog" aria-modal="true" style="background:#fff;max-width:560px;width:100%;border-radius:16px;
    box-shadow:0 24px 60px rgba(0,0,0,.28);font-family:Arial,Helvetica,sans-serif;overflow:hidden">
    <div style="background:#0E5B47;color:#fff;padding:16px 22px">
      <div style="font-size:16px;font-weight:700">Dados da contratante</div>
      <div style="font-size:12.5px;opacity:.9;margin-top:2px">Preencha e salve. Ao abrir o contrato, ele já vem preenchido para download.</div>
    </div>
    <div style="padding:20px 22px">__ROWS____MARCO__
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap">
        <button type="button" onclick="vittaClearForm()" style="font-size:13px;color:#8a1f1f;background:#fff;
          border:1px solid #e2c4c4;border-radius:999px;padding:9px 16px;cursor:pointer">Limpar</button>
        <button type="button" onclick="vittaCloseForm()" style="font-size:13px;color:#33413c;background:#fff;
          border:1px solid #cdd6d2;border-radius:999px;padding:9px 16px;cursor:pointer">Fechar</button>
        <button type="button" onclick="vittaSaveForm()" style="font-size:13px;color:#fff;background:#0E5B47;
          border:1px solid #0E5B47;border-radius:999px;padding:9px 18px;cursor:pointer;font-weight:600">Salvar dados</button>
      </div>
      <div id="vitta-form-msg" style="display:none;font-size:12.5px;color:#0E5B47;margin-top:12px;text-align:right"></div>
    </div>
  </div>
</div>
<script>
__DEFAULTS__
var VITTA_KEY = "vitta_contratante_v1";
function vittaData(){ try { return JSON.parse(localStorage.getItem(VITTA_KEY)) || {}; } catch(e){ return {}; } }
function vittaOpenForm(){
  var d = Object.assign({}, VITTA_DEFAULTS, vittaData());
  document.querySelectorAll('#vitta-form-ov [data-tok]').forEach(function(i){ i.value = d[i.getAttribute('data-tok')] || ''; });
  document.getElementById('vitta-form-msg').style.display = 'none';
  document.getElementById('vitta-form-ov').style.display = 'flex';
}
function vittaCloseForm(){ document.getElementById('vitta-form-ov').style.display = 'none'; }
function vittaSaveForm(){
  var d = {};
  document.querySelectorAll('#vitta-form-ov [data-tok]').forEach(function(i){
    var v = i.value.trim(); if(v) d[i.getAttribute('data-tok')] = v;
  });
  localStorage.setItem(VITTA_KEY, JSON.stringify(d));
  var m = document.getElementById('vitta-form-msg');
  m.textContent = 'Dados salvos. Abra "Ver contrato na íntegra" para baixar preenchido.';
  m.style.display = 'block';
  setTimeout(vittaCloseForm, 1400);
}
function vittaClearForm(){
  localStorage.removeItem(VITTA_KEY);
  document.querySelectorAll('#vitta-form-ov [data-tok]').forEach(function(i){ i.value=''; });
  var m = document.getElementById('vitta-form-msg'); m.textContent='Dados apagados.'; m.style.display='block';
}
document.getElementById('vitta-form-ov').addEventListener('click', function(e){ if(e.target===this) vittaCloseForm(); });
</script>
""".replace("__ROWS__", rows).replace("__MARCO__", marco).replace("__DEFAULTS__", DEFAULTS_JS)

app = open(APP, encoding="utf-8").read()
anchor = "<span class='spacer'></span><span class='tag-doc'>Leitura explicada</span>"
assert anchor in app, "ancora do header nao encontrada no app.html"
app = app.replace(anchor, anchor + btn_dados + btn, 1)
app = app.replace("</body>", FORM_BLOCK + "</body>", 1)
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(app)

# contrato.html = versao formal (igual ao PDF), com barra discreta que some na impressao
back = ('<style>.backbar{position:fixed;top:14px;left:14px;z-index:50;display:flex;gap:8px}'
        '.backbar a,.backbar button{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#0E5B47;background:#fff;'
        'border:1px solid #cfcfcf;border-radius:999px;padding:7px 14px;text-decoration:none;cursor:pointer;'
        'box-shadow:0 2px 8px rgba(0,0,0,.12)}.backbar a:hover,.backbar button:hover{background:#0E5B47;color:#fff;border-color:#0E5B47}'
        '#vitta-fill-note{position:fixed;top:14px;right:14px;z-index:50;font-family:Arial,Helvetica,sans-serif;'
        'font-size:12px;color:#0E5B47;background:#eaf3ef;border:1px solid #bfe0d3;border-radius:999px;padding:6px 13px;display:none}'
        '@media print{.backbar,#vitta-fill-note{display:none!important}}</style>'
        '<div class="backbar"><a href="/">&larr; Voltar à leitura</a>'
        '<button type="button" id="vitta-dl" onclick="window.print()">Baixar PDF</button></div>'
        '<div id="vitta-fill-note">Documento preenchido com os dados da contratante</div>')

# JS que preenche os placeholders do contrato com o que foi salvo na leitura
FILL_JS = ("""
<script>
(function(){
  """ + DEFAULTS_JS + """
  var VITTA_KEY = "vitta_contratante_v1";
  var saved = {}; try { saved = JSON.parse(localStorage.getItem(VITTA_KEY)) || {}; } catch(e){}
  var d = Object.assign({}, VITTA_DEFAULTS, saved);
  var pairs = Object.keys(d)
    .filter(function(k){ return d[k]; })
    .map(function(k){ return ["[" + k + "]", String(d[k])]; })
    .sort(function(a,b){ return b[0].length - a[0].length; });
  if(!pairs.length) return;
  var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  var hit = false, n;
  while((n = w.nextNode())){
    var t = n.nodeValue;
    if(t.indexOf('[') === -1) continue;
    for(var i=0;i<pairs.length;i++){ if(t.indexOf(pairs[i][0])!==-1){ t = t.split(pairs[i][0]).join(pairs[i][1]); hit = true; } }
    if(t !== n.nodeValue) n.nodeValue = t;
  }
  if(hit){ var note=document.getElementById('vitta-fill-note'); if(note) note.style.display='block'; }
})();
</script>
""")

pr = open(PRINT, encoding="utf-8").read()
pr = pr.replace("<body>", "<body>" + back, 1)
pr = pr.replace("</body>", FILL_JS + "</body>", 1)
open(os.path.join(OUT, "contrato.html"), "w", encoding="utf-8").write(pr)

shutil.copy(PDF, os.path.join(OUT, "contrato.pdf"))
open(os.path.join(OUT, "vercel.json"), "w", encoding="utf-8").write('{ "cleanUrls": true }\n')

print("Site montado em", OUT)
for f in sorted(os.listdir(OUT)):
    print("  ", f)
