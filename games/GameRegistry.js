// Game Registry
class GameRegistry {
  static games = new Map();

  static register(gameType, gameClass) {
    this.games.set(gameType, gameClass);
  }

  static createGame(gameType, config) {
    const GameClass = this.games.get(gameType);
    if (!GameClass) throw new Error(`Unknown game type: ${gameType}`);
    return new GameClass(config);
  }
}

// Register games
GameRegistry.register("X01", GameX01);
