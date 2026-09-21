# LostPin - Changelog

## 6.2.0 - HUD, révélation et carte récapitulative

- Bandeau de partie réorganisé : contexte, timer stylisé avec arcs cyan, historique des manches et score total. Les 3/5/10 manches restent consultables dans un volet compact sur petite largeur.
- Carte de réponse légèrement translucide au repos, opaque pendant l’interaction. Agrandissement uniquement volontaire (bouton / M), réduction par Échap. Aucun agrandissement au survol.
- Quatre boussoles conservées sans degrés. J/R reste déplaçable avec repositionnement hors boussole et carte. Notifications dans leur zone dédiée.
- Résultat de manche : grande carte, marqueurs T/R, liaison animée, cadrage automatique et bandeau inférieur distance / suite / points. L’action suivante n’est pas bloquée pendant l’animation.
- 5 000 points : accent doré, particules courtes et son distinct respectant le réglage audio. Animations limitées lorsque le système demande moins de mouvement.
- Fin solo : verdict existant conservé, conclusion courte et passable, puis carte des réponses et des vrais lieux. Cliquer une manche la cadre ; « Toutes les manches » restaure la vue globale.
- Résultats multijoueurs : carte et classement côte à côte sur grand écran, classement ouvrable sur petite largeur ; passage suivant réservé à l’hôte. Carte finale par joueur ou pour tous.
- Conservation des coordonnées et du temps dans les résultats solo/multi. Aucune fausse position n’est créée en cas de non-réponse ou d’ancien historique incomplet.
- La même instance de carte est réutilisée pour le jeu, la révélation et la fin. Animations et marqueurs nettoyés au changement de manche ou à la sortie.
- No Move, NMPZ, retour au départ, sons Blitz, confirmations Quitter et chrono multi Classique conservés. Vue verrouillée aussi lors d’une reprise multi déjà soumise ou d’un timeout invité.
- Homepage, hero, routes V6.1 et intégration Google inchangés. `/benchmark guessers/` exclu explicitement du packaging GitHub, même s’il a été suivi par Git auparavant.
- QA : voir `docs/QA_V6_2.md` pour les vérifications effectuées et les tests réels restant à faire.

## 6.0.8 - Boucle de jeu V6 / UX
- résultat de manche transformé en vraie étape centrale : fenêtre agrandie et centrée, verdict, progression de manche, métriques plus lisibles et CTA principal renforcé
- touche Entrée disponible sur le résultat pour passer rapidement à la manche suivante
- nouvel écran de fin de partie V6 plein écran avec score, barre de progression, meilleure manche, distances, récapitulatif et détail des manches
- écran de fin Exploration adapté avec métriques propres (distance parcourue et temps moyen)
- parcours de lancement simplifié : choisir une collection ramène aux modes, puis cliquer sur Classique / Blitz / No Move lance directement la partie avec la sélection courante
- le terrain sélectionné est rappelé à côté des modes pour rendre le parcours terrain → mode → jeu explicite
- les réglages avancés restent disponibles via le configurateur complet

## 6.0.7 - Ajustements UX ciblés
- écran de résultat solo recentré, agrandi et rendu bien plus lisible
- bouton "Manche suivante" renforcé visuellement pour clarifier l’action principale
- métriques (distance / points) et liens d’exploration agrandis
- visuel hero V6 recadré plus haut pour mieux montrer les panneaux de direction et éviter l’effet "écran à venir"

## 6.0.6

- Boussole : le conteneur global reste transparent, mais le cadran et le petit badge de cap retrouvent chacun un fond propre semi-transparent pour rester lisibles sur Street View.
- Les styles circulaires/réalistes conservent leur cadran détaillé au lieu d’être aplatis par le thème V6.
- Le panneau multijoueur Joueurs / Réactions devient déplaçable librement en le faisant glisser par son en-tête.
- La position J/R est mémorisée localement, limitée à la zone visible et réajustée lors d’un redimensionnement de fenêtre.
- Double-clic sur l’en-tête J/R : retour à sa position par défaut sous le bandeau, à gauche.
- Aucun retour du système d’ancrage général : tous les autres éléments du HUD restent placés volontairement.

# LostPin V6.0.5

- Suppression complète du système d’ancrage/déplacement du HUD et des boutons cadenas/réinitialisation associés.
- Placement fixe des éléments : bandeau supérieur pour le contexte et le timer, boussole centrée sous le bandeau, panneau multijoueur sous le bandeau à gauche, carte en bas à droite.
- HUD de partie : le mode de jeu est maintenant affiché directement dans le bandeau supérieur, à côté du terrain, de la manche et du score.
- Suppression du panneau flottant redondant « Mode de jeu ».
- Restauration du comportement V5 pour les commandes de déplacement : aucun bloc de déplacement en partie de géolocalisation classique.
- Le panneau de déplacement reste disponible uniquement pour les missions Exploration, où Avancer / Reculer / Demi-tour / Départ sont nécessaires.
- Boussole replacée par défaut en haut au centre, juste sous le bandeau de jeu.
- Suppression du fond sombre de la boussole bandeau/panoramique afin qu’elle se superpose directement à Street View.

# LostPin V6.0.4

- Refonte du véritable écran de jeu / HUD V6 en prenant la maquette gameplay validée comme référence.
- Nouvelle barre supérieure pleine largeur : marque LostPin, collection, mode, manche, score et actions regroupés dans une hiérarchie beaucoup plus lisible.
- Ajout d'une carte de contexte de mode dynamique (Classique, No Move, NMPZ, Exploration, Blitz, Précision) sans modifier le moteur de jeu.
- Carte de réponse redessinée : dimensions plus jouables, en-tête clair, CTA « Valider ma position », indice de placement et mode agrandi conservé.
- Retour des contrôles de déplacement sous forme de panneau compact en bas à gauche pour le mode classique ; ils restent masqués lorsque le déplacement est interdit.
- Nouveau traitement du timer Blitz/multijoueur afin qu'il s'intègre visuellement à la barre de jeu.
- Street View redevient visuellement dominant : gradients plus légers et panneaux limités aux bords de l'écran.
- Responsive revu pour 1920/2048 px, tablettes et petits écrans ; la carte passe en largeur mobile sans rendre le HUD illisible.
- Aucun changement du scoring, des recherches Street View, des Challenges, du protocole multijoueur ou de la logique des modes.

---

# LostPin V6.0.3

- Homepage reconstruite en prenant la maquette gaming validée comme référence directe de composition.
- Hero raccourci et densifié : photo plein cadre, fin de la grande zone vide centrale sur les écrans larges, titre plus proche du concept et raccourcis intégrés en pied de hero.
- Hiérarchie typographique revue : plus de micro-textes sur la homepage ; corps, sous-titres, stats et libellés remontés à des tailles lisibles.
- Rangée principale de modes alignée sur la maquette : Classique, Blitz, Multijoueur, No Move et Défi, avec grandes cartes photographiques et CTA visibles.
- Collections compactées en six cartes image-first afin de réduire le scroll tout en gardant une vraie présence visuelle.
- Bloc social refondu en trois panneaux : jouer avec ses amis, progression/classements et défi entre amis.
- Ajout d'un bandeau communautaire avant le catalogue pour refermer visuellement la homepage principale.
- Le catalogue complet et le configurateur restent disponibles plus bas sans toucher au moteur Street View, au scoring, aux playlists, aux Challenges ou au multijoueur.

---

# LostPin V6.0.2

- Passe de fidélité visuelle basée sur les captures réelles de la V6.0.1 et la maquette gaming validée.
- Suppression des micro-textes 7–10 px sur la homepage, le catalogue et le configurateur : tailles de lecture relevées sur desktop et responsive.
- Hero reconstruit autour d’un vrai fond photographique exploitable, sans texte ni boutons incrustés dans l’image.
- Contraste du hero allégé pour laisser apparaître Paris au lieu d’un grand aplat presque noir.
- Modes de jeu agrandis avec davantage de photographie et une hiérarchie texte/description/action plus proche de la maquette.
- Collections agrandies et réillustrées avec des recadrages photo propres sans labels intégrés dans les images.
- Bloc multijoueur / progression / défis agrandi pour retrouver l’effet launcher de jeu.
- Catalogue : cartes, descriptions, badges et filtres rendus nettement plus lisibles.
- Aucun changement du moteur Street View, du scoring, des Challenges, des playlists, des statistiques ou du protocole multijoueur.

---

# LostPin V6.0.1

- Reprise complète de la homepage V6 pour l'aligner réellement sur la maquette gaming validée.
- Hero beaucoup plus compact et photographique, avec Paris en toile de fond, accroche forte, CTA et collection mise en avant.
- Header de vrai site : navigation complète, recherche, langue, état Google Maps et raccourcis audio/aide.
- Modes de jeu présentés comme de vraies cartes gaming : Classique, No Move, NMPZ, Blitz et Multijoueur.
- Collections en vedette désormais illustrées avec des visuels photographiques et six entrées visibles.
- Nouveau bloc bas de homepage : multijoueur, progression locale et défis entre amis.
- Densité et proportions revues pour retrouver l'effet launcher/jeu de la maquette, au lieu d'une succession de grandes sections SaaS.
- Ajout des raccourcis Hero vers Défis, Blitz, statistiques et recherche du catalogue.
- Aucun changement du moteur Street View, du scoring, des Challenges, des playlists ou du protocole multijoueur.

---

# LostPin V6.0.0

- Refonte graphique majeure : nouvelle identite gaming LostPin, plus forte et plus reconnaissable.
- Nouvel accueil de type vrai site web : barre de navigation, hero, modes, collections, communaute et configurateur de partie.
- Acces directs au multijoueur, aux Challenges et a la progression depuis la navigation principale.
- Mise en avant des collections Paris, Paris 13e, France, Europe et Monde sans modifier les IDs de terrains existants.
- Nouveau catalogue V6 integre a la page d'accueil avec recherche et navigation geographique existantes conservees.
- Nouvelle mise en forme V6 du HUD, de la carte de reponse, des resultats et des modales.
- L'identite V6 devient l'identite visuelle unique ; les anciens themes restent dans le code pour compatibilite mais ne sont plus proposes dans l'interface.
- Aucun changement de protocole Challenge, de logique Street View, de scoring, de playlists, de statistiques ou de multijoueur.
- Le passage a ASP.NET reste reporte a une version ulterieure (V7).

---

# LostPin V5.5.1

- Correction du timeout Blitz en solo : à 0 seconde, la manche est désormais réellement clôturée.
- Sans marqueur au timeout, LostPin enregistre immédiatement 0 point et affiche le résultat.
- Avec un marqueur déjà posé, le timeout valide automatiquement cette position.
- La navigation Street View est verrouillée dès qu'une manche est terminée, y compris après un timeout Blitz ou Challenge.
- Suppression du multijoueur local : LostPin conserve uniquement le multijoueur en ligne.
- Nettoyage de l'interface, de l'aide et de la documentation liés au multi local.

# LostPin V5.5.0

- Nouveau format **Blitz** : 15, 20 ou 30 secondes par manche, avec le barème LostPin classique. En solo et en multi local, une réponse déjà placée est validée automatiquement à la fin du chrono ; sans marqueur, la manche vaut 0 point.
- Nouveau format **Précision** : barème linéaire en fonction de la distance au lieu de la décroissance exponentielle classique. En multijoueur, le classement de chaque manche Précision privilégie directement la plus petite distance.
- Classique / Blitz / Précision sont disponibles en solo, dans les Challenges et en multijoueur local.
- Le multijoueur en ligne permet également à l’hôte de choisir le format ; Blitz force un chrono de 15, 20 ou 30 secondes. Le protocole en ligne passe en V6 / LostPin V5.5 pour transporter ce réglage.
- Les Challenges passent au format interne LP5 V4 afin d’enregistrer le format de partie ; les codes V1, V2 et V3 restent lisibles.
- Les codes résultat `LPR1.…` conservent leur préfixe mais enregistrent désormais le format, les distances par manche et la distance cumulée pour les comparaisons Précision.
- Les statistiques séparent les records Classique, Blitz et Précision. Les statistiques de précision récente excluent le barème Précision pour ne pas mélanger deux échelles de score différentes.
- Deux badges locaux supplémentaires : **Éclair** (5 parties Blitz) et **Géomètre** (5 parties Précision).
- Exploration reste inchangé et conserve ses propres règles de score.

---

# LostPin V5.4.0

- Nouveau type de partie **Exploration** en solo : au lieu de retrouver le point de départ sur la carte, il faut rejoindre physiquement une cible en se déplaçant dans Google Street View.
- Une partie Exploration comporte 3 missions. LostPin choisit une cible Street View dans la map ou la playlist sélectionnée puis cherche un départ jouable à proximité.
- La carte d’Exploration affiche le départ et la cible, tandis que le HUD suit la distance restante, le chrono, le nombre de déplacements et la distance réellement parcourue.
- La manche se termine automatiquement lorsque le joueur atteint le panorama cible ou s’en approche à moins de 40 m.
- Nouveau score Exploration sur 5 000 points par mission, basé sur le temps, le nombre de déplacements et les détours par rapport à la distance directe.
- Les anciens boutons Avancer / Reculer / Demi-tour / Départ, conservés depuis V4, sont désormais utilisés par ce nouveau mode ; les contrôles natifs Street View restent disponibles.
- Le mode de géolocalisation historique est maintenant nommé **Move** dans l’interface afin de réserver le nom Exploration au nouveau gameplay.
- Challenges et multijoueur restent pour l’instant réservés à la géolocalisation classique (Move / No Move / NMPZ).
- Les statistiques distinguent les parties Exploration des parties Move afin de ne pas mélanger leurs records.

---

# LostPin V5.3.5

- Le sélecteur géographique utilise désormais une largeur stable : son gabarit ne dépend plus du nombre de pays, villes ou résultats affichés.
- La largeur de l'accueil est maintenant déterminée uniquement par la taille de la fenêtre, avec un maximum desktop fixe et des paliers responsive cohérents.
- La grille du catalogue suit les mêmes paliers responsive (5 colonnes sur grand écran, 4 sur écran intermédiaire, 2 sur tablette/mobile), sans changement lors de la navigation.
- Le correctif V5.3.4 qui permet de remonter jusqu'au vrai haut de l'écran lors des longues listes est conservé.
- Aucun changement de données géographiques, de Challenges, de playlists, de statistiques ou de multijoueur.

---

# LostPin V5.3.4

- Correction du défilement de l’écran d’accueil lorsque le catalogue géographique dépasse la hauteur de la fenêtre : le haut de la page reste désormais toujours accessible.
- L’accueil conserve son centrage vertical lorsque son contenu tient dans la fenêtre, puis se cale naturellement en haut dès qu’il devient plus grand que l’écran.
- Les catalogues géographiques denses passent aussi en mode large sur les grands écrans afin d’utiliser davantage de colonnes et de réduire la hauteur totale.
- Aucun changement de données géographiques, de Challenges, de playlists ou de multijoueur.

---

# LostPin V5.3.3

- Première grosse vague de découpe géographique : le catalogue atteint 152 terrains jouables.
- 54 maps de pays et 89 maps de villes sont maintenant disponibles, réparties sur les six continents pris en charge.
- La navigation Villes exploite réellement la hiérarchie continent → pays → ville sur un catalogue beaucoup plus fourni.
- La recherche globale retrouve les nouvelles villes et les nouveaux pays par nom français, alias courant ou contexte géographique.
- Les nouvelles maps de pays et de villes sont décrites dans `geography.js` puis transformées automatiquement en zones jouables ; `app.js` conserve seulement les géométries historiques spéciales (Paris, France, Bagneux-la-Fosse, Washington DC).
- Monde et les six continents utilisent désormais la même base de zones nationales que le catalogue afin de limiter les divergences entre sélection et tirage.
- Six playlists intégrées supplémentaires : France urbaine, Capitales européennes, USA Coast to Coast, Amérique latine, Asie urbaine et Océanie urbaine.
- Les nouveaux Challenges utilisent le format interne LP5 V3 avec des IDs de map textuels stables au lieu d'indices numériques ; les anciens codes LP5 V1/V2 restent lisibles.
- Bagneux-la-Fosse reste une map officielle intégrée et conserve son périmètre dédié.
- Les nouvelles découpes pays/villes sont des zones de jeu optimisées Street View ; elles ne prétendent pas encore reproduire exactement toutes les frontières administratives.

---

# LostPin V5.3.2

- Refonte du catalogue géographique autour d'une structure hiérarchique réutilisable.
- Nouvelle navigation des villes : continent → pays → ville.
- Nouvelle navigation des pays : continent → pays.
- Recherche globale par map, ville, pays, continent, région, département ou alias.
- Les maps existantes ont été migrées dans le catalogue sans changer leurs IDs persistés, afin de préserver Challenges, playlists, statistiques et multijoueur.
- Bagneux-la-Fosse reste une map officielle intégrée à LostPin et est classée Europe → France → Grand Est → Aube.
- L'éditeur de playlists utilise désormais le même catalogue géographique au lieu d'une liste de groupes codée séparément.
- Ajout de `geography.js`, qui sépare l'organisation du catalogue des géométries de jeu conservées dans `app.js`.
- Le sélecteur affiche des fils d'Ariane et des chemins géographiques pour préparer l'enrichissement massif prévu en V5.3.3.

---

# LostPin V5.3.1

- Nouveau sélecteur géographique organisé par niveaux : Paris, Villes, Pays, Continents et Monde.
- Six nouveaux terrains continentaux : Europe, Amérique du Nord, Amérique du Sud, Asie, Afrique et Océanie.
- Les terrains continentaux utilisent uniquement le catalogue de zones Google Street View prises en charge par LostPin ; les maps Paris et France conservent leurs règles dédiées.
- Les IDs historiques des Challenges sont conservés et les nouveaux terrains sont ajoutés en fin de table pour garder la compatibilité avec les codes LP5 existants.
- Playlists intégrées revues avec « Tour des continents » et un Grand Mix enrichi.
- Les playlists personnelles sont désormais modifiables (nom + terrains) sans devoir les supprimer puis les recréer.
- Le sélecteur de terrains dans l’éditeur de playlist est regroupé par niveau géographique.
- Packaging de distribution rétabli autour de LostPinUpdater.exe + dossier Game/ + release-manifest.json.

---

# LostPin V5.3.0

- Nouveau système de Playlists / collections de maps.
- Quatre playlists intégrées : Paris sous toutes ses coutures, France · ville & campagne, Deux capitales et Grand Mix LostPin.
- Création de playlists personnelles (jusqu’à 12), stockées localement.
- Tirage par « sac » : chaque map d’une playlist passe une fois avant le prochain mélange, avec limitation des répétitions entre deux boucles.
- Le HUD affiche la map réellement jouée à chaque manche et le score utilise son échelle propre.
- Les résultats finaux indiquent la map de chaque manche lorsqu’une playlist est utilisée.
- Support des playlists dans les Challenges avec un format LP5 interne V2 ; les anciens Challenges V1 restent compatibles.
- Support des playlists en multijoueur local et en ligne ; l’hôte partage la sélection de playlist avec le lobby.
- Les statistiques distinguent désormais maps et playlists, avec un badge « Mixeur ».
- Correction d’un bug latent de V5.1 : la comparaison d’un résultat de Challenge pouvait échouer faute de fonction d’échappement HTML.

---

# LostPin V5.2.0

- Nouvel écran Statistiques depuis l’accueil.
- Progression locale pour les parties solo et Challenges.
- Vue d’ensemble : parties, manches, 5 000, 25 000, distance moyenne, série et Challenges terminés.
- Précision moyenne sur les 10 / 50 / 100 dernières manches.
- Records sur 5 manches par map et par mode.
- Badges sobres liés aux performances réelles.
- Historique local des 20 dernières parties suivies.
- Import des anciens meilleurs scores et compteurs de parties parfaites quand ils existent.
- Aucune donnée envoyée vers un serveur : tout reste dans le localStorage du navigateur.

---

# LostPin V5.1.0

- Résultats de challenge partageables avec code portable `LPR1.…`.
- Résumé de fin de challenge : score, nombre de 5 000 et distance moyenne.
- Bouton « Copier mon résultat » et bouton pour recopier le challenge original.
- Comparaison d’un résultat reçu avec le meilleur résultat local sur le même challenge.
- Historique local des résultats de challenge, sans serveur central.

---

# LostPin V5.0.0

- Première version des Challenges asynchrones.
- Génération d'une partie avec panoramas Street View exacts enregistrés dans un code portable.
- Rejeu sur un autre PC avec la même map, le même mode, le même ordre et le même timer.
- 3, 5 ou 10 manches ; timer facultatif 15/20/30/60/120/180 s.
- ID court de 5 caractères pour identifier visuellement un challenge.
- Historique local des derniers challenges.
- Gestion d'une manche expirée sans réponse : 0 point.
- `version.json` passe à 5.0.0.

---

# LostPin V4.4.14

- En mode Duel, les PV sont maintenant affichés directement dans la carte de chaque joueur du bloc Joueurs / Réactions.
- Les PV passent en orange puis en rouge lorsqu'ils deviennent faibles.
- Aucun changement d'affichage pour les modes Classique et Élimination.

---

# LostPin V4.4.13

- Stabilisation du HUD déplaçable : correction automatique des ancrages en double.
- Repositionnement automatique des blocs lorsque la fenêtre est redimensionnée afin de limiter les superpositions et de garder les modules visibles.
- Mode édition du HUD plus explicite avec aide visuelle.
- README entièrement remis à jour.
- Ajout de version.json comme source de vérité de la version.
- L'onglet navigateur lit désormais version.json avec cache désactivé.
- Suppression des numéros de version codés en dur dans index.html et du numéro affiché dans le logo/HUD.

---

# LostPin V4.4.11

- Correction du panneau Joueurs / Réactions lorsqu’il est ancré : il conserve désormais sa largeur compacte au lieu de s’étirer sur toute la fenêtre.
- Aucun changement au système d’ancrage, au timer ou à la boussole.

---

# LostPin V4.4.10

- HUD personnalisable : Joueurs / Réactions, timer et boussole peuvent être déplacés lorsque la disposition est déverrouillée.
- Aimantation automatique sur huit zones d’ancrage (haut, milieu et bas).
- Verrouillage du HUD pour éviter les déplacements accidentels pendant la partie.
- Positions mémorisées localement et bouton de réinitialisation de la disposition.
- Le panneau Avancer / Reculer / Demi-tour / Départ est masqué dans les parties classiques ; son code reste disponible pour le futur mode Exploration.
- Numéros de version visibles harmonisés sur V4.4.10.

---

# LostPin V4.4.9

- Le HUD supérieur gauche prend désormais la même largeur que le bloc Joueurs / Réactions en multijoueur.
- Le bloc Joueurs / Réactions devient rétractable via un bouton de réduction / dépliage.
- Les pseudos joueurs gagnent encore en lisibilité.

---

# LostPin V4.4.8

- Pseudos du bloc Joueurs nettement agrandis.
- Suppression du badge de mode pendant la partie (Exploration / No Move).
- Ajout du mode solo « No Move + No Pan/Zoom » : panorama totalement verrouillé, sans déplacement, rotation ni zoom.
- Le mode solo « No Move » existant reste inchangé : rotation et zoom autorisés, déplacement interdit.

---

# LostPin V4.4.7

- Correction du panneau multijoueur : retour à une présentation horizontale et alignée, fidèle à la maquette.
- Section Joueurs affichée sur une seule rangée avec navigation gauche / droite.
- Section Réactions présentée sur une rangée compacte sous les joueurs.
- Pseudos joueurs conservés en taille renforcée.
- Timer capsule compact conservé.

---

# LostPin V4.4.6

## HUD social affiné
- Bloc multijoueur redessiné sur le modèle « Joueurs / Réactions » validé : deux zones clairement séparées dans un seul panneau.
- Pseudos joueurs nettement agrandis, avatars renforcés et état de validation conservé.
- Jusqu'à 4 joueurs visibles immédiatement ; la liste devient légèrement défilable pour 5-6 joueurs afin de conserver un HUD compact.
- Réactions disposées en grille 2 x 3, avec ajout de 👍.
- Timer central retravaillé en capsule sombre avec gros chrono blanc, libellé « Temps restant » et arcs cyan latéraux.
- Aucun changement de logique de partie ou de protocole multijoueur.


## HUD compact
- En-tête principal resserré en haut à gauche : logo, manche, score et map.
- Timer multijoueur isolé au centre et rendu plus lisible.
- Nouveau bloc unique joueurs + validations + emotes à gauche.
- Affichage extensible jusqu'à 6 joueurs sur deux colonnes, avec noms tronqués proprement si nécessaire.
- Boussole repositionnée sous les boutons utilitaires en haut à droite.
- Suppression de la pile de panneaux indépendants qui provoquait les superpositions en multijoueur.
- Styles adaptés aux identités Arcade Night et Midnight Explorer.

# LostPin V4.4.4

## Correctifs interface
- le timer multijoueur est désormais séparé du groupe de boutons et placé à gauche de celui-ci
- les boutons d'apparence, musique, boussole, aide et fermeture restent groupés sans timer au milieu
- la barre des émotes à envoyer est remontée sous la zone HUD/boussole pour être plus accessible

# LostPin V4.4.3

- Corrige les superpositions du HUD multijoueur : joueur, statut des validations, boussole et réactions disposent maintenant de zones distinctes.
- La liste des joueurs ayant validé reste sur une seule ligne défilable horizontalement pour ne plus pousser la boussole.
- Les réactions reçues sont déplacées dans une zone dédiée et ne recouvrent plus la boussole ni le statut des joueurs.
- Fermer un lobby avec la croix quitte proprement la salle en ligne et revient à l’accueil au lieu d’afficher une page vide.
- Conserve les modes Classique, Duel et Élimination de la V4.4.

# LostPin V4.4.1

- Correction de `start.bat` sous Windows : restauration obligatoire des fins de ligne CRLF.
- Le lanceur reste désormais ouvert si PowerShell ou le serveur local s'arrête, afin d'afficher l'erreur au lieu de fermer immédiatement la fenêtre.
- Vérification explicite de la présence de `server.ps1` avant le démarrage.
- Conservation des invariants : apostrophe échappée dans `peerError`, accents français et version exacte dans `themes.css`.

# LostPin V4.4.0

## Nouveaux modes multijoueur
- Ajout du mode **Duel** : 2 joueurs, 6 000 PV, la différence de score inflige des dégâts, K.O. possible.
- Ajout du mode **Élimination** : 3 à 6 joueurs, le dernier de chaque manche est éliminé jusqu'au dernier survivant.
- Les joueurs éliminés restent dans la partie comme spectateurs.
- Lobby, HUD, résultats, classement, podium et historique adaptés au mode compétitif.
- Validation des contraintes de joueurs/manches avant le lancement.
- Compatibilité protocolaire : Classique reste tolérant avec V4.3 ; Duel et Élimination exigent V4.4+.
- Conservation des invariants : apostrophe échappée dans `peerError`, accents français, version exacte dans `themes.css`.

# LostPin V4.3.0

- Identité multijoueur personnalisable : chaque joueur choisit un **avatar** et une **couleur** mémorisés localement.
- Lobby enrichi avec avatars, couleurs, nombre de joueurs, map, paramètres de partie et bouton de copie du code de salle.
- Ajout de **5 réactions rapides** pendant les manches : 🔥 😎 🤔 👀 😭.
- Animation visuelle lorsqu’un joueur valide sa position.
- Classements de manche et général enrichis avec l’identité visuelle de chaque joueur.
- Nouveau **podium final** avec les trois premiers joueurs.
- Détection d’un **Photo finish** lorsqu’une manche ou le classement final est particulièrement serré.
- Les invités peuvent maintenant **demander une revanche** ; l’hôte voit les demandes et peut relancer le même groupe.
- Historique local des **10 dernières parties en ligne**, avec place, score, map, mode, timer et nombre de manches.
- Protocole multijoueur porté à la version 4 pour transporter avatars, couleurs, réactions et demandes de revanche.
- Français accentué conservé dans l’interface et les messages.
- Namespace PeerJS historique `guessr360` conservé.

# LostPin V4.2.0

- Nouveau lobby en ligne avec état **Prêt / Pas prêt** pour chaque joueur.
- L’hôte ne peut démarrer que lorsque tous les joueurs sont prêts et connectés.
- Nombre de manches configurable : **3, 5 ou 10**.
- Timer configurable : **60, 120 ou 180 secondes**.
- Mode de déplacement configurable : **Move**, **No Move** ou **No Move + No Pan/Zoom**.
- Nouveau mode **No Move + No Pan/Zoom** : panorama entièrement verrouillé.
- Résultats de manche enrichis avec les positions de tous les joueurs, leur distance, leur score et le classement général cumulé.
- Ajout d’une revanche avec les mêmes joueurs sans recréer la salle.
- Gestion améliorée des déconnexions courtes et tentative de reconnexion automatique.
- La première réponse validée conserve la règle des **20 secondes restantes maximum**.
- Une réponse validée reste verrouillée, tout en permettant de continuer à observer le panorama lorsque le mode le permet.
- Français accentué dans l’interface et les messages.
- Namespace PeerJS historique `guessr360` conservé.

# LostPin V4.1.4

- Correction du HUD multijoueur : le timer fait maintenant partie de la barre d’actions et ne peut plus se superposer aux boutons.
- Ajustement du timer sur les écrans étroits.

# LostPin V4.1.3

- Timer multijoueur configurable par l’hôte à la création de la salle : 60, 120 ou 180 secondes.
- Le choix du timer est partagé aux joueurs dans le lobby et appliqué à chaque manche.
- La règle des 20 secondes après la première validation reste active quel que soit le timer initial.

# LostPin V4.1.2

- Ajout d’un timer en ligne de 60 s par manche.
- Après la première validation, le timer est ramené à 20 s s’il était encore supérieur.
- Ajout d’un indicateur en direct des joueurs ayant déjà validé.
- Verrouillage du marqueur après validation.
- Les joueurs sans validation à l’expiration reçoivent 0 point pour la manche.
- Correction du bouton Accueil du classement final multijoueur.
- Le namespace PeerJS historique `guessr360` reste conservé.

# LostPin V4.1.1

- Compatibilité des salles en ligne restaurée avec l’ancien namespace PeerJS `guessr360-*`.
- Amélioration du message « salle introuvable ».

# LostPin V4.1.0

- Remplacement du simple changement de couleurs par deux identités visuelles complètes.
- Ajout d’**Arcade Night** et **Midnight Explorer**.
- Logos, typographies, packs d’icônes, composants et HUD différenciés.

# LostPin V4.0.0

- Rebranding de Guessr360 en LostPin.
- Ajout des identités visuelles sélectionnables.
- Conservation de la musique, du multijoueur local et du multijoueur en ligne bêta de la V3.9.


## 6.0.8 - Boucle de jeu V6 / UX
- résultat de manche transformé en vraie étape centrale : fenêtre agrandie et centrée, verdict, progression de manche, métriques plus lisibles et CTA principal renforcé
- touche Entrée disponible sur le résultat pour passer rapidement à la manche suivante
- nouvel écran de fin de partie V6 plein écran avec score, barre de progression, meilleure manche, distances, récapitulatif et détail des manches
- écran de fin Exploration adapté avec métriques propres (distance parcourue et temps moyen)
- parcours de lancement simplifié : choisir une collection ramène aux modes, puis cliquer sur Classique / Blitz / No Move lance directement la partie avec la sélection courante
- les réglages avancés restent disponibles via le configurateur complet

## 6.0.9 - Reorganisation du projet
- code JavaScript range par responsabilite dans `src/js/core`, `src/js/features` et `src/js/ui`
- feuilles de style deplacees dans `src/css`
- assets separes entre `assets/brand` et `assets/images/v6`
- configuration locale deplacee dans `config/` avec migration automatique depuis l'ancien `config.js`
- scripts separes entre runtime et outils developpeur
- documentation centralisee dans `docs/`
- previews, captures QA et backups ranges dans `dev/` et exclus du package de release
- Updater et workflow GitHub adaptes a la nouvelle arborescence
## 6.0.10 - Verdict de fin de partie
- ajout d’un vrai verdict dynamique sur l’écran final selon le niveau de score
- phrases de feedback plus courtes et plus orientées jeu ; les métadonnées techniques restent dans les cartes de statistiques
- feedback supplémentaire lorsque la dernière manche est aussi la meilleure de la partie
- mise en scène typographique renforcée de la colonne droite du récapitulatif

## 6.0.11 - Recette V6 : corrections critiques
- hero responsive : les panneaux de destinations restent visibles quand le ratio de fenêtre change
- verrouillage complet de Street View dès qu'une manche est terminée (rotation/zoom/clic compris)
- retour du bouton flottant `Départ` en mode Move pour revenir au panorama initial
- correction d'une exception JavaScript sur l'écran de fin qui empêchait les statistiques et le détail des manches de s'afficher

## 6.0.12 - Consolidation UX gameplay
- mode Exploration retiré de l’interface et mis de côté pour refonte de game design ; prototype conservé dans le code
- No Move : blocage des déplacements clavier (flèches haut/bas et Home)
- NMPZ : curseur neutre à la place du symbole d’interdiction
- Blitz et timers multijoueur : compte à rebours beaucoup plus visible dans les 10 dernières secondes
- ajout de sons progressifs sur les 10 dernières secondes, avec signal distinct à 0 ; ils respectent le réglage audio existant
- boussoles simplifiées : 4 styles validés uniquement (Circulaire, Panoramique, Métal, Vintage)
- suppression de tous les badges de degrés ; les aiguilles Métal/Vintage indiquent désormais directement le cap regardé
- retour au point de départ déplacé dans la barre d’actions de la carte réponse sous forme d’icône ↩ avec tooltip
- hero responsive conservé tel quel après validation QA

## 6.0.13 - Consolidation UX navigation
- confirmation systématique avant de quitter une partie en cours, quel que soit le mode
- confirmation avant de quitter une salle multijoueur
- cartes hiérarchiques du catalogue simplifiées : suppression des libellés « Continent / Pays » répétés
- suppression des badges de type redondants sur les cartes de terrain
- compteurs « terrains disponibles » agrandis pour rester lisibles
- Collections en vedette : état sélectionné explicite et nouveau panneau d’action « Jouer cette collection / Personnaliser »
- un clic sur une collection ne téléporte plus silencieusement vers une autre section
## 6.0.14 - Recette UX catalogue et Challenges
- Catalogue : suppression des petits breadcrumbs redondants sur les catégories simples (Paris, Continents, Monde, Tous).
- Catalogue : icône et nom d’un terrain sont désormais sur la même ligne ; descriptions et compteurs de terrains sont plus lisibles.
- Challenges : la création devient autonome et permet de choisir directement le terrain, le déplacement (Move / No Move / NMPZ), le format (Classique / Blitz / Précision), le timer et le nombre de manches.
- Challenges Blitz : seuls 15 / 20 / 30 secondes restent sélectionnables pour préserver la cohérence du format.
- La refonte des grands panneaux hérités en vraies pages V6 avec navigation persistante est conservée comme chantier UX séparé.

## 6.1.0 - Navigation V6 et pages applicatives
- transforme les grandes modales héritées de V5 en vraies pages V6 sous la navbar persistante
- ajoute une vraie page Jouer : catalogue des terrains + configuration de partie
- ajoute une vraie page Collections / Playlists, avec les collections intégrées et les playlists personnelles
- ajoute une vraie page Défis avec onglets Créer / Rejoindre / Comparer
- ajoute une vraie page Multijoueur ; le terrain ou la collection peut désormais être choisi directement avant de créer la salle
- ajoute une page Classements & records honnête, fondée sur les records locaux tant qu'aucun backend de classement global n'existe
- transforme Statistiques en page Profil & progression avec records, badges, précision et historique
- conserve les modales uniquement pour les actions ponctuelles (aide, audio, confirmations, erreurs)
- la navigation Accueil / Jouer / Collections / Multijoueur / Défis / Classements / Profil reste visible et active sur ces pages
- corrige le retour au lobby de revanche multijoueur avec la nouvelle architecture de pages

## 6.1.1 - Multijoueur & navigation
- en multijoueur Classique, la première réponse ne raccourcit plus le chrono à 20 secondes : le timer continue normalement jusqu'à expiration ou jusqu'à ce que tous les joueurs aient répondu
- compatibilité renforcée : un client 6.1.1 ignore aussi un ancien paquet `first-submit` reçu dans une salle Classique
- notifications multijoueur déplacées dans une zone dédiée sous le bandeau, à droite, afin de ne jamais recouvrir la boussole
- bouton loupe inactif retiré temporairement de la navbar ; une recherche globale pourra revenir lors d'un chantier dédié
