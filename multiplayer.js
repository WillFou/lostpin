(() => {
'use strict';
const $ = id => document.getElementById(id);
const COLORS = ['#2f80ed','#7b61ff','#15b88a','#ff9f43','#f15b92','#20b6d2'];
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// Keep the original network namespace for compatibility with Guessr360 v3.9 clients.
const ROOM_NAMESPACE = 'guessr360';

function esc(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function roomCode() { let s=''; for (let i=0;i<5;i++) s += ROOM_ALPHABET[Math.floor(Math.random()*ROOM_ALPHABET.length)]; return s; }
function sanitizeName(v, fallback='Joueur') { return String(v || fallback).trim().replace(/\s+/g,' ').slice(0,18) || fallback; }

class MultiplayerController {
  constructor(game, api) {
    this.game = game;
    this.api = api;
    this.active = false;
    this.kind = null;
    this.isHost = false;
    this.started = false;
    this.players = [];
    this.localPlayerIndex = 0;
    this.round = 0;
    this.roundInfo = null;
    this.submissions = new Map();
    this.multiMarkers = [];
    this.peer = null;
    this.hostConn = null;
    this.connections = new Map();
    this.myId = null;
    this.myName = '';
    this.code = '';
    this.originalSubmit = game.submitGuess.bind(game);
    this.originalShowMenu = game.showMenu.bind(game);
    game.submitGuess = () => this.active ? this.submitCurrentGuess() : this.originalSubmit();
    game.showMenu = () => { if (this.active) this.cleanup(true); this.originalShowMenu(); };
    this.bindUI();
    this.renderLocalInputs(['Joueur 1','Joueur 2']);
  }

  bindUI() {
    $('multiplayerButton')?.addEventListener('click', () => this.openModal());
    $('closeMultiplayer')?.addEventListener('click', () => this.closeModal());
    $('multiplayerModal')?.addEventListener('click', e => { if (e.target === $('multiplayerModal') && !this.started) this.closeModal(); });
    $('addLocalPlayer')?.addEventListener('click', () => this.addLocalPlayer());
    $('startLocalMulti')?.addEventListener('click', () => this.startLocal());
    $('createOnlineRoom')?.addEventListener('click', () => this.createOnlineRoom());
    $('joinOnlineRoom')?.addEventListener('click', () => this.joinOnlineRoom());
    $('onlineStartGame')?.addEventListener('click', () => this.startOnlineAsHost());
    $('leaveOnlineLobby')?.addEventListener('click', () => { this.cleanup(true); this.resetOnlineLobby(); });
    $('multiReadyButton')?.addEventListener('click', () => this.beginLocalTurn(this.localPlayerIndex));
    $('multiNextRound')?.addEventListener('click', () => this.advanceAfterRound());
    $('multiEndMenu')?.addEventListener('click', () => { this.cleanup(true); this.game.showMenu(); });
    $('multiReplay')?.addEventListener('click', () => {
      const kind = this.kind;
      const names = this.players.map(p => p.name);
      this.hideMultiEnd();
      if (kind === 'local') this.startLocal(names);
      else if (kind === 'online' && this.isHost) this.restartOnlineHost();
    });
  }

  openModal() {
    if (!this.game.apiReady) { this.game.showToast?.('Google Maps doit etre pret avant de lancer le multijoueur.'); return; }
    $('multiplayerModal')?.classList.remove('hidden');
    this.resetOnlineLobby(false);
  }
  closeModal() { if (!this.started) $('multiplayerModal')?.classList.add('hidden'); }

  renderLocalInputs(names) {
    const box = $('localPlayers'); if (!box) return;
    box.replaceChildren();
    names.slice(0,4).forEach((name,i) => {
      const row = document.createElement('div'); row.className='localPlayerRow';
      row.innerHTML = `<span class="playerColor" style="background:${COLORS[i]}">${i+1}</span><input maxlength="18" value="${esc(name)}" aria-label="Nom du joueur ${i+1}"><button class="icon removeLocalPlayer" title="Retirer" ${i<2?'disabled':''}>&times;</button>`;
      row.querySelector('.removeLocalPlayer')?.addEventListener('click', () => {
        const vals = this.localNames(); vals.splice(i,1); this.renderLocalInputs(vals);
      });
      box.appendChild(row);
    });
  }
  localNames() { return Array.from($('localPlayers')?.querySelectorAll('input') || []).map((x,i) => sanitizeName(x.value,`Joueur ${i+1}`)); }
  addLocalPlayer() { const names=this.localNames(); if (names.length>=4) return; names.push(`Joueur ${names.length+1}`); this.renderLocalInputs(names); }

  async startLocal(namesOverride=null) {
    const names = (namesOverride || this.localNames()).filter(Boolean).slice(0,4);
    if (names.length < 2) { this.setModalError('Ajoute au moins deux joueurs.'); return; }
    this.cleanup(true);
    this.active=true; this.kind='local'; this.isHost=true; this.started=true; this.round=0; this.localPlayerIndex=0;
    this.players = names.map((name,i) => ({id:`local-${i}`,name:sanitizeName(name,`Joueur ${i+1}`),total:0,rounds:[]}));
    $('multiplayerModal')?.classList.add('hidden');
    await this.prepareShell();
    await this.loadHostRound();
  }

  async prepareShell() {
    await this.game.prepareSelectedZone();
    this.game.ensureGoogleObjects();
    $('startScreen').classList.add('hidden'); $('endScreen').classList.add('hidden'); this.hideMultiEnd();
    $('gameScreen').classList.remove('hidden'); this.game.panorama.setVisible(true);
    $('multiHud')?.classList.remove('hidden');
  }

  async loadHostRound() {
    this.clearMultiMarkers(); this.submissions.clear();
    this.game.round = this.round; this.game.total = 0; this.game.results = [];
    await this.game.loadRound();
    if (!this.active) return;
    this.roundInfo = {
      pano:this.game.startPano,
      answer:{...this.game.answer},
      description:this.game.startDescription,
      heading:this.game.startPov?.heading || 0,
      zoneId:this.game.zoneId,
      mode:this.game.mode,
      round:this.round
    };
    if (this.kind === 'local') {
      this.localPlayerIndex = 0;
      this.beginLocalTurn(0);
    } else if (this.kind === 'online' && this.isHost) {
      this.broadcast({type:'round:start',...this.roundInfo});
      this.beginOnlineRoundForSelf();
    }
  }

  resetRoundView(player) {
    const zone = this.api.ZONES[this.game.zoneId];
    this.game.guess = null;
    this.game.answer = {...this.roundInfo.answer};
    this.game.startPano = this.roundInfo.pano;
    this.game.startDescription = this.roundInfo.description;
    this.game.startPov = {heading:this.roundInfo.heading,pitch:0,zoom:0};
    this.game.currentPano = this.roundInfo.pano;
    this.game.navHistory=[]; this.game.moveCount=0; this.game.maxTravel=0; this.game.currentTravel=0;
    this.game.startTime=Date.now();
    this.game.configureGuessMap(zone);
    $('resultPanel').classList.add('hidden'); $('gameScreen').classList.remove('has-result');
    $('guessButton').disabled=true; $('guessButton').textContent='Place ton marqueur';
    $('roundLabel').textContent=`${this.round+1} / 5`; $('scoreLabel').textContent=(player?.total||0).toLocaleString('fr-FR');
    $('zoneLabel').textContent=zone.name;
    const noMove=this.game.mode==='nomove';
    this.game.panorama.setOptions({addressControl:false,clickToGo:!noMove,linksControl:!noMove,panControl:false,zoomControl:false,fullscreenControl:false,showRoadLabels:false,imageDateControl:false,enableCloseButton:false,motionTracking:false,motionTrackingControl:false});
    this.game.panorama.setPano(this.roundInfo.pano); this.game.panorama.setPov({heading:this.roundInfo.heading,pitch:0}); this.game.panorama.setZoom(0); this.game.panorama.setVisible(true);
    this.game.updateTravelUI(); this.game.updateCompass();
    $('multiRoundPanel')?.classList.add('hidden'); $('multiWaiting')?.classList.add('hidden');
  }

  beginLocalTurn(index) {
    if (!this.active || this.kind!=='local') return;
    this.localPlayerIndex=index; const p=this.players[index];
    $('multiTurnOverlay')?.classList.add('hidden');
    this.resetRoundView(p); this.updateMultiHud(p, `Joueur ${index+1}/${this.players.length}`);
  }

  showHandoff(nextIndex) {
    const next=this.players[nextIndex];
    $('multiTurnName').textContent=next.name;
    $('multiTurnText').textContent=`Manche ${this.round+1}/5 · ${next.total.toLocaleString('fr-FR')} pts`;
    $('multiTurnOverlay').classList.remove('hidden');
    this.localPlayerIndex=nextIndex;
  }

  submitCurrentGuess() {
    if (!this.active || !this.game.guess || !this.roundInfo) return;
    if (this.kind==='local') return this.submitLocal();
    if (this.kind==='online') return this.submitOnline();
  }

  scoreGuess(guess) {
    const zone=this.api.ZONES[this.game.zoneId];
    const distance=this.api.haversine(guess,this.roundInfo.answer);
    const points=this.api.scoreFor(distance,zone.scale);
    const seconds=Math.max(1,Math.round((Date.now()-this.game.startTime)/1000));
    return {guess:{...guess},distance,points,seconds,moves:this.game.moveCount||0,travel:this.game.maxTravel||0};
  }

  submitLocal() {
    const p=this.players[this.localPlayerIndex];
    const res=this.scoreGuess(this.game.guess); p.total+=res.points; p.rounds[this.round]=res; this.submissions.set(p.id,{player:p,...res});
    $('guessButton').disabled=true;
    this.game.panorama?.setOptions({clickToGo:false,linksControl:false});
    if (this.localPlayerIndex < this.players.length-1) this.showHandoff(this.localPlayerIndex+1);
    else this.finishRound(Array.from(this.submissions.values()));
  }

  updateMultiHud(player, extra='') {
    if (!$('multiHud')) return;
    $('multiHudName').textContent=player?.name || 'Multijoueur';
    $('multiHudScore').textContent=`${(player?.total||0).toLocaleString('fr-FR')} pts`;
    $('multiHudExtra').textContent=extra;
  }

  finishRound(entries, fromNetwork=false) {
    entries.sort((a,b)=>b.points-a.points || a.seconds-b.seconds);
    this.renderResultMarkers(entries);
    const body=$('multiRoundRanking'); body.replaceChildren();
    entries.forEach((e,i)=>{
      const row=document.createElement('div'); row.className='multiRankRow';
      const total=e.player?.total ?? e.total ?? 0;
      row.innerHTML=`<span class="multiPlace">${i+1}</span><span><b>${esc(e.player?.name||e.name)}</b><small>${this.api.formatDistance(e.distance)} · ${e.seconds}s</small></span><strong>${e.points.toLocaleString('fr-FR')} pts</strong><em>${Number(total).toLocaleString('fr-FR')} total</em>`;
      body.appendChild(row);
    });
    $('multiRoundTitle').textContent=`Manche ${this.round+1} terminee`;
    $('multiRoundPlace').textContent=this.roundInfo.description || this.api.ZONES[this.game.zoneId].name;
    $('multiRoundPanel').classList.remove('hidden');
    $('guessButton').disabled=true; this.game.panorama?.setOptions({clickToGo:false,linksControl:false});
    const next=$('multiNextRound');
    if (this.kind==='online' && !this.isHost) { next.classList.add('hidden'); $('multiWaiting').classList.remove('hidden'); $('multiWaiting').textContent="En attente de l'hote..."; }
    else { next.classList.remove('hidden'); next.textContent=this.round===4?'Voir le classement final':'Manche suivante'; }
    if (fromNetwork) this.game.total=this.myPlayer()?.total||0;
  }

  renderResultMarkers(entries) {
    this.clearMultiMarkers();
    this.game.configureGuessMap(this.api.ZONES[this.game.zoneId]);
    const bounds=new google.maps.LatLngBounds();
    entries.forEach((e,i)=>{
      const pos=e.guess; if (!pos) return; bounds.extend(pos);
      const marker=new google.maps.Marker({map:this.game.map,position:pos,zIndex:3+i,label:{text:String(i+1),color:'#fff',fontWeight:'900'},icon:{path:google.maps.SymbolPath.CIRCLE,scale:11,fillColor:COLORS[i%COLORS.length],fillOpacity:1,strokeColor:'#fff',strokeWeight:3}});
      this.multiMarkers.push(marker);
    });
    const answer=this.roundInfo.answer; bounds.extend(answer);
    this.multiMarkers.push(new google.maps.Marker({map:this.game.map,position:answer,zIndex:20,label:{text:'R',color:'#fff',fontWeight:'900'},icon:{path:google.maps.SymbolPath.CIRCLE,scale:12,fillColor:'#e53935',fillOpacity:1,strokeColor:'#fff',strokeWeight:3}}));
    this.game.map.fitBounds(bounds,65);
  }
  clearMultiMarkers(){ this.multiMarkers.forEach(m=>m.setMap(null)); this.multiMarkers=[]; }

  advanceAfterRound() {
    if (!this.active) return;
    if (this.kind==='online' && !this.isHost) return;
    if (this.round>=4) {
      if (this.kind==='online') this.broadcast({type:'game:end',players:this.serializedPlayers()});
      this.showMultiEnd(); return;
    }
    this.round++;
    $('multiRoundPanel').classList.add('hidden');
    this.loadHostRound().catch(e=>this.fatalMulti(e));
  }

  showMultiEnd(playersOverride=null) {
    const list=(playersOverride || this.players).slice().sort((a,b)=>b.total-a.total);
    $('gameScreen').classList.add('hidden'); $('multiEndScreen').classList.remove('hidden');
    const box=$('multiFinalRanking'); box.replaceChildren();
    list.forEach((p,i)=>{
      const row=document.createElement('div'); row.className='multiFinalRow';
      row.innerHTML=`<span class="multiFinalPlace">${i===0?'🏆':i+1}</span><span><b>${esc(p.name)}</b><small>${p.rounds?.length||5} manches</small></span><strong>${Number(p.total||0).toLocaleString('fr-FR')}</strong>`;
      box.appendChild(row);
    });
    $('multiChampion').textContent=list[0]?.name || '';
    $('multiReplay').classList.toggle('hidden', this.kind==='online' && !this.isHost);
  }
  hideMultiEnd(){ $('multiEndScreen')?.classList.add('hidden'); }

  // ---------------- Online peer-to-peer ----------------
  ensurePeerAvailable(){ if (!window.Peer) throw new Error("Le module multijoueur en ligne n'a pas pu etre charge. Verifie ta connexion Internet."); }

  createOnlineRoom() {
    try { this.ensurePeerAvailable(); } catch(e){ return this.setModalError(e.message); }
    this.cleanupPeer(); this.myName=sanitizeName($('onlineName').value,'Hote'); this.code=roomCode(); this.isHost=true; this.kind='online';
    const id=`${ROOM_NAMESPACE}-${this.code.toLowerCase()}`;
    this.peer=new Peer(id,{debug:1});
    this.setOnlineStatus('Creation de la salle...');
    this.peer.on('open', peerId=>{
      this.myId=peerId; this.players=[{id:peerId,name:this.myName,total:0,rounds:[],host:true}];
      this.showOnlineLobby(); this.renderOnlineLobby();
      this.peer.on('connection', conn=>this.acceptConnection(conn));
    });
    this.peer.on('error', err=>this.peerError(err,true));
  }

  joinOnlineRoom() {
    try { this.ensurePeerAvailable(); } catch(e){ return this.setModalError(e.message); }
    const code=String($('onlineRoomCode').value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
    if (code.length!==5) { this.setModalError('Entre un code de salle de 5 caracteres.'); return; }
    this.cleanupPeer(); this.myName=sanitizeName($('onlineName').value,'Joueur'); this.code=code; this.isHost=false; this.kind='online';
    this.peer=new Peer(undefined,{debug:1}); this.setOnlineStatus('Connexion a la salle...');
    this.peer.on('open', peerId=>{
      this.myId=peerId; const conn=this.peer.connect(`${ROOM_NAMESPACE}-${code.toLowerCase()}`,{reliable:true,metadata:{name:this.myName}}); this.hostConn=conn;
      conn.on('open',()=>{ conn.send({type:'hello',name:this.myName}); this.showOnlineLobby(); this.setOnlineStatus('Connecte.'); });
      conn.on('data',data=>this.handleGuestData(data));
      conn.on('close',()=>this.onlineDisconnected('Connexion avec l\'hote fermee.'));
      conn.on('error',e=>this.onlineDisconnected(e.message));
    });
    this.peer.on('error',err=>this.peerError(err,false));
  }

  acceptConnection(conn) {
    if (this.started) { conn.on('open',()=>{conn.send({type:'error',message:'La partie a deja commence.'}); setTimeout(()=>conn.close(),300);}); return; }
    if (this.players.length>=6) { conn.on('open',()=>{conn.send({type:'error',message:'Salle complete (6 joueurs max).'}); setTimeout(()=>conn.close(),300);}); return; }
    this.connections.set(conn.peer,conn);
    conn.on('data',data=>this.handleHostData(conn,data));
    conn.on('close',()=>{ this.connections.delete(conn.peer); this.players=this.players.filter(p=>p.id!==conn.peer); this.broadcastLobby(); this.renderOnlineLobby(); this.checkOnlineRoundComplete(); });
  }

  handleHostData(conn,data) {
    if (!data || typeof data!=='object') return;
    if (data.type==='hello' && !this.started) {
      const name=sanitizeName(data.name,`Joueur ${this.players.length+1}`);
      const existing=this.players.find(p=>p.id===conn.peer);
      if (existing) existing.name=name; else this.players.push({id:conn.peer,name,total:0,rounds:[],host:false});
      this.broadcastLobby(); this.renderOnlineLobby();
    } else if (data.type==='guess' && this.started && data.round===this.round) {
      this.recordOnlineGuess(conn.peer,data);
    }
  }

  handleGuestData(data) {
    if (!data || typeof data!=='object') return;
    if (data.type==='error') { this.setModalError(data.message); return; }
    if (data.type==='lobby') { this.players=data.players||[]; this.renderOnlineLobby(); return; }
    if (data.type==='round:start') { this.applySharedRound(data).catch(e=>this.fatalMulti(e)); return; }
    if (data.type==='round:status') { this.renderOnlineStatus(data); return; }
    if (data.type==='round:results') {
      this.players=data.players||this.players; this.roundInfo={...this.roundInfo,answer:data.answer,description:data.description};
      const entries=(data.results||[]).map(r=>({...r,player:this.players.find(p=>p.id===r.id)||{name:r.name,total:r.total}}));
      this.finishRound(entries,true); return;
    }
    if (data.type==='game:end') { this.players=data.players||this.players; this.showMultiEnd(); }
  }

  broadcastLobby() { this.broadcast({type:'lobby',players:this.serializedPlayers(),code:this.code,zoneId:this.game.zoneId,mode:this.game.mode}); }
  broadcast(data) { for (const conn of this.connections.values()) if (conn.open) { try{conn.send(data);}catch(_){}} }
  serializedPlayers(){ return this.players.map(p=>({id:p.id,name:p.name,total:p.total||0,rounds:p.rounds||[],host:!!p.host})); }

  showOnlineLobby() { $('onlineLobby').classList.remove('hidden'); $('onlineSetup').classList.add('hidden'); $('onlineRoomCodeDisplay').textContent=this.code; }
  resetOnlineLobby(resetSetup=true) { if (resetSetup){ $('onlineLobby')?.classList.add('hidden'); $('onlineSetup')?.classList.remove('hidden'); } this.setModalError(''); }
  renderOnlineLobby() {
    if (!$('onlinePlayerList')) return;
    $('onlineRoomCodeDisplay').textContent=this.code||'-----';
    const box=$('onlinePlayerList'); box.replaceChildren();
    this.players.forEach((p,i)=>{ const row=document.createElement('div'); row.className='onlinePlayer'; row.innerHTML=`<span class="playerColor" style="background:${COLORS[i%COLORS.length]}">${i+1}</span><b>${esc(p.name)}</b>${p.host?'<small>hote</small>':''}`; box.appendChild(row); });
    $('onlineStartGame').classList.toggle('hidden',!this.isHost);
    $('onlineStartGame').disabled=this.players.length<2;
    this.setOnlineStatus(this.players.length<2?'En attente d\'un deuxieme joueur...':`${this.players.length} joueurs prets.`);
  }

  async startOnlineAsHost() {
    if (!this.isHost || this.players.length<2) return;
    this.active=true; this.started=true; this.round=0; this.players.forEach(p=>{p.total=0;p.rounds=[];});
    $('multiplayerModal').classList.add('hidden'); await this.prepareShell(); this.broadcastLobby(); await this.loadHostRound();
  }

  beginOnlineRoundForSelf() {
    const me=this.myPlayer(); this.resetRoundView(me); this.updateMultiHud(me,`Salle ${this.code} · hote`); this.renderOnlineStatus({submitted:[]});
  }

  async applySharedRound(data) {
    this.active=true; this.started=true; this.kind='online'; this.isHost=false; this.round=data.round; this.game.zoneId=data.zoneId; this.game.mode=data.mode;
    await this.prepareShell();
    this.roundInfo={pano:data.pano,answer:data.answer,description:data.description,heading:data.heading,zoneId:data.zoneId,mode:data.mode,round:data.round};
    const me=this.myPlayer(); this.resetRoundView(me); this.updateMultiHud(me,`Salle ${this.code}`);
    $('multiplayerModal').classList.add('hidden');
  }

  submitOnline() {
    const me=this.myPlayer(); if (!me || this.submissions.has(me.id)) return;
    const payload={type:'guess',round:this.round,guess:{...this.game.guess},seconds:Math.max(1,Math.round((Date.now()-this.game.startTime)/1000)),moves:this.game.moveCount||0,travel:this.game.maxTravel||0};
    $('guessButton').disabled=true; $('guessButton').textContent='Reponse envoyee'; this.game.panorama?.setOptions({clickToGo:false,linksControl:false});
    if (this.isHost) this.recordOnlineGuess(me.id,payload); else { this.hostConn?.send(payload); $('multiWaiting').classList.remove('hidden'); $('multiWaiting').textContent='Reponse envoyee · en attente des autres joueurs...'; }
  }

  recordOnlineGuess(id,data) {
    if (this.submissions.has(id) || !data.guess) return;
    const player=this.players.find(p=>p.id===id); if (!player) return;
    const scored=this.scoreGuess(data.guess); scored.seconds=Number(data.seconds)||scored.seconds; scored.moves=Number(data.moves)||0; scored.travel=Number(data.travel)||0;
    this.submissions.set(id,{player,...scored});
    this.broadcast({type:'round:status',submitted:Array.from(this.submissions.keys())});
    this.renderOnlineStatus({submitted:Array.from(this.submissions.keys())});
    this.checkOnlineRoundComplete();
  }

  checkOnlineRoundComplete() {
    if (!this.isHost || !this.started || !this.players.length) return;
    const activeIds=this.players.map(p=>p.id);
    if (!activeIds.every(id=>this.submissions.has(id))) return;
    const entries=activeIds.map(id=>this.submissions.get(id)).filter(Boolean);
    entries.forEach(e=>{ e.player.total=(e.player.total||0)+e.points; e.player.rounds[this.round]={points:e.points,distance:e.distance}; });
    const results=entries.map(e=>({id:e.player.id,name:e.player.name,total:e.player.total,guess:e.guess,distance:e.distance,points:e.points,seconds:e.seconds,moves:e.moves,travel:e.travel}));
    this.broadcast({type:'round:results',round:this.round,answer:this.roundInfo.answer,description:this.roundInfo.description,results,players:this.serializedPlayers()});
    this.finishRound(entries);
  }

  renderOnlineStatus(data) {
    const submitted=new Set(data?.submitted||[]); const parts=this.players.map(p=>`${submitted.has(p.id)?'✓':'…'} ${p.name}`);
    const el=$('multiOnlineStatus'); if (el) { el.textContent=parts.join('   '); el.classList.toggle('hidden', this.kind!=='online' || !this.active); }
  }

  myPlayer(){ return this.players.find(p=>p.id===this.myId) || (this.kind==='local'?this.players[this.localPlayerIndex]:null); }

  restartOnlineHost(){ if (!this.isHost) return; this.round=0; this.players.forEach(p=>{p.total=0;p.rounds=[];}); this.active=true; this.started=true; this.prepareShell().then(()=>this.loadHostRound()).catch(e=>this.fatalMulti(e)); }

  peerError(err,isHost) {
    const type=err?.type||'';
    const msg=type==='unavailable-id'?'Ce code de salle est deja utilise. Reessaie.':type==='peer-unavailable'?'Salle introuvable. Verifie le code et assure-toi que l\'hote a bien cree la salle et la garde ouverte.':(err?.message||'Erreur de connexion multijoueur.');
    this.setModalError(msg); this.setOnlineStatus(msg); if (isHost && type==='unavailable-id') setTimeout(()=>this.createOnlineRoom(),400);
  }
  onlineDisconnected(msg) { if (this.started) this.fatalMulti(new Error(msg)); else { this.setModalError(msg); this.resetOnlineLobby(); } }

  setModalError(text) { const e=$('multiError'); if (!e) return; e.textContent=text||''; e.classList.toggle('hidden',!text); }
  setOnlineStatus(text) { if ($('onlineStatus')) $('onlineStatus').textContent=text; }
  fatalMulti(error) { console.error(error); this.game.showToast?.(error.message||'Erreur multijoueur',5000); this.cleanup(false); this.originalShowMenu(); }

  cleanupPeer(){ try{this.hostConn?.close();}catch(_){} for(const c of this.connections.values())try{c.close();}catch(_){} this.connections.clear(); try{this.peer?.destroy();}catch(_){} this.peer=null; this.hostConn=null; }
  cleanup(closePeer=true) {
    this.clearMultiMarkers(); this.active=false; this.started=false; this.submissions.clear(); $('multiHud')?.classList.add('hidden'); $('multiOnlineStatus')?.classList.add('hidden'); $('multiRoundPanel')?.classList.add('hidden'); $('multiTurnOverlay')?.classList.add('hidden'); $('multiWaiting')?.classList.add('hidden');
    if (closePeer) { this.cleanupPeer(); this.resetOnlineLobby(true); }
  }
}

function boot() {
  if (!window.guessrGame || !window.GUESSR_INTERNALS) return setTimeout(boot,50);
  window.guessrMultiplayer = new MultiplayerController(window.guessrGame, window.GUESSR_INTERNALS);
}
boot();
})();
