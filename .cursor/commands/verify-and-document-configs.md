# Verify and Document Extension Configurations

## Objetivo
Verificar todas as configurações da extensão referenciadas no código e garantir que estão documentadas no `package.json` e `README.md`.

## Passos

### 1. Buscar Referências de Configuração no Código

```bash
# Buscar todas as chamadas getConfiguration
grep -r "getConfiguration('cucumberJavaRunner')" src/

# Buscar todos os config.get
grep -r "config\.get" src/ -A 2 -B 2
```

### 2. Listar Configurações Encontradas

Criar uma tabela com:
- Nome da configuração
- Arquivo onde é usada
- Linha do código
- Tipo de dado (string, boolean, array, etc.)
- Valor padrão usado no código
- Descrição do uso

### 3. Verificar package.json

Verificar se cada configuração encontrada está em:
```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "cucumberJavaRunner.NOME_CONFIG": { ... }
      }
    }
  }
}
```

**Campos obrigatórios para cada configuração:**
- `type`: tipo do valor (string, boolean, array, object)
- `default`: valor padrão
- `description`: descrição curta
- `order`: ordem de exibição nas configurações
- `markdownDescription` (opcional): descrição mais detalhada com exemplos

**Para arrays:**
```json
{
  "type": "array",
  "default": [],
  "items": {
    "type": "string"
  }
}
```

### 4. Verificar README.md

Garantir que existe uma seção `## ⚙️ Configuration` com:

#### 4.1. Tabela de Configurações

```markdown
### Available Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `cucumberJavaRunner.config1` | boolean | `false` | Descrição... |
| `cucumberJavaRunner.config2` | string | `""` | Descrição... |
```

**Importante:**
- Usar o nome COMPLETO com prefixo `cucumberJavaRunner.`
- Facilita busca pelos usuários (Ctrl+F)

#### 4.2. Exemplos de Configuração

Para cada configuração importante, adicionar exemplo prático:

```markdown
#### Nome da Configuração
Explicação de quando usar...
```json
{
  "cucumberJavaRunner.configName": "valor exemplo"
}
```
```

#### 4.3. Exemplo Completo

Incluir um exemplo com todas as configurações:

```markdown
#### Complete Configuration Example
```json
{
  "cucumberJavaRunner.config1": true,
  "cucumberJavaRunner.config2": "value",
  ...
}
```
```

### 5. Identificar Configurações Obsoletas

**IMPORTANTE:** Configurações que não são mais usadas no código devem ser removidas!

#### 5.1. Processo de Verificação

Para cada configuração no `package.json`:

1. **Buscar uso no código:**
```bash
# Substituir CONFIG_NAME pelo nome da configuração
grep -r "config\.get.*'CONFIG_NAME'" src/
grep -r 'config\.get.*"CONFIG_NAME"' src/
```

2. **Se não encontrar nenhum resultado:**
   - ⚠️ A configuração está obsoleta
   - Deve ser removida do `package.json`
   - Deve ser removida do `README.md`
   - Adicionar nota no `CHANGELOG.md` sobre a remoção

#### 5.2. Como Remover Configuração Obsoleta

**1. Remover do package.json:**
```json
// REMOVER o bloco completo:
"cucumberJavaRunner.configObsoleta": {
  "type": "...",
  "default": ...,
  ...
}
```

**2. Remover do README.md:**
- Remover linha da tabela de configurações
- Remover seção de exemplo (se existir)
- Remover do exemplo completo

**3. Documentar no CHANGELOG.md:**
```markdown
### Removed
- **BREAKING**: Removed `cucumberJavaRunner.configObsoleta` configuration (no longer used)
```

#### 5.3. Exemplo de Verificação

```bash
# Listar todas as configurações do package.json
grep -o '"cucumberJavaRunner\.[^"]*"' package.json | sort | uniq

# Para cada uma, verificar uso:
# enableCodeLens
grep -r "enableCodeLens" src/
# ✅ Encontrado em src/extension.ts - MANTER

# objectFactory
grep -r "objectFactory" src/
# ✅ Encontrado em src/cucumberRunner.ts - MANTER

# configAntiga
grep -r "configAntiga" src/
# ❌ Não encontrado - REMOVER
```

### 6. Checklist de Validação

- [ ] Todas as configurações usadas no código estão no `package.json`
- [ ] Todas as configurações do `package.json` estão no README
- [ ] **Todas as configurações do `package.json` são usadas no código (sem obsoletas)**
- [ ] Todos os nomes incluem o prefixo `cucumberJavaRunner.` no README
- [ ] Cada configuração tem descrição clara
- [ ] Configurações importantes têm exemplos de uso
- [ ] Existe um exemplo completo com todas as configurações
- [ ] Não há seções duplicadas no README
- [ ] Ordem das configurações é lógica (order: 1, 2, 3...)
- [ ] Configurações removidas estão documentadas no CHANGELOG

### 6. Arquivos a Verificar

**Código fonte (onde configurações são usadas):**
- `src/extension.ts`
- `src/cucumberRunner.ts`
- `src/mavenResolver.ts`
- `src/testController.ts`
- `src/resultProcessor.ts`
- `src/codeLensProvider.ts`
- `src/featureParser.ts`

**Documentação:**
- `package.json` → `contributes.configuration.properties`
- `README.md` → seção `## ⚙️ Configuration`

### 7. Padrões de Código a Buscar

```typescript
// Padrão 1: getConfiguration direto
const config = vscode.workspace.getConfiguration('cucumberJavaRunner');

// Padrão 2: get com tipo
const value = config.get<string>('configName');

// Padrão 3: get com default
const value = config.get('configName', defaultValue);

// Padrão 4: get sem tipo
const value = config.get('configName');
```

### 8. Exemplo de Nova Configuração

Se encontrar uma configuração não documentada:

**1. Adicionar no package.json:**
```json
"cucumberJavaRunner.novaConfig": {
  "type": "string",
  "default": "",
  "description": "Descrição curta",
  "order": 7,
  "markdownDescription": "Descrição detalhada com exemplo"
}
```

**2. Adicionar na tabela do README:**
```markdown
| `cucumberJavaRunner.novaConfig` | string | `""` | Descrição... |
```

**3. Adicionar exemplo no README:**
```markdown
#### Nova Config
Explicação...
```json
{
  "cucumberJavaRunner.novaConfig": "exemplo"
}
```
```

### 9. Comandos Úteis

```bash
# Contar configurações no package.json
grep -c "cucumberJavaRunner\." package.json

# Listar todas as configurações do package.json
grep "cucumberJavaRunner\." package.json | grep -o '"cucumberJavaRunner\.[^"]*"'

# Verificar se configuração existe no README
grep "cucumberJavaRunner.configName" README.md

# Ver contexto de uso de uma configuração
grep -r "configName" src/ -B 5 -A 5
```

### 10. Resultado Esperado

Ao final, deve-se ter:
- ✅ Lista completa de todas as configurações
- ✅ Todas documentadas no package.json
- ✅ Todas documentadas no README com exemplos
- ✅ Nenhuma configuração órfã (código sem doc ou doc sem código)
- ✅ Documentação clara e fácil de encontrar

## Notas Importantes

### ✅ O que FAZER:
- **Documentar** todas as configurações usadas no código
- **Remover** configurações obsoletas que não são mais usadas
- Sempre usar o prefixo completo `cucumberJavaRunner.` na documentação
- Manter ordem lógica: funcionalidades principais primeiro, avançadas depois
- Documentar remoções no CHANGELOG.md

### ❌ O que NÃO fazer:
- **Não criar** configurações que não existem no código
- **Não manter** configurações obsoletas (código limpo é melhor)
- Não remover configurações sem verificar o código primeiro

### 🔍 Regra de Ouro:
**Toda configuração no `package.json` DEVE ter uso correspondente no código `src/`**

Se uma configuração não é mais usada:
1. Remover do `package.json`
2. Remover do `README.md`
3. Documentar no `CHANGELOG.md` como **BREAKING CHANGE**
