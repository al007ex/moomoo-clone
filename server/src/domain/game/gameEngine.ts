import type { GameState, GameStateSnapshot } from "./state.js";
import { GameState as MutableGameState } from "./state.js";

export interface GameSystem {
  update(state: GameState, dt: number): GameState;
}

export type SnapshotListener = (snapshot: GameStateSnapshot) => void;
export type RollbackListener = (snapshot: GameStateSnapshot) => void;

export interface Scheduler {
  start(step: (dt: number) => void): void;
  stop(): void;
  isRunning(): boolean;
}

export class GameEngine {
  private readonly systems: GameSystem[] = [];
  private readonly snapshotListeners: SnapshotListener[] = [];
  private readonly rollbackListeners: RollbackListener[] = [];
  private currentState: GameState;

  constructor(
    private readonly scheduler: Scheduler,
    initialState: GameState = MutableGameState.empty()
  ) {
    this.currentState = initialState;
  }

  addSystem(system: GameSystem): void {
    this.systems.push(system);
  }

  start(): void {
    if (this.scheduler.isRunning()) {
      return;
    }
    this.scheduler.start(dt => this.step(dt));
  }

  stop(): void {
    if (!this.scheduler.isRunning()) {
      return;
    }
    this.scheduler.stop();
  }

  getState(): GameState {
    return this.currentState;
  }

  onSnapshot(listener: SnapshotListener): void {
    this.snapshotListeners.push(listener);
  }

  onRollback(listener: RollbackListener): void {
    this.rollbackListeners.push(listener);
  }

  createSnapshot(): GameStateSnapshot {
    return this.currentState.snapshot();
  }

  rollback(snapshot: GameStateSnapshot): void {
    this.currentState = MutableGameState.fromSnapshot(snapshot);
    for (const listener of this.rollbackListeners) {
      listener(snapshot);
    }
  }

  private step(dt: number): void {
    let nextState = (this.currentState as MutableGameState).advanceTick();
    for (const system of this.systems) {
      try {
        nextState = system.update(nextState, dt);
      } catch (error) {
        // Surface errors but keep engine alive for debugging/anti-cheat tooling.
        setImmediate(() => {
          throw error instanceof Error ? error : new Error(String(error));
        });
      }
    }
    this.currentState = nextState;
    const snapshot = this.currentState.snapshot();
    for (const listener of this.snapshotListeners) {
      listener(snapshot);
    }
  }
}
