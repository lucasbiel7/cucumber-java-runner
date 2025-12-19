/**
 * Feature file parser - parses .feature files to extract scenarios and examples
 */
import * as vscode from 'vscode';
import { FeatureInfo, ScenarioInfo } from './types';
import { logger } from './logger';

/**
 * Parser context - maintains state during parsing
 */
class ParserContext {
  featureName = '';
  featureLineNumber = 0;
  scenarios: ScenarioInfo[] = [];
  currentScenario: ScenarioInfo | null = null;
  isScenarioOutline = false;
  inExamplesSection = false;
  examplesHeaderLine = -1;

  reset(): void {
    this.featureName = '';
    this.featureLineNumber = 0;
    this.scenarios = [];
    this.currentScenario = null;
    this.isScenarioOutline = false;
    this.inExamplesSection = false;
    this.examplesHeaderLine = -1;
  }

  startScenario(name: string, lineNumber: number, isOutline: boolean): void {
    this.currentScenario = {
      name: isOutline ? `${name} (Outline)` : name,
      lineNumber,
      examples: []
    };
    this.scenarios.push(this.currentScenario);
    this.isScenarioOutline = isOutline;
    this.inExamplesSection = false;
    this.examplesHeaderLine = -1;
  }

  startExamplesSection(): void {
    this.inExamplesSection = true;
    this.examplesHeaderLine = -1;
  }

  addExampleRow(lineNumber: number, data: string): void {
    if (this.currentScenario && this.currentScenario.examples) {
      this.currentScenario.examples.push({ lineNumber, data });
    }
  }
}

/**
 * Line handler interface
 */
interface LineHandler {
  canHandle(line: string): boolean;
  handle(line: string, lineNumber: number, context: ParserContext): void;
}

/**
 * Handles Feature: lines
 */
class FeatureLineHandler implements LineHandler {
  canHandle(line: string): boolean {
    return line.startsWith('Feature:');
  }

  handle(line: string, lineNumber: number, context: ParserContext): void {
    context.featureName = line.substring(8).trim();
    context.featureLineNumber = lineNumber;
  }
}

/**
 * Handles Scenario: lines
 */
class ScenarioLineHandler implements LineHandler {
  canHandle(line: string): boolean {
    return line.startsWith('Scenario:');
  }

  handle(line: string, lineNumber: number, context: ParserContext): void {
    const scenarioName = line.substring(9).trim();
    context.startScenario(scenarioName, lineNumber, false);
  }
}

/**
 * Handles Scenario Outline: lines
 */
class ScenarioOutlineLineHandler implements LineHandler {
  canHandle(line: string): boolean {
    return line.startsWith('Scenario Outline:');
  }

  handle(line: string, lineNumber: number, context: ParserContext): void {
    const scenarioName = line.substring(17).trim();
    context.startScenario(scenarioName, lineNumber, true);
  }
}

/**
 * Handles Examples: lines
 */
class ExamplesLineHandler implements LineHandler {
  canHandle(line: string): boolean {
    return line.startsWith('Examples:');
  }

  handle(line: string, lineNumber: number, context: ParserContext): void {
    if (context.isScenarioOutline) {
      context.startExamplesSection();
    }
  }
}

/**
 * Handles table lines (|)
 */
class TableLineHandler implements LineHandler {
  canHandle(line: string): boolean {
    return line.startsWith('|');
  }

  handle(line: string, lineNumber: number, context: ParserContext): void {
    // Only process if we're in a Scenario Outline and inside Examples section
    if (!context.currentScenario || !context.isScenarioOutline || !context.inExamplesSection) {
      return;
    }

    // First | line after Examples: is the header
    if (context.examplesHeaderLine === -1) {
      context.examplesHeaderLine = lineNumber - 1; // Store as 0-indexed
    } else {
      // This is a data row (not the header)
      context.addExampleRow(lineNumber, line);
    }
  }
}

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
  const context = new ParserContext();

  const handlers: LineHandler[] = [
    new FeatureLineHandler(),
    new ScenarioOutlineLineHandler(), // Must come before ScenarioLineHandler
    new ScenarioLineHandler(),
    new ExamplesLineHandler(),
    new TableLineHandler()
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1; // 1-indexed

    for (const handler of handlers) {
      if (handler.canHandle(line)) {
        handler.handle(line, lineNumber, context);
        break; // Only one handler per line
      }
    }
  }

  if (!context.featureName) {
    return null;
  }

  return {
    name: context.featureName,
    scenarios: context.scenarios,
    filePath: document.uri.fsPath,
    lineNumber: context.featureLineNumber
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
