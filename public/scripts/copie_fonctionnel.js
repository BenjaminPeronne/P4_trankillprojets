/**
 * @author Benjamin Peronne
 * @email contact@benjaminperonne.fr
 */

// // // // // // // // // // // // // // //
// Configuration de base
// // // // // // // // // // // // // // //
const API_URL = "https://trankillprojets.fr/P4/?";
let rechercheAdversaireInterval = null;
const gameStates = {
    OK: "OK"
};

const localStorageKeys = {
    pseudo: "p4_pseudo",
    identifiant: "p4_identifiant"
};

let gameState = {
    pseudo: '',
    identifiant: '',
    etat: '',
    rechercheEnCours: '',
    jeuActif: '',
    monTour: '',
    monNumeroJoueur: '',
    tour: '',
};


const etatMessages = {
    "KO": "Votre compte n'est pas reconnu par le serveur.",
    "OK": "Votre compte est reconnu par le serveur.",
    "En attente": "Il n'y a pas encore d'adversaire.",
    "Attente supprimée": "Attente d'adversaire supérieure à 2 minutes, suppression de la partie.",
    "En cours": "Une partie est en cours.",
    "Abandon": "Abandon de votre phase d'attente.",
    "joueur 1 gagne": "Le joueur numéro 1 gagne.",
    "joueur 2 gagne": "Le joueur numéro 2 gagne.",
    "Match nul": "Aucun des joueurs ne remporte la partie."
};

const etatAlerteTypes = {
    "KO": "danger",
    "OK": "success",
    "En attente": "info",
    "Attente supprimée": "warning",
    "En cours": "primary",
    "Abandon": "warning",
    "joueur 1 gagne": "success",
    "joueur 2 gagne": "success",
    "Match nul": "secondary"
};

// // // // // // // // // // // // // // //
// Utilitaires
// // // // // // // // // // // // // // //
async function fetchAPI(endpoint, params = {}, method = "GET") {
    const url = new URL(API_URL + endpoint);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    try {
        const response = await fetch(url, { method });
        if (!response.ok) throw new Error('Erreur de communication avec le serveur.');
        return await response.json();
    } catch (error) {
        console.error("Erreur Fetch :", error);
        throw error;
    }
}

function saveToLocalStorage(key, value) {
    localStorage.setItem(key, value);
}

function getFromLocalStorage(key) {
    return localStorage.getItem(key);
}

document.addEventListener('DOMContentLoaded', () => {
    const pseudo = getFromLocalStorage(localStorageKeys.pseudo);
    const reconnexionPlayerNameElement = document.getElementById('reconnexion-player-name');

    if (pseudo) {
        reconnexionPlayerNameElement.textContent = pseudo;
    } else {
        reconnexionPlayerNameElement.textContent = "non connecté";
    }
});

function definirNomsJoueurs(joueur1, joueur2) {
    document.getElementById('j1-name').textContent = joueur1 || "...";
    document.getElementById('j2-name').textContent = joueur2 || "...";
}

// // // // // // // // // // // // // // //
// Gestion UI
// // // // // // // // // // // // // // //
function afficherAlerte(message, type) {
    let alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        console.error('Le conteneur d\'alerte est introuvable dans le DOM.');
        return; // Sortez de la fonction si le conteneur n'existe pas.
    }

    let alert = alertContainer.querySelector('.alert');
    if (alert) {
        alert.className = `alert alert-${type}`;
        alert.innerText = message;
    } else {
        alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.role = 'alert';
        alert.innerText = message;
        alertContainer.appendChild(alert);
    }

    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function afficherFinDePartie(message, type) {
    clearInterval(rechercheAdversaireInterval);
    rechercheAdversaireInterval = null;
    gameState.rechercheEnCours = false;
    gameState.jeuActif = false;
    afficherAlerte(message, type);
}

function afficherErreur(error, consoleMessage) {
    clearInterval(rechercheAdversaireInterval);
    rechercheAdversaireInterval = null;
    gameState.rechercheEnCours = false;
    gameState.jeuActif = false;
    console.error(consoleMessage, error);
    afficherAlerte("Erreur réseau: " + error.message, "danger");
}

function showHideSections(showId, hideId) {
    document.getElementById(hideId).style.display = 'none';
    document.getElementById(showId).style.display = 'flex';
}

function retourInscription() {
    document.getElementById('participer').style.display = 'none';
    document.getElementById('inscription').style.display = 'flex';
}

function showParticiperForm() {
    // Cachez le formulaire d'inscription
    document.getElementById('inscription').style.display = 'none';

    // Affichez le formulaire de participation
    document.getElementById('participer').style.display = 'flex';

    // Récupérez et affichez le pseudo du joueur depuis localStorage
    const pseudo = localStorage.getItem('p4_pseudo');
    if (pseudo) {
        document.getElementById('connected-player-name').textContent = pseudo;
    }
}

function retournerEcranParticipation() {
    // Vous devriez ici définir la logique pour cacher le jeu et montrer l'écran de participation à nouveau.
    // Par exemple:
    document.getElementById('jeu').style.display = 'none';
    document.getElementById('participer').style.display = 'flex';
    // Réinitialiser l'état du jeu si nécessaire, etc.
}

// // // // // // // // // // // // // // //
// Logique de jeu
// // // // // // // // // // // // // // //
async function inscription() {
    const pseudoInput = document.getElementById('input-player');
    const pseudo = pseudoInput.value.trim();

    if (!pseudo) {
        afficherAlerte("Veuillez entrer un pseudo.", "warning");
        return;
    }

    try {
        // Appel à l'API pour créer un joueur avec le pseudo donné
        const response = await fetchAPI('inscription', { pseudo: pseudo });
        if (response.etat === gameStates.OK) {
            // Enregistrement des informations du joueur dans le localStorage
            saveToLocalStorage(localStorageKeys.pseudo, pseudo);
            saveToLocalStorage(localStorageKeys.identifiant, response.identifiant);

            // Affichage d'une alerte pour informer l'utilisateur de l'inscription réussie
            afficherAlerte("Inscription réussie", "success");
            document.getElementById('connected-player-name').textContent = pseudo; // Affichage du pseudo dans la section participer
            document.getElementById('reconnexion-player-name').textContent = pseudo; // Mise à jour du bouton de reco

            // Mise à jour de l'état global du jeu
            gameState = {
                ...gameState,
                pseudo: pseudo,
                identifiant: response.identifiant
            };

            // Masquage du formulaire d'inscription et affichage du pseudo du joueur dans le formulaire de participation
            showParticiperForm();

            // Affichage du message de connexion réussie
            afficherAlerte(`Connecté en tant que : ${pseudo}`, "success");
        } else {
            afficherAlerte(etatMessages[response.etat], etatAlerteTypes[response.etat]);
        }
    } catch (error) {
        afficherAlerte("Erreur lors de la connexion : " + error.message, "danger");
    }
}

async function verifierStatutPartie() {
    const identifiant = gameState.identifiant;
    if (!identifiant) {
        afficherAlerte("Aucun identifiant d'utilisateur trouvé. Veuillez vous inscrire ou vous reconnecter.", "warning");
        return;
    }

    try {
        const data = await fetchAPI("statut", { identifiant });
        console.log('Statut de la partie:', data);

        // Gère les différents états de la partie
        switch (data.etat) {
            case "En attente":
                // L'utilisateur est en attente d'un adversaire
                gameState.rechercheEnCours = true;
                afficherAlerte("En attente d'un adversaire...", "info");
                break;
            case "En cours":
                // Une partie est déjà en cours
                if (!gameState.jeuActif) {
                    // Si le jeu n'était pas actif, le démarrer
                    gameState.rechercheEnCours = false;
                    if (gameState.rechercheAdversaireInterval) {
                        clearInterval(gameState.rechercheAdversaireInterval);
                        gameState.rechercheAdversaireInterval = null;
                    }
                    gameState.jeuActif = true;
                    afficherAlerte("La partie commence !", "success");
                    initialiserJeu();
                }
                break;
            case "Attente supprimee":
                // L'attente de l'adversaire a été supprimée
                afficherFinDePartie("Attente d'adversaire supérieure à 2 minutes, suppression de la partie.", "warning");
                break;
            case "Abandon":
                // L'adversaire a abandonné la partie
                afficherFinDePartie("L'adversaire a abandonné.", "info");
                break;
            default:
                // Gérer tous les autres états
                afficherFinDePartie(etatMessages[data.etat] || "Statut inconnu.", etatAlerteTypes[data.etat] || "warning");
                break;
        }
    } catch (error) {
        afficherErreur(error, "Erreur lors de la vérification de l'état:");
    }
}

async function participer() {
    const identifiant = gameState.identifiant;
    if (!identifiant) {
        afficherAlerte("Aucun identifiant d'utilisateur trouvé. Veuillez vous inscrire ou vous reconnecter.", "warning");
        return;
    }

    try {
        console.log('Tentative de participation avec identifiant:', identifiant);
        const data = await fetchAPI("participer", { identifiant });

        console.log('Réponse de la participation:', data);
        gameState.etat = data.etat;

        if (data.etat in etatMessages) {
            afficherAlerte(etatMessages[data.etat], etatAlerteTypes[data.etat]);

            if (data.etat === "En attente") {
                // Informer l'utilisateur que l'attente d'un adversaire commence
                if (!gameState.rechercheAdversaireInterval) {
                    gameState.rechercheAdversaireInterval = setInterval(verifierStatutPartie, 1000);
                    gameState.rechercheEnCours = true;
                    afficherAlerte("En attente d'un adversaire...", "info");
                }
            } else if (data.etat === "En cours") {
                // Si la partie est déjà en cours, reconfigurer l'état du jeu pour le joueur actuel
                gameState.jeuActif = true;
                gameState.rechercheEnCours = false;
                gameState.monNumeroJoueur = data.joueur;
                initialiserJeu();
            } else {
                gameState.rechercheEnCours = false;
                if (gameState.rechercheAdversaireInterval) {
                    clearInterval(gameState.rechercheAdversaireInterval);
                    gameState.rechercheAdversaireInterval = null;
                }

            }
        } else {
            afficherAlerte("Statut inattendu: " + data.etat, "warning");
        }
    } catch (error) {
        console.error("Erreur lors de la participation:", error);
        afficherAlerte("Erreur réseau lors de la participation: " + error.message, "danger");
    }
}

async function tentativeReconnexion() {
    // Récupérez l'identifiant depuis le localStorage
    const identifiant = getFromLocalStorage(localStorageKeys.identifiant);
    if (!identifiant) {
        afficherAlerte("Aucun identifiant de joueur trouvé pour la reconnexion.", "warning");
        return; // Sortez si aucun identifiant n'est trouvé
    }

    try {
        // Vérifiez l'état du joueur avec l'identifiant
        const data = await fetchAPI("statut", { identifiant: identifiant });

        // Si le statut est OK, le joueur est toujours valide
        if (data.etat === gameStates.OK) {
            // Mise à jour de l'état du jeu
            gameState.pseudo = getFromLocalStorage(localStorageKeys.pseudo);
            gameState.identifiant = identifiant;

            console.log("Reconnexion réussie pour : ", gameState.pseudo);
            console.log('Identifiant :', gameState.identifiant)
            console.log('data :', data);

            // Mise à jour de l'UI pour montrer que le joueur est connecté
            showParticiperForm();
            document.getElementById('connected-player-name').textContent = gameState.pseudo;
            afficherAlerte(`Reconnecté en tant que : ${gameState.pseudo}`, "success");
        } else {
            // Gérez les autres états de la réponse
            afficherAlerte(etatMessages[data.etat] || "Session expirée ou invalide. Veuillez vous reconnecter.", etatAlerteTypes[data.etat] || "warning");
        }
    } catch (error) {
        // Affichez une alerte en cas d'erreur réseau
        afficherAlerte("Erreur de réseau lors de la tentative de reconnexion: " + error.message, "danger");
    }
}

async function reconnexion() {
    // Récupérer l'identifiant depuis le localStorage
    const identifiant = getFromLocalStorage(localStorageKeys.identifiant);

    if (!identifiant) {
        afficherAlerte("Aucun identifiant de joueur trouvé pour la reconnexion.", "warning");
        return;
    }

    try {
        // Vérifier l'état de la partie avec l'identifiant
        const data = await fetchAPI("statut", { identifiant });

        // Mettre à jour l'état du jeu avec les informations récupérées
        gameState.pseudo = getFromLocalStorage(localStorageKeys.pseudo);
        gameState.identifiant = identifiant;
        gameState.etat = data.etat;

        // Si le statut est "En cours", réinitialiser l'état du jeu et l'UI pour la partie en cours
        if (data.etat === "En cours") {
            // gameState.jeuActif = true;
            // gameState.monTour = (data.tour === gameState.monNumeroJoueur);
            // definirNomsJoueurs(data.pseudo, data.adversaire);
            // afficherTour(data.tour);
            // initialiserPlateau(data.carte);
            // showGame();
            // demarrerMiseAJourEnTempsReel(); // Assurez-vous que cette fonction est définie pour rafraîchir l'état du jeu
            showParticiperForm();
            afficherAlerte(`Reconnecté en tant que : ${gameState.pseudo}. Partie en cours !`, "success");
        } else if (data.etat === "OK") {
            // Si la partie n'est pas encore commencée, revenir au statut d'attente ou autre
            showParticiperForm();
            afficherAlerte("Reconnecté. En attente de la reprise de la partie ou de la recherche d'un adversaire.", "info");
        } else {
            // Si la partie est terminée ou autre statut, afficher le message correspondant
            afficherAlerte(etatMessages[data.etat] || "Statut de la partie inconnu.", etatAlerteTypes[data.etat] || "warning");
        }
    } catch (error) {
        afficherAlerte("Erreur de réseau lors de la tentative de reconnexion: " + error.message, "danger");
    }
}


async function deconnexion() {
    // Annuler la recherche d'un adversaire si elle est en cours
    if (gameState.rechercheEnCours && rechercheAdversaireInterval) {
        clearInterval(rechercheAdversaireInterval);
        rechercheAdversaireInterval = null;
        afficherAlerte("Recherche d'adversaire annulée.", "info");
        // Abandonner la partie si nécessaire
        await abandonnerPartie();
    }

    // Réinitialiser l'état du jeu
    gameState = {
        pseudo: '',
        identifiant: '',
        etat: '',
        rechercheEnCours: false,
        jeuActif: false,

    };

    // Afficher le formulaire d'inscription et masquer le formulaire de participation
    document.getElementById('inscription').style.display = 'flex';
    document.getElementById('participer').style.display = 'none';

    // Mettre à jour l'interface pour refléter l'état "non connecté"
    const playerNameElement = document.getElementById('reconnexion-player-name');
    // si est vide
    if (playerNameElement === "") {
        playerNameElement.textContent = "non connecté";
    }

    // Afficher une alerte pour informer l'utilisateur de la déconnexion
    afficherAlerte("Vous avez été déconnecté.", "info");
}


async function abandonnerPartie() {
    const identifiant = localStorage.getItem(localStorageKeys.identifiant);

    if (!identifiant) {
        afficherAlerte("Aucun identifiant de joueur trouvé pour abandonner la partie.", "warning");
        return;
    }

    try {
        const response = await fetchAPI("abandonner", { identifiant });

        clearInterval(gameState.miseAJourInterval);
        gameState.miseAJourInterval = null;


        // Réinitialiser l'état du jeu côté client
        gameState.jeuActif = false;
        gameState.monTour = false;
        gameState.rechercheEnCours = false;

        // Informer l'utilisateur de l'abandon réussi
        afficherAlerte("Vous avez abandonné la partie.", "info");

        // Cacher le plateau de jeu et afficher le formulaire d'inscription
        document.getElementById('jeu').style.visibility = 'hidden';
        document.getElementById('inscription').style.display = 'flex';
        document.getElementById('participer').style.display = 'none';
    }
    catch (error) {
        console.error("Erreur lors de l'abandon de la partie", error);
        afficherAlerte("Erreur réseau lors de l'abandon de la partie", "danger");
    }
}

async function deconnexion() {
    // Annuler la mise à jour en temps réel si elle est active
    if (gameState.miseAJourInterval) {
        clearInterval(gameState.miseAJourInterval);
        gameState.miseAJourInterval = null;
    }

    // Abandonner la partie si le jeu est actif
    if (gameState.jeuActif) {
        await abandonnerPartie();
    }

    // Effacer les données de l'utilisateur du localStorage
    // localStorage.removeItem(localStorageKeys.pseudo);
    // localStorage.removeItem(localStorageKeys.identifiant);

    // Réinitialiser l'état du jeu
    gameState = {
        pseudo: '',
        identifiant: '',
        etat: '',
        rechercheEnCours: false,
        jeuActif: false,
        monTour: false,
        monNumeroJoueur: '',
        tour: ''
    };

    // Afficher le formulaire d'inscription et masquer le jeu et le formulaire de participation
    document.getElementById('inscription').style.display = 'flex';
    document.getElementById('participer').style.display = 'none';
    document.getElementById('jeu').style.visibility = 'hidden';

    // Afficher une alerte pour informer l'utilisateur de la déconnexion
    afficherAlerte("Vous avez été déconnecté.", "info");
}

async function initialiserJeu() {
    const identifiant = gameState.identifiant;
    if (!identifiant) {
        afficherAlerte("Erreur: Identifiant du jeu non trouvé.", "danger");
        return;
    }

    try {
        const detailsPartie = await fetchAPI("statut", { identifiant });
        if (detailsPartie.etat === "En cours") {
            gameState.jeuActif = true;

            // Supposons que `detailsPartie.joueur` contient le numéro du joueur actuel ('1' ou '2')
            gameState.monNumeroJoueur = detailsPartie.joueur;

            definirNomsJoueurs(detailsPartie.pseudo, detailsPartie.adversaire);
            afficherTour(detailsPartie.tour); // La fonction afficherTour sera mise à jour pour utiliser cette nouvelle logique.
            initialiserPlateau(detailsPartie.carte);
            showGame();
            demarrerMiseAJourEnTempsReel();
        } else {
            afficherAlerte("Erreur: État de la partie inattendu.", "warning");
        }
    } catch (error) {
        console.error("Erreur lors de l'initialisation du jeu", error);
        afficherAlerte("Erreur réseau lors de l'initialisation du jeu.", "danger");
    }
}

function demarrerMiseAJourEnTempsReel() {
    // Assurez-vous de n'avoir qu'une seule mise à jour en temps réel active
    if (gameState.miseAJourInterval) {
        clearInterval(gameState.miseAJourInterval);
    }

    gameState.miseAJourInterval = setInterval(async () => {
        if (!gameState.jeuActif) {
            clearInterval(gameState.miseAJourInterval); // Arrête l'intervalle si le jeu n'est plus actif
            return;
        }
        try {
            const detailsPartie = await fetchAPI("statut", { identifiant: gameState.identifiant });
            switch (detailsPartie.etat) {
                case "En cours":
                    actualisationPlateau(detailsPartie.carte);
                    afficherTour(detailsPartie.tour); // Assurez-vous de passer le tour de l'API ici
                    break;
                case "Abandon":
                    afficherAlerte("L'adversaire a abandonné la partie.", "warning");
                    gameState.jeuActif = false;
                    clearInterval(gameState.miseAJourInterval);
                    retournerEcranParticipation();
                    break;
                case "OK":
                    afficherAlerte("La partie a été réinitialisée. Retour à l'écran de participation.", "info");
                    gameState.jeuActif = false;
                    clearInterval(gameState.miseAJourInterval);
                    retournerEcranParticipation();
                    break;
                default:
                    finDeJeu(detailsPartie.etat);
                    gameState.jeuActif = false;
                    clearInterval(gameState.miseAJourInterval);
                    retournerEcranParticipation();
                    break;
            }
        } catch (error) {
            afficherErreur(error, "Erreur lors de la mise à jour en temps réel");
            retournerEcranParticipation();
        }
    }, 1000); // Mettre à jour toutes les secondes
}


function initialiserPlateau(carte) {
    const plateau = document.getElementById('plateau');
    plateau.innerHTML = '';

    carte.forEach((ligne, indiceLigne) => {
        ligne.forEach((cell, indiceColonne) => {
            // Ajouter 1 à indiceColonne pour commencer la numérotation à 1
            const pion = document.createElement('div');
            pion.classList.add('pion');
            // Utiliser indiceColonne + 1 ici pour le dataset et l'id
            pion.id = `cell-${indiceLigne}-${indiceColonne + 1}`;
            pion.dataset.colonne = indiceColonne + 1;
            pion.dataset.ligne = indiceLigne;

            if (cell === 1) {
                pion.classList.add('joueur1');
            } else if (cell === 2) {
                pion.classList.add('joueur2');
            }

            plateau.appendChild(pion);
        });
    });

    // Ajouter les interactions après l'initialisation du plateau
    ajoutInteractions();
}

function showGame() {
    document.getElementById('inscription').style.display = 'none';
    document.getElementById('participer').style.display = 'none';
    document.getElementById('jeu').style.visibility = 'visible';
}

function ajoutInteractions() {
    document.querySelectorAll('.pion').forEach(pion => {
        pion.addEventListener('click', function () {
            let colonne = this.dataset.colonne;
            jouerCoup(colonne);
        });
    });
}

async function jouerCoup(colonne) {
    console.log('Tentative de jouer un coup dans la colonne:', colonne);
    if (!gameState.jeuActif) {
        console.log("La partie n'est pas active.");
        return;
    }
    if (!gameState.monTour) {
        console.log("Ce n'est pas votre tour.");
        afficherAlerte("Patientez, ce n'est pas encore votre tour.", "info");
        return;
    }
    const identifiant = localStorage.getItem(localStorageKeys.identifiant);
    if (identifiant) {
        try {
            const data = await fetchAPI("jouer", { position: colonne, identifiant: identifiant });

            if (data.etat === "En cours") {
                actualisationPlateau(data.carte);
                afficherTour(data.tour);  // Ici, data.tour devrait être soit 1 soit 2 selon qui a le tour.
            } else {
                finDeJeu(data.etat);
            }
        } catch (error) {
            console.error("Erreur lors de la tentative de jouer un coup", error);
            afficherAlerte("Erreur réseau lors de la tentative de jouer un coup", "danger");
        }
    }
}

function afficherTour(tourDeJeu) {
    // Déterminer si c'est le tour du joueur
    gameState.monTour = (gameState.monNumeroJoueur === tourDeJeu);

    // Mettre à jour le texte de l'interface utilisateur
    const playerNameElement = document.getElementById('player-name');
    if (gameState.monTour) {
        playerNameElement.textContent = "C'est votre tour";
    } else {
        playerNameElement.textContent = "Tour de l'adversaire";
    }
}

function actualisationPlateau(carte) {
    for (let i = 0; i < carte.length; i++) {
        for (let j = 0; j < carte[i].length; j++) {
            // Ajouter 1 à j pour correspondre à la numérotation commençant à 1
            const cellule = document.getElementById(`cell-${i}-${j + 1}`);
            if (cellule) {
                cellule.className = 'pion'; // Réinitialiser les classes
                if (carte[i][j] === 1) {
                    cellule.classList.add('joueur1', 'fa');
                } else if (carte[i][j] === 2) {
                    cellule.classList.add('joueur2');
                }
            } else {
                console.error('Element non trouvé pour:', `cell-${i}-${j + 1}`);
            }
        }
    }
}


async function MatchNul() {
    // Afficher une notification de match nul
    afficherAlerte("Match nul", "info");
    gameState.jeuActif = false;
}

async function finDeJeu(etat) {
    let message = "";
    switch (etat) {
        case "joueur 1 gagne":
            message = (gameState.monNumeroJoueur === '1') ? "Vous avez gagné !" : "Vous avez perdu.";
            break;
        case "joueur 2 gagne":
            message = (gameState.monNumeroJoueur === '2') ? "Vous avez gagné !" : "Vous avez perdu.";
            break;
        case "Match nul":
            message = "Match nul.";
            break;
        case "Abandon":
            message = "L'adversaire a abandonné.";
            break;
        case "Attente supprimée":
            message = "Attente d'adversaire supérieure à 2 minutes, suppression de la partie.";
            break;
        default:
            message = "Fin de la partie.";
            break;
    }
    afficherAlerte(message, "info");
    gameState.jeuActif = false;
}