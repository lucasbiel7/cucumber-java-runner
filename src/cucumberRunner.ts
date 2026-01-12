/**
 * Cucumber runner - executes Cucumber tests (both debug and non-debug modes)
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { findGluePath, resolveMavenClasspath } from './mavenResolver';
import { logger } from './logger';
import { waitForValidJsonFile } from './resultFileUtils';
import { ensureJacocoAgent, buildJacocoVmArgs, generateCoverageData } from './jacocoManager';

/**
 * Result of a test execution with detailed scenario results
 */
export interface TestExecutionResult {
  passed: boolean;
  resultFile?: string;
  coverageData?: Map<string, vscode.FileCoverage>;
}

/**
 * Information about a feature to be executed in batch
 */
export interface FeatureToRun {
  uri: vscode.Uri;
  relativePath: string;
  lineNumber?: number;
  exampleLine?: number;
}

/**
 * Runs multiple features in a single Cucumber execution (batch mode)
 * @param features - Array of features to run
 * @param isDebug - Whether to run in debug mode (default: false)
 * @param withCoverage - Whether to collect code coverage (default: false)
 * @returns TestExecutionResult with pass/fail status and result file path
 */
export async function runCucumberTestBatch(
  features: FeatureToRun[],
  isDebug = false,
  withCoverage = false
): Promise<TestExecutionResult> {
  if (features.length === 0) {
    return { passed: false };
  }

  // Use the first feature to get workspace folder
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(features[0].uri);
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Feature file is not inside a workspace.');
    return { passed: false };
  }

  const projectRoot = workspaceFolder.uri.fsPath;

  try {
    // Scan the project to find the steps directory
    const gluePaths = await findGluePath(projectRoot);

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

      return await executeCucumberTestBatch(
        projectRoot,
        features,
        [userInput],
        isDebug,
        withCoverage
      );
    } else {
      return await executeCucumberTestBatch(
        projectRoot,
        features,
        gluePaths,
        isDebug,
        withCoverage
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Error: ${errorMessage}`);
    return { passed: false };
  }
}

/**
 * Runs or debugs the selected feature, scenario, or example row
 * @param uri - The URI of the feature file
 * @param lineNumber - Optional line number for scenario
 * @param exampleLine - Optional line number for example
 * @param isDebug - Whether to run in debug mode (default: false)
 * @param withCoverage - Whether to collect code coverage (default: false)
 * @returns TestExecutionResult with pass/fail status and result file path
 */
export async function runCucumberTest(
  uri: vscode.Uri,
  lineNumber?: number,
  exampleLine?: number,
  isDebug = false,
  withCoverage = false
): Promise<TestExecutionResult> {
  // Use batch mode with a single feature
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Feature file is not inside a workspace.');
    return { passed: false };
  }

  const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);

  return await runCucumberTestBatch(
    [{
      uri: uri,
      relativePath: relativePath,
      lineNumber: lineNumber,
      exampleLine: exampleLine
    }],
    isDebug,
    withCoverage
  );
}

/**
 * Executes multiple Cucumber features in batch mode
 * @returns TestExecutionResult with pass/fail status and result file path
 */
async function executeCucumberTestBatch(
  projectRoot: string,
  features: FeatureToRun[],
  gluePaths: string[],
  isDebug = false,
  withCoverage = false
): Promise<TestExecutionResult> {
  const configPrefix = isDebug ? 'Cucumber Debug: ' : withCoverage ? 'Cucumber Coverage: ' : 'Cucumber: ';

  // Generate config name based on what's being run
  let configName: string;
  if (features.length === 1) {
    const feature = features[0];
    if (feature.exampleLine) {
      configName = `${configPrefix}Example at line ${feature.exampleLine}`;
    } else if (feature.lineNumber) {
      configName = `${configPrefix}Scenario at line ${feature.lineNumber}`;
    } else {
      configName = `${configPrefix}${path.basename(feature.relativePath, '.feature')}`;
    }
  } else {
    configName = `${configPrefix}All Features (${features.length} files)`;
  }

  // Get workspace folder
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found.');
    return { passed: false };
  }

  // Show progress while compiling and resolving dependencies
  const classPaths = await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `Compiling project and resolving dependencies for ${features.length} feature(s)...`,
    cancellable: false
  }, async () => await resolveMavenClasspath(projectRoot));

  // Create a unique output file for the test results
  const resultFile = path.join(projectRoot, 'target', `.cucumber-result-${Date.now()}.json`);

  // Get custom object factory from workspace configuration
  const config = vscode.workspace.getConfiguration('cucumberJavaRunner');
  const customObjectFactory = config.get<string>('objectFactory');

  // Build the arguments for Cucumber CLI with all feature paths
  const cucumberPaths = features.map(f => {
    let cucumberPath = f.relativePath.replace(/\\/g, '/');

    // Add line number if specified
    if (f.exampleLine) {
      cucumberPath += ':' + f.exampleLine;
    } else if (f.lineNumber) {
      cucumberPath += ':' + f.lineNumber;
    }

    return cucumberPath;
  }).join(' ');

  const cucumberArgs = [
    ...gluePaths.flatMap(gluePath => ['--glue', gluePath]),
    '--plugin', 'pretty',
    '--plugin', `json:${resultFile}`,
    ...(customObjectFactory ? ['--object-factory', customObjectFactory] : []),
    cucumberPaths
  ].join(' ');

  // Use VS Code debug API for both run and debug modes
  return await runWithVSCode(workspaceFolder, configName, classPaths, cucumberArgs, projectRoot, resultFile, isDebug, withCoverage);
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
  isDebug: boolean,
  withCoverage: boolean
): Promise<TestExecutionResult> {
  let vmArgs = `-Dfile.encoding=UTF-8`;
  let executionId: string | undefined;
  let coverageExecFile: string | undefined;

  // Setup JaCoCo if coverage is enabled
  if (withCoverage && !isDebug) {
    try {
      const jacocoConfig = vscode.workspace.getConfiguration('cucumberJavaRunner');
      const jacocoVersion = jacocoConfig.get<string>('jacocoVersion', '0.8.11');

      logger.info(`Setting up JaCoCo coverage (version ${jacocoVersion})...`);

      const agentPath = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Setting up code coverage...',
        cancellable: false
      }, async () => await ensureJacocoAgent(projectRoot, jacocoVersion));

      executionId = Date.now().toString();

      // Get append setting from configuration
      const appendCoverage = jacocoConfig.get<boolean>('coverageAppend', false);

      const jacocoResult = buildJacocoVmArgs(projectRoot, agentPath, executionId, appendCoverage);
      vmArgs = `${vmArgs} ${jacocoResult.vmArgs}`;

      coverageExecFile = jacocoResult.execFile;

      logger.info('Coverage collection enabled');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to setup coverage: ${errorMessage}`);
      vscode.window.showWarningMessage(`Failed to setup coverage: ${errorMessage}. Running without coverage.`);
      withCoverage = false;
    }
  } else if (withCoverage && isDebug) {
    logger.warn('Coverage is not supported in debug mode. Running without coverage.');
    vscode.window.showWarningMessage('Coverage is not supported in debug mode.');
    withCoverage = false;
  }

  const config: vscode.DebugConfiguration = {
    type: 'java',
    name: configName,
    request: 'launch',
    mainClass: 'io.cucumber.core.cli.Main',
    projectName: path.basename(projectRoot),
    cwd: '${workspaceFolder}',
    args: cucumberArgs,
    classPaths: classPaths,
    vmArgs: vmArgs,
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
    const disposable = vscode.debug.onDidTerminateDebugSession(async (session) => {
      if (session.name === configName) {
        disposable.dispose();

        // When the Java process terminates, all file buffers are automatically flushed and closed.
        // We just need a brief moment for the filesystem to sync (typically < 100ms).
        // Only wait longer if the file doesn't exist (test failed before creating it).
        await new Promise(resolve => setTimeout(resolve, 200));

        // Check and parse results
        const testPassed = await checkCucumberResults(resultFile);

        // Generate coverage data if coverage was enabled
        let coverageData: Map<string, vscode.FileCoverage> | undefined;
        if (withCoverage && coverageExecFile) {
          // Get append setting to pass to coverage generation
          const config = vscode.workspace.getConfiguration('cucumberJavaRunner');
          const appendCoverage = config.get<boolean>('coverageAppend', false);
          coverageData = await generateCoverageData(projectRoot, coverageExecFile, appendCoverage);
        }

        // Return result with file path (don't clean up yet - testController might need it)
        resolve({
          passed: testPassed,
          resultFile: resultFile,
          coverageData: coverageData
        });
      }
    });

    // Timeout after 10 minutes (longer for debug sessions)
    setTimeout(() => {
      disposable.dispose();
      logger.warn('Test execution timeout after 10 minutes');
      resolve({ passed: false });
    }, 600000);
  });
}

/**
 * Checks Cucumber JSON result file to determine if tests passed
 * @param resultFile Path to the JSON result file
 * @returns true if all tests passed, false otherwise
 */
async function checkCucumberResults(resultFile: string): Promise<boolean> {
  try {
    // Check if file exists and is valid
    const isValid = await waitForValidJsonFile(resultFile);

    if (!isValid) {
      logger.error('Result file is not valid or was not created:', resultFile);
      return false;
    }

    // Read and parse the JSON result file
    const fileContent = fs.readFileSync(resultFile, 'utf-8');
    const results = JSON.parse(fileContent);

    logger.info('Analyzing Cucumber results from:', resultFile);

    // Cucumber JSON format: array of features
    let totalScenarios = 0;
    let passedScenarios = 0;
    let failedScenarios = 0;

    // Validate results is an array
    if (!Array.isArray(results)) {
      logger.error('Results is not an array');
      return false;
    }

    for (const feature of results) {
      // Safely check if elements exists
      if (feature && Array.isArray(feature.elements)) {
        for (const scenario of feature.elements) {
          totalScenarios++;

          // Check if all steps in the scenario passed
          // A scenario only passes if ALL steps have status 'passed'
          let scenarioPassed = true;
          let hasSteps = false;

          if (Array.isArray(scenario.steps) && scenario.steps.length > 0) {
            hasSteps = true;
            for (const step of scenario.steps) {
              // If step has no result or status is not 'passed', scenario failed
              if (!step.result || step.result.status !== 'passed') {
                scenarioPassed = false;
                break;
              }
            }
          } else {
            // Scenario without steps is considered failed
            scenarioPassed = false;
          }

          if (scenarioPassed && hasSteps) {
            passedScenarios++;
          } else {
            failedScenarios++;
          }
        }
      }
    }

    logger.info(`Test Results: ${passedScenarios}/${totalScenarios} scenarios passed`);

    if (failedScenarios > 0) {
      logger.info(`❌ ${failedScenarios} scenario(s) failed`);
      return false;
    } else {
      logger.info(`✅ All scenarios passed`);
      return true;
    }

  } catch (error) {
    logger.error('Error reading Cucumber results:', error);
    return false;
  }
}
