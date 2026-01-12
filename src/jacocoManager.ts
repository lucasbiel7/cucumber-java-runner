/**
 * JaCoCo Manager - handles downloading and configuring JaCoCo agent for code coverage
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { logger } from './logger';
import * as xml2js from 'xml2js';
import { spawn } from 'child_process';

/**
 * Downloads JaCoCo agent JAR if not already present
 * @param projectRoot - Root directory of the project
 * @param version - JaCoCo version to download
 * @returns Path to the JaCoCo agent JAR file
 */
export async function ensureJacocoAgent(projectRoot: string, version: string): Promise<string> {
  const jacocoDir = path.join(projectRoot, 'target', 'jacoco');
  const agentPath = path.join(jacocoDir, `jacocoagent-${version}.jar`);

  // Check if agent already exists
  if (fs.existsSync(agentPath)) {
    logger.debug(`JaCoCo agent already exists at: ${agentPath}`);
    return agentPath;
  }

  // Create directory if it doesn't exist
  if (!fs.existsSync(jacocoDir)) {
    fs.mkdirSync(jacocoDir, { recursive: true });
    logger.debug(`Created JaCoCo directory: ${jacocoDir}`);
  }

  // Download JaCoCo agent
  logger.info(`Downloading JaCoCo agent version ${version}...`);
  const downloadUrl = `https://repo1.maven.org/maven2/org/jacoco/org.jacoco.agent/${version}/org.jacoco.agent-${version}-runtime.jar`;

  try {
    await downloadFile(downloadUrl, agentPath);
    logger.info(`JaCoCo agent downloaded successfully to: ${agentPath}`);
    return agentPath;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to download JaCoCo agent: ${errorMessage}`);
    throw new Error(`Failed to download JaCoCo agent: ${errorMessage}`);
  }
}

/**
 * Downloads a file from a URL
 * @param url - URL to download from
 * @param destPath - Destination path for the downloaded file
 */
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(destPath);
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (error) => {
      file.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(error);
    });

    file.on('error', (error) => {
      file.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(error);
    });
  });
}

/**
 * Builds JaCoCo VM arguments for coverage collection
 * @param projectRoot - Root directory of the project
 * @param agentPath - Path to the JaCoCo agent JAR
 * @param executionId - Unique identifier for this test execution
 * @param append - Whether to append to existing coverage data
 * @returns Object with JaCoCo VM arguments string and exec file path
 */
export function buildJacocoVmArgs(projectRoot: string, agentPath: string, executionId: string, append: boolean): { vmArgs: string; execFile: string } {
  const coverageDir = path.join(projectRoot, 'target', 'coverage');

  // Create coverage directory if it doesn't exist
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
    logger.debug(`Created coverage directory: ${coverageDir}`);
  }

  // If not appending, clean up old exec files to avoid accumulation
  if (!append) {
    cleanupOldExecFiles(coverageDir);
  }

  // Use fixed filename when appending, unique when not
  const execFileName = append ? 'jacoco.exec' : `jacoco-${executionId}.exec`;
  const execFile = path.join(coverageDir, execFileName);

  // Build JaCoCo agent arguments
  const jacocoArgs = [
    `-javaagent:${agentPath}=destfile=${execFile}`,
    `append=${append}`,
    'includes=*',
    'dumponexit=true'
  ].join(',');

  logger.debug(`JaCoCo VM args (append=${append}, file=${execFileName}): ${jacocoArgs}`);
  return { vmArgs: jacocoArgs, execFile };
}

/**
 * Cleans up old JaCoCo exec files from the coverage directory
 * @param coverageDir - Coverage directory path
 */
function cleanupOldExecFiles(coverageDir: string): void {
  try {
    if (!fs.existsSync(coverageDir)) {
      return;
    }

    const files = fs.readdirSync(coverageDir);
    const execFiles = files.filter(file => file.endsWith('.exec'));

    for (const file of execFiles) {
      const filePath = path.join(coverageDir, file);
      fs.unlinkSync(filePath);
      logger.debug(`Deleted old exec file: ${file}`);
    }

    if (execFiles.length > 0) {
      logger.info(`Cleaned up ${execFiles.length} old coverage file(s)`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn(`Failed to cleanup old exec files: ${errorMessage}`);
  }
}

/**
 * Generates coverage data from exec file and returns FileCoverage objects
 * @param projectRoot - Root directory of the project
 * @param execFile - Path to the JaCoCo exec file
 * @param append - Whether coverage is in append mode
 * @returns Map of file URIs to FileCoverage objects
 */
export async function generateCoverageData(
  projectRoot: string,
  execFile: string,
  append: boolean
): Promise<Map<string, vscode.FileCoverage> | undefined> {
  if (!fs.existsSync(execFile)) {
    logger.warn(`Coverage exec file not found: ${execFile}`);
    return undefined;
  }

  logger.info(`Generating coverage report from: ${execFile} (append=${append})`);

  // Clean old reports if not appending to avoid accumulation
  if (!append) {
    cleanupOldReports(projectRoot);
  }

  // Generate XML report using Maven
  const xmlReportPath = await generateXmlReport(projectRoot, execFile);
  if (!xmlReportPath) {
    logger.error('Failed to generate XML coverage report');
    vscode.window.showErrorMessage('Failed to generate coverage report. Make sure Maven is installed and JaCoCo plugin is configured.');
    return undefined;
  }

  // Parse XML and create FileCoverage objects
  const coverageMap = await parseJacocoXml(xmlReportPath, projectRoot);

  logger.info(`Coverage data generated for ${coverageMap.size} files`);

  if (coverageMap.size > 0) {
    vscode.window.showInformationMessage(`✅ Coverage collected for ${coverageMap.size} files`);
  }

  return coverageMap;
}

/**
 * Cleans up old JaCoCo reports to avoid accumulation
 * @param projectRoot - Root directory of the project
 */
function cleanupOldReports(projectRoot: string): void {
  try {
    const jacocoReportDir = path.join(projectRoot, 'target', 'site', 'jacoco');

    if (fs.existsSync(jacocoReportDir)) {
      // Remove entire jacoco report directory
      fs.rmSync(jacocoReportDir, { recursive: true, force: true });
      logger.debug('Cleaned up old JaCoCo report directory');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn(`Failed to cleanup old reports: ${errorMessage}`);
  }
}

/**
 * Generates XML coverage report using Maven
 * @param projectRoot - Root directory of the project
 * @param execFile - Path to the specific exec file to use
 * @returns Path to generated XML file, or undefined if generation failed
 */
async function generateXmlReport(projectRoot: string, execFile: string): Promise<string | undefined> {
  const xmlReportPath = path.join(projectRoot, 'target', 'site', 'jacoco', 'jacoco.xml');

  try {
    logger.info(`Running mvn jacoco:report with dataFile=${execFile}...`);

    await new Promise<void>((resolve, reject) => {
      // Specify the exact exec file to use via Maven property
      const mvn = spawn('mvn', [
        'jacoco:report',
        `-Djacoco.dataFile=${execFile}`,
        '-q'
      ], {
        cwd: projectRoot,
        shell: true
      });

      let errorOutput = '';

      mvn.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      mvn.on('close', (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Maven jacoco:report failed with code ${code}: ${errorOutput}`));
        }
      });

      mvn.on('error', (error: Error) => {
        reject(error);
      });
    });

    if (fs.existsSync(xmlReportPath)) {
      logger.info(`XML report generated at: ${xmlReportPath}`);
      return xmlReportPath;
    } else {
      logger.error('XML report was not generated');
      return undefined;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to generate XML report: ${errorMessage}`);
    return undefined;
  }
}

/**
 * Parses JaCoCo XML report and creates FileCoverage objects
 * @param xmlPath - Path to jacoco.xml file
 * @param projectRoot - Root directory of the project
 * @returns Map of file URIs to FileCoverage objects
 */
async function parseJacocoXml(
  xmlPath: string,
  projectRoot: string
): Promise<Map<string, vscode.FileCoverage>> {
  const coverageMap = new Map<string, vscode.FileCoverage>();

  try {
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    const parser = new xml2js.Parser();

    const result = await parser.parseStringPromise(xmlContent);

    // Navigate through XML structure: report -> package -> sourcefile
    const packages = result.report?.package || [];

    for (const pkg of packages) {
      const packageName = pkg.$.name;
      const sourceFiles = pkg.sourcefile || [];

      for (const sourceFile of sourceFiles) {
        const fileName = sourceFile.$.name;

        // Build file path: src/main/java/package/FileName.java
        const relativeFilePath = path.join(
          'src', 'main', 'java',
          packageName.replace(/\//g, path.sep),
          fileName
        );

        const absoluteFilePath = path.join(projectRoot, relativeFilePath);

        if (!fs.existsSync(absoluteFilePath)) {
          logger.debug(`Source file not found: ${absoluteFilePath}`);
          continue;
        }

        const fileUri = vscode.Uri.file(absoluteFilePath);

        // Extract line coverage information
        const lines = sourceFile.line || [];
        let coveredLines = 0;
        let totalLines = 0;

        const detailedCoverage: vscode.StatementCoverage[] = [];

        for (const line of lines) {
          const lineNumber = parseInt(line.$.nr, 10);
          const missedInstructions = parseInt(line.$.mi, 10);
          const coveredInstructions = parseInt(line.$.ci, 10);

          const totalInstructions = missedInstructions + coveredInstructions;
          if (totalInstructions > 0) {
            totalLines++;
            const isCovered = coveredInstructions > 0;
            if (isCovered) {
              coveredLines++;
            }

            // Create StatementCoverage for this line (0-based line number)
            const position = new vscode.Position(lineNumber - 1, 0);
            const coverage = new vscode.StatementCoverage(
              isCovered ? coveredInstructions : 0,
              position
            );
            detailedCoverage.push(coverage);
          }
        }

        // Create FileCoverage with summary
        const fileCoverage = new vscode.FileCoverage(
          fileUri,
          new vscode.TestCoverageCount(coveredLines, totalLines)
        );

        // Store detailed coverage for later retrieval
        coverageDetailsMap.set(fileCoverage, detailedCoverage);

        coverageMap.set(fileUri.toString(), fileCoverage);

        logger.debug(`Coverage for ${fileName}: ${coveredLines}/${totalLines} lines covered`);
      }
    }

    return coverageMap;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to parse JaCoCo XML: ${errorMessage}`);
    return coverageMap;
  }
}

// Store detailed coverage data for loadDetailedCoverage
const coverageDetailsMap = new WeakMap<vscode.FileCoverage, vscode.StatementCoverage[]>();

/**
 * Loads detailed coverage for a file (called by VS Code when user opens the file)
 * @param fileCoverage - The FileCoverage object to load details for
 * @returns Array of detailed coverage information
 */
export function loadDetailedCoverage(
  fileCoverage: vscode.FileCoverage
): vscode.StatementCoverage[] | vscode.DeclarationCoverage[] {
  const details = coverageDetailsMap.get(fileCoverage);
  return details || [];
}
