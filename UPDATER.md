# LostPin Updater

Ce kit ajoute un launcher/updater Windows a LostPin sans imposer Git, Python ou .NET aux testeurs.
Le binaire publie est self-contained en .NET 8.

## Architecture distribuee

Chaque GitHub Release contient :

```text
LostPinUpdater.exe
LISEZ-MOI.txt
Game/
  index.html
  app.js
  multiplayer.js
  start.bat
  change-api-key.bat
  config.js
  version.json
  release-manifest.json
  ...
```

Le testeur extrait le ZIP une seule fois puis lance toujours `LostPinUpdater.exe`.
L'updater verifie `https://api.github.com/repos/WillFou/lostpin/releases/latest`.
Aucun token GitHub n'est necessaire pour le depot public.

## Protection de la cle Google

`Game/config.js` et `Game/config.local.js` sont proteges pendant une mise a jour.
Le `config.js` deja present chez le testeur n'est jamais ecrase par l'updater.
Le package initial contient tout de meme le `config.js` du depot pour permettre une premiere installation.

Le bouton `Configurer la cle API` lance `Game/change-api-key.bat`.

## Rollback

Pendant une mise a jour, chaque fichier remplace ou supprime est copie dans un dossier temporaire.
Si l'installation echoue, l'updater restaure les anciens fichiers et supprime les nouveaux fichiers qui avaient ete crees.

`release-manifest.json` permet aussi de supprimer proprement les anciens fichiers qui n'existent plus dans une nouvelle release.

## Installation du kit dans le depot

Extraire le contenu de ce kit directement dans :

```text
D:\Web\LostPin
```

Puis :

```bat
setup-updater.bat
git add .github tools build-updater.bat publish-release.bat setup-updater.bat UPDATER.md .gitignore
git commit -m "Add automatic LostPin updater"
git push
```

## Premiere release : 4.4.11

Une fois le kit commite sur `main`, creer le tag :

```bat
publish-release.bat 4.4.11
```

Le push du tag `v4.4.11` declenche `.github/workflows/release.yml`.
GitHub Actions :

1. compile `LostPinUpdater.exe` en win-x64 self-contained ;
2. prepare le dossier `Game` a partir des fichiers suivis par Git ;
3. genere `version.json` et `release-manifest.json` ;
4. cree `LostPin-v4.4.11.zip` ;
5. cree automatiquement la GitHub Release et y attache le ZIP.

La release apparait ensuite dans l'onglet Releases du depot.

## Publier les versions suivantes

Le workflow conseille reste :

```text
travail -> release/4.4.12 -> commit -> push -> merge main -> push
```

Quand `main` contient exactement la version a publier :

```bat
publish-release.bat 4.4.12
```

Le tag declenche automatiquement la fabrication de `LostPin-v4.4.12.zip`.
Les testeurs qui ont deja `LostPinUpdater.exe` verront alors la 4.4.12 et cliqueront simplement sur `Mettre a jour`.

## Compilation locale facultative

Pour compiler l'updater sur ton PC :

```bat
build-updater.bat
```

Resultat :

```text
dist\updater\LostPinUpdater.exe
```

Cette compilation locale n'est pas necessaire pour publier une release : GitHub Actions le fait deja.

## Fichiers exclus du package de jeu

Le workflow n'embarque pas :

- `.github/`
- `tools/`
- `dist/`
- les scripts de publication/build du developpeur
- `.gitignore` / `.gitattributes`

Les autres fichiers suivis par Git sont recopies dans `Game/`, ce qui evite d'avoir a maintenir manuellement une liste de fichiers runtime.

## Limitation de cette V1

L'updater met a jour le dossier `Game` mais ne se remplace pas lui-meme lorsqu'une nouvelle release contient une version plus recente de `LostPinUpdater.exe`.
Pour les mises a jour du jeu, cela ne pose aucun probleme. Un mecanisme d'auto-update du launcher pourra etre ajoute plus tard si necessaire.
