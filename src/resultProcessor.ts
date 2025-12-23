/**
 * Result processor for Cucumber test execution
 * Handles parsing and processing of Cucumber JSON results
 */
import * as vscode from 'vscode';
import * as fs from 'fs';
import { logger } from './logger';
import { waitForValidJsonFile } from './resultFileUtils';

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
 * Parses Cucumber JSON result file and extracts scenario results from ALL features
 * @param resultFile Path to the JSON result file
 * @returns Array of scenario results from all features
 * @deprecated Use parseResultFileForFeature instead to avoid cross-feature matching issues
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function parseResultFile(resultFile: string): Promise<ScenarioResult[]> {
  const scenarioResults: ScenarioResult[] = [];

  // Wait for the file to be completely written with valid JSON
  const isValid = await waitForValidJsonFile(resultFile);

  if (!isValid) {
    logger.error('Result file is not valid or was not created:', resultFile);
    return scenarioResults;
  }

  try {
    const fileContent = fs.readFileSync(resultFile, 'utf-8');
    const results = JSON.parse(fileContent);

    // Validate results is an array
    if (!Array.isArray(results)) {
      logger.error('Results is not an array');
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
    logger.error('Error parsing result file:', error);
  }

  return scenarioResults;
}

/**
 * Normalizes a path for comparison by:
 * - Removing file:// or file: prefixes
 * - Converting backslashes to forward slashes
 * - Removing leading './' or '/'
 * - Converting to lowercase for case-insensitive comparison
 */
function normalizePath(filePath: string): string {
  return filePath
    .replace(/^file:\/\//, '')  // Remove file:// prefix
    .replace(/^file:/, '')      // Remove file: prefix
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\//, '')
    .toLowerCase();
}

/**
 * Checks if two file paths refer to the same feature file
 * Uses a more precise matching strategy to avoid false positives
 */
function isSameFeaturePath(fullPath: string, relativePath: string): boolean {
  const normalizedFull = normalizePath(fullPath);
  const normalizedRelative = normalizePath(relativePath);

  // Exact match
  if (normalizedFull === normalizedRelative) {
    return true;
  }

  // Full path ends with relative path (with proper boundary)
  // e.g., "/project/src/test/resources/features/login.feature" matches "features/login.feature"
  if (normalizedFull.endsWith('/' + normalizedRelative)) {
    return true;
  }

  // Full path ends with the exact filename and the relative path matches the end
  const fullPathParts = normalizedFull.split('/');
  const relativePathParts = normalizedRelative.split('/');

  // Must have at least the filename matching
  if (fullPathParts[fullPathParts.length - 1] !== relativePathParts[relativePathParts.length - 1]) {
    return false;
  }

  // Check if the end of full path matches the relative path parts
  if (fullPathParts.length >= relativePathParts.length) {
    const fullEnd = fullPathParts.slice(-relativePathParts.length).join('/');
    return fullEnd === normalizedRelative;
  }

  return false;
}

/**
 * Parses result file and returns scenarios for a specific feature
 * @param resultFile Path to the JSON result file
 * @param featureUri URI of the feature file
 * @returns Array of scenario results for this feature only
 */
async function parseResultFileForFeature(resultFile: string, featureUri: vscode.Uri): Promise<ScenarioResult[]> {
  const scenarioResults: ScenarioResult[] = [];

  // Wait for the file to be completely written with valid JSON
  const isValid = await waitForValidJsonFile(resultFile);

  if (!isValid) {
    logger.error('Result file is not valid or was not created:', resultFile);
    return scenarioResults;
  }

  try {
    const fileContent = fs.readFileSync(resultFile, 'utf-8');
    const results = JSON.parse(fileContent);

    // Validate results is an array
    if (!Array.isArray(results)) {
      logger.error('Results is not an array');
      return scenarioResults;
    }

    // Get the feature file path from URI
    const featureFilePath = featureUri.fsPath;

    logger.debug('Looking for feature:', featureFilePath);
    logger.debug(`Total features in results: ${results.length}`);

    // Cucumber JSON format: array of features
    for (const feature of results) {
      // The feature.uri or feature.id contains the path (could be relative or absolute)
      const featurePath = feature.uri || feature.id || '';

      logger.debug('Comparing with feature path from JSON:', featurePath);

      // Use improved path matching
      const isMatch = isSameFeaturePath(featureFilePath, featurePath);

      logger.debug(`Match result: ${isMatch}`);

      if (isMatch && feature && Array.isArray(feature.elements)) {
        logger.debug(`Found matching feature with ${feature.elements.length} elements (scenarios/backgrounds)`);
        // Process scenarios for THIS feature only
        for (const scenario of feature.elements) {
          // Skip background elements - they are not test scenarios
          if (scenario.type === 'background') {
            logger.debug('Skipping background element');
            continue;
          }

          const scenarioName = scenario?.name || 'Unnamed scenario';
          const scenarioLine = scenario?.line;

          logger.debug(`Processing scenario: "${scenarioName}" at line ${scenarioLine}`);

          // Check if all steps in the scenario passed
          let scenarioPassed = true;
          let failedStep: FailedStepInfo | undefined;

          // First check Before hooks - these failures should appear at scenario line
          if (Array.isArray(scenario.before)) {
            for (const hook of scenario.before) {
              if (hook.result && hook.result.status !== 'passed') {
                scenarioPassed = false;
                const hookLocation = hook.match?.location || 'Unknown location';
                const errorMsg = hook.result.error_message || `Hook failed with status: ${hook.result.status}`;

                failedStep = {
                  name: `Before Hook Failed`,
                  errorMessage: `Hook Location: ${hookLocation}\n\n${errorMsg}`,
                  line: scenarioLine || 0
                };

                logger.debug(`Before hook failed at scenario line ${scenarioLine}`);
                break;
              }
            }
          }

          // Then check steps - only if no hook failure
          if (!failedStep && Array.isArray(scenario.steps) && scenario.steps.length > 0) {
            for (const step of scenario.steps) {
              const stepStatus = step?.result?.status || 'no result';

              logger.debug(`Step "${step.name}" at line ${step.line}: ${stepStatus}`);

              // Skip passed steps
              if (stepStatus === 'passed') {
                continue;
              }

              // Mark scenario as failed
              scenarioPassed = false;

              // If step is skipped, continue looking for the actual failure
              if (stepStatus === 'skipped') {
                continue;
              }

              // Found a failed/undefined/pending step
              const errorMsg = step.result?.error_message || `Step ${stepStatus}`;
              const stepKeyword = step.keyword || '';
              const stepName = step.name || 'Unknown step';

              failedStep = {
                name: `${stepKeyword.trim()} ${stepName}`,
                errorMessage: errorMsg,
                line: step.line || scenarioLine || 0
              };

              logger.debug(`Failed step found at line ${step.line}: ${failedStep.name}`);

              // Stop at the first real failure (not skipped)
              break;
            }

            // If all steps were skipped and no failed step found, check if there's an error
            if (!failedStep) {
              const allStepsSkipped = scenario.steps.every((step: {result?: {status?: string}}) =>
                step?.result?.status === 'skipped'
              );

              if (allStepsSkipped) {
                scenarioPassed = false;
                failedStep = {
                  name: `Scenario Setup Error`,
                  errorMessage: 'All steps were skipped. Check for errors in @Before hooks or step definitions.',
                  line: scenarioLine || 0
                };

                logger.debug(`All steps skipped - setup error at scenario line ${scenarioLine}`);
              }
            }
          } else if (!failedStep && (!scenario.steps || scenario.steps.length === 0)) {
            // Scenario has no steps
            scenarioPassed = false;
            failedStep = {
              name: 'Empty Scenario',
              errorMessage: 'Scenario has no steps',
              line: scenarioLine || 0
            };

            logger.debug(`Empty scenario at line ${scenarioLine}`);
          }

          // Check After hooks - only if we didn't already fail
          // After hooks should still be reported but the original failure takes precedence
          if (Array.isArray(scenario.after)) {
            for (const hook of scenario.after) {
              if (hook.result && hook.result.status !== 'passed') {
                scenarioPassed = false;

                // Only set as failed step if we don't have another failure
                if (!failedStep) {
                  const hookLocation = hook.match?.location || 'Unknown location';
                  const errorMsg = hook.result.error_message || `Hook failed with status: ${hook.result.status}`;

                  failedStep = {
                    name: `After Hook Failed`,
                    errorMessage: `Hook Location: ${hookLocation}\n\n${errorMsg}`,
                    line: scenarioLine || 0
                  };

                  logger.debug(`After hook failed at scenario line ${scenarioLine}`);
                }
                break;
              }
            }
          }

          const result = {
            name: scenarioName,
            line: scenarioLine,
            passed: scenarioPassed,
            failedStep: failedStep
          };

          scenarioResults.push(result);

          logger.debug(`Scenario result: "${scenarioName}" at line ${scenarioLine}: ${scenarioPassed ? 'PASSED' : 'FAILED'}`);
          if (!scenarioPassed && failedStep) {
            logger.debug(`Failed step: "${failedStep.name}" at line ${failedStep.line}`);
            logger.debug(`Error: ${failedStep.errorMessage.substring(0, 100)}...`);
          }
          logger.debug(`Added to results array. Total so far: ${scenarioResults.length}`);
        }

        logger.debug(`Total scenarios found for this feature: ${scenarioResults.length}`);
        logger.debug(`Scenario results summary:`);
        scenarioResults.forEach((sr, idx) => {
          logger.debug(`${idx + 1}. "${sr.name}" at line ${sr.line} - ${sr.passed ? 'PASSED' : 'FAILED'}`);
        });

        // Found the feature, no need to continue
        break;
      }
    }

    if (scenarioResults.length === 0) {
      logger.debug(`WARNING: No scenarios found for feature ${featureFilePath}`);
      logger.debug(`Available feature URIs in results:`);
      for (const feature of results) {
        logger.debug(`- ${feature.uri || feature.id || 'unknown'}`);
      }
    }
  } catch (error) {
    logger.error('Error parsing result file for feature:', error);
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
    if (!featureItem.uri) {
      logger.error('Feature item has no URI');
      return;
    }

    logger.debug(`========================================`);
    logger.debug(`markChildrenFromResults for feature: ${featureItem.uri.fsPath}`);
    logger.debug(`Feature has ${featureItem.children.size} children`);
    logger.debug(`Children IDs:`);
    featureItem.children.forEach(child => {
      logger.debug(`- ${child.id} (label: "${child.label}")`);
    });

    // Get scenarios for THIS feature only
    const scenarioResults = await parseResultFileForFeature(resultFile, featureItem.uri);

    logger.debug(`Found ${scenarioResults.length} scenario results for this feature`);
    logger.debug(`Result lines: ${scenarioResults.map(r => r.line).join(', ')}`);

    // Find the corresponding test items and mark them
    const updateItemsRecursively = (items: vscode.TestItemCollection) => {
      items.forEach(child => {
        // Check if this child matches a scenario (Scenario or Example)
        // The ID format is: path:scenario:LINE or path:scenario:LINE:example:EXAMPLELINE
        const childIdParts = child.id.split(':scenario:');
        if (childIdParts.length > 1) {
          // Extract the line number part after :scenario:
          const lineNumberPart = childIdParts[1].split(':')[0];
          const childScenarioLine = parseInt(lineNumberPart, 10);

          logger.debug(`Checking child "${child.label}" with scenario line ${childScenarioLine}`);

          // Find matching result
          const scenarioResult = scenarioResults.find(r => r.line === childScenarioLine);

          if (scenarioResult) {
            logger.debug(`MATCHED! Marking as ${scenarioResult.passed ? 'PASSED' : 'FAILED'}`);

            if (scenarioResult.passed) {
              run.passed(child);
            } else if (scenarioResult.failedStep) {
              const isScenarioLevelError =
                scenarioResult.failedStep.name.includes('Hook Failed') ||
                scenarioResult.failedStep.name.includes('Scenario Setup Error') ||
                scenarioResult.failedStep.name.includes('Empty Scenario');

              // Create error message with clear formatting
              const message = new vscode.TestMessage(
                `${scenarioResult.failedStep.name}\n\n${scenarioResult.failedStep.errorMessage}`
              );

              // Set the location based on error type
              if (child.uri) {
                if (isScenarioLevelError) {
                  // For scenario-level errors (hooks, setup), point to the scenario line
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
              // Scenario failed but no detailed error info
              run.failed(child, new vscode.TestMessage('Scenario failed'));
            }
          }
        }

        // Recursively check children (e.g. Scenarios inside Rules, or Examples inside Scenarios)
        if (child.children.size > 0) {
          updateItemsRecursively(child.children);
        }
      });
    };

    updateItemsRecursively(featureItem.children);

  } catch (error) {
    logger.error('Error marking children from results:', error);
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


  if (!uri) {
    return messages;
  }

  try {
    // Get scenarios for THIS feature only
    const scenarioResults = await parseResultFileForFeature(resultFile, uri);

    logger.debug(`getTestErrorMessages for ${uri.fsPath}: found ${scenarioResults.length} scenarios`);

    // Collect all scenario failures from this feature
    for (const scenarioResult of scenarioResults) {
      if (!scenarioResult.passed && scenarioResult.failedStep) {
        const isScenarioLevelError =
          scenarioResult.failedStep.name.includes('Hook Failed') ||
          scenarioResult.failedStep.name.includes('Scenario Setup Error') ||
          scenarioResult.failedStep.name.includes('Empty Scenario');

        // Create formatted error message
        const message = new vscode.TestMessage(
          `Scenario: ${scenarioResult.name} (line ${scenarioResult.line})\n\n${scenarioResult.failedStep.name}\n\n${scenarioResult.failedStep.errorMessage}`
        );

        // Set the location based on error type
        if (uri) {
          if (isScenarioLevelError) {
            // For scenario-level errors (hooks, setup), point to the scenario line
            message.location = new vscode.Location(
              uri,
              new vscode.Position(scenarioResult.line - 1, 0)
            );
            logger.debug(`Error at scenario line ${scenarioResult.line}: ${scenarioResult.failedStep.name}`);
          } else {
            // For step-level errors, point to the failed step line
            message.location = new vscode.Location(
              uri,
              new vscode.Position(scenarioResult.failedStep.line - 1, 0)
            );
            logger.debug(`Error at step line ${scenarioResult.failedStep.line}: ${scenarioResult.failedStep.name}`);
          }
        }

        messages.push(message);
      }
    }

    logger.debug(`Total error messages: ${messages.length}`);
  } catch (error) {
    logger.error('Error getting test error messages:', error);
  }

  return messages;
}

/**
 * Checks if a specific feature file has any failures
 * @param resultFile Path to the JSON result file
 * @param featureUri URI of the feature file to check
 * @returns true if the feature has failures, false if all passed
 */
export async function hasFeatureFailures(resultFile: string, featureUri: vscode.Uri): Promise<boolean> {

  // Wait for the file to be completely written with valid JSON
  const isValid = await waitForValidJsonFile(resultFile);

  if (!isValid) {
    logger.error('Result file is not valid or was not created:', resultFile);
    return true;
  }

  try {
    const fileContent = fs.readFileSync(resultFile, 'utf-8');
    const results = JSON.parse(fileContent);

    // Validate results is an array
    if (!Array.isArray(results)) {
      logger.error('Results is not an array');
      return true;
    }

    // Get the feature file path from URI
    const featureFilePath = featureUri.fsPath;

    logger.debug('hasFeatureFailures checking:', featureFilePath);

    // Cucumber JSON format: array of features
    for (const feature of results) {
      // The feature.uri or feature.id contains the path
      const featurePath = feature.uri || feature.id || '';

      // Use improved path matching
      const isMatch = isSameFeaturePath(featureFilePath, featurePath);

      logger.debug(`Comparing with: ${featurePath} -> ${isMatch ? 'MATCH' : 'no match'}`);

      if (isMatch) {
        logger.debug('MATCHED! Checking scenarios...');
        // Check if any scenario in this feature failed
        if (feature && Array.isArray(feature.elements)) {
          for (const scenario of feature.elements) {
            // Skip background elements - they are not test scenarios
            if (scenario.type === 'background') {
              continue;
            }

            // Check if all steps passed
            let scenarioPassed = true;

            // Check hooks
            if (Array.isArray(scenario.before)) {
              for (const hook of scenario.before) {
                if (hook.result && hook.result.status !== 'passed') {
                  scenarioPassed = false;
                  logger.debug(`Before hook failed in scenario at line ${scenario.line}`);
                  break;
                }
              }
            }

            if (scenarioPassed && Array.isArray(scenario.after)) {
              for (const hook of scenario.after) {
                if (hook.result && hook.result.status !== 'passed') {
                  scenarioPassed = false;
                  logger.debug(`After hook failed in scenario at line ${scenario.line}`);
                  break;
                }
              }
            }

            // Check steps
            if (scenarioPassed && Array.isArray(scenario.steps) && scenario.steps.length > 0) {
              for (const step of scenario.steps) {
                if (!step?.result || step.result.status !== 'passed') {
                  scenarioPassed = false;
                  logger.debug(`Step failed: "${step.name}" at line ${step.line} with status ${step.result?.status}`);
                  break;
                }
              }
            }

            // If any scenario failed, the feature failed
            if (!scenarioPassed) {
              logger.debug('Feature has failures!');
              return true;
            }
          }
        }

        // All scenarios in this feature passed
        logger.debug('All scenarios passed in this feature');
        return false;
      }
    }

    // Feature not found in results
    logger.debug('WARNING: Feature not found in results, assuming passed');
    return false;
  } catch (error) {
    logger.error('Error checking feature failures:', error);
    return true; // Assume failure on error
  }
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
      logger.error('Error cleaning up result file:', error);
    }
  }
}
