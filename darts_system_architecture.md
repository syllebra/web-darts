# Modular Darts Application - System Architecture

## Core Architecture Overview

### 1. Main Application Structure
```
DartsApp/
├── core/
│   ├── GameEngine.js          # Main game engine
│   ├── ThrowManager.js        # Handles throws, undo, edit
│   ├── StatisticsEngine.js    # MPR, precision calculations
│   ├── NetworkManager.js      # API/MQTT communication
│   └── PlatformAdapter.js     # Mobile/Desktop adaptations
├── games/
│   ├── GameBase.js           # Base class for all games
│   ├── X01/
│   │   ├── GameX01.js        # Game logic
│   │   └── GameX01View.js    # Game visualization
│   ├── cricket/
│   │   ├── GameCricket.js
│   │   └── GameCricketView.js
│   └── around-the-clock/
│       ├── GameATC.js
│       └── GameATCView.js
├── ui/
│   ├── DartboardView.js      # Common dartboard component
│   ├── GameSelector.js       # Game selection interface
│   └── StatsPanel.js         # Statistics display
├── data/
│   ├── GameState.js          # Game state management
│   └── ThrowHistory.js       # Throw tracking with undo
└── utils/
    ├── EventEmitter.js       # Event system
    └── MathUtils.js          # Dart calculations
```
²
## 2. Core Data Structures

### Throw Object
```javascript
class Throw {
    constructor(alpha, d, zone, targetZone = null) {
        // Normalized angular coordinates
        this.alpha = alpha; // Angle in degrees (0-360)
        this.d = d;         // Distance to center normalized by distance to outer double line (0-1+)
        
        // Zone encoding:
        // T<number> for trebles (e.g., T20)
        // D<number> for doubles (e.g., D20)
        // S<sector><IN or OUT> for simple (e.g., S20IN, S20OUT)
        // "DB" for bull's eye (double bull)
        // "B" for simple bull
        // "OUT" for throws outside the dartboard
        this.zone = zone;
        
        // Optional target zone (same encoding as zone)
        this.targetZone = targetZone;
        
        // Metadata
        this.timestamp = Date.now();
        this.id = this.generateId();
    }
    
    // Helper method to parse zone information
    parseZone() {
        // Returns { type, sector, multiplier, region }
    }
    
    // Helper method to get cartesian coordinates from angular coordinates
    getCartesianCoordinates() {
        // Returns { x, y }
    }
    
    // Static method to create a Throw from cartesian coordinates
    static fromCartesian(x, y, zone, targetZone = null) {
        // Converts cartesian to angular coordinates
    }
}
```

### Game Configuration
```javascript
class GameConfig {
    constructor(gameType, variant, settings) {
        this.gameType = gameType;     // "501", "cricket", etc.
        this.variant = variant;       // "standard", "double-out", etc.
        this.settings = settings;     // Game-specific settings
        this.players = [];
        this.turnOrder = [];
    }
}
```

## 3. Modular Game System

### Base Game Class
```javascript
class GameBase {
    constructor(config) {
        this.config = config;
        this.state = new GameState();
        this.view = null; // Will be set by child classes
        this.eventEmitter = new EventEmitter();
    }
    
    // Abstract methods to be implemented by each game
    processThrow(throw) { throw new Error("Must implement processThrow"); }
    isGameComplete() { throw new Error("Must implement isGameComplete"); }
    getValidTargets() { throw new Error("Must implement getValidTargets"); }
    calculateScore(throws) { throw new Error("Must implement calculateScore"); }
    
    // Common functionality
    addThrow(throw) {
        this.state.addThrow(throw);
        this.processThrow(throw);
        this.updateView();
        this.eventEmitter.emit('throwAdded', throw);
    }
    
    undo(count = 1) {
        const undoneThrows = this.state.undo(count);
        this.recalculateGameState();
        this.updateView();
        return undoneThrows;
    }
}
```

### Game Registration System
```javascript
class GameRegistry {
    static games = new Map();
    
    static register(gameType, gameClass, viewClass, variants = []) {
        this.games.set(gameType, {
            gameClass,
            viewClass,
            variants,
            metadata: {
                name: gameType,
                description: gameClass.description || '',
                minPlayers: gameClass.minPlayers || 1,
                maxPlayers: gameClass.maxPlayers || 8
            }
        });
    }
    
    static createGame(gameType, variant, config) {
        const gameInfo = this.games.get(gameType);
        if (!gameInfo) throw new Error(`Unknown game type: ${gameType}`);
        
        const game = new gameInfo.gameClass(config);
        game.view = new gameInfo.viewClass(game);
        return game;
    }
}
```

## 4. Statistics System

### Statistics Engine
```javascript
class StatisticsEngine {
    static calculateMPR(throws, rounds) {
        // Marks Per Round calculation
        const marks = throws.filter(t => this.isMarkingThrow(t)).length;
        return rounds > 0 ? marks / rounds : 0;
    }
    
    static calculatePrecision(throws) {
        const throwsWithTarget = throws.filter(t => t.targetPoint);
        if (throwsWithTarget.length === 0) return null;
        
        const totalDistance = throwsWithTarget.reduce((sum, throw) => {
            return sum + this.calculateDistance(throw, throw.targetPoint);
        }, 0);
        
        return totalDistance / throwsWithTarget.length;
    }
    
    static calculateGrouping(throws) {
        // Calculate throw grouping (how close throws are to each other)
        if (throws.length < 2) return null;
        
        const centroid = this.calculateCentroid(throws);
        const distances = throws.map(t => this.calculateDistance(t, centroid));
        return distances.reduce((sum, d) => sum + d, 0) / distances.length;
    }
}
```

## 5. Network Communication

### Network Manager
```javascript
class NetworkManager {
    constructor() {
        this.mqttClient = null;
        this.apiEndpoint = '';
        this.eventEmitter = new EventEmitter();
    }
    
    // MQTT Integration
    connectMQTT(brokerUrl, topic) {
        // Connect to MQTT broker for real-time throw detection
        this.mqttClient = mqtt.connect(brokerUrl);
        this.mqttClient.subscribe(topic);
        
        this.mqttClient.on('message', (topic, message) => {
            const throwData = JSON.parse(message.toString());
            this.eventEmitter.emit('throwReceived', throwData);
        });
    }
    
    // API Integration
    async syncGameData(gameData) {
        try {
            const response = await fetch(`${this.apiEndpoint}/games`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameData)
            });
            return await response.json();
        } catch (error) {
            console.error('Sync failed:', error);
            throw error;
        }
    }
    
    async getPlayerStats(playerId) {
        try {
            const response = await fetch(`${this.apiEndpoint}/players/${playerId}/stats`);
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch player stats:', error);
            throw error;
        }
    }
}
```

## 6. Platform Adaptation

### Platform Adapter
```javascript
class PlatformAdapter {
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    static adaptInterface() {
        if (this.isMobile()) {
            document.body.classList.add('mobile-interface');
            this.setupTouchEvents();
        } else {
            document.body.classList.add('desktop-interface');
            this.setupMouseEvents();
        }
    }
    
    static setupTouchEvents() {
        // Configure touch-friendly interface
        document.addEventListener('touchstart', this.handleTouch);
        document.addEventListener('touchmove', this.handleTouchMove);
    }
    
    static setupMouseEvents() {
        // Configure mouse interface
        document.addEventListener('click', this.handleClick);
        document.addEventListener('mousemove', this.handleMouseMove);
    }
}
```

## 7. Throw Management with Undo/Edit

### Throw Manager
```javascript
class ThrowManager {
    constructor() {
        this.throwHistory = [];
        this.undoStack = [];
        this.maxHistorySize = 1000;
    }
    
    addThrow(throw) {
        this.throwHistory.push(throw);
        this.undoStack = []; // Clear undo stack on new throw
        this.trimHistory();
    }
    
    undo(count = 1) {
        const undoneThrows = [];
        for (let i = 0; i < count && this.throwHistory.length > 0; i++) {
            const throw = this.throwHistory.pop();
            this.undoStack.push(throw);
            undoneThrows.push(throw);
        }
        return undoneThrows;
    }
    
    redo(count = 1) {
        const redoneThrows = [];
        for (let i = 0; i < count && this.undoStack.length > 0; i++) {
            const throw = this.undoStack.pop();
            this.throwHistory.push(throw);
            redoneThrows.push(throw);
        }
        return redoneThrows;
    }
    
    editThrow(throwId, newData) {
        const throwIndex = this.throwHistory.findIndex(t => t.id === throwId);
        if (throwIndex !== -1) {
            const oldThrow = { ...this.throwHistory[throwIndex] };
            Object.assign(this.throwHistory[throwIndex], newData);
            return { oldThrow, newThrow: this.throwHistory[throwIndex] };
        }
        return null;
    }
}
```

## 8. Implementation Steps

### Phase 1: Core Foundation
1. Implement EventEmitter and basic utilities
2. Create ThrowManager with undo/redo functionality
3. Build basic GameEngine structure
4. Implement DartboardView component

### Phase 2: Game Modularity
1. Create GameBase abstract class
2. Implement GameRegistry system
3. Build first game module (501)
4. Create game variant system

### Phase 3: Statistics & Data
1. Implement StatisticsEngine
2. Add throw editing functionality
3. Create data persistence layer
4. Build stats visualization

### Phase 4: Network Integration
1. Implement NetworkManager
2. Add MQTT connectivity
3. Create API integration
4. Add offline/online synchronization

### Phase 5: Platform Optimization
1. Implement PlatformAdapter
2. Optimize for mobile devices
3. Add responsive design
4. Performance optimization

## 9. Technology Considerations

### HTML5 Features Used
- Canvas for dartboard rendering
- LocalStorage for offline data
- WebSockets/MQTT for real-time communication
- Service Workers for offline functionality
- Responsive design with CSS Grid/Flexbox

### Performance Optimizations
- Lazy loading of game modules
- Canvas optimization for smooth rendering
- Efficient event handling
- Memory management for throw history

### Cross-Platform Compatibility
- Progressive Web App (PWA) support
- Touch and mouse event handling
- Responsive breakpoints
- Platform-specific UI adaptations

This architecture provides a solid foundation for your modular darts application with all the features you've requested. Each component is designed to be independent and extensible, making it easy to add new games and features over time.
