import fs from "node:fs";
import path from "node:path";
import { createServer, type Server as HttpNodeServer } from "node:http";
import express from "express";

import type { HttpServer, HttpServerConfig, HttpServerDependencies } from "../network/contracts.js";

export class ExpressHttpServer implements HttpServer {
  private readonly app = express();
  private readonly server: HttpNodeServer;
  private listening = false;

  constructor(
    private readonly config: HttpServerConfig,
    private readonly deps: HttpServerDependencies
  ) {
    this.server = createServer(this.app);
    this.configure();
  }

  public get nodeServer(): HttpNodeServer {
    return this.server;
  }

  private configure(): void {
    const { staticDir, indexFile, pingEndpoint } = this.config;

    if (!fs.existsSync(indexFile)) {
      this.deps.logger.warn(
        `Client build not found at ${indexFile}. Run \`npm run build --workspace client\` first.`
      );
    }

    this.app.get("/", (_req, res) => {
      res.sendFile(indexFile);
    });

    const normalizedStaticDir = path.resolve(staticDir);
    this.app.use(express.static(normalizedStaticDir));

    const pingPath = pingEndpoint ?? "/ping";
    this.app.get(pingPath, (_req, res) => {
      res.send("Ok");
    });
  }

  async start(): Promise<void> {
    if (this.listening) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const { host, port } = this.config;
      this.server.once("error", reject);
      this.server.listen(port, host, () => {
        this.listening = true;
        this.server.removeListener("error", reject);
        const address = this.server.address();
        const listenHost = typeof address === "string" ? address : address?.address ?? host;
        const listenPort = typeof address === "string" ? this.config.port : address?.port ?? this.config.port;
        this.deps.logger.info(`HTTP server listening at http://${listenHost}:${listenPort}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.listening) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server.close(error => {
        if (error) {
          reject(error);
          return;
        }
        this.listening = false;
        resolve();
      });
    });
  }
}
