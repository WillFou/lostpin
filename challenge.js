(() => {
'use strict';

const $ = id => document.getElementById(id);
const LEGACY_ZONE_IDS = ['paris','paris13','parisGroup','bagneux','washington','france','world','europe','northAmerica','southAmerica','asia','africa','oceania'];
const MODE_IDS = ['explore','nomove','nmpz'];
const TIMER_VALUES = [0,15,20,30,60,120,180];
const ROUND_VALUES = [3,5,10];
const SHARE_PREFIX = 'LP5.';
const HISTORY_KEY = 'lostpin-challenges-v1';
const RESULT_HISTORY_KEY = 'lostpin-challenge-results-v1';
const RESULT_PREFIX = 'LPR1.';
const SHORT_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function modeLabel(mode) {
  return mode === 'nomove' ? 'No Move' : mode === 'nmpz' ? 'No Move + No Pan/Zoom' : 'Move';
}
function timerLabel(seconds) { return Number(seconds) > 0 ? `${Number(seconds)} s` : 'sans limite'; }
function esc(text) { return String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
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
    $('copyChallengeResult')?.addEventListener('click',()=>this.copyCurrentResult());
    $('copyChallengeAgain')?.addEventListener('click',()=>this.copyCurrentChallenge());
    $('compareChallengeResult')?.addEventListener('click',()=>this.compareReceivedResult());
    $('challengeResultInput')?.addEventListener('input',()=>this.clearCompareResult());
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
    const selection=this.game.getSelectionDescriptor?.() || {type:'zone',zoneId:this.game.zoneId};
    const selectionName=this.game.getSelectionName?.(selection) || this.api.ZONES[this.game.zoneId]?.name || this.game.zoneId;
    const box=$('challengeCurrentSettings');
    if (box) box.textContent=`${selection.type==='playlist'?'Playlist · ':''}${selectionName} · ${modeLabel(this.game.mode)}`;
  }

  async create() {
    if (this.generating || !this.game.apiReady) return;
    const selection=this.game.getSelectionDescriptor?.() || {type:'zone',zoneId:this.game.zoneId};
    const mode=this.game.mode;
    const timerSeconds=Number($('challengeTimer')?.value||0);
    const roundCount=Number($('challengeRounds')?.value||5);
    if (!TIMER_VALUES.includes(timerSeconds) || !ROUND_VALUES.includes(roundCount)) return;
    this.generating=true;
    this.setGenerateState(true,`Préparation de ${roundCount} panoramas…`);
    const previousMode=this.game.mode;
    const previousAvoid=this.game.avoidPoint;
    const previousZoneId=this.game.zoneId;
    try {
      this.game.ensureGoogleObjects();
      this.game.mode=mode;
      const sequence=this.game.buildRoundZoneSequence?.(roundCount,selection) || Array.from({length:roundCount},()=>selection.zoneId);
      const token=++this.game.currentRoundToken;
      const rounds=[];
      const used=new Set();
      this.game.avoidPoint=null;
      for (let i=0;i<roundCount;i++) {
        const zoneId=sequence[i];
        const zone=this.api.ZONES[zoneId];
        if (!zone) throw new Error('Une map de la playlist n’existe plus dans cette version de LostPin.');
        this.game.zoneId=zoneId;
        await this.game.prepareZone?.(zoneId);
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
        rounds.push({zoneId,pano,heading:Math.floor(Math.random()*360)});
        this.game.rememberStart(start.pos);
        this.game.avoidPoint=start.pos;
      }
      const selectionPayload=selection.type==='playlist'
        ? ['p',String(selection.id||'playlist'),String(selection.name||'Playlist').slice(0,48),selection.zoneIds.slice()]
        : ['z',selection.zoneId];
      // V3 stores stable textual zone IDs instead of indexes. This keeps new
      // Challenges valid when the geographic catalogue grows in later releases.
      const payload={v:3,s:selectionPayload,m:MODE_IDS.indexOf(mode),t:timerSeconds,n:roundCount,r:rounds.map(x=>[x.zoneId,x.pano,x.heading])};
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
      this.game.zoneId=previousZoneId;
      this.generating=false;
    }
  }

  decode(value) {
    const code=normalizeCode(value);
    if (!code.startsWith(SHARE_PREFIX)) throw new Error('Code de challenge non reconnu.');
    let data;
    try { data=JSON.parse(base64UrlToText(code.slice(SHARE_PREFIX.length))); }
    catch (_) { throw new Error('Code de challenge invalide ou incomplet.'); }
    const mode=MODE_IDS[Number(data?.m)], timerSeconds=Number(data?.t), roundCount=Number(data?.n);
    if (!mode || !TIMER_VALUES.includes(timerSeconds) || !ROUND_VALUES.includes(roundCount)) throw new Error('Réglages du challenge invalides.');

    if (data?.v===1) {
      const zoneId=LEGACY_ZONE_IDS[Number(data.z)];
      if (!zoneId || !this.api.ZONES[zoneId]) throw new Error('Map du challenge inconnue.');
      if (!Array.isArray(data.r) || data.r.length!==roundCount) throw new Error('Nombre de manches incohérent.');
      const rounds=data.r.map(item=>({zoneId,pano:String(item?.[0]||''),heading:Number(item?.[1])}));
      if (rounds.some(x=>!x.pano || !Number.isFinite(x.heading))) throw new Error('Panoramas du challenge invalides.');
      const selection={type:'zone',zoneId,name:this.api.ZONES[zoneId].name};
      return {code,id:fingerprint(code),selection,zoneId,mode,timerSeconds,roundCount,rounds};
    }

    if (data?.v===3) {
      if (!Array.isArray(data.s) || !Array.isArray(data.r) || data.r.length!==roundCount) throw new Error('Données du challenge incomplètes.');
      let selection;
      if (data.s[0]==='z') {
        const zoneId=String(data.s[1]||'');
        if (!zoneId || !this.api.ZONES[zoneId]) throw new Error('Map du challenge inconnue.');
        selection={type:'zone',zoneId,name:this.api.ZONES[zoneId].name};
      } else if (data.s[0]==='p') {
        const zoneIds=Array.from(new Set((Array.isArray(data.s[3])?data.s[3]:[]).map(id=>String(id||'')).filter(id=>!!this.api.ZONES[id])));
        if (zoneIds.length<2) throw new Error('Playlist du challenge invalide.');
        selection={type:'playlist',id:String(data.s[1]||'challenge-playlist').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,40)||'challenge-playlist',name:String(data.s[2]||'Playlist').trim().slice(0,48)||'Playlist',zoneIds};
      } else throw new Error('Sélection du challenge inconnue.');
      const rounds=data.r.map(item=>({zoneId:String(item?.[0]||''),pano:String(item?.[1]||''),heading:Number(item?.[2])}));
      if (rounds.some(x=>!x.zoneId || !this.api.ZONES[x.zoneId] || !x.pano || !Number.isFinite(x.heading))) throw new Error('Panoramas du challenge invalides.');
      if (selection.type==='zone' && rounds.some(x=>x.zoneId!==selection.zoneId)) throw new Error('Maps du challenge incohérentes.');
      if (selection.type==='playlist' && rounds.some(x=>!selection.zoneIds.includes(x.zoneId))) throw new Error('Une manche ne fait pas partie de la playlist annoncée.');
      const zoneId=rounds[0].zoneId;
      return {code,id:fingerprint(code),selection,zoneId,mode,timerSeconds,roundCount,rounds};
    }

    if (data?.v!==2) throw new Error('Version de challenge non prise en charge.');
    if (!Array.isArray(data.s) || !Array.isArray(data.r) || data.r.length!==roundCount) throw new Error('Données du challenge incomplètes.');
    let selection;
    if (data.s[0]==='z') {
      const zoneId=LEGACY_ZONE_IDS[Number(data.s[1])];
      if (!zoneId || !this.api.ZONES[zoneId]) throw new Error('Map du challenge inconnue.');
      selection={type:'zone',zoneId,name:this.api.ZONES[zoneId].name};
    } else if (data.s[0]==='p') {
      const zoneIds=Array.from(new Set((Array.isArray(data.s[3])?data.s[3]:[]).map(index=>LEGACY_ZONE_IDS[Number(index)]).filter(id=>!!this.api.ZONES[id])));
      if (zoneIds.length<2) throw new Error('Playlist du challenge invalide.');
      selection={type:'playlist',id:String(data.s[1]||'challenge-playlist').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,40)||'challenge-playlist',name:String(data.s[2]||'Playlist').trim().slice(0,48)||'Playlist',zoneIds};
    } else throw new Error('Sélection du challenge inconnue.');

    const rounds=data.r.map(item=>({zoneId:LEGACY_ZONE_IDS[Number(item?.[0])],pano:String(item?.[1]||''),heading:Number(item?.[2])}));
    if (rounds.some(x=>!x.zoneId || !this.api.ZONES[x.zoneId] || !x.pano || !Number.isFinite(x.heading))) throw new Error('Panoramas du challenge invalides.');
    if (selection.type==='zone' && rounds.some(x=>x.zoneId!==selection.zoneId)) throw new Error('Maps du challenge incohérentes.');
    if (selection.type==='playlist' && rounds.some(x=>!selection.zoneIds.includes(x.zoneId))) throw new Error('Une manche ne fait pas partie de la playlist annoncée.');
    const zoneId=rounds[0].zoneId;
    return {code,id:fingerprint(code),selection,zoneId,mode,timerSeconds,roundCount,rounds};
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
    const selection=descriptor.selection || {type:'zone',zoneId:descriptor.zoneId};
    const name=selection.type==='playlist' ? selection.name : (this.api.ZONES[selection.zoneId]?.name || selection.zoneId);
    return `${selection.type==='playlist'?'Playlist · ':''}${name} · ${modeLabel(descriptor.mode)} · ${descriptor.roundCount} manches · ${timerLabel(descriptor.timerSeconds)}`;
  }

  playDescriptor(descriptor) {
    if (!descriptor) return;
    this.stopTimer(true);
    this.current=descriptor;
    this.game.challengeConfig={...descriptor,selection:{...(descriptor.selection||{})},rounds:descriptor.rounds.map(x=>({...x}))};
    if (descriptor.selection) this.game.setSelection?.(descriptor.selection);
    this.game.setPlayType?.('guess',{silent:true});
    this.game.zoneId=descriptor.rounds?.[0]?.zoneId || descriptor.zoneId;
    this.game.mode=descriptor.mode;
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
    this.currentResult=this.buildResult();
    if (this.currentResult) {
      this.saveResult(this.currentResult);
      const distance=Number.isFinite(this.currentResult.d)?this.api.formatDistance(this.currentResult.d):'—';
      if ($('challengeEndResultStats')) $('challengeEndResultStats').textContent=`${this.currentResult.f} × 5 000 · distance moyenne ${distance}`;
      if ($('challengeEndResultCode')) $('challengeEndResultCode').value=this.encodeResult(this.currentResult);
    }
  }

  challengeSignature(code) {
    let hash=2166136261 >>> 0;
    const value=String(code||'');
    for (let i=0;i<value.length;i++) { hash ^= value.charCodeAt(i); hash=Math.imul(hash,16777619)>>>0; }
    return hash.toString(16).padStart(8,'0');
  }

  resultPlayerName() {
    try { return String(localStorage.getItem('lostpin-online-name') || 'Joueur').trim().slice(0,18) || 'Joueur'; }
    catch (_) { return 'Joueur'; }
  }

  buildResult() {
    if (!this.current) return null;
    const results=Array.isArray(this.game.results) ? this.game.results : [];
    const distances=results.map(x=>Number(x.distance)).filter(Number.isFinite);
    const avg=distances.length ? distances.reduce((s,x)=>s+x,0)/distances.length : null;
    const max=(this.current.roundCount||results.length||5)*5000;
    return {
      v:1,
      c:this.current.id,
      h:this.challengeSignature(this.current.code),
      n:this.resultPlayerName(),
      s:Number(this.game.total||0),
      x:max,
      f:results.filter(x=>Number(x.points)===5000).length,
      d:Number.isFinite(avg)?Math.round(avg*10)/10:null,
      r:results.map(x=>Number(x.points)||0),
      ts:Date.now()
    };
  }

  encodeResult(result) {
    return RESULT_PREFIX+bytesToBase64Url(JSON.stringify(result));
  }

  decodeResult(value) {
    const raw=String(value||'').trim();
    const marker=raw.toUpperCase().indexOf(RESULT_PREFIX);
    const token=marker>=0 ? raw.slice(marker).split(/[\s#?&]/)[0] : raw;
    if (!token.startsWith(RESULT_PREFIX)) throw new Error('Code résultat non reconnu.');
    let data;
    try { data=JSON.parse(base64UrlToText(token.slice(RESULT_PREFIX.length))); }
    catch (_) { throw new Error('Code résultat invalide ou incomplet.'); }
    if (data?.v!==1 || !data.c || !data.h || !Number.isFinite(Number(data.s)) || !Number.isFinite(Number(data.x))) throw new Error('Données de résultat invalides.');
    return {...data,s:Number(data.s),x:Number(data.x),f:Number(data.f||0),d:data.d==null?null:Number(data.d),r:Array.isArray(data.r)?data.r.map(Number):[]};
  }

  resultSummaryText(result) {
    const distance=Number.isFinite(result.d) ? this.api.formatDistance(result.d) : '—';
    return `LostPin — Challenge ${result.c}\n${result.n} : ${result.s.toLocaleString('fr-FR')} / ${result.x.toLocaleString('fr-FR')} pts\n${result.f} × 5 000 · distance moyenne ${distance}\nCode résultat : ${this.encodeResult(result)}`;
  }

  saveResult(result) {
    try {
      const list=JSON.parse(localStorage.getItem(RESULT_HISTORY_KEY)||'[]');
      const next=[result,...(Array.isArray(list)?list:[])].slice(0,40);
      localStorage.setItem(RESULT_HISTORY_KEY,JSON.stringify(next));
    } catch (_) {}
  }

  bestLocalResult(signature) {
    try {
      const list=JSON.parse(localStorage.getItem(RESULT_HISTORY_KEY)||'[]');
      return (Array.isArray(list)?list:[]).filter(x=>x?.h===signature).sort((a,b)=>Number(b.s||0)-Number(a.s||0))[0] || null;
    } catch (_) { return null; }
  }

  async copyCurrentResult() {
    if (!this.currentResult) return;
    const text=this.resultSummaryText(this.currentResult);
    try { await navigator.clipboard.writeText(text); this.game.showToast?.('Résultat du challenge copié.',1800); }
    catch (_) { if ($('challengeEndResultCode')) { $('challengeEndResultCode').focus(); $('challengeEndResultCode').select(); } }
  }

  async copyCurrentChallenge() {
    if (!this.current?.code) return;
    try { await navigator.clipboard.writeText(this.current.code); this.game.showToast?.(`Challenge ${this.current.id} copié.`,1800); }
    catch (_) {}
  }

  clearCompareResult() {
    $('challengeCompareError')?.classList.add('hidden');
    $('challengeCompareResult')?.classList.add('hidden');
  }

  compareReceivedResult() {
    this.clearCompareResult();
    try {
      const received=this.decodeResult($('challengeResultInput')?.value||'');
      const local=this.bestLocalResult(received.h);
      const box=$('challengeCompareResult'); if (!box) return;
      const distance=Number.isFinite(received.d)?this.api.formatDistance(received.d):'—';
      let html=`<div class="challengeComparePlayer"><b>${esc(received.n||'Joueur')}</b><strong>${received.s.toLocaleString('fr-FR')} / ${received.x.toLocaleString('fr-FR')} pts</strong><small>${received.f} × 5 000 · moyenne ${distance}</small></div>`;
      if (local) {
        const delta=Number(local.s||0)-received.s;
        const sign=delta>0?'+':'';
        const localDistance=Number.isFinite(Number(local.d))?this.api.formatDistance(Number(local.d)):'—';
        html+=`<div class="challengeCompareVs">Ton meilleur résultat : <b>${Number(local.s||0).toLocaleString('fr-FR')} pts</b> · ${Number(local.f||0)} × 5 000 · moyenne ${localDistance}<strong class="${delta>=0?'positive':'negative'}">${sign}${delta.toLocaleString('fr-FR')} pts</strong></div>`;
      } else html+=`<div class="challengeCompareVs">Tu n'as pas encore de résultat local enregistré pour ce challenge.</div>`;
      box.innerHTML=`<div class="eyebrow">CHALLENGE ${esc(received.c)}</div>${html}`;
      box.classList.remove('hidden');
    } catch (error) {
      const el=$('challengeCompareError'); if (el) { el.textContent=error.message; el.classList.remove('hidden'); }
    }
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
