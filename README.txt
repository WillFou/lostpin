Guessr360 v3.9

GUESSR360 V3.9 - GOOGLE STREET VIEW + MUSIQUE + MULTIJOUEUR
===========================================================

1. Decompresse le ZIP dans un dossier.
2. Double-clique sur start.bat.
3. Au premier lancement, colle ta cle Google Maps API dans la fenetre noire.
4. Le navigateur s'ouvre sur http://127.0.0.1:8080/.
5. Garde la fenetre du serveur ouverte pendant que tu joues.

Pour remplacer la cle locale : double-clique sur change-api-key.bat.
Ne partage pas config.js apres avoir saisi ta cle.

CONFIGURATION GOOGLE RECOMMANDEE
--------------------------------
Restrictions de site Web :
  http://localhost:8080/*
  http://127.0.0.1:8080/*

Restriction d'API :
  Maps JavaScript API uniquement

NOUVEAU V3.9 - MUSIQUE CHILL
----------------------------
- Ambiance chill procedurale generee directement par Web Audio.
- Aucun fichier audio externe et aucun morceau protege n'est inclus.
- Bouton musical sur l'accueil et pendant la partie.
- Volume reglable depuis le bouton Audio.
- Le reglage est memorise dans le navigateur.
- Le son ne peut commencer qu'apres une premiere interaction, limitation normale des navigateurs.

NOUVEAU V3.9 - MULTIJOUEUR
--------------------------
Deux variantes sont incluses.

1) MULTI LOCAL
- 2 a 4 joueurs sur le meme ordinateur.
- Tous jouent exactement le meme panorama a chaque manche.
- Les joueurs passent a tour de role.
- Le resultat et la vraie position ne sont affiches qu'apres la reponse du dernier joueur.
- Classement de manche puis classement final apres 5 manches.

2) MULTI EN LIGNE (BETA)
- 2 a 6 joueurs.
- Un joueur cree une salle et obtient un code de 5 caracteres.
- Les autres joueurs lancent leur propre copie de Guessr360 et saisissent le code.
- L'hote choisit la map et le mode de jeu sur son ecran d'accueil.
- Tous les joueurs recoivent le meme panorama et jouent simultanement.
- L'hote calcule les scores et synchronise les resultats.
- L'hote controle le passage a la manche suivante.
- Connexion pair-a-pair WebRTC avec signalisation publique PeerJS.

Important pour le multi en ligne :
- Chaque joueur doit avoir une copie fonctionnelle de Guessr360 avec Google Maps disponible dans son navigateur.
- Le service PeerJS est un service tiers public : le mode en ligne est donc marque BETA et depend de sa disponibilite.
- Ce mode est pense pour des parties privees entre amis, pas pour du classement competitif securise contre la triche.

MAPS INCLUSES
-------------
- Paris
- Paris 13e
- Paris 5e / 6e / 7e / 13e
- Bagneux-la-Fosse (Aube), perimetre resserre autour du bourg
- Washington DC
- France metropolitaine + Corse
- Monde

MODES
-----
Exploration : deplacement Street View autorise, boussole, Avancer, Reculer, Demi-tour, retour au Depart.
No Move     : rotation, zoom et boussole autorises ; deplacement bloque.

BOUSSOLES
---------
8 styles : Bandeau, Circulaire, Minimaliste, Rose des vents, Panorama, Hybride, Reelle stylisee et Vintage.
Le choix est memorise et peut etre change pendant la partie.

SCORE
-----
5 manches, 5 000 points maximum par manche, 25 000 maximum.
Jusqu'a 25 m : 5 000 points.
Au-dela, le score decroit progressivement avec une echelle adaptee a la taille de la map.

LIMITES PARIS
-------------
Paris, 5e, 6e, 7e et 13e utilisent les geometries officielles Ville de Paris / CapGeo.
Pour Paris, les grands bois sont exclus via B_BOIS = N.
Les donnees sont mises en cache localement 30 jours.

Source :
https://capgeo2.paris.fr/mobile/rest/services/BASEMAPS/FDC_CAPGEO_Fond_Ville/MapServer/250

DEPENDANCE MULTI EN LIGNE
--------------------------
PeerJS 1.5.5 est charge depuis UNPKG au demarrage du navigateur uniquement pour le mode en ligne.
Solo, No Move, Exploration, musique et multi local restent independants de PeerJS.

Le jeu n'est affilie ni a Google, ni a GeoGuessr, ni a PeerJS.
