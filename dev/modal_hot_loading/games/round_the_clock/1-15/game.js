// jeux/around_the_clock/game.js

(function() {

    // Récupération des options de jeu (nombre de joueurs)
    const gameOptions = window.currentGameOptions || { numPlayers: 1 };
    const totalPlayers = gameOptions.numPlayers; // <-- Cette variable doit être > 1 pour que ça tourne

    console.log("ATC Game Start - Total Players:", totalPlayers); // Ajoutez ce log pour vérifier la valeur


    // Éléments du DOM
    const atcTargetNumberDisplay = document.getElementById('atcTargetNumber'); // <--- C'est la ligne manquante
    const atcMainTargetDisplay = document.getElementById('atcMainTargetDisplay');
    const atcPlayerNameSpan = document.getElementById('atcCurrentPlayer');
    const atcMakeDartThrowButton = document.getElementById('atcMakeDartThrow');
    const atcEndGameButton = document.getElementById('atcEndGame');
    const atcPlayerList = document.getElementById('atcPlayerList');
    // Variables de jeu
    let currentPlayerIndex = 0; // Index du joueur actuel (0 à totalPlayers - 1)
    const players = Array.from({ length: totalPlayers }, (_, i) => ({
        id: i, // Un ID unique pour le joueur
        name: `Joueur ${i + 1}`,
        targetSector: 1, // Chaque joueur commence avec la cible 1
        throwsRemaining: 3, // 3 fléchettes par défaut pour chaque tour
    }));

    // --- Fonctions de mise à jour de l'interface ---
    function updateDisplay() {
        const currentPlayer = players[currentPlayerIndex];


        // Mise à jour de la section du joueur actuel et cible principale
        // atcTargetNumberDisplay (pour le texte "Cible actuelle : X")
        if (atcTargetNumberDisplay) atcTargetNumberDisplay.textContent = currentPlayer.targetSector > 20 ? "Bullseye" : currentPlayer.targetSector;
        // atcMainTargetDisplay (pour le grand cercle)
        if (atcMainTargetDisplay) atcMainTargetDisplay.textContent = currentPlayer.targetSector > 20 ? "BULL" : currentPlayer.targetSector;
        if (atcPlayerNameSpan) atcPlayerNameSpan.textContent = `${currentPlayer.name} (Fléchettes: ${currentPlayer.throwsRemaining})`;

        // --- NOUVELLE FONCTION : Mise à jour du tableau des joueurs ---
        updatePlayerScoreboard();
    }

    function updatePlayerScoreboard() {
        if (!atcPlayerList) return; // S'assurer que l'élément existe

        atcPlayerList.innerHTML = ''; // Vide la liste existante

        players.forEach((player, index) => {
            const playerItem = document.createElement('li');
            playerItem.classList.add('player-item');

            // Ajoute une classe spéciale si c'est le joueur actuel
            if (index === currentPlayerIndex) {
                playerItem.classList.add('current-player');
            }

            const playerNameSpan = document.createElement('span');
            playerNameSpan.classList.add('player-name');
            playerNameSpan.textContent = player.name;

            const playerTargetSpan = document.createElement('span');
            playerTargetSpan.classList.add('player-target');
            playerTargetSpan.textContent = `Cible: ${player.targetSector > 20 ? "Bullseye" : player.targetSector}`;
            // Optionnel: vous pouvez aussi afficher les fléchettes restantes du joueur dans cette liste
            // playerTargetSpan.textContent += ` (${player.throwsRemaining} fléchettes)`;


            playerItem.appendChild(playerNameSpan);
            playerItem.appendChild(playerTargetSpan);
            atcPlayerList.appendChild(playerItem);
        });
    }

    // --- Logique de jeu ---
    function dartThrow(dartThrow) {
        const throwSector = dartThrow.parseZone().sector;
        if (throwSector === players[currentPlayerIndex].targetSector) {
            if (throwSector === 25) {
                //process victory
                console.log("Victory for" + players[currentPlayerIndex].name);
                alert(`Bravo, ${players[currentPlayerIndex]} a touché le Bullseye et a terminé Around The Clock !`);
                alert("Jeu terminé ! Fermeture...");
                const event = new CustomEvent('gameEnded', { bubbles: true, cancelable: true });
                document.dispatchEvent(event);
                return;
            } else {
                if (players[currentPlayerIndex].targetSector + getMultiplier(dartThrow) > 20) {
                    players[currentPlayerIndex].targetSector = 25;
                } else {
                    players[currentPlayerIndex].targetSector += getMultiplier(dartThrow);
                }
            }
        }
        players[currentPlayerIndex].throwsRemaining--;
        if (players[currentPlayerIndex].throwsRemaining === 0 ) {
            console.log(currentPlayerIndex);
            currentPlayerIndex = (currentPlayerIndex + 1) % totalPlayers;
            console.log(currentPlayerIndex);
            // Réinitialiser les fléchettes pour le joueur qui commence son tour
            players[currentPlayerIndex].throwsRemaining = 3;
        }
        // Changer de joueur
        updateDisplay();
    }


    function getMultiplier(dartThrow) {
        const zoneInfo = dartThrow.parseZone();
        return zoneInfo.multiplier
    }

    function handleEndGame() {
        if (confirm("Voulez-vous vraiment quitter Around The Clock ?")) {
            const event = new CustomEvent('gameEnded', { bubbles: true, cancelable: true });
            document.dispatchEvent(event);
        }
    }

    // --- Initialisation du jeu ---
    console.log("Le jeu Around The Clock est prêt à démarrer !");
    updateDisplay(); // Afficher les informations initiales

    // --- Attachement des écouteurs d'événements ---
    if (atcMakeDartThrowButton) {
        atcMakeDartThrowButton.addEventListener('click', dartThrow);
    }
    if (atcEndGameButton) {
        atcEndGameButton.addEventListener('click', handleEndGame);
    }

    // --- Fonction de nettoyage ---
    const aroundTheClockCleanup = () => {
        console.log("Nettoyage spécifique au jeu Around The Clock...");
        if (atcMakeDartThrowButton) {
            atcMakeDartThrowButton.removeEventListener('click', dartThrow);
        }
        if (atcEndGameButton) {
            atcEndGameButton.removeEventListener('click', handleEndGame);
        }
        // Réinitialiser les états si nécessaire (par exemple, si des setInterval ou setTimeout sont en cours)
        console.log("Nettoyage de Around The Clock terminé.");
    };

    function receiveMqttMessage(payload) {
        console.log(`[${gameOptions.subType || 'Jeu'}] Message MQTT reçu dans le jeu :`, payload);
        // Ici, implémentez la logique spécifique à votre jeu en fonction du message MQTT
        // Exemple pour Cricket :
        if (typeof payload === 'object' ) {
            const lastThrow = new Throw(payload.alpha, payload.d, payload.zone);
            dartThrow(lastThrow )
            // Mettre à jour l'affichage du score, etc.
            console.log(`Joueur ${players[currentPlayerIndex].name} a marqué ${payload.zone}  throw remaining ${players[currentPlayerIndex].throwsRemaining} !`);
            // Logique pour mettre à jour le tableau des scores du jeu
            // Par exemple, trouver l'élément du joueur et mettre à jour son texte
        } else {
            console.log("Message MQTT non reconnu ou non JSON pour ce jeu:", payload);
        }
    };
    // Exposer la fonction de nettoyage au scope global
    window.currentActiveGameCleanup = aroundTheClockCleanup;
    window[currentGameId + 'ReceiveMqttMessage'] = receiveMqttMessage; // Assurez-vous que currentGameId est accessible ici, sinon passez-le en paramètre à l'IIFE ou récupérez-le.

})();