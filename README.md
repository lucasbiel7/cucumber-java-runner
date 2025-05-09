# Cucumber Java Easy Runner

![Cucumber Java Easy Runner](https://raw.githubusercontent.com/hakkietem350/Cucumber-Java-Easy-Runner/main/images/logo.png)

A VS Code extension that allows you to easily run Cucumber feature files in Java projects. You can run feature files, scenarios, and example rows directly from the VS Code interface in projects using the Cucumber-JVM framework.

## Features

- 🥒 **Run the entire feature file**: Right-click on a feature file in the explorer or in the context menu when open in the editor to run the entire feature file
- 🔍 **Run a single scenario**: Right-click on a specific scenario or scenario outline to run only that scenario
- 📋 **Run example rows**: Select a specific example row in a Scenario Outline to run only that example
- 🔄 **Automatic configuration**: Automatically detects glue path, no manual configuration required
- ⚡ **Fast execution**: Provides fast execution by directly using the Cucumber CLI in Maven projects

## Usage

### 1. Running a Feature File
   - Right-click on a `.feature` file in the file explorer and select "Cucumber: Run Feature", or
   - Right-click in an open feature file and select "Cucumber: Run Feature"

### 2. Running a Specific Scenario
   - Right-click inside a scenario in an open feature file and select "Cucumber: Run Scenario"

### 3. Running a Specific Example
   - Right-click on a data row in an Examples table in an open feature file and select "Cucumber: Run Example"

## Installation

You can install the extension from the VS Code Marketplace or manually install the `.vsix` file:

1. Open the Extensions view in VS Code
2. Click on the "..." menu and select "Install from VSIX"
3. Select the downloaded `.vsix` file

## Requirements

- Java JDK 8 or higher
- Maven 3.6 or higher must be installed
- Project must have a Maven structure
- Cucumber-JVM dependencies must be defined in your project

## Troubleshooting

- **Glue path not found error**: You will be asked to manually specify your glue path, e.g. `com.example.steps`
- **Test execution error**: Make sure that the Maven structure is correct and that Cucumber dependencies are defined in pom.xml

## Development

If you want to develop this extension:

```bash
# Install dependencies
npm install

# Compile the extension
npm run compile

# Create the VSIX package
npx vsce package
```

## License

[MIT](LICENSE)

---

Developer: Hakki Etem 