# GitHub Actions & Release Automation

Este diretório contém a configuração de CI/CD e documentação sobre o processo de release automatizado.

## 📁 Estrutura

```
.github/
├── workflows/
│   ├── ci.yml              # Continuous Integration
│   ├── tag-release.yml     # Auto tag creation from package.json
│   ├── publish.yml         # Publish to marketplace + GitHub Release
│   └── pre-release.yml     # Pre-release builds
├── scripts/
│   ├── extract-changelog.sh   # Extract version from CHANGELOG
│   └── check-secrets.sh       # Verify secrets configuration
└── docs/
    ├── RELEASE_NOTES.md       # How release automation works
    ├── SETUP_PAT.md           # Setup Personal Access Token
    └── WORKFLOW_FIX.md        # Fix for workflow trigger issue
```

## 🚀 Quick Start

### Para fazer um novo release:

1. **Atualizar versão**:
   ```bash
   # Editar package.json manualmente ou usar:
   npm version patch  # 1.0.2 → 1.0.3
   npm version minor  # 1.0.2 → 1.1.0
   npm version major  # 1.0.2 → 2.0.0
   ```

2. **Atualizar CHANGELOG.md**:
   - Adicionar seção com a nova versão
   - Documentar todas as mudanças

3. **Commit e Push**:
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: release v1.0.3"
   git push origin main
   ```

4. **Automático**:
   - ✅ Tag criada automaticamente
   - ✅ Publicado no VS Code Marketplace
   - ✅ GitHub Release criado com notes do CHANGELOG

## ⚙️ Configuração Necessária

### Secrets Obrigatórios

Configure em: **Settings → Secrets and variables → Actions**

1. **`VSCE_TOKEN`** - Token do VS Code Marketplace
   - Obter em: https://marketplace.visualstudio.com/manage
   - Necessário para: Publicar extensão

2. **`PAT_TOKEN`** - Personal Access Token
   - Criar em: https://github.com/settings/tokens
   - Scopes: `repo` + `workflow`
   - Necessário para: Disparar workflow de publish
   - **⚠️ Sem isso, o publish não será disparado automaticamente**
   - Ver: [SETUP_PAT.md](SETUP_PAT.md)

3. **`GITHUB_TOKEN`** - ✅ Automático (já disponível)

### Verificar Configuração

```bash
# Executar script de verificação
./.github/scripts/check-secrets.sh
```

## 📚 Documentação

- **[RELEASE_NOTES.md](RELEASE_NOTES.md)** - Como funciona o processo de release
- **[SETUP_PAT.md](SETUP_PAT.md)** - Configuração do Personal Access Token
- **[WORKFLOW_FIX.md](WORKFLOW_FIX.md)** - Solução para problema de workflow não disparar

## 🔄 Workflows

### CI (`ci.yml`)
- **Quando**: Push/PR em `main` ou `develop`
- **O que faz**:
  - Lint do código
  - Compilação TypeScript
  - Testes (se houver)
  - Cria artefato VSIX

### Auto Tag (`tag-release.yml`)
- **Quando**: Push na branch `main`
- **O que faz**:
  - Lê versão do `package.json`
  - Verifica se tag já existe
  - Cria e faz push da tag `v${version}`
  - **Usa PAT_TOKEN para disparar publish**

### Publish (`publish.yml`)
- **Quando**: Tag criada (`v*`)
- **O que faz**:
  - Compila e empacota extensão
  - Publica no VS Code Marketplace
  - Extrai changelog da versão
  - Cria GitHub Release com:
    - Link do marketplace
    - Instruções de instalação
    - Notas de release do CHANGELOG
    - Arquivo VSIX anexado

### Pre-Release (`pre-release.yml`)
- **Quando**: Push na branch `develop`
- **O que faz**:
  - Cria pre-release no GitHub
  - Tag: `v${version}-beta.${run_number}`
  - Não publica no marketplace

## 🐛 Troubleshooting

### Publish workflow não dispara após criar tag?

**Problema**: O `GITHUB_TOKEN` padrão não dispara outros workflows.

**Solução**: Configure o `PAT_TOKEN` como descrito em [WORKFLOW_FIX.md](WORKFLOW_FIX.md)

### Tag já existe?

```bash
# Listar tags
git tag -l

# Deletar tag local e remota (cuidado!)
git tag -d v1.0.3
git push origin :refs/tags/v1.0.3
```

### VSCE_TOKEN expirado?

1. Gerar novo token em: https://marketplace.visualstudio.com/manage
2. Atualizar secret no GitHub

### Verificar logs dos workflows

1. Ir para: **Actions** tab no GitHub
2. Selecionar o workflow com problema
3. Ver logs detalhados de cada step

## 🎯 Best Practices

### Versionamento
- **Patch** (1.0.x): Bug fixes, pequenas correções
- **Minor** (1.x.0): Novas features, mudanças compatíveis
- **Major** (x.0.0): Breaking changes

### CHANGELOG
- Seguir formato [Keep a Changelog](https://keepachangelog.com/)
- Usar categorias: Added, Changed, Deprecated, Removed, Fixed, Security
- Incluir data de release
- Separar versões com `---`

### Commits
```bash
# Usar conventional commits
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "chore: update dependencies"
git commit -m "docs: improve documentation"
```

## 🔐 Segurança

- ✅ Secrets são criptografados pelo GitHub
- ✅ Secrets não aparecem em logs
- ✅ PAT com scopes mínimos necessários
- ⚠️ Renovar PAT periodicamente
- ⚠️ Nunca commitar tokens no código

## 📖 Referências

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [VS Code Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
