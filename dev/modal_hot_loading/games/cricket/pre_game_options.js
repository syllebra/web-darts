// Ce script est exécuté une fois que le fichier pre_game_options.html
// est chargé dans la modale.

document.addEventListener('DOMContentLoaded', () => {
    const subTypeSelect = document.getElementById('cricketSubType'); // Assurez-vous que l'ID correspond à votre HTML
    const numPlayersInput = document.getElementById('numPlayers'); // Assurez-vous que l'ID correspond à votre HTML
    const selectedOptionsSummary = document.getElementById('selectedOptionsSummary');

    // Vérifie si les éléments existent avant d'ajouter des écouteurs
    if (subTypeSelect && numPlayersInput && selectedOptionsSummary) {
        function updateOptionsSummary() {
            const subType = subTypeSelect.value;
            const numPlayers = numPlayersInput.value;
            selectedOptionsSummary.textContent = `Type: ${subType}, Joueurs: ${numPlayers}`;

            // *** Important : Stocke les options sélectionnées dans une variable globale ***
            // Cela permettra au script de jeu principal (game.js) d'y accéder.
            window.currentGameOptions = {
                subType: subType,
                numPlayers: parseInt(numPlayers) // Convertit en nombre entier
            };
            console.log("Options de jeu sélectionnées :", window.currentGameOptions);
        }

        // Ajoute des écouteurs d'événements pour mettre à jour le résumé
        subTypeSelect.addEventListener('change', updateOptionsSummary);
        numPlayersInput.addEventListener('input', updateOptionsSummary); // 'input' pour une mise à jour en temps réel

        // Appelle la fonction une première fois pour initialiser l'affichage
        updateOptionsSummary();
    } else {
        console.error("Éléments HTML d'options de jeu introuvables. Vérifiez les IDs dans pre_game_options.html.");
    }
});