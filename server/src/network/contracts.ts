import type { IncomingMessage } from "node:http";
import type { WebSocket } from "ws";

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string | Error, meta?: Record<string, unknown>): void;
}

export interface MetricsCollector {
  increment(metric: string, value?: number): void;
  gauge(metric: string, value: number): void;
  observe(metric: string, value: number): void;
}

export interface PersistenceAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface HttpServerConfig {
  host: string;
  port: number;
  staticDir: string;
  indexFile: string;
  pingEndpoint?: string;
}

export interface HttpServerDependencies {
  logger: Logger;
  metrics: MetricsCollector;
}

export interface HttpServer {
  readonly nodeServer: import("node:http").Server;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface ConnectionContext {
  socket: WebSocket;
  request: IncomingMessage;
  address: string;
}

export interface PlayerSession {
  id: string;
  socket: WebSocket;
  address: string;
}

export interface GameCommandBus {
  registerConnection(context: ConnectionContext): Promise<PlayerSession | null>;
  handleMessage(session: PlayerSession, payload: Uint8Array): Promise<void>;
  handleDisconnect(session: PlayerSession, code: number): Promise<void>;
}

export interface WebSocketGatewayConfig {
  connectionLimit: number;
}

export interface WebSocketGatewayDependencies {
  logger: Logger;
  metrics: MetricsCollector;
  commandBus: GameCommandBus;
}

export interface WebSocketGateway {
  start(httpServer: import("node:http").Server): void;
  stop(): Promise<void>;
}
