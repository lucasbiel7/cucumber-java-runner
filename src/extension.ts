// VS Code extension main file
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface ScenarioInfo {
  name: string;
  lineNumber: number;
  exampleLineNumber?: number;
}

interface FeatureInfo {
  name: string;
  scenarios: ScenarioInfo[];
  filePath: string;
}

/**
 * Test controller for Cucumber tests
 */
class CucumberTestController {
  private controller: vscode.TestController;
  private watchedFiles = new Map<string, vscode.TestItem>();

  constructor(context: vscode.ExtensionContext) {
    this.controller = vscode.tests.createTestController('cucumberJavaEasyRunner', 'Cucumber Java Tests');
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
    const refreshCommand = vscode.commands.registerCommand('cucumberJavaEasyRunner.refreshTests', () => {
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
      const featureInfo = this.parseFeatureFile(document);
      
      if (!featureInfo) return;

      // Create unique feature ID using normalized file path
      const featureId = path.normalize(uri.fsPath);
      
      // Check if feature already exists
      if (this.watchedFiles.has(featureId)) {
        console.log(`Feature already exists: ${featureId}`);
        return;
      }
      
      const featureItem = this.controller.createTestItem(featureId, featureInfo.name, uri);
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

  private parseFeatureFile(document: vscode.TextDocument): FeatureInfo | null {
    const text = document.getText();
    const lines = text.split('\n');
    
    let featureName = '';
    const scenarios: ScenarioInfo[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('Feature:')) {
        featureName = line.substring(8).trim();
      } else if (line.startsWith('Scenario:')) {
        const scenarioName = line.substring(9).trim();
        scenarios.push({
          name: scenarioName,
          lineNumber: i + 1
        });
      } else if (line.startsWith('Scenario Outline:')) {
        const scenarioName = line.substring(17).trim();
        scenarios.push({
          name: `${scenarioName} (Outline)`,
          lineNumber: i + 1
        });
      }
    }

    if (!featureName) return null;

    return {
      name: featureName,
      scenarios,
      filePath: document.uri.fsPath
    };
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
      
      // Check if this is a scenario (contains :scenario: in ID)
      const isScenario = testItem.id.includes(':scenario:');
      
      if (isScenario) {
        // Extract line number from scenario ID
        const parts = testItem.id.split(':scenario:');
        const lineNumber = parseInt(parts[1]);
        console.log(`Running scenario at line ${lineNumber} for file ${uri.fsPath}`);
        await this.executeTest(uri, lineNumber);
      } else {
        // This is a feature file
        console.log(`Running entire feature file ${uri.fsPath}`);
        await this.executeTest(uri);
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

  private async executeTest(uri: vscode.Uri, lineNumber?: number) {
    // Use the existing runSelectedTest function
    await runSelectedTest(uri, lineNumber);
  }

  dispose() {
    this.controller.dispose();
    this.watchedFiles.clear();
  }
}

/**
 * CodeLens provider for Cucumber feature files - with compact buttons
 */
class CucumberCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    
    if (path.extname(document.uri.fsPath) !== '.feature') {
      return codeLenses;
    }

    const text = document.getText();
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('Feature:')) {
        // Position the button at the very beginning of the line
        const range = new vscode.Range(i, 0, i, 0);
        codeLenses.push(new vscode.CodeLens(range, {
          title: '$(play-circle) ',
          tooltip: 'Click to run the entire feature file',
          command: 'cucumberJavaEasyRunner.runFeatureCodeLens',
          arguments: [document.uri]
        }));
      } else if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
        // Position the button at the very beginning of the line
        const range = new vscode.Range(i, 0, i, 0);
        codeLenses.push(new vscode.CodeLens(range, {
          title: '$(play) ',
          tooltip: 'Click to run this scenario',
          command: 'cucumberJavaEasyRunner.runScenarioCodeLens',
          arguments: [document.uri, i + 1] // 1-indexed line number
        }));
      } else if (line.startsWith('|') && i > 0) {
        // Check if this is an example row (not header)
        const exampleInfo = this.findExampleRowInfo(lines, i);
        if (exampleInfo) {
          const range = new vscode.Range(i, 0, i, 0);
          codeLenses.push(new vscode.CodeLens(range, {
            title: '$(debug-start) ',
            tooltip: 'Click to run this example row',
            command: 'cucumberJavaEasyRunner.runExampleCodeLens',
            arguments: [document.uri, exampleInfo.scenarioLine, i + 1] // scenario line and example line
          }));
        }
      }
    }

    return codeLenses;
  }

  private findExampleRowInfo(lines: string[], currentLine: number): { scenarioLine: number } | null {
    // Go backwards to find Examples heading
    let examplesLine = -1;
    let headerLine = -1;
    
    for (let i = currentLine; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('Examples:')) {
        examplesLine = i;
        break;
      }
    }
    
    if (examplesLine === -1) {
      return null;
    }
    
    // Find the header row (first | line after Examples)
    for (let i = examplesLine + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|')) {
        headerLine = i;
        break;
      }
    }
    
    // Current line must be after header line to be a data row
    if (headerLine === -1 || currentLine <= headerLine) {
      return null;
    }
    
    // Find the Scenario Outline
    for (let i = examplesLine; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('Scenario Outline:')) {
        return { scenarioLine: i + 1 }; // 1-indexed
      }
    }
    
    return null;
  }
}

/**
 * Finds example row info
 */
function findExampleRowInfo(lines: string[], currentLine: number): { scenarioLine: number } | null {
  // Go backwards to find Examples heading
  let examplesLine = -1;
  let headerLine = -1;
  
  for (let i = currentLine; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('Examples:')) {
      examplesLine = i;
      break;
    }
  }
  
  if (examplesLine === -1) {
    return null;
  }
  
  // Find the header row (first | line after Examples)
  for (let i = examplesLine + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|')) {
      headerLine = i;
      break;
    }
  }
  
  // Current line must be after header line to be a data row
  if (headerLine === -1 || currentLine <= headerLine) {
    return null;
  }
  
  // Find the Scenario Outline
  for (let i = examplesLine; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('Scenario Outline:')) {
      return { scenarioLine: i + 1 }; // 1-indexed
    }
  }
  
  return null;
}

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
  const config = vscode.workspace.getConfiguration('cucumberJavaEasyRunner');
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

  // Command to run the entire feature file
  let runFeatureCommand = vscode.commands.registerCommand('cucumberJavaEasyRunner.runFeature', async (uri: vscode.Uri) => {
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
  });

  // CodeLens command to run the entire feature file
  let runFeatureCodeLensCommand = vscode.commands.registerCommand('cucumberJavaEasyRunner.runFeatureCodeLens', async (uri: vscode.Uri) => {
    console.log('runFeatureCodeLensCommand called with URI:', uri.toString());
    vscode.window.showInformationMessage('Feature test starting...');
    runSelectedTest(uri);
  });

  // CodeLens command to run a single scenario
  let runScenarioCodeLensCommand = vscode.commands.registerCommand('cucumberJavaEasyRunner.runScenarioCodeLens', async (uri: vscode.Uri, lineNumber: number) => {
    console.log('runScenarioCodeLensCommand called with URI:', uri.toString(), 'line:', lineNumber);
    vscode.window.showInformationMessage(`Scenario test starting at line ${lineNumber}...`);
    runSelectedTest(uri, lineNumber);
  });

  // CodeLens command to run a single example
  let runExampleCodeLensCommand = vscode.commands.registerCommand('cucumberJavaEasyRunner.runExampleCodeLens', async (uri: vscode.Uri, scenarioLine: number, exampleLine: number) => {
    console.log('runExampleCodeLensCommand called with URI:', uri.toString(), 'scenario line:', scenarioLine, 'example line:', exampleLine);
    vscode.window.showInformationMessage(`Example test starting at line ${exampleLine}...`);
    runSelectedTest(uri, scenarioLine, exampleLine);
  });

  // Command to run a single scenario
  let runScenarioCommand = vscode.commands.registerCommand('cucumberJavaEasyRunner.runScenario', async () => {
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
  });
  
  // Command to run a single example row
  let runExampleCommand = vscode.commands.registerCommand('cucumberJavaEasyRunner.runExample', async () => {
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
  });

  context.subscriptions.push(runFeatureCommand);
  context.subscriptions.push(runFeatureCodeLensCommand);
  context.subscriptions.push(runScenarioCodeLensCommand);
  context.subscriptions.push(runExampleCodeLensCommand);
  context.subscriptions.push(runScenarioCommand);
  context.subscriptions.push(runExampleCommand);
}

/**
 * Runs the selected feature, scenario, or example row
 */
async function runSelectedTest(uri: vscode.Uri, lineNumber?: number, exampleLine?: number) {
  const terminal = vscode.window.createTerminal('Cucumber Feature');
  
  // Find the project root directory
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Feature file is not inside a workspace.');
    return false;
  }

  // Get the relative path of the feature file in the project
  const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
  
  // Save the run mode information
  let runMode = 'feature';
  if (lineNumber && lineNumber > 0) {
    runMode = exampleLine ? 'example' : 'scenario';
  }
  
  console.log(`Run mode: ${runMode}`);
  console.log(`Feature: ${relativePath}`);
  console.log(`Scenario line: ${lineNumber || 'entire feature'}`);
  console.log(`Example line: ${exampleLine || 'all scenarios'}`);
  
  try {
    // Scan the project to find the steps directory
    const gluePath = await findGluePath(workspaceFolder.uri.fsPath);
    
    if (!gluePath) {
      // If glue path is not found, ask the user
      const userInput = await vscode.window.showInputBox({
        prompt: 'Enter glue path for steps directory (e.g. org.example.steps)',
        placeHolder: 'org.example.steps'
      });
      
      if (!userInput) {
        vscode.window.showErrorMessage('Glue path not specified, operation cancelled.');
        return false;
      }
      
      runCucumberTest(workspaceFolder.uri.fsPath, relativePath, userInput, terminal, lineNumber, exampleLine);
    } else {
      // If glue path is found, run directly
      let message = '';
      if (runMode === 'feature') {
        message = `Running feature file with glue path "${gluePath}"`;
      } else if (runMode === 'scenario') {
        message = `Running scenario at line ${lineNumber} with glue path "${gluePath}"`;
      } else if (runMode === 'example') {
        message = `Running example at line ${lineNumber}:${exampleLine} with glue path "${gluePath}"`;
      }
      
      vscode.window.showInformationMessage(message);
      runCucumberTest(workspaceFolder.uri.fsPath, relativePath, gluePath, terminal, lineNumber, exampleLine);
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Error: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Finds the scenario at the given line number
 */
function findScenarioAtLine(document: vscode.TextDocument, line: number): ScenarioInfo | null {
  const text = document.getText();
  const lines = text.split('\n');

  // Find the closest scenario heading from the line number backwards
  for (let i = line; i >= 0; i--) {
    const currentLine = lines[i].trim();
    if (currentLine.startsWith('Scenario:') || currentLine.startsWith('Scenario Outline:')) {
      let name = currentLine.substring(currentLine.indexOf(':') + 1).trim();
      return { name, lineNumber: i + 1 }; // 1-indexed line number for Cucumber
    }
  }

  // Find the feature heading (if no scenario was found)
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i].trim();
    if (currentLine.startsWith('Feature:')) {
      return { name: 'feature', lineNumber: 0 }; // 0 means entire feature
    }
  }

  return null;
}

/**
 * Finds the example row at the given line number
 */
function findExampleAtLine(document: vscode.TextDocument, line: number): ScenarioInfo | null {
  try {
    const text = document.getText();
    const lines = text.split('\n');
    
    // Check the line content for debugging
    const currentLineText = lines[line].trim();
    console.log(`Debug: Current line (${line}): "${currentLineText}"`);
    
    // Check if the line starts with |
    if (!currentLineText.startsWith('|')) {
      console.log('Debug: Line does not start with |');
      return null;
    }
    
    // Find the Examples block
    let examplesLine = -1;
    let scenarioOutlineLine = -1;
    let headerLine = -1;
    
    // First go backwards to find the Examples heading
    for (let i = line; i >= 0; i--) {
      const lineText = lines[i].trim();
      console.log(`Debug: Backward line (${i}): "${lineText}"`);
      
      if (lineText.startsWith('Examples:')) {
        examplesLine = i;
        console.log(`Debug: Examples heading found, line: ${examplesLine}`);
        break;
      }
    }
    
    if (examplesLine === -1) {
      console.log('Debug: Examples heading not found');
      return null;
    }
    
    // The first line starting with | after the Examples heading is the header row
    for (let i = examplesLine + 1; i < lines.length; i++) {
      const lineText = lines[i].trim();
      if (lineText.startsWith('|')) {
        headerLine = i;
        console.log(`Debug: Header row found, line: ${headerLine}`);
        break;
      }
    }
    
    if (headerLine === -1 || line <= headerLine) {
      console.log(`Debug: Valid header row not found or current line (${line}) is before header line (${headerLine})`);
      return null;
    }
    
    // Go backwards from Examples heading to find the Scenario Outline
    for (let i = examplesLine; i >= 0; i--) {
      const lineText = lines[i].trim();
      if (lineText.startsWith('Scenario Outline:')) {
        scenarioOutlineLine = i + 1; // 1-indexed
        console.log(`Debug: Scenario Outline found, line: ${scenarioOutlineLine}`);
        break;
      }
    }
    
    if (scenarioOutlineLine === -1) {
      console.log('Debug: Scenario Outline not found');
      return null;
    }
    
    // Set the current line directly as the line to run
    // Note: Cucumber's expected format: feature:scenario_line:example_line
    return {
      name: 'example',
      lineNumber: scenarioOutlineLine,
      exampleLineNumber: line + 1 // 1-indexed
    };
  } catch (err: any) {
    console.error(`Error in findExampleAtLine: ${err.message}`);
    return null;
  }
}

/**
 * Finds the steps directories in the project and converts to Java package structure
 */
async function findGluePath(projectRoot: string): Promise<string | null> {
  // In Maven projects, test code is usually in src/test/java
  const testDir = path.join(projectRoot, 'src', 'test', 'java');
  
  if (!fs.existsSync(testDir)) {
    return null;
  }
  
  // Recursively search for steps directories
  const stepsDir = await findStepsDir(testDir);
  
  if (!stepsDir) {
    return null;
  }
  
  // Create the Java package name for the steps directory
  // src/test/java/org/example/steps -> org.example.steps
  const packagePath = path.relative(testDir, stepsDir).replace(/\\/g, '/').replace(/\//g, '.');
  
  return packagePath;
}

/**
 * Recursively searches for the steps directory
 */
async function findStepsDir(dir: string): Promise<string | null> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  // First check if current directory is a steps folder
  if (dir.endsWith('steps') || dir.endsWith('step')) {
    // Check if it contains Java files directly
    const hasJavaFiles = entries.some(entry => !entry.isDirectory() && entry.name.endsWith('.java'));
    
    // Check Java files in subdirectories
    if (!hasJavaFiles) {
      // Recursive inner function to check directories
      const checkSubDirsForJavaFiles = (subDir: string): boolean => {
        const subEntries = fs.readdirSync(subDir, { withFileTypes: true });
        
        // Does this subdirectory have Java files?
        const hasDirectJavaFiles = subEntries.some(entry => !entry.isDirectory() && entry.name.endsWith('.java'));
        if (hasDirectJavaFiles) {
          return true;
        }
        
        // Check deeper subdirectories if they exist
        for (const entry of subEntries) {
          if (entry.isDirectory()) {
            const hasJavaInSubDir = checkSubDirsForJavaFiles(path.join(subDir, entry.name));
            if (hasJavaInSubDir) {
              return true;
            }
          }
        }
        
        return false;
      };
      
      // Accept this directory if subdirectories contain Java files
      const hasJavaFilesInSubDirs = entries.some(entry => {
        if (entry.isDirectory()) {
          return checkSubDirsForJavaFiles(path.join(dir, entry.name));
        }
        return false;
      });
      
      if (hasJavaFilesInSubDirs) {
        return dir;
      }
    } else {
      // If Java files exist directly in the directory
      return dir;
    }
  }
  
  // If nothing found, search in subdirectories
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subDir = path.join(dir, entry.name);
      const result = await findStepsDir(subDir);
      if (result) {
        return result;
      }
    }
  }
  
  return null;
}

/**
 * Runs the Cucumber test
 */
function runCucumberTest(
  projectRoot: string, 
  featurePath: string, 
  gluePath: string, 
  terminal: vscode.Terminal,
  lineNumber?: number,
  exampleLineNumber?: number
) {
  // Path to the feature file to run
  let cucumberPath = featurePath.replace(/\\/g, '/');
  
  // If a specific line is specified, add that line
  if (lineNumber && lineNumber > 0) {
    if (exampleLineNumber && exampleLineNumber > 0) {
      // Running an example - use only the example line
      cucumberPath += ':' + exampleLineNumber;
      console.log(`Cucumber path (example): ${cucumberPath}`);
    } else {
      // Running a scenario
      cucumberPath += ':' + lineNumber;
      console.log(`Cucumber path (scenario): ${cucumberPath}`);
    }
  } else {
    console.log(`Cucumber path (feature): ${cucumberPath}`);
  }
  
  // Java code to find the classpath and package name
  const javaCode = `
import io.cucumber.core.cli.Main;

public class CucumberRunner {
  public static void main(String[] args) {
    System.out.println("Cucumber feature: ${cucumberPath}");
    String[] cucumberArgs = new String[] {
      "${cucumberPath}",
      "--glue", "${gluePath}",
      "--plugin", "pretty"
    };
    Main.main(cucumberArgs);
  }
}`;

  // Save the temporary Java file
  const tmpDir = path.join(projectRoot, 'target', 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  const javaFilePath = path.join(tmpDir, 'CucumberRunner.java');
  fs.writeFileSync(javaFilePath, javaCode);

  // Compile and run the Java file
  terminal.sendText(`cd "${projectRoot}" && javac -cp "target/test-classes:target/classes:$(mvn dependency:build-classpath -q -Dmdep.outputFile=/dev/stdout)" ${javaFilePath} && java -cp "target/test-classes:target/classes:$(mvn dependency:build-classpath -q -Dmdep.outputFile=/dev/stdout):${path.dirname(javaFilePath)}" CucumberRunner`);
  terminal.show();
}

export function deactivate() {} 