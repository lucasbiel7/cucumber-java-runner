/**
 * Cucumber Java Easy Runner - VS Code Extension
 * Main entry point for the extension
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { CucumberTestController } from './testController';
import { CucumberCodeLensProvider } from './codeLensProvider';
import { runCucumberTest } from './cucumberRunner';
import { findScenarioAtLine, findExampleAtLine } from './featureParser';
import { logger, initializeLogger } from './logger';

// Global test controller instance
let globalTestController: CucumberTestController | undefined;

export function activate(context: vscode.ExtensionContext) {
  // Initialize logger first
  initializeLogger(context);
  logger.info('Cucumber Java Runner extension is activating');

  // Dispose existing controller if it exists
  if (globalTestController) {
    try {
      globalTestController.dispose();
      logger.debug('Disposed previous test controller');
    } catch (error) {
      logger.error('Error disposing previous controller:', error);
    }
  }

  // Create new test controller
  globalTestController = new CucumberTestController(context);
  logger.info('Test controller created');

  // Check if CodeLens should be enabled (default: false since we have Test Explorer)
  const config = vscode.workspace.getConfiguration('cucumberJavaRunner');
  const enableCodeLens = config.get('enableCodeLens', false);

  if (enableCodeLens) {
    // Register CodeLens provider only if enabled
    const codeLensProvider = new CucumberCodeLensProvider();
    const codeLensDisposable = vscode.languages.registerCodeLensProvider(
      { pattern: '**/*.feature' },
      codeLensProvider
    );
    context.subscriptions.push(codeLensDisposable);
    logger.info('CodeLens provider registered');
  } else {
    logger.info('CodeLens disabled - use Test Explorer instead');
  }

  // Register all commands
  registerCommands(context);

  logger.info('Cucumber Java Runner extension activated successfully');
}

/**
 * Register all VS Code commands for the extension
 */
function registerCommands(context: vscode.ExtensionContext) {
  // Command to run the entire feature file
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.runFeature', async (uri: vscode.Uri) => {
      let featureUri = uri;

      // If called from editor instead of explorer
      if (!featureUri && vscode.window.activeTextEditor) {
        featureUri = vscode.window.activeTextEditor.document.uri;
      }

      if (!featureUri) {
        vscode.window.showErrorMessage('Please open or select a feature file.');
        return;
      }

      runCucumberTest(featureUri, undefined, undefined, false);
    })
  );

  // CodeLens command to run the entire feature file
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.runFeatureCodeLens', async (uri: vscode.Uri) => {
      logger.debug('runFeatureCodeLensCommand called with URI:', uri.toString());
      vscode.window.showInformationMessage('Feature test starting...');
      runCucumberTest(uri, undefined, undefined, false);
    })
  );

  // CodeLens command to run a single scenario
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.runScenarioCodeLens', async (uri: vscode.Uri, lineNumber: number) => {
      logger.debug('runScenarioCodeLensCommand called - URI:', uri.toString(), 'line:', lineNumber);
      vscode.window.showInformationMessage(`Scenario test starting at line ${lineNumber}...`);
      runCucumberTest(uri, lineNumber, undefined, false);
    })
  );

  // CodeLens command to run a single example
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.runExampleCodeLens', async (uri: vscode.Uri, scenarioLine: number, exampleLine: number) => {
      logger.debug('runExampleCodeLensCommand called - URI:', uri.toString(), 'scenario line:', scenarioLine, 'example line:', exampleLine);
      vscode.window.showInformationMessage(`Example test starting at line ${exampleLine}...`);
      runCucumberTest(uri, scenarioLine, exampleLine, false);
    })
  );

  // Command to run a single scenario
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.runScenario', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('Please open a feature file.');
        return;
      }

      const uri = editor.document.uri;
      if (path.extname(uri.fsPath) !== '.feature') {
        vscode.window.showErrorMessage('This command only works with .feature files.');
        return;
      }

      const currentLine = editor.selection.active.line;
      const scenario = findScenarioAtLine(editor.document, currentLine);

      if (!scenario) {
        vscode.window.showErrorMessage('Please right-click inside a Scenario or Scenario Outline.');
        return;
      }

      runCucumberTest(uri, scenario.lineNumber, undefined, false);
    })
  );

  // Command to run a single example row
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.runExample', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('Please open a feature file.');
        return;
      }

      const uri = editor.document.uri;
      if (path.extname(uri.fsPath) !== '.feature') {
        vscode.window.showErrorMessage('This command only works with .feature files.');
        return;
      }

      const currentLine = editor.selection.active.line;
      logger.debug(`runExampleCommand called, line: ${currentLine}`);

      // First check if the line starts with |
      const lineText = editor.document.lineAt(currentLine).text.trim();
      if (!lineText.startsWith('|')) {
        vscode.window.showErrorMessage('Please right-click on a data row (starting with |) in an Examples table.');
        return;
      }

      const examples = findExampleAtLine(editor.document, currentLine);

      if (!examples) {
        vscode.window.showErrorMessage('Example row not detected. Please right-click on a data row (starting with |, not the header row) in an Examples table.');
        return;
      }

      runCucumberTest(uri, examples.lineNumber, examples.exampleLineNumber, false);
    })
  );

  // Command to debug the entire feature file
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.debugFeature', async (uri: vscode.Uri) => {
      let featureUri = uri;

      // If called from editor instead of explorer
      if (!featureUri && vscode.window.activeTextEditor) {
        featureUri = vscode.window.activeTextEditor.document.uri;
      }

      if (!featureUri) {
        vscode.window.showErrorMessage('Please open or select a feature file.');
        return;
      }

      runCucumberTest(featureUri, undefined, undefined, true);
    })
  );

  // CodeLens command to debug the entire feature file
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.debugFeatureCodeLens', async (uri: vscode.Uri) => {
      logger.debug('debugFeatureCodeLensCommand called with URI:', uri.toString());
      vscode.window.showInformationMessage('Feature debug starting...');
      runCucumberTest(uri, undefined, undefined, true);
    })
  );

  // CodeLens command to debug a single scenario
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.debugScenarioCodeLens', async (uri: vscode.Uri, lineNumber: number) => {
      logger.debug('debugScenarioCodeLensCommand called - URI:', uri.toString(), 'line:', lineNumber);
      vscode.window.showInformationMessage(`Scenario debug starting at line ${lineNumber}...`);
      runCucumberTest(uri, lineNumber, undefined, true);
    })
  );

  // CodeLens command to debug a single example
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.debugExampleCodeLens', async (uri: vscode.Uri, scenarioLine: number, exampleLine: number) => {
      logger.debug('debugExampleCodeLensCommand called - URI:', uri.toString(), 'scenario line:', scenarioLine, 'example line:', exampleLine);
      vscode.window.showInformationMessage(`Example debug starting at line ${exampleLine}...`);
      runCucumberTest(uri, scenarioLine, exampleLine, true);
    })
  );

  // Command to debug a single scenario
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.debugScenario', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('Please open a feature file.');
        return;
      }

      const uri = editor.document.uri;
      if (path.extname(uri.fsPath) !== '.feature') {
        vscode.window.showErrorMessage('This command only works with .feature files.');
        return;
      }

      const currentLine = editor.selection.active.line;
      const scenario = findScenarioAtLine(editor.document, currentLine);

      if (!scenario) {
        vscode.window.showErrorMessage('Please right-click inside a Scenario or Scenario Outline.');
        return;
      }

      runCucumberTest(uri, scenario.lineNumber, undefined, true);
    })
  );

  // Command to debug a single example row
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.debugExample', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('Please open a feature file.');
        return;
      }

      const uri = editor.document.uri;
      if (path.extname(uri.fsPath) !== '.feature') {
        vscode.window.showErrorMessage('This command only works with .feature files.');
        return;
      }

      const currentLine = editor.selection.active.line;
      logger.debug(`debugExampleCommand called, line: ${currentLine}`);

      // First check if the line starts with |
      const lineText = editor.document.lineAt(currentLine).text.trim();
      if (!lineText.startsWith('|')) {
        vscode.window.showErrorMessage('Please right-click on a data row (starting with |) in an Examples table.');
        return;
      }

      const examples = findExampleAtLine(editor.document, currentLine);

      if (!examples) {
        vscode.window.showErrorMessage('Example row not detected. Please right-click on a data row (starting with |, not the header row) in an Examples table.');
        return;
      }

      runCucumberTest(uri, examples.lineNumber, examples.exampleLineNumber, true);
    })
  );
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
