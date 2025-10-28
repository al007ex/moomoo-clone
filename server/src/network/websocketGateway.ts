import type { IncomingMessage } from "node:http";
import { Buffer } from "node:buffer";
import { WebSocketServer, type WebSocket } from "ws";

import { ConnectionLimit } from "../moomoo/libs/limit.js";
import type {
  ConnectionContext,
  PlayerSession,
  WebSocketGateway,
  WebSocketGatewayConfig,
  WebSocketGatewayDependencies
} from "./contracts.js";

function toUint8Array(data: WebSocket.RawData): Uint8Array {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (Array.isArray(data)) {
    return new Uint8Array(Buffer.concat(data.map(chunk => Buffer.from(chunk))));
  }
  if (Buffer.isBuffer(data)) {
    return new Uint8Array(data);
  }
  return new Uint8Array(data as ArrayBuffer);
}

function resolveAddress(request: IncomingMessage): string {
  const xForwardedFor = request.headers["x-forwarded-for"];
  if (typeof xForwardedFor === "string" && xForwardedFor.length > 0) {
    return xForwardedFor.split(",")[0].trim();
  }
  if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
    return xForwardedFor[0];
  }
  return request.socket.remoteAddress ?? "unknown";
}

export class DefaultWebSocketGateway implements WebSocketGateway {
  private readonly limiter: ConnectionLimit;
  private wss: WebSocketServer | null = null;
  private readonly sessions = new WeakMap<WebSocket, PlayerSession>();

  constructor(
    private readonly config: WebSocketGatewayConfig,
    private readonly deps: WebSocketGatewayDependencies
  ) {
    this.limiter = new ConnectionLimit(config.connectionLimit);
  }

  start(httpServer: import("node:http").Server): void {
    this.wss = new WebSocketServer({ server: httpServer });
    this.wss.on("connection", (socket, request) => {
      void this.handleConnection(socket, request);
    });
  }

  async stop(): Promise<void> {
    if (!this.wss) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.wss?.close(error => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    this.wss = null;
  }

  private async handleConnection(socket: WebSocket, request: IncomingMessage): Promise<void> {
    const address = resolveAddress(request);

    if (this.limiter.check(address)) {
      this.deps.logger.warn("Connection rejected due to per-IP limit", { address });
      socket.close(4001);
      return;
    }

    const context: ConnectionContext = { socket, request, address };
    const session = await this.deps.commandBus.registerConnection(context);

    if (!session) {
      this.deps.logger.warn("Connection rejected by GameCommandBus", { address });
      socket.close();
      return;
    }

    this.sessions.set(socket, session);
    this.limiter.up(address);
    this.deps.metrics.increment("websocket.connections");

    const closeListener = async (code: number) => {
      this.sessions.delete(socket);
      this.limiter.down(address);
      try {
        await this.deps.commandBus.handleDisconnect(session, code);
      } catch (error) {
        this.deps.logger.error(error instanceof Error ? error : String(error));
      }
    };

    socket.once("close", code => {
      void closeListener(code);
    });

    socket.on("message", async rawData => {
      const payload = toUint8Array(rawData);
      this.deps.metrics.increment("websocket.messages");
      try {
        await this.deps.commandBus.handleMessage(session, payload);
      } catch (error) {
        this.deps.logger.error(error instanceof Error ? error : String(error));
      }
    });
  }
}
