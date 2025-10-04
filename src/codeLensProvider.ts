/**
 * CodeLens provider for Cucumber feature files - provides run/debug buttons inline
 */
import * as vscode from 'vscode';
import * as path from 'path';

/**
 * CodeLens provider for Cucumber feature files - with compact buttons
 */
export class CucumberCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
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
          command: 'cucumberJavaRunner.runFeatureCodeLens',
          arguments: [document.uri]
        }));
        codeLenses.push(new vscode.CodeLens(range, {
          title: '$(debug-alt) ',
          tooltip: 'Click to debug the entire feature file',
          command: 'cucumberJavaRunner.debugFeatureCodeLens',
          arguments: [document.uri]
        }));
      } else if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
        // Position the button at the very beginning of the line
        const range = new vscode.Range(i, 0, i, 0);
        codeLenses.push(new vscode.CodeLens(range, {
          title: '$(play) ',
          tooltip: 'Click to run this scenario',
          command: 'cucumberJavaRunner.runScenarioCodeLens',
          arguments: [document.uri, i + 1] // 1-indexed line number
        }));
        codeLenses.push(new vscode.CodeLens(range, {
          title: '$(debug-alt) ',
          tooltip: 'Click to debug this scenario',
          command: 'cucumberJavaRunner.debugScenarioCodeLens',
          arguments: [document.uri, i + 1] // 1-indexed line number
        }));
      } else if (line.startsWith('|') && i > 0) {
        // Check if this is an example row (not header)
        const exampleInfo = this.findExampleRowInfo(lines, i);
        if (exampleInfo) {
          const range = new vscode.Range(i, 0, i, 0);
          codeLenses.push(new vscode.CodeLens(range, {
            title: '$(play) ',
            tooltip: 'Click to run this example row',
            command: 'cucumberJavaRunner.runExampleCodeLens',
            arguments: [document.uri, exampleInfo.scenarioLine, i + 1] // scenario line and example line
          }));
          codeLenses.push(new vscode.CodeLens(range, {
            title: '$(debug-alt) ',
            tooltip: 'Click to debug this example row',
            command: 'cucumberJavaRunner.debugExampleCodeLens',
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
