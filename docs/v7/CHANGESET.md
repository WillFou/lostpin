# V7-001 - Changements par rapport au ZIP V6.2.3

Aucun fichier de la V6.4 repris. Tous les fichiers de la base V6.2.3 sont conserves.

| Fichier existant modifie | Changement |
| --- | --- |
| `.githooks/pre-commit` | Correction pwsh -ExecutionPolicy Bypass deja validee sur le poste. |
| `.githooks/pre-push` | Meme correction, en conservant le controle -Head. |
| `.gitignore` | Exclusion des configurations ASP.NET locales et sorties de publication. |
| `index.html` | Une precision dans le paragraphe aide/configuration Online vs portable. |
| `scripts/dev/Test-Release.ps1` | Refus du suivi des fichiers de secrets ASP.NET locaux. |
| `scripts/dev/sync-to-repo.ps1` | Exclusion des sorties de build et configurations ASP.NET locales. |
| `src/js/core/app.js` | Deux messages de configuration uniquement ; aucune regle ni navigation modifiee. |
| `sync-to-repo.bat` | Correction du chemin source final : %CD%. |

Les ajouts concernent uniquement le serveur C#, la solution, le lancement V7, les tests et la documentation V7.
Les empreintes des fichiers sources originaux figurent dans `baseline-v6.2.3.sha256.json`.
