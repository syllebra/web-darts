// 501 Game Implementation
class Game501 extends GameBase {
    constructor(config) {
        super(config);
        this.scores = {};
        this.players.forEach(player => {
            this.scores[player] = 501;
            this.playerSessions[player].score = 501;
        });
    }

    getInitialScore() {
        return 501;
    }

    processThrow(dartThrow) {
        const currentPlayer = this.getCurrentPlayer();
        const newScore = this.scores[currentPlayer] - dartThrow.score;

        if (newScore === 0) {
            this.scores[currentPlayer] = 0;
            this.playerSessions[currentPlayer].score = 0;
            this.gameComplete = true;
            this.eventEmitter.emit('gameComplete', currentPlayer);
        } else if (newScore > 0) {
            this.scores[currentPlayer] = newScore;
            this.playerSessions[currentPlayer].score = newScore;
        } else {
            // Bust - score remains the same
            this.eventEmitter.emit('bust', currentPlayer);
        }

        this.playerSessions[currentPlayer].throws.push(dartThrow);

        this.eventEmitter.emit('scoreUpdate', {
            player: currentPlayer,
            score: this.scores[currentPlayer],
            players: this.players.map(p => ({
                name: p,
                score: this.scores[p],
                isCurrent: p === this.getCurrentPlayer()
            }))
        });
    }

    getCurrentScore() {
        return this.scores[this.getCurrentPlayer()];
    }
}
