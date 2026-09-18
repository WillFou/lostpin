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
