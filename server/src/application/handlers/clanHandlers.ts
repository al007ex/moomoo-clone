import { GameCommandType } from "../commands.js";
import { ClientMessageType, type ClientMessage } from "../../protocol/messages.js";
import type { HandlerContext, MessageHandler } from "../../network/messageRouter.js";

type CreateMessage = Extract<ClientMessage, { type: ClientMessageType.CreateClan }>;
type LeaveMessage = Extract<ClientMessage, { type: ClientMessageType.LeaveClan }>;
type InviteMessage = Extract<ClientMessage, { type: ClientMessageType.InviteClan }>;
type AcceptMessage = Extract<ClientMessage, { type: ClientMessageType.AcceptClanInvite }>;
type KickMessage = Extract<ClientMessage, { type: ClientMessageType.KickClanMember }>;

export class CreateClanHandler implements MessageHandler<CreateMessage> {
  readonly type = ClientMessageType.CreateClan;

  async handle(context: HandlerContext<CreateMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.CreateClan,
      sessionId: context.session.id,
      name: context.message.payload.value
    });
  }
}

export class LeaveClanHandler implements MessageHandler<LeaveMessage> {
  readonly type = ClientMessageType.LeaveClan;

  async handle(context: HandlerContext<LeaveMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.LeaveClan,
      sessionId: context.session.id
    });
  }
}

export class InviteClanHandler implements MessageHandler<InviteMessage> {
  readonly type = ClientMessageType.InviteClan;

  async handle(context: HandlerContext<InviteMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.InviteClan,
      sessionId: context.session.id,
      target: context.message.payload.value
    });
  }
}

export class AcceptClanInviteHandler implements MessageHandler<AcceptMessage> {
  readonly type = ClientMessageType.AcceptClanInvite;

  async handle(context: HandlerContext<AcceptMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.AcceptClanInvite,
      sessionId: context.session.id,
      target: context.message.payload.target,
      leader: context.message.payload.leader
    });
  }
}

export class KickClanMemberHandler implements MessageHandler<KickMessage> {
  readonly type = ClientMessageType.KickClanMember;

  async handle(context: HandlerContext<KickMessage>): Promise<void> {
    await context.publish({
      type: GameCommandType.KickClanMember,
      sessionId: context.session.id,
      target: context.message.payload.target
    });
  }
}
