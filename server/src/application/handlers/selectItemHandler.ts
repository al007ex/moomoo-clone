import { GameCommandType } from "../commands.js";
import { ClientMessageType, type ClientMessage } from "../../protocol/messages.js";
import type { HandlerContext, MessageHandler } from "../../network/messageRouter.js";

type SelectMessage = Extract<ClientMessage, { type: ClientMessageType.SelectItem }>;

export class SelectItemHandler implements MessageHandler<SelectMessage> {
  readonly type = ClientMessageType.SelectItem;

  async handle(context: HandlerContext<SelectMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.SelectItem,
      sessionId: context.session.id,
      itemId: context.message.payload.itemId,
      equipWeapon: context.message.payload.equipWeapon
    });
  }
}
