// Game state
let players = [
  { id: 1, name: "MARIO", color: "#ff4444", icon: "🍄" },
  { id: 2, name: "LUIGI", color: "#44ff44", icon: "⭐" },
  { id: 3, name: "PEACH", color: "#ff69b4", icon: "👑" },
  { id: 4, name: "TOAD", color: "#4169e1", icon: "🎯" },
];

let editingPlayer = null;
let currentPickerPlayer = null;

// Configuration
const MAX_PLAYERS = 8; // Maximum number of players allowed

const predefinedColors = [
  "#ff4444",
  "#44ff44",
  "#4444ff",
  "#ffff44",
  "#ff44ff",
  "#44ffff",
  "#ff8844",
  "#8844ff",
  "#ff4488",
  "#88ff44",
  "#4488ff",
  "#ffaa44",
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#f39c12",
  "#e74c3c",
  "#2ecc71",
  "#9b59b6",
  "#34495e",
];

const availableIcons = [
  "🍄",
  "⭐",
  "👑",
  "🎯",
  "🔥",
  "⚡",
  "💎",
  "🎮",
  "🚀",
  "🎪",
  "🎨",
  "🎭",
  "🦄",
  "🐉",
  "👾",
  "🎲",
  "🏆",
  "⚔️",
  "🛡️",
  "🎸",
  "🎺",
  "🎪",
  "🎨",
  "🎭",
];

// Utility functions
function updatePlayerCount() {
  const playerCount = document.getElementById("player-count");
  playerCount.textContent = `${players.length} Player${players.length > 1 ? "s" : ""}`;
}

function addPlayer() {
  // Check if we've reached the maximum number of players
  if (players.length >= MAX_PLAYERS) {
    return; // Don't add more players if limit is reached
  }

  const newId = Math.max(...players.map((p) => p.id)) + 1;
  const randomColor = predefinedColors[Math.floor(Math.random() * predefinedColors.length)];
  const randomIcon = availableIcons[Math.floor(Math.random() * availableIcons.length)];

  const newPlayer = {
    id: newId,
    name: `PLAYER ${newId}`,
    color: randomColor,
    icon: randomIcon,
  };

  players.push(newPlayer);
  renderPlayers();
  updatePlayerCount();
}

function removePlayer(id) {
  if (players.length > 1) {
    players = players.filter((p) => p.id !== id);
    renderPlayers();
    updatePlayerCount();
  }
}

function updatePlayer(id, field, value) {
  const player = players.find((p) => p.id === id);
  if (player) {
    player[field] = value;
    renderPlayers();
  }
}

function createPlayerCard(player, index) {
  const isEditing = editingPlayer === player.id;

  return `
            <div class="card player-card draggable-card rounded-4 border-0 h-100 position-relative" draggable="true" data-id="${
              player.id
            }" 
                 style="border-color: ${player.color}40 !important;">
                
                <!-- Player Number -->
                <div class="player-number" style="background-color: ${player.color}60; border-color: ${
    player.color
  }80;">
                    ${index + 1}
                </div>
                
                <!-- Remove Button -->
                ${
                  players.length > 1
                    ? `
                    <button class="remove-btn" onclick="removePlayer(${player.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                `
                    : ""
                }
                
                <div class="card-body text-center p-4">
                    <!-- Player Icon -->
                    <div class="player-icon" 
                         style="box-shadow: 0 0 20px ${player.color}40, inset 0 0 20px ${player.color}20;"
                         onclick="openIconPicker(${player.id})">
                        ${player.icon}
                    </div>
                    
                    <!-- Player Name -->
                    ${
                      isEditing
                        ? `
                        <input type="text" 
                               class="name-input" 
                               value="${player.name}"
                               style="--player-color: ${player.color};"
                               onblur="finishEditing()"
                               onkeypress="handleNameKeypress(event, ${player.id})"
                               oninput="updatePlayerName(${player.id}, this.value)"
                               id="name-input-${player.id}">
                    `
                        : `
                        <h5 class="player-name" 
                            style="color: ${player.color}; text-shadow: 0 0 10px ${player.color}80;"
                            onclick="startEditing(${player.id})">
                            ${player.name}
                        </h5>
                    `
                    }
                    
                    <!-- Color Circle -->
                    <div class="color-circle" 
                         style="background-color: ${player.color};"
                         onclick="openColorPicker(${player.id})">
                    </div>
                </div>
            </div>
    `;
}

function createAddPlayerCard() {
  const isDisabled = players.length >= MAX_PLAYERS;
  const disabledClass = isDisabled ? "disabled" : "";
  const clickHandler = isDisabled ? "" : 'onclick="addPlayer()"';
  const opacity = isDisabled ? "0.5" : "1";
  const cursor = isDisabled ? "not-allowed" : "pointer";
  const text = isDisabled ? `MAX PLAYERS (${MAX_PLAYERS})` : "ADD PLAYER";

  return `
            <div class="card add-player-card ${disabledClass} rounded-4 border-0 h-100 d-flex align-items-center justify-content-center" 
                 ${clickHandler}
                 style="opacity: ${opacity}; cursor: ${cursor};">
                <div class="text-center text-white">
                    <div class="player-icon mb-3">
                        <i class="fas fa-${isDisabled ? "ban" : "plus"} fa-2x text-white-50"></i>
                    </div>
                    <h5 class="text-white-50 fw-bold">${text}</h5>
                </div>
            </div>
    `;
}

function renderPlayers() {
  const grid = document.getElementById("players-grid");
  const playerCards = players.map((player, index) => createPlayerCard(player, index)).join("");
  const addPlayerCard = createAddPlayerCard();

  grid.classList.add("responsive-grid");
  grid.innerHTML = playerCards + addPlayerCard;
}

// Player editing functions
function startEditing(playerId) {
  editingPlayer = playerId;
  renderPlayers();

  setTimeout(() => {
    const input = document.getElementById(`name-input-${playerId}`);
    if (input) {
      input.focus();
      input.select();
    }
  }, 10);
}

function finishEditing() {
  // Only finish editing if Enter was pressed or input lost focus intentionally
  if (editingPlayer) {
    editingPlayer = null;
    renderPlayers();
  }
}

function updatePlayerName(playerId, value) {
  const player = players.find((p) => p.id === playerId);
  if (player) {
    player.name = value.toUpperCase();
    // Update just the input value without full re-render
    const input = document.getElementById(`name-input-${playerId}`);
    if (input) {
      input.value = player.name;
    }
  }
}

function handleNameKeypress(event, playerId) {
  if (event.key === "Enter") {
    finishEditing();
    event.preventDefault(); // Only prevent default for Enter key
  }
}

// Color picker functions
function openColorPicker(playerId) {
  const player = players.find((p) => p.id === playerId);
  if (!player) return;

  currentPickerPlayer = playerId;

  // Update modal content
  const playerDisplay = document.getElementById("color-picker-player");
  playerDisplay.textContent = `${player.icon} ${player.name}`;
  playerDisplay.style.setProperty("--current-player-color", player.color);

  // Render color options
  const colorGrid = document.getElementById("color-grid");
  colorGrid.innerHTML = predefinedColors
    .map(
      (color) => `
        <div class="color-option ${player.color === color ? "selected" : ""}" 
             style="background-color: ${color};"
             onclick="selectColor('${color}')">
        </div>
    `
    )
    .join("");

  // Show modal
  document.getElementById("color-picker-modal").classList.add("show");
  document.body.style.overflow = "hidden";
}

function selectColor(color) {
  if (currentPickerPlayer) {
    updatePlayer(currentPickerPlayer, "color", color);
    closeColorPicker();
  }
}

function closeColorPicker() {
  document.getElementById("color-picker-modal").classList.remove("show");
  document.body.style.overflow = "";
  currentPickerPlayer = null;
}

// Icon picker functions
function openIconPicker(playerId) {
  const player = players.find((p) => p.id === playerId);
  if (!player) return;

  currentPickerPlayer = playerId;

  // Update modal content
  const playerDisplay = document.getElementById("icon-picker-player");
  playerDisplay.textContent = `${player.icon} ${player.name}`;
  playerDisplay.style.setProperty("--current-player-color", player.color);

  // Render icon options
  const iconGrid = document.getElementById("icon-grid");
  iconGrid.innerHTML = availableIcons
    .map(
      (icon) => `
        <div class="icon-option ${player.icon === icon ? "selected" : ""}" 
             onclick="selectIcon('${icon}')">
            ${icon}
        </div>
    `
    )
    .join("");

  // Show modal
  document.getElementById("icon-picker-modal").classList.add("show");
  document.body.style.overflow = "hidden";
}

function selectIcon(icon) {
  if (currentPickerPlayer) {
    updatePlayer(currentPickerPlayer, "icon", icon);
    closeIconPicker();
  }
}

function closeIconPicker() {
  document.getElementById("icon-picker-modal").classList.remove("show");
  document.body.style.overflow = "";
  currentPickerPlayer = null;
}

// Close modals on escape key
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeColorPicker();
    closeIconPicker();
  }
});

// Close modals when clicking outside
document.getElementById("color-picker-modal").addEventListener("click", function (event) {
  if (event.target === this) {
    closeColorPicker();
  }
});

document.getElementById("icon-picker-modal").addEventListener("click", function (event) {
  if (event.target === this) {
    closeIconPicker();
  }
});

// Start game handler
document.getElementById("start-game-btn").addEventListener("click", function () {
  alert(
    "Starting game with " +
      players.length +
      " players!\n\nPlayers:\n" +
      players.map((p) => `${p.name} (${p.icon})`).join("\n")
  );
});

// Initial render
document.addEventListener("DOMContentLoaded", function () {
  renderPlayers();
  updatePlayerCount();
});

function recomputePlayersIds(container) {
  const playerCards = container.querySelectorAll(".player-card");
  playerCards.forEach((card, index) => {
    const playerId = parseInt(card.getAttribute("data-id"));
    const player = players.find((p) => p.id === playerId);
    if (player) {
      player.id = index + 1; // Update ID to match position (1-based)
      card.setAttribute("data-id", player.id); // Update DOM attribute
    }
  });
  players = players.slice().sort((a, b) => {
    return a.id - b.id;
  });
  console.log(players);
  renderPlayers(); // Ensure UI reflects new IDs
}

function handleDrop(card, container) {
  recomputePlayersIds(container);
}
function handleDelete(card) {
  const playerId = parseInt(card.getAttribute("data-id"));
  var toDel = players.findIndex((p) => p.id === playerId);
  players.splice(toDel, 1);
  updatePlayerCount(); // Update player count to reflect the deletion
  recomputePlayersIds(document.getElementById("players-grid")); // This will call renderPlayers() to update the add card
}

dragDropSystem.callbacks.onDrop = handleDrop;
dragDropSystem.callbacks.onDelete = handleDelete;
