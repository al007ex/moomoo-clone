import type { GameSystem } from "../game/gameEngine.js";
import type { GameState } from "../game/state.js";

export interface AiSystemOptions {
  readonly updateAnimals: (dt: number) => void;
}

export class AiSystem implements GameSystem {
  private readonly updateAnimalsFn: (dt: number) => void;

  constructor(options: AiSystemOptions) {
    this.updateAnimalsFn = options.updateAnimals;
  }

  update(state: GameState, dt: number): GameState {
    this.updateAnimalsFn(dt);
    return state;
  }
}
