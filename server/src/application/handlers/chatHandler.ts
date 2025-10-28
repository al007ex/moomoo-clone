import { GameCommandType } from "../commands.js";
import { ClientMessageType, type ClientMessage } from "../../protocol/messages.js";
import type { HandlerContext, MessageHandler } from "../../network/messageRouter.js";

type ChatMessage = Extract<ClientMessage, { type: ClientMessageType.Chat }>;

export class ChatHandler implements MessageHandler<ChatMessage> {
  readonly type = ClientMessageType.Chat;

  async handle(context: HandlerContext<ChatMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.SendChat,
      sessionId: context.session.id,
      message: context.message.payload.message
    });
  }
}
