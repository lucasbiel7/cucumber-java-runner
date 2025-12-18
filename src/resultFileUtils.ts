/**
 * Utility functions for handling Cucumber result files
 */
import * as fs from 'fs';
import { logger } from './logger';

/**
 * Checks if the result file exists and contains valid JSON
 * Since the Java process has terminated, the file should already be complete.
 * No retries needed - if the file doesn't exist or is invalid, the test failed.
 * @param filePath Path to the file
 * @returns true if file is valid, false otherwise
 */
export async function waitForValidJsonFile(filePath: string): Promise<boolean> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.debug('Result file was not created - test likely failed before execution');
      return false;
    }

    // Read and parse JSON
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    // Validate that it's an array (Cucumber JSON format)
    if (!Array.isArray(jsonData)) {
      logger.error('Result file is not a valid Cucumber JSON array');
      return false;
    }

    logger.debug('Result file is valid');
    return true;

  } catch (error) {
    logger.error('Failed to read result file:', error);
    return false;
  }
}
