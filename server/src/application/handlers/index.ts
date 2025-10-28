import type { MessageHandler } from "../../network/messageRouter.js";
import { SpawnHandler } from "./spawnHandler.js";
import { MoveDirectionHandler, SetDirectionHandler } from "./moveDirectionHandler.js";
import { ActionHandler } from "./actionHandler.js";
import { ToggleAutoGatherHandler } from "./toggleAutoGatherHandler.js";
import { SelectItemHandler } from "./selectItemHandler.js";
import { CustomizeHandler } from "./customizeHandler.js";
import { UpgradeHandler } from "./upgradeHandler.js";
import { ChatHandler } from "./chatHandler.js";
import { KeepAliveHandler } from "./keepAliveHandler.js";
import {
  CreateClanHandler,
  LeaveClanHandler,
  InviteClanHandler,
  AcceptClanInviteHandler,
  KickClanMemberHandler
} from "./clanHandlers.js";
import { MapPingHandler, ResetMoveDirectionHandler } from "./mapPingHandler.js";

export function createHandlers(): MessageHandler[] {
  return [
    new SpawnHandler(),
    new MoveDirectionHandler(),
    new ActionHandler(),
    new ToggleAutoGatherHandler(),
    new SetDirectionHandler(),
    new SelectItemHandler(),
    new CustomizeHandler(),
    new UpgradeHandler(),
    new ChatHandler(),
    new KeepAliveHandler(),
    new CreateClanHandler(),
    new LeaveClanHandler(),
    new InviteClanHandler(),
    new AcceptClanInviteHandler(),
    new KickClanMemberHandler(),
    new MapPingHandler(),
    new ResetMoveDirectionHandler()
  ];
}
