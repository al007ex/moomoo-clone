import type { PlayerSession } from "../network/contracts.js";

export interface SessionState extends PlayerSession {
  authenticated: boolean;
}

export interface ActivePlayerSession extends SessionState {
  player: any;
}
