/**
 * Feature file parser - parses .feature files to extract scenarios and examples
 */
import * as vscode from 'vscode';
import { FeatureInfo, ScenarioInfo } from './types';
import { logger } from './logger';

/**
 * Finds example row info
 */
export function findExampleRowInfo(lines: string[], currentLine: number): { scenarioLine: number } | null {
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

/**
 * Parse a feature file and extract feature info
 */
export function parseFeatureFile(document: vscode.TextDocument): FeatureInfo | null {
  const text = document.getText();
  const lines = text.split('\n');

  let featureName = '';
  let featureLineNumber = 0;
  const scenarios: ScenarioInfo[] = [];
  let currentScenario: ScenarioInfo | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('Feature:')) {
      featureName = line.substring(8).trim();
      featureLineNumber = i + 1;
    } else if (line.startsWith('Scenario:')) {
      const scenarioName = line.substring(9).trim();
      currentScenario = {
        name: scenarioName,
        lineNumber: i + 1,
        examples: []
      };
      scenarios.push(currentScenario);
    } else if (line.startsWith('Scenario Outline:')) {
      const scenarioName = line.substring(17).trim();
      currentScenario = {
        name: `${scenarioName} (Outline)`,
        lineNumber: i + 1,
        examples: []
      };
      scenarios.push(currentScenario);
    } else if (line.startsWith('|') && currentScenario && i > 0) {
      // Check if this is an example row (not header)
      const exampleInfo = findExampleRowInfo(lines, i);
      if (exampleInfo && currentScenario.examples) {
        currentScenario.examples.push({
          lineNumber: i + 1,
          data: line
        });
      }
    }
  }

  if (!featureName) {
    return null;
  }

  return {
    name: featureName,
    scenarios,
    filePath: document.uri.fsPath,
    lineNumber: featureLineNumber
  };
}

/**
 * Finds the scenario at the given line number
 */
export function findScenarioAtLine(document: vscode.TextDocument, line: number): ScenarioInfo | null {
  const text = document.getText();
  const lines = text.split('\n');

  // Find the closest scenario heading from the line number backwards
  for (let i = line; i >= 0; i--) {
    const currentLine = lines[i].trim();
    if (currentLine.startsWith('Scenario:') || currentLine.startsWith('Scenario Outline:')) {
      const name = currentLine.substring(currentLine.indexOf(':') + 1).trim();
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
export function findExampleAtLine(document: vscode.TextDocument, line: number): ScenarioInfo | null {
  try {
    const text = document.getText();
    const lines = text.split('\n');

    // Check the line content for debugging
    const currentLineText = lines[line].trim();
    logger.debug(`Current line (${line}): "${currentLineText}"`);

    // Check if the line starts with |
    if (!currentLineText.startsWith('|')) {
      logger.debug('Line does not start with |');
      return null;
    }

    // Find the Examples block
    let examplesLine = -1;
    let scenarioOutlineLine = -1;
    let headerLine = -1;

    // First go backwards to find the Examples heading
    for (let i = line; i >= 0; i--) {
      const lineText = lines[i].trim();
      logger.trace(`Backward line (${i}): "${lineText}"`);

      if (lineText.startsWith('Examples:')) {
        examplesLine = i;
        logger.debug(`Examples heading found, line: ${examplesLine}`);
        break;
      }
    }

    if (examplesLine === -1) {
      logger.debug('Examples heading not found');
      return null;
    }

    // The first line starting with | after the Examples heading is the header row
    for (let i = examplesLine + 1; i < lines.length; i++) {
      const lineText = lines[i].trim();
      if (lineText.startsWith('|')) {
        headerLine = i;
        logger.debug(`Header row found, line: ${headerLine}`);
        break;
      }
    }

    if (headerLine === -1 || line <= headerLine) {
      logger.debug(`Valid header row not found or current line (${line}) is before header line (${headerLine})`);
      return null;
    }

    // Go backwards from Examples heading to find the Scenario Outline
    for (let i = examplesLine; i >= 0; i--) {
      const lineText = lines[i].trim();
      if (lineText.startsWith('Scenario Outline:')) {
        scenarioOutlineLine = i + 1; // 1-indexed
        logger.debug(`Scenario Outline found, line: ${scenarioOutlineLine}`);
        break;
      }
    }

    if (scenarioOutlineLine === -1) {
      logger.debug('Scenario Outline not found');
      return null;
    }

    // Set the current line directly as the line to run
    // Note: Cucumber's expected format: feature:scenario_line:example_line
    return {
      name: 'example',
      lineNumber: scenarioOutlineLine,
      exampleLineNumber: line + 1 // 1-indexed
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error(`Error in findExampleAtLine: ${errorMessage}`);
    return null;
  }
}
