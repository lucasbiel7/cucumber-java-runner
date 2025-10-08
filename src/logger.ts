/**
 * Centralized logging system for the extension
 * Provides different log levels that can be controlled via user settings
 */
import * as vscode from 'vscode';

/**
 * Log levels in order of severity
 */
/* eslint-disable @typescript-eslint/naming-convention */
export enum LogLevel {
  Error = 0,   // Critical errors that need immediate attention
  Warn = 1,    // Warning messages for potential issues
  Info = 2,    // General informational messages
  Debug = 3,   // Detailed debug information
  Trace = 4    // Very detailed trace information (step-by-step execution)
}
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Logger class that respects user-configured log level
 */
class Logger {
  private static instance: Logger;
  private currentLevel: LogLevel = LogLevel.Info;

  private constructor() {
    this.loadLogLevel();
  }

  /**
   * Get the singleton logger instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Load log level from VS Code settings
   */
  private loadLogLevel(): void {
    const config = vscode.workspace.getConfiguration('cucumberJavaRunner');

    // Get log level setting
    const levelString = config.get<string>('logLevel', 'info').toLowerCase();
    switch (levelString) {
      case 'error':
        this.currentLevel = LogLevel.Error;
        break;
      case 'warn':
      case 'warning':
        this.currentLevel = LogLevel.Warn;
        break;
      case 'info':
        this.currentLevel = LogLevel.Info;
        break;
      case 'debug':
        this.currentLevel = LogLevel.Debug;
        break;
      case 'trace':
        this.currentLevel = LogLevel.Trace;
        break;
      default:
        this.currentLevel = LogLevel.Info;
    }
  }

  /**
   * Reload log level from settings (call this when settings change)
   */
  public reloadLogLevel(): void {
    this.loadLogLevel();
  }

  /**
   * Check if a log level should be displayed
   */
  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLevel;
  }

  /**
   * Format the log message with level and timestamp
   */
  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const levelName = LogLevel[level];
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          // If JSON.stringify fails, use String()
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ') : '';

    return `[${timestamp}] [${levelName}] ${message}${formattedArgs}`;
  }

  /**
   * Log an error message
   */
  public error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.Error)) {
      console.error(this.formatMessage(LogLevel.Error, message, ...args));
    }
  }

  /**
   * Log a warning message
   */
  public warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.Warn)) {
      console.warn(this.formatMessage(LogLevel.Warn, message, ...args));
    }
  }

  /**
   * Log an info message
   */
  public info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.Info)) {
      console.log(this.formatMessage(LogLevel.Info, message, ...args));
    }
  }

  /**
   * Log a debug message
   */
  public debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.Debug)) {
      console.log(this.formatMessage(LogLevel.Debug, message, ...args));
    }
  }

  /**
   * Log a trace message
   */
  public trace(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.Trace)) {
      console.log(this.formatMessage(LogLevel.Trace, message, ...args));
    }
  }

  /**
   * Get the current log level
   */
  public getLogLevel(): LogLevel {
    return this.currentLevel;
  }

  /**
   * Set the log level programmatically
   */
  public setLogLevel(level: LogLevel): void {
    this.currentLevel = level;
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

/**
 * Initialize logger and watch for configuration changes
 */
export function initializeLogger(context: vscode.ExtensionContext): void {
  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('cucumberJavaRunner.logLevel')) {
        logger.reloadLogLevel();
        logger.info('Log level reloaded from settings');
      }
    })
  );
}
