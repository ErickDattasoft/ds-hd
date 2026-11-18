#!/usr/bin/env bash
# PostToolUse (Edit|Write): si se editó algo en src/assets/ (CSS/JS), recompila
# /static/build con `npm run build:assets`. Sin esto, las capturas y el servidor local
# siguen sirviendo el CSS viejo.
entrada=$(cat)
archivo=$(printf '%s' "$entrada" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write(j.tool_input?.file_path||j.tool_response?.filePath||"")}catch{}})')
case "$archivo" in
  */src/assets/*) ;;
  *) exit 0 ;;
esac
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
if salida=$(npm run --silent build:assets 2>&1); then
  echo '{"suppressOutput":true}'
else
  # No bloquea la edición, pero avisa al modelo que la compilación falló.
  printf '%s' "$salida" | tail -20 | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.stringify({hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:"⚠ npm run build:assets falló:\n"+s}})))'
fi
exit 0
