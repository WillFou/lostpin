LostPin V4.4.10
===============

V4.4 - MODES COMPÉTITIFS EN LIGNE
-----------------------------------
- Classique : cumul de points inchangé.
- Duel : exactement 2 joueurs, 6 000 PV chacun. La différence de score d'une manche inflige autant de dégâts au perdant. Un K.O. termine la partie ; sinon les PV départagent à la fin du nombre de manches choisi.
- Élimination : 3 à 6 joueurs. Le dernier de chaque manche est éliminé ; les joueurs éliminés restent spectateurs. La partie s'arrête au dernier survivant.
- L'hôte choisit le mode de partie à la création de la salle.
- Les modes Duel et Élimination nécessitent LostPin V4.4 ou plus récent chez tous les participants.


LostPin est un jeu de géolocalisation basé sur Google Street View.
Cette version renforce surtout le multijoueur en ligne tout en conservant les deux identités visuelles sombres : Arcade Night et Midnight Explorer.

NOUVEAUTÉS V4.4
----------------
- Chaque joueur en ligne peut choisir un avatar et une couleur avant de créer ou rejoindre une salle.
- Le lobby affiche maintenant les identités des joueurs, les paramètres de la partie, le nombre de participants et un bouton pour copier le code de salle.
- Cinq réactions rapides sont disponibles pendant les manches : 🔥 😎 🤔 👀 😭.
- La validation d’une position déclenche une animation visible par les autres joueurs.
- Les classements de manche et le classement général utilisent l’avatar et la couleur de chaque joueur.
- Le classement final affiche un podium pour les trois premiers.
- Un indicateur « Photo finish » apparaît lorsqu’une manche ou le classement final est très serré.
- Les invités peuvent demander une revanche ; l’hôte voit la demande et peut relancer une partie avec le même groupe.
- Les 10 dernières parties en ligne sont mémorisées localement avec la place, le score, la map, le mode, le timer et le nombre de manches.
- Les fonctions V4.2 restent présentes : 3/5/10 manches, timers 60/120/180 s, Move / No Move / No Move + No Pan/Zoom, statut des validations, timer ramené à 20 s après la première réponse, résultats partagés et reconnexion courte.

LANCEMENT
---------
1. Double-clique sur start.bat.
2. Au premier lancement, renseigne ta clé Google Maps lorsque le script la demande.
3. Le navigateur ouvre http://127.0.0.1:8080/.

CLÉ GOOGLE MAPS
---------------
La clé est stockée dans config.js. Le ZIP distribué ne contient pas de vraie clé.

Référents conseillés :
- http://localhost:8080/*
- http://127.0.0.1:8080/*

Restriction API conseillée : Maps JavaScript API uniquement.
Pour changer la clé, lance change-api-key.bat.

IDENTITÉS VISUELLES
-------------------
Arcade Night
- Identité jeu/sociale, plus punchy.
- Bleu nuit, turquoise, corail et crème.
- Logo pin/orbite, typographie Bungee + Nunito Sans.
- Icônes pleines, boutons plus ronds et reliefs plus marqués.

Midnight Explorer
- Identité exploration premium et technique.
- Noir bleuté, cyan, blanc lune et ambre.
- Logo pin/boussole, typographie Oxanium + Space Grotesk.
- Icônes fines, composants anguleux et grille cartographique.

Le bouton Identité permet de changer de direction depuis l’accueil ou pendant une partie. Le choix est conservé dans localStorage sous la clé lostpin-v4-theme.

BOUSSOLES
---------
Les huit styles de boussole restent disponibles et peuvent être changés indépendamment de l’identité visuelle.
Au premier lancement seulement, LostPin choisit une boussole recommandée selon l’identité si aucun choix n’existe déjà.

MUSIQUE
-------
La musique chill est générée directement dans le navigateur avec Web Audio. Aucun fichier audio externe n’est requis. Le volume et l’état actif/inactif sont mémorisés localement.

MULTIJOUEUR LOCAL
-----------------
- 2 à 4 joueurs sur le même ordinateur.
- Le même panorama est joué par tous les participants.
- Les résultats précédents sont cachés jusqu’au dernier joueur.

MULTIJOUEUR EN LIGNE - BÊTA
----------------------------
- Jusqu’à 6 joueurs.
- L’hôte crée une salle et partage un code de 5 caractères.
- L’hôte choisit le timer, le nombre de manches et le mode de déplacement.
- Tous les joueurs doivent utiliser LostPin V4.4.10 pour profiter correctement des avatars, couleurs, réactions, demandes de revanche et du protocole de lobby.
- Connexion pair-à-pair WebRTC avec PeerJS pour la signalisation.
- Le namespace PeerJS historique « guessr360 » est volontairement conservé.
- Aucune ouverture manuelle de port n’est normalement nécessaire sur un accès Internet domestique classique.
- Chaque joueur doit avoir une copie fonctionnelle de LostPin et une configuration Google Maps valide.

FICHIERS PRINCIPAUX
-------------------
index.html       interface et structure du jeu
app.js           logique solo, Street View, maps, score et boussoles
themes.css       identités Arcade Night / Midnight Explorer
theme.js         sélection, logos, icônes et application de l’identité
music.js         musique procédurale
multiplayer.js   multijoueur local et en ligne
assets/          logos et packs d’icônes SVG
config.js        clé Google Maps locale
server.ps1       serveur HTTP local
start.bat        lancement Windows


V4.4.6 - HUD compact / social
- En-tête de jeu compact : logo, manche, score et map restent regroupés à gauche.
- Timer multijoueur détaché des boutons et renforcé au centre de l'écran.
- Joueurs, état des validations et emotes réunis dans un seul bloc extensible à gauche.
- Jusqu'à 6 joueurs : affichage sur deux colonnes avec retours à la ligne automatiques.
- Boussole déplacée sous les boutons utilitaires à droite pour libérer la zone joueurs.
- Réduction des risques de superposition entre HUD, timer, joueurs, emotes et boussole.

V4.4.4 - correctifs HUD multijoueur
- Les overlays multijoueur ne se superposent plus.
- Fermer le lobby avec la croix revient proprement à l’accueil.


V4.4.4 - pile HUD remontée
- La bannière multijoueur, la barre des joueurs, le badge, la boussole et le toast des émotes sont remontés tout en haut pour libérer davantage de vue sur le panorama.


V4.4.4 - timer séparé des boutons
- Le timer multijoueur est placé à gauche du groupe de boutons au lieu de s'insérer au milieu.
- La barre des émotes rapides est remontée pour rester proche des informations de partie.
