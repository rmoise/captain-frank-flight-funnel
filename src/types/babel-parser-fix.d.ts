/**
 * Type definitions for babel__parser
 * This is a direct fix for the TS2688 error
 */

// Fix for 'babel__parser'
declare module 'babel__parser' {
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

// Fix for 'babel__parser 2'
declare module 'babel__parser 2' {
  // Re-export everything from babel__parser
  export * from 'babel__parser';
}

// Fix for tailwindcss, tailwindcss 2, and tailwindcss 3
declare module 'tailwindcss' {
  export interface Config {
    content?: string[];
    theme?: any;
    plugins?: any[];
    [key: string]: any;
  }
  export default function(config?: Partial<Config>): any;
}
declare module 'tailwindcss 2' {}
declare module 'tailwindcss 3' {}
