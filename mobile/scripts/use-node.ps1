# Dot-source: . ./scripts/use-node.ps1
$helpUsNodeVersion = (Get-Content (Join-Path $PSScriptRoot '../.node-version') -Raw).Trim()
$helpUsNodeDirectory = Join-Path $env:LOCALAPPDATA "HelpUsTools/node-v$helpUsNodeVersion-win-x64"
if (!(Test-Path (Join-Path $helpUsNodeDirectory 'node.exe'))) {
    throw "Node portatil nao encontrado em $helpUsNodeDirectory. Consulte MIGRACAO-SDK58.md."
}
$env:PATH = "$helpUsNodeDirectory;$env:PATH"
node --version
npm --version
