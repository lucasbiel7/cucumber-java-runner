/**
 * Cucumber runner - executes Cucumber tests (both debug and non-debug modes)
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { findGluePath, resolveMavenClasspath } from './mavenResolver';

/**
 * Result of a test execution with detailed scenario results
 */
export interface TestExecutionResult {
  passed: boolean;
  resultFile?: string;
}

/**
 * Runs or debugs the selected feature, scenario, or example row
 * @param uri - The URI of the feature file
 * @param lineNumber - Optional line number for scenario
 * @param exampleLine - Optional line number for example
 * @param isDebug - Whether to run in debug mode (default: false)
 * @returns TestExecutionResult with pass/fail status and result file path
 */
export async function runCucumberTest(
  uri: vscode.Uri,
  lineNumber?: number,
  exampleLine?: number,
  isDebug = false
): Promise<TestExecutionResult> {
  // Find the project root directory
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Feature file is not inside a workspace.');
    return { passed: false };
  }

  // Get the relative path of the feature file in the project
  const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
  try {
    // Scan the project to find the steps directory
    const gluePaths = await findGluePath(workspaceFolder.uri.fsPath);

    if (!gluePaths) {
      // If glue path is not found, ask the user
      const userInput = await vscode.window.showInputBox({
        prompt: 'Enter glue path for steps directory (e.g. org.example.steps)',
        placeHolder: 'org.example.steps'
      });

      if (!userInput) {
        vscode.window.showErrorMessage('Glue path not specified, operation cancelled.');
        return { passed: false };
      }

      return await executeCucumberTest(
        workspaceFolder.uri.fsPath,
        relativePath,
        [userInput],
        lineNumber,
        exampleLine,
        isDebug
      );
    } else {
      return await executeCucumberTest(
        workspaceFolder.uri.fsPath,
        relativePath,
        gluePaths,
        lineNumber,
        exampleLine,
        isDebug
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Error: ${errorMessage}`);
    return { passed: false };
  }
}

/**
 * Executes the Cucumber test - IntelliJ-style approach
 * @returns TestExecutionResult with pass/fail status and result file path
 */
async function executeCucumberTest(
  projectRoot: string,
  featurePath: string,
  gluePaths: string[],
  lineNumber?: number,
  exampleLineNumber?: number,
  isDebug = false
): Promise<TestExecutionResult> {
  // Path to the feature file to run
  let cucumberPath = featurePath.replace(/\\/g, '/');

  // Determine the name for the configuration
  const configPrefix = isDebug ? 'Cucumber Debug: ' : 'Cucumber: ';
  let configName = configPrefix;
  let targetDescription = '';

  // Read the feature file to get line content
  try {
    const featureContent = fs.readFileSync(path.join(projectRoot, featurePath), 'utf-8');
    const lines = featureContent.split('\n');

    // If a specific line is specified, add that line
    if (lineNumber && lineNumber > 0) {
      if (exampleLineNumber && exampleLineNumber > 0) {
        // Running/debugging an example - use only the example line
        cucumberPath += ':' + exampleLineNumber;

        // Get the example line content
        if (exampleLineNumber <= lines.length) {
          const exampleContent = lines[exampleLineNumber - 1].trim();
          targetDescription = exampleContent || `Example at line ${exampleLineNumber}`;
        } else {
          targetDescription = `Example at line ${exampleLineNumber}`;
        }
        console.log(`Cucumber path (example): ${cucumberPath}`);
      } else {
        // Running/debugging a scenario
        cucumberPath += ':' + lineNumber;

        // Get the scenario line content
        if (lineNumber <= lines.length) {
          let scenarioContent = lines[lineNumber - 1].trim();
          // Remove "Scenario:" or "Scenario Outline:" prefix if present
          scenarioContent = scenarioContent.replace(/^(Scenario|Scenario Outline):\s*/i, '');
          targetDescription = scenarioContent || `Scenario at line ${lineNumber}`;
        } else {
          targetDescription = `Scenario at line ${lineNumber}`;
        }
        console.log(`Cucumber path (scenario): ${cucumberPath}`);
      }
    } else {
      // Get feature name from the file
      const featureLine = lines.find(line => line.trim().startsWith('Feature:'));
      if (featureLine) {
        targetDescription = featureLine.trim().replace(/^Feature:\s*/i, '');
      } else {
        targetDescription = path.basename(featurePath, '.feature');
      }
      console.log(`Cucumber path (feature): ${cucumberPath}`);
    }
  } catch (error) {
    console.error('Error reading feature file:', error);
    // Fallback to simple descriptions
    if (lineNumber && lineNumber > 0) {
      if (exampleLineNumber && exampleLineNumber > 0) {
        cucumberPath += ':' + exampleLineNumber;
        targetDescription = `Example at line ${exampleLineNumber}`;
      } else {
        cucumberPath += ':' + lineNumber;
        targetDescription = `Scenario at line ${lineNumber}`;
      }
    } else {
      targetDescription = path.basename(featurePath, '.feature');
    }
  }

  configName += targetDescription;

  // Get workspace folder
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found.');
    return { passed: false };
  }

  // Show progress while compiling and resolving dependencies
  const classPaths = await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Compiling project and resolving dependencies...',
    cancellable: false
  }, async () =>  await resolveMavenClasspath(projectRoot));

    // Create a unique output file for the test results
    const resultFile = path.join(projectRoot, 'target', `.cucumber-result-${Date.now()}.json`);

    // Get custom object factory from workspace configuration
    const config = vscode.workspace.getConfiguration('cucumberJavaRunner');
    const customObjectFactory = config.get<string>('objectFactory');
    // Build the arguments for Cucumber CLI with JSON plugin to capture results
    const cucumberArgs = [
      ...gluePaths.flatMap(gluePath => ['--glue', gluePath]),
      '--plugin', 'pretty',
      '--plugin', `json:${resultFile}`,
      ...(customObjectFactory ? ['--object-factory', customObjectFactory] : []),
      cucumberPath
    ].join(' ');

    // Use VS Code debug API for both run and debug modes
    return await runWithVSCode(workspaceFolder, configName, classPaths, cucumberArgs, projectRoot, resultFile, isDebug);
}

/**
 * Runs test using VS Code debug API and reads result from JSON file
 */
async function runWithVSCode(
  workspaceFolder: vscode.WorkspaceFolder,
  configName: string,
  classPaths: string[],
  cucumberArgs: string,
  projectRoot: string,
  resultFile: string,
  isDebug: boolean
): Promise<TestExecutionResult> {
  const config: vscode.DebugConfiguration = {
    type: 'java',
    name: configName,
    request: 'launch',
    mainClass: 'io.cucumber.core.cli.Main',
    projectName: path.basename(projectRoot),
    cwd: '${workspaceFolder}',
    args: cucumberArgs,
    classPaths: classPaths,
    vmArgs: `-Dfile.encoding=UTF-8`,
    console: 'integratedTerminal',
    noDebug: !isDebug,
    stopOnEntry: false,
    internalConsoleOptions: 'neverOpen',
  };

  const started = await vscode.debug.startDebugging(workspaceFolder, config);

  if (!started) {
    vscode.window.showErrorMessage(`Failed to start ${isDebug ? 'debug' : 'test'} session. Make sure you have the Java debugger extension installed.`);
    return { passed: false };
  }

  // Wait for session to end and then read the result file
  return await new Promise<TestExecutionResult>((resolve) => {
    const disposable = vscode.debug.onDidTerminateDebugSession(session => {
      if (session.name === configName) {
        disposable.dispose();

        // Give a small delay to ensure file is written
        setTimeout(() => {
          const testPassed = checkCucumberResults(resultFile);

          // Return result with file path (don't clean up yet - testController might need it)
          resolve({
            passed: testPassed,
            resultFile: resultFile
          });
        }, 500);
      }
    });

    // Timeout after 10 minutes (longer for debug sessions)
    setTimeout(() => {
      disposable.dispose();
      console.log('Test timeout');
      resolve({ passed: false });
    }, 600000);
  });
}

/**
 * Checks Cucumber JSON result file to determine if tests passed
 * @param resultFile Path to the JSON result file
 * @returns true if all tests passed, false otherwise
 */
function checkCucumberResults(resultFile: string): boolean {
  try {
    // Check if result file exists
    if (!fs.existsSync(resultFile)) {
      console.error(`Result file not found: ${resultFile}`);
      return false;
    }

    // Read and parse the JSON result file
    const fileContent = fs.readFileSync(resultFile, 'utf-8');
    const results = JSON.parse(fileContent);

    console.log(`Analyzing Cucumber results from: ${resultFile}`);

    // Cucumber JSON format: array of features
    let totalScenarios = 0;
    let passedScenarios = 0;
    let failedScenarios = 0;

    for (const feature of results) {
      if (feature.elements) {
        for (const scenario of feature.elements) {
          totalScenarios++;

          // Check if all steps in the scenario passed
          let scenarioPassed = true;
          if (scenario.steps) {
            for (const step of scenario.steps) {
              if (step.result && step.result.status !== 'passed' && step.result.status !== 'skipped') {
                scenarioPassed = false;
                break;
              }
            }
          }

          if (scenarioPassed) {
            passedScenarios++;
          } else {
            failedScenarios++;
          }
        }
      }
    }

    console.log(`Test Results: ${passedScenarios}/${totalScenarios} scenarios passed`);

    if (failedScenarios > 0) {
      console.log(`❌ ${failedScenarios} scenario(s) failed`);
      return false;
    } else {
      console.log(`✅ All scenarios passed`);
      return true;
    }

  } catch (error) {
    console.error('Error reading Cucumber results:', error);
    return false;
  }
}
