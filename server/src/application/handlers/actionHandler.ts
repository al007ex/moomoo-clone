import { GameCommandType } from "../commands.js";
import { ClientMessageType, type ClientMessage } from "../../protocol/messages.js";
import type { HandlerContext, MessageHandler } from "../../network/messageRouter.js";

type ActionMessage = Extract<ClientMessage, { type: ClientMessageType.Action }>;

export class ActionHandler implements MessageHandler<ActionMessage> {
  readonly type = ClientMessageType.Action;

  async handle(context: HandlerContext<ActionMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.PerformAction,
      sessionId: context.session.id,
      active: context.message.payload.active,
      angle: context.message.payload.angle
    });
  }
}
