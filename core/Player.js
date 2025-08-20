
class Player {

    constructor(id, name, country = '🏳️', icon = '👤', color = '#ff4444', createdAt, stats) {
        this.id = id;
        this.name = name;
        this.country = country;
        this.color = color;
        this.icon = icon;
        this.createdAt = createdAt; // new Date();
        this.stats = stats;
        
        // {
        //     gamesPlayed: 0,
        //     gamesWon: 0,
        //     totalScore: 0,
        //     bestScore: 0,
        //     averageScore: 0
        // };
    }

    // Met à jour les statistiques après une partie
    updateStats(score, won = false) {
        this.stats.gamesPlayed++;
        this.stats.totalScore += score;
        
        if (won) {
            this.stats.gamesWon++;
        }
        
        if (score > this.stats.bestScore) {
            this.stats.bestScore = score;
        }
        
        this.stats.averageScore = Math.round(this.stats.totalScore / this.stats.gamesPlayed);
    }

    // Retourne le taux de victoire
    getWinRate() {
        if (this.stats.gamesPlayed === 0) return 0;
        return Math.round((this.stats.gamesWon / this.stats.gamesPlayed) * 100);
    }

    // Retourne une représentation string du joueur
    getDisplayName() {
        return `${this.country} ${this.name}`;
    }

    // Retourne l'icon avec émoji
    getDisplayAvatar() {
        return `${this.icon} ${this.name}`;
    }

    // Convertit l'objet en JSON pour le stockage
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            country: this.country,
            icon: this.icon,
            createdAt: this.createdAt,
            stats: this.stats
        };
    }

    // Crée un Player depuis un objet JSON
    static fromJSON(data) {
        const player = new Player(data.id, data.name, data.country, data.icon, data.color, data.createdAt, data.stats);
        return player;
    }

    // Valide les données du joueur
    static validate(name, country, icon, color) {
        const errors = [];
        
        if (!name || name.trim().length === 0) {
            errors.push('Le nom est requis');
        }
        
        if (name && name.trim().length > 20) {
            errors.push('Le nom doit faire moins de 20 caractères');
        }
        
        if (!country) {
            errors.push('Un drapeau est requis');
        }
        
        if (!icon) {
            errors.push('Un icon est requis');
        }

        if (!color) {
            errors.push('Un couleur est requise');
        }
        
        return errors;
    }
}

// Classe pour gérer la liste des joueurs
class PlayerManager {
    constructor() {
        this.players = [];
        this.loadPlayers();
    }

    generateNextId() {
        if (this.players.length === 0) {
            return 1; // Si aucun joueur, le premier ID est 1
        } else {
            // Extrait tous les IDs existants et trouve le maximum
            const maxId = Math.max(...this.players.map(player => player.id));
            return maxId + 1; // Le prochain ID est le max + 1
        }
    }

    // Ajoute un nouveau joueur
    addPlayer(name, country, icon, color = '#ff4444' ) {
        const errors = Player.validate(name, country, icon, color);
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        // Vérifie si le nom existe déjà
        if (this.players.some(player => player.name.toLowerCase() === name.toLowerCase())) {
            throw new Error('Un joueur avec ce nom existe déjà');
        }

        const player = new Player(this.generateNextId(), name.trim(), country, icon, color, new Date(), { gamesPlayed: 0, gamesWon: 0, totalScore: 0, bestScore: 0, averageScore: 0 });
        this.players.push(player);
        this.savePlayers();
        return player;
    }

    // Supprime un joueur par ID
    removePlayer(playerId) {
        const index = this.players.findIndex(player => player.id === playerId);
        if (index !== -1) {
            this.players.splice(index, 1);
            this.savePlayers();
            return true;
        }
        return false;
    }

    // Récupère un joueur par ID
    getPlayer(playerId) {
        return this.players.find(player => player.id === playerId);
    }

    // Récupère tous les joueurs
    getAllPlayers() {
        return [...this.players];
    }

    // Met à jour un joueur
    updatePlayer(playerId, updates) {
        const player = this.getPlayer(playerId);
        if (!player) {
            throw new Error('Joueur introuvable');
        }

        // Valide les mises à jour
        const { name, country, icon } = updates;
        if (name !== undefined || country !== undefined || icon !== undefined) {
            const errors = Player.validate(
                name !== undefined ? name : player.name,
                country !== undefined ? country : player.country,
                icon !== undefined ? icon : player.icon
            );
            if (errors.length > 0) {
                throw new Error(errors.join(', '));
            }
        }

        // Vérifie l'unicité du nom si modifié
        if (name && name !== player.name) {
            if (this.players.some(p => p.id !== playerId && p.name.toLowerCase() === name.toLowerCase())) {
                throw new Error('Un joueur avec ce nom existe déjà');
            }
        }

        // Applique les mises à jour
        Object.assign(player, updates);
        this.savePlayers();
        return player;
    }

    // Sauvegarde dans localStorage
    savePlayers() {
        try {
            const data = this.players.map(player => player.toJSON());
            localStorage.setItem('dartgame_players', JSON.stringify(data));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
        }
    }

    // Charge depuis localStorage
    loadPlayers() {
        try {
            const data = localStorage.getItem('dartgame_players');
            if (data) {
                const parsedData = JSON.parse(data);
                this.players = parsedData.map(playerData => Player.fromJSON(playerData));
            }
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            this.players = [];
        }
    }

    // Recherche des joueurs
    searchPlayers(query) {
        const searchTerm = query.toLowerCase();
        return this.players.filter(player => 
            player.name.toLowerCase().includes(searchTerm)
        );
    }

    // Trie les joueurs
    sortPlayers(sortBy = 'name') {
        switch (sortBy) {
            case 'name':
                return [...this.players].sort((a, b) => a.name.localeCompare(b.name));
            case 'winRate':
                return [...this.players].sort((a, b) => b.getWinRate() - a.getWinRate());
            case 'gamesPlayed':
                return [...this.players].sort((a, b) => b.stats.gamesPlayed - a.stats.gamesPlayed);
            case 'bestScore':
                return [...this.players].sort((a, b) => b.stats.bestScore - a.stats.bestScore);
            case 'created':
                return [...this.players].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            default:
                return [...this.players];
        }
    }

    // Exporte les données
    exportPlayers() {
        return JSON.stringify(this.players.map(player => player.toJSON()), null, 2);
    }

    // Importe des données
    importPlayers(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            const importedPlayers = data.map(playerData => Player.fromJSON(playerData));
            this.players = importedPlayers;
            this.savePlayers();
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'import:', error);
            return false;
        }
    }
}

const playerManager = new PlayerManager();
