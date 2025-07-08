// Game state
let players = [
  { id: 1, name: "MARIO", color: "#ff4444", icon: "🍄", country: "jp" },
  { id: 2, name: "LUIGI", color: "#44ff44", icon: "⭐", country: "it" },
  { id: 3, name: "PEACH", color: "#ff69b4", icon: "👑", country: "fr" },
  { id: 4, name: "TOAD", color: "#4169e1", icon: "🎯", country: "pf" },
];

let editingPlayer = null;
let currentPickerPlayer = null;
let countries = null;

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

let countriesCodes = ["fr", "gb", "us"];

function isValidCountryCode(code) {
  const validCodes = [
    "ad",
    "ae",
    "af",
    "ag",
    "ai",
    "al",
    "am",
    "ao",
    "aq",
    "ar",
    "as",
    "at",
    "au",
    "aw",
    "ax",
    "az",
    "ba",
    "bb",
    "bd",
    "be",
    "bf",
    "bg",
    "bh",
    "bi",
    "bj",
    "bl",
    "bm",
    "bn",
    "bo",
    "bq",
    "br",
    "bs",
    "bt",
    "bv",
    "bw",
    "by",
    "bz",
    "ca",
    "cc",
    "cd",
    "cf",
    "cg",
    "ch",
    "ci",
    "ck",
    "cl",
    "cm",
    "cn",
    "co",
    "cr",
    "cu",
    "cv",
    "cw",
    "cx",
    "cy",
    "cz",
    "de",
    "dj",
    "dk",
    "dm",
    "do",
    "dz",
    "ec",
    "ee",
    "eg",
    "eh",
    "er",
    "es",
    "et",
    "fi",
    "fj",
    "fk",
    "fm",
    "fo",
    "fr",
    "ga",
    "gb",
    "gd",
    "ge",
    "gf",
    "gg",
    "gh",
    "gi",
    "gl",
    "gm",
    "gn",
    "gp",
    "gq",
    "gr",
    "gs",
    "gt",
    "gu",
    "gw",
    "gy",
    "hk",
    "hm",
    "hn",
    "hr",
    "ht",
    "hu",
    "id",
    "ie",
    "il",
    "im",
    "in",
    "io",
    "iq",
    "ir",
    "is",
    "it",
    "je",
    "jm",
    "jo",
    "jp",
    "ke",
    "kg",
    "kh",
    "ki",
    "km",
    "kn",
    "kp",
    "kr",
    "kw",
    "ky",
    "kz",
    "la",
    "lb",
    "lc",
    "li",
    "lk",
    "lr",
    "ls",
    "lt",
    "lu",
    "lv",
    "ly",
    "ma",
    "mc",
    "md",
    "me",
    "mf",
    "mg",
    "mh",
    "mk",
    "ml",
    "mm",
    "mn",
    "mo",
    "mp",
    "mq",
    "mr",
    "ms",
    "mt",
    "mu",
    "mv",
    "mw",
    "mx",
    "my",
    "mz",
    "na",
    "nc",
    "ne",
    "nf",
    "ng",
    "ni",
    "nl",
    "no",
    "np",
    "nr",
    "nu",
    "nz",
    "om",
    "pa",
    "pe",
    "pf",
    "pg",
    "ph",
    "pk",
    "pl",
    "pm",
    "pn",
    "pr",
    "ps",
    "pt",
    "pw",
    "py",
    "qa",
    "re",
    "ro",
    "rs",
    "ru",
    "rw",
    "sa",
    "sb",
    "sc",
    "sd",
    "se",
    "sg",
    "sh",
    "si",
    "sj",
    "sk",
    "sl",
    "sm",
    "sn",
    "so",
    "sr",
    "ss",
    "st",
    "sv",
    "sx",
    "sy",
    "sz",
    "tc",
    "td",
    "tf",
    "tg",
    "th",
    "tj",
    "tk",
    "tl",
    "tm",
    "tn",
    "to",
    "tr",
    "tt",
    "tv",
    "tw",
    "tz",
    "ua",
    "ug",
    "um",
    "us",
    "uy",
    "uz",
    "va",
    "vc",
    "ve",
    "vg",
    "vi",
    "vn",
    "vu",
    "wf",
    "ws",
    "ye",
    "yt",
    "za",
    "zm",
    "zw",
  ];
  return validCodes.includes(code);
}

async function loadCountries() {
  try {
    const response = await fetch(
      //"https://restcountries.com/v3.1/all?fields=name,cca2,region,subregion,population,capital"
      "../countries/countries.json"
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    countries = data
      .map((country) => ({
        name: country.name.common,
        code: country.cca2.toLowerCase(),
      }))
      .filter((country) => isValidCountryCode(country.code))
      .sort((a, b) => a.name.localeCompare(b.name));

    //filteredCountries = [...countries];
    countriesCodes = Array.from(data, (country) => country.cca2.toLowerCase());
  } catch (error) {
    console.error("Error loading countries:", error);
  } finally {
  }
}

(async () => {
  await loadCountries();
  console.log(countries, countriesCodes);
})();

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
  const randomCountry = countriesCodes[Math.floor(Math.random() * countriesCodes.length)];

  const newPlayer = {
    id: newId,
    name: `PLAYER ${newId}`,
    color: randomColor,
    icon: randomIcon,
    country: randomCountry,
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
                <span class="fi fi-${player.country} player-flag"></span>
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
      players.map((p) => `${p.name} (${p.icon} ${p.country})`).join("\n")
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
