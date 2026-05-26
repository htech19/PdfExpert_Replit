#!/bin/bash
# Script para clonar e rodar PdfExpert v8 localmente
# Requisitos: Node.js 20+, pnpm, PostgreSQL local (ou Docker)

set -e

REPO_URL="https://github.com/htech19/PdfExpert_Replit.git"
PROJECT_DIR="PdfExpert_Replit"

echo "=== PdfExpert v8 - Setup Local ==="
echo ""

# 1. Clone
echo "[1/6] Clonando repositorio..."
git clone "$REPO_URL"
cd "$PROJECT_DIR"

# 2. Instala dependencias
echo "[2/6] Instalando dependencias..."
pnpm install

# 3. Configura variaveis de ambiente
echo "[3/6] Configurando variaveis de ambiente..."
if [ ! -f artifacts/api-server/.env ]; then
  cat > artifacts/api-server/.env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pdfexpert
OPENAI_API_KEY=sk-sua-chave-aqui
PORT=8080
BASE_PATH=/api
EOF
  echo "  Criado: artifacts/api-server/.env"
  echo "  IMPORTANTE: Edite este arquivo com sua DATABASE_URL e OPENAI_API_KEY"
fi

if [ ! -f artifacts/pdf-expert/.env ]; then
  cat > artifacts/pdf-expert/.env << 'EOF'
VITE_API_URL=http://localhost:8080/api
PORT=3000
BASE_PATH=/
EOF
  echo "  Criado: artifacts/pdf-expert/.env"
fi

# 4. Configura PostgreSQL (com Docker Compose)
echo "[4/6] Iniciando PostgreSQL..."
if command -v docker-compose &> /dev/null; then
  docker-compose up -d postgres
  sleep 5
else
  echo "  AVISO: Docker Compose nao encontrado."
  echo "  Certifique-se de que o PostgreSQL esta rodando localmente."
fi

# 5. Push do schema do banco
echo "[5/6] Configurando banco de dados..."
pnpm --filter @workspace/db run push

# 6. Inicia os servicos
echo "[6/6] Iniciando servicos..."
echo ""
echo "Execute em terminais separados:"
echo ""
echo "  # Terminal 1 - API Server:"
echo "  cd $PROJECT_DIR && pnpm --filter @workspace/api-server run dev"
echo ""
echo "  # Terminal 2 - Frontend:"
echo "  cd $PROJECT_DIR && pnpm --filter @workspace/pdf-expert run dev"
echo ""
echo "Acesse: http://localhost:3000"
echo "API:    http://localhost:8080/api"
echo ""
echo "=== Setup completo! ==="
