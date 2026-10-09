# Roadmap active apres abandon de V6.4

## Decisions preservees

V6.2.3 est la base stable. V6.4 et x2/x4 sont abandonnes. Les corrections UX attendent les
retours de tests. V7 signifie ASP.NET Core / LostPin Online. La contrainte Google est mensuelle.

## Decoupage propose pour V7.0

Ces identifiants sont des tranches de travail, pas de nouvelles releases publiques.

| Tranche | Resultat attendu | Statut |
| --- | --- | --- |
| V7-001 | Hote ASP.NET, frontend V6, configuration, recette locale | Sources fournies ; validation .NET a faire |
| V7-002 | Sessions et manches solo serveur, validation et calcul des scores | A concevoir apres recette 001 |
| V7-003 | Persistance minimale, mesure par service/SKU, admission et politique mensuelle | A concevoir ; aucun plafond actuel |
| V7-004 | Domaine/HTTPS, deploiement, restrictions Google, observabilite et recette | Non commence |

Le cout et les protections minimales sont des conditions d'ouverture, pas des finitions.
Oracle reste une piste discutee, pas une ressource creee ni une gratuite garantie.
Le choix de base de donnees sera arrete avec le schema serveur ; aucune base n'est requise pour 001.

## Apres la fondation

La roadmap de travail conserve les axes : challenges centralises (V7.1), multijoueur SignalR
(V7.2), profils/statistiques/classements (V7.3), collections communautaires (V7.4), social (V7.5),
puis durcissement complementaire (V7.6). Les protections necessaires ne doivent pas attendre
V7.6 avant une ouverture publique. Les fonctionnalites locales V6 ne sont pas a refaire sans audit.

## Sortie de V7-001

Compilation et publication correctes ; tests HTTP passes sur les deux sorties ; configuration V6
reutilisable sans secret dans le depot ; partie solo reelle complete sous ASP.NET ; aucun changement
sur les modes interdisant le deplacement. Pas de tag public avant cette validation.
