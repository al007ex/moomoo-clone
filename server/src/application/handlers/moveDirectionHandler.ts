import { GameCommandType } from "../commands.js";
import { ClientMessageType, type ClientMessage } from "../../protocol/messages.js";
import type { HandlerContext, MessageHandler } from "../../network/messageRouter.js";

type MoveMessage = Extract<ClientMessage, { type: ClientMessageType.SetMoveDirection }>;

type AngleMessage = Extract<ClientMessage, { type: ClientMessageType.SetDirection }>;

export class MoveDirectionHandler implements MessageHandler<MoveMessage> {
  readonly type = ClientMessageType.SetMoveDirection;

  async handle(context: HandlerContext<MoveMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.SetMoveDirection,
      sessionId: context.session.id,
      direction: context.message.payload.direction
    });
  }
}

export class SetDirectionHandler implements MessageHandler<AngleMessage> {
  readonly type = ClientMessageType.SetDirection;

  async handle(context: HandlerContext<AngleMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.SetDirection,
      sessionId: context.session.id,
      direction: context.message.payload.direction
    });
  }
}
