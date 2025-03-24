// Global type fixes for all problematic modules

// Fix for babel__parser and babel__parser 2
declare module 'babel__parser' {}
declare module 'babel__parser 2' {}

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
