<#
.SYNOPSIS
    Lance le tunnel Cloudflare pour NAOSERVICES INVENTORY (backend Django)
.DESCRIPTION
    Lance un tunnel cloudflared éphémère sur le port 8000,
    met à jour le secret du Worker Cloudflare, et déploie.
    L'URL stable du Worker reste permanente même si le tunnel change.
.NOTES
    Compte Cloudflare : Mpigajesse@gmail.com
    Worker stable     : https://inventory-backend.<subdomain>.workers.dev
    Prérequis         : cloudflared, wrangler, Node.js
#>

param(
    [switch]$SkipDeploy,
    [int]$BackendPort = 8000
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $ScriptDir "logs"

function Write-Info    { param($msg) Write-Host "  [INFO] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "  [OK]   $msg" -ForegroundColor Green }
function Write-Warn    { param($msg) Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Fail    { param($msg) Write-Host "  [ERR]  $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "  =============================================" -ForegroundColor DarkYellow
Write-Host "   NAOSERVICES INVENTORY - Tunnel Launcher" -ForegroundColor Yellow
Write-Host "  =============================================" -ForegroundColor DarkYellow
Write-Host ""

# Dossier logs
if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

# Vérifications
Write-Info "Vérification cloudflared..."
if (!(Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Fail "cloudflared introuvable"
    exit 1
}
Write-Success "cloudflared OK"

Write-Info "Vérification wrangler..."
if (!(Get-Command wrangler -ErrorAction SilentlyContinue)) {
    Write-Warn "wrangler absent — installation..."
    npm install -g wrangler
}
Write-Success "wrangler OK"

# Nettoyer anciens tunnels
Write-Info "Nettoyage des anciens processus cloudflared..."
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Lancer le tunnel backend
$BackendLog = Join-Path $LogDir "backend-tunnel.log"
if (Test-Path $BackendLog) { Remove-Item $BackendLog -Force }

Write-Info "Lancement du tunnel backend (port $BackendPort)..."
$tunnelProcess = Start-Process -FilePath "cloudflared" `
    -ArgumentList "tunnel", "--url", "http://127.0.0.1:$BackendPort" `
    -RedirectStandardError $BackendLog `
    -PassThru -WindowStyle Hidden

# Attendre l'URL du tunnel
Write-Info "Attente de l'URL tunnel (max 30s)..."
$BackendTunnelUrl = $null
$timeout = 30
$elapsed = 0
while ($elapsed -lt $timeout) {
    if (Test-Path $BackendLog) {
        $content = Get-Content $BackendLog -Raw -ErrorAction SilentlyContinue
        if ($content -match "https://[a-z0-9-]+\.trycloudflare\.com") {
            $BackendTunnelUrl = $matches[0]
            break
        }
    }
    Start-Sleep -Milliseconds 500
    $elapsed += 0.5
}

if (!$BackendTunnelUrl) {
    Write-Fail "Impossible d'obtenir l'URL du tunnel. Vérifiez : $BackendLog"
    exit 1
}
Write-Success "Tunnel actif : $BackendTunnelUrl"

# Déployer le Worker
if (!$SkipDeploy) {
    Write-Info "Mise à jour du secret Worker Cloudflare..."
    Push-Location (Join-Path $ScriptDir "backend-proxy")
    try {
        echo $BackendTunnelUrl | wrangler secret put TUNNEL_URL 2>&1 | Out-Null
        Write-Success "Secret TUNNEL_URL mis à jour"

        Write-Info "Déploiement du Worker..."
        $deployOutput = wrangler deploy 2>&1
        Write-Success "Worker déployé"

        # Extraire l'URL stable du Worker
        $workerUrl = $null
        $deployOutput | ForEach-Object {
            if ($_ -match "https://inventory-backend\.[a-z0-9]+\.workers\.dev") {
                $workerUrl = $matches[0]
            }
        }
    }
    catch {
        Write-Warn "Erreur déploiement : $_"
    }
    Pop-Location
}

# Sauvegarder les URLs
$urlsFile = Join-Path $ScriptDir "current-urls.txt"
@"
# NAOSERVICES INVENTORY - $(Get-Date -Format "yyyy-MM-dd HH:mm")
BACKEND_TUNNEL=$BackendTunnelUrl
BACKEND_WORKER=$workerUrl
VITE_API_URL=$workerUrl/api
"@ | Set-Content $urlsFile

# Résumé
Write-Host ""
Write-Host "  =============================================" -ForegroundColor Green
Write-Host "           TUNNEL INVENTORY ACTIF             " -ForegroundColor Green
Write-Host "  =============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Tunnel éphémère  : $BackendTunnelUrl" -ForegroundColor Gray
if ($workerUrl) {
    Write-Host "  Worker stable    : $workerUrl" -ForegroundColor Cyan
    Write-Host "  VITE_API_URL     : $workerUrl/api" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  Ctrl+C pour arrêter" -ForegroundColor DarkGray
Write-Host ""

# Maintenir le tunnel actif
try {
    while ($true) {
        if ($tunnelProcess.HasExited) {
            Write-Warn "Le tunnel s'est arrêté — redémarrage..."
            $tunnelProcess = Start-Process -FilePath "cloudflared" `
                -ArgumentList "tunnel", "--url", "http://127.0.0.1:$BackendPort" `
                -RedirectStandardError $BackendLog `
                -PassThru -WindowStyle Hidden
        }
        Start-Sleep -Seconds 10
    }
}
finally {
    Write-Info "Arrêt du tunnel..."
    $tunnelProcess | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Success "Tunnel arrêté"
}
