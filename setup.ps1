# PdfExpert v8 — Script de Setup para Windows (PowerShell)
# Execute: .\setup.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   PdfExpert v8 — Setup Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Node.js
Write-Host "[ 1/5 ] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "        Node.js $nodeVersion encontrado." -ForegroundColor Green
} catch {
    Write-Host "        ERRO: Node.js nao encontrado." -ForegroundColor Red
    Write-Host "        Instale em https://nodejs.org e execute novamente." -ForegroundColor Red
    exit 1
}

# 2. Verificar / instalar pnpm
Write-Host "[ 2/5 ] Verificando pnpm..." -ForegroundColor Yellow
try {
    $pnpmVersion = pnpm --version
    Write-Host "        pnpm $pnpmVersion encontrado." -ForegroundColor Green
} catch {
    Write-Host "        Instalando pnpm globalmente..." -ForegroundColor Yellow
    npm install -g pnpm
    Write-Host "        pnpm instalado." -ForegroundColor Green
}

# 3. Copiar arquivos .env
Write-Host "[ 3/5 ] Configurando variaveis de ambiente..." -ForegroundColor Yellow

$apiEnv = "artifacts\api-server\.env"
$apiEnvExample = "artifacts\api-server\.env.example"
if (-Not (Test-Path $apiEnv)) {
    Copy-Item $apiEnvExample $apiEnv
    Write-Host "        Criado: $apiEnv" -ForegroundColor Green
    Write-Host "        >> EDITE o DATABASE_URL neste arquivo antes de continuar!" -ForegroundColor Magenta
} else {
    Write-Host "        $apiEnv ja existe, pulando." -ForegroundColor DarkGray
}

$frontEnv = "artifacts\pdf-expert\.env"
$frontEnvExample = "artifacts\pdf-expert\.env.example"
if (-Not (Test-Path $frontEnv)) {
    Copy-Item $frontEnvExample $frontEnv
    Write-Host "        Criado: $frontEnv" -ForegroundColor Green
} else {
    Write-Host "        $frontEnv ja existe, pulando." -ForegroundColor DarkGray
}

# 4. Instalar dependencias
Write-Host "[ 4/5 ] Instalando dependencias (pnpm install)..." -ForegroundColor Yellow
pnpm install
Write-Host "        Dependencias instaladas." -ForegroundColor Green

# 5. Instrucoes finais
Write-Host ""
Write-Host "[ 5/5 ] Proximos passos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  A) Configure o banco de dados:" -ForegroundColor White
Write-Host "     - Opção 1 (Docker): docker-compose up -d" -ForegroundColor Gray
Write-Host "     - Opção 2 (Neon):   crie um projeto em https://neon.tech" -ForegroundColor Gray
Write-Host "     - Edite DATABASE_URL em artifacts\api-server\.env" -ForegroundColor Gray
Write-Host ""
Write-Host "  B) Crie as tabelas no banco:" -ForegroundColor White
Write-Host "     pnpm --filter @workspace/db run push" -ForegroundColor Gray
Write-Host ""
Write-Host "  C) Inicie os servicos (dois terminais):" -ForegroundColor White
Write-Host "     Terminal 1: pnpm --filter @workspace/api-server run dev" -ForegroundColor Gray
Write-Host "     Terminal 2: pnpm --filter @workspace/pdf-expert run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  D) Acesse: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Setup concluido!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
