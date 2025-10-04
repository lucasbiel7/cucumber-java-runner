# Release Notes Automation

Este documento explica como funciona a automação de release notes no projeto.

## Como Funciona

Quando você faz push de uma tag (ex: `v1.0.1`), o workflow `publish.yml` automaticamente:

1. ✅ Compila o projeto
2. ✅ Cria o pacote VSIX
3. ✅ Publica no VS Code Marketplace
4. ✅ Extrai as notas da versão do `CHANGELOG.md`
5. ✅ Cria uma GitHub Release com:
   - Link direto para o marketplace
   - Instruções de instalação
   - Changelog da versão específica
   - Arquivo VSIX anexado

## Exemplo de Release Note

Quando a versão `v1.0.1` é publicada, a release note no GitHub terá este formato:

```markdown
## 📦 Installation

**Install from VS Code Marketplace:**
- [Cucumber Java Runner on Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=lucasbiel7.cucumber-java-runner)
- Or search for "Cucumber Java Runner" in VS Code Extensions

**Install from VSIX:**
Download the `.vsix` file below and install via:
\`\`\`bash
code --install-extension cucumber-java-runner-1.0.1.vsix
\`\`\`

---

## 📝 What's Changed

[Conteúdo extraído automaticamente do CHANGELOG.md para a versão específica]
```

## Fluxo de Release

### 1. Atualizar a versão no package.json

```bash
# Exemplo: atualizando para 1.0.2
npm version patch  # ou minor, ou major
```

### 2. Atualizar o CHANGELOG.md

Adicione as alterações da nova versão seguindo o formato:

```markdown
## [1.0.2] - 2025-10-04

### Added
- Nova funcionalidade X

### Fixed
- Correção do bug Y

### Changed
- Mudança Z

---
```

### 3. Commit e Push

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.0.2"
git push origin main
```

### 4. Tag Automática

O workflow `tag-release.yml` irá:
- Detectar o push na main
- Ler a versão do `package.json`
- Criar e fazer push da tag `v1.0.2` automaticamente

### 5. Publicação Automática

O workflow `publish.yml` irá:
- Detectar a nova tag
- Compilar e empacotar a extensão
- Publicar no VS Code Marketplace
- Criar GitHub Release com as notas extraídas do CHANGELOG

## Arquivos Importantes

- `.github/workflows/tag-release.yml` - Cria tags automaticamente baseado no package.json
- `.github/workflows/publish.yml` - Publica e cria release com notas personalizadas
- `.github/scripts/extract-changelog.sh` - Extrai notas de uma versão específica do CHANGELOG
- `CHANGELOG.md` - Fonte das notas de release

## Testando Localmente

Para testar a extração do changelog:

```bash
./.github/scripts/extract-changelog.sh v1.0.1
```

Isso mostrará exatamente o que será incluído nas release notes.

## Requisitos

- `VSCE_TOKEN` - Secret configurado no GitHub para publicar no marketplace
- `GITHUB_TOKEN` - Automaticamente disponível (não precisa configurar)
- CHANGELOG.md deve seguir o formato com `## [versão]` como cabeçalho

## Benefícios

✅ Processo totalmente automatizado
✅ Release notes sempre sincronizadas com o CHANGELOG
✅ Link direto para o marketplace em cada release
✅ Instruções claras de instalação
✅ Histórico completo no GitHub Releases
✅ Menos trabalho manual e menos erros
