# LostPin V6.2 - HUD et boucle de jeu

## Périmètre

Base : V6.1.1. Pas de changement de homepage, des pages V6.1, du moteur de recherche de panoramas, du barème de distance, de la limite de joueurs ni du transport PeerJS. Exploration reste de côté. Il n’y a aucune migration vers Maps Embed.

## Placement et interactions

Le bandeau garde trois zones : contexte à gauche, timer au centre, manches/total/actions à droite. Le timer reprend la capsule sombre et les arcs lumineux de l’ancienne feuille de thème. Le cadran de boussole reste centré juste dessous. Les arcs passent du cyan à l’ambre puis au rose selon le temps restant. L’historique indique score et temps des manches terminées, durée écoulée de la manche courante et manches futures. Sur petite largeur, un bouton R x / n ouvre l’historique ; dix manches sont prises en charge.

La carte de réponse reste en bas à droite. Elle ne change pas de taille au survol. Le bouton d’agrandissement ou M alterne les deux tailles ; Échap réduit. Cliquer dans la carte continue de placer un marqueur. Le retour au point de départ reste dans son en-tête. Seule la carte, pas le bouton Valider, s’atténue légèrement au repos.

J/R conserve son glisser-déplacer, sa position mémorisée et son retour par double-clic. Un positionnement demandé par-dessus la boussole ou la carte est décalé vers une zone libre. Les notifications restent dans une voie séparée ; leurs positions sont recalculées quand le cadran, J/R ou la fenêtre change de taille.

## Les trois états cartographiques

1. Observation : panorama prioritaire, carte réduite.
2. Placement : carte agrandie uniquement sur demande.
3. Révélation : la carte occupe l’espace entre le bandeau et le dock de résultat. Elle ne passe pas sous les boutons ni les mentions du fournisseur.

En solo, T est la proposition (rose), R le lieu réel (cyan). Les deux points sont cadrés, la ligne et le score s’animent brièvement. Un timeout sans marqueur ne montre que le lieu réel. Un 5 000 reçoit une courte réaction visuelle et sonore. « Manche suivante », ou « Voir le score final » à la dernière manche, reste utilisable sans attendre l’animation. Entrée est affiché dans l’interface desktop.

En multijoueur, les autres réponses sont identifiées et le classement dispose d’une colonne distincte. Sur petite largeur, il s’ouvre volontairement. L’invité attend l’hôte : aucun bouton local ne lui donne l’autorité de changer de manche. Les timings restent ceux du contrôleur réseau ; le HUD ne modifie pas les deadlines.

## Fin de partie

La conclusion solo est courte, passable au bouton/clavier et omise avec la préférence de réduction des mouvements. Le verdict et les statistiques existants restent sur le récapitulatif. Une grande carte montre les paires T/R et les trajets d’erreur, pas un faux classement ou de faux XP. Cliquer une ligne de manche cadre sa paire ; le bouton global restaure l’ensemble. Les anciennes données sans coordonnées affichent un message explicite au lieu d’inventer une position.

La fin multijoueur permet de sélectionner soi-même, un autre joueur ou tous les joueurs. Les points du lieu réel peuvent se superposer lorsqu’ils concernent le même lieu : la liste reste le moyen de sélectionner une manche précise.

## Organisation technique

- `src/js/ui/hud-math.js` : validation des coordonnées, cadrage sur le plus court intervalle de longitudes, interpolation géodésique, calculs de collision. Fonctions pures testables sous Node.
- `src/js/ui/gameplay-ui.js` : états UI, historique, animations annulables, map de fin, placements des panneaux.
- `src/css/gameplay-ui.css` : styles ciblés sur le jeu et ses résultats. La feuille de homepage est conservée.
- `app.js`, `multiplayer.js`, `challenge.js` : points d’entrée explicites vers la présentation, capture des coordonnées, verrouillage après réponse.
- `music.js` : petit signal 5 000, respect du mute et du volume.

Une seule `google.maps.Map` est déplacée entre ses conteneurs ; une nouvelle vue ne crée pas une nouvelle carte. Les changements d’état annulent les animations différées. Les marqueurs temporaires et leurs listeners sont nettoyés. Les formes sont construites par les API Google habituelles, pas par le mock de QA.

## Compatibilité et livraison

Les entrées existantes des résultats restent compatibles : les nouveaux champs sont optionnels. Pour tester le nouveau récap multi complet, utiliser la même version chez tous les joueurs. Les records locaux ne sont pas effacés. Les records historiques de 25 000 conservent leur règle ; le verdict d’une session parfaite s’adapte au nombre de manches.

Aucune nouvelle dépendance npm ni étape de compilation pour lancer le jeu. `start.bat` reste le point d’entrée. Les fichiers de configuration personnels sont à conserver. Les vidéos/captures de benchmark ne sont pas des assets du produit et ne sont pas embarquées.
