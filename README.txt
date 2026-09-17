LostPin V4.1.1
=============

LostPin est un jeu de geolocalisation base sur Google Street View.
La V4.1 pousse l'identite visuelle beaucoup plus loin que la V4.0 : deux directions artistiques sombres et vraiment distinctes remplacent le simple changement de couleurs.

NOUVEAUTES V4.1
---------------
- Deux identites visuelles selectionnables :
  * Arcade Night
  * Midnight Explorer
- Un vrai symbole de marque different pour chaque identite.
- Deux wordmarks / traitements typographiques differents :
  * Arcade Night : Bungee + Nunito Sans
  * Midnight Explorer : Oxanium + Space Grotesk
- Deux packs d'icones SVG differents : formes pleines/stickers pour Arcade Night, traits techniques pour Midnight Explorer.
- Cartes, boutons, HUD, panneaux, lobby multijoueur et ecran d'accueil changent de forme et de langage graphique selon l'identite.
- Le favicon et le logo dans le HUD changent avec l'identite.
- Boussole recommandee au premier lancement : Hybride pour Arcade Night, Reelle stylisee pour Midnight Explorer.
- Le choix est memorise localement.
- Le theme clair Chill Cartographic de V4.0 est retire pour concentrer le travail sur les deux directions sombres preferees.

LANCEMENT
---------
1. Double-clique sur start.bat.
2. Au premier lancement, renseigne ta cle Google Maps lorsque le script la demande.
3. Le navigateur ouvre http://127.0.0.1:8080/.

CLE GOOGLE MAPS
---------------
La cle est stockee dans config.js.
Le ZIP distribue ne contient pas de vraie cle.

Referents conseilles :
- http://localhost:8080/*
- http://127.0.0.1:8080/*

Restriction API conseillee :
- Maps JavaScript API uniquement

Pour changer la cle :
- lance change-api-key.bat

IDENTITES VISUELLES
-------------------
Arcade Night
- Vibe jeu/sociale, plus punchy.
- Bleu nuit, turquoise, corail, creme.
- Logo pin/orbite, typo Bungee, boutons ronds et reliefs.
- Icones pleines et plus ludiques.

Midnight Explorer
- Vibe exploration premium et technique.
- Noir bleute, cyan, blanc lune, ambre.
- Logo pin/boussole, typo Oxanium, composants anguleux et grille cartographique.
- Icones fines et geometriques.

Le bouton Identite permet de changer de direction depuis l'accueil ou pendant une partie.
Le choix est conserve dans localStorage sous la cle lostpin-v4-theme.

BOUSSOLES
----------
Les huit styles de boussole restent disponibles et peuvent etre changes independamment de l'identite visuelle.
Au premier lancement seulement, LostPin choisit une boussole recommandee selon l'identite si aucun choix n'existe deja.

MUSIQUE
-------
La musique chill est generee directement dans le navigateur avec Web Audio.
Aucun fichier audio externe n'est requis.
Le volume et l'etat actif/inactif sont memorises localement.

MULTIJOUEUR LOCAL
-----------------
- 2 a 4 joueurs sur le meme ordinateur.
- Le meme panorama est joue par tous les participants.
- Les resultats precedents sont caches jusqu'au dernier joueur.

MULTIJOUEUR EN LIGNE - BETA
---------------------------
- Jusqu'a 6 joueurs.
- L'hote cree une salle et partage un code de 5 caracteres.
- La map et le mode de l'hote sont utilises par toute la salle.
- Connexion WebRTC avec PeerJS pour la signalisation.
- Aucune ouverture manuelle de port n'est normalement necessaire sur un acces Internet domestique classique.
- Chaque joueur doit avoir une copie fonctionnelle de LostPin et une configuration Google Maps valide.

FICHIERS PRINCIPAUX
-------------------
index.html       interface et structure du jeu
app.js           logique solo, Street View, maps, score et boussoles
themes.css       identites Arcade Night / Midnight Explorer
theme.js         selection, logos, icones et application de l'identite
music.js         musique procedurale
multiplayer.js   multijoueur local et en ligne
assets/          logos et packs d'icones SVG
config.js        cle Google Maps locale
server.ps1       serveur HTTP local
start.bat        lancement Windows


COMPATIBILITE MULTIJOUEUR V4.1.1
--------------------------------
Le namespace PeerJS historique "guessr360" est volontairement conserve pour permettre a un client LostPin V4.1.1 de jouer avec un client Guessr360 V3.9.
La V4.1 originale utilisait par erreur un namespace different (lostpin-v4), ce qui rendait les salles invisibles entre les deux versions.
