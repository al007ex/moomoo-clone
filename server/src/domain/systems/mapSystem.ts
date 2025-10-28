import type { GameSystem } from "../game/gameEngine.js";
import type { GameState, MapCellState } from "../game/state.js";

export interface MapSystemOptions {
  readonly getMapCells: () => Iterable<MapCellState> | null | undefined;
}

export class MapSystem implements GameSystem {
  private readonly getMapCells: () => Iterable<MapCellState> | null | undefined;
  private initialized = false;

  constructor(options: MapSystemOptions) {
    this.getMapCells = options.getMapCells;
  }

  update(state: GameState, _dt: number): GameState {
    if (this.initialized) {
      return state;
    }
    const cells = this.getMapCells();
    if (!cells) {
      return state;
    }
    this.initialized = true;
    return state.withMapCells(cells);
  }
}
