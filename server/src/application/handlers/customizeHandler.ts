import { GameCommandType } from "../commands.js";
import { ClientMessageType, type ClientMessage } from "../../protocol/messages.js";
import type { HandlerContext, MessageHandler } from "../../network/messageRouter.js";

type CustomizeMessage = Extract<ClientMessage, { type: ClientMessageType.CustomizeAppearance }>;

export class CustomizeHandler implements MessageHandler<CustomizeMessage> {
  readonly type = ClientMessageType.CustomizeAppearance;

  async handle(context: HandlerContext<CustomizeMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.CustomizeAppearance,
      sessionId: context.session.id,
      purchase: context.message.payload.purchase,
      itemId: context.message.payload.itemId,
      isAccessory: context.message.payload.isAccessory
    });
  }
}
