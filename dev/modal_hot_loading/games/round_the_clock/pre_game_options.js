

const atcNumPlayersInput = document.getElementById('atcNumPlayers');
const atcSelectedOptionsSummary = document.getElementById('atcSelectedOptionsSummary');

function updateAtcOptionsSummary() {
    const numPlayersValue = atcNumPlayersInput.value;
    const numPlayers = parseInt(numPlayersValue) || 1;

    atcSelectedOptionsSummary.textContent = `Joueurs: ${numPlayers}`;

    window.currentGameOptions = {
        numPlayers: numPlayers
    };
    // C'est ce log qui doit apparaître
    console.log("PRE-GAME OPTIONS: window.currentGameOptions mis à jour:", window.currentGameOptions);
}

atcNumPlayersInput.addEventListener('input', updateAtcOptionsSummary);
updateAtcOptionsSummary(); // Cette fonction est appelée immédiatement, donc le log devrait s'afficher