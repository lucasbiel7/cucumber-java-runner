# Cucumber Java Easy Runner

![Cucumber Java Easy Runner](https://raw.githubusercontent.com/hakkietem350/Cucumber-Java-Easy-Runner/main/images/logo.png)

A VS Code extension that allows you to easily run Cucumber feature files in Java projects. You can run feature files, scenarios, and example rows directly from the VS Code interface in projects using the Cucumber-JVM framework.

## ✨ Features

- 🥒 **Run the entire feature file**: Right-click on a feature file in the explorer or in the context menu when open in the editor to run the entire feature file
- 🔍 **Run a single scenario**: Right-click on a specific scenario or scenario outline to run only that scenario
- 📋 **Run example rows**: Select a specific example row in a Scenario Outline to run only that example
- ▶️ **CodeLens Play Buttons**: Interactive play buttons appear directly on Feature, Scenario, and Example lines for one-click execution (similar to IntelliJ IDEA and JUnit in VS Code)

- 🔄 **Automatic configuration**: Automatically detects glue path, no manual configuration required
- ⚡ **Fast execution**: Provides fast execution by directly using the Cucumber CLI in Maven projects
- 🚫 **No dependencies**: Works without additional plugins or dependencies

## 🚀 Usage

### 1. CodeLens Play Buttons (Recommended)

The extension automatically adds clickable play buttons directly on your feature file lines:

- **$(play-circle)** - Appears on `Feature:` lines to run the entire feature
- **$(play)** - Appears on `Scenario:` and `Scenario Outline:` lines to run individual scenarios
- **$(debug-start)** - Appears on example data rows to run specific examples

Example feature file with CodeLens buttons:
```gherkin
$(play-circle) Feature: Shopping Cart

  $(play) Scenario: Adding an item to cart
    Given I am on the product page
    When I click "Add to Cart"
    Then the item should be added to my cart
    And the cart count should be updated

  $(play) Scenario Outline: User login with different credentials
    Given I am on the login page
    When I enter "<username>" and "<password>"
    Then I should see the "<result>" message

    Examples:
      | username | password | result       |
      $(debug-start) | admin    | admin123 | Welcome!     |
      $(debug-start) | user1    | pass123  | Welcome!     |
      $(debug-start) | invalid  | wrong    | Access Denied|
```

### 2. Context Menu Options

You can also use traditional right-click context menus:

- Right-click on a `.feature` file in the file explorer and select "Cucumber: Run Feature"
- Right-click in an open feature file and select "Cucumber: Run Feature", "Cucumber: Run Scenario", or "Cucumber: Run Example"

Example of context menu:
```
┌─────────────────────────────┐
│   ✂️ Cut                    │
│   📋 Copy                   │
│   📋 Paste                  │
│   ────────────────────────  │
│ ▶️ Cucumber: Run Feature    │
│ ▶️ Cucumber: Run Scenario   │
│ ▶️ Cucumber: Run Example    │
│   ────────────────────────  │
│   📝 Open to the Side       │
└─────────────────────────────┘
```

## 🎨 Customization

### Button Colors

You can customize the color of the CodeLens play buttons by adding this to your settings.json:

```json
{
  "workbench.colorCustomizations": {
    "editorCodeLens.foreground": "#22C55E"
  }
}
```

**Note**: If you don't set a custom color, VS Code's default CodeLens color will be used.

## 📦 Installation

You can install the extension from the VS Code Marketplace or manually install the `.vsix` file:

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions view (View -> Extensions or Ctrl+Shift+X)
3. Search for "Cucumber Java Easy Runner"
4. Click Install

### Manual Installation
1. Download the `.vsix` file from [Releases](https://github.com/hakkietem350/Cucumber-Java-Easy-Runner/releases)
2. Open the Extensions view in VS Code
3. Click on the "..." menu and select "Install from VSIX"
4. Select the downloaded `.vsix` file

## ⚙️ Requirements

- Java JDK 8 or higher
- Maven 3.6 or higher must be installed
- Project must have a Maven structure
- Cucumber-JVM dependencies must be defined in your project

## 🔧 Configuration

This extension works out of the box with standard Maven project structures. However, if you have a custom setup, you can configure some options:

- The extension will automatically detect the glue path for your step definitions
- If the automatic detection fails, you'll be prompted to enter your glue path manually
- CodeLens buttons are automatically enabled for all `.feature` files

## ❓ Troubleshooting

- **CodeLens buttons not showing**: Make sure the extension is activated by opening a `.feature` file or running a Cucumber command
- **Glue path not found error**: You will be asked to manually specify your glue path, e.g. `com.example.steps`
- **Test execution error**: Make sure that the Maven structure is correct and that Cucumber dependencies are defined in pom.xml
- **No Cucumber version found**: Ensure that your project has Cucumber dependencies in the pom.xml file

## 🛠️ Development

If you want to develop this extension:

```bash
# Install dependencies
npm install

# Compile the extension
npm run compile

# Create the VSIX package
npx vsce package --allow-star-activation
```

## 🔄 Reporting Issues

If you encounter any issues, please report them on the [GitHub Issues](https://github.com/hakkietem350/Cucumber-Java-Easy-Runner/issues) page.

## 📄 License

[MIT](LICENSE)

---

Developer: Hakkı Etem 