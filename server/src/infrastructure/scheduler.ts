import { performance } from "node:perf_hooks";

export interface SchedulerOptions {
  readonly timestep: number;
  readonly maxUpdatesPerFrame?: number;
  readonly lagCompensationThreshold?: number;
  readonly now?: () => number;
}

export class FixedTimestepScheduler {
  private running = false;
  private lastTime = 0;
  private accumulator = 0;
  private handle: ReturnType<typeof setTimeout> | null = null;
  private stepCallback: ((dt: number) => void) | null = null;

  constructor(private readonly options: SchedulerOptions) {
    if (options.timestep <= 0) {
      throw new Error("Scheduler timestep must be greater than zero");
    }
  }

  start(step: (dt: number) => void): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.stepCallback = step;
    this.lastTime = this.now();
    this.accumulator = 0;
    this.loop();
  }

  stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    this.stepCallback = null;
    if (this.handle) {
      clearTimeout(this.handle);
      this.handle = null;
    }
    this.accumulator = 0;
  }

  isRunning(): boolean {
    return this.running;
  }

  private loop(): void {
    if (!this.running || !this.stepCallback) {
      return;
    }

    const currentTime = this.now();
    let frameTime = currentTime - this.lastTime;
    if (frameTime > this.timestep * 8) {
      // Drop excessively large frames to keep the simulation responsive.
      frameTime = this.timestep;
    }
    this.lastTime = currentTime;
    this.accumulator += frameTime;

    const maxUpdates = this.options.maxUpdatesPerFrame ?? 5;
    let updates = 0;
    while (this.accumulator >= this.timestep && updates < maxUpdates) {
      this.stepCallback(this.timestep);
      this.accumulator -= this.timestep;
      updates++;
    }

    const lagThreshold = this.options.lagCompensationThreshold ?? this.timestep * maxUpdates;
    if (this.accumulator > lagThreshold) {
      this.accumulator = Math.min(this.accumulator, this.timestep);
    }

    const delay = Math.max(0, this.timestep - (this.now() - currentTime));
    this.handle = setTimeout(() => this.loop(), delay);
  }

  private get timestep(): number {
    return this.options.timestep;
  }

  private now(): number {
    return this.options.now ? this.options.now() : performance.now();
  }
}
