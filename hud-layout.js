(() => {
'use strict';

const STORAGE_KEY='lostpin-hud-layout-v1';
const DRAGGABLES={
  multiCompactPanel:{defaultAnchor:'tl',label:'Joueurs / Réactions',handle:'.multiCompactSectionHeader:first-child'},
  multiTimer:{defaultAnchor:'tc',label:'Timer'},
  compass:{defaultAnchor:'tr',label:'Boussole'}
};
const IDS=Object.keys(DRAGGABLES);
const ANCHORS=['tl','tc','tr','ml','mr','bl','bc','br'];
const MARGIN=14;
const GAP=10;
const $=id=>document.getElementById(id);
let unlocked=false;
let layout=loadLayout();
let drag=null;
let resizeTimer=null;
let mutationTimer=null;

function loadLayout(){
  try {
    const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    return value && typeof value==='object' ? value : {};
  } catch(_){ return {}; }
}
function saveLayout(){
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(layout)); } catch(_) {}
}
function firstFreeAnchor(preferred,used){
  const start=ANCHORS.includes(preferred)?ANCHORS.indexOf(preferred):0;
  const ordered=[...ANCHORS.slice(start),...ANCHORS.slice(0,start)];
  return ordered.find(anchor=>!used.has(anchor)) || preferred || 'tl';
}
function sanitizeLayout(){
  const used=new Set();
  const clean={};
  let changed=false;
  IDS.forEach(id=>{
    const raw=ANCHORS.includes(layout[id])?layout[id]:DRAGGABLES[id].defaultAnchor;
    const anchor=used.has(raw)?firstFreeAnchor(DRAGGABLES[id].defaultAnchor,used):raw;
    clean[id]=anchor;
    used.add(anchor);
    if(layout[id]!==anchor) changed=true;
  });
  layout=clean;
  if(changed) saveLayout();
}
function anchorFor(id){ return ANCHORS.includes(layout[id]) ? layout[id] : DRAGGABLES[id].defaultAnchor; }
function isShown(el){
  if(!el || el.classList.contains('hidden')) return false;
  const style=getComputedStyle(el);
  return style.display!=='none' && style.visibility!=='hidden' && el.getClientRects().length>0;
}
function reservedTop(side){
  if(side==='left'){
    const hud=document.querySelector('#gameScreen .hud');
    if(hud && isShown(hud)) return Math.max(MARGIN,hud.getBoundingClientRect().bottom+8);
  }
  if(side==='right'){
    const actions=document.querySelector('#gameScreen .topActions');
    if(actions && isShown(actions)) return Math.max(MARGIN,actions.getBoundingClientRect().bottom+8);
  }
  return MARGIN;
}
function clamp(value,min,max){ return Math.min(Math.max(value,min),Math.max(min,max)); }
function anchorPosition(anchor,w,h){
  const vw=window.innerWidth, vh=window.innerHeight;
  const maxX=Math.max(MARGIN,vw-w-MARGIN);
  const maxY=Math.max(MARGIN,vh-h-MARGIN);
  const centerX=clamp((vw-w)/2,MARGIN,maxX);
  const centerY=clamp((vh-h)/2,MARGIN,maxY);
  const right=maxX;
  const bottom=maxY;
  const topLeft=clamp(reservedTop('left'),MARGIN,maxY);
  const topRight=clamp(reservedTop('right'),MARGIN,maxY);
  const map={
    tl:[MARGIN,topLeft],
    tc:[centerX,MARGIN],
    tr:[right,topRight],
    ml:[MARGIN,centerY],
    mr:[right,centerY],
    bl:[MARGIN,bottom],
    bc:[centerX,bottom],
    br:[right,bottom]
  };
  return map[anchor]||map.tl;
}
function rectAt(anchor,w,h){
  const [x,y]=anchorPosition(anchor,w,h);
  return {x,y,left:x,top:y,right:x+w,bottom:y+h,width:w,height:h};
}
function overlaps(a,b,gap=GAP){
  return !(a.right+gap<=b.left || a.left>=b.right+gap || a.bottom+gap<=b.top || a.top>=b.bottom+gap);
}
function fixedObstacles(){
  return ['#gameScreen .hud','#gameScreen .topActions'].map(selector=>document.querySelector(selector)).filter(isShown).map((el,index)=>{
    const rect=el.getBoundingClientRect();
    return {id:`fixed-${index}`,rect:{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height}};
  });
}
function candidateAnchors(preferred){
  const px=ANCHORS.indexOf(preferred);
  if(px<0) return [...ANCHORS];
  return [preferred,...ANCHORS.filter(a=>a!==preferred)];
}
function measure(el){
  const rect=el.getBoundingClientRect();
  return {w:Math.min(rect.width||el.offsetWidth||120,Math.max(80,window.innerWidth-MARGIN*2)),h:Math.min(rect.height||el.offsetHeight||50,Math.max(40,window.innerHeight-MARGIN*2))};
}
function placeElement(id,anchor,placed=[]){
  const el=$(id); if(!el) return null;
  el.classList.add('hudAnchored');
  const {w,h}=measure(el);
  let effective=anchor;
  let rect=rectAt(effective,w,h);
  if(isShown(el)){
    const found=candidateAnchors(anchor).find(candidate=>{
      const test=rectAt(candidate,w,h);
      return !placed.some(item=>overlaps(test,item.rect));
    });
    if(found){ effective=found; rect=rectAt(found,w,h); }
  }
  el.dataset.hudAnchor=effective;
  el.dataset.hudPreferredAnchor=anchor;
  el.style.left=`${Math.round(rect.x)}px`;
  el.style.top=`${Math.round(rect.y)}px`;
  el.style.right='auto';
  el.style.bottom='auto';
  el.style.transform='none';
  return isShown(el)?{id,anchor:effective,rect}:null;
}
function applyElement(id){
  const placed=fixedObstacles();
  IDS.forEach(current=>{
    if(current===id){ placeElement(current,anchorFor(current),placed); return; }
    const el=$(current);
    if(!isShown(el)) return;
    const rect=el.getBoundingClientRect();
    if(rect.width && rect.height) placed.push({id:current,rect:{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height}});
  });
}
function applyAll(){
  sanitizeLayout();
  const placed=fixedObstacles();
  IDS.forEach(id=>{
    const result=placeElement(id,anchorFor(id),placed);
    if(result) placed.push(result);
  });
  updateAnchorOverlay();
}
function isInteractive(target){ return !!target.closest('button,a,input,select,textarea,[role="button"]'); }
function canStartDrag(id,event){
  if(!unlocked || event.button!==0) return false;
  if(isInteractive(event.target)) return false;
  const cfg=DRAGGABLES[id];
  if(cfg.handle && !event.target.closest(cfg.handle)) return false;
  return true;
}
function startDrag(id,event){
  if(!canStartDrag(id,event)) return;
  const el=$(id); if(!el || !isShown(el)) return;
  event.preventDefault();
  const rect=el.getBoundingClientRect();
  drag={id,el,dx:event.clientX-rect.left,dy:event.clientY-rect.top,pointerId:event.pointerId};
  el.classList.add('hudDragging');
  el.setPointerCapture?.(event.pointerId);
  el.style.left=`${rect.left}px`; el.style.top=`${rect.top}px`;
  highlightNearest(rect.left+rect.width/2,rect.top+rect.height/2,rect.width,rect.height);
}
function moveDrag(event){
  if(!drag || event.pointerId!==drag.pointerId) return;
  event.preventDefault();
  const {el,dx,dy}=drag;
  const w=el.offsetWidth,h=el.offsetHeight;
  const x=clamp(event.clientX-dx,4,window.innerWidth-w-4);
  const y=clamp(event.clientY-dy,4,window.innerHeight-h-4);
  el.style.left=`${x}px`; el.style.top=`${y}px`;
  highlightNearest(x+w/2,y+h/2,w,h);
}
function nearestAnchor(cx,cy,w,h,id){
  const occupied=new Set(IDS.filter(k=>k!==id).map(anchorFor));
  const obstacles=fixedObstacles();
  IDS.filter(k=>k!==id).forEach(otherId=>{
    const el=$(otherId);
    if(!isShown(el)) return;
    const r=el.getBoundingClientRect();
    if(r.width && r.height) obstacles.push({id:otherId,rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}});
  });
  const ranked=ANCHORS.map(anchor=>{
    const rect=rectAt(anchor,w,h);
    const ax=rect.left+w/2, ay=rect.top+h/2;
    const blocked=obstacles.some(item=>overlaps(rect,item.rect));
    return {anchor,d:(cx-ax)**2+(cy-ay)**2,occupied:occupied.has(anchor),blocked};
  }).sort((a,b)=>a.d-b.d);
  return (ranked.find(x=>!x.occupied && !x.blocked)||ranked.find(x=>!x.occupied)||ranked[0]).anchor;
}
function finishDrag(event={}){
  if(!drag || (event.pointerId!==undefined && event.pointerId!==drag.pointerId)) return;
  const {id,el}=drag;
  const rect=el.getBoundingClientRect();
  const anchor=nearestAnchor(rect.left+rect.width/2,rect.top+rect.height/2,rect.width,rect.height,id);
  layout[id]=anchor;
  sanitizeLayout();
  saveLayout();
  el.classList.remove('hudDragging');
  drag=null;
  applyAll();
  clearAnchorHighlights();
}
function highlightNearest(cx,cy,w,h){
  if(!drag) return;
  const anchor=nearestAnchor(cx,cy,w,h,drag.id);
  document.querySelectorAll('#hudAnchorOverlay [data-hud-anchor]').forEach(el=>el.classList.toggle('active',el.dataset.hudAnchor===anchor));
}
function clearAnchorHighlights(){ document.querySelectorAll('#hudAnchorOverlay [data-hud-anchor]').forEach(el=>el.classList.remove('active')); }
function updateAnchorOverlay(){
  document.querySelectorAll('#hudAnchorOverlay [data-hud-anchor]').forEach(node=>{
    const anchor=node.dataset.hudAnchor;
    const [x,y]=anchorPosition(anchor,54,30);
    node.style.left=`${Math.round(x)}px`; node.style.top=`${Math.round(y)}px`;
  });
}
function setUnlocked(value){
  unlocked=!!value;
  const screen=$('gameScreen'), lock=$('hudLayoutLockButton'), reset=$('hudLayoutResetButton'), overlay=$('hudAnchorOverlay'), hint=$('hudLayoutEditHint');
  screen?.classList.toggle('hud-layout-editing',unlocked);
  overlay?.classList.toggle('hidden',!unlocked);
  reset?.classList.toggle('hidden',!unlocked);
  hint?.classList.toggle('hidden',!unlocked);
  if(lock){
    lock.textContent=unlocked?'🔓':'🔒';
    lock.classList.toggle('active',unlocked);
    lock.setAttribute('aria-pressed',unlocked?'true':'false');
    lock.setAttribute('aria-label',unlocked?'Verrouiller la disposition du HUD':'Déverrouiller la disposition du HUD');
    lock.title=unlocked?'Verrouiller la disposition du HUD':'Déverrouiller la disposition du HUD';
  }
  if(unlocked){
    applyAll();
    window.guessrGame?.showToast?.('HUD déverrouillé : déplace les blocs puis reverrouille.',1800);
  } else {
    finishDrag({});
    clearAnchorHighlights();
    applyAll();
  }
}
function resetLayout(){
  layout={};
  sanitizeLayout();
  saveLayout();
  applyAll();
  window.guessrGame?.showToast?.('Disposition du HUD réinitialisée.',1600);
}
function scheduleApply(delay=80){
  clearTimeout(mutationTimer);
  mutationTimer=setTimeout(()=>{ if(!drag) applyAll(); },delay);
}
function bind(){
  sanitizeLayout();
  $('hudLayoutLockButton')?.addEventListener('click',()=>setUnlocked(!unlocked));
  $('hudLayoutResetButton')?.addEventListener('click',resetLayout);
  IDS.forEach(id=>{
    const el=$(id); if(!el) return;
    el.classList.add('hudDraggable');
    el.addEventListener('pointerdown',event=>startDrag(id,event));
    if(window.ResizeObserver){ new ResizeObserver(()=>{ if(!drag) scheduleApply(40); }).observe(el); }
  });
  window.addEventListener('pointermove',moveDrag,{passive:false});
  window.addEventListener('pointerup',finishDrag);
  window.addEventListener('pointercancel',finishDrag);
  window.addEventListener('resize',()=>{ clearTimeout(resizeTimer); resizeTimer=setTimeout(applyAll,120); });
  window.addEventListener('orientationchange',()=>setTimeout(applyAll,180));
  const screen=$('gameScreen');
  if(screen && window.MutationObserver){
    new MutationObserver(()=>scheduleApply(60)).observe(screen,{subtree:true,attributes:true,attributeFilter:['class']});
  }
  applyAll();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
})();
