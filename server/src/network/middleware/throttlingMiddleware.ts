import type { Logger } from "../contracts.js";
import type { MessageMiddleware } from "../messageRouter.js";

interface TokenBucket {
  tokens: number;
  updatedAt: number;
}

export interface ThrottlingOptions {
  capacity?: number;
  refillRate?: number;
}

export class ThrottlingMiddleware {
  private readonly buckets = new Map<string, TokenBucket>();
  private readonly capacity: number;
  private readonly refillRate: number;

  constructor(private readonly logger: Logger, options: ThrottlingOptions = {}) {
    this.capacity = options.capacity ?? 30;
    this.refillRate = options.refillRate ?? 30;
  }

  async handle(context: Parameters<MessageMiddleware>[0], next: () => Promise<void>): Promise<void> {
    const now = Date.now();
    const bucket = this.buckets.get(context.session.id) ?? {
      tokens: this.capacity,
      updatedAt: now
    };

    const elapsed = (now - bucket.updatedAt) / 1000;
    if (elapsed > 0) {
      const refill = elapsed * this.refillRate;
      bucket.tokens = Math.min(this.capacity, bucket.tokens + refill);
      bucket.updatedAt = now;
    }

    if (bucket.tokens < 1) {
      this.logger.warn("Throttled inbound message", {
        sessionId: context.session.id,
        type: context.message.type
      });
      this.buckets.set(context.session.id, bucket);
      return;
    }

    bucket.tokens -= 1;
    this.buckets.set(context.session.id, bucket);

    await next();
  }
}
