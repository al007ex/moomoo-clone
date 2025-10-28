import { GameCommandType } from "../commands.js";
import { ClientMessageType, type ClientMessage } from "../../protocol/messages.js";
import type { HandlerContext, MessageHandler } from "../../network/messageRouter.js";

type KeepAliveMessage = Extract<ClientMessage, { type: ClientMessageType.KeepAlive }>;

export class KeepAliveHandler implements MessageHandler<KeepAliveMessage> {
  readonly type = ClientMessageType.KeepAlive;

  async handle(context: HandlerContext<KeepAliveMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.KeepAlive,
      sessionId: context.session.id
    });
  }
}
