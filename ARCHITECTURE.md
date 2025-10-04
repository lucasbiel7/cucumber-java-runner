# Cucumber Java Easy Runner - Architecture

## 📁 Project Structure

The extension has been refactored following the **Single Responsibility Principle** for better maintainability and clarity.

```
src/
├── extension.ts           # Main entry point - registers commands and initializes components
├── types.ts              # TypeScript interfaces and types
├── featureParser.ts      # Parses .feature files and extracts scenarios/examples
├── mavenResolver.ts      # Resolves Maven dependencies and classpath
├── testRunner.ts         # Executes Cucumber tests via terminal
├── debugRunner.ts        # Starts Java debug sessions for Cucumber tests
├── testController.ts     # Manages VS Code Test Explorer integration
└── codeLensProvider.ts   # Provides inline run/debug buttons in .feature files
```

## 🎯 Module Responsibilities

### **extension.ts**
- Main entry point for the VS Code extension
- Registers all commands
- Initializes Test Controller and CodeLens Provider
- Acts as coordinator between modules

### **types.ts**
- Defines shared interfaces: `ScenarioInfo`, `ExampleInfo`, `FeatureInfo`
- No implementation logic, only type definitions

### **featureParser.ts**
- Parses `.feature` files
- Extracts feature, scenario, and example information
- Functions:
  - `parseFeatureFile()` - Parse entire feature file
  - `findScenarioAtLine()` - Find scenario at cursor position
  - `findExampleAtLine()` - Find example row at cursor position
  - `findExampleRowInfo()` - Helper for example row detection

### **mavenResolver.ts**
- Maven project integration
- Functions:
  - `resolveMavenClasspath()` - Resolves all Maven dependencies (transitive + declared)
  - `findGluePath()` - Auto-detects step definitions package
  - `findStepsDir()` - Recursively searches for steps directories

### **testRunner.ts**
- Executes tests via terminal (non-debug mode)
- Functions:
  - `runSelectedTest()` - Main function to run feature/scenario/example
  - `runCucumberTest()` - Builds and executes Maven command
- Uses IntelliJ-style execution: `io.cucumber.core.cli.Main`

### **debugRunner.ts**
- Starts Java debug sessions
- Functions:
  - `debugSelectedTest()` - Main function to debug feature/scenario/example
  - `debugCucumberTest()` - Creates VS Code debug configuration
- Resolves Maven classpath before debugging
- Generates descriptive debug session names from feature content

### **testController.ts**
- Manages VS Code Test Explorer
- Class: `CucumberTestController`
  - Discovers `.feature` files in workspace
  - Creates test items for features, scenarios, and examples
  - Handles file watchers (create/change/delete)
  - Provides run and debug profiles
  - Integrates with `testRunner` and `debugRunner`

### **codeLensProvider.ts**
- Provides inline run/debug buttons
- Class: `CucumberCodeLensProvider`
  - Shows buttons on Feature lines
  - Shows buttons on Scenario/Scenario Outline lines
  - Shows buttons on Example data rows
  - Optional (disabled by default, Test Explorer is preferred)

## 🔄 Data Flow

### Run Test Flow
```
User clicks "Run"
  → extension.ts (command handler)
    → testRunner.runSelectedTest()
      → mavenResolver.findGluePath()
      → testRunner.runCucumberTest()
        → Terminal execution
```

### Debug Test Flow
```
User clicks "Debug"
  → extension.ts (command handler)
    → debugRunner.debugSelectedTest()
      → mavenResolver.findGluePath()
      → mavenResolver.resolveMavenClasspath()
      → debugRunner.debugCucumberTest()
        → VS Code debug session
```

### Test Explorer Flow
```
Workspace opens
  → testController.discoverTests()
    → featureParser.parseFeatureFile()
      → Creates test items

User clicks "Run" in Test Explorer
  → testController.runTests()
    → testRunner.runSelectedTest()
```

## 🎨 Design Patterns

1. **Single Responsibility Principle**: Each module has one clear purpose
2. **Separation of Concerns**: UI (extension.ts) separated from logic (runners, parsers)
3. **Dependency Injection**: Modules don't depend on each other directly, coordinated by extension.ts
4. **Factory Pattern**: testController creates test items
5. **Provider Pattern**: codeLensProvider provides inline actions

## 🧪 Testing Strategy

Each module can be tested independently:
- `featureParser` - Test with sample .feature files
- `mavenResolver` - Test with mock Maven projects
- `testRunner` - Test terminal command generation
- `debugRunner` - Test debug configuration generation
- `testController` - Test test discovery and execution
- `codeLensProvider` - Test CodeLens generation

## 📦 Build Output

```
out/
├── extension.js           # Compiled main entry point
├── types.js              # Compiled types
├── featureParser.js      # Compiled parser
├── mavenResolver.js      # Compiled Maven resolver
├── testRunner.js         # Compiled test runner
├── debugRunner.js        # Compiled debug runner
├── testController.js     # Compiled test controller
└── codeLensProvider.js   # Compiled CodeLens provider
```

Each `.js` file has a corresponding `.js.map` for source mapping.

## 🚀 Adding New Features

### To add a new command:
1. Add command definition to `package.json`
2. Register command handler in `extension.ts`
3. Implement logic in appropriate module (runner/parser/etc)

### To add new test discovery logic:
1. Modify `featureParser.ts` to extract new information
2. Update `testController.ts` to create appropriate test items

### To modify execution behavior:
1. Update `testRunner.ts` for terminal execution
2. Update `debugRunner.ts` for debug execution

## 📝 Version History

- **v0.3.0** - Refactored to modular architecture
- **v0.2.0** - Added Maven dependency resolution
- **v0.1.0** - Initial release with basic functionality
