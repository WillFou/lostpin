(() => {
'use strict';
const ENABLED_KEY = 'guessr360-v39-music-enabled';
const VOLUME_KEY = 'guessr360-v39-music-volume';
const $ = id => document.getElementById(id);

class ChillMusic {
  constructor() {
    this.enabled = localStorage.getItem(ENABLED_KEY) !== 'false';
    this.volume = Math.max(0, Math.min(1, Number(localStorage.getItem(VOLUME_KEY) ?? 0.22)));
    if (!Number.isFinite(this.volume)) this.volume = 0.22;
    this.ctx = null;
    this.master = null;
    this.delay = null;
    this.feedback = null;
    this.filter = null;
    this.timer = null;
    this.nextBar = 0;
    this.barIndex = 0;
    this.started = false;
    this.progression = [
      [130.81,164.81,196.00,246.94], // Cmaj7
      [110.00,130.81,164.81,196.00], // Am7
      [87.31,110.00,130.81,164.81],  // Fmaj7
      [98.00,123.47,146.83,196.00]   // G6
    ];
    this.bindUI();
    document.addEventListener('pointerdown', () => this.arm(), {once:false, passive:true});
    document.addEventListener('keydown', () => this.arm(), {once:false});
  }

  bindUI() {
    for (const id of ['musicStartButton','musicGameButton']) {
      $(id)?.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); this.toggle(); });
    }
    $('musicVolume')?.addEventListener('input', e => this.setVolume(Number(e.target.value) / 100));
    $('musicEnabled')?.addEventListener('change', e => this.setEnabled(e.target.checked));
    $('musicSettingsButton')?.addEventListener('click', () => $('musicModal')?.classList.remove('hidden'));
    $('closeMusic')?.addEventListener('click', () => $('musicModal')?.classList.add('hidden'));
    $('musicModal')?.addEventListener('click', e => { if (e.target === $('musicModal')) $('musicModal').classList.add('hidden'); });
    this.refreshUI();
  }

  refreshUI() {
    const glyph = this.enabled ? '♫' : '♪';
    for (const id of ['musicStartButton','musicGameButton']) {
      const b = $(id); if (!b) continue;
      b.textContent = glyph;
      b.title = this.enabled ? 'Couper la musique' : 'Activer la musique chill';
      b.setAttribute('aria-label', b.title);
      b.classList.toggle('musicMuted', !this.enabled);
    }
    if ($('musicEnabled')) $('musicEnabled').checked = this.enabled;
    if ($('musicVolume')) $('musicVolume').value = String(Math.round(this.volume * 100));
    if ($('musicVolumeLabel')) $('musicVolumeLabel').textContent = `${Math.round(this.volume * 100)} %`;
  }

  arm() {
    if (!this.enabled) return;
    if (!this.ctx) this.initAudio();
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    if (this.ctx && !this.started) this.start();
  }

  initAudio() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 2400;
    this.filter.Q.value = 0.45;
    this.delay = this.ctx.createDelay(1.5);
    this.delay.delayTime.value = 0.31;
    this.feedback = this.ctx.createGain();
    this.feedback.gain.value = 0.16;
    this.delay.connect(this.feedback); this.feedback.connect(this.delay);
    this.filter.connect(this.master);
    this.filter.connect(this.delay); this.delay.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime, 0.4);
  }

  start() {
    if (!this.ctx || this.started) return;
    this.started = true;
    this.nextBar = this.ctx.currentTime + 0.15;
    this.barIndex = 0;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 250);
  }

  schedule() {
    if (!this.ctx || !this.started) return;
    const horizon = this.ctx.currentTime + 1.5;
    while (this.nextBar < horizon) {
      this.scheduleBar(this.nextBar, this.barIndex++);
      this.nextBar += 6.4;
    }
  }

  scheduleBar(time, index) {
    const chord = this.progression[index % this.progression.length];
    chord.forEach((freq, i) => this.padVoice(freq, time, 6.2, i));
    const roots = [65.41,55.00,43.65,49.00];
    this.bassVoice(roots[index % roots.length], time + 0.05, 2.4);
    this.bassVoice(roots[index % roots.length], time + 3.2, 2.2);
    for (let beat = 0; beat < 8; beat++) {
      const t = time + beat * 0.8;
      if (beat % 2 === 0) this.softTick(t, 0.025);
      if (beat === 2 || beat === 6) this.melodyVoice(chord[(index + beat) % chord.length] * 2, t + 0.18, 0.95);
    }
  }

  padVoice(freq, time, duration, index) {
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    o1.type = index % 2 ? 'sine' : 'triangle';
    o2.type = 'sine';
    o1.frequency.value = freq;
    o2.frequency.value = freq * 1.0025;
    lp.type = 'lowpass'; lp.frequency.value = 1150 + index * 180; lp.Q.value = 0.25;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.038 / (1 + index * .12), time + 0.9);
    g.gain.setValueAtTime(0.032 / (1 + index * .12), time + Math.max(1.0, duration - 1.4));
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.filter);
    o1.start(time); o2.start(time); o1.stop(time + duration + .1); o2.stop(time + duration + .1);
  }

  bassVoice(freq, time, duration) {
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.055, time + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    o.connect(g); g.connect(this.filter); o.start(time); o.stop(time + duration + .05);
  }

  melodyVoice(freq, time, duration) {
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq, time);
    o.frequency.exponentialRampToValueAtTime(freq * 0.998, time + duration);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.022, time + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    o.connect(g); g.connect(this.delay); g.connect(this.filter); o.start(time); o.stop(time + duration + .05);
  }

  softTick(time, level) {
    const length = Math.floor(this.ctx.sampleRate * 0.045);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<length;i++) data[i] = (Math.random()*2-1) * Math.exp(-i/(length*.18));
    const src = this.ctx.createBufferSource(); const hp = this.ctx.createBiquadFilter(); const g = this.ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 4200; g.gain.value = level;
    src.buffer = buffer; src.connect(hp); hp.connect(g); g.connect(this.master); src.start(time);
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    localStorage.setItem(VOLUME_KEY, String(this.volume));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime, 0.25);
    this.refreshUI();
  }

  setEnabled(value) {
    this.enabled = !!value;
    localStorage.setItem(ENABLED_KEY, String(this.enabled));
    if (this.enabled) this.arm();
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime, 0.25);
    this.refreshUI();
  }

  toggle() { this.setEnabled(!this.enabled); }
}

window.guessrMusic = new ChillMusic();
})();
