# Configuration locale, clé Google et publication - V6.2.1

## Incident et cause identifiée

Les archives V6.1.1 et V6.2.0 fournies ne contenaient plus de règle Git excluant `config.js`. Le workflow copiant les fichiers suivis par Git pouvait donc aussi embarquer une configuration locale. C'est une régression de la livraison. Le ZIP V6.2.0 inspecté ici contenait une configuration avec valeur d'exemple, pas la clé réelle de l'utilisateur. L'historique distant du dépôt n'a pas été inspecté : la première inclusion de la clé dans les commits n'est donc pas datée.

Les avertissements LF/CRLF ne rendent pas un fichier ignoré soudainement suivi. Une fois un fichier suivi, le remettre dans `.gitignore` ne le retire pas de l'index ni de l'historique.

## Actions immédiates dans Google Cloud

1. Considérer la clé poussée comme exposée. Examiner les usages inhabituels et les restrictions actuelles.
2. Créer une clé de remplacement restreinte aux sites autorisés et aux seules API nécessaires. Pour le SDK navigateur, utiliser les restrictions Websites / HTTP referrers, pas une restriction IP serveur.
3. Mettre à jour la configuration locale des installations concernées, vérifier qu'elles fonctionnent, puis supprimer/désactiver l'ancienne clé. En cas d'abus actif, la neutraliser sans attendre tous les tests.
4. Ne pas activer de nouveau service Google pour cette mise à jour. Les choix de services/API existants restent inchangés.

Une clé Maps JavaScript est utilisée dans le navigateur : l'exclure de Git ne la transforme pas en secret inaccessible au joueur. Les restrictions Google sont donc indispensables. Ne jamais placer une clé serveur secrète dans `config.js`.

## Retirer le suivi Git sans effacer la configuration locale

Après copie des nouveaux fichiers dans le dépôt (le ZIP n'écrase pas votre configuration) :

```powershell
cd "D:\Web\LostPin"
git rm --cached --ignore-unmatch -- config.js config/config.js
git ls-files -- config.js config/config.js
git check-ignore -v --no-index -- config/config.js
```

`git ls-files` ne doit plus afficher les fichiers de configuration. `git rm --cached` conserve les fichiers locaux. Ne pas utiliser `git rm` sans `--cached` ni ajouter `-f` sans examiner un éventuel conflit.

Avant publication :

```powershell
git add .
git diff --cached --name-status
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev/Test-Release.ps1 -Staged
git commit -m "Release 6.2.1 - HUD, timer classique et protection configuration"
git push
.\publish-release.bat 6.2.1
```

Vérifier chaque résultat avant de passer à la commande suivante. Ne pas copier ici le diff du contenu de `config.js` : il pourrait réafficher la clé retirée.

## Garde-fous ajoutés

- `.gitignore` : `config.js` à tout niveau (ancienne/nouvelle arborescence), configurations locales, `.env`, sorties de build, cache QA et `/benchmark guessers/`.
- Source : uniquement `config/config.example.js`. `start.bat` crée le fichier local si absent ; l'Updater continue de préserver la configuration existante.
- `scripts/dev/Test-Release.ps1` : refuse une configuration locale suivie, un fichier benchmark suivi, une chaîne au format de clé Google dans les fichiers texte contrôlés, ou une version incohérente. Les valeurs de clés ne sont jamais affichées.
- `scripts/dev/publish-release.ps1` : contrôle avant toute opération distante ; branche main propre et synchronisée ; aucun remplacement forcé de tag.
- GitHub Actions : contrôle version/config avant compilation, exclusion explicite des fichiers locaux puis `Test-Package.ps1` avant création du ZIP.
- Le détecteur est un garde-fou ciblé Google, pas un scanner universel de tous les secrets. Ne pas s'en remettre uniquement à la détection automatique.

### Protection optionnelle avant commit

Pour bloquer aussi un commit accidentel, vérifier d'abord si un système de hooks existe :

```powershell
git config --get core.hooksPath
```

Si aucun hook personnalisé n'est en place :

```powershell
git config core.hooksPath .githooks
```

Le hook appelle le contrôle sur l'index (`-Staged`). S'il existe déjà un autre système de hooks, y intégrer cette commande plutôt que d'écraser son chemin. Ce hook local n'est pas installé silencieusement.

## Le mauvais tag v6.0.2

Le journal utilisateur indique une création involontaire de `v6.0.2` sur le commit de 6.2.0. Publier 6.2.0 ou 6.2.1 ne supprime pas ce tag ni sa Release.

Seulement après confirmation qu'il s'agit bien du tag erroné : supprimer sa Release sur GitHub, puis supprimer ce tag précis :

```powershell
git tag -d v6.0.2
git push origin --delete v6.0.2
```

Aucune réécriture de main n'est nécessaire pour cette erreur de numérotation. Le nouveau script refuse `6.0.2` si `version.json` contient `6.2.1`.

## L'historique et les anciens ZIP

Retirer le fichier du commit courant ne le retire pas des anciens commits/tags/clones. La priorité est de rendre la clé exposée inutilisable, pas un simple amend du dernier commit. Examiner et retirer les anciens assets de Release qui contiendraient la clé. Un nettoyage complet de l'historique peut ensuite être préparé avec les collaborateurs ; ne pas effectuer un force-push improvisé.

## Validation et limites

Les règles d'exclusion ont été exercées avec Git dans des dépôts temporaires. Le paquet source a été analysé avant livraison. L'environnement de développement fourni ici n'a ni PowerShell ni .NET : les nouveaux scripts PowerShell et le workflow Windows ont été relus, mais doivent être exécutés une première fois sous Windows/Actions. Aucune clé, Release ou branche distante de l'utilisateur n'a été modifiée depuis cet environnement.

## Sources de référence

- Google Maps : https://developers.google.com/maps/api-security-best-practices
- Git : https://git-scm.com/docs/gitignore
- GitHub : https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
- Releases : https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository
