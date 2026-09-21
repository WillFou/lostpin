/* LostPin V6.2 - presentation only. Scoring, map search and network clocks remain in their controllers. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const M=window.LostPinHudMath;
const fmt=value=>Number(value||0).toLocaleString('fr-FR');
const html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const visible=el=>!!el && !el.classList.contains('hidden') && el.getBoundingClientRect().height>0;
const pink='#ff2d68',cyan='#3bdcf4',gold='#ffd36e';

class GameplayUI {
  constructor(game){
    this.game=game; this.state='idle'; this.generation=0; this.tasks=new Set(); this.animations=new Set();
    this.resultShapes=[];this.finalShapes=[];this.resultPositions=[];this.finalRecords=[];
    this.mapCanvas=$('guessMap');this.mapHome=$('mapPanel');this.finalBoard=$('finalMapBoard');
    this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
    this.historySignature='';this.lastMapSize='';this.pendingSeconds=null;this.selectedFinal=-1;
    this.bind();this.paintHistory();this.queueLayout();
    // UI repaint only; this interval never drives or changes the authoritative countdown.
    this.historyInterval=setInterval(()=>{if(this.state==='playing'&&visible($('gameScreen')))this.paintHistory();},500);
  }
  get multi(){return window.guessrMultiplayer;}
  get isMulti(){return !!this.multi?.active;}
  later(fn,ms){const token=this.generation;const id=setTimeout(()=>{this.tasks.delete(id);if(token===this.generation)fn();},ms);this.tasks.add(id);return id;}
  animate(fn,ms){
    if(this.reducedMotion.matches){fn(1);return;}
    const token=this.generation,start=performance.now();
    const step=now=>{this.animations.delete(id);if(token!==this.generation)return;const t=Math.min(1,(now-start)/ms);fn(1-Math.pow(1-t,3));if(t<1){id=requestAnimationFrame(step);this.animations.add(id);}};
    let id=requestAnimationFrame(step);this.animations.add(id);
  }
  cancelAnimations(){this.generation++;this.tasks.forEach(clearTimeout);this.tasks.clear();this.animations.forEach(cancelAnimationFrame);this.animations.clear();$('hudConfetti')?.replaceChildren();}
  clearShapes(key){this[key].forEach(x=>{google.maps.event.clearInstanceListeners?.(x);x.setMap(null);});this[key]=[];}
  bind(){
    $('hudHistoryToggle').addEventListener('click',()=>this.toggleHistory());
    $('roundFitButton').addEventListener('click',()=>this.fitResult());
    $('roundRankingToggle').addEventListener('click',()=>this.toggleRanking());
    $('closeRoundRanking').addEventListener('click',()=>this.toggleRanking(false));
    $('finalMapAll').addEventListener('click',()=>this.selectFinal(-1));
    $('celebrationContinue').addEventListener('click',()=>this.dismissCelebration());
    $('multiRecapPlayer').addEventListener('change',()=>this.renderMultiRecap());
    document.addEventListener('pointerdown',event=>{if(!event.target.closest('.hudProgressArea'))this.toggleHistory(false);},true);
    document.addEventListener('keydown',event=>{
      if(event.repeat)return;
      if(visible($('finalCelebration'))&&['Enter','Escape',' '].includes(event.key)){event.preventDefault();this.dismissCelebration();return;}
      if(event.key.toLowerCase()!=='m'||!visible($('gameScreen'))||this.state==='result')return;
      if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
      // Core handles M unless focus is on a map/control; support that case as well.
      if(event.defaultPrevented)return;
      if(event.target.closest('#guessMap,button,a')){event.preventDefault();this.toggleMap();}
    });
    const watch=new ResizeObserver(()=>this.queueLayout());
    ['gameScreen','compass','multiCompactPanel','resultPanel','guessMap','multiRoundPanel'].forEach(id=>watch.observe($(id)));
    watch.observe(document.querySelector('#gameScreen .gameTop'));this.resizeObserver=watch;
    window.addEventListener('resize',()=>this.queueLayout(),{passive:true});
    new MutationObserver(()=>{const running=!$('multiTimer').classList.contains('hidden');$('hudUntimed').classList.toggle('hidden',running);this.queueLayout();}).observe($('multiTimer'),{attributes:true,attributeFilter:['class']});
    new MutationObserver(()=>this.queueLayout()).observe($('compass'),{attributes:true,attributeFilter:['data-style']});
    new MutationObserver(()=>this.queueLayout()).observe($('multiNoticeStack'),{childList:true,attributes:true,attributeFilter:['class']});
    new MutationObserver(()=>this.queueLayout()).observe($('multiEmoteToast'),{attributes:true,attributeFilter:['class']});
    new MutationObserver(()=>this.queueLayout()).observe($('multiCompactPanel'),{attributes:true,attributeFilter:['style','class']});
  }
  beginSession(){this.closeSession();this.historySignature='';}
  restoreMap(){
    if(this.mapCanvas.parentNode===this.mapHome)return;
    this.clearShapes('finalShapes');
    this.mapHome.insertBefore(this.mapCanvas,this.mapHome.querySelector('.mapActions'));
    this.finalBoard && $('finalMapLayout').prepend(this.finalBoard);
    this.lastMapSize='';
    if(this.game.map)google.maps.event.trigger(this.game.map,'resize');
  }
  prepareRound(){
    this.cancelAnimations();this.restoreMap();this.clearShapes('resultShapes');
    this.state='loading';this.pendingSeconds=null;this.resultPositions=[];
    const screen=$('gameScreen');screen.classList.remove('round-reveal','show-ranking','hud-history-open','has-result');
    $('mapPanel').classList.remove('expanded');$('expandMap').setAttribute('aria-expanded','false');$('expandMap').title='Agrandir la carte (M)';
    $('resultPanel').classList.add('hidden');$('multiNextRound').classList.add('hidden');$('hudNextWaiting').classList.add('hidden');$('nextButton').classList.remove('hidden');
    $('roundRankingToggle').classList.add('hidden');$('roundRankingToggle').setAttribute('aria-expanded','false');
    $('multiTimer').classList.add('hidden');$('multiTimer').classList.remove('urgent','critical');
    $('resultPanel').classList.remove('perfect-result');$('finalCelebration').classList.add('hidden');
    this.paintHistory();this.queueLayout();
  }
  onRoundReady(){this.state='playing';this.pendingSeconds=null;this.paintHistory();this.queueLayout();}
  onAnswerSent(){this.pendingSeconds=Math.max(0,Math.round((Date.now()-this.game.startTime)/1000));this.paintHistory();}
  closeSession(){
    this.cancelAnimations();this.restoreMap();this.clearShapes('resultShapes');this.state='idle';this.resultPositions=[];
    $('gameScreen').classList.remove('round-reveal','has-result','show-ranking','hud-history-open');
    $('finalCelebration').classList.add('hidden');$('hudNextWaiting').classList.add('hidden');
    $('multiTimer').classList.add('hidden');
    this.historySignature='';
  }
  paintTimer(seconds,duration){
    const box=$('multiTimer');
    box.style.setProperty('--timer-progress',String(M.clamp(seconds/Math.max(1,duration),0,1)));
    box.setAttribute('aria-label',`Temps restant : ${M.clock(seconds)}`);
    this.paintHistory();
  }
  paintHistory(){
    const g=this.game,m=this.multi,isMulti=this.isMulti;
    const count=Math.max(1,Number(isMulti?m.getRoundCount():g.roundCount)||5);
    const round=Math.min(count-1,Math.max(0,Number(isMulti?m.round:g.round)||0));
    const rounds=isMulti?(m.myPlayer()?.rounds||[]):(g.results||[]);
    const total=isMulti?(m.myPlayer()?.total||0):g.total||0;
    const elapsed=this.pendingSeconds??(this.state==='playing'&&g.startTime?Math.max(0,Math.floor((Date.now()-g.startTime)/1000)):0);
    const signature=JSON.stringify([count,round,rounds.map(r=>r&&[r.points,r.seconds,r.timedOut]),total,elapsed,this.state,this.pendingSeconds]);
    if(signature===this.historySignature)return;this.historySignature=signature;
    $('scoreLabel').textContent=fmt(total);$('roundLabel').textContent=`${round+1} / ${count}`;
    const history=$('hudRoundHistory');history.replaceChildren();
    for(let i=0;i<count;i++){
      const record=rounds[i],current=i===round,done=record&&Number.isFinite(Number(record.points));
      const item=document.createElement('li');item.className=`hudRoundCell${current?' current':''}${done?' complete':''}`;
      const score=done?fmt(record.points):(current?'EN COURS':'\u2014');
      const time=done?(record.timedOut?'Sans r\u00e9ponse':(Number.isFinite(record.seconds)?M.clock(record.seconds):'Termin\u00e9e')):(current?(this.state==='loading'?'Chargement':this.pendingSeconds!=null?'Envoy\u00e9e':M.clock(elapsed)):'\u00c0 venir');
      item.innerHTML=`<span>R${i+1}</span><b>${score}</b><small>${time}</small>`;
      item.title=`Manche ${i+1} : ${done?score+' points':current?'en cours':'\u00e0 venir'} \u00b7 ${time}`;
      if(current)item.setAttribute('aria-current','step');history.append(item);
    }
    $('gameScreen').classList.toggle('history-many',count>5);
  }
  toggleHistory(force){
    const screen=$('gameScreen'),open=force??!screen.classList.contains('hud-history-open');
    screen.classList.toggle('hud-history-open',open);$('hudHistoryToggle').setAttribute('aria-expanded',String(open));
  }
  toggleMap(force){
    if(this.state==='result'||!visible($('gameScreen'))||this.game.roundLocked)return;
    const panel=$('mapPanel');const center=this.game.map?.getCenter();const zoom=this.game.map?.getZoom();
    const expand=force??!panel.classList.contains('expanded');panel.classList.toggle('expanded',expand);
    const button=$('expandMap');button.setAttribute('aria-expanded',String(expand));button.setAttribute('aria-label',expand?'R\u00e9duire la carte':'Agrandir la carte');button.title=`${expand?'R\u00e9duire':'Agrandir'} la carte (M)`;
    // Preserve the player's current selection and camera. No re-fit to the answer here.
    this.later(()=>{if(this.game.map){google.maps.event.trigger(this.game.map,'resize');if(center)this.game.map.setCenter(center);if(Number.isFinite(zoom))this.game.map.setZoom(zoom);}},250);
    this.queueLayout();
  }
  onEscape(){
    if(visible($('finalCelebration'))){this.dismissCelebration();return true;}
    if($('gameScreen').classList.contains('hud-history-open')){this.toggleHistory(false);return true;}
    if($('gameScreen').classList.contains('show-ranking')){this.toggleRanking(false);return true;}
    if(this.state!=='result'&&$('mapPanel').classList.contains('expanded')){this.toggleMap(false);return true;}
    return false;
  }
  continueRound(){
    if(this.state!=='result')return;
    if(this.isMulti){const next=$('multiNextRound');if(visible(next)&&!next.disabled)next.click();}
    else if(!$('nextButton').disabled)$('nextButton').click();
  }
  showSoloResult(record){
    if(!record)return;
    this.showResult(record,[{guess:record.guess,answer:record.answer,points:record.points,own:true}]);
  }
  showMultiResult(entries){
    const multi=this.multi,me=multi.myPlayer();
    const mine=entries.find(e=>(e.player?.id||e.id)===me?.id);
    // Optional fields are also reconstructed locally for older peers / reconnects.
    entries.forEach(e=>{
      const player=e.player||multi.players.find(p=>p.id===e.id);if(!player)return;
      player.rounds??=[];player.rounds[multi.round]={...player.rounds[multi.round],points:e.points,distance:e.distance,seconds:e.seconds,timedOut:!!e.timedOut,
        guess:M.position(e.guess),answer:M.position(multi.roundInfo.answer),description:multi.roundInfo.description,pano:multi.roundInfo.pano};
    });
    const record={...mine,points:mine?.points||0,guess:mine?.guess||null,answer:multi.roundInfo.answer,description:multi.roundInfo.description,timedOut:mine?.timedOut||!mine,seconds:mine?.seconds||0};
    this.game.updateRoundResultUX(record.points,{timedOut:record.timedOut});
    $('resultPlace').textContent=record.description||'';
    $('distanceLabel').textContent=Number.isFinite(record.distance)?window.GUESSR_INTERNALS.formatDistance(record.distance):'Sans r\u00e9ponse';
    $('roundScoreLabel').textContent=fmt(record.points);
    $('travelInfo').textContent=mine?`${M.clock(record.seconds)} \u00b7 ${multi.onlineGameMode==='duel'?'Duel':multi.onlineGameMode==='elimination'?'\u00c9limination':'Multijoueur classique'}`:'Spectateur';
    $('streetViewLink').href=`https://www.google.com/maps/@?api=1&map_action=pano&pano=${encodeURIComponent(multi.roundInfo.pano||'')}`;
    $('placeLink').href=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${record.answer.lat},${record.answer.lng}`)}`;
    $('nextButton').classList.add('hidden');$('multiNextRound').classList.toggle('hidden',!multi.isHost);
    $('hudNextWaiting').classList.toggle('hidden',multi.isHost);$('roundRankingToggle').classList.remove('hidden');
    $('multiWaiting').classList.add('hidden');
    this.showResult(record,entries.filter(e=>e.guess).map((e,i)=>({guess:e.guess,answer:multi.roundInfo.answer,points:e.points,
      own:(e.player?.id||e.id)===me?.id,label:String(i+1),name:e.player?.name||e.name,color:e.player?.color||multi.players.find(p=>p.id===e.id)?.color})));
  }
  showResult(record,entries){
    this.cancelAnimations();this.clearShapes('resultShapes');this.state='result';this.pendingSeconds=null;this.currentRecord=record;
    const g=this.game;g.roundLocked=true;g.clearMapObjects();if(this.isMulti)this.multi.clearMultiMarkers();
    $('gameScreen').classList.add('has-result','round-reveal');$('gameScreen').classList.remove('hud-history-open');
    $('resultPanel').classList.remove('hidden');$('mapPanel').classList.remove('expanded');
    $('resultPanel').classList.toggle('perfect-result',record.points===5000&&!record.timedOut);
    if(record.points===5000&&!record.timedOut)$('roundVerdict').textContent='PARFAIT !';
    const answer=M.position(record.answer);this.resultPositions=answer?[answer]:[];
    const lines=[];
    entries.forEach((entry,index)=>{
      const guess=M.position(entry.guess);if(!guess)return;
      this.resultPositions.push(guess);
      const color=entry.own?pink:entry.color||'#9474f4';
      this.marker(guess,entry.own?'T':entry.label||String(index+1),color,entry.own?'Ta r\u00e9ponse':entry.name||'Proposition',this.resultShapes,30);
      if(answer){const line=new google.maps.Polyline({map:g.map,path:[guess,guess],geodesic:true,strokeColor:color,strokeOpacity:.9,strokeWeight:3,clickable:false,zIndex:2});this.resultShapes.push(line);lines.push({line,guess,answer});}
    });
    if(answer)this.marker(answer,'R',cyan,'Lieu r\u00e9el',this.resultShapes,40);
    $('resultLegend').innerHTML=`<span class="legendItem"><i class="legendDot guess"></i>${this.isMulti?'Propositions':'T \u00b7 Ta r\u00e9ponse'}</span><span class="legendItem"><i class="legendDot answer"></i>R \u00b7 Lieu r\u00e9el</span>`;
    const fullScore=record.points||0;$('roundScoreLabel').textContent=fmt(fullScore);
    this.paintHistory();this.queueLayout();
    this.later(()=>{
      this.fitResult();
      this.animate(t=>{lines.forEach(x=>x.line.setPath([x.guess,M.interpolate(x.guess,x.answer,t)]));$('roundScoreLabel').textContent=fmt(Math.round(fullScore*t));},620);
      if(record.points===5000&&!record.timedOut){window.guessrMusic?.perfectRound?.();this.celebrate();}
    },this.reducedMotion.matches?0:240);
    // Buttons remain usable throughout the animation; there is no forced wait.
    this.later(()=>{const button=this.isMulti?(this.multi.isHost?$('multiNextRound'):$('roundRankingToggle')):$('nextButton');button?.focus({preventScroll:true});},300);
  }
  marker(pos,label,color,title,store,zIndex=20){
    const marker=new google.maps.Marker({map:this.game.map,position:pos,title,zIndex,label:{text:label,color:'#fff',fontSize:label.length>2?'10px':'12px',fontWeight:'800'},
      icon:{path:google.maps.SymbolPath.CIRCLE,scale:label.length>2?15:13,fillColor:color,fillOpacity:1,strokeColor:'#fff',strokeOpacity:1,strokeWeight:3}});
    store.push(marker);return marker;
  }
  fitPositions(positions){
    const map=this.game.map,bounds=M.boundsFor(positions);if(!map||!bounds)return;
    google.maps.event.trigger(map,'resize');
    const width=this.mapCanvas.clientWidth,height=this.mapCanvas.clientHeight;
    if(width<20||height<20)return;
    const lngSpan=((bounds.east-bounds.west)%360+360)%360;
    if(Math.abs(bounds.north-bounds.south)<.0001&&lngSpan<.0001){map.setCenter(positions.map(M.position).find(Boolean));map.setZoom(17);return;}
    map.fitBounds(bounds,Math.max(24,Math.min(64,width*.055,height*.12)));
    // No extra panorama/map is instantiated for the reveal or the recap.
    const token=this.generation;
    const limit=()=>{if(token===this.generation&&map.getZoom()>18)map.setZoom(18);};
    google.maps.event.addListenerOnce(map,'idle',limit);
  }
  fitResult(){if(this.state==='result')this.fitPositions(this.resultPositions);}
  toggleRanking(force){const open=force??!$('gameScreen').classList.contains('show-ranking');$('gameScreen').classList.toggle('show-ranking',open);$('roundRankingToggle').setAttribute('aria-expanded',String(open));this.queueLayout();}
  celebrate(){
    if(this.reducedMotion.matches)return;
    const host=$('hudConfetti');host.replaceChildren();
    for(let i=0;i<28;i++){const p=document.createElement('i');p.style.cssText=`--x:${12+Math.random()*76}%;--delay:${Math.random()*.35}s;--drift:${(Math.random()-.5)*180}px;--color:${[pink,cyan,gold,'#fff'][i%4]};`;host.append(p);}
    this.later(()=>host.replaceChildren(),2200);
  }
  showFinal(){
    this.cancelAnimations();this.clearShapes('resultShapes');this.state='final';this.game.clearMapObjects();
    const records=this.game.results.map((r,i)=>({...r,roundIndex:i,label:`Manche ${i+1}`,own:true}));
    $('finalMapLayout').prepend(this.finalBoard);this.renderRecap(records,$('breakdown'));
    const celebration=$('finalCelebration');
    if(!this.reducedMotion.matches){
      $('celebrationVerdict').textContent=$('finalVerdict').textContent;$('celebrationScore').textContent=fmt(this.game.total);$('celebrationMax').textContent=`sur ${fmt((this.game.roundCount||5)*5000)} points`;
      celebration.classList.remove('hidden');$('celebrationContinue').focus({preventScroll:true});this.later(()=>this.dismissCelebration(),1800);
    }
    this.queueLayout();
  }
  dismissCelebration(){if($('finalCelebration').classList.contains('hidden'))return;$('finalCelebration').classList.add('hidden');$('finalMapAll').focus({preventScroll:true});}
  showMultiFinal(players){
    this.cancelAnimations();this.clearShapes('resultShapes');this.state='multi-final';this.game.clearMapObjects();this.multi.clearMultiMarkers();
    this.recapPlayers=players;
    const select=$('multiRecapPlayer');select.replaceChildren();
    players.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;select.append(o);});
    const all=document.createElement('option');all.value='*';all.textContent='Tous les joueurs';select.append(all);
    if(players.some(p=>p.id===this.multi.myPlayer()?.id))select.value=this.multi.myPlayer().id;
    $('multiMapDock').append(this.finalBoard);this.renderMultiRecap();
  }
  renderMultiRecap(){
    const selected=$('multiRecapPlayer').value,me=this.multi.myPlayer()?.id;
    const records=(this.recapPlayers||[]).filter(p=>selected==='*'||p.id===selected).flatMap(p=>(p.rounds||[]).map((r,i)=>r?({...r,roundIndex:i,label:`${p.name} \u00b7 Manche ${i+1}`,own:p.id===me,color:p.color}):null).filter(Boolean));
    const list=$('multiRecapList');list.replaceChildren();records.forEach(r=>{const b=document.createElement('button');b.type='button';b.className='breakRow';b.innerHTML=`<span class="roundNum">${r.roundIndex+1}</span><span><strong>${html(r.label)}</strong><small>${r.timedOut?'Sans r\u00e9ponse':Number.isFinite(r.distance)?window.GUESSR_INTERNALS.formatDistance(r.distance):'Distance indisponible'} \u00b7 ${Number.isFinite(r.seconds)?M.clock(r.seconds):'\u2014'}</small></span><b>${fmt(r.points)} pts</b>`;list.append(b);});
    this.renderRecap(records,list);
  }
  renderRecap(records,list){
    this.clearShapes('finalShapes');this.finalRecords=records;this.finalList=list;this.finalGroups=[];
    $('finalMapHost').prepend(this.mapCanvas);google.maps.event.trigger(this.game.map,'resize');
    const valid=records.some(r=>M.position(r.answer)||M.position(r.guess));$('finalMapEmpty').classList.toggle('hidden',valid);
    records.forEach((record,i)=>{
      const group=[],answer=M.position(record.answer),guess=M.position(record.guess),n=String(record.roundIndex+1),color=record.own?pink:record.color||pink;
      if(guess){const m=this.marker(guess,`T${n}`,color,`${record.label} \u00b7 Proposition`,group);m.addListener('click',()=>this.selectFinal(i));}
      if(answer){const m=this.marker(answer,`R${n}`,cyan,`${record.label} \u00b7 ${record.description||'Lieu r\u00e9el'}`,group);m.addListener('click',()=>this.selectFinal(i));}
      if(guess&&answer)group.push(new google.maps.Polyline({map:this.game.map,path:[guess,answer],geodesic:true,strokeColor:color,strokeOpacity:.68,strokeWeight:2,clickable:false}));
      this.finalGroups.push(group);this.finalShapes.push(...group);
    });
    [...list.children].forEach((row,i)=>{
      row.setAttribute('role','button');row.tabIndex=0;row.setAttribute('aria-label',`${records[i]?.label||'Manche'} : voir sur la carte`);
      row.onclick=()=>this.selectFinal(i);row.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();this.selectFinal(i);}};
    });
    this.selectedFinal=-1;this.later(()=>this.selectFinal(-1),60);this.queueLayout();
  }
  selectFinal(index){
    this.selectedFinal=index;const record=this.finalRecords[index];
    const positions=(record?[record]:this.finalRecords).flatMap(r=>[r.guess,r.answer]).filter(M.position);
    this.finalGroups.forEach((group,i)=>group.forEach(shape=>{const highlighted=index<0||i===index;if(shape.setOpacity)shape.setOpacity(highlighted?1:.22);else shape.setOptions({strokeOpacity:highlighted?.9:.12,strokeWeight:i===index?4:2});}));
    [...this.finalList.children].forEach((row,i)=>{row.classList.toggle('selected-round',i===index);row.setAttribute('aria-pressed',String(i===index));});
    $('finalMapTitle').textContent=record?record.label:'Chaque lieu. Chaque r\u00e9ponse.';
    $('finalMapCaption').textContent=record?(record.description||'Lieu r\u00e9el'):`Vue d'ensemble \u00b7 ${this.finalRecords.length} r\u00e9ponse${this.finalRecords.length>1?'s':''}`;
    $('finalMapAll').classList.toggle('active',index<0);this.fitPositions(positions);
  }
  queueLayout(){if(this.layoutFrame)return;this.layoutFrame=requestAnimationFrame(()=>{this.layoutFrame=null;this.layout();});}
  setVar(element,key,value){if(element.style.getPropertyValue(key)!==value)element.style.setProperty(key,value);}
  layout(){
    const screen=$('gameScreen'),shown=visible(screen);
    if(shown){
      const header=screen.querySelector('.gameTop').getBoundingClientRect();this.setVar(screen,'--game-bar-h',`${Math.ceil(header.height)}px`);
      if(this.state==='result'){this.setVar(screen,'--result-dock-h',`${Math.ceil($('resultPanel').getBoundingClientRect().height)}px`);}
      this.placeNotices();
      if(!this.multi?.multiCompactDrag&&visible($('multiCompactPanel'))&&this.isMulti){
        const panel=$('multiCompactPanel'),r=panel.getBoundingClientRect();const pos=this.constrainJR({x:r.left,y:r.top},r.width,r.height);
        if(Math.abs(pos.x-r.left)>1||Math.abs(pos.y-r.top)>1)this.multi.applyMultiCompactPanelPosition?.(pos,false);
      }
    }
    const size=`${this.mapCanvas.clientWidth}x${this.mapCanvas.clientHeight}`;
    if(size!==this.lastMapSize&&this.game.map&&this.mapCanvas.clientWidth>0){
      this.lastMapSize=size;google.maps.event.trigger(this.game.map,'resize');
      if(this.state==='result')this.fitResult();
      else if(['final','multi-final'].includes(this.state)){
        const record=this.finalRecords[this.selectedFinal];this.fitPositions((record?[record]:this.finalRecords).flatMap(r=>[r.guess,r.answer]).filter(M.position));
      }
    }
  }
  constrainJR(pos,width,height){
    if(this.state==='result')return pos;
    const bar=Number.parseFloat(getComputedStyle($('gameScreen')).getPropertyValue('--game-bar-h'))||86;
    const maxX=Math.max(8,innerWidth-width-8),maxY=Math.max(bar+8,innerHeight-height-8);
    const clamp=p=>({x:M.clamp(p.x,8,maxX),y:M.clamp(p.y,bar+8,maxY)});
    let p=clamp(pos);
    const obstacles=[$('compass'),$('mapPanel')].filter(visible).map(el=>el.getBoundingClientRect());
    const rect=q=>({left:q.x,right:q.x+width,top:q.y,bottom:q.y+height});
    if(!obstacles.some(o=>M.overlap(rect(p),o,10)))return p;
    const candidates=[p,...obstacles.flatMap(o=>[clamp({x:o.left-width-12,y:p.y}),clamp({x:o.right+12,y:p.y}),clamp({x:p.x,y:o.bottom+12}),clamp({x:p.x,y:o.top-height-12})])];
    candidates.push(clamp({x:8,y:bar+8}),clamp({x:8,y:obstacles[0]?.bottom+12||bar+8}));
    const free=candidates.filter(q=>!obstacles.some(o=>M.overlap(rect(q),o,8)));
    if(free.length)return free.sort((a,b)=>Math.hypot(a.x-pos.x,a.y-pos.y)-Math.hypot(b.x-pos.x,b.y-pos.y))[0];
    // Small screens use a scrollable compact panel under the compass.
    return clamp({x:8,y:Math.max(bar+8,obstacles[0]?.bottom+10||0)});
  }
  placeNotices(){
    if(this.state==='result')return;
    const compass=$('compass').getBoundingClientRect();
    const bar=screenBar();let y=bar+12;
    const stack=$('multiNoticeStack');
    const width=Math.min(350,innerWidth-24),x=innerWidth-width-12;
    const candidate=()=>({left:x,right:x+width,top:y,bottom:y+96});
    if(M.overlap(candidate(),compass,12))y=compass.bottom+12;
    const panel=$('multiCompactPanel');if(visible(panel)&&M.overlap(candidate(),panel.getBoundingClientRect(),8))y=panel.getBoundingClientRect().bottom+10;
    this.setVar(stack,'--notice-top',`${Math.round(y)}px`);
    const emote=$('multiEmoteToast');this.setVar(emote,'--notice-top',`${Math.round(y+(visible(stack)?stack.getBoundingClientRect().height+8:0))}px`);
    // Generic busy/toast notices also avoid the compass, including the tall styles.
    for(const id of ['toast','busyBadge'])this.setVar($(id),'--notice-top',`${Math.round(Math.max(y,compass.bottom+12))}px`);
  }
}
function screenBar(){return document.querySelector('#gameScreen .gameTop').getBoundingClientRect().height||86;}
if(window.guessrGame&&M)window.lostPinHUD=new GameplayUI(window.guessrGame);
})();
