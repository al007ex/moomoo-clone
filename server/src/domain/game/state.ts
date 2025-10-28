export interface PlayerState {
  readonly id: string;
  readonly sid: number;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly kills: number;
  readonly points: number;
  readonly alive: boolean;
  readonly iconIndex: number;
}

export interface EntityState {
  readonly id: string;
  readonly type: string;
  readonly x: number;
  readonly y: number;
  readonly payload?: Record<string, unknown> | undefined;
}

export interface MapCellState {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly terrain: string;
  readonly metadata?: Record<string, unknown> | undefined;
}

export interface GameStateMetadata {
  readonly leaderboard: ReadonlyArray<LeaderboardEntry>;
  readonly minimap: ReadonlyArray<MinimapEntry>;
}

export interface LeaderboardEntry {
  readonly sid: number;
  readonly name: string;
  readonly points: number;
}

export interface MinimapEntry {
  readonly sid: number;
  readonly x: number;
  readonly y: number;
}

export type EntityCollection = ReadonlyMap<string, ReadonlyArray<EntityState>>;

export interface GameStateSnapshot {
  readonly tick: number;
  readonly players: ReadonlyArray<PlayerState>;
  readonly entities: EntityCollection;
  readonly mapCells: ReadonlyArray<MapCellState>;
  readonly metadata: GameStateMetadata;
}

const EMPTY_METADATA: GameStateMetadata = {
  leaderboard: Object.freeze([]),
  minimap: Object.freeze([])
};

export class GameState {
  static empty(): GameState {
    return new GameState(
      0,
      new Map(),
      new Map(),
      [],
      EMPTY_METADATA
    );
  }

  constructor(
    readonly tick: number,
    readonly players: ReadonlyMap<string, PlayerState>,
    readonly entities: EntityCollection,
    readonly mapCells: ReadonlyArray<MapCellState>,
    readonly metadata: GameStateMetadata
  ) {}

  withPlayers(players: Iterable<PlayerState>): GameState {
    const nextPlayers = new Map<string, PlayerState>();
    for (const player of players) {
      nextPlayers.set(player.id, player);
    }
    return new GameState(
      this.tick,
      nextPlayers,
      this.entities,
      this.mapCells,
      this.metadata
    );
  }

  withEntities(type: string, entities: Iterable<EntityState>): GameState {
    const nextEntities = new Map(this.entities);
    nextEntities.set(type, Array.from(entities));
    return new GameState(
      this.tick,
      this.players,
      nextEntities,
      this.mapCells,
      this.metadata
    );
  }

  withMapCells(cells: Iterable<MapCellState>): GameState {
    return new GameState(
      this.tick,
      this.players,
      this.entities,
      Array.from(cells),
      this.metadata
    );
  }

  withLeaderboard(entries: Iterable<LeaderboardEntry>): GameState {
    return new GameState(
      this.tick,
      this.players,
      this.entities,
      this.mapCells,
      {
        ...this.metadata,
        leaderboard: Array.from(entries)
      }
    );
  }

  withMinimap(entries: Iterable<MinimapEntry>): GameState {
    return new GameState(
      this.tick,
      this.players,
      this.entities,
      this.mapCells,
      {
        ...this.metadata,
        minimap: Array.from(entries)
      }
    );
  }

  advanceTick(): GameState {
    return new GameState(
      this.tick + 1,
      this.players,
      this.entities,
      this.mapCells,
      this.metadata
    );
  }

  snapshot(): GameStateSnapshot {
    return {
      tick: this.tick,
      players: Array.from(this.players.values()),
      entities: new Map(this.entities),
      mapCells: Array.from(this.mapCells),
      metadata: {
        leaderboard: Array.from(this.metadata.leaderboard),
        minimap: Array.from(this.metadata.minimap)
      }
    };
  }

  static fromSnapshot(snapshot: GameStateSnapshot): GameState {
    return new GameState(
      snapshot.tick,
      new Map(snapshot.players.map(player => [player.id, player])),
      new Map(snapshot.entities),
      Array.from(snapshot.mapCells),
      {
        leaderboard: Array.from(snapshot.metadata.leaderboard),
        minimap: Array.from(snapshot.metadata.minimap)
      }
    );
  }
}
