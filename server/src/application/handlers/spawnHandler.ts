import { GameCommandType } from "../commands.js";
import { ClientMessageType, type ClientMessage } from "../../protocol/messages.js";
import type { HandlerContext, MessageHandler } from "../../network/messageRouter.js";

type SpawnMessage = Extract<ClientMessage, { type: ClientMessageType.Spawn }>;

export class SpawnHandler implements MessageHandler<SpawnMessage> {
  readonly type = ClientMessageType.Spawn;

  async handle(context: HandlerContext<SpawnMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.SpawnPlayer,
      sessionId: context.session.id,
      userData: context.message.payload.userData
    });
  }
}
