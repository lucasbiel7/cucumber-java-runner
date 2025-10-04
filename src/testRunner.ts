/**
 * Test runner - executes Cucumber tests (non-debug mode)
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { findGluePath, resolveMavenClasspath } from './mavenResolver';

/**
 * Runs the selected feature, scenario, or example row
 */
export async function runSelectedTest(uri: vscode.Uri, lineNumber?: number, exampleLine?: number): Promise<boolean> {
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

      await runCucumberTest(workspaceFolder.uri.fsPath, relativePath, userInput, lineNumber, exampleLine);
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
      await runCucumberTest(workspaceFolder.uri.fsPath, relativePath, gluePath, lineNumber, exampleLine);
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Error: ${error.message || 'Unknown error'}`);
  }

  return true;
}

/**
 * Runs the Cucumber test - IntelliJ-style approach (non-debug)
 */
async function runCucumberTest(
  projectRoot: string,
  featurePath: string,
  gluePath: string,
  lineNumber?: number,
  exampleLineNumber?: number
) {
  // Path to the feature file to run
  let cucumberPath = featurePath.replace(/\\/g, '/');

  // Determine the name for the run configuration
  let runName = 'Cucumber: ';
  let targetDescription = '';

  // Read the feature file to get line content
  try {
    const featureContent = fs.readFileSync(path.join(projectRoot, featurePath), 'utf-8');
    const lines = featureContent.split('\n');

    // If a specific line is specified, add that line
    if (lineNumber && lineNumber > 0) {
      if (exampleLineNumber && exampleLineNumber > 0) {
        // Running an example - use only the example line
        cucumberPath += ':' + exampleLineNumber;

        // Get the example line content
        if (exampleLineNumber <= lines.length) {
          const exampleContent = lines[exampleLineNumber - 1].trim();
          targetDescription = exampleContent || `Example at line ${exampleLineNumber}`;
        } else {
          targetDescription = `Example at line ${exampleLineNumber}`;
        }
        console.log(`Cucumber run path (example): ${cucumberPath}`);
      } else {
        // Running a scenario
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
        console.log(`Cucumber run path (scenario): ${cucumberPath}`);
      }
    } else {
      // Get feature name from the file
      const featureLine = lines.find(line => line.trim().startsWith('Feature:'));
      if (featureLine) {
        targetDescription = featureLine.trim().replace(/^Feature:\s*/i, '');
      } else {
        targetDescription = path.basename(featurePath, '.feature');
      }
      console.log(`Cucumber run path (feature): ${cucumberPath}`);
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

  runName += targetDescription;

  // Get workspace folder
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found.');
    return;
  }

  // Show progress while compiling and resolving dependencies
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Compiling project and resolving dependencies...',
    cancellable: false
  }, async (progress) => {
    // Resolve Maven classpath including all dependencies
    const classPaths = await resolveMavenClasspath(projectRoot);

    // Build the arguments for Cucumber CLI (as string, not array)
    const args = `--glue ${gluePath} --plugin pretty ${cucumberPath}`;

    // Create run configuration using io.cucumber.core.cli.Main directly (without debug)
    const runConfig: vscode.DebugConfiguration = {
      type: 'java',
      name: runName,
      request: 'launch',
      mainClass: 'io.cucumber.core.cli.Main',
      projectName: path.basename(projectRoot),
      cwd: '${workspaceFolder}',
      args: args,
      classPaths: classPaths,
      vmArgs: `-Dfile.encoding=UTF-8`,
      console: 'integratedTerminal',
      noDebug: true, // Run without debugging
      internalConsoleOptions: 'neverOpen',
    };

    console.log('Starting test run with config:', JSON.stringify(runConfig, null, 2));
    console.log(`Classpath contains ${classPaths.length} entries`);

    // Start run session (without debugging)
    const started = await vscode.debug.startDebugging(workspaceFolder, runConfig);

    if (!started) {
      vscode.window.showErrorMessage('Failed to start test run. Make sure you have the Java debugger extension (Language Support for Java by Red Hat or Debugger for Java) installed.');
    }
  });
}
