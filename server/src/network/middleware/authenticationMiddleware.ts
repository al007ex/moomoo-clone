import { ClientMessageType } from "../../protocol/messages.js";
import type { MessageMiddleware } from "../messageRouter.js";

export class AuthenticationMiddleware {
  private readonly allowedTypes: Set<ClientMessageType>;

  constructor(allowed: Iterable<ClientMessageType>) {
    this.allowedTypes = new Set(allowed);
  }

  async handle(context: Parameters<MessageMiddleware>[0], next: () => Promise<void>): Promise<void> {
    if (!context.session.authenticated && !this.allowedTypes.has(context.message.type)) {
      context.logger.warn("Rejected unauthenticated message", {
        sessionId: context.session.id,
        type: context.message.type
      });
      return;
    }

    await next();
  }
}
