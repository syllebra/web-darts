// Main Application
class DartsApp {
  constructor() {
    this.currentGame = null;
    this.dartboard = null;
    this.throwHistory = [];
    this.undoStack = [];
    this.editMode = false;
    this.networkManager = null;
    this.dartboardPanel = null;
    this.dartboardToggle = null;
    this.isPanelOpen = false;

    this.init();
  }

  init() {
    this.dartboard = new DartboardRenderer(document.getElementById("dartboard"));
    this.dartboardPanel = document.getElementById("dartboardPanel");
    this.dartboardToggle = document.getElementById("dartboardToggle");
    this.dartboardOverlay = document.getElementById("dartboardOverlay");

    this.setupEventListeners();
    this.setupPanelControls();
    this.startGame("X01");
    this.updateUI();
  }

  setupEventListeners() {
    // Dartboard click handler
    document.getElementById("dartboard").addEventListener("click", (e) => {
      if (!this.currentGame || this.currentGame.isGameComplete()) return;

      const dartThrow = this.dartboard.getThrowFromClick(e.clientX, e.clientY);
      this.addThrow(dartThrow);
    });

    // Game selector
    document.getElementById("gameSelect").addEventListener("change", (e) => {
      this.startGame(e.target.value);
    });

    // Network simulation (MQTT placeholder)
    this.simulateNetworkConnection();
  }

  setupPanelControls() {
    // Toggle panel with button
    this.dartboardToggle.addEventListener("click", () => {
      this.toggleDartboardPanel();
    });

    // Close panel when clicking overlay
    this.dartboardOverlay.addEventListener("click", () => {
      this.closeDartboardPanel();
    });

    // Scroll to open panel functionality
    let scrollTimeout;
    let lastScrollY = window.scrollY;

    window.addEventListener("scroll", () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = Math.abs(currentScrollY - lastScrollY);

      // Clear existing timeout
      clearTimeout(scrollTimeout);

      // If significant scroll detected and panel is closed
      if (scrollDelta > 50 && !this.isPanelOpen) {
        scrollTimeout = setTimeout(() => {
          this.openDartboardPanel();
        }, 300); // Delay to avoid accidental triggers
      }

      lastScrollY = currentScrollY;
    });

    // Touch gestures for panel
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isDragging = false;
    let isVerticalScroll = false;

    this.dartboardPanel.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      currentX = startX;
      currentY = startY;
      isDragging = true;
      isVerticalScroll = false;
    });

    this.dartboardPanel.addEventListener("touchmove", (e) => {
      if (!isDragging) return;

      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;

      const diffX = currentX - startX;
      const diffY = currentY - startY;

      // Determine if this is a vertical scroll gesture
      if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 20) {
        isVerticalScroll = true;
      }

      // Handle horizontal swipe to close
      if (!isVerticalScroll && this.isPanelOpen && diffX < -50) {
        e.preventDefault();
        const progress = Math.min(1, Math.abs(diffX) / 200);
        this.dartboardPanel.style.transform = `translateX(${diffX}px)`;
        this.dartboardPanel.style.opacity = 1 - progress * 0.5;
      }
    });

    this.dartboardPanel.addEventListener("touchend", (e) => {
      if (!isDragging) return;
      isDragging = false;

      // Reset panel position
      this.dartboardPanel.style.transform = "";
      this.dartboardPanel.style.opacity = "";

      if (!isVerticalScroll) {
        const threshold = 100;
        const diffX = currentX - startX;

        if (diffX < -threshold) {
          this.closeDartboardPanel();
        }
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isPanelOpen) {
        this.closeDartboardPanel();
      } else if (e.key === "d" || e.key === "D") {
        if (!this.isPanelOpen) {
          this.openDartboardPanel();
        }
      }
    });

    // Double tap to open panel (mobile)
    let lastTap = 0;
    document.addEventListener("touchend", (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;

      if (tapLength < 500 && tapLength > 0 && !this.isPanelOpen) {
        this.openDartboardPanel();
      }

      lastTap = currentTime;
    });
  }

  toggleDartboardPanel() {
    if (this.isPanelOpen) {
      this.closeDartboardPanel();
    } else {
      this.openDartboardPanel();
    }
  }

  openDartboardPanel() {
    this.dartboardPanel.classList.add("active");
    this.dartboardOverlay.classList.add("active");
    this.dartboardToggle.classList.add("active");
    this.isPanelOpen = true;
  }

  closeDartboardPanel() {
    this.dartboardPanel.classList.remove("active");
    this.dartboardOverlay.classList.remove("active");
    this.dartboardToggle.classList.remove("active");
    this.isPanelOpen = false;
  }

  startGame(gameType, preserveHistory = false) {
    const config = {
      gameType: gameType,
      players: ["Player 1", "Player 2"], // Now supports multiplayer
    };

    this.currentGame = GameRegistry.createGame(gameType, config);
    this.setupGameEventListeners();

    if (!preserveHistory) {
      this.throwHistory = [];
      this.undoStack = [];
    }

    this.updateUI();
  }

  setupGameEventListeners() {
    this.currentGame.eventEmitter.on("throwAdded", (dartThrow) => {
      this.updateThrowHistory();
      this.updateStats();
    });

    this.currentGame.eventEmitter.on("scoreUpdate", (data) => {
      document.getElementById("currentScore").textContent = data.score;

      // Update all player scores
      const playersContainer = document.getElementById("playersContainer");
      if (!playersContainer) return;

      playersContainer.innerHTML = "";
      data.players.forEach((player) => {
        const playerEl = document.createElement("div");
        playerEl.className = `player-score ${player.isCurrent ? "active-player" : ""}`;
        playerEl.id = `player-${player.name}`;
        playerEl.innerHTML = `
          <span>${player.name}</span>
          <span>${player.score}</span>
        `;
        playersContainer.appendChild(playerEl);
      });
    });

    this.currentGame.eventEmitter.on("gameComplete", (winner) => {
      alert(`Game Complete! Winner: ${winner}`);
    });

    this.currentGame.eventEmitter.on("bust", (player) => {
      console.log(`${player} went bust!`);
    });

    // this.currentGame.eventEmitter.on("roundChanged", (roundNumber) => {
    //   this.showRoundAnimation(roundNumber);
    // });
    this.currentGame.eventEmitter.on("playerChanged", (data) => {
      this.showRoundAnimation(data.round);
    });
  }

  showRoundAnimation(roundNumber) {
    if (this.isPanelOpen) this.toggleDartboardPanel();
    if (!this.roundAnimation) {
      this.roundAnimation = new RoundAnimation();
    }
    this.roundAnimation.show(roundNumber, this.currentGame.getCurrentPlayer());
  }

  addThrow(dartThrow) {
    this.throwHistory.push(dartThrow);
    this.currentGame.addThrow(dartThrow);
    this.undoStack = []; // Clear undo stack
    this.updateUI();
  }

  undo(count = 1) {
    if (this.throwHistory.length === 0) return;

    // Only undo one throw by default
    const throw_ = this.throwHistory.pop();
    this.undoStack.push(throw_);

    this.recalculateGameState();
    this.updateUI();
    console.log(`Undid throw: ${this.formatThrow(throw_)}`);
  }

  redo(count = 1) {
    if (this.undoStack.length === 0) return;

    const redoneThrows = [];
    for (let i = 0; i < count && this.undoStack.length > 0; i++) {
      const throw_ = this.undoStack.pop();
      this.throwHistory.push(throw_);
      redoneThrows.push(throw_);
    }

    this.recalculateGameState();
    this.updateUI();
    console.log(`Redid ${redoneThrows.length} throws`);
  }

  recalculateGameState() {
    // Restart game and replay all throws
    const gameType = this.currentGame.config.gameType;
    this.startGame(gameType, true);

    this.throwHistory.forEach((dartThrow) => {
      this.currentGame.addThrow(dartThrow);
    });
  }

  resetGame() {
    if (confirm("Are you sure you want to reset the game?")) {
      const gameType = this.currentGame.config.gameType;
      this.startGame(gameType);
    }
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    document.querySelector('[onclick="app.toggleEditMode()"]').textContent = this.editMode ? "Exit Edit" : "Edit Mode";

    if (this.editMode) {
      this.setupEditMode();
    } else {
      this.exitEditMode();
    }
  }

  setupEditMode() {
    console.log("Edit mode enabled - click on throws in history to edit them");
    document.querySelectorAll(".throw-item").forEach((item) => {
      item.classList.add("editable");
    });
  }

  exitEditMode() {
    console.log("Edit mode disabled");
    document.querySelectorAll(".throw-item").forEach((item) => {
      item.classList.remove("editable");
    });
  }

  editThrow(throwId) {
    if (!this.editMode) return;

    const dartThrow = this.throwHistory.find((t) => t.id === throwId);
    if (!dartThrow) return;

    const newScore = prompt(`Edit throw score (current: ${dartThrow.score}):`, dartThrow.score);
    if (newScore !== null && !isNaN(newScore)) {
      dartThrow.score = parseInt(newScore);
      this.recalculateGameState();
      this.updateUI();
    }
  }

  updateUI() {
    this.updateGameInfo();
    this.updateThrowHistory();
    this.updateStats();
  }

  updateGameInfo() {
    if (!this.currentGame) return;

    document.getElementById("currentGame").textContent = this.currentGame.config.gameType.toUpperCase() + " Game";
    document.getElementById("currentPlayer").textContent = this.currentGame.getCurrentPlayer();

    if (this.currentGame.getCurrentScore) {
      document.getElementById("currentScore").textContent = this.currentGame.getCurrentScore();
    }
  }

  updateThrowHistory() {
    const throwList = document.getElementById("throwList");
    throwList.innerHTML = "";

    const recentThrows = this.throwHistory.slice(-10).reverse();

    recentThrows.forEach((dartThrow) => {
      const throwItem = document.createElement("div");
      throwItem.className = "throw-item";
      throwItem.innerHTML = `
                <span>${this.formatThrow(dartThrow)}</span>
                <span>${dartThrow.score}</span>
            `;

      if (this.editMode) {
        throwItem.classList.add("editable");
        throwItem.addEventListener("click", () => this.editThrow(dartThrow.id));
      }

      throwList.appendChild(throwItem);
    });
  }

  formatThrow(dartThrow) {
    if (dartThrow.score === 0) return "Miss";
    if (dartThrow.score === 25) return "Bull";
    if (dartThrow.score === 50) return "Bull's Eye";

    const multiplierText = dartThrow.multiplier === 1 ? "S" : dartThrow.multiplier === 2 ? "D" : "T";
    return `${multiplierText}${dartThrow.sector}`;
  }

  updateStats() {
    // Group throws by player
    const throwsByPlayer = {};
    const roundsByPlayer = {};
    this.currentGame.players.forEach((player) => {
      throwsByPlayer[player] = this.throwHistory.filter((t) => this.currentGame.getCurrentPlayer() === player);
      roundsByPlayer[player] = Math.floor(throwsByPlayer[player].length / this.currentGame.throwsPerRound);
    });

    // Calculate player stats
    const playerStats = StatisticsEngine.calculatePlayerStats(this.currentGame.players, throwsByPlayer, roundsByPlayer);

    // Update UI with player stats
    const statsContainer = document.getElementById("statsContainer");
    statsContainer.innerHTML = "";

    this.currentGame.players.forEach((player) => {
      const stats = playerStats[player];
      const playerStatEl = document.createElement("div");
      playerStatEl.className = "player-stats";
      playerStatEl.innerHTML = `
        <h3>${player}</h3>
        <div>MPR: ${stats.mpr.toFixed(2)}</div>
        <div>Precision: ${stats.precision ? stats.precision.toFixed(1) + "px" : "-"}</div>
        <div>Grouping: ${stats.grouping ? stats.grouping.toFixed(1) + "px" : "-"}</div>
      `;
      statsContainer.appendChild(playerStatEl);
    });
  }

  simulateNetworkConnection() {
    // Simulate MQTT connection status
    const statusEl = document.getElementById("mqttStatus");
    let connected = false;

    setInterval(() => {
      connected = !connected;
      statusEl.className = connected ? "connection-status" : "connection-status disconnected";
    }, 3000);

    // Simulate receiving throws from external system
    // 20% chance every 5 seconds
    setTimeout(() => {
      if (Math.random() > 0.8) this.simulateExternalThrow();
    }, 5000);
  }

  simulateExternalThrow() {
    if (!this.currentGame || this.currentGame.isGameComplete()) return;

    // Simulate a throw detected by external system
    const sectors = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const sector = sectors[Math.floor(Math.random() * sectors.length)];
    const multiplier = Math.random() > 0.8 ? (Math.random() > 0.5 ? 2 : 3) : 1;
    const score = sector * multiplier;

    const dartThrow = new Throw(
      Math.random() * 100 - 50, // Random position
      Math.random() * 100 - 50,
      sector,
      multiplier,
      score
    );

    console.log("External throw detected:", this.formatThrow(dartThrow));
    this.addThrow(dartThrow);
  }
}
