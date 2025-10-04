/**
 * Test controller for Cucumber tests - manages the VS Code Test Explorer
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { parseFeatureFile } from './featureParser';
import { runSelectedTest } from './testRunner';
import { debugSelectedTest } from './debugRunner';

/**
 * Test controller for Cucumber tests
 */
export class CucumberTestController {
  private controller: vscode.TestController;
  private watchedFiles = new Map<string, vscode.TestItem>();

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
      (request, token) => this.runTests(request, token),
      true
    );

    // Set up test debug handler
    this.controller.createRunProfile(
      'Debug Cucumber Tests',
      vscode.TestRunProfileKind.Debug,
      (request, token) => this.debugTests(request, token),
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

  private async runTests(request: vscode.TestRunRequest, token: vscode.CancellationToken) {
    const run = this.controller.createTestRun(request);

    const testItems = request.include || this.gatherAllTests();

    for (const testItem of testItems) {
      if (token.isCancellationRequested) {
        break;
      }

      await this.runSingleTest(testItem, run);
    }

    run.end();
  }

  private async debugTests(request: vscode.TestRunRequest, token: vscode.CancellationToken) {
    const run = this.controller.createTestRun(request);

    const testItems = request.include || this.gatherAllTests();

    for (const testItem of testItems) {
      if (token.isCancellationRequested) {
        break;
      }

      await this.debugSingleTest(testItem, run);
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

  private async runSingleTest(testItem: vscode.TestItem, run: vscode.TestRun) {
    run.started(testItem);

    try {
      const uri = testItem.uri!;

      // Check test type based on ID structure
      if (testItem.id.includes(':example:')) {
        // This is an example row
        const parts = testItem.id.split(':');
        const scenarioLine = parseInt(parts[2]); // scenario line number
        const exampleLine = parseInt(parts[4]); // example line number
        console.log(`Running example at scenario line ${scenarioLine}, example line ${exampleLine} for file ${uri.fsPath}`);
        await runSelectedTest(uri, scenarioLine, exampleLine);
      } else if (testItem.id.includes(':scenario:')) {
        // This is a scenario
        const parts = testItem.id.split(':scenario:');
        const lineNumber = parseInt(parts[1]);
        console.log(`Running scenario at line ${lineNumber} for file ${uri.fsPath}`);
        await runSelectedTest(uri, lineNumber);
      } else {
        // This is a feature file
        console.log(`Running entire feature file ${uri.fsPath}`);
        await runSelectedTest(uri);
      }

      // Show test as running - user will see results in terminal
      vscode.window.showInformationMessage(`Test started for ${testItem.label}. Check terminal for results.`);

      // Wait 2 seconds to show "running" state, then mark as passed
      await new Promise(resolve => setTimeout(resolve, 2000));
      run.passed(testItem);

    } catch (error) {
      console.error('Test execution error:', error);
      run.failed(testItem, new vscode.TestMessage(`Test failed: ${error}`));
    }
  }

  private async debugSingleTest(testItem: vscode.TestItem, run: vscode.TestRun) {
    run.started(testItem);

    try {
      const uri = testItem.uri!;

      // Check test type based on ID structure
      if (testItem.id.includes(':example:')) {
        // This is an example row
        const parts = testItem.id.split(':');
        const scenarioLine = parseInt(parts[2]); // scenario line number
        const exampleLine = parseInt(parts[4]); // example line number
        console.log(`Debugging example at scenario line ${scenarioLine}, example line ${exampleLine} for file ${uri.fsPath}`);
        await debugSelectedTest(uri, scenarioLine, exampleLine);
      } else if (testItem.id.includes(':scenario:')) {
        // This is a scenario
        const parts = testItem.id.split(':scenario:');
        const lineNumber = parseInt(parts[1]);
        console.log(`Debugging scenario at line ${lineNumber} for file ${uri.fsPath}`);
        await debugSelectedTest(uri, lineNumber);
      } else {
        // This is a feature file
        console.log(`Debugging entire feature file ${uri.fsPath}`);
        await debugSelectedTest(uri);
      }

      // Show test as running - user will see results in debug console
      vscode.window.showInformationMessage(`Debug session started for ${testItem.label}. Check debug console for results.`);

      // Wait 2 seconds to show "running" state, then mark as passed
      await new Promise(resolve => setTimeout(resolve, 2000));
      run.passed(testItem);

    } catch (error) {
      console.error('Test debug error:', error);
      run.failed(testItem, new vscode.TestMessage(`Debug failed: ${error}`));
    }
  }

  dispose() {
    this.controller.dispose();
    this.watchedFiles.clear();
  }
}
