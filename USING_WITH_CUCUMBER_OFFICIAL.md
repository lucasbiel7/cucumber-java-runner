# Using with Cucumber Official Extension

## 🎯 Recommended Setup

For the best Cucumber development experience in VS Code, we recommend installing **both** extensions together:

### 1. Official Cucumber Extension
**Extension ID**: `CucumberOpen.cucumber-official`

**Install**: [Marketplace Link](https://marketplace.visualstudio.com/items?itemName=CucumberOpen.cucumber-official)

**Provides**:
- ✅ Gherkin syntax highlighting
- ✅ Auto-completion for keywords (Given, When, Then, etc.)
- ✅ Document formatting
- ✅ Syntax validation
- ✅ Step definition navigation
- ✅ Language server features

### 2. Cucumber Java Runner (This Extension)
**Extension ID**: `lucasbiel7.cucumber-java-runner`

**Install**: [Marketplace Link](https://marketplace.visualstudio.com/items?itemName=lucasbiel7.cucumber-java-runner)

**Provides**:
- ✅ Test Explorer integration
- ✅ Run/Debug tests from VS Code
- ✅ Real pass/fail status
- ✅ Individual scenario execution
- ✅ Maven project integration
- ✅ Detailed test results

## 🚀 Installation

```bash
# Install both extensions
code --install-extension CucumberOpen.cucumber-official
code --install-extension lucasbiel7.cucumber-java-runner

# Or for Cursor
cursor --install-extension CucumberOpen.cucumber-official
cursor --install-extension lucasbiel7.cucumber-java-runner
```

## 💡 How They Work Together

```
┌─────────────────────────────────────────────────────────────┐
│                     Your .feature File                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Feature: User Login                    ← Official Cucumber │
│                                           (syntax colors)    │
│    Scenario: Successful login           ← Auto-completion   │
│      Given user is on login page        ← Formatting        │
│      When user enters credentials       ← Validation        │
│      Then user should be logged in                          │
│                                                              │
│  [▶ Run] [🐛 Debug]                     ← Our Extension     │
│  ↓                                        (Test Explorer)    │
│  Test Explorer shows:                                       │
│  ✅ Successful login                                        │
│  ❌ Failed login                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Division of Responsibilities

| Feature | Official Cucumber | Cucumber Java Runner |
|---------|------------------|---------------------|
| Syntax Highlighting | ✅ | - |
| Auto-completion | ✅ | - |
| Document Formatting | ✅ | - |
| Validation | ✅ | - |
| Step Navigation | ✅ | - |
| Test Execution | - | ✅ |
| Test Debugging | - | ✅ |
| Test Explorer | - | ✅ |
| Pass/Fail Status | - | ✅ |
| Maven Integration | - | ✅ |

## ⚙️ Recommended Settings

Add these to your VS Code `settings.json`:

```json
{
  // Cucumber Official Extension Settings
  "[feature]": {
    "editor.defaultFormatter": "CucumberOpen.cucumber-official",
    "editor.formatOnSave": true
  },

  // Cucumber Java Runner Settings
  "cucumberJavaRunner.enableCodeLens": false,  // Use Test Explorer instead

  // Optional: Auto-format on save
  "editor.formatOnSave": true,

  // Optional: Show test results in editor
  "testing.gutterEnabled": true
}
```

## 🎨 Workflow Example

### Writing Features

1. **Create/Edit** `.feature` files
   - Official Cucumber provides syntax highlighting ✨
   - Auto-complete Gherkin keywords 📝
   - Real-time validation ✅

2. **Format** your feature file
   - Use `Format Document` (Shift+Alt+F or Cmd+Shift+I)
   - Official Cucumber formats with proper indentation and style 🎨

3. **Navigate** to step definitions
   - Click on steps to jump to implementation 🔍
   - Provided by Official Cucumber

### Running Tests

1. **Open Test Explorer** (test tube icon in activity bar)
   - Our extension shows all features and scenarios 📊

2. **Run tests**
   - Click ▶ button next to any test
   - See real pass/fail status ✅❌

3. **Debug tests**
   - Right-click → Debug Test
   - Set breakpoints in step definitions 🐛

4. **View results**
   - Test Explorer shows which scenarios passed/failed
   - Click failed tests to see error details 📝

## 🔧 Troubleshooting

### Problem: Formatting doesn't work

**Solution**: Make sure Official Cucumber is installed and set as default formatter:

```json
"[feature]": {
  "editor.defaultFormatter": "CucumberOpen.cucumber-official"
}
```

### Problem: Test Explorer is empty

**Solution**: Make sure Cucumber Java Runner is installed and activated:
1. Check you have `.feature` files in your workspace
2. Click refresh button in Test Explorer
3. Check Output → Cucumber Java Runner for logs

### Problem: Syntax highlighting is missing

**Solution**: Install Official Cucumber extension:
```bash
code --install-extension CucumberOpen.cucumber-official
```

### Problem: Can't run tests

**Solution**: Make sure Cucumber Java Runner is installed:
```bash
code --install-extension lucasbiel7.cucumber-java-runner
```

## 🎁 Benefits of Using Both

### With Official Cucumber Only
- ✅ Nice syntax and formatting
- ❌ No easy way to run tests from VS Code
- ❌ Have to use terminal manually
- ❌ No Test Explorer integration

### With Cucumber Java Runner Only (v1.0.3 and older)
- ✅ Easy test execution
- ❌ Lost formatting features
- ❌ Conflict with Official extension
- ❌ Poor development experience

### With Both (Cucumber Java Runner v1.0.4+)
- ✅ Perfect syntax highlighting and formatting
- ✅ Easy test execution from Test Explorer
- ✅ Real pass/fail status
- ✅ Full debugging support
- ✅ Step navigation
- ✅ Best of both worlds! 🎉

## 📚 Additional Resources

### Official Cucumber Extension
- [Documentation](https://cucumber.io/docs/tools/cucumber-vscode/)
- [GitHub Repository](https://github.com/cucumber/vscode)
- [Report Issues](https://github.com/cucumber/vscode/issues)

### Cucumber Java Runner
- [Documentation](https://github.com/lucasbiel7/cucumber-java-runner)
- [GitHub Repository](https://github.com/lucasbiel7/cucumber-java-runner)
- [Report Issues](https://github.com/lucasbiel7/cucumber-java-runner/issues)

## ⭐ Recommendation

**For the best Cucumber experience in VS Code, install both extensions!**

```bash
# Quick install command
code --install-extension CucumberOpen.cucumber-official && \
code --install-extension lucasbiel7.cucumber-java-runner
```

Then enjoy the perfect combination of:
- Beautiful syntax and formatting (Official Cucumber)
- Powerful test execution and debugging (Cucumber Java Runner)

Happy testing! 🥒✨
