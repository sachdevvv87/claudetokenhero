param(
  [string]$UpstreamUrl = ""
)

Write-Host "Universal Token Limiter - one-click setup"
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is not installed. Please install Node.js (LTS) and re-run this script."
  exit 1
}

if (-not (Test-Path -LiteralPath ".env")) {
  Copy-Item -LiteralPath ".env.example" -Destination ".env"
}

if ([string]::IsNullOrWhiteSpace($UpstreamUrl)) {
  $UpstreamUrl = Read-Host "Enter your upstream URL (e.g., https://api.anthropic.com)"
}

if (-not [string]::IsNullOrWhiteSpace($UpstreamUrl)) {
  $content = Get-Content -Raw -LiteralPath ".env"
  if ($content -match "UPSTREAM_URL=") {
    $content = $content -replace "UPSTREAM_URL=.*", "UPSTREAM_URL=$UpstreamUrl"
  } else {
    $content = $content + "`r`nUPSTREAM_URL=$UpstreamUrl"
  }
  Set-Content -LiteralPath ".env" -Value $content -Encoding UTF8
}

Write-Host ""
Write-Host "Installing dependencies..."
npm install

Write-Host ""
Write-Host "Setup complete. Start the limiter with:"
Write-Host "  npm start"
