/**
 * Test controller for Cucumber tests - manages the VS Code Test Explorer
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { parseFeatureFile } from './featureParser';
import { runCucumberTestBatch, FeatureToRun } from './cucumberRunner';
import { markChildrenFromResults, getTestErrorMessages, cleanupResultFile, hasFeatureFailures } from './resultProcessor';
import { logger } from './logger';
import { FeatureInfo, ScenarioInfo } from './types';
import { loadDetailedCoverage } from './jacocoManager';

/**
 * Test controller for Cucumber tests
 */
export class CucumberTestController {
  private readonly controller: vscode.TestController;
  private readonly watchedFiles = new Map<string, vscode.TestItem>();
  private readonly updateTimers = new Map<string, NodeJS.Timeout>();

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

    // Also listen for document saves (more reliable than file watcher for open files)
    const saveListener = vscode.workspace.onDidSaveTextDocument(document => {
      if (path.extname(document.uri.fsPath) === '.feature') {
        logger.debug('Document saved, triggering update:', document.uri.fsPath);
        this.handleFileEvent('change', document.uri);
      }
    });
    context.subscriptions.push(saveListener);

    // Set up test run handler
    this.controller.createRunProfile(
      'Run Cucumber Tests',
      vscode.TestRunProfileKind.Run,
      (request, token) => this.executeTests(request, token, false, false),
      true
    );

    // Set up test debug handler
    this.controller.createRunProfile(
      'Debug Cucumber Tests',
      vscode.TestRunProfileKind.Debug,
      (request, token) => this.executeTests(request, token, true, false),
      true
    );

    // Set up test coverage handler
    const coverageProfile = this.controller.createRunProfile(
      'Run with Coverage',
      vscode.TestRunProfileKind.Coverage,
      (request, token) => this.executeTests(request, token, false, true),
      true
    );

    // Set up loadDetailedCoverage handler
    coverageProfile.loadDetailedCoverage = async (_testRun, fileCoverage) => {
      return loadDetailedCoverage(fileCoverage);
    };

    // Add refresh button to test controller
    this.controller.refreshHandler = () => {
      logger.debug('Test controller refresh triggered');
      this.discoverTests();
    };

    // Initial scan of workspace - delay to avoid duplicates
    setTimeout(() => {
      this.discoverTests();
    }, 500);

    // Add refresh command
    const refreshCommand = vscode.commands.registerCommand('cucumberJavaRunner.refreshTests', () => {
      logger.info('Refreshing Cucumber tests...');
      this.discoverTests();
    });
    context.subscriptions.push(refreshCommand);
  }

  private handleFileEvent(eventType: string, uri: vscode.Uri) {
    // Filter out files from build/target directories
    const filePath = uri.fsPath.toLowerCase();
    const excludedPaths = ['target', 'build', 'out', 'dist', 'node_modules', '.git'];

    if (excludedPaths.some(excluded => filePath.includes(`/${excluded}/`) || filePath.includes(`\\${excluded}\\`))) {
      logger.trace(`Ignoring ${eventType} event for build directory file:`, uri.fsPath);
      return;
    }

    logger.debug(`Handling ${eventType} event for:`, uri.fsPath);

    if (eventType === 'delete') {
      this.deleteTest(uri);
    } else {
      // Use debounce to avoid excessive updates during rapid file changes
      const fileKey = path.normalize(uri.fsPath);
      const existingTimer = this.updateTimers.get(fileKey);

      if (existingTimer) {
        logger.trace(`Clearing existing timer for: ${uri.fsPath}`);
        clearTimeout(existingTimer);
      }

      // Debounce: wait 1200ms after last change before updating
      logger.trace(`Setting debounce timer (1200ms) for: ${uri.fsPath}`);
      const timer = setTimeout(() => {
        logger.debug(`Test update triggered after debounce for: ${uri.fsPath}`);
        this.createOrUpdateTest(uri);
        this.updateTimers.delete(fileKey);
      }, 1200);

      this.updateTimers.set(fileKey, timer);
    }
  }

  private async discoverTests() {
    // Clear all existing tests first
    this.controller.items.replace([]);
    this.watchedFiles.clear();

    // Get excluded directories from configuration
    const config = vscode.workspace.getConfiguration('cucumberJavaRunner');
    const excludeDirs = config.get<string[]>('excludeBuildDirectories', [
      'target',
      'build',
      'out',
      'dist',
      'node_modules',
      '.git'
    ]);

    // Build the exclude pattern from the configuration
    const excludePattern = '{' + excludeDirs.map(dir => `**/${dir}/**`).join(',') + '}';
    logger.debug('Excluding directories:', excludePattern);

    // Find all feature files excluding the configured directories
    const featureFiles = await vscode.workspace.findFiles(
      '**/*.feature',
      excludePattern
    );

    logger.info(`Found ${featureFiles.length} feature files`);

    for (const uri of featureFiles) {
      logger.debug('Processing feature file:', uri.fsPath);
      await this.createOrUpdateTest(uri);
    }
  }

  private async createOrUpdateTest(uri: vscode.Uri) {
    try {
      logger.debug('createOrUpdateTest called for:', uri.fsPath);
      const document = await vscode.workspace.openTextDocument(uri);
      const featureInfo: FeatureInfo | null = parseFeatureFile(document);

      if (!featureInfo) {
        logger.debug('No feature info found for:', uri.fsPath);
        return;
      }

      // Create unique feature ID using normalized file path
      const featureId = path.normalize(uri.fsPath);

      // Check if feature already exists - if so, remove it first to update
      const existingFeature = this.watchedFiles.get(featureId);
      if (existingFeature) {
        logger.info('Updating existing feature:', featureId);
        this.controller.items.delete(featureId);
        this.watchedFiles.delete(featureId);
      } else {
        logger.info('Creating new feature:', featureId);
      }

      const featureItem = this.controller.createTestItem(featureId, featureInfo.name, uri);

      // Set range for feature to show play button in gutter
      featureItem.range = new vscode.Range(
        featureInfo.lineNumber - 1, 0,
        featureInfo.lineNumber - 1, 0
      );

      this.controller.items.add(featureItem);
      this.watchedFiles.set(featureId, featureItem);

      // Helper to create scenario item
      const createScenarioItem = (scenario: ScenarioInfo, parent: vscode.TestItem) => {
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

        parent.children.add(scenarioItem);

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
      };

      // Add scenarios as children (direct children of Feature)
      for (const scenario of featureInfo.scenarios) {
        createScenarioItem(scenario, featureItem);
      }

      // Add rules as children
      if (featureInfo.rules && featureInfo.rules.length > 0) {
        for (const rule of featureInfo.rules) {
          const ruleId = `${featureId}:rule:${rule.lineNumber}`;
          const ruleItem = this.controller.createTestItem(
            ruleId,
            `Rule: ${rule.name}`,
            uri
          );

          ruleItem.range = new vscode.Range(
            rule.lineNumber - 1, 0,
            rule.lineNumber - 1, 0
          );

          featureItem.children.add(ruleItem);

          // Add scenarios as children of Rule
          for (const scenario of rule.scenarios) {
            createScenarioItem(scenario, ruleItem);
          }
        }
      }

      const totalScenarios = featureInfo.scenarios.length +
        (featureInfo.rules ? featureInfo.rules.reduce((acc, rule) => acc + rule.scenarios.length, 0) : 0);

      const action = existingFeature ? 'Updated' : 'Added';
      logger.debug(`${action} feature: ${featureInfo.name} with ${totalScenarios} scenarios`);

    } catch (error) {
      logger.error('Error parsing feature file:', error);
    }
  }

  private deleteTest(uri: vscode.Uri) {
    const featureId = path.normalize(uri.fsPath);
    const featureItem = this.watchedFiles.get(featureId);

    if (featureItem) {
      this.controller.items.delete(featureId);
      this.watchedFiles.delete(featureId);
      logger.debug('Deleted feature:', featureId);
    }
  }

  private async executeTests(request: vscode.TestRunRequest, token: vscode.CancellationToken, isDebug: boolean, withCoverage = false) {
    const run = this.controller.createTestRun(request);

    const testItems = request.include || this.gatherAllTests();

    // Filter to avoid running both parent and children
    // If a feature/rule is in the list, don't run its children separately
    const itemsToRun = this.filterTestItems(testItems);

    // Always use batch mode (even for single tests)
    await this.executeBatchTests(itemsToRun, run, isDebug, withCoverage, token);

    run.end();
  }

  private gatherAllTests(): vscode.TestItem[] {
    const tests: vscode.TestItem[] = [];

    // When gathering all tests, only include features (not individual scenarios)
    // Running a feature will automatically run all its scenarios
    this.controller.items.forEach(item => {
      tests.push(item);
    });

    return tests;
  }

  private async executeBatchTests(
    testItems: vscode.TestItem[],
    run: vscode.TestRun,
    isDebug: boolean,
    withCoverage: boolean,
    token: vscode.CancellationToken
  ) {
    // Mark all tests as started
    for (const item of testItems) {
      run.started(item);
    }

    try {
      // Prepare features for batch execution
      const features: FeatureToRun[] = [];
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

      if (!workspaceFolder) {
        for (const item of testItems) {
          run.failed(item, new vscode.TestMessage('No workspace folder found'));
        }
        return;
      }

      for (const item of testItems) {
        if (!item.uri) {
          run.failed(item, new vscode.TestMessage('Test item has no URI'));
          continue;
        }

        const relativePath = path.relative(workspaceFolder.uri.fsPath, item.uri.fsPath);

        // Extract line numbers from test item ID
        // ID formats:
        // - Feature: "path/to/file.feature"
        // - Rule: "path/to/file.feature:rule:10"
        // - Scenario: "path/to/file.feature:scenario:5"
        // - Example: "path/to/file.feature:scenario:5:example:10"
        let lineNumber: number | undefined;
        let exampleLine: number | undefined;

        const ruleParts = item.id.split(':rule:');
        if (ruleParts.length > 1) {
            // It is a Rule
            lineNumber = parseInt(ruleParts[1], 10);
        } else {
            const idParts = item.id.split(':scenario:');
            if (idParts.length > 1) {
              // This is a scenario or example
              const afterScenario = idParts[1];
              const exampleParts = afterScenario.split(':example:');

              // Get scenario line number
              lineNumber = parseInt(exampleParts[0], 10);

              // Get example line number if present
              if (exampleParts.length > 1) {
                exampleLine = parseInt(exampleParts[1], 10);
              }
            }
        }

        features.push({
          uri: item.uri,
          relativePath: relativePath,
          lineNumber: lineNumber,
          exampleLine: exampleLine
        });
      }

      if (features.length === 0) {
        return;
      }

      // Execute all features in a single batch
      logger.info(`Running ${features.length} features in batch mode${withCoverage ? ' with coverage' : ''}`);
      const result = await runCucumberTestBatch(features, isDebug, withCoverage);

      // Add coverage data if available
      if (withCoverage && result.coverageData) {
        logger.info(`Adding coverage data for ${result.coverageData.size} files`);
        for (const [, fileCoverage] of result.coverageData) {
          run.addCoverage(fileCoverage);
        }
      }

      // Process results for each feature
      if (result.resultFile) {
        for (const item of testItems) {
          if (token.isCancellationRequested) {
            break;
          }

          // Mark children from results
          if (item.children.size > 0) {
            await markChildrenFromResults(item, run, result.resultFile);
          }

          // Check if THIS specific feature has failures
          if (!item.uri) {
            run.failed(item, new vscode.TestMessage('Test item has no URI'));
            continue;
          }

          const featureFailed = await hasFeatureFailures(result.resultFile, item.uri);

          if (featureFailed) {
            // This feature has failures - get error messages
            const errorMessages = await getTestErrorMessages(result.resultFile, item.uri);
            if (errorMessages.length > 0) {
              run.failed(item, errorMessages);
            } else {
              run.failed(item, new vscode.TestMessage('Test failed'));
            }
          } else {
            // This feature passed
            run.passed(item);
          }
        }

        // Clean up result file
        cleanupResultFile(result.resultFile);
      } else {
        // No result file - mark all as failed
        const consoleType = isDebug ? 'debug console' : 'terminal';
        for (const item of testItems) {
          run.failed(item, new vscode.TestMessage(`Test failed. Check ${consoleType} for details.`));
        }
      }
    } catch (error) {
      const errorType = isDebug ? 'Debug' : 'Test execution';
      logger.error(`${errorType} error:`, error);
      for (const item of testItems) {
        run.failed(item, new vscode.TestMessage(`${errorType} failed: ${error}`));
      }
    }
  }

  private filterTestItems(items: readonly vscode.TestItem[]): vscode.TestItem[] {
    const filtered: vscode.TestItem[] = [];
    const runSet = new Set(items);

    // Filter items to avoid running both parent and children
    for (const item of items) {
      let parent = item.parent;
      let parentIsRunning = false;

      // Check if any ancestor is also being run
      while (parent) {
        if (runSet.has(parent)) {
          parentIsRunning = true;
          break;
        }
        parent = parent.parent;
      }

      if (!parentIsRunning) {
        filtered.push(item);
      }
    }

    return filtered;
  }

  dispose() {
    // Clear all pending timers
    for (const timer of this.updateTimers.values()) {
      clearTimeout(timer);
    }
    this.updateTimers.clear();

    this.controller.dispose();
    this.watchedFiles.clear();
  }
}
