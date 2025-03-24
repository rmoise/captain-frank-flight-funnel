/**
 * Type definitions for babel__parser 2
 */
declare module 'babel__parser 2' {
  // Import the actual types from @babel/types
  import * as t from '@babel/types';

  // Define the basic interfaces
  export interface ParserOptions {
    allowImportExportEverywhere?: boolean;
    allowAwaitOutsideFunction?: boolean;
    allowReturnOutsideFunction?: boolean;
    allowSuperOutsideMethod?: boolean;
    allowUndeclaredExports?: boolean;
    errorRecovery?: boolean;
    plugins?: string[];
    sourceType?: 'script' | 'module' | 'unambiguous';
    sourceFilename?: string;
    startColumn?: number;
    startLine?: number;
    strictMode?: boolean;
    ranges?: boolean;
    tokens?: boolean;
  }

  // Define the main functions
  export function parse(input: string, options?: ParserOptions): t.File;
  export function parseExpression(input: string, options?: ParserOptions): t.Expression;
}
