/**
 * Types and interfaces for the Cucumber Java Easy Runner extension
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

export interface FeatureInfo {
  name: string;
  scenarios: ScenarioInfo[];
  filePath: string;
  lineNumber: number;
}
