// Statistics Engine
class StatisticsEngine {
    static calculatePlayerStats(players, throwsByPlayer, roundsByPlayer) {
        const results = {};
        
        for (const player of players) {
            const throws = throwsByPlayer[player] || [];
            const rounds = roundsByPlayer[player] || 0;
            
            results[player] = {
                mpr: this.calculateMPR(throws, rounds),
                precision: this.calculatePrecision(throws),
                grouping: this.calculateGrouping(throws)
            };
        }
        
        return results;
    }

    static calculateMPR(throws, rounds) {
        // Simplified MPR calculation for cricket
        const marks = throws.filter(t =>
            [15, 16, 17, 18, 19, 20, 25].includes(t.sector) && t.score > 0
        ).length;
        return rounds > 0 ? marks / rounds : 0;
    }

    static calculatePrecision(throws) {
        const throwsWithTarget = throws.filter(t => t.targetPoint);
        if (throwsWithTarget.length === 0) return null;

        const totalDistance = throwsWithTarget.reduce((sum, dartThrow) => {
            const dx = dartThrow.x - dartThrow.targetPoint.x;
            const dy = dartThrow.y - dartThrow.targetPoint.y;
            return sum + Math.sqrt(dx * dx + dy * dy);
        }, 0);

        return totalDistance / throwsWithTarget.length;
    }

    static calculateGrouping(throws) {
        if (throws.length < 2) return null;

        const centroidX = throws.reduce((sum, t) => sum + t.x, 0) / throws.length;
        const centroidY = throws.reduce((sum, t) => sum + t.y, 0) / throws.length;

        const distances = throws.map(t => {
            const dx = t.x - centroidX;
            const dy = t.y - centroidY;
            return Math.sqrt(dx * dx + dy * dy);
        });

        return distances.reduce((sum, d) => sum + d, 0) / distances.length;
    }
}
