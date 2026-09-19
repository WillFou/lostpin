(() => {
'use strict';

const $ = id => document.getElementById(id);
const ROUTES = {
  play: 'v6PlayRoute',
  collections: 'playlistModal',
  multiplayer: 'multiplayerModal',
  challenges: 'challengeModal',
  rankings: 'v6RankingsPage',
  profile: 'statsModal'
};
let activeRoute = 'home';
let routeSyncing = false;
let rankingFilter = 'all';

function startScreen() { return $('startScreen'); }
function homePage() { return startScreen()?.querySelector(':scope > .v6Page'); }
function routeElement(route) { return $(ROUTES[route]); }
function routeEntries() { return Object.entries(ROUTES).map(([name,id]) => [name,$(id)]).filter(([,el]) => !!el); }

function setNavActive(route='home') {
  const nav = document.querySelector('.v6MainNav');
  if (!nav) return;
  nav.querySelectorAll('button').forEach(button => button.classList.remove('active'));
  const ids = {
    home: null,
    play: 'v6NavPlay',
    collections: 'v6NavCollections',
    multiplayer: 'v6NavMultiplayer',
    challenges: 'v6NavChallenges',
    rankings: 'v6NavStats',
    profile: 'v6NavProfile'
  };
  if (route === 'home') nav.querySelector('[data-v6-scroll="v6Home"]')?.classList.add('active');
  else $(ids[route])?.classList.add('active');
}

function showHome(targetId=null, smooth=false) {
  routeSyncing = true;
  routeEntries().forEach(([,el]) => el.classList.add('hidden'));
  homePage()?.classList.remove('hidden');
  routeSyncing = false;
  activeRoute = 'home';
  setNavActive('home');
  const scroller=startScreen();
  if (!scroller) return;
  if (!targetId) { scroller.scrollTo({top:0,behavior:smooth?'smooth':'auto'}); return; }
  requestAnimationFrame(() => {
    const target=$(targetId);
    if (!target) return;
    const top=Math.max(0,target.offsetTop-82);
    scroller.scrollTo({top,behavior:smooth?'smooth':'auto'});
  });
}

function activateRoute(route) {
  const target=routeElement(route);
  if (!target) return;
  routeSyncing=true;
  homePage()?.classList.add('hidden');
  routeEntries().forEach(([name,el]) => el.classList.toggle('hidden',name!==route));
  routeSyncing=false;
  activeRoute=route;
  setNavActive(route);
  startScreen()?.scrollTo({top:0,behavior:'auto'});
  if (route==='rankings') renderRankings();
}

function scrollToSection(id) {
  const playTargets=new Set(['v6Catalog','v6Setup']);
  if(playTargets.has(id)){
    activateRoute('play');
    requestAnimationFrame(()=>{const target=$(id),scroller=startScreen();if(target&&scroller)scroller.scrollTo({top:Math.max(0,target.offsetTop-82),behavior:'smooth'});});
    return;
  }
  if (activeRoute!=='home') {
    showHome(id,true);
    return;
  }
  const target=$(id),scroller=startScreen();
  if(!target||!scroller)return;
  scroller.scrollTo({top:Math.max(0,target.offsetTop-82),behavior:'smooth'});
}

function clickExisting(id) { $(id)?.click(); }
function chooseMode(mode) { document.querySelector(`.modeCard[data-mode="${mode}"]`)?.click(); }

function applyPreset(name,options={}) {
  const game=window.guessrGame;if(!game)return;
  game.setPlayType?.('guess');
  if(name==='nomove')chooseMode('nomove'); else if(name==='nmpz')chooseMode('nmpz'); else chooseMode('explore');
  game.setGameVariant?.(name==='blitz'?'blitz':'classic');
  if(options.launch){const start=$('startButton');if(start&&!start.disabled){start.click();return;}}
  scrollToSection('v6Setup');
}

function chooseZone(zoneId,sourceButton=null) {
  const game=window.guessrGame;if(!game?.setSelection)return;
  game.setSelection({type:'zone',zoneId});
  document.querySelectorAll('.v6CollectionCard[data-v6-zone]').forEach(card=>card.classList.toggle('selected',card.dataset.v6Zone===zoneId));
  const panel=$('v6CollectionSelection');
  if(panel){
    const card=sourceButton||document.querySelector(`.v6CollectionCard[data-v6-zone="${zoneId}"]`);
    const name=card?.querySelector('strong')?.textContent?.trim()||game.getSelectionName?.(game.getSelectionDescriptor?.())||zoneId;
    const description=card?.querySelector('small')?.textContent?.trim()||'Collection LostPin prête à jouer.';
    if($('v6CollectionSelectionName'))$('v6CollectionSelectionName').textContent=name;
    if($('v6CollectionSelectionDescription'))$('v6CollectionSelectionDescription').textContent=`${description} · 5 manches`;
    panel.classList.remove('hidden');
  }
}

function syncFeaturedSelection(){
  const game=window.guessrGame;if(!game)return;let descriptor=null;
  try{descriptor=game.getSelectionDescriptor?.();}catch(_){}
  const zoneId=descriptor?.type==='zone'?descriptor.zoneId:null,cards=[...document.querySelectorAll('.v6CollectionCard[data-v6-zone]')];let activeCard=null;
  cards.forEach(card=>{const active=!!zoneId&&card.dataset.v6Zone===zoneId;card.classList.toggle('selected',active);if(active)activeCard=card;});
  const panel=$('v6CollectionSelection');if(!panel)return;
  if(!activeCard){panel.classList.add('hidden');return;}
  const name=activeCard.querySelector('strong')?.textContent?.trim()||zoneId,description=activeCard.querySelector('small')?.textContent?.trim()||'Collection LostPin prête à jouer.';
  if($('v6CollectionSelectionName'))$('v6CollectionSelectionName').textContent=name;
  if($('v6CollectionSelectionDescription'))$('v6CollectionSelectionDescription').textContent=`${description} · 5 manches`;
  panel.classList.remove('hidden');
}

function updateQuickSelection(){
  const game=window.guessrGame,label=$('v6QuickSelectionName');if(!game)return;
  if(label){try{label.textContent=game.getSelectionName?.(game.getSelectionDescriptor?.())||'Paris';}catch(_){}}
  syncFeaturedSelection();
}

function openFeatureRoute(route,triggerId){
  // The feature controller owns render/setup; the router owns page navigation.
  clickExisting(triggerId);
  requestAnimationFrame(()=>activateRoute(route));
}

function bindNavigation(){
  document.querySelectorAll('[data-v6-scroll]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();scrollToSection(button.dataset.v6Scroll);}));
  document.querySelectorAll('[data-v6-zone]').forEach(button=>button.addEventListener('click',()=>chooseZone(button.dataset.v6Zone,button)));
  $('v6CollectionPlay')?.addEventListener('click',()=>applyPreset('classic',{launch:true}));
  $('v6CollectionCustomize')?.addEventListener('click',()=>scrollToSection('v6Setup'));
  document.querySelectorAll('[data-v6-preset]').forEach(button=>button.addEventListener('click',()=>applyPreset(button.dataset.v6Preset,{launch:true})));

  $('v6NavPlay')?.addEventListener('click',()=>activateRoute('play'));
  $('v6NavCollections')?.addEventListener('click',()=>openFeatureRoute('collections','playlistButton'));
  $('v6HeroCollections')?.addEventListener('click',()=>openFeatureRoute('collections','playlistButton'));
  $('v6HeroCollectionsShortcut')?.addEventListener('click',()=>openFeatureRoute('collections','playlistButton'));
  $('v6FeaturedCollectionsAll')?.addEventListener('click',()=>openFeatureRoute('collections','playlistButton'));
  $('v6NavMultiplayer')?.addEventListener('click',()=>openFeatureRoute('multiplayer','multiplayerButton'));
  $('v6NavChallenges')?.addEventListener('click',()=>openFeatureRoute('challenges','challengeButton'));
  $('v6NavStats')?.addEventListener('click',()=>activateRoute('rankings'));
  $('v6NavProfile')?.addEventListener('click',()=>openFeatureRoute('profile','statsButton'));
  $('v6HeroProfile')?.addEventListener('click',()=>openFeatureRoute('profile','statsButton'));
  $('v6HeroChallenge')?.addEventListener('click',()=>openFeatureRoute('challenges','challengeButton'));
  $('v6SearchNav')?.addEventListener('click',()=>{showHome('v6Catalog',true);setTimeout(()=>$('zoneSearch')?.focus(),420);});
  $('v6ModeMultiplayer')?.addEventListener('click',()=>openFeatureRoute('multiplayer','multiplayerButton'));
  $('v6ModeChallenge')?.addEventListener('click',()=>openFeatureRoute('challenges','challengeButton'));
  $('v6CommunityMulti')?.addEventListener('click',()=>openFeatureRoute('multiplayer','multiplayerButton'));
  $('v6CommunityChallenge')?.addEventListener('click',()=>openFeatureRoute('challenges','challengeButton'));
  $('v6CommunityStats')?.addEventListener('click',()=>openFeatureRoute('profile','statsButton'));
  $('v6SetupLaunch')?.addEventListener('click',()=>clickExisting('startButton'));
  $('closeRankings')?.addEventListener('click',()=>showHome());
  $('closePlayRoute')?.addEventListener('click',()=>showHome());
  document.querySelector('.v6Brand')?.addEventListener('click',event=>{event.preventDefault();showHome('v6Home',true);});
  document.addEventListener('lostpin:selection-change',updateQuickSelection);
  document.addEventListener('lostpin:v6-route-home',event=>showHome(event.detail?.target||null,true));
  updateQuickSelection();
}

function bindRouteLifecycle(){
  routeEntries().forEach(([route,el])=>{
    new MutationObserver(()=>{
      if(routeSyncing)return;
      const visible=!el.classList.contains('hidden');
      if(visible){activateRoute(route);return;}
      if(activeRoute===route){const another=routeEntries().find(([,x])=>!x.classList.contains('hidden'));if(!another)showHome();}
    }).observe(el,{attributes:true,attributeFilter:['class']});
  });
}

function bindChallengeTabs(){
  const buttons=[...document.querySelectorAll('[data-challenge-tab]')],panels=[...document.querySelectorAll('[data-challenge-panel]')];
  if(!buttons.length)return;
  const show=key=>{buttons.forEach(b=>b.classList.toggle('active',b.dataset.challengeTab===key));panels.forEach(p=>p.classList.toggle('hidden',p.dataset.challengePanel!==key));};
  buttons.forEach(button=>button.addEventListener('click',()=>show(button.dataset.challengeTab)));
  show('create');
}

function statsData(){
  if(window.lostPinStats?.data)return window.lostPinStats.data;
  try{return JSON.parse(localStorage.getItem('lostpin-stats-v1')||'null')||{records:{}};}catch(_){return {records:{}};}
}
function parseRecordKey(key){
  const parts=String(key||'').split(':');if(parts.length<2)return null;
  const last=parts.at(-1),hasVariant=['classic','blitz','precision'].includes(last)&&parts.length>=3;
  const variant=hasVariant?last:'classic',mode=parts[parts.length-(hasVariant?2:1)],zoneId=parts.slice(0,parts.length-(hasVariant?2:1)).join(':');
  return zoneId&&mode?{zoneId,mode,variant}:null;
}
function modeLabel(mode){return mode==='nomove'?'No Move':mode==='nmpz'?'NMPZ':'Move';}
function variantLabel(v){return v==='blitz'?'Blitz':v==='precision'?'Précision':'Classique';}
function esc(text){return String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function rankingRows(){
  const data=statsData(),api=window.GUESSR_INTERNALS,rows=[];
  Object.entries(data.records||{}).forEach(([key,rec])=>{
    const parsed=parseRecordKey(key);if(!parsed||parsed.mode==='exploration')return;
    const variant=rec.variant||parsed.variant||'classic',best=Number(rec.best5)||0;
    if(!best&&!rec.games)return;
    const zoneName=rec.selectionName||api?.ZONES?.[parsed.zoneId]?.name||parsed.zoneId;
    rows.push({zoneName,mode:parsed.mode,variant,best,games:Number(rec.games)||0,perfect:Number(rec.perfect5)||0});
  });
  return rows.sort((a,b)=>b.best-a.best||a.zoneName.localeCompare(b.zoneName,'fr'));
}
function renderRankings(){
  const box=$('v6RankingList');if(!box)return;
  let rows=rankingRows();
  if(rankingFilter!=='all')rows=rows.filter(r=>r.variant===rankingFilter);
  if($('v6RankingRecordCount'))$('v6RankingRecordCount').textContent=String(rows.length);
  if($('v6RankingPerfectCount'))$('v6RankingPerfectCount').textContent=String(rows.reduce((s,r)=>s+r.perfect,0));
  if(!rows.length){box.innerHTML='<div class="v6RankingEmpty">Aucun record dans cette catégorie pour le moment. Termine quelques parties pour remplir ce classement.</div>';return;}
  box.innerHTML=rows.slice(0,30).map((r,i)=>`<article class="v6RankingRow"><span class="rank">${i+1}</span><span class="selection"><b>${esc(r.zoneName)}</b><small>${r.games} partie${r.games>1?'s':''} enregistrée${r.games>1?'s':''}</small></span><span class="mode"><b>${esc(variantLabel(r.variant))}</b><small>${esc(modeLabel(r.mode))}</small></span><strong class="score">${r.best.toLocaleString('fr-FR')} pts</strong><span class="perfect">${r.perfect?`${r.perfect} × 25k`:'—'}</span></article>`).join('');
}
function bindRankingTabs(){
  document.querySelectorAll('[data-ranking-filter]').forEach(button=>button.addEventListener('click',()=>{
    rankingFilter=button.dataset.rankingFilter||'all';
    document.querySelectorAll('[data-ranking-filter]').forEach(b=>b.classList.toggle('active',b===button));
    renderRankings();
  }));
}

function bindScrollSpy(){
  const scroller=startScreen(),navButtons=[...document.querySelectorAll('.v6MainNav [data-v6-scroll]')],sections=navButtons.map(button=>({button,section:$(button.dataset.v6Scroll)})).filter(item=>item.section);
  if(!scroller||!sections.length)return;
  const refresh=()=>{if(activeRoute!=='home')return;const y=scroller.scrollTop+150;let current=sections[0];for(const item of sections)if(item.section.offsetTop<=y)current=item;navButtons.forEach(button=>button.classList.toggle('active',button===current.button));};
  scroller.addEventListener('scroll',refresh,{passive:true});refresh();
}

function mirrorLaunchState(){
  const source=$('startButton'),mirror=$('v6SetupLaunch');if(!source||!mirror)return;
  const refresh=()=>{mirror.disabled=source.disabled;mirror.textContent=source.disabled?source.textContent:'Jouer maintenant';};
  new MutationObserver(refresh).observe(source,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['disabled']});refresh();
}
function addVersionClass(){document.documentElement.classList.add('lostpin-v6');}
function clearLegacyHudLayout(){try{localStorage.removeItem('lostpin-hud-layout-v2');}catch(_){}}

addVersionClass();
clearLegacyHudLayout();
bindRouteLifecycle();
bindNavigation();
bindChallengeTabs();
bindRankingTabs();
bindScrollSpy();
mirrorLaunchState();
})();
