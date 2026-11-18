#!/usr/bin/env bash
# Pubblica la copia corrente dell'app sull'ambiente di TEST
# (https://vincenzoassenza-blip.github.io/pergioco-test/).
# Non tocca l'app ufficiale né il database di produzione.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Se lo script vive nel repo di produzione, la sorgente è ROOT;
# la destinazione è un checkout del repo pergioco-test.
PROD_HINT="$ROOT"
if grep -q 'window.PERGIOCO_TEST=true' "$ROOT/config.js" 2>/dev/null && [ -f "$ROOT/../pergioco-test/config.js" ] && [ "$ROOT" != "$(cd "$ROOT/../pergioco-test" && pwd)" ]; then
  :
fi

SRC="$ROOT"
# Se siamo nel repo di produzione (config senza flag TEST, o remoto pergioco),
# sincronizziamo verso un checkout di pergioco-test.
REMOTE_URL="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
if [[ "$REMOTE_URL" == *"/pergioco.git"* ]] && [[ "$REMOTE_URL" != *"/pergioco-test.git"* ]]; then
  DEST="${PERGIOCO_TEST_DIR:-/workspace/pergioco-test}"
  if [ ! -d "$DEST/.git" ]; then
    git clone "https://github.com/vincenzoassenza-blip/pergioco-test.git" "$DEST"
  fi
  git -C "$DEST" fetch origin
  git -C "$DEST" checkout main
  git -C "$DEST" pull --ff-only origin main || true
  SRC="$ROOT"
else
  DEST="$ROOT"
  SRC="$ROOT"
fi

if [ "${SKIP_TESTS:-0}" != "1" ]; then
  echo "Eseguo la suite (SKIP_TESTS=1 per saltarla se è già verde)…"
  (cd "$SRC" && bash scripts/test-all.sh)
fi

# Sincronizza i file dall'albero sorgente, senza sovrascrivere
# la configurazione di test né reintrodurre il dominio di produzione.
if [ "$SRC" != "$DEST" ]; then
  # Salva la config di test già presente
  TMPCFG="$(mktemp)"
  if [ -f "$DEST/config.js" ] && grep -q 'PERGIOCO_TEST' "$DEST/config.js"; then
    cp "$DEST/config.js" "$TMPCFG"
  else
    rm -f "$TMPCFG"
    TMPCFG=""
  fi
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete \
      --exclude '.git/' \
      --exclude 'CNAME' \
      --exclude 'README.md' \
      --exclude 'node_modules/' \
      --exclude 'playwright-report/' \
      --exclude 'test-results/' \
      --exclude 'config.js' \
      "$SRC"/ "$DEST"/
  else
    python3 - "$SRC" "$DEST" << 'COPY'
import os, shutil, sys
src, dst = sys.argv[1], sys.argv[2]
skip = {'.git', 'CNAME', 'README.md', 'node_modules', 'playwright-report', 'test-results', 'config.js'}
# rimuovi dal dest i file non più presenti in src (come rsync --delete),
# conservando .git, CNAME e config.js
for root, dirs, files in os.walk(dst, topdown=True):
    rel = os.path.relpath(root, dst)
    if rel == '.':
        dirs[:] = [d for d in dirs if d not in skip]
    elif rel.split(os.sep)[0] in skip:
        dirs[:] = []; continue
    for name in files:
        if name in skip and rel == '.':
            continue
        path = os.path.join(root, name)
        relf = os.path.relpath(path, dst)
        if not os.path.exists(os.path.join(src, relf)):
            os.remove(path)
for root, dirs, files in os.walk(src, topdown=True):
    rel = os.path.relpath(root, src)
    if rel == '.':
        dirs[:] = [d for d in dirs if d not in skip]
    elif rel.split(os.sep)[0] in skip:
        dirs[:] = []; continue
    dest_root = dst if rel == '.' else os.path.join(dst, rel)
    os.makedirs(dest_root, exist_ok=True)
    for name in files:
        if name in skip and rel == '.':
            continue
        s, d = os.path.join(root, name), os.path.join(dest_root, name)
        shutil.copy2(s, d)
COPY
  fi
  rm -f "$DEST/CNAME"
  if [ -n "$TMPCFG" ] && [ -f "$TMPCFG" ]; then
    mv "$TMPCFG" "$DEST/config.js"
  fi
fi

python3 - "$DEST" << 'PY'
import json, sys
from pathlib import Path
dst=Path(sys.argv[1])

# titoli e manifesto
html=(dst/'index.html').read_text()
# CSP: il meta di produzione consente solo il progetto ufficiale; sul test
# va sostituito, altrimenti il login fallisce (E-LOGIN-01).
html=html.replace(
    'egmrtcezrjyoynlhknpz.supabase.co',
    'oosqsjbtlixufqscdwou.supabase.co')
if 'egmrtcezrjyoynlhknpz' in html:
    sys.exit("index.html di test contiene ancora l'host di produzione (CSP): mi fermo")
if 'oosqsjbtlixufqscdwou.supabase.co' not in html:
    sys.exit("index.html di test senza CSP verso il progetto di test: mi fermo")
html=html.replace('<title>PerGioco – Gioca, prenota, condividi</title>',
                  '<title>PerGioco TEST – ambiente di prova</title>')
html=html.replace('content="PerGioco">', 'content="PerGioco TEST">')
html=html.replace('<div class="brand">PerGioco</div>','<div class="brand">PerGioco TEST</div>')
if 'pg-test-banner' not in html:
    html=html.replace('<body>',
        "<body>\n<div id=\"pg-test-banner\" role=\"status\">AMBIENTE DI TEST — non è l'app ufficiale</div>\n", 1)
(dst/'index.html').write_text(html)

man=json.loads((dst/'manifest.json').read_text())
man['name']='PerGioco TEST'
man['short_name']='PerGioco TEST'
(dst/'manifest.json').write_text(json.dumps(man, ensure_ascii=False, indent=2)+'\n')

sw=(dst/'sw.js').read_text()
import re
sw=re.sub(r"const C='pergioco-v([^']+)'", r"const C='pergioco-test-v\1'", sw)
(dst/'sw.js').write_text(sw)

css=(dst/'styles.css').read_text()
if '#pg-test-banner' not in css:
    css += (
        "\n/* Banner fisso dell'ambiente di test */\n"
        "#pg-test-banner{position:sticky;top:0;z-index:30;background:#b45309;color:#fff;"
        "text-align:center;font-weight:800;font-size:13px;letter-spacing:.04em;"
        "padding:8px 12px;padding-top:calc(8px + env(safe-area-inset-top));"
        "box-shadow:0 1px 0 rgba(0,0,0,.15)}\n"
    )
    (dst/'styles.css').write_text(css)

cfg=(dst/'config.js').read_text()
if 'PERGIOCO_TEST' not in cfg:
    sys.exit("config.js di test mancante: non pubblico per non puntare accidentalmente alla produzione")
if 'egmrtcezrjyoynlhknpz' in cfg:
    sys.exit("config.js punta ancora al progetto di produzione: mi fermo")
if 'oosqsjbtlixufqscdwou' not in cfg:
    sys.exit("config.js non punta al progetto di test: mi fermo")
print("overlay ok")
PY

rm -f "$DEST/CNAME"

git -C "$DEST" add -A
if git -C "$DEST" diff --cached --quiet; then
  echo "Nessuna modifica da pubblicare sul repo di test."
  exit 0
fi
MSG="${1:-Pubblicazione ambiente di test}"
git -C "$DEST" -c user.name='PerGioco' -c user.email='vincenzo.assenza@pergioco.org' \
  commit -m "$MSG"
git -C "$DEST" push origin HEAD:main
echo "Pubblicato su https://vincenzoassenza-blip.github.io/pergioco-test/"
