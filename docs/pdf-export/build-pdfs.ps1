# Erzeugt PDFs aus Markdown mit festem Layout (pandoc-uni-defaults.yaml).
# Bilder: docs/assets/diagrams/ (resource-path in den Defaults).
#
# Wann / Aktualisierung:
#   - Nach jedem `npm run build` (postbuild → docs:pdf), nur auf Windows.
#   - Manuell: dieses Skript ausführen.
#   Erneuter kompletter Lauf entfernt alte PDFs in OutDir und schreibt die aktuelle Version neu.
#   CI ohne Pandoc: SKIP_DOCS_PDF=1 npm run build
#
# Voraussetzungen:
#   - Pandoc: https://pandoc.org/installing.html
#   - LaTeX (z. B. MiKTeX): https://miktex.org/ — für PDF mit pdf-engine xelatex
#   - Node + npm install (für ```mermaid → PNG, helles Standard-Theme)
#
# Nutzung (am einfachsten):
#   Im Ordner fluxplan: npm run pdf
#   .\build-pdfs.ps1                    → alle *.md unter docs/ (rekursiv, außer pdf-export/)
#   .\build-pdfs.ps1 ..\..\pfad\doc.md  → nur diese Dateien
#   .\build-pdfs.ps1 -OutDir ..\..\out  → Ausgabeordner

param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$MarkdownFiles,

  [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"

# Cursor/IDE-Terminals kennen oft den PATH nach winget-Install nicht — wie eine neue Shell laden.
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
  [System.Environment]::GetEnvironmentVariable("Path", "User")

$pandocExe = $null
if (Get-Command pandoc -ErrorAction SilentlyContinue) {
  $pandocExe = (Get-Command pandoc).Source
}
else {
  foreach ($c in @(
      "${env:ProgramFiles}\Pandoc\pandoc.exe",
      "${env:ProgramFiles(x86)}\Pandoc\pandoc.exe",
      "$env:LOCALAPPDATA\Pandoc\pandoc.exe"
    )) {
    if ($c -and (Test-Path -LiteralPath $c)) {
      $pandocExe = $c
      $env:Path = "$(Split-Path -Parent $c);$env:Path"
      break
    }
  }
}

if (-not $pandocExe) {
  Write-Error @"
Pandoc wurde nicht gefunden.
- Installieren: https://pandoc.org/installing.html
- Danach dieses Terminal schließen und neu öffnen (oder Cursor neu starten), damit PATH aktualisiert wird.
"@
  exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js wurde nicht gefunden (benötigt für Mermaid-Diagramme in PDFs)."
  exit 1
}

function Get-OutputPdfName {
  param(
    [System.IO.FileInfo]$File,
    [string]$DocsRootFull
  )
  $base = [System.IO.Path]::GetFileNameWithoutExtension($File.Name)
  $dirFull = [System.IO.Path]::GetFullPath($File.DirectoryName)
  $root = [System.IO.Path]::GetFullPath($DocsRootFull)

  if ($dirFull.Equals($root, [StringComparison]::OrdinalIgnoreCase)) {
    return "$base.pdf"
  }
  if ($dirFull.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    $rel = ($dirFull.Substring($root.Length) -replace '^[\\/]+', '')
    $prefix = ($rel -replace '[\\/]+', '-') + "-"
    return "$prefix$base.pdf"
  }
  return "$base.pdf"
}

$here = $PSScriptRoot
$defaults = Join-Path $here "pandoc-uni-defaults.yaml"
if (-not (Test-Path $defaults)) {
  Write-Error "Defaults-Datei fehlt: $defaults"
  exit 1
}

$docsRoot = Split-Path $here
$docsRootFull = [System.IO.Path]::GetFullPath($docsRoot)
$pdfExportFull = [System.IO.Path]::GetFullPath((Join-Path $docsRoot "pdf-export"))
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $docsRoot ".."))
$expandMermaid = Join-Path $repoRoot "scripts\expand-mermaid-for-pandoc.mjs"

if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $OutDir = Join-Path $here "dist"
}
else {
  $OutDir = [System.IO.Path]::GetFullPath($OutDir)
}
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$inputs = @()
if ($MarkdownFiles -and $MarkdownFiles.Count -gt 0) {
  foreach ($p in $MarkdownFiles) {
    $resolved = Resolve-Path -LiteralPath $p
    $inputs += Get-Item -LiteralPath $resolved
  }
}
else {
  $inputs = @(
    Get-ChildItem -LiteralPath $docsRootFull -Filter "*.md" -Recurse -File |
      Where-Object {
        $d = [System.IO.Path]::GetFullPath($_.DirectoryName)
        -not (
          $d.Equals($pdfExportFull, [StringComparison]::OrdinalIgnoreCase) -or
          $d.StartsWith($pdfExportFull + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)
        )
      } |
      Sort-Object FullName
  )
}

if ($inputs.Count -eq 0) {
  Write-Warning "Keine Markdown-Dateien gefunden."
  exit 0
}

if (-not ($MarkdownFiles -and $MarkdownFiles.Count -gt 0)) {
  Get-ChildItem -LiteralPath $OutDir -Filter "*.pdf" -File -ErrorAction SilentlyContinue |
    Remove-Item -Force
}

foreach ($f in $inputs) {
  $outName = Get-OutputPdfName -File $f -DocsRootFull $docsRootFull
  $out = Join-Path $OutDir $outName
  Write-Host "PDF: $($f.FullName) -> $out"

  $pandocSource = $f.FullName
  $tmpMd = $null
  if (Select-String -LiteralPath $f.FullName -Pattern '```mermaid' -Quiet) {
    # Temp-MD muss im selben Ordner wie die Quelle liegen, sonst stimmen relative Bildpfade nicht.
    $tmpMd = Join-Path $f.DirectoryName (".pdf-build-" + [System.Guid]::NewGuid().ToString("N") + ".md")
    & node $expandMermaid $f.FullName $tmpMd
    if ($LASTEXITCODE -ne 0) {
      if ($tmpMd) { Remove-Item -LiteralPath $tmpMd -ErrorAction SilentlyContinue }
      exit $LASTEXITCODE
    }
    $pandocSource = $tmpMd
  }

  & $pandocExe $pandocSource --defaults="$defaults" -o $out
  $pandocExit = $LASTEXITCODE
  if ($tmpMd) { Remove-Item -LiteralPath $tmpMd -ErrorAction SilentlyContinue }
  if ($pandocExit -ne 0) {
    exit $pandocExit
  }
}

Write-Host "Fertig. Ausgabe: $OutDir"
