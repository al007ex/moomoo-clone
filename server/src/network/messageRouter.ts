import type { MetricsCollector, Logger } from "./contracts.js";
import { parseClientMessage, ClientMessageType, type ClientMessage } from "../protocol/messages.js";
import { OutboundQueue } from "./outboundQueue.js";
import type { GameCommand } from "../application/commands.js";
import type { ActivePlayerSession } from "../game/session.js";

export interface CommandPublishOptions {
  session: ActivePlayerSession;
  queue: OutboundQueue;
}

export interface GameCommandPublisher {
  publish(command: GameCommand, options: CommandPublishOptions): Promise<void>;
}

export interface HandlerContext<TMessage extends ClientMessage = ClientMessage> {
  session: ActivePlayerSession;
  message: TMessage;
  queue: OutboundQueue;
  logger: Logger;
  publish(command: GameCommand): Promise<void>;
}

export type MessageMiddleware = (
  context: HandlerContext,
  next: () => Promise<void>
) => Promise<void>;

export interface MessageHandler<TMessage extends ClientMessage = ClientMessage> {
  readonly type: ClientMessageType;
  handle(context: HandlerContext<TMessage>): Promise<void>;
}

interface MessageRouterOptions {
  logger: Logger;
  metrics: MetricsCollector;
  publisher: GameCommandPublisher;
  handlers: MessageHandler[];
  middleware?: MessageMiddleware[];
}

export class MessageRouter {
  private readonly handlers = new Map<ClientMessageType, MessageHandler>();
  private readonly middleware: MessageMiddleware[];

  constructor(private readonly options: MessageRouterOptions) {
    for (const handler of options.handlers) {
      this.handlers.set(handler.type, handler);
    }
    this.middleware = options.middleware ?? [];
  }

  async route(session: ActivePlayerSession, payload: Uint8Array): Promise<void> {
    let message: ClientMessage;
    try {
      message = parseClientMessage(payload);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.options.logger.warn("Failed to parse inbound message", {
        sessionId: session.id,
        error: err.message
      });
      return;
    }

    const handler = this.handlers.get(message.type);

    if (!handler) {
      this.options.logger.warn("No handler registered for message type", {
        sessionId: session.id,
        type: message.type
      });
      return;
    }

    const queue = new OutboundQueue(session.socket);
    const context: HandlerContext = {
      session,
      message,
      queue,
      logger: this.options.logger,
      publish: command =>
        this.options.publisher.publish(command, { session, queue })
    };

    const execute = this.compose(handler, context);

    try {
      this.options.metrics.increment(`network.router.${message.type}`);
      await execute();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.options.logger.error(err, {
        sessionId: session.id,
        type: message.type
      });
    } finally {
      await context.queue.flush();
    }
  }

  private compose(handler: MessageHandler, context: HandlerContext): () => Promise<void> {
    let next: () => Promise<void> = () => handler.handle(context);

    for (let i = this.middleware.length - 1; i >= 0; i -= 1) {
      const middleware = this.middleware[i];
      const currentNext = next;
      next = () => middleware(context, currentNext);
    }

    return next;
  }
}
