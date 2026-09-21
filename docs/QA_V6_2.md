# V6.2 - Vérification et recette

## Ce qui a été vérifié

Les contrôleurs, le HTML et le CSS de production ont été exécutés dans Chromium/Playwright, sur une fixture privée avec Google Maps/Street View simulés et stockage en mémoire. Aucune clé Google réelle ni liaison PeerJS réelle n’a servi aux captures.

- Suite principale : 37 vérifications, toutes passantes.
- Suite avancée : 32 vérifications, toutes passantes.
- Géométrie pure : 12 tests Node, tous passants.

Les 69 vérifications navigateur couvrent le placement explicite de carte, le cycle solo de cinq manches, l’historique, le 5 000, les timeouts, le double envoi, la carte finale, le replay, No Move/NMPZ/clavier, les variantes de cadran et les notifications, J/R, les contrôleurs hôte/invité et leurs paquets simulés, le chrono Classique inchangé, le compte à rebours Duel conservé, la fin multi et les données manquantes, dix manches, les animations réduites, ainsi que les timers Challenge.

Tailles exercées : 1366×768, 1920×1080, 2560×1600, 3200×2000, 1024×768, 768×1024, 390×844. Captures examinées pour le HUD, le timer, les résultats, les récaps solo/multi et le format étroit. Les polices distantes n’étaient pas chargées dans cette QA ; le jeu conserve sa configuration de polices habituelle.

Ce sont des tests de l’application avec dépendances simulées, pas une preuve de fonctionnement de Google ou du réseau entre plusieurs PC. L’actualisation visuelle des tuiles, le chargement des panoramas et les aléas réseau restent à tester en conditions réelles.

## Test automatisé fourni

Depuis la racine du projet, avec Node installé :

```sh
node --test dev/qa/hud-math.test.js
```

Les tests couvrent coordonnées invalides, changements de date autour de 180°, cadrage multi-points, cas identiques/antipodaux, interpolations et zones HUD. Node n’est pas requis pour utiliser LostPin.

## Recette réelle prioritaire

1. **Une partie Classique complète.** Vérifier les colonnes R1-R5, la carte réduite, son opacité, le bouton agrandir/M et Échap. Survoler ne doit jamais redimensionner. Le retour au départ doit rester fonctionnel.
2. **Résultat de chaque manche.** Deux marqueurs, trajet et cadrage visibles, score exact et bouton suivant. Une grande erreur et une réponse très proche. Passer rapidement avec Entrée : pas de callback ancien ni manche sautée. Tester une réponse proche de 180° de longitude si possible.
3. **Fin de partie.** Les cinq lignes correspondent au jeu ; clic sur une manche puis Toutes les manches. Carte toujours manipulable. Rejouer puis quitter : retour normal, pas de carte ou modal abandonnée.
4. **Chronos et variantes.** Blitz 15 s avec puis sans point, sons dans les dix dernières secondes, mute. No Move et NMPZ. Un Challenge 3 ou 10 manches et un timeout. 5 000 points pour la réaction spéciale.
5. **Multijoueur réel (tous en 6.2.0).** Hôte + invités : validation précoce sans raccourcir le chrono Classique, un joueur ne répond pas, classement/points synchrones, l’hôte seul change de manche. Déplacer J/R, recevoir des notifications, redimensionner, puis carte finale pour soi et tous les joueurs. Ajouter une revanche et une reconnexion après envoi.

Pour une anomalie, préciser version, mode, hôte/invité, manche, action avant le problème, capture et erreur console. L’ancienne grande checklist reste utile pour une recette transversale : cette page cible les changements de la 6.2.
