# 📖 Exemplos de Uso dos Workflows

Guia prático com exemplos reais de como usar os GitHub Actions.

## 🎯 Cenários Comuns

### 1️⃣ Primeira Publicação

```bash
# 1. Configure o secret VSCE_TOKEN (apenas primeira vez)
# Veja: SECRETS_SETUP.md

# 2. Certifique-se que está na branch main
git checkout main
git pull origin main

# 3. Compile e teste localmente primeiro
npm ci
npm run compile
npx vsce package

# 4. Teste o .vsix localmente
code --install-extension cucumber-java-runner-1.0.0.vsix

# 5. Se tudo OK, publique!
git tag v1.0.0
git push origin v1.0.0

# 6. GitHub Actions vai automaticamente:
#    ✓ Compilar
#    ✓ Criar pacote
#    ✓ Publicar no Marketplace
#    ✓ Criar GitHub Release
```

### 2️⃣ Correção de Bug (Patch Release)

```bash
# 1. Criar branch para o fix
git checkout -b fix/corrige-erro-compilacao
git push origin fix/corrige-erro-compilacao

# 2. Fazer as correções
# ... editar código ...

# 3. Commit e push
git add .
git commit -m "fix: corrige erro de compilação no Maven"
git push

# 4. Abrir Pull Request para main
# CI vai rodar automaticamente e testar

# 5. Após merge, criar nova versão
git checkout main
git pull
npm version patch  # 1.0.0 → 1.0.1
git push
git push --tags

# Publicado automaticamente! 🎉
```

### 3️⃣ Nova Funcionalidade (Minor Release)

```bash
# 1. Desenvolver em branch
git checkout -b feature/suporte-gradle
# ... desenvolver funcionalidade ...

# 2. Push para develop primeiro (teste)
git checkout develop
git merge feature/suporte-gradle
git push origin develop
# Pre-release é criado automaticamente!

# 3. Baixar e testar pre-release
# Vá para: https://github.com/lucasbiel7/cucumber-java-runner/releases
# Baixe o .vsix da pre-release
code --install-extension cucumber-java-runner-1.1.0-beta.X.vsix

# 4. Se tudo OK, merge para main
git checkout main
git merge develop
npm version minor  # 1.0.1 → 1.1.0
git push
git push --tags

# Publicado! 🚀
```

### 4️⃣ Breaking Change (Major Release)

```bash
# 1. Desenvolver mudanças grandes
git checkout -b feature/nova-arquitetura

# 2. Atualizar CHANGELOG.md
echo "## [2.0.0] - $(date +%Y-%m-%d)

### BREAKING CHANGES
- Nova arquitetura de execução
- API renovada
- Requer VS Code 1.95+

### Added
- Suporte completo para Gradle
" >> CHANGELOG.md

# 3. Merge para develop → testar
git checkout develop
git merge feature/nova-arquitetura
git push origin develop

# 4. Testar pre-release extensivamente!

# 5. Merge para main
git checkout main
git merge develop
npm version major  # 1.1.0 → 2.0.0
git push
git push --tags

# Nova versão major publicada! 🎊
```

### 5️⃣ Hotfix em Produção

```bash
# 1. Criar branch direto da main
git checkout main
git checkout -b hotfix/erro-critico
git push origin hotfix/erro-critico

# 2. Fazer correção
# ... código ...

# 3. Commit
git add .
git commit -m "fix: corrige erro crítico na execução"
git push

# 4. PR direto para main (urgente!)
# Após merge:

# 5. Publicar imediatamente
git checkout main
git pull
npm version patch  # 2.0.0 → 2.0.1
git push
git push --tags

# Hotfix publicado em minutos! ⚡
```

### 6️⃣ Testar sem Publicar

```bash
# Opção 1: Manual Pre-Release
# Vá para: https://github.com/lucasbiel7/cucumber-java-runner/actions
# Selecione "Pre-Release" workflow
# Clique em "Run workflow"
# Escolha branch "develop"
# Clique "Run workflow"

# Opção 2: Push para develop
git checkout develop
# ... fazer mudanças ...
git commit -am "test: testando nova feature"
git push origin develop
# Pre-release criado automaticamente

# Baixar .vsix da pre-release e testar localmente
```

### 7️⃣ Reverter Publicação

```bash
# Se publicou versão com problema:

# 1. Despublicar do marketplace (manual)
# https://marketplace.visualstudio.com/manage

# 2. Deletar tag e release no GitHub
git tag -d v1.0.2
git push origin :refs/tags/v1.0.2

# 3. Corrigir o problema
# ... código ...

# 4. Publicar versão corrigida
npm version patch  # v1.0.3
git push
git push --tags
```

## 🔍 Verificar Status dos Workflows

### Ver todos os workflows

```bash
# No navegador:
https://github.com/lucasbiel7/cucumber-java-runner/actions

# Ou usar GitHub CLI:
gh run list
```

### Ver logs de um workflow específico

```bash
# Listar últimas execuções
gh run list --workflow=publish.yml

# Ver logs da última execução
gh run view $(gh run list --workflow=publish.yml --json databaseId --jq '.[0].databaseId') --log
```

### Re-executar workflow que falhou

```bash
# No navegador:
# Actions → Selecionar workflow → Re-run failed jobs

# Ou GitHub CLI:
gh run rerun <run-id>
```

## 📊 Monitorar Publicações

### Após criar tag, verificar:

1. **GitHub Actions**
   ```
   https://github.com/lucasbiel7/cucumber-java-runner/actions
   ```
   - Ver se workflow iniciou
   - Acompanhar progresso em tempo real

2. **GitHub Releases**
   ```
   https://github.com/lucasbiel7/cucumber-java-runner/releases
   ```
   - Verificar se release foi criada
   - Conferir se .vsix foi anexado
   - Ler release notes geradas

3. **VS Code Marketplace**
   ```
   https://marketplace.visualstudio.com/items?itemName=lucasbiel7.cucumber-java-runner
   ```
   - Verificar nova versão (pode levar alguns minutos)
   - Conferir metadados e screenshots

4. **Testar Instalação**
   ```bash
   code --install-extension lucasbiel7.cucumber-java-runner
   # ou
   cursor --install-extension lucasbiel7.cucumber-java-runner
   ```

## 🎨 Labels para Release Notes

Use estas labels em PRs para categorização automática:

```bash
# Nova funcionalidade
git commit -m "feat: adiciona suporte Gradle"
# Label: enhancement

# Correção de bug
git commit -m "fix: corrige erro Maven"
# Label: bug

# Documentação
git commit -m "docs: atualiza README"
# Label: documentation

# Performance
git commit -m "perf: otimiza compilação"
# Label: performance

# Refatoração
git commit -m "refactor: simplifica código"
# Label: refactor
```

## 🔧 Troubleshooting Workflows

### Workflow não dispara

```bash
# Verificar se tag foi criada e enviada
git tag
git ls-remote --tags origin

# Se tag não existe no remote:
git push --tags

# Ver por que workflow não rodou
# Actions → All workflows → Filtrar por branch/tag
```

### Publicação falha

```bash
# 1. Ver logs completos
# Actions → Workflow falhado → Job → Step que falhou

# 2. Problemas comuns:
#    - Token expirado → Renovar VSCE_TOKEN
#    - Versão já existe → Incrementar versão
#    - Publisher não existe → Criar no marketplace

# 3. Re-executar após correção
# Actions → Re-run jobs
```

### CI passa mas publish falha

```bash
# Geralmente é problema de token/permissões

# 1. Verificar secret
# Settings → Secrets → VSCE_TOKEN

# 2. Testar publicação manual
npx vsce publish -p <seu-token>

# 3. Se manual funciona, problema é no secret do GitHub
# Atualize o secret com token válido
```

## 📝 Checklist Antes de Publicar

- [ ] Código compilado sem erros
- [ ] Tests passando (se houver)
- [ ] CHANGELOG.md atualizado
- [ ] Versão incrementada no package.json
- [ ] README.md atualizado (se necessário)
- [ ] Testado localmente (instalação manual do .vsix)
- [ ] Branch correta (main para produção)
- [ ] VSCE_TOKEN configurado e válido
- [ ] Commits com mensagens descritivas

## 🎯 Boas Práticas

1. **Sempre teste em develop primeiro** (pre-release)
2. **Use Semantic Versioning** (MAJOR.MINOR.PATCH)
3. **Escreva changelog detalhado**
4. **Teste o .vsix localmente** antes de publicar
5. **Monitore feedback** após publicação
6. **Responda issues rapidamente**

---

**Pronto para automatizar suas publicações! 🚀**

