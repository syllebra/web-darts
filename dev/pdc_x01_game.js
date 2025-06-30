// Enhanced Game configuration and logic for X01 darts scoreboard
class GameX01 {
  constructor() {
    this.config = {
      gameHeader: "First to 11",
      matchTitle: "2025 Premier League Final",
      broadcaster: "BX Sports",
      showRoutes: true,
      currentPlayerTurn: 0,
      gameFormat: 501, // 301, 501, 701, 901, 1001, 1501
      dartsPerRound: 3, // 1-6 darts per round
      doubleIn: false, // Must start with double
      doubleOut: true, // Must finish with double
      players: [
        { name: "Littler", flag: "england", legs: 5, score: 52, finishRoute: ["12", "D20"], gameStarted: true },
        {
          name: "Humphries",
          flag: "england",
          legs: 3,
          score: 170,
          finishRoute: ["T20", "T20", "BULL"],
          gameStarted: true,
        },
      ],
    };
  }

  // Function to generate all possible dart combinations
  generateDartCombinations(maxDarts) {
    const singles = Array.from({ length: 20 }, (_, i) => i + 1).concat([25]); // 1-20 + Bull
    const doubles = Array.from({ length: 20 }, (_, i) => `D${i + 1}`).concat(["DBULL"]); // D1-D20 + Double Bull
    const trebles = Array.from({ length: 20 }, (_, i) => `T${i + 1}`); // T1-T20

    const allDarts = [
      ...singles,
      ...doubles.map((d) => ({ notation: d, value: parseInt(d.slice(1)) * 2 })),
      ...trebles.map((t) => ({ notation: t, value: parseInt(t.slice(1)) * 3 })),
      { notation: "BULL", value: 25 },
      { notation: "DBULL", value: 50 },
    ];

    // Flatten for easier processing
    const dartValues = [];
    singles.forEach((s) => dartValues.push({ notation: s.toString(), value: s }));
    doubles.forEach((d) => {
      const val = d === "DBULL" ? 50 : parseInt(d.slice(1)) * 2;
      dartValues.push({ notation: d, value: val });
    });
    trebles.forEach((t) => {
      dartValues.push({ notation: t, value: parseInt(t.slice(1)) * 3 });
    });
    dartValues.push({ notation: "BULL", value: 25 });

    return dartValues;
  }

  // Check if a dart is a double
  isDouble(dart) {
    return dart.startsWith("D") || dart === "DBULL";
  }

  // Function to generate finish routes based on score and game rules
  generateFinishRoute(score) {
    if (score <= 0) return [];
    if (score > 180 * this.config.dartsPerRound) return [];

    const dartValues = this.generateDartCombinations(this.config.dartsPerRound);
    const routes = {};

    // Generate routes for 1 to maxDarts
    for (let numDarts = 1; numDarts <= this.config.dartsPerRound; numDarts++) {
      this.generateRoutesForDarts(score, numDarts, dartValues, routes);
    }

    return routes[score] || [];
  }

  // Recursive function to generate routes for specific number of darts
  generateRoutesForDarts(targetScore, numDarts, dartValues, routes) {
    if (numDarts === 1) {
      // Single dart finish
      dartValues.forEach((dart) => {
        if (dart.value === targetScore) {
          if (!this.config.doubleOut || this.isDouble(dart.notation)) {
            if (!routes[targetScore]) routes[targetScore] = [];
            if (!routes[targetScore].includes([dart.notation])) {
              routes[targetScore].push([dart.notation]);
            }
          }
        }
      });
      return;
    }

    // Multi-dart combinations
    this.generateCombinations(dartValues, numDarts, targetScore, [], routes);
  }

  // Generate all combinations for multi-dart finishes
  generateCombinations(dartValues, remainingDarts, remainingScore, currentCombo, routes) {
    if (remainingDarts === 0) {
      if (remainingScore === 0) {
        const lastDart = currentCombo[currentCombo.length - 1];
        if (!this.config.doubleOut || this.isDouble(lastDart)) {
          if (
            !routes[
              remainingScore +
                currentCombo.reduce((sum, dart) => {
                  const dartObj = dartValues.find((d) => d.notation === dart);
                  return sum + (dartObj ? dartObj.value : 0);
                }, 0)
            ]
          ) {
            const totalScore = currentCombo.reduce((sum, dart) => {
              const dartObj = dartValues.find((d) => d.notation === dart);
              return sum + (dartObj ? dartObj.value : 0);
            }, 0);
            if (!routes[totalScore]) routes[totalScore] = [];
            if (!routes[totalScore].some((route) => JSON.stringify(route) === JSON.stringify(currentCombo))) {
              routes[totalScore].push([...currentCombo]);
            }
          }
        }
      }
      return;
    }

    dartValues.forEach((dart) => {
      if (dart.value <= remainingScore) {
        this.generateCombinations(
          dartValues,
          remainingDarts - 1,
          remainingScore - dart.value,
          [...currentCombo, dart.notation],
          routes
        );
      }
    });
  }

  // Calculate finish route for any score
  calculateFinishRoute(score) {
    const routes = [];
    const maxDarts = Math.min(this.config.dartsPerRound, 3);

    // 1-dart finishes (score <= 60)
    this.calculate1DartFinishes(score, routes);

    // 2-dart finishes (score <= 110)
    if (maxDarts >= 2 && score <= 110) {
      this.calculate2DartFinishes(score, routes);
    }

    // 3-dart finishes (score <= 180)
    if (maxDarts >= 3 && score <= 180 && routes.length === 0) {
      this.calculate3DartFinishes(score, routes);
    }

    return routes.length > 0 ? routes[0] : routes;
  }

  // Calculate all possible 1-dart finishes
  calculate1DartFinishes(score, routes) {
    // Singles (1-20)
    if (score <= 20 && !this.config.doubleOut) {
      routes.push([score.toString()]);
    }

    // Bull (25)
    if (score === 25 && !this.config.doubleOut) {
      routes.push(["BULL"]);
    }

    // Doubles (2, 4, 6, ..., 40)
    if (score % 2 === 0 && score >= 2 && score <= 40) {
      routes.push([`D${score / 2}`]);
    }

    // Double Bull (50)
    if (score === 50) {
      routes.push(["DBULL"]);
    }

    // Trebles (3, 6, 9, ..., 60)
    if (score % 3 === 0 && score >= 3 && score <= 60 && !this.config.doubleOut) {
      routes.push([`T${score / 3}`]);
    }
  }

  // Calculate all possible 2-dart finishes
  calculate2DartFinishes(score, routes) {
    // Try all possible first dart combinations
    const firstDarts = [
      ...Array.from({ length: 20 }, (_, i) => ({ notation: (i + 1).toString(), value: i + 1 })), // Singles 1-20
      { notation: "BULL", value: 25 }, // Bull
      ...Array.from({ length: 20 }, (_, i) => ({ notation: `D${i + 1}`, value: (i + 1) * 2 })), // Doubles D1-D20
      { notation: "DBULL", value: 50 }, // Double Bull
      ...Array.from({ length: 20 }, (_, i) => ({ notation: `T${i + 1}`, value: (i + 1) * 3 })), // Trebles T1-T20
    ];

    for (const firstDart of firstDarts) {
      if (firstDart.value >= score) continue; // First dart can't be >= total score

      const remaining = score - firstDart.value;

      // Check if remaining can be finished with second dart
      const secondDartOptions = [];

      // Singles (1-20)
      if (remaining <= 20 && remaining >= 1) {
        if (!this.config.doubleOut) {
          secondDartOptions.push(remaining.toString());
        }
      }

      // Bull (25)
      if (remaining === 25) {
        if (!this.config.doubleOut) {
          secondDartOptions.push("BULL");
        }
      }

      // Doubles (2, 4, 6, ..., 40)
      if (remaining % 2 === 0 && remaining >= 2 && remaining <= 40) {
        secondDartOptions.push(`D${remaining / 2}`);
      }

      // Double Bull (50)
      if (remaining === 50) {
        secondDartOptions.push("DBULL");
      }

      // Trebles (3, 6, 9, ..., 60)
      if (remaining % 3 === 0 && remaining >= 3 && remaining <= 60) {
        if (!this.config.doubleOut) {
          secondDartOptions.push(`T${remaining / 3}`);
        }
      }

      // Add valid combinations
      for (const secondDart of secondDartOptions) {
        if (!routes.some((route) => route.length === 2 && route[0] === firstDart.notation && route[1] === secondDart)) {
          routes.push([firstDart.notation, secondDart]);
        }
      }
    }
  }

  // Calculate all possible 3-dart finishes
  calculate3DartFinishes(score, routes) {
    // For 3-dart finishes, focus on high-scoring combinations
    // This is computationally intensive, so we'll use strategic combinations

    const highValueDarts = [
      { notation: "T20", value: 60 },
      { notation: "T19", value: 57 },
      { notation: "T18", value: 54 },
      { notation: "T17", value: 51 },
      { notation: "T16", value: 48 },
      { notation: "T15", value: 45 },
      { notation: "BULL", value: 25 },
      { notation: "DBULL", value: 50 },
    ];

    // Try combinations starting with high-value darts
    for (const firstDart of highValueDarts) {
      if (firstDart.value >= score) continue;

      const remaining1 = score - firstDart.value;

      for (const secondDart of highValueDarts) {
        if (secondDart.value >= remaining1) continue;

        const remaining2 = remaining1 - secondDart.value;

        // Check if remaining2 can be finished with any valid dart
        const finishOptions = this.getValidFinishDarts(remaining2);

        for (const finishDart of finishOptions) {
          if (
            !routes.some(
              (route) =>
                route.length === 3 &&
                route[0] === firstDart.notation &&
                route[1] === secondDart.notation &&
                route[2] === finishDart
            )
          ) {
            routes.push([firstDart.notation, secondDart.notation, finishDart]);
            break; // Only add one 3-dart route per combination for performance
          }
        }
      }
    }

    // Special high-scoring 3-dart combinations
    const specialCombos = [
      { score: 180, route: ["T20", "T20", "T20"] },
      { score: 177, route: ["T20", "T19", "T20"] },
      { score: 176, route: ["T20", "T20", "T19"] },
      { score: 175, route: ["T20", "T20", "T18"] },
      { score: 174, route: ["T20", "T18", "T20"] },
      { score: 173, route: ["T20", "T19", "T18"] },
      { score: 172, route: ["T20", "T20", "T17"] },
      { score: 171, route: ["T20", "T17", "T20"] },
      { score: 170, route: ["T20", "T20", "BULL"] },
      { score: 169, route: ["T20", "T19", "T17"] },
      { score: 168, route: ["T20", "T20", "T16"] },
      { score: 167, route: ["T20", "T19", "BULL"] },
      { score: 166, route: ["T20", "T18", "T16"] },
      { score: 165, route: ["T20", "T19", "T15"] },
      { score: 164, route: ["T20", "T18", "BULL"] },
      { score: 163, route: ["T20", "T17", "T15"] },
      { score: 162, route: ["T20", "T20", "T14"] },
      { score: 161, route: ["T20", "T17", "BULL"] },
      { score: 160, route: ["T20", "T20", "D20"] },
      { score: 159, route: ["T20", "T19", "T14"] },
      { score: 158, route: ["T20", "T20", "D19"] },
      { score: 157, route: ["T20", "T19", "D20"] },
    ];

    for (const combo of specialCombos) {
      if (combo.score === score) {
        const lastDart = combo.route[combo.route.length - 1];
        if (!this.config.doubleOut || this.isDouble(lastDart)) {
          routes.unshift(combo.route); // Add to beginning as preferred route
        }
      }
    }
  }

  // Get valid finishing darts for a score
  getValidFinishDarts(score) {
    const finishDarts = [];

    // Singles (1-20)
    if (score <= 20 && score >= 1 && !this.config.doubleOut) {
      finishDarts.push(score.toString());
    }

    // Bull (25)
    if (score === 25 && !this.config.doubleOut) {
      finishDarts.push("BULL");
    }

    // Doubles (2, 4, 6, ..., 40)
    if (score % 2 === 0 && score >= 2 && score <= 40) {
      finishDarts.push(`D${score / 2}`);
    }

    // Double Bull (50)
    if (score === 50) {
      finishDarts.push("DBULL");
    }

    // Trebles (3, 6, 9, ..., 60)
    if (score % 3 === 0 && score >= 3 && score <= 60 && !this.config.doubleOut) {
      finishDarts.push(`T${score / 3}`);
    }

    return finishDarts;
  }
  // Control functions
  setGameFormat(format) {
    const validFormats = [301, 501, 701, 901, 1001, 1501];
    if (validFormats.includes(format)) {
      this.config.gameFormat = format;
      // Reset player scores to game format
      this.config.players.forEach((player) => {
        player.score = format;
        player.gameStarted = false;
        player.finishRoute = [];
      });
    }
  }

  setDartsPerRound(darts) {
    if (darts >= 1 && darts <= 6) {
      this.config.dartsPerRound = darts;
      // Recalculate finish routes for all players
      this.config.players.forEach((player) => {
        player.finishRoute = this.calculateFinishRoute(player.score);
      });
    }
  }

  setDoubleIn(enabled) {
    this.config.doubleIn = enabled;
    this.config.players.forEach((player) => {
      player.finishRoute = this.calculateFinishRoute(player.score);
    });
  }

  setDoubleOut(enabled) {
    this.config.doubleOut = enabled;
    // Recalculate finish routes for all players
    this.config.players.forEach((player) => {
      player.finishRoute = this.calculateFinishRoute(player.score);
    });
    this.config.players.forEach((player) => {
      player.finishRoute = this.calculateFinishRoute(player.score);
    });
  }

  addPlayer(name, score) {
    name = name || `Player ${this.config.players.length + 1}`;
    score = parseInt(score) || this.config.gameFormat;
    this.config.players.push({
      name: name,
      flag: "england",
      legs: 0,
      score: score,
      gameStarted: false,
      finishRoute: this.calculateFinishRoute(score),
    });
    this.config.players.forEach((player) => {
      player.finishRoute = this.calculateFinishRoute(player.score);
    });
  }

  removePlayer() {
    if (this.config.players.length > 1) {
      this.config.players.pop();
      if (this.config.currentPlayerTurn >= this.config.players.length) {
        this.config.currentPlayerTurn = 0;
      }
      this.config.players.forEach((player) => {
        player.finishRoute = this.calculateFinishRoute(player.score);
      });
    }
  }

  toggleTurn() {
    this.config.currentPlayerTurn = (this.config.currentPlayerTurn + 1) % this.config.players.length;
  }

  updateScores() {
    this.config.players.forEach((player) => {
      player.legs = Math.floor(Math.random() * 12);
      player.score = Math.floor(Math.random() * 301);
      player.gameStarted = true;
      player.finishRoute = this.calculateFinishRoute(player.score);
    });
  }

  resetScores() {
    this.config.players.forEach((player) => {
      player.legs = 0;
      player.score = this.config.gameFormat;
      player.gameStarted = false;
      player.finishRoute = [];
    });
  }

  // Start game for a player (needed for double in rule)
  startPlayerGame(playerIndex, firstDartIsDouble = false) {
    if (this.config.players[playerIndex]) {
      if (!this.config.doubleIn || firstDartIsDouble) {
        this.config.players[playerIndex].gameStarted = true;
        this.config.players[playerIndex].finishRoute = this.calculateFinishRoute(
          this.config.players[playerIndex].score
        );
      }
    }
  }

  toggleRoutes() {
    this.config.showRoutes = !this.config.showRoutes;
  }

  // Get current configuration
  getConfig() {
    return { ...this.config };
  }
}

// Create global instance and API
const gameX01 = new GameX01();

window.DartsScoreboard = {
  setGameHeader: (header) => {
    gameX01.config.gameHeader = header;
  },
  setMatchInfo: (title, broadcaster) => {
    gameX01.config.matchTitle = title;
    gameX01.config.broadcaster = broadcaster;
  },
  setGameFormat: (format) => gameX01.setGameFormat(format),
  setDartsPerRound: (darts) => gameX01.setDartsPerRound(darts),
  setDoubleIn: (enabled) => gameX01.setDoubleIn(enabled),
  setDoubleOut: (enabled) => gameX01.setDoubleOut(enabled),
  setPlayers: (players) => {
    gameX01.config.players = players.map((p) => ({
      ...p,
      gameStarted: p.gameStarted !== undefined ? p.gameStarted : false,
      finishRoute: gameX01.calculateFinishRoute(p.score),
    }));
    gameX01.config.currentPlayerTurn = Math.min(gameX01.config.currentPlayerTurn, players.length - 1);
  },
  updatePlayer: (index, data) => {
    if (gameX01.config.players[index]) {
      Object.assign(gameX01.config.players[index], data);
      if (data.score !== undefined) {
        gameX01.config.players[index].finishRoute = gameX01.calculateFinishRoute(data.score);
      }
    }
  },
  startPlayerGame: (index, firstDartIsDouble) => gameX01.startPlayerGame(index, firstDartIsDouble),
  setCurrentPlayer: (index) => {
    if (index >= 0 && index < gameX01.config.players.length) {
      gameX01.config.currentPlayerTurn = index;
    }
  },
  showRoutes: (show) => {
    gameX01.config.showRoutes = show;
  },
  getConfig: () => gameX01.getConfig(),
  addPlayer: (name, score) => gameX01.addPlayer(name, score),
  removePlayer: () => gameX01.removePlayer(),
  toggleTurn: () => gameX01.toggleTurn(),
  updateScores: () => gameX01.updateScores(),
  resetScores: () => gameX01.resetScores(),
  toggleRoutes: () => gameX01.toggleRoutes(),
};

// UI Rendering functions
function initializeScoreboard() {
  updateGameInfo();
  renderPlayers();
  positionTurnMarker();
  updateRoutesVisibility();
}

function updateGameInfo() {
  const config = DartsScoreboard.getConfig();
  document.getElementById("gameHeader").textContent = config.gameHeader;
  document.getElementById("matchTitle").textContent = config.matchTitle;
  document.getElementById("broadcaster").textContent = config.broadcaster;
}

function positionTurnMarker() {
  const marker = document.querySelector(".pdc-x01-turn-marker");
  if (!marker) return;

  const playerRows = document.querySelectorAll(".pdc-x01-player-row");
  if (playerRows.length === 0) return;

  const config = DartsScoreboard.getConfig();
  const currentRow = playerRows[config.currentPlayerTurn];
  const scoreboard = document.getElementById("scoreboard");
  const scoreboardTop = scoreboard.getBoundingClientRect().top;
  const rowTop = currentRow.getBoundingClientRect().top - scoreboardTop;
  const rowHeight = currentRow.offsetHeight;

  const targetY = rowTop + rowHeight / 2 - marker.offsetHeight / 2;
  const currentTransform = marker.style.transform;

  if (!currentTransform) {
    marker.style.transform = `translateY(${targetY}px)`;
    return;
  }

  marker.getBoundingClientRect();
  marker.style.transform = `translateY(${targetY}px)`;
}

function updateRoutesVisibility() {
  const routes = document.querySelectorAll(".pdc-x01-player-routes");
  const config = DartsScoreboard.getConfig();
  routes.forEach((route) => {
    route.classList.remove("show", "hide");
    route.classList.add(config.showRoutes ? "show" : "hide");
  });
}

function renderPlayers() {
  const container = document.getElementById("x01PlayersContainer");
  const config = DartsScoreboard.getConfig();
  const existingRows = Array.from(container.children);
  const players = config?.players || [];

  players.forEach((player, index) => {
    let playerRow = existingRows[index];

    if (!playerRow) {
      playerRow = document.createElement("div");
      playerRow.className = "pdc-x01-player-row";
      container.appendChild(playerRow);
      playerRow.innerHTML = `
                          <div class="pdc-x01-player-info">
                              <span class="pdc-x01-player-name">${player.name}</span>
                              <div class="pdc-x01-player-flag pdc-x01-flag-${player.flag}"></div>
                          </div>
                          <div class="pdc-x01-sets-score">${player.legs}</div>
                          <div class="pdc-x01-legs-score">${player.score}</div>
                          <div class="pdc-x01-player-routes"></div>
                      `;
    }

    playerRow.querySelector(".pdc-x01-player-name").textContent = player.name;
    playerRow.querySelector(".pdc-x01-sets-score").textContent = player.legs;
    playerRow.querySelector(".pdc-x01-legs-score").textContent = player.score;

    const routesContainer = playerRow.querySelector(".pdc-x01-player-routes");
    const finishRoute = player.finishRoute || [];

    if (
      routesContainer.children.length !== finishRoute.length ||
      Array.from(routesContainer.children).some((item, i) => item.textContent !== finishRoute[i])
    ) {
      routesContainer.innerHTML = "";
      finishRoute.forEach((route) => {
        const routeItem = document.createElement("div");
        routeItem.className = "pdc-x01-route-item";
        routeItem.textContent = route;
        routesContainer.appendChild(routeItem);
      });
    }

    playerRow.classList.toggle("active", index === config.currentPlayerTurn);
    routesContainer.classList.remove("show", "hide");
    routesContainer.classList.add(config.showRoutes ? "show" : "hide");
  });

  while (container.children.length > players.length) {
    container.removeChild(container.lastChild);
  }
}

// Control functions
function addPlayer() {
  const name = prompt("Enter player name:") || `Player ${DartsScoreboard.getConfig().players.length + 1}`;
  const score = parseInt(prompt("Enter current score:") || "100");
  DartsScoreboard.addPlayer(name, score);
  renderPlayers();
  positionTurnMarker();
}

function removePlayer() {
  DartsScoreboard.removePlayer();
  renderPlayers();
  positionTurnMarker();
}

function toggleTurn() {
  DartsScoreboard.toggleTurn();
  renderPlayers();
  positionTurnMarker();
}

function updateScores() {
  DartsScoreboard.updateScores();
  renderPlayers();
}

function resetScores() {
  DartsScoreboard.resetScores();
  renderPlayers();
}

function toggleRoutes() {
  DartsScoreboard.toggleRoutes();
  updateRoutesVisibility();
}

// Game format control functions
function setGameFormat() {
  const format = document.getElementById("gameFormat").value;
  DartsScoreboard.setGameFormat(parseInt(format));
}

function setDartsPerRound() {
  const darts = document.getElementById("dartsPerRound").value;
  DartsScoreboard.setDartsPerRound(parseInt(darts));
}

function toggleDoubleIn() {
  const btn = document.getElementById("doubleInBtn");
  const current = btn.textContent.includes("ON");
  DartsScoreboard.setDoubleIn(!current);
  btn.textContent = `Double In: ${current ? "OFF" : "ON"}`;
}

function toggleDoubleOut() {
  const btn = document.getElementById("doubleOutBtn");
  const current = btn.textContent.includes("ON");
  DartsScoreboard.setDoubleOut(!current);
  btn.textContent = `Double Out: ${current ? "OFF" : "ON"}`;
}

function startPlayerGame() {
  const config = DartsScoreboard.getConfig();
  const playerIndex = prompt("Enter player index (0-based):", "0");
  const firstDartIsDouble = confirm("First dart is double?");
  if (playerIndex !== null) {
    DartsScoreboard.startPlayerGame(parseInt(playerIndex), firstDartIsDouble);
  }
}

// Initialize on load
initializeScoreboard();
setGameFormat();
setDartsPerRound();
