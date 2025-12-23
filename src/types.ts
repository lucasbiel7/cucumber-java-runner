/**
 * Types and interfaces for the Cucumber Java Runner extension
 */

export interface ScenarioInfo {
  name: string;
  lineNumber: number;
  exampleLineNumber?: number;
  examples?: ExampleInfo[];
}

export interface ExampleInfo {
  lineNumber: number;
  data: string;
}

export interface RuleInfo {
  name: string;
  scenarios: ScenarioInfo[];
  lineNumber: number;
}

export interface FeatureInfo {
  name: string;
  scenarios: ScenarioInfo[];
  rules: RuleInfo[];
  filePath: string;
  lineNumber: number;
}
