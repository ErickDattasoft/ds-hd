#!/usr/bin/env bash
# PreToolUse (Edit|Write|NotebookEdit|Bash): el CRM viejo en producción es SOLO LECTURA.
# Bloquea cualquier edición de archivos ahí y los comandos que escriban en esa carpeta.
# Leer (cat, ls, grep, git log/show/diff…) sí se permite.
entrada=$(cat)
printf '%s' "$entrada" | node -e '
let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  let j;
  try { j = JSON.parse(s); } catch { return; }
  const VIEJO = "PROYECTO CRM DATTASOFT";
  const herramienta = j.tool_name || "";
  const ti = j.tool_input || {};
  let bloquear = false;
  if (herramienta === "Bash") {
    const cmd = String(ti.command || "");
    if (cmd.includes(VIEJO)) {
      // Operaciones que escriben: redirección a archivo, sed -i, mover/copiar/borrar, git que cambia algo, npm.
      const escribe = /(^|[^0-9&])>{1,2}(?!&)|\bsed\s+(-[a-zA-Z]*i|--in-place)|\b(rm|mv|cp|tee|touch|mkdir|rmdir|chmod|chown|truncate|ln|rsync|unzip|tar\s+-?x)\b|\bgit\b[^|;&]*\b(add|commit|push|pull|checkout|reset|restore|clean|merge|rebase|stash|apply|am|rm|mv|switch|cherry-pick|revert)\b|\b(npm|npx|pnpm|yarn|node|python3?)\b/;
      bloquear = escribe.test(cmd);
    }
  } else {
    bloquear = String(ti.file_path || ti.notebook_path || "").includes(VIEJO);
  }
  if (bloquear) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "El CRM viejo (" + VIEJO + ") es SOLO LECTURA: no se modifica nunca. Lee lo que necesites y haz el cambio en ds-hd.",
      },
    }));
  }
});
'
exit 0
