#!/bin/bash
# Script para fazer push do PdfExpert v8 para o GitHub
# Crie um Personal Access Token em: https://github.com/settings/tokens
# Marque a permissao 'repo' (full control)

set -e

echo "=== PdfExpert v8 - Push para GitHub ==="
echo ""
echo "Repositorio: https://github.com/htech19/PdfExpert_Replit"
echo ""

# Remove origin antigo se existir
git remote remove origin 2>/dev/null || true

# Adiciona novo remote
git remote add origin https://github.com/htech19/PdfExpert_Replit.git

# Faz o push do branch main
echo "Enviando codigo para GitHub..."
git push -u origin main

echo ""
echo "=== Push concluido com sucesso! ==="
echo "URL: https://github.com/htech19/PdfExpert_Replit"
echo ""
echo "Para clonar localmente:"
echo "  git clone https://github.com/htech19/PdfExpert_Replit.git"
