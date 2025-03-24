/**
 * Type definitions for tailwindcss 2
 */
declare module 'tailwindcss 2' {
  export interface Config {
    content?: string[];
    theme?: any;
    plugins?: any[];
    [key: string]: any;
  }
  export default function(config?: Partial<Config>): any;
}
