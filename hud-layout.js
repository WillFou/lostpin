(() => {
'use strict';

const STORAGE_KEY='lostpin-hud-layout-v1';
const DRAGGABLES={
  multiCompactPanel:{defaultAnchor:'tl',label:'Joueurs / Réactions',handle:'.multiCompactSectionHeader:first-child'},
  multiTimer:{defaultAnchor:'tc',label:'Timer'},
  compass:{defaultAnchor:'tr',label:'Boussole'}
};
const ANCHORS=['tl','tc','tr','ml','mr','bl','bc','br'];
const MARGIN=14;
const $=id=>document.getElementById(id);
let unlocked=false;
let layout=loadLayout();
let drag=null;
let resizeTimer=null;

function loadLayout(){
  try {
    const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    return value && typeof value==='object' ? value : {};
  } catch(_){ return {}; }
}
function saveLayout(){
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(layout)); } catch(_) {}
}
function anchorFor(id){ return ANCHORS.includes(layout[id]) ? layout[id] : DRAGGABLES[id].defaultAnchor; }
function reservedTop(side){
  if(side==='left'){
    const hud=document.querySelector('#gameScreen .hud');
    if(hud && !hud.closest('.hidden')) return Math.max(MARGIN,hud.getBoundingClientRect().bottom+8);
  }
  if(side==='right'){
    const actions=document.querySelector('#gameScreen .topActions');
    if(actions) return Math.max(MARGIN,actions.getBoundingClientRect().bottom+8);
  }
  return MARGIN;
}
function anchorPosition(anchor,w,h){
  const vw=window.innerWidth, vh=window.innerHeight;
  const centerX=Math.max(MARGIN,(vw-w)/2);
  const centerY=Math.max(MARGIN,(vh-h)/2);
  const right=Math.max(MARGIN,vw-w-MARGIN);
  const bottom=Math.max(MARGIN,vh-h-MARGIN);
  const topLeft=reservedTop('left');
  const topRight=reservedTop('right');
  const map={
    tl:[MARGIN,Math.min(bottom,topLeft)],
    tc:[centerX,MARGIN],
    tr:[right,Math.min(bottom,topRight)],
    ml:[MARGIN,centerY],
    mr:[right,centerY],
    bl:[MARGIN,bottom],
    bc:[centerX,bottom],
    br:[right,bottom]
  };
  return map[anchor]||map.tl;
}
function applyElement(id){
  const el=$(id); if(!el) return;
  const anchor=anchorFor(id);
  el.classList.add('hudAnchored');
  el.dataset.hudAnchor=anchor;
  const rect=el.getBoundingClientRect();
  const w=rect.width||el.offsetWidth||120, h=rect.height||el.offsetHeight||50;
  const [x,y]=anchorPosition(anchor,w,h);
  el.style.left=`${Math.round(x)}px`;
  el.style.top=`${Math.round(y)}px`;
  el.style.right='auto'; el.style.bottom='auto'; el.style.transform='none';
}
function applyAll(){ Object.keys(DRAGGABLES).forEach(applyElement); updateAnchorOverlay(); }
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
  const el=$(id); if(!el || el.classList.contains('hidden')) return;
  event.preventDefault();
  const rect=el.getBoundingClientRect();
  drag={id,el,dx:event.clientX-rect.left,dy:event.clientY-rect.top,pointerId:event.pointerId};
  el.classList.add('hudDragging');
  el.setPointerCapture?.(event.pointerId);
  el.style.left=`${rect.left}px`; el.style.top=`${rect.top}px`;
  highlightNearest(event.clientX,event.clientY,rect.width,rect.height);
}
function moveDrag(event){
  if(!drag || event.pointerId!==drag.pointerId) return;
  const {el,dx,dy}=drag;
  const w=el.offsetWidth,h=el.offsetHeight;
  const x=Math.max(4,Math.min(window.innerWidth-w-4,event.clientX-dx));
  const y=Math.max(4,Math.min(window.innerHeight-h-4,event.clientY-dy));
  el.style.left=`${x}px`; el.style.top=`${y}px`;
  highlightNearest(event.clientX,event.clientY,w,h);
}
function nearestAnchor(cx,cy,w,h,id){
  const occupied=new Set(Object.keys(DRAGGABLES).filter(k=>k!==id).map(anchorFor));
  const ranked=ANCHORS.map(anchor=>{
    const [x,y]=anchorPosition(anchor,w,h);
    const ax=x+w/2, ay=y+h/2;
    return {anchor,d:(cx-ax)**2+(cy-ay)**2,occupied:occupied.has(anchor)};
  }).sort((a,b)=>a.d-b.d);
  return (ranked.find(x=>!x.occupied)||ranked[0]).anchor;
}
function finishDrag(event){
  if(!drag || (event.pointerId!==undefined && event.pointerId!==drag.pointerId)) return;
  const {id,el}=drag;
  const rect=el.getBoundingClientRect();
  const anchor=nearestAnchor(rect.left+rect.width/2,rect.top+rect.height/2,rect.width,rect.height,id);
  layout[id]=anchor; saveLayout();
  el.classList.remove('hudDragging');
  drag=null; applyElement(id); clearAnchorHighlights(); updateAnchorOverlay();
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
    node.style.left=`${x}px`; node.style.top=`${y}px`;
  });
}
function setUnlocked(value){
  unlocked=!!value;
  const screen=$('gameScreen'), lock=$('hudLayoutLockButton'), reset=$('hudLayoutResetButton'), overlay=$('hudAnchorOverlay');
  screen?.classList.toggle('hud-layout-editing',unlocked);
  overlay?.classList.toggle('hidden',!unlocked);
  reset?.classList.toggle('hidden',!unlocked);
  if(lock){
    lock.textContent=unlocked?'🔓':'🔒';
    lock.classList.toggle('active',unlocked);
    lock.setAttribute('aria-pressed',unlocked?'true':'false');
    lock.setAttribute('aria-label',unlocked?'Verrouiller la disposition du HUD':'Déverrouiller la disposition du HUD');
    lock.title=unlocked?'Verrouiller la disposition du HUD':'Déverrouiller la disposition du HUD';
  }
  if(unlocked) applyAll(); else { finishDrag({}); clearAnchorHighlights(); }
}
function resetLayout(){
  layout={}; saveLayout(); applyAll();
  window.guessrGame?.showToast?.('Disposition du HUD réinitialisée.',1600);
}
function bind(){
  $('hudLayoutLockButton')?.addEventListener('click',()=>setUnlocked(!unlocked));
  $('hudLayoutResetButton')?.addEventListener('click',resetLayout);
  Object.keys(DRAGGABLES).forEach(id=>{
    const el=$(id); if(!el) return;
    el.classList.add('hudDraggable');
    el.addEventListener('pointerdown',event=>startDrag(id,event));
    if(window.ResizeObserver){ new ResizeObserver(()=>{ if(!drag) applyElement(id); }).observe(el); }
  });
  window.addEventListener('pointermove',moveDrag,{passive:false});
  window.addEventListener('pointerup',finishDrag);
  window.addEventListener('pointercancel',finishDrag);
  window.addEventListener('resize',()=>{ clearTimeout(resizeTimer); resizeTimer=setTimeout(applyAll,100); });
  applyAll();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
})();
