/**
 * Type definitions for tailwindcss 3
 */
declare module 'tailwindcss 3' {
  export interface Config {
    content?: string[];
    theme?: any;
    plugins?: any[];
    [key: string]: any;
  }
  export default function(config?: Partial<Config>): any;
}
