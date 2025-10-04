# 🔐 Configuração de Secrets do GitHub

Para usar os GitHub Actions workflows de publicação, você precisa configurar secrets.

## 📋 Secrets Necessários

### 1. VSCE_TOKEN (Obrigatório para publicar)

Este é o Personal Access Token do Azure DevOps necessário para publicar no VS Code Marketplace.

## 🎯 Passo a Passo Completo

### Parte 1: Criar Personal Access Token no Azure DevOps

#### 1.1 Acessar Azure DevOps

```
https://dev.azure.com
```

- Faça login com sua conta Microsoft/GitHub
- Se não tiver organização, será criada automaticamente

#### 1.2 Criar Personal Access Token

1. Clique no ícone de **usuário** (canto superior direito)
2. Clique em **Personal access tokens**
3. Clique em **New Token**

#### 1.3 Configurar o Token

Preencha os campos:

- **Name**: `github-actions-vscode-marketplace`
- **Organization**: `All accessible organizations`
- **Expiration (UTC)**:
  - Recomendado: 1 ano
  - Pode escolher: Custom defined, 90 days, 1 year
- **Scopes**:
  - ✅ Marque **Marketplace**
  - ✅ Dentro de Marketplace, marque:
    - `Acquire`
    - `Publish`
    - `Manage`

#### 1.4 Copiar o Token

1. Clique em **Create**
2. **IMPORTANTE**: Copie o token imediatamente!
3. O token só é mostrado uma vez
4. Salve em um lugar seguro (ex: gerenciador de senhas)

### Parte 2: Adicionar Secret no GitHub

#### 2.1 Acessar Configurações do Repositório

```
https://github.com/lucasbiel7/cucumber-java-runner/settings/secrets/actions
```

Ou manualmente:

1. Vá para seu repositório
2. Clique em **Settings** (aba superior)
3. No menu lateral: **Secrets and variables** → **Actions**

#### 2.2 Criar Novo Secret

1. Clique em **New repository secret**
2. Preencha:
   - **Name**: `VSCE_TOKEN`
   - **Value**: Cole o token do Azure DevOps
3. Clique em **Add secret**

#### 2.3 Verificar

Você deve ver:
```
✅ VSCE_TOKEN
   Updated X seconds ago
```

## ✅ Verificação

Para testar se está funcionando:

### Opção 1: Verificar manualmente

1. Vá para **Actions** no seu repositório
2. Se houver workflows falhando por falta de token, re-execute após configurar

### Opção 2: Criar tag de teste

```bash
# Criar tag de teste
git tag v1.0.0-test
git push origin v1.0.0-test

# Verificar em Actions se o workflow de publish inicia
# Se funcionar, delete a tag depois:
git tag -d v1.0.0-test
git push origin :refs/tags/v1.0.0-test
```

## 🔄 Renovar Token Expirado

Quando o token expirar:

1. Volte para Azure DevOps
2. **Personal access tokens**
3. Encontre o token antigo
4. Clique em **Regenerate**
5. Copie o novo token
6. Atualize no GitHub:
   - Settings → Secrets → Actions
   - Clique em **VSCE_TOKEN**
   - Clique em **Update secret**
   - Cole o novo token
   - Clique em **Update secret**

## 🔐 Boas Práticas de Segurança

### ✅ DO (Fazer)

- ✅ Use tokens com prazo de validade
- ✅ Limite os escopos apenas ao necessário (Marketplace → Manage)
- ✅ Salve o token em um gerenciador de senhas
- ✅ Revogue tokens que não estão sendo usados
- ✅ Use secrets do GitHub, nunca commite tokens

### ❌ DON'T (Não Fazer)

- ❌ Nunca commite o token no código
- ❌ Não compartilhe o token publicamente
- ❌ Não use o mesmo token para múltiplos propósitos
- ❌ Não crie tokens sem data de expiração
- ❌ Não adicione o token em arquivos de configuração

## 📝 Outros Secrets (Opcionais)

### GITHUB_TOKEN

O `GITHUB_TOKEN` é **automaticamente** fornecido pelo GitHub Actions.
**Não precisa configurar!**

Ele é usado para:
- Criar releases
- Fazer upload de artifacts
- Comentar em issues/PRs

## 🐛 Troubleshooting

### "VSCE_TOKEN not found"

**Problema**: Workflow falha com erro de token não encontrado.

**Solução**:
1. Verifique se o secret está criado
2. Verifique o nome exato: `VSCE_TOKEN` (case-sensitive)
3. Re-execute o workflow após adicionar o secret

### "Error: Failed to get Azure DevOps token"

**Problema**: Token inválido ou expirado.

**Solução**:
1. Verifique se copiou o token completo
2. Verifique se o token não expirou
3. Crie novo token e atualize no GitHub

### "Error: 401 Unauthorized"

**Problema**: Token não tem permissões corretas.

**Solução**:
1. Verifique se marcou **Marketplace** → **Manage**
2. Crie novo token com permissões corretas
3. Atualize no GitHub

### "Error: Publisher not found"

**Problema**: Publisher não existe no marketplace.

**Solução**:
1. Crie o publisher primeiro em: https://marketplace.visualstudio.com/manage
2. Use o mesmo ID do `package.json` (`lucasbiel7`)
3. Tente publicar novamente

## 📚 Recursos

- [Azure DevOps PAT Documentation](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [VSCE Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

---

**Secrets configurados! Agora você pode publicar automaticamente! 🚀**
