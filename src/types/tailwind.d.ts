// This is a minimal type definition to prevent TypeScript errors
declare module 'tailwindcss' {
  export interface Config {
    content?: string[];
    theme?: any;
    plugins?: any[];
    [key: string]: any;
  }
  export default function(config?: Partial<Config>): any;
}
