// Base Game Class
class GameBase {
  constructor(config) {
    this.config = config;
    this.eventEmitter = new EventEmitter();
    this.players = config.players || ["Player 1", "Player 2"];
    this.currentPlayerIndex = 0;
    this.throwManager = new ThrowManager();
    this.gameComplete = false;
    this.playerSessions = {};
    this.throwsPerRound = config.throwsPerRound || 3;
    this.currentRound = 1;
    this.currentThrowInRound = 0;
    this.throwsThisRound = 0;
    this.players.forEach((player) => {
      this.playerSessions[player] = {
        score: this.getInitialScore(),
        throws: [],
      };
    });
  }

  getInitialScore() {
    // Override in game implementations
    return 0;
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  nextPlayer() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.eventEmitter.emit("playerChanged", {
      player: this.getCurrentPlayer(),
      round: this.currentRound,
    });
  }

  addThrow(dartThrow, replay = false) {
    this.throws.push(dartThrow);
    this.processThrow(dartThrow, replay);
    this.eventEmitter.emit("throwAdded", dartThrow);

    this.currentThrowInRound++;
    this.throwsThisRound++;

    if (this.currentThrowInRound >= this.throwsPerRound) {
      this.currentThrowInRound = 0;
      this.nextPlayer();

      if (this.throwsThisRound >= this.throwsPerRound * this.players.length) {
        this.nextRound();
      }
    }
  }

  nextRound() {
    this.currentThrowInRound = 0;
    this.throwsThisRound = 0;
    this.currentRound++;
  }

  processThrow(dartThrow, replay = false) {
    // Override in subclasses
  }

  isGameComplete() {
    return this.gameComplete;
  }
}
