import { GameCommandType } from "../commands.js";
import { ClientMessageType, type ClientMessage } from "../../protocol/messages.js";
import type { HandlerContext, MessageHandler } from "../../network/messageRouter.js";

type MapPingMessage = Extract<ClientMessage, { type: ClientMessageType.MapPing }>;

type ResetMoveMessage = Extract<ClientMessage, { type: ClientMessageType.ResetMoveDirection }>;

export class MapPingHandler implements MessageHandler<MapPingMessage> {
  readonly type = ClientMessageType.MapPing;

  async handle(context: HandlerContext<MapPingMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.MapPing,
      sessionId: context.session.id
    });
  }
}

export class ResetMoveDirectionHandler implements MessageHandler<ResetMoveMessage> {
  readonly type = ClientMessageType.ResetMoveDirection;

  async handle(context: HandlerContext<ResetMoveMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.ResetMoveDirection,
      sessionId: context.session.id
    });
  }
}
