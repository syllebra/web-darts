// jeux/cricket/game.js

// Encapsulez toute la logique du jeu dans une fonction auto-exécutante (IIFE)
// pour créer une portée locale et éviter les conflits de variables globales.
(function() { // Début de l'IIFE

    // Récupérer les options choisies dans la modale de prégroupe
    const gameOptions = window.currentGameOptions || { subType: 'standard', numPlayers: 2 };

    // Mettre à jour l'affichage avec les options
    const cricketVersionSpan = document.getElementById('cricketVersion');
    const cricketPlayersSpan = document.getElementById('cricketPlayers');

    if (cricketVersionSpan) cricketVersionSpan.textContent = gameOptions.subType;
    if (cricketPlayersSpan) cricketPlayersSpan.textContent = gameOptions.numPlayers;

    console.log("Le jeu de Cricket est prêt à démarrer !");

    // Logique de jeu de cricket ici
    let currentPlayer = 1;
    const makeDartThrowButton = document.getElementById('makeDartThrow');
    const endCricketGameButton = document.getElementById('endCricketGame');

    // Définir les fonctions de gestionnaire d'événements pour pouvoir les retirer
    function dartThrow() {
        alert(`Joueur ${currentPlayer} lance sa fléchette !`);
        currentPlayer = (currentPlayer % gameOptions.numPlayers) + 1;
    }

    function handleEndGame() {
        if (confirm("Voulez-vous vraiment quitter le jeu ?")) {
            const event = new CustomEvent('gameEnded', { bubbles: true, cancelable: true });
            document.dispatchEvent(event);
        }
    }

    if (makeDartThrowButton) {
        makeDartThrowButton.addEventListener('click', dartThrow);
    }

    if (endCricketGameButton) {
        endCricketGameButton.addEventListener('click', handleEndGame);
    }

    // Fonction de nettoyage spécifique au jeu Cricket
    // Déclarez-la à l'intérieur de l'IIFE
    const cricketCleanup = () => {
        console.log("Nettoyage spécifique au jeu de Cricket...");
        // Supprimez les écouteurs d'événements spécifiques au jeu
        if (makeDartThrowButton) {
            makeDartThrowButton.removeEventListener('click', dartThrow);
        }
        if (endCricketGameButton) {
            endCricketGameButton.removeEventListener('click', handleEndGame);
        }
        // Annulez les timers ou boucles de jeu (setInterval, setTimeout, requestAnimationFrame)
        // Réinitialisez des états globaux propres au jeu
        console.log("Nettoyage de Cricket terminé.");
    };

    function receiveMqttMessage(payload) {
        console.log(`[${gameOptions.subType || 'Jeu'}] Message MQTT reçu dans le jeu :`, payload);
        // Ici, implémentez la logique spécifique à votre jeu en fonction du message MQTT
        // Exemple pour Cricket :
        if (typeof payload === 'object' && payload.score !== undefined && payload.player !== undefined) {
            // Mettre à jour l'affichage du score, etc.
            console.log(`Joueur ${payload.player} a marqué ${payload.score} !`);
            // Logique pour mettre à jour le tableau des scores du jeu
            // Par exemple, trouver l'élément du joueur et mettre à jour son texte
        } else {
            console.log("Message MQTT non reconnu ou non JSON pour ce jeu:", payload);
        }
    };

    // Exposer la fonction de nettoyage au scope global via l'objet window
    // en lui donnant un nom unique pour ce jeu (par exemple, cricketCleanup).
    window.currentActiveGameCleanup = cricketCleanup;
        // --- Exposer la fonction de réception MQTT spécifique à ce jeu ---
        // Utilisez un nom unique basé sur l'ID du jeu pour éviter les collisions si vous voulez
        // plusieurs types de jeux avec des traitements MQTT différents.
        // L'ID du jeu doit être passé ou dérivé ici si possible.
        // Pour l'instant, on utilise une approche simple :
    window[currentGameId + 'ReceiveMqttMessage'] = receiveMqttMessage; // Assurez-vous que currentGameId est accessible ici, sinon passez-le en paramètre à l'IIFE ou récupérez-le.


})(); // Fin de l'IIFE