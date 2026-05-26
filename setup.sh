#!/usr/bin/env bash
# PdfExpert v8 — Script de Setup para Linux/Mac
# Execute: chmod +x setup.sh && ./setup.sh

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo ""
echo -e "${CYAN}========================================"
echo -e "   PdfExpert v8 — Setup"
echo -e "========================================${NC}"
echo ""

# 1. Node.js
echo -e "${YELLOW}[ 1/5 ] Verificando Node.js...${NC}"
if ! command -v node &>/dev/null; then
  echo -e "${RED}        ERRO: Node.js nao encontrado.${NC}"
  echo "        Instale via https://nodejs.org ou 'nvm install 22'"
  exit 1
fi
echo -e "${GREEN}        Node.js $(node --version) encontrado.${NC}"

# 2. pnpm
echo -e "${YELLOW}[ 2/5 ] Verificando pnpm...${NC}"
if ! command -v pnpm &>/dev/null; then
  echo "        Instalando pnpm..."
  npm install -g pnpm
fi
echo -e "${GREEN}        pnpm $(pnpm --version) encontrado.${NC}"

# 3. .env files
echo -e "${YELLOW}[ 3/5 ] Configurando variaveis de ambiente...${NC}"

if [ ! -f "artifacts/api-server/.env" ]; then
  cp artifacts/api-server/.env.example artifacts/api-server/.env
  echo -e "${GREEN}        Criado: artifacts/api-server/.env${NC}"
  echo -e "${MAGENTA}        >> EDITE o DATABASE_URL antes de continuar!${NC}"
else
  echo "        artifacts/api-server/.env ja existe, pulando."
fi

if [ ! -f "artifacts/pdf-expert/.env" ]; then
  cp artifacts/pdf-expert/.env.example artifacts/pdf-expert/.env
  echo -e "${GREEN}        Criado: artifacts/pdf-expert/.env${NC}"
else
  echo "        artifacts/pdf-expert/.env ja existe, pulando."
fi

# 4. Instalar dependencias
echo -e "${YELLOW}[ 4/5 ] Instalando dependencias...${NC}"
pnpm install
echo -e "${GREEN}        Dependencias instaladas.${NC}"

# 5. Instrucoes
echo ""
echo -e "${YELLOW}[ 5/5 ] Proximos passos:${NC}"
echo ""
echo "  A) Configure o banco de dados:"
echo "     - Opção 1 (Docker): docker-compose up -d"
echo "     - Opção 2 (Neon):   https://neon.tech"
echo "     - Edite DATABASE_URL em artifacts/api-server/.env"
echo ""
echo "  B) Crie as tabelas:"
echo "     pnpm --filter @workspace/db run push"
echo ""
echo "  C) Inicie os serviços (dois terminais):"
echo "     Terminal 1: pnpm --filter @workspace/api-server run dev"
echo "     Terminal 2: pnpm --filter @workspace/pdf-expert run dev"
echo ""
echo "  D) Acesse: http://localhost:3000"
echo ""
echo -e "${CYAN}========================================"
echo -e "   Setup concluido!"
echo -e "========================================${NC}"
echo ""
