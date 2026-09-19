(() => {
'use strict';

const $ = id => document.getElementById(id);

function startScreen() { return $('startScreen'); }

function scrollToSection(id) {
  const target = document.getElementById(id);
  const scroller = startScreen();
  if (!target || !scroller) return;
  const top = Math.max(0, target.offsetTop - 82);
  scroller.scrollTo({ top, behavior: 'smooth' });
}

function clickExisting(id) {
  const button = $(id);
  if (button) button.click();
}

function chooseMode(mode) {
  const card = document.querySelector(`.modeCard[data-mode="${mode}"]`);
  if (card) card.click();
}

function applyPreset(name) {
  const game = window.guessrGame;
  if (!game) return;
  if (name === 'exploration') {
    game.setPlayType?.('exploration');
  } else {
    game.setPlayType?.('guess');
    if (name === 'nomove') chooseMode('nomove');
    else if (name === 'nmpz') chooseMode('nmpz');
    else chooseMode('explore');
    game.setGameVariant?.(name === 'blitz' ? 'blitz' : 'classic');
  }
  scrollToSection('v6Setup');
}

function chooseZone(zoneId) {
  const game = window.guessrGame;
  if (!game?.setSelection) return;
  game.setSelection({ type: 'zone', zoneId });
  scrollToSection('v6Setup');
}

function bindNavigation() {
  document.querySelectorAll('[data-v6-scroll]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      scrollToSection(button.dataset.v6Scroll);
    });
  });

  document.querySelectorAll('[data-v6-zone]').forEach(button => {
    button.addEventListener('click', () => chooseZone(button.dataset.v6Zone));
  });

  document.querySelectorAll('[data-v6-preset]').forEach(button => {
    button.addEventListener('click', () => applyPreset(button.dataset.v6Preset));
  });

  $('v6NavMultiplayer')?.addEventListener('click', () => clickExisting('multiplayerButton'));
  $('v6NavChallenges')?.addEventListener('click', () => clickExisting('challengeButton'));
  $('v6NavStats')?.addEventListener('click', () => clickExisting('statsButton'));
  $('v6NavProfile')?.addEventListener('click', () => clickExisting('statsButton'));
  $('v6HeroProfile')?.addEventListener('click', () => clickExisting('statsButton'));
  $('v6HeroChallenge')?.addEventListener('click', () => clickExisting('challengeButton'));
  $('v6HeroBlitz')?.addEventListener('click', () => applyPreset('blitz'));
  $('v6SearchNav')?.addEventListener('click', () => { scrollToSection('v6Catalog'); setTimeout(() => $('zoneSearch')?.focus(), 420); });
  $('v6ModeMultiplayer')?.addEventListener('click', () => clickExisting('multiplayerButton'));
  $('v6CommunityMulti')?.addEventListener('click', () => clickExisting('multiplayerButton'));
  $('v6CommunityChallenge')?.addEventListener('click', () => clickExisting('challengeButton'));
  $('v6CommunityStats')?.addEventListener('click', () => clickExisting('statsButton'));
  $('v6SetupLaunch')?.addEventListener('click', () => clickExisting('startButton'));
}

function bindScrollSpy() {
  const scroller = startScreen();
  const navButtons = [...document.querySelectorAll('.v6MainNav [data-v6-scroll]')];
  const sections = navButtons
    .map(button => ({ button, section: document.getElementById(button.dataset.v6Scroll) }))
    .filter(item => item.section);
  if (!scroller || !sections.length) return;

  const refresh = () => {
    const y = scroller.scrollTop + 150;
    let current = sections[0];
    for (const item of sections) {
      if (item.section.offsetTop <= y) current = item;
    }
    navButtons.forEach(button => button.classList.toggle('active', button === current.button));
  };
  scroller.addEventListener('scroll', refresh, { passive: true });
  refresh();
}

function mirrorLaunchState() {
  const source = $('startButton');
  const mirror = $('v6SetupLaunch');
  if (!source || !mirror) return;
  const refresh = () => {
    mirror.disabled = source.disabled;
    mirror.textContent = source.disabled ? source.textContent : 'Jouer maintenant';
  };
  new MutationObserver(refresh).observe(source, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
  refresh();
}

function addVersionClass() {
  document.documentElement.classList.add('lostpin-v6');
}

addVersionClass();
bindNavigation();
bindScrollSpy();
mirrorLaunchState();
})();
