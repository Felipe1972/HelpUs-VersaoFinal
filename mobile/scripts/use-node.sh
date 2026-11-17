# Git Bash: source ./scripts/use-node.sh
_helpus_mobile="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
_helpus_version="$(tr -d '\r\n' < "$_helpus_mobile/.node-version")"
_helpus_node="$(cygpath -u "$LOCALAPPDATA")/HelpUsTools/node-v${_helpus_version}-win-x64"
if [[ ! -f "$_helpus_node/node.exe" ]]; then
  printf 'Node portatil nao encontrado: %s\nConsulte MIGRACAO-SDK58.md.\n' "$_helpus_node" >&2
  return 1
fi
export PATH="$_helpus_node:$PATH"
hash -r
node --version
npm --version
unset _helpus_mobile _helpus_version _helpus_node
