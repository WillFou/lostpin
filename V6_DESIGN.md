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

Les IDs DOM consommes par app.js, multiplayer.js, challenge.js, playlists.js, stats.js, music.js et hud-layout.js sont conserves. La logique Street View, les scores, les Challenges, le multijoueur P2P, les playlists et les statistiques restent inchanges.

## Technique

La V6 reste en HTML/CSS/JavaScript vanilla. Le passage a ASP.NET est reserve a la roadmap V7.


## V6.0.3 — règle de référence

La maquette gaming validée n'est plus une simple inspiration : elle sert de référence de composition pour la homepage. Le hero doit rester compact, photographique et plein cadre ; les modes doivent être visibles rapidement ; la typographie principale ne doit pas descendre dans des tailles de micro-interface sur desktop ; les sections principales doivent conserver une densité de launcher de jeu.
