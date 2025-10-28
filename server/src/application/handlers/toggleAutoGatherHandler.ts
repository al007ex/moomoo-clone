import { GameCommandType } from "../commands.js";
import { ClientMessageType, type ClientMessage } from "../../protocol/messages.js";
import type { HandlerContext, MessageHandler } from "../../network/messageRouter.js";

type ToggleMessage = Extract<ClientMessage, { type: ClientMessageType.ToggleAutoGather }>;

export class ToggleAutoGatherHandler implements MessageHandler<ToggleMessage> {
  readonly type = ClientMessageType.ToggleAutoGather;

  async handle(context: HandlerContext<ToggleMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.ToggleAutoGather,
      sessionId: context.session.id,
      toggle: context.message.payload.toggle
    });
  }
}
