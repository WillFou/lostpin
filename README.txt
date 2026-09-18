LostPin
=======

Jeu de géolocalisation basé sur Google Street View, jouable en solo, en multijoueur ou via des challenges asynchrones.

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
Une partie classique comporte 5 manches pour un maximum de 25 000 points. Une playlist peut changer de map entre les manches.

Modes disponibles :
- Move : déplacement, rotation et zoom autorisés.
- No Move : déplacement interdit ; rotation et zoom autorisés.
- No Move + No Pan/Zoom : panorama totalement figé ; aucun déplacement, aucune rotation et aucun zoom.

Les déplacements se font avec les contrôles natifs de Google Street View. Les anciens boutons Avancer / Reculer / Demi-tour / Départ restent dans le code pour le futur mode Exploration mais sont masqués pendant les parties classiques.


PLAYLISTS / COLLECTIONS (V5.3)
------------------------------
LostPin peut maintenant mélanger plusieurs maps dans une même partie.

Depuis l'écran d'accueil, clique sur « Playlists ». Quatre playlists sont fournies :
- Paris sous toutes ses coutures ;
- France · ville & campagne ;
- Deux capitales ;
- Grand Mix LostPin.

Tu peux aussi créer jusqu'à 12 playlists personnelles à partir des maps disponibles.
Elles sont stockées uniquement dans le localStorage du navigateur.

Règle de tirage :
- LostPin mélange les maps de la playlist ;
- chaque map est utilisée une fois avant qu'une nouvelle boucle mélangée commence ;
- lorsqu'une playlist contient au moins deux maps, LostPin évite de recommencer une boucle par la même map que celle qui vient d'être jouée ;
- chaque manche conserve l'échelle de score de sa map réelle.

Les playlists fonctionnent :
- en solo ;
- dans les Challenges ;
- en multijoueur local ;
- en multijoueur en ligne.

Les Challenges créés à partir d'une playlist enregistrent aussi la map exacte de chaque manche. Les anciens codes LP5 de V5.0/V5.1 restent lisibles.

CHALLENGES (V5)
---------------
Les Challenges permettent à plusieurs joueurs de jouer la même partie à des moments différents.

Un challenge mémorise :
- les panoramas Street View exacts ;
- leur ordre ;
- la map ou playlist ;
- Move, No Move ou No Move + No Pan/Zoom ;
- 3, 5 ou 10 manches ;
- un timer facultatif de 15, 20, 30, 60, 120 ou 180 secondes.

Créer un challenge :
1. Choisis la map ou playlist et le mode sur l'écran d'accueil.
2. Clique sur Challenges.
3. Choisis le timer et le nombre de manches.
4. Clique sur Générer le challenge. LostPin recherche tous les panoramas à l'avance.
5. Copie le code portable et envoie-le à ton ami.

Rejoindre un challenge :
1. Clique sur Challenges.
2. Colle le code portable.
3. Clique sur Lire le challenge puis Jouer ce challenge.

Chaque challenge reçoit aussi un ID court de 5 caractères (par exemple K8P4Q) pour être identifié facilement. Cet ID seul ne permet pas encore de télécharger le challenge depuis un autre PC : LostPin n'utilise pas encore de registre central. Le code portable contient donc directement les IDs Street View et doit être partagé en entier.

Comme les panoramas exacts sont stockés dans le code, le tirage ne dépend pas du hasard lors du rejeu. Si Google supprime définitivement un ancien panorama Street View, LostPin signalera que la manche correspondante n'est plus disponible.

RÉSULTATS DE CHALLENGE (V5.1)
------------------------------
À la fin d'un challenge, LostPin génère un code résultat commençant par LPR1.
Le bouton « Copier mon résultat » copie un résumé lisible avec :
- l'ID du challenge ;
- le pseudo ;
- le score et le score maximal ;
- le nombre de manches à 5 000 points ;
- la distance moyenne ;
- le code résultat portable.

Un ami peut coller ce code dans Challenges > Comparer un résultat reçu. LostPin vérifie qu'il correspond au même challenge et le compare au meilleur résultat local enregistré sur ce challenge. Aucune donnée n'est envoyée à un serveur LostPin.

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
challenge.js     Création, import, timer et historique des challenges.
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


STATISTIQUES ET PROGRESSION (V5.2)
----------------------------------
Le bouton « Statistiques » de l'écran d'accueil ouvre la progression locale.
LostPin mémorise, uniquement dans le navigateur :
- parties solo et Challenges terminés ;
- nombre de manches, de 5 000 et de 25 000 ;
- distance moyenne ;
- précision moyenne sur les 10 / 50 / 100 dernières manches ;
- records sur 5 manches par map et par mode ;
- série de jours joués ;
- badges et historique récent.

Les anciens meilleurs scores et les anciens compteurs de 25 000 sont importés quand ils existent déjà dans le localStorage. Les statistiques détaillées (historique des parties/manches) commencent à partir de la V5.2.

Le bouton « Réinitialiser les statistiques » efface uniquement les données statistiques V5.2 ; les anciens records historiques restent gérés par LostPin et peuvent donc être réimportés.
