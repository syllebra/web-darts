// Throw class
class Throw {
    constructor(x, y, sector, multiplier, score, targetPoint = null) {
        this.x = x;
        this.y = y;
        this.sector = sector;
        this.multiplier = multiplier;
        this.score = score;
        this.targetPoint = targetPoint;
        this.timestamp = Date.now();
        this.id = this.generateId();
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
}
