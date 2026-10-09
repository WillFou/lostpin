# LostPin V7-001 - Premier hote ASP.NET Core

**Version de travail : 7.0.0-alpha.1. Base du jeu : V6.2.3.**

Premiere tranche de migration, pas une V7 publique finalisee. V6.4 et x2/x4 sont exclus.
Les corrections UX attendent les retours des autres joueurs.

## Demarrage sur Windows

Extraire dans un **nouveau dossier**, distinct de `D:\Web\LostPin`.
Ouvrir PowerShell dans le dossier contenant `LostPin.sln`.
Le **SDK .NET 10 stable** est requis, pas seulement le runtime. Visual Studio 2026 est facultatif.

Executer les controles locaux :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev\Test-V7.ps1
```

Le script compile, lance un vrai serveur ASP.NET avec des valeurs factices, verifie ses
routes et recommence depuis un dossier publie temporaire. Aucun appel Google ni vraie cle.
Ces tests sont un executable autonome, pas un projet a lancer avec `dotnet test`.

Apres validation, arreter le serveur V6 s'il utilise le port 8080 puis lancer :

```powershell
.\start-v7.bat -LegacyConfigPath "D:\Web\LostPin\config\config.js"
```

Le script lit seulement `googleMapsApiKey`, sans executer le JavaScript, et la transmet
en memoire au processus ASP.NET. Il ne copie, n'affiche et ne modifie pas le fichier V6.
Une variable `GoogleMaps__BrowserApiKey` deja presente a priorite.
Quand le serveur ecoute, ouvrir `http://127.0.0.1:8080/` et tester une partie.
Le port conserve permet de reutiliser les restrictions locales de la cle navigateur.
`Ctrl+C` arrete le serveur. Aucun commit, push, tag ou deploiement n'est effectue.

**Ne pas utiliser `start.bat`, l'Updater ou les scripts de release V6 pour cette tranche.**
Ne pas synchroniser dans `main` avant la recette.

## Configuration administrateur durable : User Secrets

Sans copie locale `config/config.js`, la configuration peut etre stockee hors depot :

```powershell
$key = Read-Host "Cle Google Maps navigateur"
dotnet user-secrets set "GoogleMaps:BrowserApiKey" "$key" --project .\server\LostPin.Web
Remove-Variable key
.\start-v7.bat
```

La saisie interactive evite le litteral dans l'historique des commandes. User Secrets n'est
pas un coffre chiffre de production. Ne jamais versionner de vraie cle dans appsettings.json.
Un `config/config.js` present dans le dossier extrait reste prioritaire via le lanceur.

## Contenu de la tranche

- Hote ASP.NET Core .NET 10 ; frontend V6 conserve a sa place.
- Projection MSBuild d'une liste de fichiers publics vers `wwwroot`.
- `GET/HEAD /config/config.js` genere, compatible avec le contrat `PG_CONFIG` existant.
- `/health/live`, `/health/ready`, `/version.json`.
- DTO public explicite : aucune serialization globale de la configuration serveur.
- Ecoute locale par defaut et tests HTTP/publication locale fournis.

## Limites importantes

Tirage, scores et regles restent dans le navigateur. Les statistiques restent locales.
Le multijoueur utilise encore PeerJS. Il n'y a ni comptes, ni SignalR, ni base, ni anti-triche,
ni hebergement Internet dans V7-001.

**Le plafond de 4 500 unites/appels par mois n'est PAS encore implemente.**
Ne pas ouvrir cette alpha au public. La cle JavaScript est visible dans le navigateur :
elle doit etre restreinte aux sites et API autorises dans Google Cloud.
Aucune cle serveur Google n'est utilisee dans cette tranche.

`LostPin__Enabled=false` prive les nouvelles configurations de la cle mais ne neutralise
pas les navigateurs qui l'ont deja chargee. Ce n'est pas un coupe-circuit Google.
`/health/ready` verifie la configuration locale, pas la validite de la cle chez Google.

## Versions

Le `version.json` racine reste celui de la base portable V6.2.3 ; ASP.NET ne le publie pas.
La route `/version.json` retourne la version C# `7.0.0-alpha.1` et `frontendBaseline: 6.2.3`.
L'onglet du navigateur affiche la version V7 sous ASP.NET. Les anciens outils de publication
V6 sont conserves pour reference et ne doivent pas publier cette alpha.

Voir `docs/v7/ARCHITECTURE.md`, `ROADMAP.md` et `QA_V7_001.md`.
