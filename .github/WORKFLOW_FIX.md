# Fix: Publish Workflow Not Triggering

## 🐛 Problema Identificado

Quando o workflow `tag-release.yml` cria uma tag automaticamente usando `GITHUB_TOKEN`, o workflow `publish.yml` **não é disparado**.

### Por que isso acontece?

GitHub Actions tem uma proteção de segurança: eventos criados com `GITHUB_TOKEN` não disparam outros workflows. Isso evita loops infinitos acidentais.

### Fluxo Atual (Não Funciona)

```
Push to main
  ↓
Auto Tag Release workflow executa
  ↓
Cria tag com GITHUB_TOKEN
  ↓
❌ Publish workflow NÃO dispara (bloqueado pelo GitHub)
```

## ✅ Solução Implementada

Usar um **Personal Access Token (PAT)** ao invés do `GITHUB_TOKEN` padrão.

### Fluxo Corrigido (Funciona)

```
Push to main
  ↓
Auto Tag Release workflow executa
  ↓
Cria tag com PAT_TOKEN
  ↓
✅ Publish workflow DISPARA automaticamente
  ↓
Publica no VS Code Marketplace
  ↓
Cria GitHub Release
```

## 🔧 Mudanças Implementadas

### 1. Atualização do `tag-release.yml`

```yaml
# Antes (não disparava o publish)
- name: Checkout code
  uses: actions/checkout@v4
  with:
    fetch-depth: 0

- name: Create and push tag
  run: |
    git push origin "${{ steps.package_version.outputs.tag }}"
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

# Depois (dispara o publish)
- name: Checkout code
  uses: actions/checkout@v4
  with:
    fetch-depth: 0
    token: ${{ secrets.PAT_TOKEN || secrets.GITHUB_TOKEN }}

- name: Create and push tag
  run: |
    git push origin "${{ steps.package_version.outputs.tag }}"
  env:
    GITHUB_TOKEN: ${{ secrets.PAT_TOKEN || secrets.GITHUB_TOKEN }}
```

### 2. Fallback Gracioso

O workflow usa `${{ secrets.PAT_TOKEN || secrets.GITHUB_TOKEN }}`:

- **Com PAT_TOKEN configurado**: ✅ Funciona perfeitamente, dispara o publish
- **Sem PAT_TOKEN**: ⚠️ Workflow não falha, mas publish não é disparado

## 📋 Ação Necessária

**Você precisa configurar o `PAT_TOKEN`** nos secrets do repositório.

### Passo a Passo Rápido

1. **Criar PAT no GitHub**:
   - Ir para: https://github.com/settings/tokens
   - "Generate new token (classic)"
   - Selecionar scopes: `repo` + `workflow`
   - Copiar o token

2. **Adicionar ao repositório**:
   - Ir para: Settings → Secrets and variables → Actions
   - "New repository secret"
   - Nome: `PAT_TOKEN`
   - Valor: colar o token
   - "Add secret"

3. **Testar**:
   - Fazer commit da mudança de versão
   - Push para main
   - Verificar se ambos workflows executam

### Documentação Completa

Ver [SETUP_PAT.md](SETUP_PAT.md) para instruções detalhadas e troubleshooting.

## 🧪 Como Testar

### Antes de configurar PAT_TOKEN

```bash
# Verificar setup atual
./.github/scripts/check-secrets.sh
```

### Depois de configurar PAT_TOKEN

1. Atualizar versão no package.json
2. Atualizar CHANGELOG.md
3. Commit e push
4. Verificar na aba Actions:
   - ✅ "Auto Tag Release" deve executar e criar tag
   - ✅ "Publish Extension" deve disparar automaticamente após a tag

## 📚 Referências

- [GitHub Docs: Triggering workflows from workflows](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow)
- [GitHub Docs: Creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

## 🔒 Segurança

- ✅ PAT é armazenado como secret (criptografado)
- ✅ PAT não aparece em logs
- ✅ Apenas scopes necessários (`repo` + `workflow`)
- ✅ Pode configurar expiração
- ⚠️ **NUNCA commitar o PAT no código**

## ✨ Benefícios

- 🚀 Release totalmente automatizado
- 🔄 Um único push dispara todo o pipeline
- 📦 Publicação automática no marketplace
- 🏷️ GitHub Release criado automaticamente
- 📝 Release notes extraídas do CHANGELOG
- ⏱️ Economia de tempo e menos erros manuais
