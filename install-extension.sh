#!/bin/bash

# Script para empacotar e instalar a extensão Cucumber Java Runner no Cursor
# Uso: ./install-extension.sh

set -e  # Para o script se houver erro

echo "🚀 Iniciando processo de empacotamento e instalação..."

# 1. Compilar o código TypeScript
echo ""
echo "📦 Compilando código TypeScript..."
npm run compile

# 2. Empacotar a extensão
echo ""
echo "📦 Empacotando a extensão..."
vsce package

# 3. Instalar no Cursor
echo ""
echo "🔧 Instalando a extensão no Cursor..."
VSIX_FILE=$(ls -t cucumber-java-runner-*.vsix | head -1)
cursor --install-extension "$VSIX_FILE"

echo ""
echo "✅ Extensão instalada com sucesso!"
echo "📝 Arquivo gerado: $VSIX_FILE"
echo ""
echo "⚠️  Lembre-se de recarregar o Cursor para usar a extensão:"
echo "   - Pressione Cmd+Shift+P"
echo "   - Digite 'Developer: Reload Window'"
echo "   - Ou simplesmente reinicie o Cursor"
