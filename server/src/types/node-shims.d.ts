declare module "node:fs" {
  const fs: any;
  export default fs;
}

declare module "node:path" {
  const path: any;
  export default path;
}

declare module "node:url" {
  export function fileURLToPath(path: string): string;
}

declare module "node:http" {
  interface AddressInfo {
    address: string;
    port: number;
  }

  interface IncomingMessage {
    headers: Record<string, string | string[] | undefined>;
    socket: {
      remoteAddress?: string | null;
    };
  }

  type RequestListener = (...args: any[]) => void;

  class Server {
    listen(port: number, host: string, callback: () => void): Server;
    close(callback: (error?: Error | null) => void): void;
    address(): AddressInfo | string | null;
    on(event: string, listener: RequestListener): Server;
    once(event: string, listener: RequestListener): Server;
    removeListener(event: string, listener: RequestListener): Server;
  }

  export { Server, IncomingMessage };
  export function createServer(app: any): Server;
}

declare module "node:buffer" {
  export class Buffer extends Uint8Array {
    static from(data: any): Buffer;
    static concat(list: readonly Uint8Array[]): Buffer;
    static isBuffer(data: unknown): data is Buffer;
  }
}

declare const process: {
  env: Record<string, string | undefined>;
  exit(code?: number): never;
  on(event: string, handler: (...args: any[]) => void): void;
};
