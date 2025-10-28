import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Game } from "./moomoo/server.js";
import { ExpressHttpServer } from "./http/server.js";
import { DefaultGameCommandBus } from "./game/gameCommandBus.js";
import { DefaultWebSocketGateway } from "./network/websocketGateway.js";
import type {
  HttpServer,
  HttpServerConfig,
  Logger,
  MetricsCollector,
  PersistenceAdapter,
  WebSocketGateway,
  WebSocketGatewayConfig
} from "./network/contracts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Container {
  private readonly factories = new Map<string, (container: Container) => unknown>();
  private readonly instances = new Map<string, unknown>();

  register<T>(token: string, factory: (container: Container) => T): void {
    this.factories.set(token, factory);
  }

  resolve<T>(token: string): T {
    if (!this.instances.has(token)) {
      const factory = this.factories.get(token);
      if (!factory) {
        throw new Error(`Service with token "${token}" has not been registered.`);
      }
      const instance = factory(this);
      this.instances.set(token, instance);
    }
    return this.instances.get(token) as T;
  }
}

class ConsoleLogger implements Logger {
  debug(message: string, meta?: Record<string, unknown>): void {
    console.debug(`[debug] ${message}`, meta ?? "");
  }
  info(message: string, meta?: Record<string, unknown>): void {
    console.info(`[info] ${message}`, meta ?? "");
  }
  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[warn] ${message}`, meta ?? "");
  }
  error(message: string | Error, meta?: Record<string, unknown>): void {
    console.error(`[error] ${message instanceof Error ? message.message : message}`, meta ?? "");
  }
}

class InMemoryMetricsCollector implements MetricsCollector {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();

  increment(metric: string, value = 1): void {
    const current = this.counters.get(metric) ?? 0;
    this.counters.set(metric, current + value);
  }

  gauge(metric: string, value: number): void {
    this.gauges.set(metric, value);
  }

  observe(metric: string, value: number): void {
    this.increment(`${metric}:observations`);
    this.gauge(`${metric}:last`, value);
  }
}

class NullPersistenceAdapter implements PersistenceAdapter {
  async connect(): Promise<void> {
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    return Promise.resolve();
  }
}

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }
  const equalsIndex = trimmed.indexOf("=");
  if (equalsIndex === -1) {
    return null;
  }
  const key = trimmed.slice(0, equalsIndex).trim();
  const rawValue = trimmed.slice(equalsIndex + 1).trim();
  const value = rawValue.replace(/^['"]|['"]$/g, "");
  return [key, value];
}

function loadEnvironmentFiles(files: string[]): void {
  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const entry = parseEnvLine(line);
      if (!entry) continue;
      const [key, value] = entry;
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

async function bootstrap(): Promise<void> {
  const serverRoot = path.resolve(__dirname, "..");
  const projectRoot = path.resolve(serverRoot, "..");
  const envFiles = [
    path.join(projectRoot, ".env"),
    path.join(serverRoot, ".env")
  ];

  loadEnvironmentFiles(envFiles);

  const host = process.env.SERVER_HOST ?? process.env.HOST ?? "0.0.0.0";
  const port = Number.parseInt(process.env.SERVER_PORT ?? process.env.PORT ?? "8080", 10);
  const connectionLimit = Number.parseInt(process.env.CONNECTION_LIMIT ?? "4", 10);
  const staticDir = path.resolve(projectRoot, "dist/client");
  const indexFile = path.join(staticDir, "index.html");

  const httpConfig: HttpServerConfig = {
    host,
    port,
    staticDir,
    indexFile,
    pingEndpoint: process.env.PING_ENDPOINT ?? "/ping"
  };

  const wsConfig: WebSocketGatewayConfig = {
    connectionLimit
  };

  const container = new Container();
  container.register<Logger>("logger", () => new ConsoleLogger());
  container.register<MetricsCollector>("metrics", () => new InMemoryMetricsCollector());
  container.register<PersistenceAdapter>("persistence", () => new NullPersistenceAdapter());
  container.register<Game>("game", () => new Game());
  container.register("commandBus", c => new DefaultGameCommandBus(c.resolve("game"), {
    logger: c.resolve("logger"),
    metrics: c.resolve("metrics")
  }));
  container.register<HttpServer>("httpServer", c => new ExpressHttpServer(httpConfig, {
    logger: c.resolve("logger"),
    metrics: c.resolve("metrics")
  }));
  container.register<WebSocketGateway>("webSocketGateway", c => new DefaultWebSocketGateway(wsConfig, {
    logger: c.resolve("logger"),
    metrics: c.resolve("metrics"),
    commandBus: c.resolve("commandBus")
  }));

  const logger = container.resolve<Logger>("logger");
  const metrics = container.resolve<MetricsCollector>("metrics");
  const persistence = container.resolve<PersistenceAdapter>("persistence");
  const httpServer = container.resolve<HttpServer>("httpServer");
  const webSocketGateway = container.resolve<WebSocketGateway>("webSocketGateway");

  metrics.gauge("server.port", port);

  await persistence.connect();
  await httpServer.start();
  webSocketGateway.start(httpServer.nodeServer);

  logger.info("Server bootstrap complete");

  const shutdown = async () => {
    logger.info("Shutting down server");
    await persistence.disconnect();
    await webSocketGateway.stop();
    await httpServer.stop();
    logger.info("Shutdown complete");
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

bootstrap().catch(error => {
  console.error(error);
  process.exit(1);
});
