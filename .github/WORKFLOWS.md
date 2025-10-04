# 🤖 GitHub Actions Workflows

Este projeto usa GitHub Actions para CI/CD automatizado.

## 📋 Workflows Disponíveis

### 1. CI (Integração Contínua)
**Arquivo**: `.github/workflows/ci.yml`
**Trigger**: Push ou Pull Request para `main` ou `develop`

**O que faz:**
- ✅ Compila o código TypeScript
- ✅ Executa linter (se configurado)
- ✅ Roda testes (se existirem)
- ✅ Cria pacote .vsix
- ✅ Testa em Node.js 18 e 20
- ✅ Faz upload do .vsix como artifact

**Quando usar:** Automaticamente em cada push/PR

---

### 2. Publish (Publicação)
**Arquivo**: `.github/workflows/publish.yml`
**Trigger**: Push de tag com formato `v*` (ex: `v1.0.0`)

**O que faz:**
- ✅ Compila o projeto
- ✅ Cria pacote .vsix
- ✅ **Publica no VS Code Marketplace**
- ✅ Cria GitHub Release
- ✅ Anexa o .vsix ao release

**Quando usar:** Quando quiser publicar uma nova versão

---

### 3. Pre-Release
**Arquivo**: `.github/workflows/pre-release.yml`
**Trigger**: Push para branch `develop` ou manualmente

**O que faz:**
- ✅ Compila o projeto
- ✅ Cria pacote .vsix
- ✅ Cria Pre-Release no GitHub
- ✅ Anexa o .vsix (para testar antes de publicar)

**Quando usar:** Para testar versões beta antes da release oficial

---

## 🔐 Configuração de Secrets

Para que os workflows funcionem, você precisa configurar secrets no GitHub.

### Passo a Passo:

#### 1. **VSCE_TOKEN** (Personal Access Token do Azure DevOps)

Este token é necessário para publicar no VS Code Marketplace.

**Como criar:**

1. Acesse: https://dev.azure.com
2. Faça login com sua conta Microsoft
3. Clique no ícone de usuário → **Personal access tokens**
4. Clique em **New Token**
5. Configure:
   - **Name**: `vscode-marketplace-github-actions`
   - **Organization**: All accessible organizations
   - **Expiration**: 1 ano (recomendado)
   - **Scopes**: Marque **Marketplace** → **Manage** (todas as opções)
6. Clique em **Create**
7. **Copie o token** (só será mostrado uma vez!)

**Adicionar ao GitHub:**

1. Vá para seu repositório no GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. **Name**: `VSCE_TOKEN`
5. **Value**: Cole o token copiado
6. Clique em **Add secret**

#### 2. **GITHUB_TOKEN** (Automático)

O `GITHUB_TOKEN` é criado automaticamente pelo GitHub Actions. Não precisa configurar!

---

## 🚀 Como Usar os Workflows

### Publicar uma Nova Versão (Automático)

```bash
# 1. Atualizar versão no package.json
npm version patch  # 1.0.0 → 1.0.1
# ou
npm version minor  # 1.0.0 → 1.1.0
# ou
npm version major  # 1.0.0 → 2.0.0

# 2. Atualizar CHANGELOG.md com as mudanças

# 3. Commit e push (isso cria a tag automaticamente)
git add .
git commit -m "Release v1.0.1"
git push
git push --tags

# 4. GitHub Actions vai:
#    - Compilar
#    - Publicar no Marketplace
#    - Criar GitHub Release
#    - Anexar .vsix
```

### Publicar Manualmente (se preferir)

```bash
# 1. Criar e empurrar a tag
git tag v1.0.1
git push origin v1.0.1

# 2. GitHub Actions publica automaticamente!
```

### Criar Pre-Release para Testes

```bash
# 1. Merge para branch develop
git checkout develop
git merge feature/sua-feature
git push origin develop

# 2. GitHub Actions cria pre-release automaticamente

# 3. Baixe o .vsix do release e teste localmente
code --install-extension cucumber-java-runner-1.0.1-beta.123.vsix
```

### Disparar Pre-Release Manualmente

1. Vá para: **Actions** → **Pre-Release**
2. Clique em **Run workflow**
3. Selecione a branch `develop`
4. Clique em **Run workflow**

---

## 📊 Status dos Workflows

Adicione badges ao seu README.md:

```markdown
[![CI](https://github.com/lucasbiel7/cucumber-java-runner/actions/workflows/ci.yml/badge.svg)](https://github.com/lucasbiel7/cucumber-java-runner/actions/workflows/ci.yml)
[![Publish](https://github.com/lucasbiel7/cucumber-java-runner/actions/workflows/publish.yml/badge.svg)](https://github.com/lucasbiel7/cucumber-java-runner/actions/workflows/publish.yml)
```

---

## 🔍 Verificar Execução

1. Vá para: **Actions** no seu repositório
2. Veja todos os workflows em execução ou concluídos
3. Clique em um workflow para ver os logs detalhados
4. Baixe artifacts (arquivos .vsix) se necessário

---

## 🐛 Troubleshooting

### Erro: "VSCE_TOKEN not found"

**Solução**: Configure o secret `VSCE_TOKEN` conforme instruções acima.

### Erro: "Failed to publish"

**Possíveis causas:**
1. Token expirado → Criar novo token
2. Publisher não configurado → Criar publisher no marketplace
3. Versão já existe → Incrementar versão no package.json

### Erro: "npm ci failed"

**Solução**:
```bash
# Localmente, regenere o package-lock.json
rm package-lock.json
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

### Workflow não dispara

**Verifique:**
1. Push foi feito na branch correta (main/develop)?
2. Tag tem formato correto (v1.0.0)?
3. Arquivo .yml está na pasta `.github/workflows/`?

---

## 📝 Exemplo de Fluxo Completo

```bash
# 1. Desenvolver feature
git checkout -b feature/nova-funcionalidade
# ... fazer mudanças ...
git commit -am "Adiciona nova funcionalidade"

# 2. Abrir PR para develop
git push origin feature/nova-funcionalidade
# Criar Pull Request no GitHub para develop
# CI vai rodar automaticamente

# 3. Merge para develop
# Pre-release é criado automaticamente

# 4. Testar pre-release
# Baixar .vsix do pre-release e testar

# 5. Quando estiver pronto, merge para main
git checkout main
git merge develop
git push origin main

# 6. Criar release oficial
npm version minor
git push
git push --tags

# 7. Publish workflow publica automaticamente!
```

---

## 🎯 Boas Práticas

1. **Sempre teste pre-release antes de publicar**
2. **Use Semantic Versioning** (MAJOR.MINOR.PATCH)
3. **Atualize CHANGELOG.md** antes de cada release
4. **Rode CI localmente** antes de fazer push:
   ```bash
   npm ci
   npm run compile
   npm run lint
   npx vsce package
   ```
4. **Revise os logs** do GitHub Actions após cada execução

---

## 🔄 Atualizar Workflows

Se precisar modificar os workflows:

1. Edite os arquivos em `.github/workflows/`
2. Commit e push
3. GitHub Actions usa automaticamente a versão mais recente

---

**Workflows configurados! 🚀**

Agora você tem CI/CD completo para sua extensão do VS Code!
