LostPin
=======

Jeu de géolocalisation basé sur Google Street View, jouable en solo ou en multijoueur.

VERSION
-------
La version courante n'est plus écrite en dur dans index.html.
La source de vérité est le fichier version.json.
Pendant les tests, l'onglet du navigateur affiche automatiquement : LostPin vX.Y.Z.
Le logo et le HUD n'affichent volontairement aucun numéro de version.

LANCEMENT
---------
1. Décompresse entièrement le ZIP.
2. Double-clique sur start.bat.
3. Au premier lancement, saisis ta clé Google Maps si le script la demande.
4. LostPin s'ouvre sur http://127.0.0.1:8080/.

Ne lance pas directement index.html : LostPin utilise un petit serveur local pour charger correctement Google Maps, version.json et les autres ressources.

CLÉ GOOGLE MAPS
---------------
La clé est stockée localement dans config.js. Le ZIP distribué ne contient pas de vraie clé.
Pour la modifier plus tard, lance change-api-key.bat.

Référents conseillés dans Google Cloud :
- http://localhost:8080/*
- http://127.0.0.1:8080/*

API nécessaire : Maps JavaScript API.

SOLO
----
Une partie classique comporte 5 manches pour un maximum de 25 000 points.

Modes disponibles :
- Move : déplacement, rotation et zoom autorisés.
- No Move : déplacement interdit ; rotation et zoom autorisés.
- No Move + No Pan/Zoom : panorama totalement figé ; aucun déplacement, aucune rotation et aucun zoom.

Les déplacements se font avec les contrôles natifs de Google Street View. Les anciens boutons Avancer / Reculer / Demi-tour / Départ restent dans le code pour le futur mode Exploration mais sont masqués pendant les parties classiques.

MULTIJOUEUR LOCAL
-----------------
Le mode local permet à plusieurs joueurs de jouer successivement sur la même machine.

MULTIJOUEUR EN LIGNE (BÊTA)
----------------------------
Jusqu'à 6 joueurs peuvent rejoindre une salle avec un code.

L'hôte choisit notamment :
- 3, 5 ou 10 manches ;
- un timer de 60, 120 ou 180 secondes ;
- Move, No Move ou No Move + No Pan/Zoom ;
- Classique, Duel ou Élimination.

Classique : cumul normal des scores.
Duel : exactement 2 joueurs, 6 000 PV chacun ; la différence de score d'une manche devient des dégâts.
Élimination : 3 à 6 joueurs ; le dernier de chaque manche est éliminé jusqu'au dernier survivant.

Après la première validation d'une manche en ligne, il reste au maximum 20 secondes aux autres joueurs.

JOUEURS / RÉACTIONS
-------------------
Le panneau Joueurs / Réactions affiche les participants horizontalement.
Les flèches gauche / droite permettent de parcourir les joueurs lorsque tout le monde ne tient pas dans la largeur disponible.
Le bouton - replie le panneau ; le bouton + le déplie. Cet état est mémorisé localement.
Les réactions rapides sont visibles par les autres joueurs.

HUD PERSONNALISABLE
-------------------
Trois blocs peuvent être déplacés :
- Joueurs / Réactions ;
- timer ;
- boussole.

Le HUD principal LostPin / Manche / Score / Map reste fixe.

Pour déplacer les blocs :
1. Clique sur le cadenas en haut à droite pour déverrouiller le HUD.
2. Les zones d'ancrage apparaissent.
3. Fais glisser un bloc vers la zone souhaitée.
4. Relâche : le bloc s'aimante automatiquement à l'ancrage.
5. Reverrouille avec le cadenas pour éviter tout déplacement accidentel.

Le bouton ↺ restaure la disposition par défaut.
Les positions sont mémorisées dans le navigateur.
LostPin corrige automatiquement les ancrages en double et repositionne les blocs si une nouvelle taille de fenêtre créerait une superposition.

BOUSSOLE
--------
Plusieurs styles de boussole sont disponibles depuis l'accueil ou pendant une partie. Le style choisi est mémorisé.

APPARENCE
----------
Deux identités visuelles sont disponibles :
- Arcade Night ;
- Midnight Explorer.

Le thème peut être changé depuis l'accueil ou pendant une partie et reste mémorisé.

MUSIQUE
-------
LostPin génère une ambiance chill avec Web Audio. Elle peut être activée/coupée pendant la partie et son volume est réglable dans Audio.

MAPS
----
LostPin comprend plusieurs cartes, dont Paris et plusieurs arrondissements, ainsi que des cartes plus larges.
Les limites de Paris, du 5e, du 6e, du 7e et du 13e utilisent les données cartographiques officielles de la Ville de Paris et sont mises en cache localement.

DÉPANNAGE
----------
Le jeu ne démarre pas :
- lance bien start.bat depuis le dossier décompressé ;
- vérifie que PowerShell est disponible ;
- ne convertis pas start.bat en fins de ligne Unix : il doit rester au format Windows CRLF.

Google Maps ne charge pas :
- vérifie config.js ;
- vérifie les restrictions de la clé dans Google Cloud ;
- vérifie que Maps JavaScript API est activée.

Le HUD est mal placé :
- déverrouille-le puis utilise ↺ ;
- ou redimensionne la fenêtre : LostPin recalcule automatiquement les ancrages.

Une ancienne disposition HUD pose problème :
- le moteur corrige normalement les doublons automatiquement ;
- le bouton ↺ permet toujours de repartir de la disposition par défaut.

FICHIERS PRINCIPAUX
-------------------
index.html       Interface principale.
app.js           Gameplay solo et intégration Street View / carte.
multiplayer.js   Multijoueur local et en ligne.
hud-layout.js    Déplacement, ancrage et persistance du HUD.
themes.css       Styles et thèmes.
theme.js         Gestion de l'identité visuelle.
music.js         Ambiance audio.
config.js        Clé Google Maps locale.
version.json     Source de vérité de la version.
start.bat        Lanceur Windows.
server.ps1       Serveur HTTP local.

MISE À JOUR / UPDATER
---------------------
L'Updater doit lire version.json pour afficher et comparer la version.
Ne remets pas de numéro de version en dur dans index.html ou dans le HUD.
