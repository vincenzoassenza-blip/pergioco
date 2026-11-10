#!/usr/bin/env bash
# Suite completa (unit + Playwright). Obbligatoria e verde prima di ogni pubblicazione.
# Uso: scripts/test-all.sh   oppure   npm test
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export NODE_PATH="${NODE_PATH:-/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules}"
PORT="${TEST_PORT:-8799}"
TIMEOUT="${TEST_TIMEOUT:-200}"

units=()
pws=()
for f in tests/*.test.js; do
  if grep -qE "playwright|chromium" "$f"; then pws+=("$f"); else units+=("$f"); fi
done

LOG="${TMPDIR:-/tmp}/pergioco-test-all.log"
SUM="${TMPDIR:-/tmp}/pergioco-test-all-sum.txt"
: > "$LOG"
: > "$SUM"
pass=0
fail=0
started=0

server_pid=""
cleanup(){
  if [[ -n "$server_pid" ]] && kill -0 "$server_pid" 2>/dev/null; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Avvia lo static server solo se la porta è libera; altrimenti si riusa quello già in ascolto.
if ! (echo >/dev/tcp/127.0.0.1/"$PORT") >/dev/null 2>&1; then
  python3 -m http.server "$PORT" --bind 127.0.0.1 >>"$LOG" 2>&1 &
  server_pid=$!
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if (echo >/dev/tcp/127.0.0.1/"$PORT") >/dev/null 2>&1; then break; fi
    sleep 0.2
  done
  if ! kill -0 "$server_pid" 2>/dev/null; then
    echo "Impossibile avviare http.server sulla porta $PORT" >&2
    exit 1
  fi
fi

runone(){
  local f="$1" kind="$2" name rc last
  name="$(basename "$f")"
  echo "==== $kind $name ====" | tee -a "$LOG"
  set +e
  timeout "$TIMEOUT" node "$f" >>"$LOG" 2>&1
  rc=$?
  set -e
  last="$(tail -3 "$LOG" | tr '\n' ' ' | sed 's/  */ /g')"
  if [[ $rc -eq 0 ]]; then
    echo "PASS $kind $name | $last" | tee -a "$SUM"
    pass=$((pass+1))
  else
    echo "FAIL $kind $name rc=$rc | $last" | tee -a "$SUM"
    fail=$((fail+1))
  fi
}

echo "Suite PerGioco — $(date '+%F %H:%M %Z') — unit ${#units[@]} + Playwright ${#pws[@]}"
for f in "${units[@]}"; do runone "$f" unit; done
echo "---- unit fatte ----"
for f in "${pws[@]}"; do runone "$f" pw; done

echo
echo "Risultato: $pass pass, $fail fail (totale $((pass+fail)))"
if [[ $fail -ne 0 ]]; then
  echo "Fallimenti:"
  grep '^FAIL ' "$SUM" || true
  exit 1
fi
echo "Suite verde."
exit 0
