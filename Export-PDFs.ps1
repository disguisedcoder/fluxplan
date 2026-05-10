# Ein Klick / eine Zeile: alle Markdown-Docs → docs/pdf-export/dist/
# Doppelklick möglich (Ordner fluxplan). Voraussetzung: Node + Pandoc + MiKTeX (wie in der README zum PDF-Export).
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
npm run pdf
exit $LASTEXITCODE
