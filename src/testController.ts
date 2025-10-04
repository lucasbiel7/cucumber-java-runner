/**
 * Test controller for Cucumber tests - manages the VS Code Test Explorer
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { parseFeatureFile } from './featureParser';
import { runCucumberTest } from './cucumberRunner';
import { markChildrenFromResults, getTestErrorMessages, cleanupResultFile } from './resultProcessor';

/**
 * Test controller for Cucumber tests
 */
export class CucumberTestController {
  private readonly controller: vscode.TestController;
  private readonly watchedFiles = new Map<string, vscode.TestItem>();

  constructor(context: vscode.ExtensionContext) {
    this.controller = vscode.tests.createTestController('cucumberJavaRunner', 'Cucumber Java Tests');
    context.subscriptions.push(this.controller);

    // Set up file watcher - exclude build directories
    const watcher = vscode.workspace.createFileSystemWatcher(
      '**/*.feature',
      false, // ignoreCreateEvents
      false, // ignoreChangeEvents
      false  // ignoreDeleteEvents
    );
    context.subscriptions.push(watcher);

    watcher.onDidCreate(uri => this.handleFileEvent('create', uri));
    watcher.onDidChange(uri => this.handleFileEvent('change', uri));
    watcher.onDidDelete(uri => this.handleFileEvent('delete', uri));

    // Set up test run handler
    this.controller.createRunProfile(
      'Run Cucumber Tests',
      vscode.TestRunProfileKind.Run,
      (request, token) => this.executeTests(request, token, false),
      true
    );

    // Set up test debug handler
    this.controller.createRunProfile(
      'Debug Cucumber Tests',
      vscode.TestRunProfileKind.Debug,
      (request, token) => this.executeTests(request, token, true),
      true
    );

    // Add refresh button to test controller
    this.controller.refreshHandler = () => {
      console.log('Test controller refresh triggered');
      this.discoverTests();
    };

    // Initial scan of workspace - delay to avoid duplicates
    setTimeout(() => {
      this.discoverTests();
    }, 500);

    // Add refresh command
    const refreshCommand = vscode.commands.registerCommand('cucumberJavaRunner.refreshTests', () => {
      console.log('Refreshing Cucumber tests...');
      this.discoverTests();
    });
    context.subscriptions.push(refreshCommand);
  }

  private handleFileEvent(eventType: string, uri: vscode.Uri) {
    // Filter out files from build/target directories
    const filePath = uri.fsPath.toLowerCase();
    const excludedPaths = ['target', 'build', 'out', 'dist', 'node_modules', '.git'];

    if (excludedPaths.some(excluded => filePath.includes(`/${excluded}/`) || filePath.includes(`\\${excluded}\\`))) {
      console.log(`Ignoring ${eventType} event for build directory file: ${uri.fsPath}`);
      return;
    }

    console.log(`Handling ${eventType} event for: ${uri.fsPath}`);

    if (eventType === 'delete') {
      this.deleteTest(uri);
    } else {
      // Add small delay to ensure file is fully written
      setTimeout(() => {
        this.createOrUpdateTest(uri);
      }, 100);
    }
  }

  private async discoverTests() {
    // Clear all existing tests first
    this.controller.items.replace([]);
    this.watchedFiles.clear();

    // Exclude common build/target directories to avoid duplicates
    const featureFiles = await vscode.workspace.findFiles(
      '**/*.feature',
      '{**/node_modules/**,**/target/**,**/build/**,**/out/**,**/dist/**,**/.git/**}'
    );

    console.log(`Found ${featureFiles.length} feature files`);

    for (const uri of featureFiles) {
      console.log(`Processing feature file: ${uri.fsPath}`);
      await this.createOrUpdateTest(uri);
    }
  }

  private async createOrUpdateTest(uri: vscode.Uri) {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const featureInfo = parseFeatureFile(document);

      if (!featureInfo) {
        return;
      }

      // Create unique feature ID using normalized file path
      const featureId = path.normalize(uri.fsPath);

      // Check if feature already exists
      if (this.watchedFiles.has(featureId)) {
        console.log(`Feature already exists: ${featureId}`);
        return;
      }

      const featureItem = this.controller.createTestItem(featureId, featureInfo.name, uri);

      // Set range for feature to show play button in gutter
      featureItem.range = new vscode.Range(
        featureInfo.lineNumber - 1, 0,
        featureInfo.lineNumber - 1, 0
      );

      this.controller.items.add(featureItem);
      this.watchedFiles.set(featureId, featureItem);

      // Add scenarios as children
      for (const scenario of featureInfo.scenarios) {
        const scenarioId = `${featureId}:scenario:${scenario.lineNumber}`;
        const scenarioItem = this.controller.createTestItem(
          scenarioId,
          scenario.name,
          uri
        );

        scenarioItem.range = new vscode.Range(
          scenario.lineNumber - 1, 0,
          scenario.lineNumber - 1, 0
        );

        featureItem.children.add(scenarioItem);

        // Add example rows as children of scenario
        if (scenario.examples && scenario.examples.length > 0) {
          for (const example of scenario.examples) {
            const exampleId = `${scenarioId}:example:${example.lineNumber}`;
            const exampleItem = this.controller.createTestItem(
              exampleId,
              `Example: ${example.data.trim()}`,
              uri
            );

            exampleItem.range = new vscode.Range(
              example.lineNumber - 1, 0,
              example.lineNumber - 1, 0
            );

            scenarioItem.children.add(exampleItem);
          }
        }
      }

      console.log(`Added feature: ${featureInfo.name} with ${featureInfo.scenarios.length} scenarios`);

    } catch (error) {
      console.error('Error parsing feature file:', error);
    }
  }

  private deleteTest(uri: vscode.Uri) {
    const featureId = path.normalize(uri.fsPath);
    const featureItem = this.watchedFiles.get(featureId);

    if (featureItem) {
      this.controller.items.delete(featureId);
      this.watchedFiles.delete(featureId);
      console.log(`Deleted feature: ${featureId}`);
    }
  }

  private async executeTests(request: vscode.TestRunRequest, token: vscode.CancellationToken, isDebug: boolean) {
    const run = this.controller.createTestRun(request);

    const testItems = request.include || this.gatherAllTests();

    for (const testItem of testItems) {
      if (token.isCancellationRequested) {
        break;
      }

      await this.executeSingleTest(testItem, run, isDebug);
    }

    run.end();
  }

  private gatherAllTests(): vscode.TestItem[] {
    const tests: vscode.TestItem[] = [];

    this.controller.items.forEach(item => {
      tests.push(item);
      item.children.forEach(child => tests.push(child));
    });

    return tests;
  }

  private async executeSingleTest(testItem: vscode.TestItem, run: vscode.TestRun, isDebug: boolean) {
    run.started(testItem);

    try {
      if (!testItem.uri) {
        throw new Error('Test item has no URI');
      }
      const uri = testItem.uri;
      const consoleType = isDebug ? 'debug console' : 'terminal';

      let lineNumber: number | undefined;
      let exampleLine: number | undefined;

      // Execute the test with extracted parameters
      const result = await runCucumberTest(uri, lineNumber, exampleLine, isDebug);

      // If this is a feature file with children (scenarios), mark each child individually
      const hasChildren = !lineNumber && testItem.children.size > 0 && result.resultFile;

      if (hasChildren) {
        markChildrenFromResults(testItem, run, result.resultFile!);
        // When children are marked individually, just mark parent based on overall result
        if (result.passed) {
          run.passed(testItem);
        } else {
          run.failed(testItem, new vscode.TestMessage(`One or more scenarios failed`));
        }
      } else if (result.passed) {
        // Test passed
        run.passed(testItem);
      } else if (result.resultFile) {
        // For direct test execution (scenario or feature without children structure)
        // Get detailed error messages from result file
        const errorMessages = getTestErrorMessages(result.resultFile, uri);
        if (errorMessages.length > 0) {
          // Pass all error messages to show all failed scenarios
          run.failed(testItem, errorMessages);
        } else {
          run.failed(testItem, new vscode.TestMessage(`Test failed. Check ${consoleType} for details.`));
        }
      } else {
        run.failed(testItem, new vscode.TestMessage(`Test failed. Check ${consoleType} for details.`));
      }

      // Clean up result file if it exists
      if (result.resultFile) {
        cleanupResultFile(result.resultFile);
      }

    } catch (error) {
      const errorType = isDebug ? 'Debug' : 'Test execution';
      console.error(`${errorType} error:`, error);
      run.failed(testItem, new vscode.TestMessage(`${errorType} failed: ${error}`));
    }
  }

  dispose() {
    this.controller.dispose();
    this.watchedFiles.clear();
  }
}
