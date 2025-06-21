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
        const marks = throws.filter(t => {
            const zoneInfo = t.parseZone();
            return [15, 16, 17, 18, 19, 20, 25].includes(zoneInfo.sector) && zoneInfo.type !== "out";
        }).length;
        return rounds > 0 ? marks / rounds : 0;
    }

    static calculatePrecision(throws) {
        const throwsWithTarget = throws.filter(t => t.targetZone);
        if (throwsWithTarget.length === 0) return null;

        const totalDistance = throwsWithTarget.reduce((sum, dartThrow) => {
            // Convert angular coordinates to cartesian for distance calculation
            const coords = dartThrow.getCartesianCoordinates();
            // For precision, we assume target is at center (0,0) for simplicity
            // In a real implementation, you'd convert targetZone to coordinates
            return sum + Math.sqrt(coords.x * coords.x + coords.y * coords.y);
        }, 0);

        return totalDistance / throwsWithTarget.length;
    }

    static calculateGrouping(throws) {
        if (throws.length < 2) return null;

        // Convert all throws to cartesian coordinates
        const coords = throws.map(t => t.getCartesianCoordinates());
        
        const centroidX = coords.reduce((sum, c) => sum + c.x, 0) / coords.length;
        const centroidY = coords.reduce((sum, c) => sum + c.y, 0) / coords.length;

        const distances = coords.map(c => {
            const dx = c.x - centroidX;
            const dy = c.y - centroidY;
            return Math.sqrt(dx * dx + dy * dy);
        });

        return distances.reduce((sum, d) => sum + d, 0) / distances.length;
    }
}
