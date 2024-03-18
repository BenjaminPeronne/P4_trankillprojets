
/**
 * @author Benjamin Peronne
 * @email contact@benjaminperonne.fr
 */

// // // // // // // // // // // // // // //
// Déclaration initiale des objets et variables nécessaires pour le jeu
// // // // // // // // // // // // // // //
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

let jeu = {
    joueur: {
        pseudo: '',
        identifiant: '',
        etat: ''
    },
    joueurs: [{}, {}],
    current_player: 1,
    nbr_instances: 0,
    keep_playing: true,
    intervalID: null
};
// // // // // // // // // // // // // // //
// Fonction pour télécharger un objet en tant que fichier JSON
// // // // // // // // // // // // // // //
function downloadObjectAsJson(exportObj, exportName) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// // // // // // // // // // // // // // //
// Fonction pour initialiser le plateau de jeu
// // // // // // // // // // // // // // //
function init_plateau() {
    let plateau = document.querySelector('#plateau');
    plateau.innerHTML = ''; // Vider le plateau avant initialisation
    for (let i = 0; i < 49; i++) {
        let cell = document.createElement('div');
        cell.classList.add('pion');
        cell.dataset.colonne = i % 7;
        cell.dataset.rangée = Math.floor(i / 7);
        cell.addEventListener('click', () => jouerCoup(i % 7));
        plateau.appendChild(cell);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Vérifie si un identifiant est déjà enregistré et affiche le formulaire approprié
    const identifiantEnregistre = localStorage.getItem('p4_identifiant');
    if (identifiantEnregistre) {
        showParticiperForm();
    }
});


function afficherAlerte(message, type) {
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.role = 'alert';
        alert.innerText = message;
        alertContainer.appendChild(alert);

        // Optionnel : supprimer l'alerte après un certain délai
        setTimeout(() => {
            alertContainer.removeChild(alert);
        }, 5000);
    } else {
        console.error('Le conteneur d\'alertes est introuvable.');
    }
}


// // // // // // // // // // // // // // //
// Fonction pour l'inscription d'un joueur
// // // // // // // // // // // // // // //
function inscription() {
    let inputElement = document.getElementById('input-player');
    let pseudo = inputElement.value.trim();

    if (!pseudo) {
        afficherAlerte("Veuillez entrer un pseudonyme.", "warning"); // Utilisez Bootstrap pour une alerte plus intégrée
        return;
    }

    fetch(`https://trankillprojets.fr/P4/?inscription&pseudo=${encodeURIComponent(pseudo)}`)
        .then(response => response.json())
        .then(data => {
            if (data.etat === "OK") {
                jeu.joueur.identifiant = data.identifiant;
                jeu.joueur.etat = data.etat;
                jeu.joueur.pseudo = pseudo;

                // Stocker les informations du joueur dans localStorage
                localStorage.setItem('p4_pseudo', pseudo); // Utilisez le pseudo entré par l'utilisateur, pas celui retourné par l'API
                localStorage.setItem('p4_identifiant', data.identifiant);

                // Générer un fichier JSON et le télécharger
                downloadObjectAsJson({ pseudo: pseudo, identifiant: data.identifiant }, `${pseudo}_identifiant`);

                // Cachez le formulaire d'inscription et affichez le jeu
                document.getElementById('inscription').style.display = 'none';
                document.querySelector('#jeu').style.visibility = 'visible';
                init_plateau(); // Initialise le plateau de jeu
            } else {
                afficherAlerte("Inscription échouée : " + data.etat, "danger");
            }
        })
        .catch(error => {
            console.error("Erreur lors de l'inscription :", error);
            afficherAlerte("Erreur de réseau lors de l'inscription.", "danger");
        });
}

// // // // // // // // // // // // // // //
// Fonction pour rejoindre une partie après l'inscription
// // // // // // // // // // // // // // //
function participer() {
    let identifiantInput = document.getElementById('input-id');
    let identifiant = identifiantInput.value.trim();

    if (!identifiant) {
        afficherAlerte("Veuillez entrer votre identifiant.", "danger");
        return;
    }

    localStorage.setItem('p4_identifiant', identifiant);
    jeu.joueur.identifiant = identifiant;

    fetch(`https://trankillprojets.fr/P4/?participer&identifiant=${encodeURIComponent(identifiant)}`)
        .then(response => response.json())
        .then(data => {
            if (data.etat === "En attente") {
                afficherAlerte("Inscription réussie. En attente d'un adversaire...", "success");
                // Vérifier le statut en continu jusqu'à ce qu'un adversaire soit trouvé ou que la partie commence
                jeu.intervalID = setInterval(() => verifierStatutEtDemarrerPartie(identifiant), 3000);
            } else {
                afficherAlerte(data.etat, "danger");
            }
        })
        .catch(error => {
            afficherAlerte(`Erreur de réseau lors de la tentative de participation: ${error}`, "danger");
        });
}


function verifierStatutEtDemarrerPartie(identifiant) {
    verifierStatut(identifiant)
        .then(data => {
            afficherStatut(data.etat);
            switch (data.etat) {
                case "En attente":
                    // En attente d'un adversaire, pas d'action requise ici car la boucle continue
                    afficherAlerte("Toujours en attente d'un adversaire...", "info");
                    break;
                case "En cours":
                    // L'adversaire est trouvé, on lance la partie
                    clearInterval(jeu.intervalID); // Arrêter la vérification périodique
                    initialiserJeu(); // Initialiser le jeu
                    break;
                case "joueur 1 gagne":
                case "joueur 2 gagne":
                case "Match nul":
                    // La partie est terminée, afficher le résultat
                    clearInterval(jeu.intervalID); // Arrêter la vérification périodique
                    afficherAlerte(`La partie est terminée : ${data.etat}`, etatAlerteTypes[data.etat]);
                    break;
                default:
                    // Gérer d'autres états non attendus
                    clearInterval(jeu.intervalID); // Arrêter la vérification périodique
                    afficherAlerte(`Statut inattendu reçu : ${data.etat}`, "warning");
                    break;
            }
        })
        .catch(error => {
            afficherAlerte(`Erreur de réseau lors de la vérification de l'état: ${error}`, "danger");
            clearInterval(jeu.intervalID); // Arrêter la vérification en cas d'erreur
        });
}


function verifierStatut(identifiant) {
    return fetch(`https://trankillprojets.fr/P4/?statut&identifiant=${encodeURIComponent(identifiant)}`)
        .then(response => response.json())
        .then(data => {
            if (data.etat === "Attente supprimée" || data.etat === "Abandon") {
                // Annuler l'attente si l'adversaire a abandonné ou si l'attente est supprimée
                clearInterval(jeu.intervalID);
            }
            return data;
        });
}

function afficherStatut(etat) {
    const message = etatMessages[etat] || "Statut inconnu.";
    const type = etatAlerteTypes[etat] || "secondary";
    afficherAlerte(message, type);
}

function showParticiperForm() {
    // Cacher le formulaire d'inscription
    document.getElementById('inscription').style.display = 'none';
    // Afficher le formulaire de participation
    document.getElementById('participer').style.display = 'flex';
}

// // // // // // // // // // // // // // //
// Fonction pour initialiser le jeu
// // // // // // // // // // // // // // //

function initialiserJeu() {
    // Initialiser le plateau de jeu
    init_plateau();

    // Démarrez la vérification périodique du statut du jeu pour mettre à jour l'UI en temps réel
    jeu.intervalID = setInterval(() => {
        verifierStatut(jeu.joueur.identifiant).then(data => {
            // Affichez les informations pertinentes de la partie en cours
            if (data.etat === "En cours") {
                // Mise à jour des noms des joueurs sur l'interface
                document.getElementById('j1-name').textContent = jeu.joueur.pseudo;
                document.getElementById('j2-name').textContent = data.adversaire || 'Adversaire'; // ou une valeur par défaut si data.adversaire n'est pas défini

                // Mettre à jour le plateau de jeu selon la "carte" du jeu reçu du serveur
                miseAJourPlateau(data.carte);
            } else if (data.etat === "Attente supprimée" || data.etat === "Abandon" || data.etat === "KO") {
                // Traitez les cas où la partie est terminée ou ne peut pas commencer
                clearInterval(jeu.intervalID); // Arrêtez de vérifier le statut
                afficherAlerte(etatMessages[data.etat], etatAlerteTypes[data.etat]);
                // Éventuellement réinitialiser l'interface utilisateur pour une nouvelle partie ou afficher les options de fin de jeu
                resetGameUI();
            }
            // Gérez les autres états comme joueur 1 gagne, joueur 2 gagne, Match nul, etc.
        }).catch(error => {
            afficherAlerte("Erreur lors de la récupération de l'état du jeu: " + error, "danger");
        });
    }, 3000); // Vérifiez toutes les 3 secondes
}

// Fonction pour mettre à jour le plateau de jeu avec les données actuelles
function miseAJourPlateau(carte) {
    const plateau = document.querySelector('#plateau');
    carte.forEach((row, rowIndex) => {
        row.forEach((cell, cellIndex) => {
            // Calculer l'index de la cellule basé sur rowIndex et cellIndex si nécessaire
            const cellElement = plateau.querySelector(`[data-rangée="${rowIndex}"][data-colonne="${cellIndex}"]`);
            cellElement.className = cell === 1 ? 'pion joueur1' : cell === 2 ? 'pion joueur2' : 'pion';
        });
    });
}

// Fonction pour réinitialiser l'interface utilisateur pour une nouvelle partie ou fin de jeu
function resetGameUI() {
    // Cacher le plateau de jeu
    document.querySelector('#jeu').style.visibility = 'hidden';
    // Réinitialiser l'état du jeu
    jeu = {
        joueur: {
            pseudo: '',
            identifiant: '',
            etat: ''
        },
        joueurs: [{}, {}],
        current_player: 1,
        nbr_instances: 0,
        keep_playing: true,
        intervalID: null
    };
    // Afficher le formulaire d'inscription ou de participation pour commencer une nouvelle partie
    document.getElementById('inscription').style.display = 'flex';
    // Cacher le formulaire de participation si nécessaire
    document.getElementById('participer').style.display = 'none';
    // Remettre à zéro le plateau de jeu
    const pions = document.querySelectorAll('.pion');
    pions.forEach(pion => pion.className = 'pion');
}


// // // // // // // // // // // // // // //
// Fonction pour finir le jeu 
// // // // // // // // // // // // // // //
function finirJeu() {
    // Utiliser jeu.joueur pour accéder à l'objet joueur dans l'objet jeu
    let identifiant = jeu.joueur.identifiant || sessionStorage.getItem('p4_identifiant');

    console.log(identifiant);

    if (!identifiant) {
        alert("Erreur : Aucun identifiant de joueur n'est disponible pour abandonner la partie.");
        return;
    }

    fetch(`https://trankillprojets.fr/P4/?abandonner&identifiant=${encodeURIComponent(identifiant)}`)
        .then(response => response.json())
        .then(data => {
            if (data.etat === "OK") {
                alert('Vous avez abandonné la partie.');
                resetGameUI();
            } else {
                alert("Impossible d'abandonner la partie : " + data.etat);
            }
        })
        .catch(error => {
            console.error("Erreur lors de l'abandon :", error);
            alert("Erreur de réseau lors de l'abandon de la partie.");
        });
}

function resetGameUI() {
    document.querySelector('#jeu').style.visibility = 'hidden';
    document.getElementById('inscription').style.display = 'flex';
    document.getElementById('participer').style.display = 'none';

    jeu.keep_playing = false;
    jeu.nbr_instances = 0;
    jeu.current_player = 1;
    jeu.joueurs = [{}, {}]; // Réinitialiser les objets des joueurs
    jeu.joueur = { pseudo: '', identifiant: '', etat: '' }; // Réinitialiser l'objet joueur

    const pions = document.querySelectorAll('.pion');
    pions.forEach(pion => pion.style.backgroundColor = 'transparent');

    // Si un interval est défini pour vérifier le statut, l'arrêter
    if (jeu.intervalID) {
        clearInterval(jeu.intervalID);
        jeu.intervalID = null;
    }

    // Mise à jour des noms des joueurs et autres éléments d'interface si nécessaire
    // ...
}

function empty(box) {
    tokens = box.style.backgroundColor;
    return tokens != 'red' && tokens != 'yellow';
}

// We check if a line has 4 tokens of the same color aligned
function if_aligned(board, item, i, n, step = 1, r = 0) {
    if (i > n || r == 4) return [r, item];
    else {
        let c = board[i].style.backgroundColor;
        return c && c == item
            ? if_aligned(board, item, i + step, n, step, r + 1)
            : if_aligned(board, c, i + step, n, step, 1);
    }
}

function evaluate(board, i, col) {
    let r = 0,
        tmp = 0;

    // ----------------- verif horizontal
    if ((r = if_aligned(board, 'red', i - col, i - col + 6))[0] == 4 && r[1])
        return r[1] == 'red' ? -1 : 1;
    // ----------------- verif horizontal

    // ----------------- verif vertical
    if ((r = if_aligned(board, 'red', col, col + 42, 7))[0] == 4 && r[1])
        return r[1] == 'red' ? -1 : 1;
    // ----------------- verif vertical

    tmp = i - col * 7 - col;
    // ----------------- verif diagonal lower left
    if (tmp > 0) r = if_aligned(board, '', tmp, 48, 8);
    // ----------------- verif diagonal lower left
    // ----------------- verif upper diagonal to the left
    else {
        tmp = col - (i - col) / 7;
        r = if_aligned(board, 'red', tmp, 48 - tmp * 7, 8);
    }
    // ----------------- verif upper diagonal to the left

    if (r[0] == 4 && r[1]) return r[1] == 'red' ? -1 : 1;

    tmp = i - (6 - col) * 6;
    // ----------------- verif diagonal lower right
    if (tmp > 0)
        r = if_aligned(board, '', tmp, tmp + (6 - (tmp - 6) / 7) * 6, 6);
    // ----------------- verif diagonal lower right
    // ----------------- verif upper diagonal to the right
    else {
        tmp = col + (i - col) / 7;
        r = if_aligned(board, 'red', tmp, 42 - (6 - tmp) * 7, 6);
    }
    // ----------------- verif upper diagonal to the right
    if (r[0] == 4 && r[1]) return r[1] == 'red' ? -1 : 1;

    return 0;
}

function touch(id) {
    let pions = document.querySelectorAll('.pion'),
        names = document.getElementById('player-name'),
        infos = document.getElementById('info'),
        r = 0,
        i = 0,
        col = id % 7,
        jouable = false;

    for (i = col; i <= 41 && empty(pions[i]) && empty(pions[i + 7]); i += 7)
        jouable = true;

    if (empty(pions[id]) && (jouable || i < 7) && keep_playing) {
        nbr_instances += 1;
        pions[i].style.backgroundColor = current_player == 1 ? 'red' : 'yellow';

        if (nbr_instances >= 6) {
            r = evaluate(pions, i, col);
            if (r) {
                keep_playing = false;
                infos.replaceChild(
                    document.createTextNode(' Won !'),
                    infos.lastChild
                );
            } else if (!r && nbr_instances == 49) {
                keep_playing = false;
                names.replaceChild(
                    document.createTextNode('PAR: '),
                    names.firstChild
                );
                infos.replaceChild(
                    document.createTextNode(' No player wins !'),
                    infos.lastChild
                );
            }
        }

        if (!r && keep_playing) {
            current_player = current_player == 1 ? 2 : 1;
            names.replaceChild(
                document.createTextNode(players[current_player - 1].name.data),
                names.firstChild
            );
        }
    }
}

function retourInscription() {
    document.getElementById('participer').style.display = 'none';
    document.getElementById('inscription').style.display = 'flex';
}
