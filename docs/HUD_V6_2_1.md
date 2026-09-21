# V6.2.1 - Corrections consolidées

## Périmètre

Cette version part de la V6.2.0. Elle conserve les pages et le hero validés, le moteur Google, le HUD, les quatre boussoles, les règles multi et le contenu du récapitulatif. Elle corrige la taille des cartes et du récapitulatif, ajoute le chrono Classique solo, et rétablit les protections de la configuration.

## Carte de réponse

Au repos, seule la surface de carte est à 90 % d'opacité sur un conteneur transparent : les textes/commandes restent lisibles. Au survol, pendant un focus clavier visible, en agrandissement et sur les résultats, la carte est opaque. Un clic sur la réduction ne laisse plus artificiellement une opacité pleine une fois la souris retirée.

Il n'y a toujours aucun agrandissement au survol. Bouton ou M pour agrandir, bouton ou Échap pour réduire. Sur grand écran, la carte agrandie utilise environ 54 % de la largeur et la hauteur disponible sous la boussole ; sur petit écran sa largeur est ajustée. Retour au départ et agrandissement sont regroupés en bas à gauche du cadre, en dehors des tuiles et mentions Google. Les boutons ne se dupliquent pas en haut.

## Chrono Classique solo

Dans Jouer / Personnaliser, choisir Classique puis **Off, 60, 120 ou 180 secondes**. La préférence est mémorisée localement et appliquée aux prochaines parties Classique (Move, No Move, NMPZ). Par défaut : Off, comme avant.

Le chrono démarre après le chargement du panorama. Le timer stylisé, les seuils et les sons existants sont réutilisés. À zéro, un point déjà placé est validé ; sans point, le résultat est nul. Une réponse anticipée stoppe le chrono. Un rappel tardif de l'onglet ne gonfle pas le temps enregistré au-delà de la limite.

Blitz conserve 15/20/30 secondes. Les défis et le multi conservent leurs propres chronos. Précision n'hérite pas du réglage Classique.

## Récapitulatif final

Le conteneur ne se limite plus à 1 660 px : il exploite la largeur et la hauteur de la fenêtre. Score, verdict, meilleure manche, distances, carte, détail et actions sont conservés. La carte reçoit l'espace disponible ; le panneau des manches est lisible et peut défiler. Sur petit écran, le contenu s'empile et défile plutôt que de devenir microscopique. Aucune nouvelle instance Google Map n'est créée pour le récapitulatif.

## Classique et Précision

Aucun changement de barème. Pour une distance d en mètres et l'échelle s du terrain :

- d <= 25 : 5 000 points dans les deux modes.
- Classique : arrondi(5 000 * exp(-(d - 25) / s)), borné entre 0 et 5 000.
- Précision : arrondi(5 000 * (1 - (d - 25) / s)), borné entre 0 et 5 000.

Pour Paris, s = 4 200 m. À 1 km : 3 964 / 3 839 points ; à 3 km : 2 462 / 1 458 ; à 4,225 km : 1 839 / 0. L'observation et le placement sont identiques : la différence porte sur la sanction des erreurs. Le descriptif de sélection l'explique maintenant.

## Configuration et publication

Lire `SECURITY_CONFIG.md` avant de publier : configuration locale retirée du paquet, contrôles Git/package et correspondance tag/version. Le ZIP source ne contient pas d'exécutable d'Updater précompilé ; ses sources et scripts de build sont présents, et GitHub Actions le compile pour la Release distribuable.
