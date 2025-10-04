/**
 * Cucumber Java Easy Runner - VS Code Extension
 * Main entry point for the extension
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { CucumberTestController } from './testController';
import { CucumberCodeLensProvider } from './codeLensProvider';
import { runSelectedTest } from './testRunner';
import { debugSelectedTest } from './debugRunner';
import { findScenarioAtLine, findExampleAtLine } from './featureParser';

// Global test controller instance
let globalTestController: CucumberTestController | undefined;

export function activate(context: vscode.ExtensionContext) {

  // Dispose existing controller if it exists
  if (globalTestController) {
    try {
      globalTestController.dispose();
    } catch (error) {
      console.log('Error disposing previous controller:', error);
    }
  }

  // Create new test controller
  globalTestController = new CucumberTestController(context);

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
    console.log('CodeLens provider registered');
  } else {
    console.log('CodeLens disabled - use Test Explorer instead');
  }

  // Register all commands
  registerCommands(context);
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

      runSelectedTest(featureUri);
    })
  );

  // CodeLens command to run the entire feature file
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.runFeatureCodeLens', async (uri: vscode.Uri) => {
      console.log('runFeatureCodeLensCommand called with URI:', uri.toString());
      vscode.window.showInformationMessage('Feature test starting...');
      runSelectedTest(uri);
    })
  );

  // CodeLens command to run a single scenario
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.runScenarioCodeLens', async (uri: vscode.Uri, lineNumber: number) => {
      console.log('runScenarioCodeLensCommand called with URI:', uri.toString(), 'line:', lineNumber);
      vscode.window.showInformationMessage(`Scenario test starting at line ${lineNumber}...`);
      runSelectedTest(uri, lineNumber);
    })
  );

  // CodeLens command to run a single example
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.runExampleCodeLens', async (uri: vscode.Uri, scenarioLine: number, exampleLine: number) => {
      console.log('runExampleCodeLensCommand called with URI:', uri.toString(), 'scenario line:', scenarioLine, 'example line:', exampleLine);
      vscode.window.showInformationMessage(`Example test starting at line ${exampleLine}...`);
      runSelectedTest(uri, scenarioLine, exampleLine);
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

      runSelectedTest(uri, scenario.lineNumber);
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
      console.log(`runExampleCommand called, line: ${currentLine}`);

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

      runSelectedTest(uri, examples.lineNumber, examples.exampleLineNumber);
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

      debugSelectedTest(featureUri);
    })
  );

  // CodeLens command to debug the entire feature file
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.debugFeatureCodeLens', async (uri: vscode.Uri) => {
      console.log('debugFeatureCodeLensCommand called with URI:', uri.toString());
      vscode.window.showInformationMessage('Feature debug starting...');
      debugSelectedTest(uri);
    })
  );

  // CodeLens command to debug a single scenario
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.debugScenarioCodeLens', async (uri: vscode.Uri, lineNumber: number) => {
      console.log('debugScenarioCodeLensCommand called with URI:', uri.toString(), 'line:', lineNumber);
      vscode.window.showInformationMessage(`Scenario debug starting at line ${lineNumber}...`);
      debugSelectedTest(uri, lineNumber);
    })
  );

  // CodeLens command to debug a single example
  context.subscriptions.push(
    vscode.commands.registerCommand('cucumberJavaRunner.debugExampleCodeLens', async (uri: vscode.Uri, scenarioLine: number, exampleLine: number) => {
      console.log('debugExampleCodeLensCommand called with URI:', uri.toString(), 'scenario line:', scenarioLine, 'example line:', exampleLine);
      vscode.window.showInformationMessage(`Example debug starting at line ${exampleLine}...`);
      debugSelectedTest(uri, scenarioLine, exampleLine);
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

      debugSelectedTest(uri, scenario.lineNumber);
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
      console.log(`debugExampleCommand called, line: ${currentLine}`);

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

      debugSelectedTest(uri, examples.lineNumber, examples.exampleLineNumber);
    })
  );
}

export function deactivate() {}
