import { encode } from "msgpack-lite";
import { WebSocket } from "ws";

import { delay } from "../moomoo/modules/delay.js";

interface OutboundPacket {
  type: string;
  payload: unknown[];
}

function createKey(type: string, payload: unknown[]): string {
  return `${type}:${JSON.stringify(payload)}`;
}

export class OutboundQueue {
  private readonly packets = new Map<string, OutboundPacket>();

  constructor(private readonly socket: WebSocket) {}

  enqueue(type: string, ...payload: unknown[]): void {
    const key = createKey(type, payload);
    this.packets.set(key, { type, payload });
  }

  async flush(): Promise<void> {
    if (this.packets.size === 0) {
      return;
    }

    for (const packet of this.packets.values()) {
      await delay();
      if (this.socket.readyState !== WebSocket.OPEN) {
        break;
      }
      this.socket.send(encode([packet.type, packet.payload]));
    }

    this.packets.clear();
  }
}
