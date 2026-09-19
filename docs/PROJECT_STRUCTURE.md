# Structure du projet LostPin

Depuis la V6.0.9, les fichiers runtime, le code source, les assets et les fichiers de travail sont separes.

```text
LostPin/
├─ index.html                  # point d'entree web
├─ start.bat                   # lancement local Windows
├─ version.json                # version courante
├─ README.txt
├─ CHANGELOG.md
├─ src/
│  ├─ css/
│  │  ├─ themes.css
│  │  └─ v6-ui.css
│  └─ js/
│     ├─ core/                 # moteur et donnees geographiques
│     │  ├─ app.js
│     │  └─ geography.js
│     ├─ features/             # fonctions metier independantes
│     │  ├─ multiplayer.js
│     │  ├─ challenge.js
│     │  ├─ playlists.js
│     │  ├─ stats.js
│     │  └─ music.js
│     └─ ui/                   # identite et comportements d'interface
│        ├─ theme.js
│        └─ v6-ui.js
├─ assets/
│  ├─ brand/                   # logos et sprites SVG
│  └─ images/v6/               # photos et visuels V6
├─ config/
│  ├─ config.js                # cle locale, jamais a partager
│  └─ config.example.js
├─ scripts/
│  ├─ runtime/                 # serveur local et changement de cle
│  └─ dev/                     # build, release et maintenance
├─ docs/                       # documentation technique
├─ dev/
│  ├─ qa/                      # previews et captures de controle
│  └─ backups/                 # anciennes versions de travail
├─ tools/LostPinUpdater/       # launcher/updater .NET
├─ .github/workflows/          # CI / releases
└─ dist/                       # sorties de build locales
```

## Regles

- La racine reste volontairement courte : les fichiers necessaires au lancement et les documents principaux seulement.
- Le code applicatif va dans `src/`; ne pas ajouter de nouveau JS ou CSS a la racine.
- Les images de production vont dans `assets/`, jamais dans `dev/`.
- Les previews, captures de QA et snapshots de travail vont dans `dev/`.
- Les scripts requis par le jeu vont dans `scripts/runtime/`; les outils developpeur dans `scripts/dev/`.
- `index.html` reste a la racine pour conserver une URL simple et le fonctionnement de l'Updater.
