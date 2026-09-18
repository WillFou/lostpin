(() => {
'use strict';

const $ = id => document.getElementById(id);
const ZONE_IDS = ['paris','paris13','parisGroup','bagneux','washington','france','world'];
const MODE_IDS = ['explore','nomove','nmpz'];
const TIMER_VALUES = [0,15,20,30,60,120,180];
const ROUND_VALUES = [3,5,10];
const SHARE_PREFIX = 'LP5.';
const HISTORY_KEY = 'lostpin-challenges-v1';
const SHORT_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function modeLabel(mode) {
  return mode === 'nomove' ? 'No Move' : mode === 'nmpz' ? 'No Move + No Pan/Zoom' : 'Move';
}
function timerLabel(seconds) { return Number(seconds) > 0 ? `${Number(seconds)} s` : 'sans limite'; }
function bytesToBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary='';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function base64UrlToText(value) {
  let base64=String(value).replace(/-/g,'+').replace(/_/g,'/');
  while (base64.length % 4) base64 += '=';
  const binary=atob(base64);
  const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function fingerprint(text) {
  let hash=2166136261 >>> 0;
  for (let i=0;i<text.length;i++) { hash ^= text.charCodeAt(i); hash=Math.imul(hash,16777619)>>>0; }
  let out='';
  for (let i=0;i<5;i++) { out += SHORT_ALPHABET[hash & 31]; hash=(hash>>>5) ^ Math.imul(hash,0x45d9f3b); }
  return out;
}
function normalizeCode(value) {
  const raw=String(value||'').trim();
  const marker=raw.toUpperCase().indexOf('LP5.');
  return marker>=0 ? raw.slice(marker).split(/[\s#?&]/)[0] : raw;
}

class ChallengeController {
  constructor(game, api) {
    this.game=game;
    this.api=api;
    this.current=null;
    this.generated=null;
    this.timerInterval=null;
    this.deadline=0;
    this.lastSecond=null;
    this.generating=false;
    this.bindUI();
    this.wrapGame();
    this.renderHistory();
    this.consumeHashChallenge();
  }

  bindUI() {
    $('challengeButton')?.addEventListener('click',()=>this.open());
    $('closeChallenge')?.addEventListener('click',()=>this.close());
    $('challengeModal')?.addEventListener('click',e=>{ if (e.target===$('challengeModal') && !this.generating) this.close(); });
    $('createChallenge')?.addEventListener('click',()=>this.create());
    $('copyChallengeCode')?.addEventListener('click',()=>this.copyGenerated());
    $('playCreatedChallenge')?.addEventListener('click',()=>this.playDescriptor(this.generated));
    $('loadChallenge')?.addEventListener('click',()=>this.loadFromInput());
    $('playLoadedChallenge')?.addEventListener('click',()=>this.playDescriptor(this.loaded));
    $('challengeCodeInput')?.addEventListener('input',()=>this.clearLoadedPreview());
  }

  wrapGame() {
    const originalSubmit=this.game.submitGuess.bind(this.game);
    this.game.submitGuess=()=>{
      if (this.current) this.stopTimer();
      return originalSubmit();
    };
    const originalShowMenu=this.game.showMenu.bind(this.game);
    this.game.showMenu=()=>{
      this.stopTimer(true);
      this.current=null;
      this.game.challengeConfig=null;
      $('challengeEndSummary')?.classList.add('hidden');
      return originalShowMenu();
    };
    const originalEnd=this.game.endGame.bind(this.game);
    this.game.endGame=()=>{
      this.stopTimer(true);
      const result=originalEnd();
      if (this.current) this.showEndSummary();
      return result;
    };
  }

  open() {
    this.refreshCreateSummary();
    $('challengeModal')?.classList.remove('hidden');
  }
  close() { if (!this.generating) $('challengeModal')?.classList.add('hidden'); }

  refreshCreateSummary() {
    const zone=this.api.ZONES[this.game.zoneId];
    const box=$('challengeCurrentSettings');
    if (box) box.textContent=`${zone?.name || this.game.zoneId} · ${modeLabel(this.game.mode)}`;
  }

  async create() {
    if (this.generating || !this.game.apiReady) return;
    const zoneId=this.game.zoneId;
    const mode=this.game.mode;
    const timerSeconds=Number($('challengeTimer')?.value||0);
    const roundCount=Number($('challengeRounds')?.value||5);
    if (!TIMER_VALUES.includes(timerSeconds) || !ROUND_VALUES.includes(roundCount)) return;
    this.generating=true;
    this.setGenerateState(true,`Préparation de ${roundCount} panoramas…`);
    const previousMode=this.game.mode;
    const previousAvoid=this.game.avoidPoint;
    try {
      if (this.api.ZONES[zoneId]?.officialParis && !this.game.parisContoursReady) await this.game.prepareSelectedZone();
      this.game.ensureGoogleObjects();
      this.game.mode=mode;
      const zone=this.api.ZONES[zoneId];
      const token=++this.game.currentRoundToken;
      const rounds=[];
      const used=new Set();
      this.game.avoidPoint=null;
      for (let i=0;i<roundCount;i++) {
        this.setGenerateState(true,`Panorama ${i+1}/${roundCount} · ${zone.name}`);
        let start=null;
        for (let retry=0;retry<5;retry++) {
          start=await this.game.findStart(zone,token);
          const pano=start?.data?.location?.pano;
          if (pano && !used.has(pano)) break;
          this.game.avoidPoint=start?.pos || null;
          start=null;
        }
        if (!start?.data?.location?.pano) throw new Error('Impossible de générer des panoramas distincts pour ce challenge.');
        const pano=start.data.location.pano;
        used.add(pano);
        rounds.push({pano,heading:Math.floor(Math.random()*360)});
        this.game.rememberStart(start.pos);
        this.game.avoidPoint=start.pos;
      }
      const payload={v:1,z:ZONE_IDS.indexOf(zoneId),m:MODE_IDS.indexOf(mode),t:timerSeconds,n:roundCount,r:rounds.map(x=>[x.pano,x.heading])};
      const tokenValue=SHARE_PREFIX+bytesToBase64Url(JSON.stringify(payload));
      const descriptor=this.decode(tokenValue);
      this.generated=descriptor;
      this.renderCreated(descriptor);
      this.saveHistory(descriptor);
      this.setGenerateState(false,'Challenge prêt.');
    } catch (error) {
      this.setGenerateState(false,`Erreur : ${error.message}`,true);
    } finally {
      this.game.mode=previousMode;
      this.game.avoidPoint=previousAvoid;
      this.generating=false;
    }
  }

  decode(value) {
    const code=normalizeCode(value);
    if (!code.startsWith(SHARE_PREFIX)) throw new Error('Code de challenge non reconnu.');
    let data;
    try { data=JSON.parse(base64UrlToText(code.slice(SHARE_PREFIX.length))); }
    catch (_) { throw new Error('Code de challenge invalide ou incomplet.'); }
    if (data?.v!==1) throw new Error('Version de challenge non prise en charge.');
    const zoneId=ZONE_IDS[Number(data.z)], mode=MODE_IDS[Number(data.m)];
    const timerSeconds=Number(data.t), roundCount=Number(data.n);
    if (!zoneId || !this.api.ZONES[zoneId] || !mode || !TIMER_VALUES.includes(timerSeconds) || !ROUND_VALUES.includes(roundCount)) throw new Error('Réglages du challenge invalides.');
    if (!Array.isArray(data.r) || data.r.length!==roundCount) throw new Error('Nombre de manches incohérent.');
    const rounds=data.r.map(item=>({pano:String(item?.[0]||''),heading:Number(item?.[1])}));
    if (rounds.some(x=>!x.pano || !Number.isFinite(x.heading))) throw new Error('Panoramas du challenge invalides.');
    return {code,id:fingerprint(code),zoneId,mode,timerSeconds,roundCount,rounds};
  }

  renderCreated(descriptor) {
    $('challengeCreated')?.classList.remove('hidden');
    if ($('challengeCreatedId')) $('challengeCreatedId').textContent=descriptor.id;
    if ($('challengeCreatedSummary')) $('challengeCreatedSummary').textContent=this.summary(descriptor);
    if ($('challengeCreatedCode')) $('challengeCreatedCode').value=descriptor.code;
  }

  clearLoadedPreview() {
    this.loaded=null;
    $('challengeLoaded')?.classList.add('hidden');
    $('challengeJoinError')?.classList.add('hidden');
  }

  loadFromInput() {
    this.clearLoadedPreview();
    try {
      const descriptor=this.decode($('challengeCodeInput')?.value||'');
      this.loaded=descriptor;
      if ($('challengeLoadedId')) $('challengeLoadedId').textContent=descriptor.id;
      if ($('challengeLoadedSummary')) $('challengeLoadedSummary').textContent=this.summary(descriptor);
      $('challengeLoaded')?.classList.remove('hidden');
      this.saveHistory(descriptor);
    } catch (error) {
      const el=$('challengeJoinError'); if (el) { el.textContent=error.message; el.classList.remove('hidden'); }
    }
  }

  summary(descriptor) {
    const zone=this.api.ZONES[descriptor.zoneId]?.name || descriptor.zoneId;
    return `${zone} · ${modeLabel(descriptor.mode)} · ${descriptor.roundCount} manches · ${timerLabel(descriptor.timerSeconds)}`;
  }

  playDescriptor(descriptor) {
    if (!descriptor) return;
    this.stopTimer(true);
    this.current=descriptor;
    this.game.challengeConfig={...descriptor,rounds:descriptor.rounds.map(x=>({...x}))};
    this.game.zoneId=descriptor.zoneId;
    this.game.mode=descriptor.mode;
    document.querySelectorAll('.mapCard').forEach(x=>x.classList.toggle('selected',x.dataset.zone===descriptor.zoneId));
    document.querySelectorAll('.modeCard').forEach(x=>x.classList.toggle('selected',x.dataset.mode===descriptor.mode));
    $('challengeModal')?.classList.add('hidden');
    $('gameScreen')?.classList.add('challenge-active');
    this.game.startGame();
  }

  onRoundReady() {
    if (!this.current) return;
    $('gameScreen')?.classList.add('challenge-active');
    if (this.current.timerSeconds>0) this.startTimer(this.current.timerSeconds);
    else $('multiTimer')?.classList.add('hidden');
  }

  startTimer(seconds) {
    this.stopTimer(false);
    const box=$('multiTimer');
    if (!box) return;
    box.classList.remove('hidden','urgent','critical');
    this.deadline=Date.now()+seconds*1000;
    const tick=()=>{
      const remaining=Math.max(0,Math.ceil((this.deadline-Date.now())/1000));
      if (remaining!==this.lastSecond) {
        this.lastSecond=remaining;
        const mins=Math.floor(remaining/60), secs=remaining%60;
        if ($('multiTimerValue')) $('multiTimerValue').textContent=`${mins}:${String(secs).padStart(2,'0')}`;
        box.classList.toggle('urgent',remaining>0 && remaining<=20);
        box.classList.toggle('critical',remaining>0 && remaining<=5);
      }
      if (remaining<=0) {
        this.stopTimer(false);
        if (!$('resultPanel')?.classList.contains('hidden')) return;
        if (this.game.guess) this.game.submitGuess();
        else this.game.submitChallengeTimeout();
      }
    };
    tick();
    this.timerInterval=setInterval(tick,250);
  }

  stopTimer(hide=false) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval=null; this.deadline=0; this.lastSecond=null;
    const box=$('multiTimer');
    box?.classList.remove('urgent','critical');
    if (hide) box?.classList.add('hidden');
  }

  async copyGenerated() {
    if (!this.generated?.code) return;
    try { await navigator.clipboard.writeText(this.generated.code); this.game.showToast?.(`Challenge ${this.generated.id} copié.`,1800); }
    catch (_) { if ($('challengeCreatedCode')) { $('challengeCreatedCode').focus(); $('challengeCreatedCode').select(); } }
  }

  showEndSummary() {
    const box=$('challengeEndSummary');
    if (!box || !this.current) return;
    box.classList.remove('hidden');
    if ($('challengeEndId')) $('challengeEndId').textContent=this.current.id;
    if ($('challengeEndMeta')) $('challengeEndMeta').textContent=this.summary(this.current);
    if ($('challengeEndCode')) $('challengeEndCode').value=this.current.code;
  }

  setGenerateState(busy,text,isError=false) {
    const button=$('createChallenge'); if (button) button.disabled=busy;
    const status=$('challengeGenerateStatus');
    if (status) { status.textContent=text; status.classList.toggle('challengeError',!!isError); }
  }

  saveHistory(descriptor) {
    try {
      const list=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
      const next=[{id:descriptor.id,code:descriptor.code,summary:this.summary(descriptor),date:Date.now()},...list.filter(x=>x.code!==descriptor.code)].slice(0,6);
      localStorage.setItem(HISTORY_KEY,JSON.stringify(next));
      this.renderHistory();
    } catch (_) {}
  }

  renderHistory() {
    const box=$('challengeHistory'); if (!box) return;
    let list=[]; try { list=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]'); } catch (_) {}
    box.replaceChildren();
    if (!Array.isArray(list) || !list.length) { box.textContent='Aucun challenge récent.'; return; }
    list.slice(0,5).forEach(item=>{
      const button=document.createElement('button'); button.type='button'; button.className='challengeHistoryItem';
      button.innerHTML=`<b>${item.id}</b><span>${item.summary || ''}</span>`;
      button.addEventListener('click',()=>{ if ($('challengeCodeInput')) $('challengeCodeInput').value=item.code; this.loadFromInput(); });
      box.appendChild(button);
    });
  }

  consumeHashChallenge() {
    const hash=location.hash || '';
    const match=hash.match(/challenge=(LP5\.[A-Za-z0-9_-]+)/i);
    if (!match) return;
    if ($('challengeCodeInput')) $('challengeCodeInput').value=match[1];
    history.replaceState(null,'',location.pathname+location.search);
    setTimeout(()=>{this.open();this.loadFromInput();},50);
  }
}

function boot() {
  if (!window.guessrGame || !window.GUESSR_INTERNALS) return setTimeout(boot,50);
  window.lostPinChallenges=new ChallengeController(window.guessrGame,window.GUESSR_INTERNALS);
}
boot();
})();
