/**
 * Result processor for Cucumber test execution
 * Handles parsing and processing of Cucumber JSON results
 */
import * as vscode from 'vscode';
import * as fs from 'fs';

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
function parseResultFile(resultFile: string): ScenarioResult[] {
  const scenarioResults: ScenarioResult[] = [];

  if (!fs.existsSync(resultFile)) {
    console.error(`Result file not found: ${resultFile}`);
    return scenarioResults;
  }

  try {
    const fileContent = fs.readFileSync(resultFile, 'utf-8');
    const results = JSON.parse(fileContent);

    // Cucumber JSON format: array of features
    for (const feature of results) {
      if (feature.elements) {
        for (const scenario of feature.elements) {
          const scenarioName = scenario.name || 'Unnamed scenario';
          const scenarioLine = scenario.line;

          // Check if all steps in the scenario passed
          let scenarioPassed = true;
          let failedStep: FailedStepInfo | undefined;

          if (scenario.steps) {
            for (const step of scenario.steps) {
              if (step.result && step.result.status !== 'passed' && step.result.status !== 'skipped') {
                scenarioPassed = false;
                failedStep = {
                  name: step.name,
                  errorMessage: step.result?.error_message || 'Unknown error',
                  line: step.line
                };
                console.log(`[parseResultFile] Found failed step in scenario "${scenarioName}" (line ${scenarioLine}): ${step.name} at line ${step.line}`);
                break;
              }
            }
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
export function markChildrenFromResults(
  featureItem: vscode.TestItem,
  run: vscode.TestRun,
  resultFile: string
): void {
  try {
    const scenarioResults = parseResultFile(resultFile);
    console.log(`Processing ${scenarioResults.length} scenario results`);

    // Find the corresponding test items and mark them
    console.log(`Feature has ${featureItem.children.size} children`);
    featureItem.children.forEach(child => {
      console.log(`  Child: "${child.label}" - ID: ${child.id}`);
    });

    for (const scenarioResult of scenarioResults) {
      console.log(`\n[markChildren] Processing scenario "${scenarioResult.name}" at line ${scenarioResult.line}: passed=${scenarioResult.passed}`);

      let matched = false;
      featureItem.children.forEach(child => {
        // Check if this child matches the scenario line - must be exact match
        // The ID format is: path:scenario:LINE or path:scenario:LINE:example:EXAMPLELINE
        // We need to ensure we match exactly ":scenario:5" and not ":scenario:57"
        const scenarioIdPattern = `:scenario:${scenarioResult.line}`;
        const childIdParts = child.id.split(':scenario:');
        if (childIdParts.length > 1) {
          // Extract the line number part after :scenario:
          const lineNumberPart = childIdParts[1].split(':')[0];
          const childScenarioLine = parseInt(lineNumberPart, 10);

          if (childScenarioLine === scenarioResult.line) {
            matched = true;
            console.log(`  ✓ Matched with child: "${child.label}" (${child.id})`);

            if (scenarioResult.passed) {
              console.log(`  → Marking as PASSED`);
              run.passed(child);
            } else if (scenarioResult.failedStep) {
              const message = new vscode.TestMessage(
                `${scenarioResult.failedStep.name}\n\n${scenarioResult.failedStep.errorMessage}`
              );
              // Set the location to the failed step line
              if (child.uri) {
                message.location = new vscode.Location(
                  child.uri,
                  new vscode.Position(scenarioResult.failedStep.line - 1, 0)
                );
              }
              console.log(`  → Marking as FAILED with message at step line ${scenarioResult.failedStep.line}`);
              console.log(`     Step: ${scenarioResult.failedStep.name}`);
              run.failed(child, message);
            } else {
              console.log(`  → Marking as FAILED (no failed step info)`);
              run.failed(child, new vscode.TestMessage('Scenario failed'));
            }
          }
        }
      });

      if (!matched) {
        console.warn(`  ✗ No child matched for scenario "${scenarioResult.name}" at line ${scenarioResult.line}`);
      }
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
export function getTestErrorMessages(resultFile: string, uri?: vscode.Uri): vscode.TestMessage[] {
  const messages: vscode.TestMessage[] = [];

  try {
    const scenarioResults = parseResultFile(resultFile);

    // Collect all scenario failures
    for (const scenarioResult of scenarioResults) {
      if (!scenarioResult.passed && scenarioResult.failedStep) {
        const message = new vscode.TestMessage(
          `${scenarioResult.failedStep.name}\n\n${scenarioResult.failedStep.errorMessage}`
        );

        // Set the location to the failed step line
        if (uri) {
          message.location = new vscode.Location(
            uri,
            new vscode.Position(scenarioResult.failedStep.line - 1, 0)
          );
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
