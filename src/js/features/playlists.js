(() => {
'use strict';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'lostpin-playlists-v1';
const MAX_CUSTOM = 12;

const BUILT_INS = [
  {
    id:'paris-focus',
    name:'Paris sous toutes ses coutures',
    description:'Paris, le 13e et la sélection 5e / 6e / 7e / 13e.',
    zoneIds:['paris','paris13','parisGroup']
  },
  {
    id:'tour-continents',
    name:'Tour des continents',
    description:'Un tour du monde équilibré entre les six grands terrains continentaux.',
    zoneIds:['europe','northAmerica','southAmerica','asia','africa','oceania']
  },
  {
    id:'france-mix',
    name:'France · du local au national',
    description:'Paris, Bagneux-la-Fosse et la France entière.',
    zoneIds:['paris','bagneux','france']
  },
  {
    id:'two-capitals',
    name:'Deux capitales',
    description:'Paris et Washington DC, en alternance aléatoire.',
    zoneIds:['paris','washington']
  },
  {
    id:'grand-mix',
    name:'Grand Mix LostPin',
    description:'Villes, pays, continents et monde dans une seule collection.',
    zoneIds:['paris','washington','france','spain','usa','japan','europe','northAmerica','southAmerica','asia','africa','oceania','world']
  },
  {
    id:'france-urbaine',
    name:'France urbaine',
    description:'Neuf grandes villes françaises, de Lille à Marseille.',
    zoneIds:['paris','lyon','marseille','bordeaux','lille','toulouse','nantes','strasbourg','nice']
  },
  {
    id:'capitales-europeennes',
    name:'Capitales européennes',
    description:'Un grand tour des capitales du continent.',
    zoneIds:['paris','london','dublin','lisbon','madrid','brussels','amsterdam','berlin','copenhagen','oslo','stockholm','helsinki','vienna','rome','prague','warsaw','budapest','zagreb','bucharest','athens','tallinn','riga','vilnius']
  },
  {
    id:'usa-coast-to-coast',
    name:'USA · Coast to Coast',
    description:'Dix villes américaines de Washington à San Francisco.',
    zoneIds:['washington','newYork','boston','chicago','miami','dallas','denver','seattle','sanFrancisco','losAngeles']
  },
  {
    id:'amerique-latine',
    name:'Amérique latine',
    description:'Grandes métropoles du Mexique et d’Amérique du Sud.',
    zoneIds:['mexicoCity','bogota','lima','santiago','buenosAires','montevideo','saoPaulo','rio','quito']
  },
  {
    id:'asie-urbaine',
    name:'Asie urbaine',
    description:'Tokyo, Séoul, Bangkok et six autres grandes métropoles asiatiques.',
    zoneIds:['tokyo','osaka','seoul','taipei','bangkok','kualaLumpur','singaporeCity','jakarta','manila']
  },
  {
    id:'oceanie-urbaine',
    name:'Océanie urbaine',
    description:'Australie et Nouvelle-Zélande en six grandes villes.',
    zoneIds:['sydney','melbourne','brisbane','perth','auckland','wellington']
  }
];

function esc(text) {
  return String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function readJSON(key,fallback){ try { const value=JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch (_) { return fallback; } }
function writeJSON(key,value){ try { localStorage.setItem(key,JSON.stringify(value)); } catch (_) {} }
function uniqueZones(list, zones){ return Array.from(new Set((Array.isArray(list)?list:[]).filter(id=>!!zones[id]))); }
function makeId(){ return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`; }

class PlaylistController {
  constructor(game,api){
    this.game=game;
    this.api=api;
    this.geo=api.GEOGRAPHY || window.LOSTPIN_GEOGRAPHY || null;
    this.custom=this.loadCustom();
    this.editingId=null;
    this.bindUI();
    this.renderZoneChoices();
    this.render();
    document.addEventListener('lostpin:selection-change',()=>this.render());
  }

  loadCustom(){
    const raw=readJSON(STORAGE_KEY,[]);
    if(!Array.isArray(raw)) return [];
    return raw.map(item=>this.normalizeCustom(item)).filter(Boolean).slice(0,MAX_CUSTOM);
  }

  normalizeCustom(item){
    if(!item || typeof item!=='object') return null;
    const zoneIds=uniqueZones(item.zoneIds,this.api.ZONES);
    if(zoneIds.length<2) return null;
    const id=String(item.id||makeId()).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,40) || makeId();
    const name=String(item.name||'Ma playlist').trim().slice(0,32) || 'Ma playlist';
    return {id,name,description:`${zoneIds.length} terrains personnalisés`,zoneIds};
  }

  bindUI(){
    $('playlistButton')?.addEventListener('click',()=>this.open());
    $('closePlaylist')?.addEventListener('click',()=>this.close());
    $('saveCustomPlaylist')?.addEventListener('click',()=>this.saveCustom());
    $('cancelPlaylistEdit')?.addEventListener('click',()=>this.cancelEdit());
    window.addEventListener('keydown',e=>{ if(e.key==='Escape' && !$('playlistModal')?.classList.contains('hidden')) this.close(); });
  }

  open(){ this.clearError(); this.render(); $('playlistModal')?.classList.remove('hidden'); }
  close(){ $('playlistModal')?.classList.add('hidden'); }

  selection(){ return this.game.getSelectionDescriptor?.() || {type:'zone',zoneId:this.game.zoneId}; }

  renderZoneChoices(){
    const box=$('customPlaylistZones'); if(!box) return;
    box.replaceChildren();
    const zoneIds=Object.keys(this.api.ZONES);
    const sections=this.geo?.playlistSections?.(zoneIds) || [['Terrains',zoneIds.map(id=>({zoneId:id,name:this.api.ZONES[id]?.name||id}))]];
    sections.forEach(([title,items])=>{
      const heading=document.createElement('div'); heading.className='playlistZoneGroupTitle'; heading.textContent=title; box.appendChild(heading);
      items.forEach(item=>{
        const zoneId=item.zoneId;
        if(!this.api.ZONES[zoneId]) return;
        const zone=this.api.ZONES[zoneId];
        const label=document.createElement('label'); label.className='playlistZoneChoice';
        label.innerHTML=`<input type="checkbox" value="${esc(zoneId)}"><span><b>${esc(zone.name)}</b><small>${esc(this.zoneHint(zoneId))}</small></span>`;
        box.appendChild(label);
      });
    });
  }

  zoneHint(zoneId){
    const meta=this.geo?.getMap?.(zoneId);
    if(meta){
      const path=this.geo.pathLabel(meta,{includeRegion:true,includeDepartment:false});
      const kind=this.geo.KIND_LABELS?.[meta.kind] || 'Terrain';
      return path ? `${path} · ${kind}` : kind;
    }
    return 'Terrain LostPin';
  }

  render(){
    this.renderBuiltIns();
    this.renderCustom();
    this.renderActiveState();
  }

  renderActiveState(){
    const current=this.selection();
    document.querySelectorAll('[data-playlist-id]').forEach(card=>{
      card.classList.toggle('selected',current.type==='playlist' && card.dataset.playlistId===current.id);
    });
  }

  renderBuiltIns(){
    const box=$('builtInPlaylists'); if(!box) return;
    box.replaceChildren();
    BUILT_INS.forEach(item=>box.appendChild(this.card(item,true)));
  }

  renderCustom(){
    const box=$('customPlaylists'); if(!box) return;
    box.replaceChildren();
    if(!this.custom.length){
      const empty=document.createElement('div'); empty.className='playlistEmpty'; empty.textContent='Aucune playlist personnelle pour le moment.'; box.appendChild(empty); return;
    }
    this.custom.forEach(item=>box.appendChild(this.card(item,false)));
  }

  card(item,builtIn){
    const article=document.createElement('article'); article.className='playlistCard'; article.dataset.playlistId=item.id;
    const names=item.zoneIds.map(id=>this.api.ZONES[id]?.name||id);
    article.innerHTML=`<div class="playlistCardTop"><div><b>${esc(item.name)}</b><small>${esc(item.description||'')}</small></div><span>${item.zoneIds.length} terrains</span></div><div class="playlistMapChips">${names.map(name=>`<i>${esc(name)}</i>`).join('')}</div><div class="playlistCardActions"><button type="button" class="primary">Utiliser</button>${builtIn?'':`<button type="button" class="secondary playlistEdit">Modifier</button><button type="button" class="secondary playlistDelete">Supprimer</button>`}</div>`;
    article.querySelector('.primary')?.addEventListener('click',()=>this.use(item,builtIn));
    article.querySelector('.playlistEdit')?.addEventListener('click',()=>this.beginEdit(item.id));
    article.querySelector('.playlistDelete')?.addEventListener('click',()=>this.removeCustom(item.id));
    return article;
  }

  use(item,builtIn){
    const selection={type:'playlist',id:item.id,name:item.name,zoneIds:item.zoneIds.slice(),builtIn:!!builtIn};
    this.game.setSelection(selection);
    this.game.showToast?.(`Playlist « ${item.name} » sélectionnée.`,1800);
    this.close();
    document.dispatchEvent(new CustomEvent('lostpin:v6-route-home',{detail:{target:'v6Play'}}));
  }

  selectedZoneIds(){
    return Array.from(document.querySelectorAll('#customPlaylistZones input[type="checkbox"]:checked')).map(x=>x.value).filter(id=>!!this.api.ZONES[id]);
  }

  beginEdit(id){
    const item=this.custom.find(x=>x.id===id); if(!item) return;
    this.editingId=id;
    if($('customPlaylistName')) $('customPlaylistName').value=item.name;
    const selected=new Set(item.zoneIds);
    document.querySelectorAll('#customPlaylistZones input[type="checkbox"]').forEach(x=>x.checked=selected.has(x.value));
    $('playlistEditNotice')?.classList.remove('hidden');
    if($('playlistEditName')) $('playlistEditName').textContent=item.name;
    if($('saveCustomPlaylist')) $('saveCustomPlaylist').textContent='Enregistrer et sélectionner';
    $('cancelPlaylistEdit')?.classList.remove('hidden');
    this.clearError();
  }

  cancelEdit(){
    this.editingId=null;
    if($('customPlaylistName')) $('customPlaylistName').value='';
    document.querySelectorAll('#customPlaylistZones input[type="checkbox"]').forEach(x=>x.checked=false);
    $('playlistEditNotice')?.classList.add('hidden');
    if($('playlistEditName')) $('playlistEditName').textContent='—';
    if($('saveCustomPlaylist')) $('saveCustomPlaylist').textContent='Créer et sélectionner';
    $('cancelPlaylistEdit')?.classList.add('hidden');
    this.clearError();
  }

  saveCustom(){
    this.clearError();
    const name=String($('customPlaylistName')?.value||'').trim().replace(/\s+/g,' ').slice(0,32);
    const zoneIds=uniqueZones(this.selectedZoneIds(),this.api.ZONES);
    if(!name){ this.showError('Donne un nom à la playlist.'); return; }
    if(zoneIds.length<2){ this.showError('Choisis au moins deux terrains.'); return; }
    let item;
    if(this.editingId){
      const index=this.custom.findIndex(x=>x.id===this.editingId);
      if(index<0){ this.cancelEdit(); return; }
      item={...this.custom[index],name,description:`${zoneIds.length} terrains personnalisés`,zoneIds};
      this.custom[index]=item;
    } else {
      item={id:makeId(),name,description:`${zoneIds.length} terrains personnalisés`,zoneIds};
      this.custom=[item,...this.custom].slice(0,MAX_CUSTOM);
    }
    writeJSON(STORAGE_KEY,this.custom);
    this.cancelEdit();
    this.render();
    this.use(item,false);
  }

  removeCustom(id){
    const item=this.custom.find(x=>x.id===id); if(!item) return;
    if(!window.confirm(`Supprimer la playlist « ${item.name} » ?`)) return;
    this.custom=this.custom.filter(x=>x.id!==id); writeJSON(STORAGE_KEY,this.custom);
    if(this.editingId===id) this.cancelEdit();
    const current=this.selection();
    if(current.type==='playlist' && current.id===id) this.game.setSelection({type:'zone',zoneId:'paris'});
    this.render();
  }

  clearError(){ const el=$('playlistError'); if(el){ el.textContent=''; el.classList.add('hidden'); } }
  showError(text){ const el=$('playlistError'); if(el){ el.textContent=text; el.classList.remove('hidden'); } }
}

function boot(){
  if(!window.guessrGame || !window.GUESSR_INTERNALS) return setTimeout(boot,50);
  window.lostPinPlaylists=new PlaylistController(window.guessrGame,window.GUESSR_INTERNALS);
}
boot();
})();
