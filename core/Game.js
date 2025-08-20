// ============== Unified Game Manager - Interface de sélection et configuration des joueurs ==============

(function() {
    // ============== Classes de base ==============
    
    class Game {
        constructor() {
            // Classe Game de base si nécessaire
        }
    }

    class GameManager {
        constructor() {
            console.log("GameManager init");
            this.games = [];
            this.isLoaded = false;
            this.loadingPromise = null;
            // Stocker les jeux par ID pour un accès rapide
            this.gamesById = new Map();
        }

        async initialize() {
            if (this.loadingPromise) {
                return this.loadingPromise;
            }

            this.loadingPromise = this.loadGames();
            return this.loadingPromise;
        }

        async loadGames() {
            try {
                this.games = await loadGameManifestsFromIndex();
                this.isLoaded = true;
                
                // Créer une map pour l'accès rapide par ID
                this.gamesById.clear();
                this.games.forEach(game => {
                    this.gamesById.set(game.id, game);
                });
                
                console.log("Jeux chargés:", this.games);
                return this.games;
            } catch (error) {
                console.error("Erreur lors du chargement des jeux:", error);
                this.games = [];
                this.gamesById.clear();
                this.isLoaded = false;
                throw error;
            }
        }

        // Nouvelle méthode pour récupérer un jeu par ID
        getGameById(gameId) {
            return this.gamesById.get(gameId);
        }
    }

    // ============== Configuration du jeu - Interface des joueurs ==============
    
    const gameConfig = {
        maxPlayers: 6,
        minPlayers: 2
    };

    // Couleurs vibrantes (sans noir ni gris)
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
        '#FFEAA7', '#DDA0DD', '#F8B500', '#FF7675',
        '#74B9FF', '#A29BFE', '#FD79A8', '#FDCB6E'
    ];

    // Icônes futuristes
    const icons = [
        '🤖', '👾', '🚀', '⚡', '💎', '🔮',
        '🎯', '⭐', '💫', '🌟', '✨', '🎮',
        '🎭', '🎪', '🎨', '🎵', '🎸', '🎤'
    ];

    // Drapeaux
    const flags = [
        '🇫🇷', '🇺🇸', '🇬🇧', '🇩🇪', '🇪🇸', '🇮🇹',
        '🇯🇵', '🇰🇷', '🇨🇳', '🇧🇷', '🇨🇦', '🇦🇺',
        '🇷🇺', '🇮🇳', '🇲🇽', '🇳🇱', '🇸🇪', '🇳🇴'
    ];

    // État du jeu
    let gameState = {
        allPlayers: [
            { id: 1, name: "Nova", icon: "🤖", color: "#FF6B6B", flag: "🇫🇷" },
            { id: 2, name: "Cipher", icon: "👾", color: "#4ECDC4", flag: "🇺🇸" },
            { id: 3, name: "Neon", icon: "⚡", color: "#45B7D1", flag: "🇬🇧" },
            { id: 4, name: "Vortex", icon: "🔮", color: "#96CEB4", flag: "🇩🇪" },
            { id: 5, name: "Quantum", icon: "💎", color: "#FFEAA7", flag: "🇯🇵" },
            { id: 6, name: "Phoenix", icon: "🚀", color: "#DDA0DD", flag: "🇰🇷" },
            { id: 7, name: "Matrix", icon: "💫", color: "#F8B500", flag: "🇮🇹" },
            { id: 8, name: "Glitch", icon: "⭐", color: "#FF7675", flag: "🇪🇸" },
        ],
        selectedPlayers: [],
        randomOrder: false,
        bullUp: false,
        animatingPlayer: null,
        showCreateForm: false
    };

    // ============== Variables globales pour la sélection de jeux ==============
    
    let selectedGame = null;
    let selectedOptions = {};
    let gameDetailsModal = null;
    let gamePicker = null;
    let gameDetailsModalElement = null;

    // ============== Fonctions utilitaires ==============
    
    async function loadGameManifestsFromIndex() {
        try {
            const indexResponse = await fetch('dev/modal_hot_loading/games/index.json');
            const gameIndex = await indexResponse.json();
            
            const games = [];
            
            for (const directory of gameIndex.games) {
                try {
                    const response = await fetch(`dev/modal_hot_loading/games/${directory}/manifest.json`);
                    if (!response.ok) continue;
                    
                    const gameData = await response.json();
                    gameData.directory = directory;
                    games.push(gameData);
                } catch (error) {
                    console.error(`Erreur lors du chargement du manifest pour ${directory}:`, error);
                }
            }
            
            return games;
        } catch (error) {
            console.error('Erreur lors du chargement de l\'index des jeux:', error);
            return [];
        }
    }

    // Fonction pour générer le HTML d'une carte de jeu
    function createGameCard(game) {
        return `
            <div class="game-card d-flex flex-column justify-content-center align-items-center p-4 text-center"
                 onclick="selectGame('${game.id}')"
                 data-game-id="${game.id}"
                 data-variants='${JSON.stringify(game.variants)}'>
                <img class="game-icon" src="${game.icon}" alt="${game.alt || game.title}">
                <div class="game-title mb-2">${game.title}</div>
                <div class="game-description">${game.description}</div>
            </div>
        `;
    }

    // Fonction pour générer toute la grille de jeux
    async function generateGamesGrid(gameManager) {
        console.log("Génération de la grille avec:", gameManager.games);
        const gamesGridContainer = document.getElementById('gamesGrid');
        
        if (!gamesGridContainer) {
            console.error('Element #gamesGrid non trouvé');
            return;
        }
        
        if (!gameManager.games || gameManager.games.length === 0) {
            gamesGridContainer.innerHTML = '<p>Aucun jeu disponible</p>';
            return;
        }
        
        const gamesHTML = gameManager.games.map(game => createGameCard(game)).join('');
        gamesGridContainer.innerHTML = gamesHTML;
    }

    // Fonction utilitaire pour récupérer les informations détaillées d'une variante
    function getVariantDetails(gameId, variantName) {
        if (!window.gameManager) return null;
        
        const game = window.gameManager.getGameById(gameId);
        if (!game) return null;
        
        return game.variants.find(v => v.name === variantName);
    }

    // ============== Interface des joueurs - Fonctions ==============
    
    function createParticles() {
        console.log("create particles");
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;
        
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 8 + 's';
            particle.style.animationDuration = (8 + Math.random() * 4) + 's';
            particlesContainer.appendChild(particle);
        }
    }

    function initializePlayerUI() {
        console.log("initialize Player UI");
        const maxCountElement = document.getElementById('maxCount');
        const minRequiredElement = document.getElementById('minRequired');
        
        if (maxCountElement) maxCountElement.textContent = gameConfig.maxPlayers;
        if (minRequiredElement) minRequiredElement.textContent = gameConfig.minPlayers;
        
        renderPlayerSlots();
        renderAvailablePlayers();
    }

    function setupPlayerEventListeners() {
        console.log("setup event listeners");
        
        const createBtn = document.getElementById('createBtn');
        const createSubmit = document.getElementById('createSubmit');
        const newPlayerName = document.getElementById('newPlayerName');
        const randomOrderContainer = document.getElementById('randomOrderContainer');
        const bullUpContainer = document.getElementById('bullUpContainer');
        const startButton = document.getElementById('startButton');
        
        if (createBtn) createBtn.addEventListener('click', toggleCreateForm);
        if (createSubmit) createSubmit.addEventListener('click', createPlayer);
        if (newPlayerName) {
            newPlayerName.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') createPlayer();
            });
            newPlayerName.addEventListener('input', updatePlayerUI);
        }

        if (randomOrderContainer) {
            randomOrderContainer.addEventListener('click', () => {
                gameState.randomOrder = !gameState.randomOrder;
                updateCheckbox('randomOrderCheck', gameState.randomOrder);
            });
        }

        if (bullUpContainer) {
            bullUpContainer.addEventListener('click', () => {
                gameState.bullUp = !gameState.bullUp;
                updateCheckbox('bullUpCheck', gameState.bullUp);
            });
        }

//        if (startButton) startButton.addEventListener('click', startGameWithPlayers);
    }

    function renderPlayerSlots() {
        const slotsContainer = document.getElementById('playerSlots');
        if (!slotsContainer) return;
        
        slotsContainer.innerHTML = '';

        for (let i = 0; i < gameConfig.maxPlayers; i++) {
            const slot = document.createElement('div');
            const player = gameState.selectedPlayers[i];
            const isRequired = i < gameConfig.minPlayers;

            slot.className = `slot ${isRequired ? 'required' : 'empty'} ${player ? 'filled' : ''}`;

            if (player) {
                slot.style.color = player.color;
                slot.innerHTML = `
                    <div class="player-avatar">${player.icon}</div>
                    <div class="player-name">${player.name}</div>
                    <div class="player-flag">${player.flag}</div>
                `;
                slot.addEventListener('click', () => removePlayer(player.id));
            } else {
                slot.innerHTML = '<div class="add-icon">+</div>';
            }

            slotsContainer.appendChild(slot);
        }
    }

    function renderAvailablePlayers() {
        const grid = document.getElementById('playersGrid');
        if (!grid) return;
        
        const availablePlayers = gameState.allPlayers.filter(p =>
            !gameState.selectedPlayers.find(sp => sp.id === p.id)
        );

        grid.innerHTML = '';

        availablePlayers.forEach(player => {
            const card = document.createElement('div');
            card.className = 'player-card';
            card.style.color = player.color;
            card.innerHTML = `
                <div class="player-info">
                    <div class="player-visual">
                        <div class="player-avatar">${player.icon}</div>
                        <div class="player-flag">${player.flag}</div>
                    </div>
                    <div class="player-details">
                        <div class="player-card-name">${player.name}</div>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => addPlayer(player));
            grid.appendChild(card);
        });
    }

    function addPlayer(player) {
        if (gameState.selectedPlayers.length >= gameConfig.maxPlayers) return;

        // Animation
        const playerCards = document.querySelectorAll('.player-card');
        const targetCard = Array.from(playerCards).find(card =>
            card.querySelector('.player-card-name').textContent === player.name
        );

        if (targetCard) {
            targetCard.classList.add('animating');
            setTimeout(() => {
                gameState.selectedPlayers.push(player);
                updatePlayerUI();
            }, 300);
        }
    }

    function removePlayer(playerId) {
        gameState.selectedPlayers = gameState.selectedPlayers.filter(p => p.id !== playerId);
        updatePlayerUI();
    }

    function toggleCreateForm() {
        gameState.showCreateForm = !gameState.showCreateForm;
        const form = document.getElementById('createForm');
        if (form) {
            form.style.display = gameState.showCreateForm ? 'block' : 'none';
        }

        if (gameState.showCreateForm) {
            const nameInput = document.getElementById('newPlayerName');
            if (nameInput) nameInput.focus();
        }
    }

    function createPlayer() {
        const nameInput = document.getElementById('newPlayerName');
        if (!nameInput) return;
        
        const name = nameInput.value.trim();

        if (!name || gameState.selectedPlayers.length >= gameConfig.maxPlayers) return;

        const usedColors = gameState.allPlayers.map(p => p.color);
        const usedIcons = gameState.allPlayers.map(p => p.icon);
        const usedFlags = gameState.allPlayers.map(p => p.flag);

        const availableColors = colors.filter(c => !usedColors.includes(c));
        const availableIcons = icons.filter(i => !usedIcons.includes(i));
        const availableFlags = flags.filter(f => !usedFlags.includes(f));

        const newPlayer = {
            id: Math.max(...gameState.allPlayers.map(p => p.id), 0) + 1,
            name: name,
            icon: availableIcons[Math.floor(Math.random() * availableIcons.length)] || '🎮',
            color: availableColors[Math.floor(Math.random() * availableColors.length)] || '#00f5ff',
            flag: availableFlags[Math.floor(Math.random() * availableFlags.length)] || '🏴'
        };

        gameState.allPlayers.push(newPlayer);
        gameState.selectedPlayers.push(newPlayer);

        nameInput.value = '';
        gameState.showCreateForm = false;
        const createForm = document.getElementById('createForm');
        if (createForm) createForm.style.display = 'none';

        updatePlayerUI();
    }

    function updateCheckbox(checkboxId, checked) {
        const checkbox = document.getElementById(checkboxId);
        if (!checkbox) return;
        
        if (checked) {
            checkbox.classList.add('checked');
        } else {
            checkbox.classList.remove('checked');
        }
    }

    function updatePlayerUI() {
        console.log("update player UI");
        const selectedCount = document.getElementById('selectedCount');
        if (selectedCount) selectedCount.textContent = gameState.selectedPlayers.length;

        renderPlayerSlots();
        renderAvailablePlayers();

        // Warning
        const warning = document.getElementById('warning');
        const isMinimumMet = gameState.selectedPlayers.length >= gameConfig.minPlayers;
        if (warning) warning.style.display = isMinimumMet ? 'none' : 'block';

        // Bouton Start
        const startButton = document.getElementById('startButton');
        if (startButton) startButton.disabled = !isMinimumMet;

        // Bouton Create
        const createSubmit = document.getElementById('createSubmit');
        const nameInput = document.getElementById('newPlayerName');
        if (createSubmit && nameInput) {
            createSubmit.disabled = !nameInput.value.trim() || gameState.selectedPlayers.length >= gameConfig.maxPlayers;
        }
    }

    // function startGameWithPlayers() {
    //     if (gameState.selectedPlayers.length < gameConfig.minPlayers) return;

    //     let players = [...gameState.selectedPlayers];
    //     if (gameState.randomOrder) {
    //         players = players.sort(() => Math.random() - 0.5);
    //     }

    //     // Animation du bouton
    //     const button = document.getElementById('startButton');
    //     if (button) {
    //         button.innerHTML = '🚀 LAUNCHING... 🚀';
    //         button.style.background = 'linear-gradient(135deg, #ff00ff, #00f5ff)';
    //     }

    //     setTimeout(() => {
    //         alert(`🎮 GAME STARTED! 🎮\n\nJoueurs: ${players.map(p => `${p.icon} ${p.name}`).join(', ')}\nOrdre aléatoire: ${gameState.randomOrder ? 'Oui' : 'Non'}\nBull up: ${gameState.bullUp ? 'Oui' : 'Non'}`);

    //         // Reset button
    //         if (button) {
    //             button.innerHTML = '🎮 START GAME 🎮';
    //             button.style.background = 'linear-gradient(135deg, #00ff41, #00ff95)';
    //         }
    //     }, 1500);

    //     console.log('Game starting with players:', players);
    //     console.log('Random order:', gameState.randomOrder);
    //     console.log('Bull up:', gameState.bullUp);
    // }

    // ============== Interface de sélection de jeux ==============
    
    // Fonction d'initialisation principale
    async function initializeGamePicker() {
        try {
            console.log('Initialisation de GamePicker...');
            
            // Créer une nouvelle instance si elle n'existe pas
            if (!window.gameManager) {
                window.gameManager = new GameManager();
            }
            
            await window.gameManager.initialize();
            console.log('GameManager initialisé avec:', window.gameManager.games);

            // Initialiser les éléments DOM
            gamePicker = document.getElementById('gamePicker');
            gameDetailsModalElement = document.getElementById('gameDetailsModal');
            
            if (!gamePicker) {
                console.error('Element #gamePicker non trouvé');
                return;
            }
            
            if (!gameDetailsModalElement) {
                console.error('Element #gameDetailsModal non trouvé');
                return;
            }

            // Générer la grille de jeux
            await generateGamesGrid(window.gameManager);

            // Rendre les fonctions globales
            window.selectGame = selectGame;
            window.goBack = goBack;
            window.selectOption = selectOption;
            window.startGame = startGame;
            
            console.log('GamePicker initialized successfully');
        } catch (error) {
            console.error('Error initializing GamePicker:', error);
        }
    }

    function selectGame(gameId) {
        console.log('Sélection du jeu:', gameId);
        
        if (!gamePicker) {
            console.error('gamePicker non trouvé');
            return;
        }

        if (!window.gameManager) {
            console.error('gameManager not initialized');
            return;
        }

        // Récupérer l'objet complet du jeu via le gameManager
        const gameObject = window.gameManager.getGameById(gameId);
        
        if (!gameObject) {
            console.error(`Jeu avec l'ID ${gameId} non trouvé`);
            return;
        }

        // Maintenant selectedGame contient l'objet complet
        selectedGame = gameObject;
        console.log('Jeu sélectionné:', selectedGame);

        // Animate cards out
        gamePicker.classList.add('slide-out');

        // Show details after animation
        setTimeout(() => {
            showGameDetails();
        }, 800);
    }

    function showGameDetails() {
        console.log(gameDetailsModalElement);
        console.log('Affichage des détails du jeu:', selectedGame);
        
        if (!gameDetailsModalElement) {
            console.error('gameDetailsModalElement non trouvé');
            return;
        }

        if (!selectedGame) {
            console.error('selectedGame is null');
            return;
        }

        // Utiliser selectedGame.icon au lieu de selectedGame.background
        gameDetailsModalElement.style.backgroundRepeat = "no-repeat";
        gameDetailsModalElement.style.background = 'linear-gradient( rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5) ), url("' + selectedGame.icon + '")';
        gameDetailsModalElement.style.backgroundSize = "cover";

        // Mettre à jour le titre et la description
        const titleElement = document.getElementById('detailsTitle');
        const descriptionElement = document.getElementById('detailsDescription');
        
        if (titleElement) titleElement.textContent = selectedGame.title;
        if (descriptionElement) descriptionElement.textContent = selectedGame.description;

        // Populate options en utilisant directement selectedGame.variants
        const optionsGrid = document.getElementById('optionsGrid');
        if (!optionsGrid) {
            console.error('optionsGrid not found');
            return;
        }
        
        optionsGrid.innerHTML = '';
        
        if (selectedGame.variants && selectedGame.variants.length > 0) {
            selectedGame.variants.forEach((variant, index) => {
                console.log('Ajout de la variante:', variant);
                const col = document.createElement('div');
                col.className = 'col-6 col-sm-4';
                col.setAttribute("data-game-id", selectedGame.id);

                const optionBtn = document.createElement('div');
                optionBtn.className = 'option-btn p-3 text-center';
                if (index === 0) {
                    optionBtn.classList.add('selected');
                    selectedOptions[selectedGame.id] = variant.name;
                    gameConfig.maxPlayers = variant.maxPlayers;
                    gameConfig.minPlayers = variant.minPlayers;
                }
                optionBtn.textContent = variant.name;
                optionBtn.onclick = () => selectOption(optionBtn, variant.name);

                col.appendChild(optionBtn);
                optionsGrid.appendChild(col);
            });
        } else {
            console.warn('No variants found for game:', selectedGame.id);
            optionsGrid.innerHTML = '<p>Aucune variante disponible</p>';
        }

        // Initialiser le modal si pas encore fait
        if (!gameDetailsModal && typeof bootstrap !== 'undefined') {
            gameDetailsModal = new bootstrap.Modal(gameDetailsModalElement, {
                backdrop: 'static',
                keyboard: false
            });
        }
        updatePlayerUI();
        if (gameDetailsModal) {
            gameDetailsModal.show();
        } else {
            console.error('Cannot show modal - bootstrap not loaded or modal not initialized');
        }
    }

    function selectOption(btn, option) {
        console.log('Option sélectionnée:', option);
        document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedOptions[selectedGame.id] = option;
        updateGameParametersBasedOnVariant();
    }

    function updateGameParametersBasedOnVariant() {
        const selectedVariantName = selectedOptions[selectedGame.id];
        const selectedVariant = getVariantDetails(selectedGame.id, selectedVariantName);
        const minRequired = document.getElementById('minRequired');
        const descriptionElement = document.getElementById('detailsDescription');
        gameConfig.maxPlayers=selectedVariant.maxPlayers;
        gameConfig.minPlayers=selectedVariant.minPlayers;
        if (minRequired && selectedVariant) minRequired.textContent = selectedVariant.minPlayers;
        updatePlayerUI();
    }

    async function startGame() {
        console.log("Démarrage du jeu");
        if (!selectedGame || !selectedGame.id) {
            console.error('No game selected');
            return;
        }

        const selectedVariantName = selectedOptions[selectedGame.id];
        const selectedVariant = getVariantDetails(selectedGame.id, selectedVariantName);
        currentGameId = selectedGame.id + "/" + selectedVariant.name;

        console.log("Démarrage du jeu:", {
            gameId: currentGameId,
            variant: selectedVariant,
            gameObject: selectedGame
        });

        // Vérifier que les éléments existent avant de les utiliser
        const modalPreGameSetup = document.getElementById('modalPreGameSetup');
        const modalGameContainer = document.getElementById('modalGameContainer');
        
        if (modalPreGameSetup) {
            modalPreGameSetup.style.display = 'none';
        }
        if (modalGameContainer) {
            modalGameContainer.style.display = 'flex';
        }

        try {
            const response = await fetch(`dev/modal_hot_loading/games/${selectedVariant.folder}/game.html`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const htmlContent = await response.text();
            
            if (modalGameContainer) {
                modalGameContainer.innerHTML = htmlContent;
            }
            
            const styleLink = document.createElement('link');
            styleLink.rel = 'stylesheet';
            styleLink.href = `dev/modal_hot_loading/games/${selectedVariant.folder}/game.css`;
            document.head.appendChild(styleLink);
            if (window.loadedStyles) window.loadedStyles.push(styleLink);

            const gameScript = document.createElement('script');
            gameScript.src = `dev/modal_hot_loading/games/${selectedVariant.folder}/game.js`;
            gameScript.onload = () => {
                console.log(`game.js pour ${currentGameId} chargé et démarré !`);
                
                // Passer les données complètes du jeu au script de jeu
                console.log("probleme mqtt");
                console.log(window[currentGameId + 'Initialize']);
                if (window[currentGameId + 'Initialize'] && typeof window[currentGameId + 'Initialize'] === 'function') {
                    console.log('initialize data selectedGame');
                    window[currentGameId + 'Initialize'](selectedGame, selectedVariant);
                }
                
                if (window[currentGameId + 'ReceiveMqttMessage'] && typeof window[currentGameId + 'ReceiveMqttMessage'] === 'function') {
                    window.activeGameReceiveMqttMessage = window[currentGameId + 'ReceiveMqttMessage'];
                    console.log(`Fonction de réception MQTT du jeu actif définie pour ${currentGameId}.`);
                } else {
                    console.warn(`Le jeu ${currentGameId} ne semble pas avoir défini de fonction de réception MQTT.`);
                    window.activeGameReceiveMqttMessage = null;
                }
            };
            
            gameScript.onerror = (error) => {
                console.error(`Erreur lors du chargement du script ${currentGameId}:`, error);
            };
            
            document.body.appendChild(gameScript);
            
            // Ajouter à la liste des scripts chargés si elle existe
            if (typeof window.loadedScripts !== 'undefined' && Array.isArray(window.loadedScripts)) {
                window.loadedScripts.push(gameScript);
            }

        } catch (error) {
            console.error(`Erreur lors du chargement du jeu ${currentGameId}:`, error);
            if (modalGameContainer) {
                modalGameContainer.innerHTML = `<p style="color: red;">Erreur: Impossible de charger le jeu ${currentGameId}.</p>`;
            }
        }
    }

    function goBack() {
        console.log('Retour à la sélection de jeux');
        const focusedElement = document.activeElement;
        if (focusedElement && gameDetailsModalElement && gameDetailsModalElement.contains(focusedElement)) {
            focusedElement.blur();
        }
        
        if (gameDetailsModal) {
            gameDetailsModal.hide();
        }
        resetView();
    }

    function resetView() {
        console.log("Reset view...");
        if (gamePicker) {
            gamePicker.classList.remove('slide-out');
        }
    }

    function createSparkle() {
        const sparkle = document.createElement('div');
        sparkle.style.position = 'fixed';
        sparkle.style.width = '10px';
        sparkle.style.height = '10px';
        sparkle.style.background = 'white';
        sparkle.style.borderRadius = '50%';
        sparkle.style.pointerEvents = 'none';
        sparkle.style.zIndex = '3000';
        sparkle.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.8)';

        sparkle.style.left = Math.random() * window.innerWidth + 'px';
        sparkle.style.top = Math.random() * window.innerHeight + 'px';

        document.body.appendChild(sparkle);

        sparkle.animate([
            { opacity: 0, transform: 'scale(0)' },
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0, transform: 'scale(0)' }
        ], {
            duration: 2000,
            easing: 'ease-in-out'
        }).onfinish = () => sparkle.remove();
    }

    // ============== Animations et effets visuels ==============
    
    // Effet de typing pour le titre
    function typeWriter(element, text, speed = 100) {
        let i = 0;
        element.innerHTML = '';
        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        type();
    }

    // Animation des slots lors du survol
    function setupMouseEffects() {
        document.addEventListener('mousemove', function(e) {
            const slots = document.querySelectorAll('.slot.filled');
            slots.forEach(slot => {
                const rect = slot.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const deltaX = (e.clientX - centerX) * 0.02;
                const deltaY = (e.clientY - centerY) * 0.02;

                slot.style.transform = `translate(${deltaX}px, ${deltaY}px) rotateX(${deltaY}deg) rotateY(${deltaX}deg)`;
            });
        });

        // Reset des transformations au survol des autres éléments
        document.addEventListener('mouseleave', function() {
            const slots = document.querySelectorAll('.slot.filled');
            slots.forEach(slot => {
                slot.style.transform = '';
            });
        });
    }

    // ============== Initialisation principale ==============

    // Initialisation
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, initializing Unified Game Manager...');
        
        // Créer les particules si l'élément existe
        createParticles();
        
        // Initialiser l'interface des joueurs si les éléments existent
        if (document.getElementById('playerSlots') || document.getElementById('playersGrid')) {
            initializePlayerUI();
            setupPlayerEventListeners();
            updatePlayerUI();
        }
        
        // Initialiser le game picker si les éléments existent
        if (document.getElementById('gamePicker')) {
            initializeGamePicker().then(() => {
                console.log('GamePicker initialization complete');
                
                // Add entrance animation to cards with delay
                setTimeout(() => {
                    const cards = document.querySelectorAll('.game-card');
                    cards.forEach((card, index) => {
                        card.style.animationDelay = `${(index + 1) * 0.15}s`;
                        card.classList.add('animate-in');
                    });
                }, 500);
                
            }).catch(error => {
                console.error('GamePicker initialization failed:', error);
            });
        }
        
        // Réinitialiser les références
        gamePicker = document.getElementById('gamePicker');
        gameDetailsModalElement = document.getElementById('gameDetailsModal');
        
        // Initialiser le modal si les éléments existent
        if (gameDetailsModalElement && !gameDetailsModal && typeof bootstrap !== 'undefined') {
            gameDetailsModal = new bootstrap.Modal(gameDetailsModalElement, {
                backdrop: 'static',
                keyboard: false
            });
            
            gameDetailsModalElement.addEventListener('hidden.bs.modal', function (event) {
                resetView();
            });
        }
        
        // Configuration des effets de souris
        setupMouseEffects();
        
        // Create sparkles randomly
        setInterval(createSparkle, 1000);
    });

    // Animations supplémentaires au chargement
    window.addEventListener('load', function() {
        const title = document.querySelector('.title');
        if (title) {
            const originalText = title.innerHTML;
            typeWriter(title, originalText, 50);
        }

        // Animation d'apparition progressive des éléments
        const elements = document.querySelectorAll('.player-slots, .available-players, .options, .start-button');
        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            setTimeout(() => {
                el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, 200 + index * 150);
        });
    });

    // ============== Exposition des fonctions globales ==============
    
    // Exposer les fonctions nécessaires au niveau global
    window.selectGame = selectGame;
    window.goBack = goBack;
    window.selectOption = selectOption;
    window.startGame = startGame;
    window.gameState = gameState;
    window.gameConfig = gameConfig;
    
    // Exposer les classes pour utilisation externe si nécessaire
    window.Game = Game;
    window.GameManager = GameManager;

})();