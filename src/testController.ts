/**
 * Test controller for Cucumber tests - manages the VS Code Test Explorer
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseFeatureFile } from './featureParser';
import { runCucumberTest } from './cucumberRunner';

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

      if (!featureInfo) return;

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
      const uri = testItem.uri!;
      const mode = isDebug ? 'Debugging' : 'Running';
      const consoleType = isDebug ? 'debug console' : 'terminal';
      const sessionType = isDebug ? 'Debug session' : 'Test';

      let lineNumber: number | undefined;
      let exampleLine: number | undefined;

      // Check test type based on ID structure and extract line numbers
      if (testItem.id.includes(':example:')) {
        // This is an example row
        const parts = testItem.id.split(':');
        lineNumber = parseInt(parts[2]); // scenario line number
        exampleLine = parseInt(parts[4]); // example line number
        console.log(`${mode} example at scenario line ${lineNumber}, example line ${exampleLine} for file ${uri.fsPath}`);
      } else if (testItem.id.includes(':scenario:')) {
        // This is a scenario
        const parts = testItem.id.split(':scenario:');
        lineNumber = parseInt(parts[1]);
        console.log(`${mode} scenario at line ${lineNumber} for file ${uri.fsPath}`);
      } else {
        // This is a feature file
        console.log(`${mode} entire feature file ${uri.fsPath}`);
      }

      // Execute the test with extracted parameters
      const result = await runCucumberTest(uri, lineNumber, exampleLine, isDebug);

      // Show test as running - user will see results in terminal/debug console
      vscode.window.showInformationMessage(`${sessionType} started for ${testItem.label}. Check ${consoleType} for results.`);

      // If this is a feature file with children (scenarios), mark each child individually
      if (!lineNumber && testItem.children.size > 0 && result.resultFile) {
        this.markChildrenFromResults(testItem, run, result.resultFile);
      }

      // Mark the main test item as passed or failed
      if (result.passed) {
        run.passed(testItem);
      } else {
        run.failed(testItem, new vscode.TestMessage(`Test failed. Check ${consoleType} for details.`));
      }

      // Clean up result file if it exists
      if (result.resultFile && fs.existsSync(result.resultFile)) {
        try {
          fs.unlinkSync(result.resultFile);
          console.log(`Cleaned up result file: ${result.resultFile}`);
        } catch (error) {
          console.error('Error cleaning up result file:', error);
        }
      }

    } catch (error) {
      const errorType = isDebug ? 'Debug' : 'Test execution';
      console.error(`${errorType} error:`, error);
      run.failed(testItem, new vscode.TestMessage(`${errorType} failed: ${error}`));
    }
  }

  /**
   * Marks child test items (scenarios/examples) based on Cucumber JSON results
   */
  private markChildrenFromResults(featureItem: vscode.TestItem, run: vscode.TestRun, resultFile: string) {
    try {
      if (!fs.existsSync(resultFile)) {
        console.error(`Result file not found: ${resultFile}`);
        return;
      }

      const fileContent = fs.readFileSync(resultFile, 'utf-8');
      const results = JSON.parse(fileContent);

      console.log(`Marking children from results: ${resultFile}`);

      // Cucumber JSON format: array of features
      for (const feature of results) {
        if (feature.elements) {
          for (const scenario of feature.elements) {
            const scenarioLine = scenario.line;

            // Check if all steps in the scenario passed
            let scenarioPassed = true;
            let failedStep = null;

            if (scenario.steps) {
              for (const step of scenario.steps) {
                if (step.result && step.result.status !== 'passed' && step.result.status !== 'skipped') {
                  scenarioPassed = false;
                  failedStep = step;
                  break;
                }
              }
            }

            // Find the corresponding test item
            featureItem.children.forEach(child => {
              // Check if this child matches the scenario line
              if (child.id.includes(`:scenario:${scenarioLine}`)) {
                if (scenarioPassed) {
                  run.passed(child);
                  console.log(`✅ Scenario at line ${scenarioLine} passed`);
                } else {
                  const message = failedStep
                    ? `Step failed: ${failedStep.name}\nError: ${failedStep.result?.error_message || 'Unknown error'}`
                    : 'Scenario failed';
                  run.failed(child, new vscode.TestMessage(message));
                  console.log(`❌ Scenario at line ${scenarioLine} failed`);
                }
              }
            });
          }
        }
      }

    } catch (error) {
      console.error('Error marking children from results:', error);
    }
  }

  dispose() {
    this.controller.dispose();
    this.watchedFiles.clear();
  }
}
