/**
 * Maven dependency resolver - resolves Maven classpath including all dependencies
 */
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';

/**
 * Compiles the Maven project before running tests
 * Only compiles if the target directory doesn't exist
 */
async function compileMavenProject(projectRoot: string): Promise<boolean> {
  const targetDir = path.join(projectRoot, 'target');

  // Check if target directory exists
  if (fs.existsSync(targetDir)) {
    console.log('Target directory exists, skipping compilation');
    return true;
  }

  return new Promise((resolve, reject) => {
    // Execute Maven compile without clean to avoid unnecessary rebuilds
    const command = 'mvn compile test-compile';

    console.log('Target directory not found. Compiling Maven project...');

    exec(command, { cwd: projectRoot }, (error, stdout, stderr) => {
      if (error) {
        console.error('Error compiling Maven project:', error);
        console.error('stderr:', stderr);
        console.log('stdout:', stdout);
        resolve(false); // Return false but don't fail - try to continue anyway
        return;
      }

      console.log('Maven project compiled successfully');
      if (stdout) {
        console.log('Maven output:', stdout);
      }
      resolve(true);
    });
  });
}

/**
 * Resolves Maven classpath including all dependencies (transitive and declared)
 * Compiles the project first to ensure it's up to date
 */
export async function resolveMavenClasspath(projectRoot: string): Promise<string[]> {
  // First, compile the Maven project
  const compiled = await compileMavenProject(projectRoot);
  if (!compiled) {
    console.warn('Maven compilation failed, but continuing with classpath resolution...');
  }

  return new Promise((resolve, reject) => {
    // Execute Maven command to get the full classpath
    const command = 'mvn dependency:build-classpath -DincludeScope=test -q -Dmdep.outputFile=/dev/stdout';

    exec(command, { cwd: projectRoot }, (error, stdout, stderr) => {
        const classPaths: string[] = [
            path.join(projectRoot, 'target', 'test-classes'),
            path.join(projectRoot, 'target', 'classes'),
            path.join(projectRoot, 'target', 'generated-sources', 'annotations'),
            path.join(projectRoot, 'target', 'generated-sources', 'swagger', 'java', 'main')
          ];

      if (error) {
        console.error('Error resolving Maven classpath:', error);
        console.error('stderr:', stderr);
        // Return basic classpath as fallback
        resolve(classPaths);
        return;
      }
      // Parse the Maven output - it returns paths separated by ':'
      const output = stdout.trim();
      if (output) {
        const dependencies = output.split(':').filter(dep => dep.trim().length > 0);
        classPaths.push(...dependencies);
      }

      console.log(`Resolved ${classPaths.length} classpath entries from Maven`);
      resolve(classPaths);
    });
  });
}

/**
 * Finds the steps directories in the project and converts to Java package structure
 */
export async function findGluePath(projectRoot: string): Promise<string | null> {
  const fs = require('fs');

  // In Maven projects, test code is usually in src/test/java
  const testDir = path.join(projectRoot, 'src', 'test', 'java');

  if (!fs.existsSync(testDir)) {
    return null;
  }

  // Recursively search for steps directories
  const stepsDir = await findStepsDir(testDir, fs);

  if (!stepsDir) {
    return null;
  }

  // Create the Java package name for the steps directory
  // src/test/java/org/example/steps -> org.example.steps
  const packagePath = path.relative(testDir, stepsDir).replace(/\\/g, '/').replace(/\//g, '.');

  return packagePath;
}

/**
 * Recursively searches for the steps directory
 */
async function findStepsDir(dir: string, fs: any): Promise<string | null> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // First check if current directory is a steps folder
  if (dir.endsWith('steps') || dir.endsWith('step')) {
    // Check if it contains Java files directly
    const hasJavaFiles = entries.some((entry: any) => !entry.isDirectory() && entry.name.endsWith('.java'));

    // Check Java files in subdirectories
    if (!hasJavaFiles) {
      // Recursive inner function to check directories
      const checkSubDirsForJavaFiles = (subDir: string): boolean => {
        const subEntries = fs.readdirSync(subDir, { withFileTypes: true });

        // Does this subdirectory have Java files?
        const hasDirectJavaFiles = subEntries.some((entry: any) => !entry.isDirectory() && entry.name.endsWith('.java'));
        if (hasDirectJavaFiles) {
          return true;
        }

        // Check deeper subdirectories if they exist
        for (const entry of subEntries) {
          if (entry.isDirectory()) {
            const hasJavaInSubDir = checkSubDirsForJavaFiles(path.join(subDir, entry.name));
            if (hasJavaInSubDir) {
              return true;
            }
          }
        }

        return false;
      };

      // Accept this directory if subdirectories contain Java files
      const hasJavaFilesInSubDirs = entries.some((entry: any) => {
        if (entry.isDirectory()) {
          return checkSubDirsForJavaFiles(path.join(dir, entry.name));
        }
        return false;
      });

      if (hasJavaFilesInSubDirs) {
        return dir;
      }
    } else {
      // If Java files exist directly in the directory
      return dir;
    }
  }

  // If nothing found, search in subdirectories
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subDir = path.join(dir, entry.name);
      const result = await findStepsDir(subDir, fs);
      if (result) {
        return result;
      }
    }
  }

  return null;
}
