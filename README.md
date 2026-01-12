# Cucumber Java Runner

A powerful VS Code extension that seamlessly integrates Cucumber feature files with VS Code's Test Explorer. Run and debug your Java Cucumber tests directly from the test panel with a clean, modern interface.

[![CI](https://github.com/lucasbiel7/cucumber-java-runner/actions/workflows/ci.yml/badge.svg)](https://github.com/lucasbiel7/cucumber-java-runner/actions/workflows/ci.yml)
[![Publish](https://github.com/lucasbiel7/cucumber-java-runner/actions/workflows/publish.yml/badge.svg)](https://github.com/lucasbiel7/cucumber-java-runner/actions/workflows/publish.yml)
[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/lucasbiel7.cucumber-java-runner?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=lucasbiel7.cucumber-java-runner)
[![VS Code Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/lucasbiel7.cucumber-java-runner)](https://marketplace.visualstudio.com/items?itemName=lucasbiel7.cucumber-java-runner)
[![Open VSX Version](https://img.shields.io/open-vsx/v/lucasbiel7/cucumber-java-runner?label=Open%20VSX)](https://open-vsx.org/extension/lucasbiel7/cucumber-java-runner)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/lucasbiel7/cucumber-java-runner)](https://open-vsx.org/extension/lucasbiel7/cucumber-java-runner)
[![License](https://img.shields.io/github/license/lucasbiel7/cucumber-java-runner)](https://github.com/lucasbiel7/cucumber-java-runner/blob/main/LICENSE)

## ✨ What's New in This Fork

This is an enhanced version of the original [Cucumber Java Easy Runner](https://github.com/hakkietem350/Cucumber-Java-Easy-Runner) with significant improvements:

### 🚀 Major Enhancements

- **📊 Code Coverage with Inline Visualization (v1.0.17)**: Full JaCoCo integration with VS Code Test Coverage API
  - 🎨 **Inline coverage display**: See covered/uncovered lines directly in the editor with color indicators
  - 📈 **Coverage metrics**: View coverage percentage in Test Explorer, file explorer, and Test Coverage panel
  - 🔍 **Detailed insights**: Hover over lines to see execution counts
  - 🎯 **Smart modes**: Choose between per-test coverage or accumulated coverage
  - ⚙️ **Zero configuration**: Automatic JaCoCo agent download and Maven integration
  - 🚀 **Native integration**: Uses VS Code's official Test Coverage API for consistent UX
- **⚡ Lightning-Fast Test Results (v1.0.14)**: 50x faster result processing
  - 🚀 **Instant feedback**: Results appear in ~200ms instead of up to 10 seconds
  - 🎯 **Simplified logic**: Removed unnecessary retry loops and polling
  - 🧹 **Cleaner code**: Eliminated 60+ lines of complex timing logic
  - 💡 **Smart design**: Leverages Java's automatic file buffer flushing on process termination
  - 🔋 **Zero overhead**: Single read operation instead of constant polling
  - 📦 **Better organization**: Shared utility module eliminates code duplication
- **📏 Gherkin Rule Support (v1.0.16)**: Full support for the `Rule` keyword
  - 🧩 **Hierarchical View**: Rules appear in Test Explorer with their scenarios nested correctly
  - ▶️ **Run/Debug Rules**: Execute all scenarios within a specific Rule with a single click
  - 📝 **CodeLens Integration**: dedicated Play/Debug buttons for Rule lines
  - 🔄 **Smart Results**: Test results are correctly tracked for scenarios nested inside Rules
- **🔄 Real-time Feature File Updates (v1.0.13)**: Live test discovery without reloading
  - ✨ **Auto-refresh on save**: Test Explorer updates automatically when you save `.feature` files
  - 🎯 **No manual refresh needed**: See new scenarios appear instantly after saving
  - ⚡ **Smart debouncing**: 1200ms delay prevents excessive updates during rapid editing
  - 🔋 **Battery-friendly**: Optimized to avoid CPU waste while typing
  - 📝 **CodeLens support**: Run/debug buttons also refresh automatically (if enabled)
  - 🎨 **Smooth workflow**: Keep coding without interruptions to reload the window
- **⚡ Maven Incremental Compilation (v1.0.12)**: Optimized build performance
  - 🚀 **Always up-to-date**: Automatically detects and compiles only changed files
  - ⏱️ **Faster rebuilds**: Maven's incremental compilation only recompiles what's necessary
  - 🎯 **More reliable**: No longer skips compilation when source files have changed
  - 🔧 **Simpler code**: Removed custom directory checking, leveraging Maven's built-in intelligence
  - ✅ **Dependency aware**: Properly recompiles when dependencies or `pom.xml` changes
- **📊 Structured Logging System (v1.0.11)**: Professional logging with configurable levels
  - 🎯 **Configurable log levels**: ERROR, WARN, INFO, DEBUG, TRACE - control verbosity via settings
  - 🔍 **Better troubleshooting**: Set `logLevel: "debug"` or `"trace"` for detailed diagnostics
  - 📝 **Cleaner code**: Removed all `if (debugMode)` blocks and `debugMode` setting
  - ⏱️ **Timestamp support**: All log entries include timestamps for better traceability
  - 📺 **Output Channel integration**: View logs in VS Code's Output Panel
  - 🎨 **Consistent formatting**: All messages follow standard format `[timestamp] [LEVEL] message`
- **🎯 100% Accurate Results (v1.0.10)**: Fixed critical result processing bugs
  - ✅ **All scenarios marked correctly**: Previously only first scenario was marked when running multiple scenarios
  - ✅ **Proper background filtering**: Cucumber JSON includes non-test "background" elements that are now filtered out
  - ✅ **File URI handling**: Correctly processes Cucumber's `file:` prefix in JSON results
  - ✅ **Multiple features work perfectly**: Cross-feature contamination fixed with precise path matching
- **⚡ Lightning Fast Batch Execution (v1.0.9)**: Dramatically improved test execution speed
  - 🚀 **Run all tests in one go**: Multiple features execute in a single Cucumber process
  - ⏱️ **Massive time savings**: No more redundant startups/shutdowns for each feature
  - 🎯 **Smart mode detection**: Automatically uses batch mode when running multiple features
  - 📊 **Perfect for CI/CD**: Optimized for continuous integration pipelines
- **🛡️ Rock-Solid Reliability (v1.0.9)**: Fixed critical bugs and improved error handling
  - ✅ **No more infinite loops**: Fixed Test Explorer running tests repeatedly
  - ✅ **No more crashes**: Robust file validation prevents reading incomplete result files
  - ✅ **Accurate results**: Fixed logic that incorrectly marked failed tests as passed
  - ✅ **Smart error detection**: Detects errors in @Before/@After hooks and scenario setup
  - ✅ **Clear error messages**: Shows exactly what failed (hook, setup, or specific step)
  - ✅ **Correct error location**: Points to scenario line for setup errors, step line for step failures
  - ✅ **Optimized execution**: No duplicate test runs when executing multiple tests
- **🌐 Multi-Platform Availability (v1.0.7+)**: Now available on both VS Code Marketplace AND Open VSX Registry
  - ✅ Full support for **Cursor**, **VSCodium**, **Eclipse Theia**, **Gitpod**, and other VS Code-based editors
  - ✅ Automated dual publishing to both marketplaces
- **✅ Real Test Results**: Tests are now marked as passed ✅ or failed ❌ based on actual Cucumber execution results (not just "always passed")
- **📊 Individual Scenario Results**: When running entire features, each scenario is marked individually with its real result
- **📍 Precise Error Location**: Error markers appear on the exact line of the failed step, making debugging instant
- **🎯 Detailed Error Messages**: See the exact step that failed with complete stack trace and error details
- **🔍 Multiple Failure Support**: When multiple scenarios fail, each shows its specific error at the correct location
- **⚡ Smart Maven Compilation**: Uses Maven's incremental compilation to automatically detect and compile only changed files - now configurable!
- **🐛 Debug & Run Modes**: Both modes now use the same unified approach with proper result tracking
- **📝 JSON Result Analysis**: Uses Cucumber's JSON output to determine pass/fail status with detailed error messages
- **🧹 Code Refactoring**: Consolidated duplicate code and extracted result processing into dedicated module
- **🔧 Cleaner Architecture**: Simplified codebase with better separation of concerns
- **⚙️ Flexible Configuration**: Control compilation, exclude directories, and add external step definitions (v1.0.6+)

### 🔍 Technical Improvements

1. **Batch Execution (v1.0.9)**: Multiple features run in a single Cucumber process for maximum speed
2. **Robust File Processing (v1.0.9)**: Async result processing with retry mechanism and comprehensive validation
3. **Accurate Test Status (v1.0.9)**: Correct pass/fail logic - only passes if ALL steps are 'passed'
4. **Hook Error Detection (v1.0.9)**: Detects and reports errors in @Before/@After hooks
5. **Unified Test Execution**: Single `runCucumberTest()` function handles both run and debug modes
6. **Result File Analysis**: Uses `--plugin json:${resultFile}` to capture detailed test results
7. **Dedicated Result Processor**: New `resultProcessor.ts` module handles all test result parsing and marking
8. **Precise Line Matching**: Exact numeric comparison prevents false positives (e.g., line 5 vs line 57)
9. **Smart Compilation**: Maven's incremental compilation automatically detects and compiles only changed files
10. **Consolidated Methods**: Merged duplicate methods (`runTests`/`debugTests`, `runSingleTest`/`debugSingleTest`)
11. **DRY Principles**: Eliminated code repetition throughout the codebase

## 🎯 Features

### Core Functionality

- 🧪 **Test Explorer Integration**: All your Cucumber features and scenarios appear in VS Code's Test Explorer panel
- ✅ **Real Pass/Fail Status**: Tests show actual results from Cucumber execution
- 🎯 **Individual Scenario Execution**: Run specific scenarios without executing the entire feature
- 🐛 **Full Debug Support**: Debug your step definitions with breakpoints
- 📊 **Detailed Results**: See which scenarios passed and which failed, with error details
- 🔄 **Auto-discovery**: Automatically finds and displays all feature files in your workspace
- 🚫 **Smart Filtering**: Excludes build directories (target, build, out) to prevent duplicate tests
- ⚡ **Live Updates**: Test Explorer refreshes automatically when you save feature files (no reload needed!)
- 🔄 **Smart Debouncing**: Updates are optimized with 1200ms delay to prevent performance issues
- 🔧 **Auto-configuration**: Automatically detects glue path, no manual setup required
- 📋 **Optional CodeLens**: Enable traditional play buttons in feature files if preferred

## 🚀 Usage

### 1. Test Explorer (Recommended)

The primary way to run Cucumber tests is through VS Code's Test Explorer:

1. **Open Test Explorer**: Click the test tube icon in the activity bar or press `Ctrl+Shift+T`
2. **View Your Tests**: All feature files and scenarios are automatically discovered and displayed
3. **Run Tests**: Click the play button next to any feature or scenario to run it
4. **Debug Tests**: Right-click and select "Debug Test" to debug with breakpoints
5. **View Results**: Tests are marked with ✅ (passed) or ❌ (failed) based on actual execution

```
🧪 Test Explorer
├─ 📁 Cucumber Java Tests
   ├─ 📄 Login Feature
   │  ├─ ✅ Successful login
   │  ├─ ❌ Failed login with wrong password  ← Shows real failure!
   │  └─ ✅ Password reset flow
   ├─ 📄 Shopping Cart Feature
   │  ├─ ✅ Add item to cart
   │  ├─ ✅ Remove item from cart
   │  └─ ❌ Checkout process  ← Shows which scenario actually failed!
   └─ 📄 User Registration Feature
      ├─ ✅ Valid registration
      └─ ❌ Invalid email format  ← Click to see error details
```

### 2. Running Multiple Scenarios

When you run an entire feature file:
- Each scenario is executed
- Each scenario is marked individually with its own pass/fail status
- You can see at a glance which scenarios passed and which failed
- Click on failed scenarios to see error details

### 3. Code Coverage

Run your tests with code coverage to see which classes are being tested with **inline coverage visualization**:

1. **Via Test Explorer**: Click the dropdown next to the play button and select "Run with Coverage"
2. **Via Context Menu**: Right-click on a feature file → "Cucumber: Run Feature with Coverage"
3. **Via CodeLens** (if enabled): Click the 📊 icon next to any feature, scenario, or example

**What you get:**
- ✅ **Inline coverage in editor**: Covered lines shown in green, uncovered in red
- 📊 **Coverage percentage**: Displayed in Test Explorer and file explorer
- 🎯 **Detailed metrics**: Hover over lines to see execution count
- 📁 **Coverage view**: See all files with coverage data in the Test Coverage panel

**How it works:**
1. Tests run with JaCoCo agent automatically attached
2. Coverage data is collected in `target/coverage/jacoco-{timestamp}.exec`
3. Maven generates XML report automatically (`mvn jacoco:report`)
4. Coverage is parsed and displayed inline in VS Code

**Requirements:**
- Maven with JaCoCo plugin configured in `pom.xml`
- JaCoCo agent is automatically downloaded on first use (cached in `target/jacoco/`)
- Coverage is not available in debug mode

**Example `pom.xml` configuration:**
```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.jacoco</groupId>
      <artifactId>jacoco-maven-plugin</artifactId>
      <version>0.8.11</version>
      <executions>
        <execution>
          <goals>
            <goal>prepare-agent</goal>
          </goals>
        </execution>
        <execution>
          <id>report</id>
          <phase>test</phase>
          <goals>
            <goal>report</goal>
          </goals>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

### 4. Debugging

- Right-click any test → "Debug Test"
- Set breakpoints in your step definitions
- Step through your code with full debugging support
- Even in debug mode, tests are marked with correct pass/fail status after execution

### 5. CodeLens Play Buttons (Optional)

If you prefer the traditional approach with play buttons in feature files:

1. **Enable CodeLens**: Go to VS Code Settings → Extensions → Cucumber Java Runner
2. **Check "Enable CodeLens"**: This will show play buttons directly in your feature files
3. **Use Play Buttons**: Click the buttons that appear on Feature, Scenario, and Example lines

Example feature file with CodeLens enabled:
```gherkin
▶ Run Feature | 🐛 Debug Feature
Feature: Shopping Cart

  ▶ Run Scenario | 🐛 Debug Scenario
  Scenario: Adding an item to cart
    Given I am on the product page
    When I click "Add to Cart"
    Then the item should be added to my cart

  ▶ Run Scenario | 🐛 Debug Scenario
  Scenario Outline: User login
    Given I enter "<username>" and "<password>"
    Then I should see "<result>"

    Examples:
      | username | password | result    |
      | admin    | admin123 | Welcome!  |
      | user1    | pass123  | Welcome!  |
```

### 6. Context Menu Options

You can also right-click on feature files:

- Right-click on a `.feature` file in the file explorer → "Cucumber: Run Feature"
- Right-click in an open feature file → "Cucumber: Run Feature/Scenario/Example"
- Right-click in an open feature file → "Cucumber: Debug Feature/Scenario/Example"

## ⚙️ Configuration

Access settings via: **Settings → Extensions → Cucumber Java Runner** or edit your `settings.json` file directly.

### Available Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `cucumberJavaRunner.enableCodeLens` | boolean | `false` | Enable CodeLens buttons (▶ Run, 🐛 Debug) in feature files. When disabled, use Test Explorer instead for a cleaner interface. |
| `cucumberJavaRunner.logLevel` | string | `"info"` | Log level for extension output: `error`, `warn`, `info`, `debug`, or `trace`. Use `debug` or `trace` for troubleshooting. |
| `cucumberJavaRunner.objectFactory` | string | `""` | Custom Cucumber ObjectFactory class for dependency injection (e.g., Spring, Guice, PicoContainer). Leave empty for default. |
| `cucumberJavaRunner.autoCompileMaven` | boolean | `true` | Automatically compile Maven projects before running tests (only when target directory is missing). |
| `cucumberJavaRunner.excludeBuildDirectories` | array | `["target", "build", "out", "dist", "node_modules", ".git"]` | Directories to exclude when discovering feature files to avoid duplicates. |
| `cucumberJavaRunner.additionalGluePaths` | array | `[]` | Additional glue paths for step definitions (e.g., from external libraries). Use Java package format. |
| `cucumberJavaRunner.enableCoverage` | boolean | `false` | Enable code coverage collection using JaCoCo when running tests. Coverage reports will be generated in `target/coverage/` directory. |
| `cucumberJavaRunner.jacocoVersion` | string | `"0.8.11"` | JaCoCo agent version to use for code coverage. The agent JAR will be cached in `target/jacoco/` directory. |
| `cucumberJavaRunner.coverageAppend` | boolean | `false` | Append coverage data to existing exec file instead of overwriting it. When false (default), each test run creates a fresh coverage report. |

### Configuration Examples

#### Using Spring Dependency Injection
```json
{
  "cucumberJavaRunner.objectFactory": "cucumber.api.spring.SpringFactory"
}
```

#### Using Guice Dependency Injection
```json
{
  "cucumberJavaRunner.objectFactory": "cucumber.api.guice.GuiceFactory"
}
```

#### Disable Auto-Compilation
```json
{
  "cucumberJavaRunner.autoCompileMaven": false
}
```

#### Custom Excluded Directories
```json
{
  "cucumberJavaRunner.excludeBuildDirectories": [
    "target",
    "build",
    "generated",
    "bin"
  ]
}
```

#### Additional Glue Paths (External Step Definitions)
Use this when you have step definitions in external libraries or modules:
```json
{
  "cucumberJavaRunner.additionalGluePaths": [
    "com.external.library.steps",
    "org.another.library.cucumber.steps"
  ]
}
```

#### Enable Code Coverage
```json
{
  "cucumberJavaRunner.enableCoverage": true,
  "cucumberJavaRunner.jacocoVersion": "0.8.11",
  "cucumberJavaRunner.coverageAppend": false
}
```

**Coverage Append Modes:**
- `false` (default): Each test run shows coverage for that specific test only (recommended)
- `true`: Accumulate coverage across multiple test runs for overall project coverage

#### Enable CodeLens Buttons
```json
{
  "cucumberJavaRunner.enableCodeLens": true
}
```

#### Log Level Configuration
Control extension logging verbosity:
```json
{
  "cucumberJavaRunner.logLevel": "info"  // Options: error, warn, info, debug, trace
}
```

Use `debug` or `trace` when troubleshooting issues:
```json
{
  "cucumberJavaRunner.logLevel": "debug"  // Enables detailed logging
}
```

View logs in **Output Panel → Cucumber Java Runner**.

#### Complete Configuration Example
```json
{
  "cucumberJavaRunner.enableCodeLens": false,
  "cucumberJavaRunner.logLevel": "info",
  "cucumberJavaRunner.objectFactory": "cucumber.api.spring.SpringFactory",
  "cucumberJavaRunner.autoCompileMaven": true,
  "cucumberJavaRunner.excludeBuildDirectories": [
    "target",
    "build",
    "out",
    "dist"
  ],
  "cucumberJavaRunner.additionalGluePaths": [
    "com.mycompany.shared.steps"
  ]
}
```

## 🎨 Interface Options

### Test Explorer (Default) - Recommended
- Clean, organized view of all tests
- Integrated with VS Code's testing framework
- Shows real test status with ✅/❌ icons
- Detailed error messages on failures
- No visual clutter in feature files

### CodeLens Buttons (Optional)
- Traditional play buttons in feature files
- Similar to IntelliJ IDEA experience
- Enable via settings if preferred

## 📦 Installation

### From Extension Marketplaces

#### VS Code
1. Open VS Code
2. Go to Extensions view (`Ctrl+Shift+X`)
3. Search for "Cucumber Java Runner"
4. Click Install

Or install directly from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=lucasbiel7.cucumber-java-runner)

#### Cursor, VSCodium, and Other VS Code-based Editors
1. Open your editor
2. Go to Extensions view (`Ctrl+Shift+X`)
3. Search for "Cucumber Java Runner"
4. Click Install

Or install directly from [Open VSX Registry](https://open-vsx.org/extension/lucasbiel7/cucumber-java-runner)

### Manual Installation
1. Download the `.vsix` file from [Releases](https://github.com/lucasbiel7/cucumber-java-runner/releases)
2. Open Extensions view → "..." menu → "Install from VSIX"
3. Select the downloaded file

## 🔧 Requirements

- **Java**: JDK 8 or higher
- **Maven**: 3.6 or higher
- **Project Structure**: Standard Maven layout
- **Dependencies**: Cucumber-JVM in your pom.xml
- **VS Code Extension**: Java Extension Pack (for debugging support)

## 🤝 Works Great With Official Cucumber Extension

This extension is designed to work seamlessly with the [Official Cucumber Extension](https://marketplace.visualstudio.com/items?itemName=CucumberOpen.cucumber-official).

**Recommended Setup**: Install both extensions together!

- **Official Cucumber**: Provides syntax highlighting, formatting, validation, and step navigation
- **This Extension**: Provides test execution, debugging, and Test Explorer integration

See [USING_WITH_CUCUMBER_OFFICIAL.md](USING_WITH_CUCUMBER_OFFICIAL.md) for detailed compatibility guide.

## 🚀 Zero Configuration Required

The extension works automatically with standard Maven projects:

- ✅ Auto-detects step definition glue path
- ✅ Finds all feature files in your workspace
- ✅ Excludes build directories automatically
- ✅ Integrates with VS Code Test Explorer
- ✅ Optimized Maven compilation (only when needed)

If auto-detection fails, you'll be prompted to enter your glue path manually (e.g., `com.example.steps`).

## 🔄 Refreshing Tests

**Automatic**: New feature files are detected automatically
**Manual**: Use the refresh button in Test Explorer or Command Palette → "Refresh Cucumber Tests"

## 💡 How It Works

1. **Test Discovery**: Scans workspace for `.feature` files
2. **Auto-compilation**: Uses Maven's incremental compilation to ensure code is up-to-date (compiles only changed files)
3. **Test Execution**: Runs Cucumber with `--plugin json:${resultFile}` to capture results
4. **Result Analysis**: Reads JSON output to determine pass/fail status for each scenario
5. **UI Update**: Updates Test Explorer with ✅ (passed) or ❌ (failed) icons
6. **Cleanup**: Removes temporary JSON result files

## ❓ Troubleshooting

**Tests not showing in Test Explorer:**
- Make sure you have `.feature` files in your workspace
- Check that files aren't in excluded directories (target, build, out)
- Use the refresh button in Test Explorer
- Check VS Code Output panel → "Cucumber Java Runner" for logs

**CodeLens buttons not showing:**
- Enable CodeLens in extension settings
- Make sure you're viewing a `.feature` file
- Reload VS Code window

**Glue path errors:**
- Extension will prompt you to enter the path manually
- Use Java package format: `com.example.steps`
- Check your step definitions are in the correct package

**Test execution issues:**
- Verify Maven project structure (standard layout)
- Check Cucumber dependencies in pom.xml
- Ensure Java and Maven are in your PATH
- Check terminal output for detailed error messages

**Tests always showing as passed (old versions):**
- Update to latest version! This fork fixes that issue.
- Make sure you're using version 1.0.0 or higher

**Compilation issues:**
- Version 1.0.12+ uses Maven's incremental compilation for optimal performance
- Maven automatically detects and compiles only changed files
- If you need a clean build, run `mvn clean` manually before running tests

## 🛠️ Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Package extension
npx vsce package

# Install locally for testing
code --install-extension cucumber-java-runner-1.0.0.vsix
# or
cursor --install-extension cucumber-java-runner-1.0.0.vsix
```

## 📊 Comparison: Original vs This Fork

| Feature | Original | This Fork |
|---------|----------|-----------|
| Test Results | Always "passed" ⚠️ | Real pass/fail status ✅ |
| Individual Scenario Results | No ❌ | Yes ✅ |
| Maven Compilation | Always runs 🐌 | Incremental (v1.0.12+) ⚡ |
| Code Duplication | High 📚 | Low (refactored) 🎯 |
| Debug Mode Results | No tracking ❌ | Full tracking ✅ |
| Error Messages | Generic ⚠️ | Detailed with step info 📝 |
| Architecture | Separate runners 🔀 | Unified runner 🎯 |

## 🔄 Contributing

Found a bug or have a feature request? Please report it on [GitHub Issues](https://github.com/lucasbiel7/cucumber-java-runner/issues).

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## 🙏 Credits

This project is a fork of [Cucumber Java Easy Runner](https://github.com/hakkietem350/Cucumber-Java-Easy-Runner) by Hakki Etem.

**Enhanced and maintained by**: Lucas Biel ([@lucasbiel7](https://github.com/lucasbiel7))

Major improvements include:
- Real test result tracking
- Individual scenario result marking
- Optimized Maven compilation
- Code refactoring and consolidation
- Better error messages and debugging support

## 📄 License

[MIT](LICENSE)

---

**Enjoy testing with Cucumber! 🥒✨**

If you find this extension helpful, please ⭐ star the [repository](https://github.com/lucasbiel7/cucumber-java-runner) and leave a review on the [marketplace](https://marketplace.visualstudio.com/items?itemName=lucasbiel7.cucumber-java-runner)!
