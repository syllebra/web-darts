// Game State
const gameState = {
    players: [
        { name: 'Alex Thunder', score: 0, numbers: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, bull: 0 } },
        { name: 'Morgan Strike', score: 0, numbers: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, bull: 0 } },
        { name: 'Sarah Dart', score: 0, numbers: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, bull: 0 } },
        { name: 'Jordan Bullseye', score: 0, numbers: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, bull: 0 } }
    ],
    currentPlayer: 0,
    currentRound: 1,
    dartsThrown: 0,
    maxRounds: 20,
    targetNumbers: [20, 19, 18, 17, 16, 15, 'bull']
};

// Initialize game
function initGame() {
    updateUI();
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    // Hit cells
    document.querySelectorAll('.hit-cell').forEach((cell, index) => {
        cell.addEventListener('click', function () {
            handleHit(this, index);
        });
    });

    // Control buttons
    document.getElementById('next-turn').addEventListener('click', () => {
        soundEffects.playButtonClick();
        nextTurn();
    });
    document.getElementById('reset-game').addEventListener('click', () => {
        soundEffects.playButtonClick();
        resetGame();
    });

    // Sound controls
    document.getElementById('toggle-sound').addEventListener('click', function() {
        const isEnabled = soundEffects.toggle();
        this.innerHTML = isEnabled ? '🔊 Sound ON' : '🔇 Sound OFF';
        this.classList.toggle('btn-outline-light', isEnabled);
        this.classList.toggle('btn-outline-secondary', !isEnabled);
        soundEffects.playButtonClick();
    });

    document.getElementById('volume-slider').addEventListener('input', function() {
        soundEffects.setVolume(this.value / 100);
    });
}

// Handle hit on dartboard
function handleHit(cell, index) {
    if (gameState.dartsThrown >= 3) return;

    const playerIndex = gameState.currentPlayer;
    const rowIndex = Math.floor(index / 4);
    const colIndex = index % 4;

    if (colIndex >= 4) return; // Only handle player columns

    const targetNumber = gameState.targetNumbers[rowIndex];
    const player = gameState.players[playerIndex];

    // Only allow hits for current player's column
    if (colIndex !== playerIndex) return;

    // Add hit mark
    const currentHits = player.numbers[targetNumber];
    if (currentHits < 3) {
        player.numbers[targetNumber]++;
        updateHitDisplay(cell, player.numbers[targetNumber]);

        // Add score if number is closed (3 hits) and others don't have it closed
        if (player.numbers[targetNumber] === 3) {
            soundEffects.playNumberClose();
            animateClose(cell);
            checkForPoints(playerIndex, targetNumber);
        } else {
            soundEffects.playDartHit();
            animateHit(cell);
        }

        gameState.dartsThrown++;
        updateUI();

        // Auto advance turn after 3 darts
        if (gameState.dartsThrown >= 3) {
            setTimeout(nextTurn, 1000);
        }
    }
}

// Update hit display
function updateHitDisplay(cell, hits) {
    const marks = ['', '❌', '⭕', '🎯'];
    cell.innerHTML = `<span class="hit-mark">${marks[hits] || ''}</span>`;

    if (hits === 3) {
        cell.classList.add('closed-mark');
    }
}

// Check for points after closing a number
function checkForPoints(playerIndex, targetNumber) {
    const player = gameState.players[playerIndex];

    // Check if any other player has this number closed
    const othersHaveClosed = gameState.players.some((p, i) =>
        i !== playerIndex && p.numbers[targetNumber] >= 3
    );

    if (!othersHaveClosed) {
        // Award points based on number value
        const pointValue = targetNumber === 'bull' ? 25 : targetNumber;
        player.score += pointValue;
        soundEffects.playScore();
        animateScore(playerIndex);
    }
}

// Next turn
function nextTurn() {
    soundEffects.playTurnChange();
    gameState.dartsThrown = 0;
    gameState.currentPlayer = (gameState.currentPlayer + 1) % 4;

    if (gameState.currentPlayer === 0) {
        gameState.currentRound++;
    }

    updateUI();
    animateNewTurn();
}

// Reset game
function resetGame() {
    soundEffects.playGameReset();
    gameState.currentPlayer = 0;
    gameState.currentRound = 1;
    gameState.dartsThrown = 0;

    gameState.players.forEach(player => {
        player.score = 0;
        Object.keys(player.numbers).forEach(key => {
            player.numbers[key] = 0;
        });
    });

    // Clear all hit marks
    document.querySelectorAll('.hit-cell').forEach(cell => {
        cell.innerHTML = '';
        cell.classList.remove('closed-mark');
    });

    updateUI();
}

// Update UI
function updateUI() {
    // Update scores
    gameState.players.forEach((player, index) => {
        document.getElementById(`score-${index}`).textContent = player.score;
    });

    // Update current player indicator
    document.querySelectorAll('.score-card').forEach((card, index) => {
        card.classList.toggle('current-player', index === gameState.currentPlayer);
        const indicator = card.querySelector('.turn-indicator');
        if (indicator) {
            indicator.style.display = index === gameState.currentPlayer ? 'flex' : 'none';
        }
    });

    // Update stats
    document.getElementById('current-round').textContent = `${gameState.currentRound}/${gameState.maxRounds}`;
    document.getElementById('current-player-name').textContent = `Current: ${gameState.players[gameState.currentPlayer].name}`;
    document.getElementById('darts-thrown').textContent = `Darts: ${gameState.dartsThrown}/3`;
}

// Animations
function animateHit(cell) {
    cell.classList.add('hit-animation');
    setTimeout(() => cell.classList.remove('hit-animation'), 500);
}

function animateClose(cell) {
    cell.classList.add('close-animation');
    setTimeout(() => cell.classList.remove('close-animation'), 800);
}

function animateScore(playerIndex) {
    const scoreElement = document.getElementById(`score-${playerIndex}`);
    scoreElement.classList.add('score-animation');
    setTimeout(() => scoreElement.classList.remove('score-animation'), 600);
}

function animateNewTurn() {
    const currentPlayerCard = document.getElementById(`player-${gameState.currentPlayer}`);
    currentPlayerCard.classList.add('new-turn-glow');
    setTimeout(() => currentPlayerCard.classList.remove('new-turn-glow'), 1000);
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);

// Auto-demo mode (optional - remove if not wanted)
let demoMode = false;
setTimeout(() => {
    if (confirm('Would you like to see an auto-demo of the game?')) {
        demoMode = true;
        runDemo();
    }
}, 2000);

function runDemo() {
    if (!demoMode) return;

    const randomHit = () => {
        const hitCells = document.querySelectorAll('.hit-cell');
        const playerCells = [];

        // Get cells for current player
        for (let i = 0; i < 7; i++) {
            const cellIndex = i * 4 + gameState.currentPlayer;
            if (hitCells[cellIndex]) {
                playerCells.push(hitCells[cellIndex]);
            }
        }

        if (playerCells.length > 0) {
            const randomCell = playerCells[Math.floor(Math.random() * playerCells.length)];
            randomCell.click();
        }
    };

    const demoInterval = setInterval(() => {
        if (gameState.currentRound > 5) {
            clearInterval(demoInterval);
            demoMode = false;
            return;
        }

        randomHit();
    }, 1500);
}
