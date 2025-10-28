import type { Logger } from "../contracts.js";
import type { MessageMiddleware } from "../messageRouter.js";

export class LoggingMiddleware {
  constructor(private readonly logger: Logger) {}

  async handle(context: Parameters<MessageMiddleware>[0], next: () => Promise<void>): Promise<void> {
    this.logger.debug("Routing inbound message", {
      sessionId: context.session.id,
      type: context.message.type
    });

    try {
      await next();
    } finally {
      this.logger.debug("Finished inbound message", {
        sessionId: context.session.id,
        type: context.message.type
      });
    }
  }
}
