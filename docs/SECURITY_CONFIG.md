# Configuration locale, cle Google et publication - V6.2.2

## Regle fondamentale

`config/config.js` est un fichier local. Il peut contenir la cle Maps JavaScript necessaire au navigateur, mais il ne doit jamais etre suivi par Git ni present dans une archive de release.

Une cle navigateur doit en plus rester restreinte dans Google Cloud (sites/referrers autorises + API necessaires). L'exclusion Git evite une fuite accidentelle dans le depot ; elle ne transforme pas une cle navigateur en secret inaccessible aux utilisateurs du jeu.

## Workflow recommande : tester puis recopier sans la config

Le workflow habituel est :

1. extraire une release dans un dossier de test ;
2. lancer `start.bat` et saisir la cle, ce qui cree `config/config.js` dans ce dossier ;
3. tester ;
4. recopier les sources vers `D:\Web\LostPin` ;
5. commit/push.

Le point 4 etait la source des fuites accidentelles. V6.2.2 fournit donc :

```powershell
.\sync-to-repo.bat
```

Le script copie le dossier courant vers `D:\Web\LostPin` par defaut, mais exclut explicitement :

- `config.js` et `config/config.js` ;
- les variantes `config.local.js` ;
- les `.env` locaux ;
- `/benchmark guessers/` ;
- `.git/`.

La configuration deja presente dans le depot cible reste donc intacte.

Pour une autre cible :

```powershell
.\sync-to-repo.bat "D:\Autre\LostPin"
```

## Reparer un depot existant

`sync-to-repo.bat` le fait automatiquement lorsque la cible est un depot Git. On peut aussi lancer directement :

```powershell
.\enable-git-safety.bat
```

Ce script :

- retire les configurations locales de l'index avec `git rm --cached` sans supprimer les fichiers du disque ;
- configure `core.hooksPath=.githooks` ;
- execute le controle LostPin.

Verification manuelle :

```powershell
git ls-files -- config.js config/config.js
git check-ignore -v --no-index -- config/config.js
git config --get core.hooksPath
```

`git ls-files` ne doit rien afficher pour les configurations locales.

## Garde-fous Git

- `.githooks/pre-commit` execute `Test-Release.ps1 -Staged` et scanne l'index avant le commit.
- `.githooks/pre-push` execute `Test-Release.ps1 -Head` et recontrole le commit avant son envoi.
- `scripts/dev/Test-Release.ps1` refuse une configuration locale suivie, du benchmark suivi, une cle Google detectee dans les fichiers texte controles et une incoherence de version.
- `scripts/dev/publish-release.ps1` refait le controle avant toute creation de tag.
- GitHub Actions exclut encore explicitement les configurations du paquet et lance `Test-Package.ps1` avant le ZIP.

Les garde-fous sont une defense en profondeur. Ils ne remplacent pas la verification de `git status` et des fichiers staged.

## start.bat

Le comportement est volontairement simple :

- `config/config.js` absent -> demande de cle ;
- placeholder literal `PASTE_YOUR_GOOGLE_MAPS_KEY_HERE` present -> demande de cle ;
- fichier present sans ce placeholder -> LostPin demarre directement.

`start.bat` ne valide pas le format de la valeur enregistree.

## Si une cle a deja ete poussee

La considerer exposee et la revoquer/remplacer dans Google Cloud. Retirer le fichier du commit courant n'efface pas les anciens commits/tags/clones. Un nettoyage d'historique est une operation distincte a preparer avec prudence ; ne pas improviser un force-push.
