# LostPin V4.1.3

- Timer multijoueur configurable par l'hote a la creation de la salle : 60, 120 ou 180 secondes.
- Le choix du timer est partage aux joueurs dans le lobby et applique a chaque manche.
- La regle des 20 secondes apres la premiere validation reste active quel que soit le timer initial.

# LostPin V4.1.2

- Ajout d'un timer en ligne de 60 s par manche.
- Apres la premiere validation, le timer est ramene a 20 s s'il etait encore superieur.
- Ajout d'un indicateur en direct des joueurs ayant deja valide.
- Verrouillage du marqueur apres validation.
- Les joueurs sans validation a l'expiration recoivent 0 point pour la manche.
- Correction du bouton Accueil du classement final multijoueur.
- Le namespace PeerJS historique `guessr360` reste conserve.

## 4.1.1

- Fixed online room compatibility with Guessr360 V3.9.
- Restored the historical PeerJS room namespace (`guessr360-*`).
- Improved the room-not-found message.

# Changelog

## 4.1.0
- Replaced the V4.0 color-only theme approach with two full visual identities.
- Added **Arcade Night**: custom pin/orbit mark, Bungee/Nunito typography, filled sticker-like icons, rounded chunky components and a social-game HUD.
- Added **Midnight Explorer**: custom compass-pin mark, Oxanium/Space Grotesk typography, technical line icons, angular components and cartographic-grid styling.
- Added theme-specific SVG icon packs for maps, modes, multiplayer, audio, help, travel controls and settings.
- Added theme-specific favicon and compact in-game LostPin branding.
- Redesigned the appearance picker to compare the two identities directly.
- Added first-run compass recommendations without overwriting an existing user choice.
- Removed Chill Cartographic from the selectable identities.

## 4.0.0
- Rebranded Guessr360 as LostPin.
- Added selectable visual theming.
- Kept music, local multiplayer and online multiplayer beta from V3.9.
