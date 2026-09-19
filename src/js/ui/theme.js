(() => {
'use strict';

const KEY = 'lostpin-v4-theme';
const COMPASS_KEY = 'guessr360-v37-compass-style';
const THEMES = {
  arcade: {
    name: 'Arcade Night',
    description: 'Identité jeu/sociale : logo badge, typo Bungee, icônes pleines et interface plus punchy.',
    color: '#071726',
    mark: 'assets/brand/lostpin-arcade-mark.svg',
    icons: 'assets/brand/icons-arcade.svg',
    tagline: 'EXPLORE. DEVINE. PROGRESSE.',
    compass: 'circle'
  },
  midnight: {
    name: 'Midnight Explorer',
    description: 'Identité exploration premium : logo boussole, typo Oxanium, icônes techniques et HUD géométrique.',
    color: '#03080e',
    mark: 'assets/brand/lostpin-midnight-mark.svg',
    icons: 'assets/brand/icons-midnight.svg',
    tagline: 'SOMEWHERE ALWAYS AWAITS.',
    compass: 'real'
  }
};

function readTheme() {
  // V6 uses one strong visual identity. Legacy theme preferences are ignored.
  return 'arcade';
}

function saveTheme(theme) {
  try { localStorage.setItem(KEY, theme); } catch (_) {}
}

function maybeSetInitialCompass(theme) {
  try {
    if (!localStorage.getItem(COMPASS_KEY)) localStorage.setItem(COMPASS_KEY, THEMES[theme].compass);
  } catch (_) {}
}

function svgUse(sprite, name) {
  return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><use href="${sprite}#${name}"></use></svg>`;
}

function applyIcons(theme) {
  const sprite = THEMES[theme].icons;
  document.querySelectorAll('[data-lp-icon]').forEach(el => {
    const icon = el.dataset.lpIcon;
    if (!icon) return;
    el.innerHTML = svgUse(sprite, icon);
  });
}

function applyBrand(theme) {
  const info = THEMES[theme];
  document.querySelectorAll('[data-brand-mark]').forEach(img => {
    img.setAttribute('src', info.mark);
    img.setAttribute('alt', '');
  });
  const tagline = document.getElementById('brandTagline');
  if (tagline) tagline.textContent = info.tagline;
  const favicon = document.getElementById('lostpinFavicon') || (() => {
    const link = document.createElement('link');
    link.id = 'lostpinFavicon';
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    document.head.appendChild(link);
    return link;
  })();
  favicon.href = info.mark;
}

function updatePicker(theme) {
  const info = THEMES[theme];
  const label = document.getElementById('themeStartLabel');
  if (label) label.textContent = `Identité : ${info.name}`;
  const desc = document.getElementById('themeCurrentDescription');
  if (desc) desc.textContent = info.description;
  document.querySelectorAll('[data-theme-choice]').forEach(card => {
    card.classList.toggle('selected', card.dataset.themeChoice === theme);
  });
}

function applyTheme(theme, persist = true) {
  // V6: keep a single brand identity while preserving the legacy theme API.
  theme = 'arcade';
  document.body.dataset.theme = theme;
  if (persist) saveTheme(theme);
  maybeSetInitialCompass(theme);
  applyBrand(theme);
  applyIcons(theme);
  updatePicker(theme);
  const meta = document.getElementById('themeColorMeta');
  if (meta) meta.setAttribute('content', THEMES[theme].color);
  try { window.dispatchEvent(new CustomEvent('lostpin:themechange', {detail:{theme, info:THEMES[theme]}})); } catch (_) {}
}

function openPicker() {
  applyTheme(document.body.dataset.theme || readTheme(), false);
  document.getElementById('themeModal')?.classList.remove('hidden');
}
function closePicker() {
  document.getElementById('themeModal')?.classList.add('hidden');
}

function bind() {
  for (const id of ['themeStartButton','themeGameButton']) {
    document.getElementById(id)?.addEventListener('click', openPicker);
  }
  document.getElementById('closeTheme')?.addEventListener('click', closePicker);
  document.getElementById('closeThemeFooter')?.addEventListener('click', closePicker);
  document.getElementById('themeModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('themeModal')) closePicker();
  });
  document.querySelectorAll('[data-theme-choice]').forEach(card => {
    card.addEventListener('click', () => applyTheme(card.dataset.themeChoice, true));
  });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closePicker(); });
}

applyTheme(readTheme(), false);
bind();
window.LostPinTheme = {
  themes: THEMES,
  apply: applyTheme,
  open: openPicker,
  refreshIcons: () => applyIcons(document.body.dataset.theme || readTheme()),
  refreshBrand: () => applyBrand(document.body.dataset.theme || readTheme()),
  current: () => document.body.dataset.theme
};
})();
