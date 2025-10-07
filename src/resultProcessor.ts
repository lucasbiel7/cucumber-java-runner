/**
 * Result processor for Cucumber test execution
 * Handles parsing and processing of Cucumber JSON results
 */
import * as vscode from 'vscode';
import * as fs from 'fs';

/**
 * Waits for a file to be completely written and contain valid JSON
 * @param filePath Path to the file
 * @param maxAttempts Maximum number of attempts (default: 20)
 * @param delayMs Delay between attempts in milliseconds (default: 500)
 * @returns true if file is valid, false otherwise
 */
async function waitForValidJsonFile(filePath: string, maxAttempts = 20, delayMs = 500): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`Attempt ${attempt}/${maxAttempts}: File does not exist yet: ${filePath}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      // Check if file has content
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        console.log(`Attempt ${attempt}/${maxAttempts}: File is empty: ${filePath}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      // Try to read and parse JSON
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      // Check if content is not just whitespace
      if (fileContent.trim().length === 0) {
        console.log(`Attempt ${attempt}/${maxAttempts}: File contains only whitespace`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      // Try to parse JSON
      const jsonData = JSON.parse(fileContent);

      // Validate that it's an array (Cucumber JSON format)
      if (!Array.isArray(jsonData)) {
        console.log(`Attempt ${attempt}/${maxAttempts}: JSON is not an array`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      // If we got here, file is valid
      console.log(`File is valid JSON after ${attempt} attempt(s)`);
      return true;

    } catch (error) {
      // JSON parse error or read error - file might still be being written
      console.log(`Attempt ${attempt}/${maxAttempts}: Error reading/parsing file - ${error instanceof Error ? error.message : 'Unknown error'}`);

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error(`Failed to get valid JSON file after ${maxAttempts} attempts`);
  return false;
}

/**
 * Represents a failed step with details
 */
interface FailedStepInfo {
  name: string;
  errorMessage: string;
  line: number;
}

/**
 * Represents a scenario result from Cucumber JSON
 */
interface ScenarioResult {
  name: string;
  line: number;
  passed: boolean;
  failedStep?: FailedStepInfo;
}

/**
 * Parses Cucumber JSON result file and extracts scenario results
 * @param resultFile Path to the JSON result file
 * @returns Array of scenario results
 */
async function parseResultFile(resultFile: string): Promise<ScenarioResult[]> {
  const scenarioResults: ScenarioResult[] = [];

  // Wait for the file to be completely written with valid JSON
  const isValid = await waitForValidJsonFile(resultFile);

  if (!isValid) {
    console.error(`Result file is not valid or was not created: ${resultFile}`);
    return scenarioResults;
  }

  try {
    const fileContent = fs.readFileSync(resultFile, 'utf-8');
    const results = JSON.parse(fileContent);

    // Validate results is an array
    if (!Array.isArray(results)) {
      console.error('Results is not an array');
      return scenarioResults;
    }

    // Cucumber JSON format: array of features
    for (const feature of results) {
      // Safely check if elements exists and is an array
      if (feature && Array.isArray(feature.elements)) {
        for (const scenario of feature.elements) {
          const scenarioName = scenario?.name || 'Unnamed scenario';
          const scenarioLine = scenario?.line;

          // Check if all steps in the scenario passed
          // A scenario only passes if ALL steps have status 'passed'
          let scenarioPassed = true;
          let failedStep: FailedStepInfo | undefined;

          // First, check for errors in before/after hooks
          if (Array.isArray(scenario.before)) {
            for (const hook of scenario.before) {
              if (hook.result && hook.result.status !== 'passed') {
                scenarioPassed = false;
                failedStep = {
                  name: `Before Hook: ${hook.match?.location || 'Unknown location'}`,
                  errorMessage: hook.result.error_message || `Hook ${hook.result.status}`,
                  line: scenarioLine || 0
                };
                break;
              }
            }
          }

          if (Array.isArray(scenario.after) && !failedStep) {
            for (const hook of scenario.after) {
              if (hook.result && hook.result.status !== 'passed') {
                scenarioPassed = false;
                failedStep = {
                  name: `After Hook: ${hook.match?.location || 'Unknown location'}`,
                  errorMessage: hook.result.error_message || `Hook ${hook.result.status}`,
                  line: scenarioLine || 0
                };
                break;
              }
            }
          }

          // Then check steps
          if (Array.isArray(scenario.steps) && scenario.steps.length > 0) {
            const firstStep = scenario.steps[0];
            const allStepsSkipped = scenario.steps.every((step: {result?: {status?: string}}) => step?.result?.status === 'skipped');

            // If first step is skipped and we don't have a hook error yet,
            // it means there was an error before the scenario started
            if (firstStep?.result?.status === 'skipped' && !failedStep) {
              scenarioPassed = false;
              failedStep = {
                name: `Scenario Setup Error`,
                errorMessage: 'All steps were skipped. There may be an error in @Before hook, step definitions, or scenario setup.',
                line: scenarioLine || 0
              };
            } else if (!allStepsSkipped) {
              // Check each step for failures
              for (const step of scenario.steps) {
                // If step has no result or status is not 'passed', scenario failed
                if (!step?.result || step.result.status !== 'passed') {
                  scenarioPassed = false;

                  // Only capture if we don't already have a failure from hooks
                  if (!failedStep) {
                    const status = step.result?.status || 'no result';

                    // If step is skipped, look for the actual failed step
                    if (status === 'skipped') {
                      continue; // Keep looking for the actual failure
                    }

                    const errorMsg = step.result?.error_message || `Step ${status}`;

                    failedStep = {
                      name: step.name || 'Unknown step',
                      errorMessage: errorMsg,
                      line: step.line || 0
                    };

                    // If this step has an error message, it's the real failure
                    if (step.result?.error_message) {
                      break;
                    }
                  }
                }
              }
            }
          } else {
            // Scenario without steps is considered failed
            scenarioPassed = false;
            failedStep ??= {
              name: 'Empty Scenario',
              errorMessage: 'Scenario has no steps',
              line: scenarioLine || 0
            };
          }

          scenarioResults.push({
            name: scenarioName,
            line: scenarioLine,
            passed: scenarioPassed,
            failedStep: failedStep
          });
        }
      }
    }
  } catch (error) {
    console.error('Error parsing result file:', error);
  }

  return scenarioResults;
}

/**
 * Marks child test items (scenarios/examples) based on Cucumber JSON results
 * @param featureItem The parent feature test item
 * @param run The test run instance
 * @param resultFile Path to the JSON result file
 */
export async function markChildrenFromResults(
  featureItem: vscode.TestItem,
  run: vscode.TestRun,
  resultFile: string
): Promise<void> {
  try {
    const scenarioResults = await parseResultFile(resultFile);

    // Find the corresponding test items and mark them
    for (const scenarioResult of scenarioResults) {
      featureItem.children.forEach(child => {
        // Check if this child matches the scenario line - must be exact match
        // The ID format is: path:scenario:LINE or path:scenario:LINE:example:EXAMPLELINE
        // We need to ensure we match exactly ":scenario:5" and not ":scenario:57"
        const childIdParts = child.id.split(':scenario:');
        if (childIdParts.length > 1) {
          // Extract the line number part after :scenario:
          const lineNumberPart = childIdParts[1].split(':')[0];
          const childScenarioLine = parseInt(lineNumberPart, 10);

          if (childScenarioLine === scenarioResult.line) {
            if (scenarioResult.passed) {
              run.passed(child);
            } else if (scenarioResult.failedStep) {
              const isScenarioLevelError =
                scenarioResult.failedStep.name.includes('Hook') ||
                scenarioResult.failedStep.name.includes('Scenario Setup Error') ||
                scenarioResult.failedStep.name.includes('Empty Scenario');

              const message = new vscode.TestMessage(
                `${scenarioResult.failedStep.name}\n\n${scenarioResult.failedStep.errorMessage}`
              );

              // Set the location based on error type
              if (child.uri) {
                if (isScenarioLevelError) {
                  // For scenario-level errors, point to the scenario line
                  message.location = new vscode.Location(
                    child.uri,
                    new vscode.Position(scenarioResult.line - 1, 0)
                  );
                } else {
                  // For step-level errors, point to the failed step line
                  message.location = new vscode.Location(
                    child.uri,
                    new vscode.Position(scenarioResult.failedStep.line - 1, 0)
                  );
                }
              }
              run.failed(child, message);
            } else {
              run.failed(child, new vscode.TestMessage('Scenario failed'));
            }
          }
        }
      });
    }
  } catch (error) {
    console.error('Error marking children from results:', error);
  }
}

/**
 * Gets detailed error messages from result file for a single test
 * @param resultFile Path to the JSON result file
 * @param uri URI of the test file for location information
 * @returns Array of TestMessages with error details and locations if test failed, empty array if passed
 */
export async function getTestErrorMessages(resultFile: string, uri?: vscode.Uri): Promise<vscode.TestMessage[]> {
  const messages: vscode.TestMessage[] = [];

  try {
    const scenarioResults = await parseResultFile(resultFile);

    // Collect all scenario failures
    for (const scenarioResult of scenarioResults) {
      if (!scenarioResult.passed && scenarioResult.failedStep) {
        const isScenarioLevelError =
          scenarioResult.failedStep.name.includes('Hook') ||
          scenarioResult.failedStep.name.includes('Scenario Setup Error') ||
          scenarioResult.failedStep.name.includes('Empty Scenario');

        const message = new vscode.TestMessage(
          `${scenarioResult.failedStep.name}\n\n${scenarioResult.failedStep.errorMessage}`
        );

        // Set the location based on error type
        if (uri) {
          if (isScenarioLevelError) {
            // For scenario-level errors, point to the scenario line
            message.location = new vscode.Location(
              uri,
              new vscode.Position(scenarioResult.line - 1, 0)
            );
          } else {
            // For step-level errors, point to the failed step line
            message.location = new vscode.Location(
              uri,
              new vscode.Position(scenarioResult.failedStep.line - 1, 0)
            );
          }
        }

        messages.push(message);
      }
    }
  } catch (error) {
    console.error('Error getting test error messages:', error);
  }

  return messages;
}

/**
 * Cleans up the result file after processing
 * @param resultFile Path to the JSON result file
 */
export function cleanupResultFile(resultFile: string): void {
  if (fs.existsSync(resultFile)) {
    try {
      fs.unlinkSync(resultFile);
    } catch (error) {
      console.error('Error cleaning up result file:', error);
    }
  }
}
