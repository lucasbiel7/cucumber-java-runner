# Instalação Local da Extensão

Este guia explica como empacotar e instalar a extensão localmente para desenvolvimento.

## Métodos de Instalação

### Opção 1: Script Shell (Recomendado)

Execute o script `install-extension.sh`:

```bash
./install-extension.sh
```

Este script irá:
1. Compilar o código TypeScript
2. Empacotar a extensão em formato `.vsix`
3. Instalar a extensão no Cursor

### Opção 2: NPM Scripts

Você pode usar os scripts npm disponíveis:

```bash
# Empacotar a extensão apenas
npm run package

# Empacotar e instalar no Cursor
npm run install-local

# Compilar, empacotar e instalar (completo)
npm run build-and-install
```

### Opção 3: Comandos Manuais

Se preferir executar os comandos manualmente:

```bash
# 1. Compilar
npm run compile

# 2. Empacotar
vsce package

# 3. Instalar
cursor --install-extension cucumber-java-runner-1.0.0.vsix
```

## Após a Instalação

Depois de instalar a extensão, você precisa recarregar o Cursor:

1. Pressione `Cmd+Shift+P` (macOS) ou `Ctrl+Shift+P` (Windows/Linux)
2. Digite "Developer: Reload Window"
3. Pressione Enter

Ou simplesmente reinicie o Cursor.

## Verificação

Para verificar se a extensão foi instalada:

1. Abra o painel de Extensions (`Cmd+Shift+X`)
2. Procure por "Cucumber Java Runner"
3. A extensão deve aparecer como instalada

## Desenvolvimento

Durante o desenvolvimento, use o script sempre que fizer alterações:

```bash
# Após fazer alterações no código
./install-extension.sh

# Ou use o npm script
npm run build-and-install
```

## Troubleshooting

### vsce não encontrado

Se você receber um erro de que `vsce` não foi encontrado, instale-o globalmente:

```bash
npm install -g @vscode/vsce
```

### Cursor não encontrado

Se o comando `cursor` não for encontrado, você pode instalar manualmente:

1. Empacote a extensão: `npm run package`
2. No Cursor, abra o Command Palette (`Cmd+Shift+P`)
3. Digite "Extensions: Install from VSIX..."
4. Selecione o arquivo `.vsix` gerado

### Extensão antiga não atualiza

Se a extensão antiga não atualizar:

1. Desinstale a versão antiga primeiro
2. Recarregue o Cursor
3. Execute o script de instalação novamente
