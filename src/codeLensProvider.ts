/**
 * CodeLens provider for Cucumber feature files - provides run/debug buttons inline
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { parseFeatureFile } from './featureParser';
import { ScenarioInfo } from './types';

/**
 * CodeLens provider for Cucumber feature files - with compact buttons
 */
export class CucumberCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  /**
   * Refresh CodeLenses when document changes
   */
  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];

    if (path.extname(document.uri.fsPath) !== '.feature') {
      return codeLenses;
    }

    const featureInfo = parseFeatureFile(document);

    if (!featureInfo) {
      return codeLenses;
    }

    // Add CodeLens for Feature
    this.addFeatureCodeLens(codeLenses, document.uri, featureInfo.lineNumber);

    // Add CodeLens for direct Scenarios
    this.addScenarioLenses(codeLenses, document.uri, featureInfo.scenarios);

    // Add CodeLens for Rules and their Scenarios
    if (featureInfo.rules) {
      for (const rule of featureInfo.rules) {
        this.addRuleCodeLens(codeLenses, document.uri, rule.lineNumber);
        this.addScenarioLenses(codeLenses, document.uri, rule.scenarios);
      }
    }

    return codeLenses;
  }

  private addFeatureCodeLens(codeLenses: vscode.CodeLens[], uri: vscode.Uri, lineNumber: number): void {
    const range = new vscode.Range(lineNumber - 1, 0, lineNumber - 1, 0);
    codeLenses.push(new vscode.CodeLens(range, {
      title: '$(play-circle) ',
      tooltip: 'Click to run the entire feature file',
      command: 'cucumberJavaRunner.runFeatureCodeLens',
      arguments: [uri]
    }));
    codeLenses.push(new vscode.CodeLens(range, {
      title: '$(debug-alt) ',
      tooltip: 'Click to debug the entire feature file',
      command: 'cucumberJavaRunner.debugFeatureCodeLens',
      arguments: [uri]
    }));
    codeLenses.push(new vscode.CodeLens(range, {
      title: '$(graph) ',
      tooltip: 'Click to run the entire feature file with coverage',
      command: 'cucumberJavaRunner.runFeatureWithCoverageCodeLens',
      arguments: [uri]
    }));
  }

  private addRuleCodeLens(codeLenses: vscode.CodeLens[], uri: vscode.Uri, lineNumber: number): void {
    const range = new vscode.Range(lineNumber - 1, 0, lineNumber - 1, 0);
    codeLenses.push(new vscode.CodeLens(range, {
      title: '$(play) ',
      tooltip: 'Click to run this rule',
      command: 'cucumberJavaRunner.runScenarioCodeLens',
      arguments: [uri, lineNumber]
    }));
    codeLenses.push(new vscode.CodeLens(range, {
      title: '$(debug-alt) ',
      tooltip: 'Click to debug this rule',
      command: 'cucumberJavaRunner.debugScenarioCodeLens',
      arguments: [uri, lineNumber]
    }));
    codeLenses.push(new vscode.CodeLens(range, {
      title: '$(graph) ',
      tooltip: 'Click to run this rule with coverage',
      command: 'cucumberJavaRunner.runScenarioWithCoverageCodeLens',
      arguments: [uri, lineNumber]
    }));
  }

  private addScenarioLenses(codeLenses: vscode.CodeLens[], uri: vscode.Uri, scenarios: ScenarioInfo[]): void {
    for (const scenario of scenarios) {
      const range = new vscode.Range(scenario.lineNumber - 1, 0, scenario.lineNumber - 1, 0);

      // Scenario CodeLens
      codeLenses.push(new vscode.CodeLens(range, {
        title: '$(play) ',
        tooltip: 'Click to run this scenario',
        command: 'cucumberJavaRunner.runScenarioCodeLens',
        arguments: [uri, scenario.lineNumber]
      }));
      codeLenses.push(new vscode.CodeLens(range, {
        title: '$(debug-alt) ',
        tooltip: 'Click to debug this scenario',
        command: 'cucumberJavaRunner.debugScenarioCodeLens',
        arguments: [uri, scenario.lineNumber]
      }));
      codeLenses.push(new vscode.CodeLens(range, {
        title: '$(graph) ',
        tooltip: 'Click to run this scenario with coverage',
        command: 'cucumberJavaRunner.runScenarioWithCoverageCodeLens',
        arguments: [uri, scenario.lineNumber]
      }));

      // Examples CodeLens
      if (scenario.examples && scenario.examples.length > 0) {
        for (const example of scenario.examples) {
          const exampleRange = new vscode.Range(example.lineNumber - 1, 0, example.lineNumber - 1, 0);

          codeLenses.push(new vscode.CodeLens(exampleRange, {
            title: '$(play) ',
            tooltip: 'Click to run this example row',
            command: 'cucumberJavaRunner.runExampleCodeLens',
            arguments: [uri, scenario.lineNumber, example.lineNumber]
          }));
          codeLenses.push(new vscode.CodeLens(exampleRange, {
            title: '$(debug-alt) ',
            tooltip: 'Click to debug this example row',
            command: 'cucumberJavaRunner.debugExampleCodeLens',
            arguments: [uri, scenario.lineNumber, example.lineNumber]
          }));
          codeLenses.push(new vscode.CodeLens(exampleRange, {
            title: '$(graph) ',
            tooltip: 'Click to run this example row with coverage',
            command: 'cucumberJavaRunner.runExampleWithCoverageCodeLens',
            arguments: [uri, scenario.lineNumber, example.lineNumber]
          }));
        }
      }
    }
  }
}
