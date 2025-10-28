declare module "zod" {
  export class ZodError extends Error {
    constructor(issues: any[]);
    issues: any[];
  }
  export type ZodType<T = any, Def = any, Input = any> = any;
  export const z: any;
}
