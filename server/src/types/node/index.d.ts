declare namespace NodeJS {
  interface Timeout {}
  type Signals = string;
}

declare module "node:perf_hooks" {
  export const performance: {
    now(): number;
  };
}

declare function setImmediate(callback: (...args: any[]) => void, ...args: any[]): any;
