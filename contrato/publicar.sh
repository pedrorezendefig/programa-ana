#!/usr/bin/env bash
#
# Publica o contrato do Hospital Sao Matheus na Vercel, sempre no MESMO link:
#   https://vitta-contrato-hospital-sao-matheus.vercel.app
#
# Uso: edite os arquivos em  fonte/  e rode:   ./publicar.sh
#
set -e
cd "$(dirname "$0")"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SCOPE="pedrocloserj-3582s-projects"
SITE="$(mktemp -d)/vitta-contrato-hospital-sao-matheus"

echo "1/4  Gerando os HTMLs a partir de fonte/ ..."
python3 build.py servicos

echo "2/4  Gerando o PDF (Chrome, ~10s) ..."
PRINT_URL="file://$(python3 -c 'import urllib.parse,os,sys; print(urllib.parse.quote(os.path.abspath(sys.argv[1])))' gerado/servicos-continuos-print.html)"
perl -e 'alarm shift; exec @ARGV' 30 "$CHROME" --headless=new --disable-gpu --no-sandbox \
  --no-pdf-header-footer --user-data-dir="$(mktemp -d)" \
  --print-to-pdf="$PWD/gerado/CONTRATO-servicos-continuos.pdf" "$PRINT_URL" >/dev/null 2>&1 || true
pkill -f "Google Chrome.*headless" >/dev/null 2>&1 || true

echo "3/4  Montando o site (index = leitura, /contrato = formal) ..."
python3 build_site.py "$SITE"

echo "4/4  Publicando na Vercel ..."
vercel deploy "$SITE" --prod --yes --scope "$SCOPE"

echo ""
echo "Pronto! Link (o mesmo de sempre):"
echo "  https://vitta-contrato-hospital-sao-matheus.vercel.app"
