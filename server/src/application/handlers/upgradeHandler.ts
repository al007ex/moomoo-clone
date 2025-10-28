import { GameCommandType } from "../commands.js";
import { ClientMessageType, type ClientMessage } from "../../protocol/messages.js";
import type { HandlerContext, MessageHandler } from "../../network/messageRouter.js";

type UpgradeMessage = Extract<ClientMessage, { type: ClientMessageType.Upgrade }>;

export class UpgradeHandler implements MessageHandler<UpgradeMessage> {
  readonly type = ClientMessageType.Upgrade;

  async handle(context: HandlerContext<UpgradeMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.UpgradeChoice,
      sessionId: context.session.id,
      choice: context.message.payload.choice
    });
  }
}
