# Changelog

All notable changes to the Cucumber Java Runner extension will be documented in this file.

## [1.0.7] - 2025-10-06

### 🚀 Distribution & Availability

#### Added
- **Open VSX Registry Support**: Extension is now published to Open VSX Registry, making it available in:
  - ✅ **Cursor** - Full support for Cursor IDE users
  - ✅ **VSCodium** - Open-source VS Code alternative
  - ✅ **Eclipse Theia** - Cloud and desktop IDE platform
  - ✅ **Gitpod** - Cloud development environment
  - ✅ Other VS Code-based editors that use Open VSX
- **Automated Dual Publishing**: GitHub Actions workflow now automatically publishes to both:
  - VS Code Marketplace (Microsoft)
  - Open VSX Registry (Eclipse Foundation)
- **Enhanced Installation Documentation**: Updated README with specific installation instructions for different editors

#### Changed
- **Improved Badges**: Added Open VSX version and download badges to README
- **Expanded Installation Section**: README now includes separate instructions for VS Code and Cursor/VSCodium users
- **Release Notes Enhancement**: GitHub releases now include Open VSX Registry links

### 📝 Documentation
- Added comprehensive Open VSX setup guide (`OPEN_VSX_SETUP.md`)
- Updated README with Open VSX badges and installation links
- Enhanced release notes template to include both marketplaces

### 🔧 Technical Improvements
- Workflow now uses `ovsx` CLI tool for Open VSX publishing
- Added `VSX_TOKEN` secret support in GitHub Actions
- Maintained backward compatibility with existing VS Code Marketplace publishing

### 🎯 Impact
This release significantly expands the extension's reach, making it accessible to users of alternative VS Code-based editors, particularly **Cursor**, which has been gaining popularity in the development community.

---

## [1.0.6] - 2025-10-04

### ✨ Features & Improvements
- **Implemented `autoCompileMaven` configuration**: Now you can disable automatic Maven compilation by setting `cucumberJavaRunner.autoCompileMaven` to `false`
  - When enabled (default), compiles Maven project automatically when `target/` directory is missing
  - When disabled, skips automatic compilation entirely
- **Implemented `excludeBuildDirectories` configuration**: Customize which directories to exclude when discovering feature files
  - Default: `["target", "build", "out", "dist", "node_modules", ".git"]`
  - Users can now add custom directories to exclude (e.g., `"generated"`, `"bin"`)
- **Added `additionalGluePaths` configuration**: Support for external step definitions from libraries
  - Useful when using step definitions from external JAR files or shared modules
  - Accepts array of Java package paths (e.g., `["com.external.library.steps"]`)

### 🗑️ Removed
- **BREAKING**: Removed `showDetailedErrors` configuration
  - Detailed errors are always shown - this is the expected behavior
  - Configuration was documented but never actually implemented
  - No action needed from users (feature works as before)

### 📝 Documentation
- Updated configuration documentation in README.md with all available settings
- Added comprehensive examples for each configuration option
- All configuration names now include full prefix `cucumberJavaRunner.` for easier search
- Created `.cursor/commands/verify-and-document-configs.md` guide for maintaining configuration documentation

### 🔧 Technical Improvements
- All configurations are now properly implemented and functional
- Configuration values are read from VS Code settings with proper defaults
- Improved code organization with configuration checks in appropriate modules

---

## [1.0.5] - 2025-10-04

### ✨ Features & Improvements

#### Test Result Processing Enhancements
- **Improved Error Reporting**: Created dedicated `resultProcessor.ts` module for better code organization and maintainability
- **Detailed Error Messages**: Test failures now show the exact step that failed with complete error details
- **Accurate Error Location**: Error markers now appear on the exact line of the failed step, not at the scenario start
- **Multiple Failure Support**: When multiple scenarios fail, each one shows its specific error with correct location
- **Precise Line Matching**: Fixed bug where scenarios on lines like 5 and 57 could be confused due to substring matching

#### Enhanced Configuration
- **Expanded Settings Panel**: Added comprehensive configuration options in VS Code Settings
- **Better Documentation**: All settings now have detailed descriptions and examples
- **Improved Settings UI**: Settings are now properly ordered and documented with markdown support

#### Technical Improvements
- Refactored test result processing logic into separate module for better separation of concerns
- Enhanced scenario-to-test-item matching with exact line number comparison
- Improved error message formatting with cleaner step name and error display

### 🐛 Bug Fixes
- Fixed issue where wrong scenarios were marked as failed due to imprecise line number matching
- Fixed duplicate error marking when running features with child scenarios
- Ensured detailed error messages appear for both direct test runs and child scenario runs

---

## [1.0.4] - 2025-10-04

### 🐛 Bug Fixes

#### Fixed
- **Cucumber Official Extension Compatibility**: Removed `languages` section from `package.json` to prevent conflicts with the official Cucumber extension (`CucumberOpen.cucumber-official`)
  - Previously, our extension was redefining the `gherkin` language for `.feature` files, which was overriding the formatting provided by the official Cucumber extension
  - Now both extensions work together seamlessly - the official extension handles language definitions and formatting, while our extension provides test running capabilities
  - Users can now use both extensions simultaneously without losing Gherkin formatting features

### 📝 Technical Details

- The official Cucumber extension already defines the `gherkin` language and its formatting rules
- Our extension doesn't need to redefine this - we only consume `.feature` files through `activationEvents`
- This fix ensures proper separation of concerns between the two extensions

---

## [1.0.3] - 2025-10-04

### 🔧 Code Quality & Infrastructure

#### Added
- **ESLint Configuration**: Added comprehensive ESLint setup with TypeScript support for better code quality
- **Auto Tag Release Workflow**: New GitHub Actions workflow that automatically creates version tags from package.json
- **Improved CI Pipeline**: Enhanced continuous integration with Node.js 20.x support

#### Changed
- **Code Quality Improvements**: Fixed multiple linting issues across the codebase
  - Removed unused parameters (e.g., `token` in CodeLens provider, `progress` in cucumber runner)
  - Improved error handling with proper type guards (`unknown` instead of `any`)
  - Replaced `let` with `const` where appropriate for better immutability
  - Added explicit type annotations for better type safety
  - Fixed variable shadowing issues (`fs` renamed to `fsModule`)
- **Better Error Messages**: Enhanced error handling with proper error message extraction
- **Cleaner Function Signatures**: Removed unused promise `reject` parameters

#### Fixed
- ESLint warnings throughout the codebase
- Type safety issues with error handling
- Unused variable and parameter warnings

### 🚀 Infrastructure Improvements

- CI workflow now uses Node.js 20.x exclusively
- Automated tag creation on version updates
- Streamlined release process with automatic tag management

---

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
