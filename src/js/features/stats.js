(() => {
'use strict';

const $ = id => document.getElementById(id);
const STATS_KEY = 'lostpin-stats-v1';
const LEGACY_BEST_KEY = 'guessr360-v3-best';
const LEGACY_PERFECT_KEY = 'guessr360-v36-perfects';
const ONLINE_HISTORY_KEY = 'lostpin-online-history-v1';
const MAX_GAMES = 120;
const MAX_ROUNDS = 600;

function readJSON(key, fallback) {
  try { const value=JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
  catch (_) { return fallback; }
}
function writeJSON(key, value) { try { localStorage.setItem(key,JSON.stringify(value)); } catch (_) {} }
function esc(text) { return String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function modeLabel(mode){ return mode==='exploration'?'Exploration':mode==='nomove'?'No Move':mode==='nmpz'?'No Move + No Pan/Zoom':'Move'; }
function variantLabel(value){ return value==='blitz'?'Blitz':value==='precision'?'Précision':'Classique'; }
function normalizeVariant(value){ return ['classic','blitz','precision'].includes(value)?value:'classic'; }
function parseRecordKey(key){
  const parts=String(key||'').split(':');
  if(parts.length<2) return null;
  const maybeVariant=parts[parts.length-1];
  const hasVariant=['blitz','precision','classic'].includes(maybeVariant) && parts.length>=3;
  const variant=hasVariant?normalizeVariant(maybeVariant):'classic';
  const mode=parts[parts.length-(hasVariant?2:1)];
  const zoneId=parts.slice(0,parts.length-(hasVariant?2:1)).join(':');
  return zoneId&&mode?{zoneId,mode,variant}:null;
}
function localDay(dateValue=Date.now()) {
  const d=new Date(dateValue); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function dayNumber(day){ const [y,m,d]=day.split('-').map(Number); return Math.floor(Date.UTC(y,m-1,d)/86400000); }
function formatDistance(meters){
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters/1000).toFixed(meters<10000?1:0).replace('.',',')} km`;
}
function formatDate(iso){
  try { return new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(iso)); }
  catch (_) { return ''; }
}

class StatsController {
  constructor(game, api){
    this.game=game; this.api=api;
    this.data=this.load();
    this.bindUI();
    this.wrapGame();
  }

  empty(){
    return {v:1,createdAt:new Date().toISOString(),games:[],rounds:[],days:{},records:{},legacyImported:false};
  }

  load(){
    const value=readJSON(STATS_KEY,null);
    const data=value && value.v===1 ? value : this.empty();
    data.games=Array.isArray(data.games)?data.games:[];
    data.rounds=Array.isArray(data.rounds)?data.rounds:[];
    data.days=data.days && typeof data.days==='object'?data.days:{};
    data.records=data.records && typeof data.records==='object'?data.records:{};
    if (!data.legacyImported) this.importLegacy(data);
    return data;
  }

  importLegacy(data){
    const bests=readJSON(LEGACY_BEST_KEY,{});
    const perfects=readJSON(LEGACY_PERFECT_KEY,{});
    for (const [key,score] of Object.entries(bests||{})) {
      const n=Number(score)||0; if (!n) continue;
      const rec=data.records[key]||{};
      const legacyPerfect=Number(perfects?.[key]?.count)||0;
      if (n<=25000) rec.best5=Math.max(Number(rec.best5)||0,n);
      else if (legacyPerfect>0) rec.best5=Math.max(Number(rec.best5)||0,25000);
      rec.legacyBest=true;
      data.records[key]=rec;
    }
    for (const [key,info] of Object.entries(perfects||{})) {
      const rec=data.records[key]||{};
      rec.perfect5=Math.max(Number(rec.perfect5)||0,Number(info?.count)||0);
      if (Number.isFinite(Number(info?.bestAvg))) rec.bestPerfectAvg=Number(info.bestAvg);
      rec.legacyPerfect=true;
      data.records[key]=rec;
    }
    data.legacyImported=true;
    writeJSON(STATS_KEY,data);
  }

  bindUI(){
    $('statsButton')?.addEventListener('click',()=>this.open());
    $('closeStats')?.addEventListener('click',()=>this.close());
    $('resetStats')?.addEventListener('click',()=>this.reset());
    window.addEventListener('keydown',e=>{ if(e.key==='Escape' && !$('statsModal')?.classList.contains('hidden')) this.close(); });
  }

  wrapGame(){
    const originalEnd=this.game.endGame.bind(this.game);
    this.game.endGame=()=>{
      const snapshot=this.snapshotCurrentGame();
      const result=originalEnd();
      this.record(snapshot);
      return result;
    };
  }

  snapshotCurrentGame(){
    const selection=this.game.getSelectionDescriptor?.() || {type:'zone',zoneId:this.game.zoneId};
    const selectionKey=this.game.getSelectionKey?.(selection) || selection.zoneId || this.game.zoneId;
    const selectionName=this.game.getSelectionName?.(selection) || this.api.ZONES?.[selection.zoneId]?.name || selectionKey || 'Map';
    const challenge=window.lostPinChallenges?.current || this.game.challengeConfig || null;
    const results=Array.isArray(this.game.results)?this.game.results.map(r=>({...r})):[];
    return {
      id:`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
      date:new Date().toISOString(),
      zoneId:selectionKey,
      zoneName:selectionName,
      selectionType:selection.type==='playlist'?'playlist':'zone',
      playlistId:selection.type==='playlist'?selection.id:null,
      mode:this.game.playType==='exploration'?'exploration':this.game.mode,
      variant:this.game.playType==='exploration'?'classic':normalizeVariant(this.game.gameVariant),
      score:Number(this.game.total)||0,
      roundCount:Number(this.game.roundCount)||results.length||5,
      challengeId:challenge?.id||null,
      results
    };
  }

  record(game){
    if (!game || !game.results?.length) return;
    const maxScore=game.roundCount*5000;
    const distances=game.mode==='exploration'?[]:game.results.map(r=>Number(r.distance)).filter(Number.isFinite);
    const perfectRounds=game.results.filter(r=>Number(r.points)===5000).length;
    const averageDistance=distances.length?distances.reduce((s,x)=>s+x,0)/distances.length:null;
    const summary={
      id:game.id,date:game.date,zoneId:game.zoneId,zoneName:game.zoneName,selectionType:game.selectionType||'zone',playlistId:game.playlistId||null,mode:game.mode,variant:normalizeVariant(game.variant),
      score:game.score,maxScore,roundCount:game.roundCount,perfectRounds,
      averageDistance,challengeId:game.challengeId||null
    };
    this.data.games.unshift(summary);
    this.data.games=this.data.games.slice(0,MAX_GAMES);
    const roundRows=game.results.map((r,i)=>({
      date:game.date,gameId:game.id,round:i+1,zoneId:r.zoneId||game.zoneId,zoneName:r.zoneName||this.api.ZONES?.[r.zoneId]?.name||game.zoneName,selectionType:game.selectionType||'zone',mode:game.mode,variant:normalizeVariant(game.variant),
      points:Number(r.points)||0,distance:Number.isFinite(Number(r.distance))?Number(r.distance):null,
      challenge:!!game.challengeId,timedOut:!!r.timedOut
    }));
    this.data.rounds=[...roundRows.reverse(),...this.data.rounds].slice(0,MAX_ROUNDS);
    const day=localDay(game.date); this.data.days[day]=(Number(this.data.days[day])||0)+1;
    this.trimDays();

    const variant=normalizeVariant(game.variant);
    const key=variant==='classic'?`${game.zoneId}:${game.mode}`:`${game.zoneId}:${game.mode}:${variant}`;
    const rec=this.data.records[key]||{};
    rec.games=(Number(rec.games)||0)+1;
    rec.selectionName=game.zoneName;
    rec.selectionType=game.selectionType||'zone';
    rec.variant=variant;
    if (game.mode==='exploration' && game.roundCount===3) rec.best3=Math.max(Number(rec.best3)||0,game.score);
    if (game.mode!=='exploration' && game.roundCount===5) {
      rec.best5=Math.max(Number(rec.best5)||0,game.score);
      if (game.score===25000 && perfectRounds===5) rec.perfect5=Math.max(Number(rec.perfect5)||0,0)+1;
    }
    if (Number.isFinite(averageDistance)) {
      rec.bestAvg=Number.isFinite(Number(rec.bestAvg))?Math.min(Number(rec.bestAvg),averageDistance):averageDistance;
    }
    this.data.records[key]=rec;
    writeJSON(STATS_KEY,this.data);
  }

  trimDays(){
    const entries=Object.entries(this.data.days).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,400);
    this.data.days=Object.fromEntries(entries);
  }

  open(){ this.render(); $('statsModal')?.classList.remove('hidden'); }
  close(){ $('statsModal')?.classList.add('hidden'); }

  reset(){
    if (!window.confirm('Réinitialiser toutes les statistiques détaillées LostPin ? Les anciens records historiques seront réimportés.')) return;
    try { localStorage.removeItem(STATS_KEY); } catch (_) {}
    this.data=this.load(); this.render();
    this.game.showToast?.('Statistiques réinitialisées.',1800);
  }

  allPerfectRoundCount(){ return this.data.rounds.filter(r=>r.mode!=='exploration'&&r.points===5000).length; }
  fiveRoundPerfectCount(){ return Object.values(this.data.records).reduce((sum,r)=>sum+(Number(r?.perfect5)||0),0); }
  challengeGameCount(){ return this.data.games.filter(g=>!!g.challengeId).length; }
  explorationGameCount(){ return this.data.games.filter(g=>g.mode==='exploration').length; }
  playlistGameCount(){ return this.data.games.filter(g=>g.selectionType==='playlist' || String(g.zoneId||'').startsWith('playlist-')).length; }
  favoriteZone(){
    const counts=new Map();
    this.data.games.forEach(g=>{ const current=counts.get(g.zoneId)||{count:0,name:g.zoneName||this.api.ZONES?.[g.zoneId]?.name||g.zoneId}; current.count++; if(g.zoneName) current.name=g.zoneName; counts.set(g.zoneId,current); });
    const top=[...counts.entries()].sort((a,b)=>b[1].count-a[1].count)[0];
    return top?{id:top[0],count:top[1].count,name:top[1].name}:null;
  }
  favoriteMode(){ const counts=new Map(); this.data.games.forEach(g=>counts.set(g.mode,(counts.get(g.mode)||0)+1)); const top=[...counts].sort((a,b)=>b[1]-a[1])[0]; return top?{mode:top[0],count:top[1]}:null; }
  avgDistance(){ const xs=this.data.rounds.map(r=>r.distance).filter(Number.isFinite); return xs.length?xs.reduce((s,x)=>s+x,0)/xs.length:null; }
  currentStreak(){
    const days=new Set(Object.keys(this.data.days).filter(d=>Number(this.data.days[d])>0));
    if (!days.size) return 0;
    let cursor=dayNumber(localDay());
    if (!days.has(localDay())) cursor-=1;
    let count=0;
    while (days.has(this.dayFromNumber(cursor))) { count++; cursor--; }
    return count;
  }
  bestStreak(){
    const values=Object.keys(this.data.days).filter(d=>Number(this.data.days[d])>0).map(dayNumber).sort((a,b)=>a-b);
    if(!values.length) return 0;
    let best=1,run=1;
    for(let i=1;i<values.length;i++){ if(values[i]===values[i-1]+1){run++;best=Math.max(best,run);} else if(values[i]!==values[i-1]) run=1; }
    return best;
  }
  dayFromNumber(n){ const d=new Date(n*86400000); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`; }

  recentAccuracy(count){
    const rows=this.data.rounds.filter(r=>r.mode!=='exploration' && normalizeVariant(r.variant)!=='precision').slice(0,count); if(!rows.length) return null;
    const avg=rows.reduce((s,r)=>s+r.points,0)/rows.length;
    return {count:rows.length,avg,percent:avg/5000*100};
  }

  render(){
    this.renderOverview(); this.renderAccuracy(); this.renderRecords(); this.renderBadges(); this.renderHistory();
    const note=$('statsMigrationNote');
    if(note) note.textContent='Les records antérieurs disponibles ont été conservés ; l’historique détaillé commence à partir de l’activation du suivi statistique.';
  }

  renderOverview(){
    const box=$('statsOverview'); if(!box) return;
    const games=this.data.games.length, rounds=this.data.rounds.length, fives=this.allPerfectRoundCount(), perfects=this.fiveRoundPerfectCount();
    const distance=this.avgDistance(), streak=this.currentStreak(), bestStreak=this.bestStreak();
    const favoriteZone=this.favoriteZone(), favoriteMode=this.favoriteMode();
    const items=[
      ['Parties suivies',games.toLocaleString('fr-FR'),'Solo + Challenges suivis'],
      ['Manches',rounds.toLocaleString('fr-FR'),'Historique récent'],
      ['5 000',fives.toLocaleString('fr-FR'),'Manches parfaites suivies'],
      ['25 000',perfects.toLocaleString('fr-FR'),'Historique disponible inclus'],
      ['Distance moyenne',formatDistance(distance),'Réponses mesurées'],
      ['Série',`${streak} j`,bestStreak?`record ${bestStreak} j`:'Aucune série'],
      ['Challenges',this.challengeGameCount().toLocaleString('fr-FR'),'Terminés et suivis'],
      ['Explorations',this.explorationGameCount().toLocaleString('fr-FR'),'Parties Exploration terminées'],
      ['Sélection favorite',favoriteZone?.name||'—',favoriteZone?`${favoriteZone.count} partie${favoriteZone.count>1?'s':''}`:'Pas encore de partie'],
      ['Mode favori',favoriteMode?modeLabel(favoriteMode.mode):'—',favoriteMode?`${favoriteMode.count} partie${favoriteMode.count>1?'s':''}`:'Pas encore de partie']
    ];
    box.innerHTML=items.map(([label,value,small])=>`<article class="statsMetric"><small>${esc(label)}</small><b>${esc(value)}</b><span>${esc(small)}</span></article>`).join('');
  }

  renderAccuracy(){
    const box=$('statsRecentAccuracy'); if(!box) return;
    box.replaceChildren();
    [10,50,100].forEach(n=>{
      const stat=this.recentAccuracy(n); const card=document.createElement('article'); card.className='statsAccuracyCard';
      if(!stat){ card.innerHTML=`<small>${n} dernières</small><b>—</b><span>Joue quelques manches</span><i style="--accuracy:0%"></i>`; }
      else {
        const pct=clamp(stat.percent,0,100);
        card.innerHTML=`<small>${n} dernières</small><b>${Math.round(stat.avg).toLocaleString('fr-FR')} <em>/ 5 000</em></b><span>${pct.toFixed(1).replace('.',',')} % · ${stat.count} manche${stat.count>1?'s':''}</span><i style="--accuracy:${pct}%"></i>`;
      }
      box.appendChild(card);
    });
  }

  renderRecords(){
    const box=$('statsRecords'); if(!box) return;
    const rows=[];
    for(const [key,rec] of Object.entries(this.data.records)){
      const parsed=parseRecordKey(key); if(!parsed) continue;
      const {zoneId,mode}=parsed, variant=normalizeVariant(rec.variant||parsed.variant);
      const best=mode==='exploration'?(Number(rec.best3)||0):(Number(rec.best5)||0); if(!best && !rec.games) continue;
      rows.push({zoneId,mode,variant,best,perfect:mode==='exploration'?null:(Number(rec.perfect5)||0),games:Number(rec.games)||0,legacy:!!rec.legacyBest,selectionName:rec.selectionName||null,selectionType:rec.selectionType||'zone'});
    }
    rows.sort((a,b)=>b.best-a.best || (a.selectionName||this.api.ZONES?.[a.zoneId]?.name||a.zoneId).localeCompare(b.selectionName||this.api.ZONES?.[b.zoneId]?.name||b.zoneId));
    if(!rows.length){ box.innerHTML='<div class="statsEmpty">Aucun record pour le moment.</div>'; return; }
    box.innerHTML=`<div class="statsRecordHeader"><span>Sélection / mode</span><span>Meilleur</span><span>Parties</span><span>25 000</span></div>`+rows.map(r=>{
      const zone=r.selectionName||this.api.ZONES?.[r.zoneId]?.name||r.zoneId;
      const type=r.selectionType==='playlist'?'Playlist · ':'';
      return `<div class="statsRecordRow"><span><b>${esc(type+zone)}</b><small>${esc(modeLabel(r.mode))}${r.mode!=='exploration'?` · ${esc(variantLabel(r.variant))}`:''}${r.legacy && !r.games?' · historique':''}</small></span><strong>${r.best?r.best.toLocaleString('fr-FR'):'—'}</strong><i>${r.games?r.games.toLocaleString('fr-FR'):'—'}</i><em>${r.perfect==null?'—':r.perfect.toLocaleString('fr-FR')}</em></div>`;
    }).join('');
  }

  badges(){
    const hasRoundUnder10=this.data.rounds.some(r=>Number.isFinite(r.distance)&&r.distance<10);
    const classicPerfect=(key,r,predicate)=>{ const parsed=parseRecordKey(key); return !!parsed && parsed.variant==='classic' && predicate(parsed) && (Number(r?.perfect5)||0)>0; };
    const hasParis25=Object.entries(this.data.records).some(([key,r])=>classicPerfect(key,r,p=>p.zoneId==='paris'));
    const hasNoMove25=Object.entries(this.data.records).some(([key,r])=>classicPerfect(key,r,p=>p.mode==='nomove'));
    const hasNmpz25=Object.entries(this.data.records).some(([key,r])=>classicPerfect(key,r,p=>p.mode==='nmpz'));
    const explorationGames=this.explorationGameCount();
    const blitzGames=this.data.games.filter(g=>normalizeVariant(g.variant)==='blitz').length;
    const precisionGames=this.data.games.filter(g=>normalizeVariant(g.variant)==='precision').length;
    return [
      {icon:'🎯',name:'Sniper',desc:'Une réponse à moins de 10 m',ok:hasRoundUnder10},
      {icon:'🗼',name:'Parisien',desc:'25 000 sur Paris',ok:hasParis25},
      {icon:'🧍',name:'Sans bouger',desc:'25 000 en No Move',ok:hasNoMove25},
      {icon:'🗿',name:'Statue',desc:'25 000 en No Move + No Pan/Zoom',ok:hasNmpz25},
      {icon:'🔥',name:'Régulier',desc:'Une série de 3 jours',ok:this.bestStreak()>=3},
      {icon:'⌁',name:'Challenger',desc:'Terminer 5 Challenges',ok:this.challengeGameCount()>=5},
      {icon:'🧭',name:'Éclaireur',desc:'Terminer 3 parties Exploration',ok:explorationGames>=3},
      {icon:'⚡',name:'Éclair',desc:'Terminer 5 parties Blitz',ok:blitzGames>=5},
      {icon:'📐',name:'Géomètre',desc:'Terminer 5 parties Précision',ok:precisionGames>=5},
      {icon:'🎶',name:'Mixeur',desc:'Terminer 5 parties en playlist',ok:this.playlistGameCount()>=5},
      {icon:'💯',name:'Centurion',desc:'Jouer 100 manches suivies',ok:this.data.rounds.length>=100},
      {icon:'✨',name:'Collectionneur',desc:'Réussir 25 manches à 5 000',ok:this.allPerfectRoundCount()>=25}
    ];
  }

  renderBadges(){
    const box=$('statsBadges'); if(!box) return;
    box.innerHTML=this.badges().map(b=>`<article class="statsBadge ${b.ok?'unlocked':'locked'}"><span>${b.icon}</span><div><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div><i>${b.ok?'Débloqué':'À faire'}</i></article>`).join('');
  }

  renderHistory(){
    const box=$('statsHistory'); if(!box) return;
    const games=this.data.games.slice(0,20);
    if(!games.length){ box.innerHTML='<div class="statsEmpty">Les prochaines parties terminées apparaîtront ici.</div>'; return; }
    box.innerHTML=games.map(g=>{
      const pct=g.maxScore?Math.round(g.score/g.maxScore*100):0;
      return `<div class="statsHistoryRow"><time>${esc(formatDate(g.date))}</time><span><b>${esc(g.zoneName)}</b><small>${esc(modeLabel(g.mode))}${g.mode!=='exploration'?` · ${esc(variantLabel(g.variant))}`:''}${g.challengeId?` · Challenge ${esc(g.challengeId)}`:''} · ${g.roundCount} ${g.mode==='exploration'?'missions':'manches'}</small></span><strong>${g.score.toLocaleString('fr-FR')}<small>/ ${g.maxScore.toLocaleString('fr-FR')} · ${pct}%</small></strong><em>${g.mode==='exploration'?'Exploration':`${g.perfectRounds}×5000`}</em></div>`;
    }).join('');
  }
}

function boot(){
  if(!window.guessrGame || !window.GUESSR_INTERNALS) return setTimeout(boot,50);
  window.lostPinStats=new StatsController(window.guessrGame,window.GUESSR_INTERNALS);
}
boot();
})();
