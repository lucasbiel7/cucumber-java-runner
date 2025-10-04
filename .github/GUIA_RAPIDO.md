# 🚀 Guia Rápido - Configurar PAT_TOKEN

## ⚠️ PROBLEMA IDENTIFICADO

O workflow de publicação não está sendo disparado quando uma tag é criada automaticamente.

## 🎯 SOLUÇÃO EM 3 PASSOS

### 1️⃣ Criar Personal Access Token

1. Acesse: https://github.com/settings/tokens
2. Clique em **"Generate new token"** → **"Generate new token (classic)"**
3. Configure:
   - **Note**: `cucumber-java-runner-releases`
   - **Expiration**: 90 dias ou 1 ano (você escolhe)
   - **Scopes** (marque estes):
     - ✅ **repo** (Full control of private repositories)
     - ✅ **workflow** (Update GitHub Action workflows)
4. Clique em **"Generate token"**
5. **COPIE O TOKEN AGORA** (você não verá novamente!)

### 2️⃣ Adicionar Token ao Repositório

1. Vá para: https://github.com/lucasbiel7/cucumber-java-runner/settings/secrets/actions
2. Clique em **"New repository secret"**
3. Configure:
   - **Name**: `PAT_TOKEN` (exatamente assim, case-sensitive)
   - **Value**: Cole o token que você copiou
4. Clique em **"Add secret"**

### 3️⃣ Testar

1. Faça commit das mudanças atuais:
   ```bash
   git add .
   git commit -m "fix: configure PAT_TOKEN for workflow trigger"
   git push origin main
   ```

2. Verifique na aba **Actions** do GitHub:
   - ✅ "Auto Tag Release" deve executar e criar tag `v1.0.3`
   - ✅ "Publish Extension" deve disparar automaticamente

## ✅ RESULTADO ESPERADO

```
Push para main
    ↓
Auto Tag Release executa (usa PAT_TOKEN)
    ↓
Cria tag v1.0.3
    ↓
✅ Publish Extension DISPARA automaticamente
    ↓
Extensão publicada no VS Code Marketplace
    ↓
GitHub Release criado com changelog
```

## 🔍 VERIFICAR STATUS ATUAL

Execute este comando para ver o status:

```bash
./.github/scripts/check-secrets.sh
```

## 📚 DOCUMENTAÇÃO COMPLETA

- **Configuração detalhada**: [SETUP_PAT.md](SETUP_PAT.md)
- **Explicação técnica**: [WORKFLOW_FIX.md](WORKFLOW_FIX.md)
- **Processo de release**: [RELEASE_NOTES.md](RELEASE_NOTES.md)

## ❓ PERGUNTAS FREQUENTES

### O token expira?
Sim, você escolhe ao criar (90 dias, 1 ano, etc). Quando expirar, basta criar um novo e atualizar o secret.

### É seguro?
Sim! O token fica como secret do GitHub (criptografado) e nunca aparece nos logs.

### Preciso fazer isso toda vez?
Não! Configure uma vez e funciona para todos os releases futuros.

### E se eu não configurar?
O workflow vai continuar criando tags, mas a publicação no marketplace não será automática.

## 🆘 PROBLEMAS?

1. **Token não funciona**: Verifique se os scopes `repo` e `workflow` estão marcados
2. **Secret não encontrado**: Nome deve ser exatamente `PAT_TOKEN` (maiúsculo)
3. **Token expirado**: Crie um novo e atualize o secret

---

**💡 Dica**: Depois de configurar, o processo de release fica 100% automático:
1. Atualizar `package.json` e `CHANGELOG.md`
2. Fazer commit e push
3. Pronto! Tag, publicação e release são automáticos.
