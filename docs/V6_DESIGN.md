# LostPin V6 - direction UI/UX

La V6 est une vraie rupture visuelle par rapport a la V5.5.1. Le moteur de jeu reste en place, mais l experience autour de lui est reconstruite comme un vrai site de jeu.

## Direction visuelle

- identite gaming unique : bleu nuit, rose LostPin, cyan ;
- densite inspiree des grands jeux de geographie : beaucoup de contenu utile visible rapidement ;
- header complet et permanent ;
- hero photographique fort plutot qu un simple panneau ;
- cartes compactes et visuelles pour les modes et collections ;
- multijoueur, progression et defis visibles directement sur la home ;
- Paris reste une collection phare, sans enfermer LostPin dans Paris ;
- catalogue et configurateur complets restent disponibles plus bas pour les joueurs qui veulent tout regler.

## Cible graphique

La reference validee est la maquette gaming sombre avec : grand hero Paris, titre blanc/rose, barre de navigation complete, rangee de modes, collections photographiques et blocs sociaux/multijoueur. La V6.0.2 renforce cette fidelite : assets photo propres, hierarchie typographique lisible et proportions plus proches de la maquette validee.

## Compatibilite

Les IDs DOM consommés par app.js, multiplayer.js, challenge.js, playlists.js, stats.js et music.js sont conservés. La logique Street View, les scores, les Challenges, le multijoueur P2P, les playlists et les statistiques restent inchangés.

## Technique

La V6 reste en HTML/CSS/JavaScript vanilla. Le passage a ASP.NET est reserve a la roadmap V7.


## V6.0.3 — règle de référence

La maquette gaming validée n'est plus une simple inspiration : elle sert de référence de composition pour la homepage. Le hero doit rester compact, photographique et plein cadre ; les modes doivent être visibles rapidement ; la typographie principale ne doit pas descendre dans des tailles de micro-interface sur desktop ; les sections principales doivent conserver une densité de launcher de jeu.


## V6.0.4 — écran de jeu

Le gameplay suit désormais la même direction visuelle que la homepage : barre supérieure continue de type jeu/launcher, Street View plein cadre, carte de réponse flottante à droite, commandes de déplacement compactes à gauche et contexte de mode lisible. Les informations essentielles doivent être lisibles d'un coup d'œil sans couvrir le panorama.
## V6.0.5 - HUD simplifie

- Le mode de jeu fait partie du bandeau supérieur.
- La carte flottante « Mode de jeu » n'est plus rendue.
- Le panneau de déplacement reste absent des parties géographiques ordinaires, conformément à la V5 ; il n'apparait que pour Exploration.
- La boussole V6 flotte au centre sous le bandeau supérieur, sans panneau sombre pour les styles horizontaux.


- Système d’ancrage supprimé : le HUD V6 utilise désormais des positions fixes et cohérentes plutôt qu’un éditeur déplaçable.

## V6.0.6 - lisibilite boussole et panneau J/R

- La couche externe de la boussole reste transparente afin d'eviter tout grand rectangle opaque.
- Le cadran de la boussole et son badge de cap gardent un fond sombre semi-transparent propre pour rester lisibles sur toutes les images Street View.
- Le panneau Joueurs / Reactions est la seule exception au HUD fixe : il peut etre deplace librement afin de degager un detail du panorama. Sa position est memorisee ; un double-clic sur son en-tete restaure la position par defaut.
- Le systeme d'ancrage global ne revient pas.

## Boucle de jeu V6
- La validation d’une réponse doit créer une vraie rupture visuelle : résultat centré, score/distance dominants, action suivante évidente.
- Le résultat de manche accepte Entrée comme raccourci de continuation.
- La fin de partie est un écran à part entière et non une modale : score final, progression, synthèse, détail des manches et actions de sortie.
- Le parcours rapide vise : terrain → mode → jeu. Le configurateur détaillé reste disponible pour les réglages avancés.

## V6.0.12 - consolidation UX gameplay

- Exploration est retire de l'interface publique et reste conserve comme prototype interne a redesigner.
- No Move bloque aussi la navigation clavier ; NMPZ n'utilise plus de curseur d'interdiction.
- Le timer devient un element fort du HUD, avec alerte visuelle et sonore progressive dans les 10 dernieres secondes.
- Quatre boussoles seulement sont exposees : Circulaire, Panoramique, Metal et Vintage. Aucun badge de degres n'est affiche.
- Les aiguilles des cadrans circulaires indiquent directement le cap regarde (N/E/S/O).
- Le retour au point de depart est une action secondaire de la carte de reponse (icone ↩ + tooltip), pas un widget flottant.

## V6.0.13 - navigation et choix de contenu
- quitter une partie demande toujours confirmation
- le catalogue géographique évite les répétitions de type et remonte la lisibilité des compteurs
- les collections en vedette deviennent un vrai choix de contenu : sélection visible, résumé et CTA direct pour jouer ou personnaliser
## V6.0.14 - Catalogue et création de challenge
- Les catégories simples du catalogue n’affichent plus un breadcrumb qui répète le filtre actif.
- Les cartes de terrain utilisent une ligne titre `icône + nom`, puis la description.
- La création d’un Challenge ne dépend plus silencieusement de la configuration précédente : terrain et règles sont sélectionnables dans l’écran de création.
- La conversion de Challenges, Collections, Multijoueur, Classements et Profil en vraies pages de navigation V6 reste planifiée après la recette fonctionnelle.

## V6.1 - Navigation applicative
La V6.1 abandonne les grandes popups héritées de la V5 pour les destinations principales. La navbar reste persistante et les destinations Jouer, Collections, Multijoueur, Défis, Classements et Profil sont de vraies pages dans le shell principal.

Les modales sont réservées aux interactions ponctuelles : confirmations, aide, réglages audio, erreurs et petites actions contextuelles.

### Pages
- Jouer : catalogue + configuration détaillée.
- Collections : collections LostPin + playlists personnelles.
- Défis : création, réception et comparaison de Challenges.
- Multijoueur : identité, terrain/collection, règles, création/rejoint d'une salle et historique.
- Classements : records locaux, clairement présentés comme tels tant qu'il n'existe pas de backend global.
- Profil : progression locale, records, badges et historique.
