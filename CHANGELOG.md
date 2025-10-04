# Changelog

All notable changes to the Cucumber Java Runner extension will be documented in this file.

## [1.0.0] - 2025-01-04

### 🎉 Major Release

#### Added
- **Maven Compilation Before Tests**: Extension now runs `mvn clean compile test-compile` before resolving classpath to ensure project is up to date
- **Generated Sources Support**: Added support for `target/generated-sources/annotations` and `target/generated-sources/swagger/java/main` in classpath
- **Consistent Run & Debug**: Both run and debug modes now use the same programmatic approach with `noDebug` flag
- **Descriptive Session Names**: Run and debug sessions show meaningful names from feature content (e.g., "Cucumber: Add product to cart")
- **Progress Indicators**: Visual feedback during Maven compilation and dependency resolution

#### Changed
- **Extension Name**: Renamed from "Cucumber Java Easy Runner" to "Cucumber Java Runner"
- **Command Prefix**: Changed all commands from `cucumberJavaEasyRunner.*` to `cucumberJavaRunner.*`
- **Run Execution**: Moved from terminal-based execution to VS Code Debug API (with `noDebug: true`)
- **Progress Messages**: Updated to "Compiling project and resolving dependencies..."

### Fixed
- Classpath resolution now includes all Maven dependencies (transitive + declared)
- Compilation happens before test execution, preventing stale class issues
- Consistent behavior between run and debug modes

---

## [0.3.0] - 2025-01-03

### 🏗️ Architecture Refactoring

#### Added
- Modular architecture with single responsibility principle
- Separate modules:
  - `types.ts` - Type definitions
  - `featureParser.ts` - Feature file parsing
  - `mavenResolver.ts` - Maven dependency resolution
  - `testRunner.ts` - Test execution
  - `debugRunner.ts` - Debug execution
  - `testController.ts` - Test Explorer integration
  - `codeLensProvider.ts` - Inline run/debug buttons
- `ARCHITECTURE.md` - Comprehensive documentation

#### Changed
- Split 1300+ line `extension.ts` into 8 focused modules
- Improved maintainability and testability

---

## [0.2.0] - 2025-01-02

### Added
- Maven dependency resolution via `mvn dependency:build-classpath`
- Full classpath support including all JARs from `.m2/repository`
- Debug support with Java debugger integration
- Descriptive debug session names from feature content

### Changed
- Debug now resolves Maven classpath programmatically
- Added progress indicator during dependency resolution

---

## [0.1.0] - 2025-01-01

### Initial Release

#### Features
- Run Cucumber tests from VS Code
- Test Explorer integration
- CodeLens support (optional)
- Run entire features, specific scenarios, or example rows
- Auto-detection of step definitions (glue path)
- IntelliJ-style execution with `io.cucumber.core.cli.Main`
- Context menu integration for `.feature` files
- Command palette support

---

## Migration Guide

### From 0.3.x to 1.0.0

**Command Names Changed:**
```diff
- cucumberJavaEasyRunner.runFeature
+ cucumberJavaRunner.runFeature

- cucumberJavaEasyRunner.runScenario
+ cucumberJavaRunner.runScenario

- cucumberJavaEasyRunner.debugFeature
+ cucumberJavaRunner.debugFeature
```

**Settings Changed:**
```diff
- cucumberJavaEasyRunner.enableCodeLens
+ cucumberJavaRunner.enableCodeLens
```

**No Action Required:**
- Extension will automatically recompile your Maven project before running tests
- All existing functionality remains the same
- Just reload the window after updating

---

## Requirements

- Java 11 or higher
- Maven 3.x
- VS Code or Cursor editor
- Java Language Support extension (Red Hat or Microsoft)

---

## Future Plans

- [ ] Gradle support
- [ ] Test result parsing and display
- [ ] Coverage integration
- [ ] Parallel test execution
- [ ] Custom glue path configuration
- [ ] Test templates
