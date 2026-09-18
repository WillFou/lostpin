(() => {
'use strict';
const $ = id => document.getElementById(id);
const COLORS = ['#2f80ed','#7b61ff','#15b88a','#ff9f43','#f15b92','#20b6d2'];
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// Keep the original network namespace for compatibility with older LostPin / Guessr360 rooms.
const ROOM_NAMESPACE = 'guessr360';
const DEFAULT_ONLINE_ROUND_SECONDS = 60;
const ONLINE_ROUND_OPTIONS = new Set([60,120,180]);
const DEFAULT_ONLINE_ROUND_COUNT = 5;
const ONLINE_ROUND_COUNT_OPTIONS = new Set([3,5,10]);
const ONLINE_MOVEMENT_OPTIONS = new Set(['explore','nomove','nmpz']);
const DEFAULT_ONLINE_GAME_MODE = 'classic';
const ONLINE_GAME_MODE_OPTIONS = new Set(['classic','duel','elimination']);
const DUEL_START_HP = 6000;
const ONLINE_FINAL_COUNTDOWN_SECONDS = 20;
const ONLINE_PROTOCOL_VERSION = 5;
const PLAYER_AVATARS = ['🧭','🗺️','🌍','🚀','🦊','🐼','🦉','🌙'];
const PLAYER_EMOTES = ['🔥','😎','🤔','👀','😭'];
const ONLINE_HISTORY_KEY = 'lostpin-online-history-v1';
const ONLINE_NAME_KEY = 'lostpin-online-name';
const ONLINE_AVATAR_KEY = 'lostpin-online-avatar';
const ONLINE_COLOR_KEY = 'lostpin-online-color';
const EMOTE_COOLDOWN_MS = 900;
const PHOTO_FINISH_POINTS_PER_ROUND = 25;
const RECONNECT_MAX_ATTEMPTS = 4;
const MULTI_PANEL_COLLAPSED_KEY = 'lostpin-multi-panel-collapsed';

function esc(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function roomCode() { let s=''; for (let i=0;i<5;i++) s += ROOM_ALPHABET[Math.floor(Math.random()*ROOM_ALPHABET.length)]; return s; }
function sanitizeName(v, fallback='Joueur') { return String(v || fallback).trim().replace(/\s+/g,' ').slice(0,18) || fallback; }
function movementLabel(mode) { return mode==='nomove' ? 'No Move' : mode==='nmpz' ? 'No Move + No Pan/Zoom' : 'Move'; }
function gameModeLabel(mode) { return mode==='duel' ? 'Duel' : mode==='elimination' ? 'Élimination' : 'Classique'; }
function sanitizeAvatar(value) { return PLAYER_AVATARS.includes(value) ? value : PLAYER_AVATARS[0]; }
function sanitizeColor(value) { return COLORS.includes(value) ? value : COLORS[0]; }
function sanitizeEmote(value) { return PLAYER_EMOTES.includes(value) ? value : null; }
function playerAvatar(player,index=0) { return sanitizeAvatar(player?.avatar || PLAYER_AVATARS[index % PLAYER_AVATARS.length]); }
function playerColor(player,index=0) { return sanitizeColor(player?.color || COLORS[index % COLORS.length]); }
function escapeAttr(text) { return esc(text).replace(/`/g,'&#96;'); }
function makeClientToken() {
  try {
    const key='lostpin-online-client-token';
    let value=sessionStorage.getItem(key);
    if (!value) {
      value=(crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem(key,value);
    }
    return value;
  } catch (_) {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

class MultiplayerController {
  constructor(game, api) {
    this.game = game;
    this.api = api;
    this.active = false;
    this.kind = null;
    this.isHost = false;
    this.started = false;
    this.gameEnded = false;
    this.players = [];
    this.localPlayerIndex = 0;
    this.round = 0;
    this.roundInfo = null;
    this.lastRoundResults = null;
    this.submissions = new Map();
    this.multiMarkers = [];
    this.peer = null;
    this.hostConn = null;
    this.connections = new Map();
    this.myId = null;
    this.myName = '';
    this.code = '';
    this.clientToken = makeClientToken();
    this.myAvatar = sanitizeAvatar(localStorage.getItem(ONLINE_AVATAR_KEY) || PLAYER_AVATARS[0]);
    this.myColor = sanitizeColor(localStorage.getItem(ONLINE_COLOR_KEY) || COLORS[0]);
    this.lastEmoteAt = 0;
    this.emoteHideTimer = null;
    this.rematchRequests = new Set();
    this.gameHistoryRecorded = false;
    this.roundClosed = false;
    this.guessLocked = false;
    this.submittedIds = new Set();
    this.timerInterval = null;
    this.roundDeadline = 0;
    this.lastTimerSecond = null;
    this.onlineRoundSeconds = DEFAULT_ONLINE_ROUND_SECONDS;
    this.onlineRoundCount = DEFAULT_ONLINE_ROUND_COUNT;
    this.onlineMovementMode = 'explore';
    this.onlineGameMode = DEFAULT_ONLINE_GAME_MODE;
    this.lastModeEvent = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.closingPeer = false;
    this.multiCompactCollapsed = false;
    this.originalSubmit = game.submitGuess.bind(game);
    this.originalShowMenu = game.showMenu.bind(game);
    this.originalSetGuess = game.setGuess.bind(game);
    game.submitGuess = () => this.active ? this.submitCurrentGuess() : this.originalSubmit();
    game.setGuess = pos => {
      if (this.active && this.kind === 'online' && this.guessLocked) return;
      this.originalSetGuess(pos);
    };
    game.showMenu = () => { if (this.active || this.kind === 'online') this.cleanup(true); this.originalShowMenu(); };
    this.bindUI();
    this.initializeOnlineIdentity();
    this.renderOnlineHistory();
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
    $('onlineReadyButton')?.addEventListener('click', () => this.toggleOnlineReady());
    $('onlineStartGame')?.addEventListener('click', () => this.startOnlineAsHost());
    $('leaveOnlineLobby')?.addEventListener('click', () => { this.cleanup(true); this.resetOnlineLobby(); });
    $('multiReadyButton')?.addEventListener('click', () => this.beginLocalTurn(this.localPlayerIndex));
    $('multiNextRound')?.addEventListener('click', () => this.advanceAfterRound());
    $('multiEndMenu')?.addEventListener('click', () => { this.hideMultiEnd(); this.cleanup(true); this.originalShowMenu(); });
    $('multiReplay')?.addEventListener('click', () => {
      const kind = this.kind;
      const names = this.players.map(p => p.name);
      if (kind === 'local') { this.hideMultiEnd(); this.startLocal(names); }
      else if (kind === 'online' && this.isHost) { this.hideMultiEnd(); this.returnToOnlineLobbyForRematch(); }
      else if (kind === 'online') this.requestRematch();
    });
    $('copyRoomCode')?.addEventListener('click', () => this.copyRoomCode());
    $('onlineName')?.addEventListener('input', () => this.renderIdentityChoices());
    $('onlineName')?.addEventListener('change', () => this.persistOnlineIdentity());
    document.querySelectorAll('.multiEmoteButton').forEach(button => button.addEventListener('click', () => this.sendEmote(button.dataset.emote)));
    $('multiCompactToggle')?.addEventListener('click', () => this.toggleMultiCompactPanel());
    this.loadMultiCompactPanelState();
    this.applyMultiCompactPanelState();
  }

  loadMultiCompactPanelState() {
    try { this.multiCompactCollapsed = localStorage.getItem(MULTI_PANEL_COLLAPSED_KEY) === '1'; } catch (_) { this.multiCompactCollapsed = false; }
  }

  applyMultiCompactPanelState() {
    const panel = $('multiCompactPanel');
    const button = $('multiCompactToggle');
    if (!panel || !button) return;
    panel.classList.toggle('is-collapsed', !!this.multiCompactCollapsed);
    button.setAttribute('aria-expanded', this.multiCompactCollapsed ? 'false' : 'true');
    button.setAttribute('aria-label', this.multiCompactCollapsed ? 'Déplier le panneau Joueurs / Réactions' : 'Réduire le panneau Joueurs / Réactions');
    button.title = this.multiCompactCollapsed ? 'Déplier le panneau' : 'Réduire le panneau';
    button.innerHTML = this.multiCompactCollapsed ? '&#43;' : '&#8722;';
  }

  toggleMultiCompactPanel(force) {
    this.multiCompactCollapsed = typeof force === 'boolean' ? force : !this.multiCompactCollapsed;
    try { localStorage.setItem(MULTI_PANEL_COLLAPSED_KEY, this.multiCompactCollapsed ? '1' : '0'); } catch (_) {}
    this.applyMultiCompactPanelState();
  }

  initializeOnlineIdentity() {
    try {
      const savedName=localStorage.getItem(ONLINE_NAME_KEY);
      if (savedName && $('onlineName')) $('onlineName').value=sanitizeName(savedName,'Joueur');
    } catch (_) {}
    const avatarBox=$('onlineAvatarChoices'), colorBox=$('onlineColorChoices');
    if (avatarBox) {
      avatarBox.replaceChildren();
      PLAYER_AVATARS.forEach(avatar=>{
        const button=document.createElement('button'); button.type='button'; button.className='identityChoice'; button.dataset.avatar=avatar; button.textContent=avatar; button.title=`Avatar ${avatar}`;
        button.addEventListener('click',()=>{this.myAvatar=avatar; this.persistOnlineIdentity(); this.renderIdentityChoices();});
        avatarBox.appendChild(button);
      });
    }
    if (colorBox) {
      colorBox.replaceChildren();
      COLORS.forEach((color,index)=>{
        const button=document.createElement('button'); button.type='button'; button.className='identityChoice colorChoice'; button.dataset.color=color; button.style.setProperty('--player-color',color); button.title=`Couleur ${index+1}`;
        button.addEventListener('click',()=>{this.myColor=color; this.persistOnlineIdentity(); this.renderIdentityChoices();});
        colorBox.appendChild(button);
      });
    }
    this.renderIdentityChoices();
  }

  renderIdentityChoices() {
    document.querySelectorAll('#onlineAvatarChoices [data-avatar]').forEach(button=>button.classList.toggle('selected',button.dataset.avatar===this.myAvatar));
    document.querySelectorAll('#onlineColorChoices [data-color]').forEach(button=>button.classList.toggle('selected',button.dataset.color===this.myColor));
    const preview=$('onlineIdentityPreview');
    if (preview) preview.innerHTML=`<span class="playerAvatar" style="--player-color:${this.myColor}">${esc(this.myAvatar)}</span><span><b>${esc(sanitizeName($('onlineName')?.value,'Joueur'))}</b><br><small>Cette identité sera visible dans le lobby, les classements et les réactions.</small></span>`;
  }

  persistOnlineIdentity() {
    this.myName=sanitizeName($('onlineName')?.value || this.myName,'Joueur');
    try {
      localStorage.setItem(ONLINE_NAME_KEY,this.myName);
      localStorage.setItem(ONLINE_AVATAR_KEY,this.myAvatar);
      localStorage.setItem(ONLINE_COLOR_KEY,this.myColor);
    } catch (_) {}
    this.renderIdentityChoices();
  }

  playerAvatarHtml(player,index=0,compact=false) {
    const avatar=playerAvatar(player,index), color=playerColor(player,index);
    return `<span class="playerAvatar${compact?' compact':''}" style="--player-color:${color}" aria-hidden="true">${esc(avatar)}</span>`;
  }

  copyRoomCode() {
    if (!this.code) return;
    const copied=()=>this.game.showToast?.(`Code ${this.code} copié.`,1800);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(this.code).then(copied).catch(()=>this.game.showToast?.(`Code de salle : ${this.code}`,3000));
    else this.game.showToast?.(`Code de salle : ${this.code}`,3000);
  }

  readOnlineHistory() {
    try {
      const value=JSON.parse(localStorage.getItem(ONLINE_HISTORY_KEY)||'[]');
      return Array.isArray(value) ? value.slice(0,10) : [];
    } catch (_) { return []; }
  }

  renderOnlineHistory() {
    const box=$('onlineHistory'); if (!box) return;
    const history=this.readOnlineHistory(); box.replaceChildren();
    if (!history.length) { const empty=document.createElement('div'); empty.className='historyEmpty'; empty.textContent='Aucune partie en ligne enregistrée pour le moment.'; box.appendChild(empty); return; }
    history.slice(0,6).forEach(item=>{
      const row=document.createElement('div'); row.className='historyRow';
      let when=''; try { when=new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(item.date)); } catch (_) { when=''; }
      const place=Number(item.place)||0, players=Number(item.playerCount)||0;
      const opponents=Array.isArray(item.opponents) && item.opponents.length ? ` · avec ${item.opponents.map(esc).join(', ')}` : '';
      row.innerHTML=`<time>${esc(when)}</time><span><b>${esc(gameModeLabel(item.gameMode))} · ${esc(item.zone||'Map')} · ${esc(item.mode||'Move')}</b><small>${players} joueurs · ${Number(item.roundCount)||5} manches · ${Number(item.timerSeconds)||60} s${opponents}</small></span><span class="historyPlace">${place?`${place}${place===1?'er':'e'}`:'—'} · ${Number(item.score||0).toLocaleString('fr-FR')} pts</span>`;
      box.appendChild(row);
    });
  }

  recordOnlineHistory(sortedPlayers) {
    if (this.kind!=='online' || this.gameHistoryRecorded) return;
    const me=this.myPlayer(); if (!me) return;
    const playerIndex=sortedPlayers.findIndex(p=>p.id===me.id || (p.token && p.token===this.clientToken)); if (playerIndex<0) return;
    const place=playerIndex+1;
    const entry={date:new Date().toISOString(),zone:this.api.ZONES[this.game.zoneId]?.name||this.game.zoneId||'Map',mode:movementLabel(this.onlineMovementMode),gameMode:this.onlineGameMode,roundCount:this.getRoundCount(),timerSeconds:this.onlineRoundSeconds,playerCount:sortedPlayers.length,place,score:Number(me.total||0),opponents:sortedPlayers.filter(p=>p.id!==me.id).map(p=>p.name).slice(0,5)};
    try { localStorage.setItem(ONLINE_HISTORY_KEY,JSON.stringify([entry,...this.readOnlineHistory()].slice(0,10))); } catch (_) {}
    this.gameHistoryRecorded=true; this.renderOnlineHistory();
  }

  sendEmote(rawEmote) {
    const emote=sanitizeEmote(rawEmote); if (!emote || this.kind!=='online' || !this.active || !this.started) return;
    const now=Date.now(); if (now-this.lastEmoteAt<EMOTE_COOLDOWN_MS) return; this.lastEmoteAt=now;
    const me=this.myPlayer(); if (!me) return;
    this.showEmoteToast(me,emote);
    if (this.isHost) this.broadcast({type:'player:emote',id:me.id,emote});
    else if (this.hostConn?.open) this.hostConn.send({type:'emote',emote,token:this.clientToken});
  }

  showEmoteToast(player,rawEmote) {
    const emote=sanitizeEmote(rawEmote), box=$('multiEmoteToast'); if (!emote || !box || !player) return;
    const index=Math.max(0,this.players.findIndex(p=>p.id===player.id));
    box.innerHTML=`${this.playerAvatarHtml(player,index,true)}<span class="emoji">${esc(emote)}</span><span><b>${esc(player.name)}</b><small>réagit</small></span>`;
    box.classList.remove('hidden');
    if (this.emoteHideTimer) clearTimeout(this.emoteHideTimer);
    this.emoteHideTimer=setTimeout(()=>box.classList.add('hidden'),2200);
  }

  requestRematch() {
    if (this.kind!=='online' || this.isHost || !this.gameEnded) return;
    const me=this.myPlayer(); if (!me || !this.hostConn?.open) return;
    this.hostConn.send({type:'rematch:request',token:this.clientToken});
    this.rematchRequests.add(me.id);
    if ($('multiReplay')) { $('multiReplay').disabled=true; $('multiReplay').textContent='Revanche demandée'; }
    this.renderRematchStatus();
  }

  renderRematchStatus() {
    const el=$('multiRematchStatus'); if (!el) return;
    if (this.kind!=='online') { el.textContent=''; return; }
    if (this.isHost) {
      const requested=this.players.filter(p=>this.rematchRequests.has(p.id) && !p.host);
      el.textContent=requested.length ? `${requested.map(p=>p.name).join(', ')} ${requested.length>1?'demandent':'demande'} une revanche.` : 'Tu peux relancer une partie avec le même groupe.';
    } else {
      const me=this.myPlayer(); el.textContent=me && this.rematchRequests.has(me.id) ? "Demande envoyée à l'hôte." : "Tu peux demander une revanche à l'hôte.";
    }
  }

  renderRoundPhotoFinish(entries) {
    const el=$('multiRoundPhotoFinish'); if (!el) return;
    const valid=entries.filter(e=>!e.timedOut && Number.isFinite(Number(e.points))).slice().sort((a,b)=>b.points-a.points);
    if (valid.length<2) { el.classList.add('hidden'); el.textContent=''; return; }
    const diff=Math.abs(Number(valid[0].points)-Number(valid[1].points));
    if (diff>PHOTO_FINISH_POINTS_PER_ROUND) { el.classList.add('hidden'); el.textContent=''; return; }
    const first=valid[0].player||valid[0], second=valid[1].player||valid[1];
    el.textContent=`📸 Photo finish : ${first.name} et ${second.name} ne sont séparés que de ${diff.toLocaleString('fr-FR')} point${diff>1?'s':''}.`;
    el.classList.remove('hidden');
  }

  renderFinalPhotoFinish(list) {
    const el=$('multiFinalPhotoFinish'); if (!el) return;
    if (list.length<2 || (this.kind==='online' && this.onlineGameMode==='elimination')) { el.classList.add('hidden'); el.textContent=''; return; }
    const firstTotal=this.kind==='online' && this.onlineGameMode==='duel' ? Number(list[0].hp||0) : Number(list[0].total||0), secondTotal=this.kind==='online' && this.onlineGameMode==='duel' ? Number(list[1].hp||0) : Number(list[1].total||0);
    if (firstTotal===0 && secondTotal===0) { el.classList.add('hidden'); el.textContent=''; return; }
    const diff=Math.abs(firstTotal-secondTotal);
    const threshold=Math.max(50,this.getRoundCount()*PHOTO_FINISH_POINTS_PER_ROUND);
    if (diff>threshold) { el.classList.add('hidden'); el.textContent=''; return; }
    const unit=this.kind==='online' && this.onlineGameMode==='duel' ? ' PV' : ` point${diff>1?'s':''}`;
    el.textContent=`📸 PHOTO FINISH · ${list[0].name} devance ${list[1].name} de seulement ${diff.toLocaleString('fr-FR')}${unit}.`;
    el.classList.remove('hidden');
  }

  renderPodium(list) {
    const box=$('multiPodium'); if (!box) return; box.replaceChildren();
    const order=list.slice(0,3);
    const classes=['first','second','third'];
    order.forEach((p,i)=>{
      const originalIndex=Math.max(0,this.players.findIndex(x=>x.id===p.id));
      const card=document.createElement('div'); card.className=`podiumCard ${classes[i]||''}`;
      const podiumMetric=this.kind==='online' && this.onlineGameMode!=='classic' ? this.playerModeMetric(p,true) : `${Number(p.total||0).toLocaleString('fr-FR')} pts`;
      card.innerHTML=`<span class="podiumRank">${i===0?'🏆':i===1?'🥈':'🥉'}</span>${this.playerAvatarHtml(p,originalIndex)}<b>${esc(p.name)}</b><strong>${esc(podiumMetric)}</strong>`;
      box.appendChild(card);
    });
  }

  openModal() {
    if (!this.game.apiReady) { this.game.showToast?.('Google Maps doit être prêt avant de lancer le multijoueur.'); return; }
    $('multiplayerModal')?.classList.remove('hidden');
    this.resetOnlineLobby(false);
    this.renderIdentityChoices();
    this.renderOnlineHistory();
  }
  closeModal() {
    if (this.started) return;
    if (this.kind === 'online') this.cleanup(true);
    $('multiplayerModal')?.classList.add('hidden');
    this.originalShowMenu();
  }

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
  getRoundCount() { return this.kind==='online' ? this.onlineRoundCount : 5; }

  activeOnlinePlayers() {
    if (this.onlineGameMode !== 'elimination') return this.players.slice();
    return this.players.filter(p=>!p.eliminated);
  }

  rankPlayers(source=this.players) {
    const list=source.slice();
    if (this.kind!=='online') return list.sort((a,b)=>(b.total||0)-(a.total||0));
    if (this.onlineGameMode==='duel') return list.sort((a,b)=>(Number(b.hp)||0)-(Number(a.hp)||0) || (b.total||0)-(a.total||0));
    if (this.onlineGameMode==='elimination') {
      return list.sort((a,b)=>{
        if (!!a.eliminated !== !!b.eliminated) return a.eliminated ? 1 : -1;
        if (a.eliminated && b.eliminated) return (Number(b.eliminatedRound)||0)-(Number(a.eliminatedRound)||0) || (b.total||0)-(a.total||0);
        return (b.total||0)-(a.total||0);
      });
    }
    return list.sort((a,b)=>(b.total||0)-(a.total||0));
  }

  playerModeMetric(player, final=false) {
    if (!player) return '';
    if (this.kind==='online' && this.onlineGameMode==='duel') return `${Math.max(0,Number(player.hp)||0).toLocaleString('fr-FR')} PV`;
    if (this.kind==='online' && this.onlineGameMode==='elimination') {
      if (player.eliminated) return `Éliminé${player.eliminatedRound ? ` M${player.eliminatedRound}` : ''}`;
      return final ? 'Survivant' : 'En course';
    }
    return `${Number(player.total||0).toLocaleString('fr-FR')} pts`;
  }

  onlineStartValidation() {
    if (this.players.length < 2) return {ok:false,message:"En attente d'un deuxième joueur..."};
    if (this.onlineGameMode==='duel' && this.players.length!==2) return {ok:false,message:'Le mode Duel se joue exactement à 2 joueurs.'};
    if (this.onlineGameMode==='elimination') {
      if (this.players.length<3) return {ok:false,message:"Le mode Élimination nécessite au moins 3 joueurs."};
      const needed=this.players.length-1;
      if (this.onlineRoundCount<needed) return {ok:false,message:`Avec ${this.players.length} joueurs, choisis au moins ${needed} manches pour permettre toutes les éliminations.`};
    }
    if (!this.players.every(p=>p.ready && p.connected!==false)) return {ok:false,message:'La partie démarre lorsque tous les joueurs sont prêts.'};
    return {ok:true,message:`${this.players.length} joueurs prêts · l'hôte peut lancer ${gameModeLabel(this.onlineGameMode)}.`};
  }

  ensureEliminationRoundCount() {
    if (!this.isHost || this.onlineGameMode!=='elimination') return false;
    const needed=Math.max(3,this.players.length-1);
    if (this.onlineRoundCount>=needed) return false;
    const adjusted=[3,5,10].find(value=>value>=needed) || 10;
    if (adjusted===this.onlineRoundCount) return false;
    this.onlineRoundCount=adjusted;
    if ($('onlineRoundCount')) $('onlineRoundCount').value=String(adjusted);
    this.game.showToast?.(`Élimination : nombre de manches ajusté à ${adjusted}.`,2200);
    return true;
  }

  initializeCompetitionState() {
    this.players.forEach(p=>{
      p.total=0; p.rounds=[]; p.eliminated=false; p.eliminatedRound=null;
      p.hp=this.onlineGameMode==='duel' ? DUEL_START_HP : null;
    });
  }

  applyOnlineGameModeOutcome(entries) {
    if (this.onlineGameMode==='duel') {
      const ranked=entries.slice().sort((a,b)=>b.points-a.points || (a.seconds||0)-(b.seconds||0));
      if (ranked.length<2) return null;
      const first=ranked[0], second=ranked[1];
      const damage=Math.max(0,Number(first.points||0)-Number(second.points||0));
      if (!damage) return {type:'duel-tie',playerIds:ranked.map(e=>e.player.id)};
      second.player.hp=Math.max(0,(Number(second.player.hp)||DUEL_START_HP)-damage);
      if (second.player.rounds[this.round]) second.player.rounds[this.round].damageTaken=damage;
      return {type:'duel-damage',attackerId:first.player.id,defenderId:second.player.id,damage,hpAfter:second.player.hp,ko:second.player.hp<=0};
    }
    if (this.onlineGameMode==='elimination') {
      if (entries.length<=1) return null;
      const distanceFor=e=>Number.isFinite(Number(e.distance))?Number(e.distance):1e18;
      const worst=entries.slice().sort((a,b)=>
        (Number(a.points||0)-Number(b.points||0)) ||
        (Number(!!b.timedOut)-Number(!!a.timedOut)) ||
        (distanceFor(b)-distanceFor(a)) ||
        (Number(b.seconds||0)-Number(a.seconds||0)) ||
        (Number(a.player.total||0)-Number(b.player.total||0)) ||
        String(a.player.id).localeCompare(String(b.player.id))
      )[0];
      worst.player.eliminated=true; worst.player.eliminatedRound=this.round+1;
      if (worst.player.rounds[this.round]) worst.player.rounds[this.round].eliminated=true;
      const survivors=this.players.filter(p=>!p.eliminated);
      return {type:'elimination',playerId:worst.player.id,round:this.round+1,winnerId:survivors.length===1?survivors[0].id:null};
    }
    return null;
  }

  renderModeEvent(event=this.lastModeEvent) {
    const box=$('multiModeEvent'); if (!box) return;
    if (!event || this.kind!=='online' || this.onlineGameMode==='classic') { box.classList.add('hidden'); box.textContent=''; return; }
    const byId=id=>this.players.find(p=>p.id===id);
    if (event.type==='duel-tie') box.textContent='⚔️ Duel : égalité parfaite, aucun dégât.';
    else if (event.type==='duel-damage') {
      const attacker=byId(event.attackerId), defender=byId(event.defenderId);
      box.textContent=`⚔️ ${attacker?.name||'Un joueur'} inflige ${Number(event.damage||0).toLocaleString('fr-FR')} dégâts à ${defender?.name||'son adversaire'} · ${Math.max(0,Number(event.hpAfter)||0).toLocaleString('fr-FR')} PV restants${event.ko?' · K.O. !':''}`;
    } else if (event.type==='elimination') {
      const out=byId(event.playerId), winner=event.winnerId?byId(event.winnerId):null;
      box.textContent=winner ? `☠️ ${out?.name||'Un joueur'} est éliminé · ${winner.name} est le dernier survivant !` : `☠️ ${out?.name||'Un joueur'} est éliminé de la partie.`;
    }
    box.classList.remove('hidden');
  }

  shouldEndGameAfterRound() {
    if (this.kind!=='online') return this.round>=this.getRoundCount()-1;
    if (this.onlineGameMode==='duel' && this.players.some(p=>(Number(p.hp)||0)<=0)) return true;
    if (this.onlineGameMode==='elimination' && this.players.filter(p=>!p.eliminated).length<=1) return true;
    return this.round>=this.getRoundCount()-1;
  }

  async startLocal(namesOverride=null) {
    const names = (namesOverride || this.localNames()).filter(Boolean).slice(0,4);
    if (names.length < 2) { this.setModalError('Ajoute au moins deux joueurs.'); return; }
    this.cleanup(true);
    this.active=true; this.kind='local'; this.isHost=true; this.started=true; this.gameEnded=false; this.round=0; this.localPlayerIndex=0;
    this.game.roundCount=5;
    this.players = names.map((name,i) => ({id:`local-${i}`,name:sanitizeName(name,`Joueur ${i+1}`),avatar:PLAYER_AVATARS[i%PLAYER_AVATARS.length],color:COLORS[i%COLORS.length],total:0,rounds:[],connected:true,ready:true}));
    $('multiplayerModal')?.classList.add('hidden');
    await this.prepareShell();
    await this.loadHostRound();
  }

  async prepareShell() {
    await this.game.prepareSelectedZone();
    this.game.ensureGoogleObjects();
    $('startScreen').classList.add('hidden'); $('endScreen').classList.add('hidden'); this.hideMultiEnd();
    $('gameScreen').classList.remove('hidden'); $('gameScreen').classList.add('multiplayer-active'); this.game.panorama.setVisible(true);
    $('multiHud')?.classList.remove('hidden');
  }

  async loadHostRound() {
    this.clearRoundTimer();
    this.clearMultiMarkers(); this.submissions.clear(); this.submittedIds.clear(); this.lastRoundResults=null; this.lastModeEvent=null;
    this.roundClosed=false; this.guessLocked=false;
    this.game.round = this.round; this.game.roundCount=this.getRoundCount(); this.game.total = 0; this.game.results = [];
    await this.game.loadRound();
    if (!this.active) return;
    this.roundInfo = {
      pano:this.game.startPano,
      answer:{...this.game.answer},
      description:this.game.startDescription,
      heading:this.game.startPov?.heading || 0,
      zoneId:this.game.zoneId,
      mode:this.game.mode,
      round:this.round,
      roundCount:this.getRoundCount(),
      timerSeconds:this.kind === 'online' ? this.onlineRoundSeconds : null,
      gameMode:this.kind === 'online' ? this.onlineGameMode : 'classic',
      protocol:ONLINE_PROTOCOL_VERSION
    };
    if (this.kind === 'local') {
      this.localPlayerIndex = 0;
      this.beginLocalTurn(0);
    } else if (this.kind === 'online' && this.isHost) {
      this.beginOnlineRoundForSelf();
      this.broadcast({type:'round:start',...this.roundInfo,deadline:this.roundDeadline});
    }
  }

  resetRoundView(player) {
    const zone = this.api.ZONES[this.game.zoneId];
    this.guessLocked=false;
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
    $('roundLabel').textContent=`${this.round+1} / ${this.getRoundCount()}`; $('scoreLabel').textContent=(player?.total||0).toLocaleString('fr-FR');
    $('zoneLabel').textContent=zone.name;
    const noMove=this.game.mode!=='explore';
    this.game.panorama.setOptions({addressControl:false,clickToGo:!noMove,linksControl:!noMove,panControl:false,zoomControl:false,fullscreenControl:false,showRoadLabels:false,imageDateControl:false,enableCloseButton:false,motionTracking:false,motionTrackingControl:false});
    this.game.panorama.setPano(this.roundInfo.pano); this.game.panorama.setPov({heading:this.roundInfo.heading,pitch:0}); this.game.panorama.setZoom(0); this.game.panorama.setVisible(true);
    this.game.applyInteractionMode?.();
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
    $('multiTurnText').textContent=`Manche ${this.round+1}/${this.getRoundCount()} · ${next.total.toLocaleString('fr-FR')} pts`;
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
    $('multiHudScore').textContent=this.kind==='online' && this.onlineGameMode!=='classic' ? `${this.playerModeMetric(player)} · ${(player?.total||0).toLocaleString('fr-FR')} pts` : `${(player?.total||0).toLocaleString('fr-FR')} pts`;
    $('multiHudExtra').textContent=extra;
  }

  finishRound(entries, fromNetwork=false) {
    if (this.kind === 'online') { this.roundClosed=true; this.guessLocked=true; this.clearRoundTimer(); }
    entries.sort((a,b)=>b.points-a.points || Number(!!a.timedOut)-Number(!!b.timedOut) || (a.seconds||0)-(b.seconds||0));
    this.renderResultMarkers(entries);
    this.renderRoundPhotoFinish(entries);
    const body=$('multiRoundRanking'); body.replaceChildren();
    entries.forEach((e,i)=>{
      const row=document.createElement('div'); row.className='multiRankRow';
      const total=e.player?.total ?? e.total ?? 0;
      const player=e.player || this.players.find(p=>p.id===e.id) || {name:e.name,id:e.id};
      const playerIndex=Math.max(0,this.players.findIndex(p=>p.id===player.id));
      const detail=e.timedOut?'Temps écoulé · aucune réponse':`${this.api.formatDistance(e.distance)} · ${e.seconds}s`;
      const modeMetric=this.kind==='online' && this.onlineGameMode!=='classic' ? this.playerModeMetric(player) : `${Number(total).toLocaleString('fr-FR')} total`;
      row.innerHTML=`<span class="multiPlace">${i+1}</span><span class="multiPlayerIdentity">${this.playerAvatarHtml(player,playerIndex,true)}<span><b>${esc(player.name)}</b><small>${detail}</small></span></span><strong>${Number(e.points||0).toLocaleString('fr-FR')} pts</strong><em>${esc(modeMetric)}</em>`;
      body.appendChild(row);
    });
    this.renderOverallRanking();
    this.renderModeEvent();
    $('multiRoundTitle').textContent=`Manche ${this.round+1} terminée`;
    $('multiRoundPlace').textContent=this.roundInfo.description || this.api.ZONES[this.game.zoneId].name;
    $('multiRoundPanel').classList.remove('hidden');
    $('guessButton').disabled=true; this.game.panorama?.setOptions({clickToGo:false,linksControl:false});
    const next=$('multiNextRound');
    if (this.kind==='online' && !this.isHost) { next.classList.add('hidden'); $('multiWaiting').classList.remove('hidden'); $('multiWaiting').textContent="En attente de l'hôte..."; }
    else { next.classList.remove('hidden'); next.textContent=this.shouldEndGameAfterRound()?'Voir le classement final':'Manche suivante'; }
    if (fromNetwork) this.game.total=this.myPlayer()?.total||0;
  }

  renderOverallRanking() {
    const box=$('multiOverallRanking'); if (!box) return;
    box.replaceChildren();
    const list=this.rankPlayers();
    list.forEach((p,i)=>{
      const originalIndex=Math.max(0,this.players.findIndex(x=>x.id===p.id));
      const row=document.createElement('div'); row.className='multiOverallRow';
      const metric=this.kind==='online' && this.onlineGameMode!=='classic' ? `${this.playerModeMetric(p)} · ${Number(p.total||0).toLocaleString('fr-FR')} pts` : `${Number(p.total||0).toLocaleString('fr-FR')} pts`;
      row.innerHTML=`<span>${i+1}</span>${this.playerAvatarHtml(p,originalIndex,true)}<b>${esc(p.name)}</b><strong>${esc(metric)}</strong>`;
      box.appendChild(row);
    });
  }

  renderResultMarkers(entries) {
    this.clearMultiMarkers();
    this.game.configureGuessMap(this.api.ZONES[this.game.zoneId]);
    const bounds=new google.maps.LatLngBounds();
    entries.forEach(e=>{
      const pos=e.guess; if (!pos) return; bounds.extend(pos);
      const player=e.player || this.players.find(p=>p.id===e.id) || {id:e.id,name:e.name};
      const playerIndex=Math.max(0,this.players.findIndex(p=>p.id===player.id));
      const marker=new google.maps.Marker({map:this.game.map,position:pos,zIndex:3+playerIndex,title:player.name,label:{text:String(playerIndex+1),color:'#fff',fontWeight:'900'},icon:{path:google.maps.SymbolPath.CIRCLE,scale:11,fillColor:playerColor(player,playerIndex),fillOpacity:1,strokeColor:'#fff',strokeWeight:3}});
      this.multiMarkers.push(marker);
    });
    const answer=this.roundInfo.answer; bounds.extend(answer);
    this.multiMarkers.push(new google.maps.Marker({map:this.game.map,position:answer,zIndex:20,title:'Lieu réel',label:{text:'R',color:'#fff',fontWeight:'900'},icon:{path:google.maps.SymbolPath.CIRCLE,scale:12,fillColor:'#e53935',fillOpacity:1,strokeColor:'#fff',strokeWeight:3}}));
    this.game.map.fitBounds(bounds,65);
  }
  clearMultiMarkers(){ this.multiMarkers.forEach(m=>m.setMap(null)); this.multiMarkers=[]; }

  advanceAfterRound() {
    if (!this.active) return;
    if (this.kind==='online' && !this.isHost) return;
    if (this.shouldEndGameAfterRound()) {
      this.gameEnded=true;
      if (this.kind==='online') this.broadcast({type:'game:end',players:this.serializedPlayers(),roundCount:this.getRoundCount(),gameMode:this.onlineGameMode});
      this.showMultiEnd(); return;
    }
    this.round++;
    $('multiRoundPanel').classList.add('hidden');
    this.loadHostRound().catch(e=>this.fatalMulti(e));
  }

  showMultiEnd(playersOverride=null) {
    this.clearRoundTimer(); this.roundClosed=true; this.guessLocked=true;
    $('multiEmoteBar')?.classList.add('hidden'); $('multiEmoteToast')?.classList.add('hidden');
    const list=this.rankPlayers(playersOverride || this.players);
    $('gameScreen').classList.add('hidden'); $('multiEndScreen').classList.remove('hidden');
    this.renderFinalPhotoFinish(list); this.renderPodium(list);
    const box=$('multiFinalRanking'); box.replaceChildren();
    list.forEach((p,i)=>{
      const originalIndex=Math.max(0,this.players.findIndex(x=>x.id===p.id));
      const row=document.createElement('div'); row.className='multiFinalRow';
      const finalMetric=this.kind==='online' && this.onlineGameMode!=='classic' ? `${this.playerModeMetric(p,true)} · ${Number(p.total||0).toLocaleString('fr-FR')} pts` : `${Number(p.total||0).toLocaleString('fr-FR')} pts`;
      row.innerHTML=`<span class="multiFinalPlace">${i===0?'🏆':i+1}</span>${this.playerAvatarHtml(p,originalIndex,true)}<span><b>${esc(p.name)}</b><small>${p.rounds?.length||this.getRoundCount()} manches</small></span><strong>${esc(finalMetric)}</strong>`;
      box.appendChild(row);
    });
    $('multiChampion').textContent=list[0]?.name || '';
    if (this.kind==='online') {
      this.recordOnlineHistory(list);
      if ($('multiReplay')) {
        $('multiReplay').classList.remove('hidden'); $('multiReplay').disabled=false;
        $('multiReplay').textContent=this.isHost?'Rejouer avec les mêmes joueurs':'Demander une revanche';
      }
      this.renderRematchStatus();
    } else {
      if ($('multiReplay')) { $('multiReplay').classList.remove('hidden'); $('multiReplay').disabled=false; $('multiReplay').textContent='Rejouer'; }
      if ($('multiRematchStatus')) $('multiRematchStatus').textContent='';
    }
  }
  hideMultiEnd(){ $('multiEndScreen')?.classList.add('hidden'); }

  // ---------------- Online peer-to-peer ----------------
  ensurePeerAvailable(){ if (!window.Peer) throw new Error("Le module multijoueur en ligne n'a pas pu être chargé. Vérifie ta connexion Internet."); }

  readOnlineRoundSeconds() {
    const value=Number($('onlineRoundTimer')?.value || DEFAULT_ONLINE_ROUND_SECONDS);
    return ONLINE_ROUND_OPTIONS.has(value) ? value : DEFAULT_ONLINE_ROUND_SECONDS;
  }
  readOnlineRoundCount() {
    const value=Number($('onlineRoundCount')?.value || DEFAULT_ONLINE_ROUND_COUNT);
    return ONLINE_ROUND_COUNT_OPTIONS.has(value) ? value : DEFAULT_ONLINE_ROUND_COUNT;
  }
  readOnlineMovementMode() {
    const value=String($('onlineMovementMode')?.value || 'explore');
    return ONLINE_MOVEMENT_OPTIONS.has(value) ? value : 'explore';
  }
  readOnlineGameMode() {
    const value=String($('onlineGameMode')?.value || DEFAULT_ONLINE_GAME_MODE);
    return ONLINE_GAME_MODE_OPTIONS.has(value) ? value : DEFAULT_ONLINE_GAME_MODE;
  }

  createOnlineRoom() {
    try { this.ensurePeerAvailable(); } catch(e){ return this.setModalError(e.message); }
    this.onlineRoundSeconds=this.readOnlineRoundSeconds();
    this.onlineRoundCount=this.readOnlineRoundCount();
    this.onlineMovementMode=this.readOnlineMovementMode();
    this.onlineGameMode=this.readOnlineGameMode();
    this.cleanupPeer(); this.myName=sanitizeName($('onlineName').value,'Hôte'); this.persistOnlineIdentity(); this.code=roomCode(); this.isHost=true; this.kind='online'; this.started=false; this.gameEnded=false; this.rematchRequests.clear(); this.gameHistoryRecorded=false;
    const id=`${ROOM_NAMESPACE}-${this.code.toLowerCase()}`;
    this.peer=new Peer(id,{debug:1});
    this.setOnlineStatus('Création de la salle...');
    this.peer.on('open', peerId=>{
      this.myId=peerId; this.players=[{id:peerId,token:this.clientToken,name:this.myName,avatar:this.myAvatar,color:this.myColor,total:0,rounds:[],host:true,ready:false,connected:true,protocol:ONLINE_PROTOCOL_VERSION}];
      this.showOnlineLobby(); this.renderOnlineLobby();
      this.peer.on('connection', conn=>this.acceptConnection(conn));
    });
    this.peer.on('error', err=>this.peerError(err,true));
  }

  joinOnlineRoom() {
    try { this.ensurePeerAvailable(); } catch(e){ return this.setModalError(e.message); }
    const code=String($('onlineRoomCode').value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
    if (code.length!==5) { this.setModalError('Entre un code de salle de 5 caractères.'); return; }
    this.cleanupPeer(); this.myName=sanitizeName($('onlineName').value,'Joueur'); this.persistOnlineIdentity(); this.code=code; this.isHost=false; this.kind='online'; this.onlineGameMode=DEFAULT_ONLINE_GAME_MODE; this.started=false; this.gameEnded=false; this.rematchRequests.clear(); this.gameHistoryRecorded=false;
    this.peer=new Peer(undefined,{debug:1}); this.setOnlineStatus('Connexion à la salle...');
    this.peer.on('open', peerId=>{
      this.myId=peerId;
      this.connectGuestToHost(false);
    });
    this.peer.on('connection',()=>{});
    this.peer.on('disconnected',()=>{
      if (this.closingPeer) return;
      try { this.peer?.reconnect(); } catch (_) {}
      if (this.started) this.scheduleGuestReconnect();
    });
    this.peer.on('error',err=>{
      if (this.started && !this.isHost && ['network','disconnected','server-error','socket-error'].includes(err?.type)) this.scheduleGuestReconnect();
      else this.peerError(err,false);
    });
  }

  connectGuestToHost(isReconnect) {
    if (!this.peer || this.peer.destroyed) return;
    try {
      const conn=this.peer.connect(`${ROOM_NAMESPACE}-${this.code.toLowerCase()}`,{reliable:true,metadata:{name:this.myName,token:this.clientToken,reconnect:!!isReconnect,avatar:this.myAvatar,color:this.myColor,protocol:ONLINE_PROTOCOL_VERSION}});
      this.hostConn=conn;
      conn.on('open',()=>{
        this.reconnectAttempts=0; this.clearReconnectTimer();
        conn.send({type:'hello',name:this.myName,token:this.clientToken,reconnect:!!isReconnect,avatar:this.myAvatar,color:this.myColor,protocol:ONLINE_PROTOCOL_VERSION});
        if (!this.started) { this.showOnlineLobby(); this.setOnlineStatus('Connecté.'); }
        else this.game.showToast?.('Connexion multijoueur rétablie.',2200);
      });
      conn.on('data',data=>this.handleGuestData(data));
      conn.on('close',()=>this.handleGuestConnectionLoss('Connexion avec l\'hôte fermée.'));
      conn.on('error',e=>this.handleGuestConnectionLoss(e?.message || 'Connexion interrompue.'));
    } catch (e) {
      this.handleGuestConnectionLoss(e.message);
    }
  }

  handleGuestConnectionLoss(message) {
    if (this.closingPeer) return;
    if (!this.started) { this.onlineDisconnected(message); return; }
    this.game.showToast?.('Connexion perdue · tentative de reconnexion...',2600);
    this.scheduleGuestReconnect();
  }

  scheduleGuestReconnect() {
    if (this.isHost || this.closingPeer || this.gameEnded || this.reconnectTimer) return;
    if (this.reconnectAttempts>=RECONNECT_MAX_ATTEMPTS) {
      this.game.showToast?.('Reconnexion impossible. La partie reste ouverte chez l\'hôte.',5000);
      return;
    }
    this.reconnectAttempts++;
    this.reconnectTimer=setTimeout(()=>{
      this.reconnectTimer=null;
      if (!this.peer || this.peer.destroyed) return;
      if (this.peer.disconnected) { try { this.peer.reconnect(); } catch (_) {} }
      setTimeout(()=>{
        if (!this.hostConn?.open) this.connectGuestToHost(true);
      },500);
    },1000*this.reconnectAttempts);
  }

  clearReconnectTimer() { if (this.reconnectTimer) clearTimeout(this.reconnectTimer); this.reconnectTimer=null; }

  acceptConnection(conn) {
    const token=String(conn.metadata?.token||'');
    const reconnecting=this.players.find(p=>(token && p.token===token) || p.id===conn.peer);
    const protocol=Number(conn.metadata?.protocol||0);
    if (!reconnecting && this.onlineGameMode!=='classic' && protocol<ONLINE_PROTOCOL_VERSION) { conn.on('open',()=>{conn.send({type:'error',message:`Le mode ${gameModeLabel(this.onlineGameMode)} nécessite LostPin V4.4 ou plus récent.`}); setTimeout(()=>conn.close(),500);}); return; }
    if (!reconnecting && this.onlineGameMode==='duel' && this.players.length>=2) { conn.on('open',()=>{conn.send({type:'error',message:'Le mode Duel se joue à 2 joueurs.'}); setTimeout(()=>conn.close(),300);}); return; }
    if (this.started && !reconnecting) { conn.on('open',()=>{conn.send({type:'error',message:'La partie a déjà commencé.'}); setTimeout(()=>conn.close(),300);}); return; }
    if (!reconnecting && this.players.length>=6) { conn.on('open',()=>{conn.send({type:'error',message:'Salle complète (6 joueurs max).'}); setTimeout(()=>conn.close(),300);}); return; }
    if (reconnecting) { conn.__playerId=reconnecting.id; reconnecting.connected=true; }
    this.connections.set(conn.peer,conn);
    conn.on('data',data=>this.handleHostData(conn,data));
    conn.on('close',()=>this.handleHostConnectionClose(conn));
    conn.on('error',()=>this.handleHostConnectionClose(conn));
  }

  handleHostConnectionClose(conn) {
    // A late close event from an old connection must not remove a newer
    // reconnection registered under the same PeerJS id.
    if (this.connections.get(conn.peer) === conn) this.connections.delete(conn.peer);
    const playerId=conn.__playerId || conn.peer;
    const player=this.players.find(p=>p.id===playerId || p.token===conn.metadata?.token);
    if (!player) return;
    if (this.started) {
      player.connected=false;
      this.broadcast({type:'player:connection',players:this.serializedPlayers()});
      this.broadcast({type:'round:status',submitted:Array.from(this.submissions.keys()),players:this.serializedPlayers()});
      this.renderOnlineStatus({submitted:Array.from(this.submissions.keys())});
    } else {
      this.players=this.players.filter(p=>p!==player);
      this.broadcastLobby(); this.renderOnlineLobby();
    }
  }

  handleHostData(conn,data) {
    if (!data || typeof data!=='object') return;
    const token=String(data.token || conn.metadata?.token || '');
    if (data.type==='hello') {
      const name=sanitizeName(data.name,`Joueur ${this.players.length+1}`);
      let existing=this.players.find(p=>(token && p.token===token) || p.id===conn.peer);
      if (this.started && !existing) { conn.send({type:'error',message:'La partie a déjà commencé.'}); setTimeout(()=>conn.close(),300); return; }
      const avatar=sanitizeAvatar(data.avatar || conn.metadata?.avatar);
      const color=sanitizeColor(data.color || conn.metadata?.color);
      const protocol=Number(data.protocol || conn.metadata?.protocol || 0);
      if (!existing && this.onlineGameMode==='duel' && this.players.length>=2) { conn.send({type:'error',message:'Le mode Duel se joue à 2 joueurs.'}); setTimeout(()=>conn.close(),300); return; }
      if (!existing && this.onlineGameMode!=='classic' && protocol<ONLINE_PROTOCOL_VERSION) { conn.send({type:'error',message:`Le mode ${gameModeLabel(this.onlineGameMode)} nécessite LostPin V4.4 ou plus récent.`}); setTimeout(()=>conn.close(),500); return; }
      if (!existing) {
        existing={id:conn.peer,token,name,avatar,color,total:0,rounds:[],host:false,ready:false,connected:true,protocol};
        this.players.push(existing);
      } else {
        existing.name=name; existing.avatar=avatar; existing.color=color; existing.protocol=protocol; existing.connected=true; if (token) existing.token=token;
      }
      conn.__playerId=existing.id;
      this.ensureEliminationRoundCount();
      this.broadcastLobby(); this.renderOnlineLobby();
      if (this.started) this.sendResumeState(conn,existing);
      return;
    }
    const playerId=conn.__playerId || conn.peer;
    if (data.type==='emote' && this.started) {
      const emote=sanitizeEmote(data.emote), player=this.players.find(p=>p.id===playerId);
      if (!emote || !player) return;
      const now=Date.now(); if (player.lastEmoteAt && now-player.lastEmoteAt<EMOTE_COOLDOWN_MS) return; player.lastEmoteAt=now;
      this.showEmoteToast(player,emote); this.broadcast({type:'player:emote',id:player.id,emote}); return;
    }
    if (data.type==='rematch:request' && this.gameEnded) {
      const player=this.players.find(p=>p.id===playerId); if (!player) return;
      this.rematchRequests.add(player.id); this.broadcast({type:'rematch:status',requested:Array.from(this.rematchRequests)}); this.renderRematchStatus();
      this.game.showToast?.(`${player.name} demande une revanche.`,2200); return;
    }
    if (data.type==='ready' && !this.started) {
      const player=this.players.find(p=>p.id===playerId); if (!player) return;
      player.ready=!!data.ready; player.connected=true;
      this.broadcastLobby(); this.renderOnlineLobby();
    } else if (data.type==='guess' && this.started && data.round===this.round) {
      this.recordOnlineGuess(playerId,data);
    }
  }

  sendResumeState(conn,player) {
    if (!conn?.open) return;
    if (this.gameEnded) { conn.send({type:'game:end',players:this.serializedPlayers(),roundCount:this.getRoundCount(),gameMode:this.onlineGameMode}); return; }
    conn.send({
      type:'state:resume',
      players:this.serializedPlayers(),
      roundInfo:this.roundInfo,
      timerSeconds:this.remainingRoundSeconds(),
      deadline:this.roundDeadline,
      submitted:Array.from(this.submissions.keys()),
      wasSubmitted:this.submissions.has(player.id),
      roundClosed:this.roundClosed,
      results:this.lastRoundResults,
      modeEvent:this.lastModeEvent,
      gameMode:this.onlineGameMode
    });
  }

  async resumeSharedState(data) {
    this.players=data.players||this.players;
    if (!data.roundInfo) return;
    const payload={...data.roundInfo,timerSeconds:Number(data.timerSeconds)||0,deadline:data.deadline};
    await this.applySharedRound(payload);
    this.renderOnlineStatus({submitted:data.submitted||[]});
    if (data.wasSubmitted) {
      this.guessLocked=true;
      $('guessButton').disabled=true; $('guessButton').textContent='Réponse envoyée';
      this.game.panorama?.setOptions({clickToGo:false,linksControl:false});
    }
    if (data.roundClosed && Array.isArray(data.results)) {
      if (ONLINE_GAME_MODE_OPTIONS.has(data.gameMode)) this.onlineGameMode=data.gameMode;
      this.lastModeEvent=data.modeEvent||null;
      const entries=data.results.map(r=>({...r,player:this.players.find(p=>p.id===r.id)||{name:r.name,total:r.total,id:r.id}}));
      this.finishRound(entries,true);
    }
  }

  handleGuestData(data) {
    if (!data || typeof data!=='object') return;
    if (data.type==='error') { this.setModalError(data.message); return; }
    if (data.type==='lobby') {
      this.players=data.players||[];
      if (data.zoneId && this.api.ZONES[data.zoneId]) this.game.zoneId=data.zoneId;
      if (ONLINE_ROUND_OPTIONS.has(Number(data.timerSeconds))) this.onlineRoundSeconds=Number(data.timerSeconds);
      if (ONLINE_ROUND_COUNT_OPTIONS.has(Number(data.roundCount))) this.onlineRoundCount=Number(data.roundCount);
      if (ONLINE_MOVEMENT_OPTIONS.has(data.movementMode)) this.onlineMovementMode=data.movementMode;
      this.onlineGameMode=ONLINE_GAME_MODE_OPTIONS.has(data.gameMode) ? data.gameMode : DEFAULT_ONLINE_GAME_MODE;
      this.renderOnlineLobby();
      return;
    }
    if (data.type==='player:connection') { this.players=data.players||this.players; this.renderOnlineStatus({submitted:Array.from(this.submittedIds)}); return; }
    if (data.type==='round:start') { this.applySharedRound(data).catch(e=>this.fatalMulti(e)); return; }
    if (data.type==='round:timer') { this.applyRoundTimerUpdate(data); return; }
    if (data.type==='round:status') { if (data.players) this.players=data.players; this.renderOnlineStatus(data); return; }
    if (data.type==='round:results') {
      this.players=data.players||this.players; if (ONLINE_GAME_MODE_OPTIONS.has(data.gameMode)) this.onlineGameMode=data.gameMode; this.roundInfo={...this.roundInfo,answer:data.answer,description:data.description};
      const entries=(data.results||[]).map(r=>({...r,player:this.players.find(p=>p.id===r.id)||{id:r.id,name:r.name,total:r.total}}));
      this.lastRoundResults=data.results||[]; this.lastModeEvent=data.modeEvent||null;
      this.finishRound(entries,true); return;
    }
    if (data.type==='player:emote') { const player=this.players.find(p=>p.id===data.id); if (player && player.id!==this.myPlayer()?.id) this.showEmoteToast(player,data.emote); return; }
    if (data.type==='rematch:status') { this.rematchRequests=new Set(data.requested||[]); this.renderRematchStatus(); return; }
    if (data.type==='state:resume') { this.resumeSharedState(data).catch(e=>this.fatalMulti(e)); return; }
    if (data.type==='game:rematch') { this.enterRematchLobby(data); return; }
    if (data.type==='game:end') { this.players=data.players||this.players; if (ONLINE_ROUND_COUNT_OPTIONS.has(Number(data.roundCount))) this.onlineRoundCount=Number(data.roundCount); if (ONLINE_GAME_MODE_OPTIONS.has(data.gameMode)) this.onlineGameMode=data.gameMode; this.gameEnded=true; this.showMultiEnd(); }
  }

  broadcastLobby() { this.broadcast({type:'lobby',players:this.serializedPlayers(),code:this.code,zoneId:this.game.zoneId,movementMode:this.onlineMovementMode,gameMode:this.onlineGameMode,timerSeconds:this.onlineRoundSeconds,roundCount:this.onlineRoundCount,protocol:ONLINE_PROTOCOL_VERSION}); }
  broadcast(data) { for (const conn of this.connections.values()) if (conn.open) { try{conn.send(data);}catch(_){}} }
  serializedPlayers(){ return this.players.map((p,i)=>({id:p.id,token:p.token||'',name:p.name,avatar:playerAvatar(p,i),color:playerColor(p,i),total:p.total||0,rounds:p.rounds||[],hp:p.hp==null?null:Number(p.hp),eliminated:!!p.eliminated,eliminatedRound:p.eliminatedRound==null?null:Number(p.eliminatedRound),host:!!p.host,ready:!!p.ready,connected:p.connected!==false,protocol:Number(p.protocol||ONLINE_PROTOCOL_VERSION)})); }

  showOnlineLobby() { $('onlineLobby').classList.remove('hidden'); $('onlineSetup').classList.add('hidden'); $('onlineRoomCodeDisplay').textContent=this.code; this.renderOnlineHistory(); }
  resetOnlineLobby(resetSetup=true) { if (resetSetup){ $('onlineLobby')?.classList.add('hidden'); $('onlineSetup')?.classList.remove('hidden'); } this.setModalError(''); this.renderIdentityChoices(); this.renderOnlineHistory(); }
  renderOnlineLobby() {
    if (!$('onlinePlayerList')) return;
    $('onlineRoomCodeDisplay').textContent=this.code||'-----';
    const settings=$('onlineRoomSettings');
    const zoneName=this.api.ZONES[this.game.zoneId]?.name || this.game.zoneId || 'Map';
    if (settings) settings.textContent=`${gameModeLabel(this.onlineGameMode)} · ${zoneName} · ${this.onlineRoundSeconds} s · ${this.onlineRoundCount} manches · ${movementLabel(this.onlineMovementMode)}`;
    const meta=$('onlineLobbyMeta'); if (meta) meta.innerHTML=`<span>${this.players.length}/6 joueurs</span><span>Code ${esc(this.code||'-----')}</span><span>Mode ${esc(gameModeLabel(this.onlineGameMode))}</span><span>Protocole V4.4</span>`;
    const box=$('onlinePlayerList'); box.replaceChildren();
    this.players.forEach((p,i)=>{
      const row=document.createElement('div'); row.className=`onlinePlayer${p.connected===false?' disconnected':''}${p.token===this.clientToken?' self':''}`;
      const status=p.connected===false?'Déconnecté':p.ready?'Prêt':'Pas prêt';
      const competition=this.onlineGameMode==='duel' && p.hp!=null ? `${Number(p.hp).toLocaleString('fr-FR')} PV` : this.onlineGameMode==='elimination' && p.eliminated ? `Éliminé M${p.eliminatedRound||'?'}` : '';
      row.innerHTML=`${this.playerAvatarHtml(p,i)}<b>${esc(p.name)}</b><span class="onlinePlayerMeta">${p.host?'<small>👑 hôte</small>':''}${competition?`<small>${esc(competition)}</small>`:''}<small class="readyState">${status}</small></span>`;
      box.appendChild(row);
    });
    const me=this.myPlayer();
    if ($('onlineReadyButton')) {
      $('onlineReadyButton').classList.remove('hidden');
      $('onlineReadyButton').disabled=!me || me.connected===false;
      $('onlineReadyButton').textContent=me?.ready?'Je ne suis plus prêt':'Je suis prêt';
      $('onlineReadyButton').classList.toggle('readyActive',!!me?.ready);
    }
    const validation=this.onlineStartValidation();
    $('onlineStartGame').classList.toggle('hidden',!this.isHost);
    $('onlineStartGame').disabled=!validation.ok;
    this.setOnlineStatus(validation.message);
  }

  toggleOnlineReady() {
    if (this.kind!=='online' || this.started) return;
    const me=this.myPlayer(); if (!me) return;
    const next=!me.ready;
    if (this.isHost) { me.ready=next; this.broadcastLobby(); this.renderOnlineLobby(); }
    else { me.ready=next; this.renderOnlineLobby(); if (this.hostConn?.open) this.hostConn.send({type:'ready',ready:next,token:this.clientToken}); }
  }

  async startOnlineAsHost() {
    const validation=this.onlineStartValidation();
    if (!this.isHost || !validation.ok) { if (validation.message) this.setOnlineStatus(validation.message); return; }
    this.active=true; this.started=true; this.gameEnded=false; this.round=0; this.game.mode=this.onlineMovementMode; this.game.roundCount=this.onlineRoundCount; this.gameHistoryRecorded=false; this.rematchRequests.clear();
    this.initializeCompetitionState();
    $('multiplayerModal').classList.add('hidden'); await this.prepareShell(); this.broadcastLobby(); await this.loadHostRound();
  }

  beginOnlineRoundForSelf() {
    const me=this.myPlayer(); this.resetRoundView(me);
    const spectator=this.onlineGameMode==='elimination' && !!me?.eliminated;
    if (spectator) { this.guessLocked=true; $('guessButton').disabled=true; $('guessButton').textContent='Éliminé · spectateur'; $('multiWaiting')?.classList.remove('hidden'); if ($('multiWaiting')) $('multiWaiting').textContent='Tu es éliminé : observe la manche en cours.'; }
    this.updateMultiHud(me,`Salle ${this.code} · hôte · ${gameModeLabel(this.onlineGameMode)}`); this.renderOnlineStatus({submitted:[]});
    $('multiEmoteBar')?.classList.remove('hidden');
    this.startRoundTimer(this.onlineRoundSeconds);
  }

  async applySharedRound(data) {
    this.clearRoundTimer(); this.submissions.clear(); this.submittedIds.clear(); this.roundClosed=false; this.guessLocked=false; this.gameEnded=false;
    this.active=true; this.started=true; this.kind='online'; this.isHost=false; this.round=Number(data.round)||0; this.game.zoneId=data.zoneId; this.game.mode=data.mode;
    if (ONLINE_ROUND_OPTIONS.has(Number(data.timerSeconds))) this.onlineRoundSeconds=Number(data.timerSeconds);
    if (ONLINE_ROUND_COUNT_OPTIONS.has(Number(data.roundCount))) this.onlineRoundCount=Number(data.roundCount);
    if (ONLINE_MOVEMENT_OPTIONS.has(data.mode)) this.onlineMovementMode=data.mode;
    if (ONLINE_GAME_MODE_OPTIONS.has(data.gameMode)) this.onlineGameMode=data.gameMode;
    this.game.roundCount=this.onlineRoundCount;
    await this.prepareShell();
    this.roundInfo={pano:data.pano,answer:data.answer,description:data.description,heading:data.heading,zoneId:data.zoneId,mode:data.mode,gameMode:this.onlineGameMode,round:this.round,roundCount:this.onlineRoundCount,timerSeconds:this.onlineRoundSeconds};
    const me=this.myPlayer(); this.resetRoundView(me);
    const spectator=this.onlineGameMode==='elimination' && !!me?.eliminated;
    if (spectator) { this.guessLocked=true; $('guessButton').disabled=true; $('guessButton').textContent='Éliminé · spectateur'; $('multiWaiting')?.classList.remove('hidden'); if ($('multiWaiting')) $('multiWaiting').textContent='Tu es éliminé : observe la manche en cours.'; }
    this.updateMultiHud(me,`Salle ${this.code} · ${gameModeLabel(this.onlineGameMode)}`); this.renderOnlineStatus({submitted:[]});
    $('multiplayerModal').classList.add('hidden'); $('multiEmoteBar')?.classList.remove('hidden');
    const seconds=Number(data.timerSeconds);
    if (Number.isFinite(Number(data.deadline)) && Number(data.deadline)>Date.now()) this.startRoundTimer(Math.ceil((Number(data.deadline)-Date.now())/1000),Number(data.deadline));
    else if (Number.isFinite(seconds) && seconds > 0) this.startRoundTimer(seconds);
    else this.clearRoundTimer();
  }

  submitOnline() {
    const me=this.myPlayer(); if (!me || (this.onlineGameMode==='elimination' && me.eliminated) || this.roundClosed || this.guessLocked || this.submissions.has(me.id)) return;
    const payload={type:'guess',round:this.round,guess:{...this.game.guess},seconds:Math.max(1,Math.round((Date.now()-this.game.startTime)/1000)),moves:this.game.moveCount||0,travel:this.game.maxTravel||0};
    this.guessLocked=true;
    const visibleSubmitted=new Set(this.submittedIds); visibleSubmitted.add(me.id);
    $('guessButton').disabled=true; $('guessButton').textContent='Réponse envoyée';
    // The position is locked, but the player can keep looking around. In Move mode, navigation is disabled after validation.
    this.game.panorama?.setOptions({clickToGo:false,linksControl:false});
    this.renderOnlineStatus({submitted:Array.from(visibleSubmitted)});
    if (this.isHost) this.recordOnlineGuess(me.id,payload); else { this.hostConn?.send(payload); $('multiWaiting').classList.remove('hidden'); $('multiWaiting').textContent='Réponse envoyée · en attente des autres joueurs...'; }
  }

  recordOnlineGuess(id,data) {
    if (this.roundClosed || this.submissions.has(id) || !data.guess) return;
    const player=this.players.find(p=>p.id===id); if (!player) return;
    const firstSubmission=this.submissions.size===0;
    const scored=this.scoreGuess(data.guess); scored.seconds=Number(data.seconds)||scored.seconds; scored.moves=Number(data.moves)||0; scored.travel=Number(data.travel)||0;
    this.submissions.set(id,{player,...scored});
    this.submittedIds=new Set(this.submissions.keys());
    this.broadcast({type:'round:status',submitted:Array.from(this.submissions.keys()),players:this.serializedPlayers()});
    this.renderOnlineStatus({submitted:Array.from(this.submissions.keys())});
    if (firstSubmission) this.triggerFinalCountdown();
    this.checkOnlineRoundComplete();
  }

  checkOnlineRoundComplete() {
    if (!this.isHost || !this.started || this.roundClosed || !this.players.length) return;
    const activeIds=this.activeOnlinePlayers().map(p=>p.id);
    if (!activeIds.length || !activeIds.every(id=>this.submissions.has(id))) return;
    this.finalizeOnlineRound(activeIds.map(id=>this.submissions.get(id)).filter(Boolean));
  }

  finalizeOnlineRound(entries) {
    if (this.roundClosed) return;
    this.roundClosed=true; this.guessLocked=true; this.clearRoundTimer();
    entries.forEach(e=>{
      e.player.total=(e.player.total||0)+e.points;
      e.player.rounds[this.round]={points:e.points,distance:e.distance,timedOut:!!e.timedOut};
    });
    this.lastModeEvent=this.applyOnlineGameModeOutcome(entries);
    entries.forEach(e=>{ if (e.player.rounds[this.round]) { e.player.rounds[this.round].hpAfter=e.player.hp; e.player.rounds[this.round].eliminatedAfter=!!e.player.eliminated; } });
    const results=entries.map(e=>({id:e.player.id,name:e.player.name,total:e.player.total,guess:e.guess||null,distance:e.distance,points:e.points,seconds:e.seconds,moves:e.moves,travel:e.travel,timedOut:!!e.timedOut}));
    this.lastRoundResults=results;
    this.broadcast({type:'round:results',round:this.round,answer:this.roundInfo.answer,description:this.roundInfo.description,results,players:this.serializedPlayers(),modeEvent:this.lastModeEvent,gameMode:this.onlineGameMode});
    this.finishRound(entries);
  }

  expireOnlineRound() {
    if (!this.isHost || this.roundClosed) return;
    const entries=[];
    for (const player of this.activeOnlinePlayers()) {
      const existing=this.submissions.get(player.id);
      if (existing) entries.push(existing);
      else entries.push({player,guess:null,distance:null,points:0,seconds:0,moves:0,travel:0,timedOut:true});
    }
    this.finalizeOnlineRound(entries);
  }

  triggerFinalCountdown() {
    if (!this.isHost || this.roundClosed) return;
    const remaining=this.remainingRoundSeconds();
    if (remaining <= ONLINE_FINAL_COUNTDOWN_SECONDS) return;
    this.startRoundTimer(ONLINE_FINAL_COUNTDOWN_SECONDS);
    this.broadcast({type:'round:timer',seconds:ONLINE_FINAL_COUNTDOWN_SECONDS,deadline:this.roundDeadline,reason:'first-submit',round:this.round});
    this.game.showToast?.(`Un joueur a validé : ${ONLINE_FINAL_COUNTDOWN_SECONDS} secondes restantes.`,2600);
  }

  applyRoundTimerUpdate(data) {
    if (this.kind!=='online' || !this.active || data.round!==this.round) return;
    const seconds=Math.max(0,Number(data.seconds)||0);
    if (!seconds) return;
    if (Number.isFinite(Number(data.deadline)) && Number(data.deadline)>Date.now()) this.startRoundTimer(Math.ceil((Number(data.deadline)-Date.now())/1000),Number(data.deadline));
    else this.startRoundTimer(seconds);
    if (data.reason==='first-submit') this.game.showToast?.(`Un joueur a validé : ${seconds} secondes restantes.`,2600);
  }

  remainingRoundSeconds() {
    if (!this.roundDeadline) return 0;
    return Math.max(0,Math.ceil((this.roundDeadline-Date.now())/1000));
  }

  startRoundTimer(seconds, deadline=null) {
    this.clearRoundTimer(false);
    this.roundDeadline=Number.isFinite(Number(deadline)) && Number(deadline)>Date.now() ? Number(deadline) : Date.now()+Math.max(0,seconds)*1000;
    this.lastTimerSecond=null;
    $('multiTimer')?.classList.remove('hidden');
    const tick=()=>{
      const remaining=this.remainingRoundSeconds();
      if (remaining!==this.lastTimerSecond) { this.lastTimerSecond=remaining; this.renderRoundTimer(remaining); }
      if (remaining>0) return;
      if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval=null; }
      this.guessLocked=true;
      if ($('guessButton')) { $('guessButton').disabled=true; if (!$('guessButton').textContent.includes('envoyée')) $('guessButton').textContent='Temps écoulé'; }
      if (!this.isHost && this.active && !this.roundClosed) { $('multiWaiting')?.classList.remove('hidden'); if ($('multiWaiting')) $('multiWaiting').textContent='Temps écoulé · en attente des résultats...'; }
      if (this.isHost && this.active && !this.roundClosed) this.expireOnlineRound();
    };
    tick();
    this.timerInterval=setInterval(tick,250);
  }

  renderRoundTimer(seconds) {
    const box=$('multiTimer'), value=$('multiTimerValue'); if (!box || !value) return;
    const mins=Math.floor(seconds/60), secs=seconds%60; value.textContent=`${mins}:${String(secs).padStart(2,'0')}`;
    box.classList.toggle('urgent',seconds>0 && seconds<=ONLINE_FINAL_COUNTDOWN_SECONDS);
    box.classList.toggle('critical',seconds>0 && seconds<=5);
  }

  clearRoundTimer(hide=true) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval=null; this.roundDeadline=0; this.lastTimerSecond=null;
    if (hide) $('multiTimer')?.classList.add('hidden');
    $('multiTimer')?.classList.remove('urgent','critical');
  }

  getMultiStatusPageSize() {
    return window.innerWidth<=560 ? 2 : 3;
  }

  changeMultiStatusPage(delta=0) {
    const total=this.players.length;
    const pageSize=this.getMultiStatusPageSize();
    const maxPage=Math.max(0,Math.ceil(total/pageSize)-1);
    this.statusPage=Math.min(maxPage,Math.max(0,(this.statusPage||0)+delta));
    this.renderOnlineStatus({submitted:[...this.submittedIds]});
  }

  renderOnlineStatus(data) {
    const previous=new Set(this.submittedIds);
    const next=new Set(data?.submitted||[]);
    const newlySubmitted=new Set(Array.from(next).filter(id=>!previous.has(id)));
    this.submittedIds=next;
    const el=$('multiOnlineStatus'); if (!el) return;
    const countEl=$('multiPlayersCount');
    const prevBtn=$('multiPlayersPrev');
    const nextBtn=$('multiPlayersNext');
    if (prevBtn) prevBtn.onclick=()=>this.changeMultiStatusPage(-1);
    if (nextBtn) nextBtn.onclick=()=>this.changeMultiStatusPage(1);

    const pageSize=this.getMultiStatusPageSize();
    const total=this.players.length;
    const pageCount=Math.max(1,Math.ceil(total/pageSize));
    this.statusPage=Math.min(pageCount-1,Math.max(0,this.statusPage||0));
    const start=this.statusPage*pageSize;
    const visiblePlayers=this.players.slice(start,start+pageSize);

    el.replaceChildren();
    visiblePlayers.forEach((p,offset)=>{
      const i=start+offset;
      const done=this.submittedIds.has(p.id);
      const disconnected=p.connected===false;
      const eliminated=this.onlineGameMode==='elimination' && !!p.eliminated;
      const state=disconnected?'disconnected':eliminated?'eliminated':done?'submitted':'pending';
      const pill=document.createElement('span'); pill.className=`multiStatusPlayer ${state}${newlySubmitted.has(p.id)?' justSubmitted':''}`;
      pill.innerHTML=`${this.playerAvatarHtml(p,i,true)}<span>${esc(p.name)}</span><b>${disconnected?'!':eliminated?'×':done?'✓':'•'}</b>`;
      el.appendChild(pill);
    });

    if (countEl) countEl.textContent=`(${visiblePlayers.length}/${total||0})`;
    if (prevBtn) prevBtn.disabled=this.statusPage<=0 || total<=pageSize;
    if (nextBtn) nextBtn.disabled=this.statusPage>=pageCount-1 || total<=pageSize;

    el.classList.toggle('hidden', this.kind!=='online' || !this.active);
    const firstNew=this.players.find(p=>newlySubmitted.has(p.id));
    if (firstNew && previous.size>0 && firstNew.id!==this.myPlayer()?.id) this.game.showToast?.(`${firstNew.name} a validé sa position.`,1700);
  }

  myPlayer(){ return this.players.find(p=>p.id===this.myId || (p.token && p.token===this.clientToken)) || (this.kind==='local'?this.players[this.localPlayerIndex]:null); }

  returnToOnlineLobbyForRematch() {
    if (!this.isHost || this.kind!=='online') return;
    this.clearRoundTimer(); this.clearMultiMarkers(); this.gameEnded=false; this.started=false; this.active=false; this.round=0; this.roundClosed=false; this.guessLocked=false; this.submissions.clear(); this.submittedIds.clear(); this.lastRoundResults=null; this.lastModeEvent=null; this.rematchRequests.clear(); this.gameHistoryRecorded=false;
    this.players.forEach(p=>{p.total=0;p.rounds=[];p.ready=false;p.eliminated=false;p.eliminatedRound=null;p.hp=this.onlineGameMode==='duel'?DUEL_START_HP:null;});
    this.game.panorama?.setVisible(false); this.game.applyInteractionMode?.();
    $('gameScreen')?.classList.add('hidden'); this.hideMultiEnd(); $('startScreen')?.classList.add('hidden');
    $('multiplayerModal')?.classList.remove('hidden'); this.showOnlineLobby(); this.renderOnlineLobby();
    this.broadcast({type:'game:rematch',players:this.serializedPlayers(),timerSeconds:this.onlineRoundSeconds,roundCount:this.onlineRoundCount,movementMode:this.onlineMovementMode,gameMode:this.onlineGameMode,zoneId:this.game.zoneId});
    this.broadcastLobby();
  }

  enterRematchLobby(data) {
    this.clearRoundTimer(); this.clearMultiMarkers(); this.gameEnded=false; this.started=false; this.active=false; this.round=0; this.roundClosed=false; this.guessLocked=false; this.submissions.clear(); this.submittedIds.clear(); this.lastRoundResults=null; this.lastModeEvent=null; this.rematchRequests.clear(); this.gameHistoryRecorded=false;
    this.players=data.players||this.players;
    if (ONLINE_ROUND_OPTIONS.has(Number(data.timerSeconds))) this.onlineRoundSeconds=Number(data.timerSeconds);
    if (ONLINE_ROUND_COUNT_OPTIONS.has(Number(data.roundCount))) this.onlineRoundCount=Number(data.roundCount);
    if (ONLINE_MOVEMENT_OPTIONS.has(data.movementMode)) this.onlineMovementMode=data.movementMode;
    if (ONLINE_GAME_MODE_OPTIONS.has(data.gameMode)) this.onlineGameMode=data.gameMode;
    if (data.zoneId && this.api.ZONES[data.zoneId]) this.game.zoneId=data.zoneId;
    this.game.panorama?.setVisible(false); this.game.applyInteractionMode?.();
    $('gameScreen')?.classList.add('hidden'); this.hideMultiEnd(); $('startScreen')?.classList.add('hidden');
    $('multiplayerModal')?.classList.remove('hidden'); this.showOnlineLobby(); this.renderOnlineLobby();
    this.game.showToast?.("L'hôte propose une revanche. Indique quand tu es prêt.",3200);
  }

  peerError(err,isHost) {
    const type=err?.type||'';
    const msg=type==='unavailable-id'?'Ce code de salle est déjà utilisé. Réessaie.':type==='peer-unavailable'?'Salle introuvable. Vérifie le code et assure-toi que l\'hôte a bien créé la salle et la garde ouverte.':(err?.message||'Erreur de connexion multijoueur.');
    this.setModalError(msg); this.setOnlineStatus(msg); if (isHost && type==='unavailable-id') setTimeout(()=>this.createOnlineRoom(),400);
  }
  onlineDisconnected(msg) { if (this.started) this.handleGuestConnectionLoss(msg); else { this.setModalError(msg); this.resetOnlineLobby(); } }

  setModalError(text) { const e=$('multiError'); if (!e) return; e.textContent=text||''; e.classList.toggle('hidden',!text); }
  setOnlineStatus(text) { if ($('onlineStatus')) $('onlineStatus').textContent=text; }
  fatalMulti(error) { console.error(error); this.game.showToast?.(error.message||'Erreur multijoueur',5000); this.cleanup(false); this.originalShowMenu(); }

  cleanupPeer(){
    this.closingPeer=true; this.clearReconnectTimer();
    try{this.hostConn?.close();}catch(_){}
    for(const c of this.connections.values())try{c.close();}catch(_){}
    this.connections.clear(); try{this.peer?.destroy();}catch(_){}
    this.peer=null; this.hostConn=null; this.closingPeer=false; this.reconnectAttempts=0;
  }
  cleanup(closePeer=true) {
    this.clearRoundTimer(); this.clearReconnectTimer(); this.clearMultiMarkers(); this.active=false; this.started=false; this.gameEnded=false; this.roundClosed=false; this.guessLocked=false; this.submittedIds.clear(); this.submissions.clear(); this.lastRoundResults=null; this.lastModeEvent=null; this.rematchRequests.clear();
    if (this.emoteHideTimer) clearTimeout(this.emoteHideTimer); this.emoteHideTimer=null;
    $('gameScreen')?.classList.remove('multiplayer-active'); $('multiHud')?.classList.add('hidden'); $('multiOnlineStatus')?.classList.add('hidden'); $('multiEmoteBar')?.classList.add('hidden'); $('multiEmoteToast')?.classList.add('hidden'); $('multiRoundPanel')?.classList.add('hidden'); $('multiTurnOverlay')?.classList.add('hidden'); $('multiWaiting')?.classList.add('hidden'); this.hideMultiEnd(); $('panoInteractionLock')?.classList.add('hidden');
    this.game.roundCount=5;
    if (closePeer) { this.cleanupPeer(); this.resetOnlineLobby(true); this.kind=null; }
  }
}

function boot() {
  if (!window.guessrGame || !window.GUESSR_INTERNALS) return setTimeout(boot,50);
  window.guessrMultiplayer = new MultiplayerController(window.guessrGame, window.GUESSR_INTERNALS);
}
boot();
})();
