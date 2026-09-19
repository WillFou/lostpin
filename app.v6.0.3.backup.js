(() => {
'use strict';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rad = d => d * Math.PI / 180;
const EARTH = 6371008.8;
const RECENT_KEY = 'guessr360-v3-recent';
const BEST_KEY = 'guessr360-v3-best';
const PERFECT_KEY = 'guessr360-v36-perfects';
const COMPASS_STYLE_KEY = 'guessr360-v37-compass-style';
const COMPASS_STYLES = ['band','circle','minimal','rose','pano','hybrid','real','vintage'];
const COMPASS_STYLE_NAMES = {band:'Bandeau',circle:'Circulaire',minimal:'Minimaliste',rose:'Rose des vents',pano:'Panorama',hybrid:'Hybride',real:'Réelle stylisée',vintage:'Vintage'};

function haversine(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const la1 = rad(a.lat), la2 = rad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH * Math.asin(Math.sqrt(h));
}

function pointInPolygon(point, polygon) {
  let inside = false;
  const x = point.lng, y = point.lat;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const crosses = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi);
    if (crosses) inside = !inside;
  }
  return inside;
}

function boundsOf(polygons) {
  const pts = polygons.flat();
  return {
    west: Math.min(...pts.map(p => p[0])), east: Math.max(...pts.map(p => p[0])),
    south: Math.min(...pts.map(p => p[1])), north: Math.max(...pts.map(p => p[1]))
  };
}

function randomInBounds(b) {
  return { lat: b.south + Math.random() * (b.north - b.south), lng: b.west + Math.random() * (b.east - b.west) };
}

function randomInPolygon(poly, max = 150) {
  const b = boundsOf([poly]);
  for (let i = 0; i < max; i++) {
    const p = randomInBounds(b);
    if (pointInPolygon(p, poly)) return p;
  }
  return { lat: (b.south + b.north) / 2, lng: (b.west + b.east) / 2 };
}

function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  if (m < 10000) return `${(m / 1000).toFixed(2).replace('.', ',')} km`;
  return `${Math.round(m / 1000).toLocaleString('fr-FR')} km`;
}

function normalizeHeading(value) {
  const h = Number(value) || 0;
  return ((h % 360) + 360) % 360;
}

function headingDifference(a, b) {
  const d = Math.abs(normalizeHeading(a) - normalizeHeading(b));
  return Math.min(d, 360 - d);
}

function compassLabel(heading) {
  const labels = ['N','NE','E','SE','S','SO','O','NO'];
  return labels[Math.round(normalizeHeading(heading) / 45) % 8];
}

function scoreFor(distanceMeters, scaleMeters) {
  if (distanceMeters <= 25) return 5000;
  return clamp(Math.round(5000 * Math.exp(-(distanceMeters - 25) / scaleMeters)), 0, 5000);
}

function precisionScoreFor(distanceMeters, scaleMeters) {
  if (distanceMeters <= 25) return 5000;
  const span=Math.max(1,Number(scaleMeters)||1);
  return clamp(Math.round(5000 * (1 - (distanceMeters - 25) / span)), 0, 5000);
}

function variantLabel(variant) {
  return variant==='blitz' ? 'Blitz' : variant==='precision' ? 'Précision' : 'Classique';
}

function offsetPoint(origin, distanceMeters, bearingDegrees) {
  const angular = Math.max(0, Number(distanceMeters) || 0) / EARTH;
  const bearing = rad(bearingDegrees);
  const lat1 = rad(origin.lat), lng1 = rad(origin.lng);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing));
  const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1), Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));
  return {lat:lat2 * 180 / Math.PI,lng:((lng2 * 180 / Math.PI + 540) % 360) - 180};
}

function formatClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(total / 60), secs = total % 60;
  return `${mins}:${String(secs).padStart(2,'0')}`;
}

function explorationScore(seconds, moves, directDistance, routeDistance) {
  const safeDirect = Math.max(1, Number(directDistance) || 1);
  const safeRoute = Math.max(safeDirect, Number(routeDistance) || safeDirect);
  const detourRatio = Math.max(0, safeRoute / safeDirect - 1);
  const timePenalty = Math.min(1500, Math.round(Math.max(0, seconds) * 3));
  const movePenalty = Math.min(1500, Math.round(Math.max(0, moves) * 8));
  const detourPenalty = Math.min(1500, Math.round(detourRatio * 800));
  return clamp(5000 - timePenalty - movePenalty - detourPenalty, 500, 5000);
}

function readJSON(key, fallback) {
  try { const x = JSON.parse(localStorage.getItem(key)); return x ?? fallback; } catch (_) { return fallback; }
}
function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }

// Paris: no hand-drawn arrondissement polygons; official contours are loaded before play.
// Exact game contours are loaded from the official Ville de Paris / CapGeo layer
// COMMUNE_ARDT_BOIS and only features with B_BOIS = "N" are used. This keeps the
// urban parts of the 20 arrondissements while excluding Bois de Boulogne/Vincennes.
const PARIS_CONTOURS_ENDPOINTS = [
  'https://capgeo2.paris.fr/mobile/rest/services/BASEMAPS/FDC_CAPGEO_Fond_Ville/MapServer/250/query',
  'https://capgeo2.paris.fr/mobile/rest/services/BASEMAPS/FDC_CAPGEO_Fond_Ville_3857/MapServer/250/query'
];
const PARIS_CONTOURS_SOURCE = 'Ville de Paris / CapGeo - COMMUNE_ARDT_BOIS';
const PARIS_CONTOURS_CACHE_KEY = 'guessr360-v34-paris-official-contours';
const PARIS_CONTOURS_CACHE_VERSION = 1;
const PARIS_CONTOURS_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function propCI(props, name) {
  const wanted = name.toLowerCase();
  const key = Object.keys(props || {}).find(k => k.toLowerCase() === wanted);
  return key ? props[key] : undefined;
}

function outerRings(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) return [];
  let candidates = [];
  if (geometry.type === 'Polygon') candidates = [geometry.coordinates];
  else if (geometry.type === 'MultiPolygon') candidates = geometry.coordinates;
  else return [];
  return candidates
    .map(poly => Array.isArray(poly) && Array.isArray(poly[0]) ? poly[0] : null)
    .filter(ring => Array.isArray(ring) && ring.length >= 4)
    .map(ring => ring
      .map(p => [Number(p[0]), Number(p[1])])
      .filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1])))
    .filter(ring => ring.length >= 4);
}

function parseOfficialParisContours(geojson) {
  if (!geojson || !Array.isArray(geojson.features)) throw new Error('Réponse GeoJSON invalide.');
  const byArrondissement = {};
  for (const feature of geojson.features) {
    const props = feature.properties || {};
    const wood = String(propCI(props, 'b_bois') || '').trim().toUpperCase();
    if (wood !== 'N') continue;

    const insee = Number(propCI(props, 'c_cainsee'));
    let ar = insee >= 75101 && insee <= 75120 ? insee - 75100 : NaN;
    if (!(ar >= 1 && ar <= 20)) ar = Number(propCI(props, 'n_sq_ar'));
    if (!(ar >= 1 && ar <= 20)) continue;

    const rings = outerRings(feature.geometry).filter(ring => ring.every(([lng, lat]) => lng > 2.1 && lng < 2.5 && lat > 48.7 && lat < 49.0));
    if (!rings.length) continue;
    if (!byArrondissement[ar]) byArrondissement[ar] = [];
    byArrondissement[ar].push(...rings);
  }

  const missing = Array.from({length:20}, (_, i) => i + 1).filter(ar => !byArrondissement[ar]?.length);
  if (missing.length) throw new Error(`Contours incomplets (arrondissements manquants : ${missing.join(', ')}).`);
  return byArrondissement;
}

function polygonAreaWeight(poly) {
  if (!poly?.length) return 0;
  const meanLat = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  const xScale = Math.cos(rad(meanLat));
  let twiceArea = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    twiceArea += (poly[j][0] * xScale) * poly[i][1] - (poly[i][0] * xScale) * poly[j][1];
  }
  return Math.max(1e-12, Math.abs(twiceArea) / 2);
}

function weightedPolygon(polygons) {
  const weighted = polygons.map(p => ({p, w:polygonAreaWeight(p)}));
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const x of weighted) { r -= x.w; if (r <= 0) return x.p; }
  return weighted[weighted.length - 1].p;
}
const DC = [[-77.1198,38.9343],[-77.0716,38.9667],[-77.0410,38.9955],[-76.9094,38.8930],[-76.9320,38.8700],[-77.0410,38.7916],[-77.0615,38.8175],[-77.0950,38.8635]];
const FRANCE_MAIN = [[6.18632,49.4638],[6.65823,49.20196],[8.09928,49.01778],[7.59368,48.33302],[7.46676,47.62058],[7.1922,47.44977],[6.73657,47.5418],[6.76871,47.28771],[6.03739,46.72578],[6.02261,46.27299],[6.5001,46.42967],[6.84359,45.99115],[6.80236,45.70858],[7.09665,45.3331],[6.74996,45.02852],[7.00756,44.25477],[7.5496,44.1279],[7.43518,43.69384],[6.52925,43.12889],[4.55696,43.39965],[3.10041,43.0752],[2.986,42.47302],[1.82679,42.34338],[0.70159,42.79573],[0.33805,42.57955],[-1.50277,43.03401],[-1.90135,43.4228],[-1.38423,44.02261],[-1.1938,46.01492],[-2.22572,47.06436],[-2.96328,47.57033],[-4.49155,47.95495],[-4.59235,48.68416],[-3.29581,48.90169],[-1.61651,48.64442],[-1.93349,49.77634],[-0.98947,49.34738],[1.33876,50.12717],[1.639,50.94661],[2.51357,51.14851],[2.65842,50.79685],[3.12325,50.78036],[3.58818,50.37899],[4.28602,49.9075],[4.79922,49.98537],[5.67405,49.52948],[5.89776,49.44267],[6.18632,49.4638]];
const CORSICA = [[8.74601,42.62812],[9.39,43.00998],[9.56002,42.15249],[9.22975,41.38001],[8.77572,41.58361],[8.54421,42.25652],[8.74601,42.62812]];
// Bagneux-la-Fosse: deliberately reduced PLAY area around the village centre.
// The full commune is much larger (mostly countryside); this ~1.5 km radius
// keeps rounds concentrated on the village and its immediate roads.
const BAGNEUX_PLAY = [
  [4.31874,47.99330],[4.31604,48.00005],[4.30867,48.00498],
  [4.29860,48.00679],[4.28853,48.00498],[4.28116,48.00005],
  [4.27846,47.99330],[4.28116,47.98656],[4.28853,47.98162],
  [4.29860,47.97981],[4.30867,47.98162],[4.31604,47.98656]
];

const GEO_CATALOG = window.LOSTPIN_GEOGRAPHY || {};
const WORLD_AREAS = Array.isArray(GEO_CATALOG.WORLD_AREAS) ? GEO_CATALOG.WORLD_AREAS : [];
const CONTINENT_AREAS = GEO_CATALOG.CONTINENT_AREAS || {
  europe:[], northAmerica:[], southAmerica:[], asia:[], africa:[], oceania:[]
};

const ZONES = {
  // Paris polygons are hydrated from the official City of Paris dataset before play.
  paris: {name:'Paris', center:{lat:48.8566,lng:2.3522}, zoom:12, polygons:[], radius:300, attempts:30, scale:4200, recent:900, requireLinks:true, officialParis:true},
  paris13: {name:'Paris 13e', center:{lat:48.8298,lng:2.3598}, zoom:14, polygons:[], radius:200, attempts:32, scale:1300, recent:300, requireLinks:true, strictCandidate:true, officialParis:true},
  parisGroup: {name:'Paris 5e / 6e / 7e / 13e', center:{lat:48.844,lng:2.339}, zoom:13, polygons:[], groups:[], radius:200, attempts:32, scale:2700, recent:500, requireLinks:true, balanced:true, strictCandidate:true, officialParis:true},
  bagneux: {name:'Bagneux-la-Fosse', center:{lat:47.9933,lng:4.2986}, zoom:15, polygons:[BAGNEUX_PLAY], radius:300, attempts:38, scale:1800, recent:180, requireLinks:true, strictCandidate:true},
  washington: {name:'Washington DC', center:{lat:38.9072,lng:-77.0369}, zoom:12, polygons:[DC], radius:450, attempts:24, scale:5200, recent:900, requireLinks:true},
  france: {name:'France', center:{lat:46.5,lng:2.3}, zoom:6, polygons:[FRANCE_MAIN,CORSICA], radius:3500, attempts:34, scale:390000, recent:30000, requireLinks:true},
  world: {name:'Monde', center:{lat:18,lng:10}, zoom:2, areas:WORLD_AREAS, radius:5000, attempts:38, scale:2200000, recent:250000, requireLinks:true},
  europe: {name:'Europe', center:{lat:50,lng:12}, zoom:4, areas:CONTINENT_AREAS.europe, radius:5000, attempts:40, scale:900000, recent:90000, requireLinks:true},
  northAmerica: {name:'Amérique du Nord', center:{lat:39,lng:-99}, zoom:3, areas:CONTINENT_AREAS.northAmerica, radius:6000, attempts:42, scale:1500000, recent:150000, requireLinks:true},
  southAmerica: {name:'Amérique du Sud', center:{lat:-18,lng:-60}, zoom:3, areas:CONTINENT_AREAS.southAmerica, radius:6000, attempts:42, scale:1400000, recent:150000, requireLinks:true},
  asia: {name:'Asie', center:{lat:25,lng:108}, zoom:3, areas:CONTINENT_AREAS.asia, radius:6000, attempts:42, scale:1500000, recent:150000, requireLinks:true},
  africa: {name:'Afrique', center:{lat:0,lng:22}, zoom:3, areas:CONTINENT_AREAS.africa, radius:6000, attempts:42, scale:1400000, recent:150000, requireLinks:true},
  oceania: {name:'Océanie', center:{lat:-27,lng:145}, zoom:3, areas:CONTINENT_AREAS.oceania, radius:6000, attempts:42, scale:1400000, recent:150000, requireLinks:true}
};

// V5.3.3: country and city maps are data-driven from geography.js. Existing
// historical zones above keep their dedicated geometry and stable IDs.
for (const [zoneId, spec] of Object.entries(GEO_CATALOG.GAMEPLAY_ZONES || {})) {
  if (!ZONES[zoneId]) ZONES[zoneId] = {
    ...spec,
    areas: Array.isArray(spec.areas) ? spec.areas.map(area => ({...area})) : spec.areas
  };
}

class GuessrGame {
  constructor() {
    this.zoneId = 'paris';
    this.selection = {type:'zone',zoneId:'paris',name:ZONES.paris.name};
    this.roundZoneIds = [];
    this.mode = 'explore';
    this.lastGuessMode = 'explore';
    this.playType = 'guess';
    this.gameVariant = 'classic';
    this.blitzSeconds = 20;
    this.soloTimerInterval = null;
    this.soloDeadline = 0;
    this.soloLastSecond = null;
    this.round = 0;
    this.roundCount = 5;
    this.total = 0;
    this.results = [];
    this.guess = null;
    this.answer = null;
    this.startPano = null;
    this.startDescription = '';
    this.currentRoundToken = 0;
    this.restoringNoMove = false;
    this.restoringNmpzView = false;
    this.map = null;
    this.panorama = null;
    this.sv = null;
    this.guessMarker = null;
    this.answerMarker = null;
    this.line = null;
    this.zoneOverlays = [];
    this.mapListener = null;
    this.startTime = null;
    this.startPositionForTravel = null;
    this.maxTravel = 0;
    this.currentTravel = 0;
    this.travelDistance = 0;
    this.lastTravelPosition = null;
    this.explorationTarget = null;
    this.explorationTargetPano = null;
    this.explorationTargetDescription = '';
    this.explorationDirectDistance = 0;
    this.explorationSuccessRadius = 40;
    this.explorationCompleting = false;
    this.explorationClock = null;
    this.targetCircle = null;
    this.currentPano = null;
    this.navHistory = [];
    this.moveCount = 0;
    this.pendingNavReason = null;
    this.pendingPovAfterNav = null;
    this.startPov = null;
    this.toastTimer = null;
    this.lastAttemptPoint = null;
    this.avoidPoint = null;
    this.apiReady = false;
    this.parisContoursReady = false;
    this.parisContoursPromise = null;
    this.parisContoursSource = '';
    this.compassStyle = readJSON(COMPASS_STYLE_KEY, 'band');
    if (!COMPASS_STYLES.includes(this.compassStyle)) this.compassStyle = 'band';
    this.geo = window.LOSTPIN_GEOGRAPHY || null;
    this.geoState = {filter:'paris', continentId:null, countryId:null, query:''};
    this.bindUI();
    this.refreshPlayTypeUI();
    this.setCompassStyle(this.compassStyle, false);
    this.updateSelectionBanner();
    this.updateBest();
    this.loadGoogle();
  }

  bindUI() {
    this.bindGeographyUI();
    document.querySelectorAll('.playTypeCard').forEach(card => card.addEventListener('click', () => this.setPlayType(card.dataset.playType)));
    document.querySelectorAll('.variantCard').forEach(card => card.addEventListener('click', () => this.setGameVariant(card.dataset.variant)));
    $('blitzSeconds')?.addEventListener('change',()=>{
      const seconds=Number($('blitzSeconds')?.value||20);
      this.blitzSeconds=[15,20,30].includes(seconds)?seconds:20;
      this.refreshVariantUI();
    });
    document.querySelectorAll('.modeCard').forEach(card => card.addEventListener('click', () => {
      if (this.playType === 'exploration') return;
      document.querySelectorAll('.modeCard').forEach(x => x.classList.remove('selected'));
      card.classList.add('selected');
      this.mode = card.dataset.mode;
      this.lastGuessMode = this.mode;
      this.updateBest();
    }));
    for (const id of ['compassStartButton','compassGameButton']) $(id)?.addEventListener('click', () => this.openCompassPicker());
    $('closeCompass')?.addEventListener('click', () => $('compassModal').classList.add('hidden'));
    $('compassModal')?.addEventListener('click', e => { if (e.target === $('compassModal')) $('compassModal').classList.add('hidden'); });
    document.querySelectorAll('.compassChoice').forEach(card => card.addEventListener('click', () => {
      this.setCompassStyle(card.dataset.compassStyle, true);
      $('compassModal').classList.add('hidden');
    }));
    $('startButton').addEventListener('click', () => this.startGame());
    $('restartButton').addEventListener('click', () => this.startGame());
    $('menuButton').addEventListener('click', () => this.showMenu());
    $('nextButton').addEventListener('click', () => this.nextRound());
    $('guessButton').addEventListener('click', () => this.submitGuess());
    $('forwardButton').addEventListener('click', () => this.goForward());
    $('backButton').addEventListener('click', () => this.goBack());
    $('turnButton').addEventListener('click', () => this.turnAround());
    $('homeButton').addEventListener('click', () => this.goHome());
    $('retryButton').addEventListener('click', () => { this.avoidPoint = null; this.loadRound(); });
    $('replaceButton').addEventListener('click', () => { this.avoidPoint = this.lastAttemptPoint; this.loadRound(); });
    $('expandMap').addEventListener('click', () => {
      $('mapPanel').classList.toggle('expanded');
      setTimeout(() => google.maps.event.trigger(this.map, 'resize'), 180);
    });
    $('quitButton').addEventListener('click', () => {
      if (!this.results.length || window.confirm('Quitter cette partie ?')) this.showMenu();
    });
    for (const id of ['helpButton','helpGameButton']) $(id).addEventListener('click', () => $('helpModal').classList.remove('hidden'));
    $('closeHelp').addEventListener('click', () => $('helpModal').classList.add('hidden'));
    $('helpModal').addEventListener('click', e => { if (e.target === $('helpModal')) $('helpModal').classList.add('hidden'); });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') { $('helpModal').classList.add('hidden'); $('compassModal').classList.add('hidden'); return; }
      if ($('gameScreen').classList.contains('hidden') || !$('helpModal').classList.contains('hidden') || !$('compassModal').classList.contains('hidden')) return;
      const active = document.activeElement;
      if (active && ($('guessMap').contains(active) || ['INPUT','SELECT','TEXTAREA'].includes(active.tagName))) return;
      const key = e.key;
      if (key.toLowerCase() === 'm') { e.preventDefault(); $('expandMap').click(); return; }
      if (!$('resultPanel').classList.contains('hidden')) return;
      if (key === 'ArrowLeft' && this.mode !== 'nmpz') { e.preventDefault(); this.rotateView(-15); }
      else if (key === 'ArrowRight' && this.mode !== 'nmpz') { e.preventDefault(); this.rotateView(15); }
      else if (key === 'ArrowUp' && this.mode === 'explore') { e.preventDefault(); this.goForward(); }
      else if (key === 'ArrowDown' && this.mode === 'explore') { e.preventDefault(); this.goBack(); }
      else if (key === 'Home' && this.mode === 'explore') { e.preventDefault(); this.goHome(); }
    });
  }

  setGameVariant(value, options={}) {
    const variant=['classic','blitz','precision'].includes(value) ? value : 'classic';
    this.gameVariant=variant;
    if (variant==='blitz') {
      const requested=Number($('blitzSeconds')?.value||this.blitzSeconds||20);
      this.blitzSeconds=[15,20,30].includes(requested)?requested:20;
    }
    this.refreshVariantUI();
    this.updateSelectionBanner();
    this.updateBest();
    if (!options.silent) document.dispatchEvent(new CustomEvent('lostpin:variant-change',{detail:{variant:this.gameVariant,blitzSeconds:this.blitzSeconds}}));
  }

  refreshVariantUI() {
    const exploration=this.playType==='exploration';
    document.querySelectorAll('.variantCard').forEach(card=>card.classList.toggle('selected',card.dataset.variant===this.gameVariant));
    $('gameVariantSection')?.classList.toggle('playTypeDisabled',exploration);
    const blitzOptions=$('blitzOptions');
    blitzOptions?.classList.toggle('hidden',this.gameVariant!=='blitz' || exploration);
    if ($('blitzSeconds')) $('blitzSeconds').value=String(this.blitzSeconds);
  }

  variantRecordKey(selection=this.getSelectionDescriptor()) {
    const base=`${this.getSelectionKey(selection)}:${this.mode}`;
    return this.gameVariant==='classic' ? base : `${base}:${this.gameVariant}`;
  }

  scoreForCurrentVariant(distance,zone) {
    return this.gameVariant==='precision' ? precisionScoreFor(distance,zone.scale) : scoreFor(distance,zone.scale);
  }

  startSoloBlitzTimer() {
    this.stopSoloBlitzTimer(false);
    if (this.playType!=='guess' || this.gameVariant!=='blitz' || this.challengeConfig || window.guessrMultiplayer?.active) return;
    const seconds=[15,20,30].includes(Number(this.blitzSeconds))?Number(this.blitzSeconds):20;
    const box=$('multiTimer'); if (!box) return;
    box.classList.remove('hidden','urgent','critical');
    this.soloDeadline=Date.now()+seconds*1000;
    const tick=()=>{
      const remaining=Math.max(0,Math.ceil((this.soloDeadline-Date.now())/1000));
      if (remaining!==this.soloLastSecond) {
        this.soloLastSecond=remaining;
        const mins=Math.floor(remaining/60), secs=remaining%60;
        if ($('multiTimerValue')) $('multiTimerValue').textContent=`${mins}:${String(secs).padStart(2,'0')}`;
        box.classList.toggle('urgent',remaining>0 && remaining<=10);
        box.classList.toggle('critical',remaining>0 && remaining<=5);
      }
      if (remaining<=0) {
        this.stopSoloBlitzTimer(false);
        if (!$('resultPanel')?.classList.contains('hidden')) return;
        if (this.guess) this.submitGuess(); else this.submitSoloTimeout();
      }
    };
    tick();
    this.soloTimerInterval=setInterval(tick,250);
  }

  stopSoloBlitzTimer(hide=false) {
    if (this.soloTimerInterval) clearInterval(this.soloTimerInterval);
    this.soloTimerInterval=null; this.soloDeadline=0; this.soloLastSecond=null;
    const box=$('multiTimer');
    box?.classList.remove('urgent','critical');
    if (hide && !window.guessrMultiplayer?.active && !window.lostPinChallenges?.current) box?.classList.add('hidden');
  }

  lockRoundNavigation() {
    if (!this.panorama) return;
    this.panorama.setOptions({clickToGo:false,linksControl:false});
  }

  submitSoloTimeout() {
    if (this.playType==='exploration' || !this.answer || !$('resultPanel')?.classList.contains('hidden')) return;
    const zone=ZONES[this.zoneId];
    const seconds=[15,20,30].includes(Number(this.blitzSeconds))?Number(this.blitzSeconds):20;
    this.results.push({distance:null,points:0,description:this.startDescription,seconds,travel:this.maxTravel,moves:this.moveCount,timedOut:true,zoneId:this.zoneId,zoneName:zone.name,variant:this.gameVariant});
    $('scoreLabel').textContent=this.total.toLocaleString('fr-FR');
    $('distanceLabel').textContent='Aucune réponse';
    $('roundScoreLabel').textContent='0';
    $('resultPlace').textContent=this.startDescription || zone.name;
    $('travelInfo').textContent=`Blitz ${seconds} s · temps écoulé · aucune réponse validée.`;
    const source=new URL('https://www.google.com/maps/@'); source.searchParams.set('api','1'); source.searchParams.set('map_action','pano'); source.searchParams.set('pano',this.startPano||'');
    if (this.startPov) source.searchParams.set('heading',String(Math.round(this.startPov.heading)));
    $('streetViewLink').href=source.toString();
    $('placeLink').href=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${this.answer.lat},${this.answer.lng}`)}`;
    this.setBusy(false); $('toast').classList.add('hidden'); $('gameScreen').classList.add('has-result'); $('resultPanel').classList.remove('hidden'); $('guessButton').disabled=true; $('guessButton').textContent='Temps écoulé';
    this.lockRoundNavigation();
    this.answerMarker=new google.maps.Marker({map:this.map,position:this.answer,title:'Lieu réel',zIndex:3,label:{text:'R',color:'#ffffff',fontWeight:'900',fontSize:'12px'},icon:{path:google.maps.SymbolPath.CIRCLE,scale:11,fillColor:'#e53935',fillOpacity:1,strokeColor:'#ffffff',strokeOpacity:1,strokeWeight:3}});
    this.map.setCenter(this.answer); this.map.setZoom(Math.max(5,zone.zoom||10));
    $('nextButton').textContent=this.round===(this.roundCount||5)-1?'Voir le score final':'Manche suivante';
  }

  setPlayType(type, options={}) {
    const next = type === 'exploration' ? 'exploration' : 'guess';
    if (next === this.playType && !options.force) { this.refreshPlayTypeUI(); return; }
    if (next === 'exploration' && this.playType === 'guess') this.lastGuessMode=this.mode;
    this.playType = next;
    if (next === 'exploration') this.mode = 'explore';
    else this.mode = ['explore','nomove','nmpz'].includes(this.lastGuessMode) ? this.lastGuessMode : 'explore';
    document.querySelectorAll('.modeCard').forEach(card => card.classList.toggle('selected', card.dataset.mode === this.mode));
    this.refreshPlayTypeUI();
    this.updateSelectionBanner();
    this.updateBest();
    if (!options.silent) document.dispatchEvent(new CustomEvent('lostpin:play-type-change',{detail:{playType:this.playType}}));
  }

  refreshPlayTypeUI() {
    const exploration = this.playType === 'exploration';
    document.querySelectorAll('.playTypeCard').forEach(card => card.classList.toggle('selected',card.dataset.playType === this.playType));
    $('movementModeSection')?.classList.toggle('playTypeDisabled',exploration);
    $('gameVariantSection')?.classList.toggle('playTypeDisabled',exploration);
    this.refreshVariantUI();
    for (const id of ['multiplayerButton','challengeButton']) {
      const button=$(id); if (!button) continue;
      button.disabled=exploration;
      button.title=exploration ? 'Disponible en Géolocalisation. Exploration multijoueur arrivera plus tard.' : '';
    }
    if ($('soloRulesText')) {
      if (exploration) $('soloRulesText').innerHTML='<b>3 missions &middot; 15 000 points.</b> Rejoins physiquement chaque cible dans Street View. Chrono, déplacements et distance parcourue sont mesurés.';
      else if (this.gameVariant==='blitz') $('soloRulesText').innerHTML=`<b>Blitz · 5 manches · ${this.blitzSeconds} s par manche.</b> Le barème classique reste utilisé, mais chaque réponse doit être validée avant la fin du chrono.`;
      else if (this.gameVariant==='precision') $('soloRulesText').innerHTML='<b>Précision · 5 manches.</b> Le score décroît linéairement avec la distance : chaque mètre compte davantage, sans courbe exponentielle.';
      else $('soloRulesText').innerHTML=`<b>5 manches &middot; 25 000 points.</b> Les panoramas proviennent de Google Street View. Le jeu n'est affilié ni à Google ni à GeoGuessr. Ta clé API reste uniquement dans le dossier local sur ton PC.`;
    }
    if (this.apiReady && $('startButton')) $('startButton').textContent = exploration ? `Lancer l'exploration` : 'Lancer la partie';
  }

  bindGeographyUI() {
    const allowed = new Set(['paris','city','country','continent','world','all']);
    document.querySelectorAll('[data-zone-filter]').forEach(button => button.addEventListener('click', () => {
      const filter=allowed.has(button.dataset.zoneFilter) ? button.dataset.zoneFilter : 'paris';
      this.applyZoneFilter(filter);
    }));
    const search=$('zoneSearch');
    search?.addEventListener('input',()=>{
      this.geoState.query=String(search.value||'');
      this.renderGeographySelector();
    });
    $('zoneSearchClear')?.addEventListener('click',()=>{
      if (search) search.value='';
      this.geoState.query='';
      search?.focus();
      this.renderGeographySelector();
    });
    this.renderGeographySelector();
  }

  applyZoneFilter(filter, options={}) {
    const allowed = new Set(['paris','city','country','continent','world','all']);
    const value=allowed.has(filter) ? filter : 'paris';
    this.geoState.filter=value;
    if (!options.keepHierarchy) {
      this.geoState.continentId=null;
      this.geoState.countryId=null;
    }
    if (!options.keepSearch) {
      this.geoState.query='';
      const search=$('zoneSearch'); if (search) search.value='';
    }
    this.renderGeographySelector();
  }

  showZoneInCatalog(zoneId) {
    const meta=this.geo?.getMap?.(zoneId);
    if (!meta) return;
    const filter=this.geo.categoryForZone(zoneId);
    this.geoState.filter=filter;
    this.geoState.query='';
    this.geoState.continentId=filter==='city' || filter==='country' ? (meta.continentId||null) : null;
    this.geoState.countryId=filter==='city' ? (meta.countryId||null) : null;
    const search=$('zoneSearch'); if (search) search.value='';
    this.renderGeographySelector();
  }

  createGeoNode(level, node, count) {
    const button=document.createElement('button');
    button.type='button'; button.className='zoneNode';
    button.dataset.geoLevel=level; button.dataset.geoId=node.id;
    const levelName=level==='continent'?'Continent':'Pays';
    button.innerHTML=`<span>${levelName}</span><b>${this.escapeHTML(node.name)}</b><small>${count} ${count>1?'terrains disponibles':'terrain disponible'}</small>`;
    button.addEventListener('click',()=>{
      if (level==='continent') { this.geoState.continentId=node.id; this.geoState.countryId=null; }
      else if (level==='country') this.geoState.countryId=node.id;
      this.renderGeographySelector();
    });
    return button;
  }

  createGeoMapCard(meta, searching=false) {
    const button=document.createElement('button');
    button.type='button'; button.className='mapCard'; button.dataset.zone=meta.zoneId;
    button.classList.toggle('selected',this.selection?.type==='zone' && this.selection.zoneId===meta.zoneId);
    const path=this.geo?.pathLabel?.(meta,{includeRegion:searching,includeDepartment:searching}) || '';
    const kind=this.geo?.KIND_LABELS?.[meta.kind] || 'Map';
    const icon=document.createElement('span'); icon.className='lpIcon'; icon.dataset.lpIcon=meta.icon||'world'; button.appendChild(icon);
    const strong=document.createElement('strong'); strong.textContent=meta.name; button.appendChild(strong);
    const small=document.createElement('small'); small.textContent=meta.description||''; button.appendChild(small);
    if (path) { const pathEl=document.createElement('span'); pathEl.className='zonePath'; pathEl.textContent=path; button.appendChild(pathEl); }
    const badge=document.createElement('span'); badge.className='zoneKind'; badge.textContent=kind; button.appendChild(badge);
    button.addEventListener('click',()=>{
      this.setSelection({type:'zone',zoneId:meta.zoneId});
    });
    return button;
  }

  renderGeoBreadcrumbs(parts=[]) {
    const box=$('zoneBreadcrumbs'); if (!box) return;
    box.replaceChildren();
    parts.forEach((part,index)=>{
      if (index) { const sep=document.createElement('i'); sep.textContent='›'; box.appendChild(sep); }
      if (part.action) {
        const button=document.createElement('button'); button.type='button'; button.textContent=part.label;
        button.addEventListener('click',part.action); box.appendChild(button);
      } else {
        const label=document.createElement('b'); label.textContent=part.label; box.appendChild(label);
      }
    });
  }


  renderGeographySelector() {
    const geo=this.geo, grid=$('zoneGrid'), hierarchy=$('zoneHierarchy'), empty=$('zoneEmpty');
    if (!geo || !grid || !hierarchy) return;
    const filter=this.geoState.filter || 'paris';
    document.querySelectorAll('[data-zone-filter]').forEach(button=>button.classList.toggle('selected',button.dataset.zoneFilter===filter));
    grid.replaceChildren(); hierarchy.replaceChildren(); empty?.classList.add('hidden');
    const query=String(this.geoState.query||'').trim();
    const clear=$('zoneSearchClear'); clear?.classList.toggle('hidden',!query);
    if (query) {
      const results=geo.search(query);
      this.renderGeoBreadcrumbs([{label:'Recherche globale'},{label:`${results.length} résultat${results.length>1?'s':''}`}]);
      if (!results.length) empty?.classList.remove('hidden');
      results.forEach(meta=>grid.appendChild(this.createGeoMapCard(meta,true)));
      window.LostPinTheme?.refreshIcons?.();
      return;
    }

    let maps=[];
    if (filter==='city') {
      const continentId=this.geoState.continentId, countryId=this.geoState.countryId;
      if (!continentId) {
        this.renderGeoBreadcrumbs([{label:'Villes'},{label:'Choisir un continent'}]);
        geo.continentsFor('city').forEach(node=>hierarchy.appendChild(this.createGeoNode('continent',node,geo.mapsFor('city',{continentId:node.id}).length)));
      } else if (!countryId) {
        const continent=geo.getContinent(continentId);
        this.renderGeoBreadcrumbs([
          {label:'Villes',action:()=>this.applyZoneFilter('city')},
          {label:continent?.name||continentId},
          {label:'Choisir un pays'}
        ]);
        geo.countriesFor('city',continentId).forEach(node=>hierarchy.appendChild(this.createGeoNode('country',node,geo.mapsFor('city',{continentId,countryId:node.id}).length)));
      } else {
        const continent=geo.getContinent(continentId), country=geo.getCountry(countryId);
        this.renderGeoBreadcrumbs([
          {label:'Villes',action:()=>this.applyZoneFilter('city')},
          {label:continent?.name||continentId,action:()=>{this.geoState.countryId=null;this.renderGeographySelector();}},
          {label:country?.name||countryId}
        ]);
        maps=geo.mapsFor('city',{continentId,countryId});
      }
    } else if (filter==='country') {
      const continentId=this.geoState.continentId;
      if (!continentId) {
        this.renderGeoBreadcrumbs([{label:'Pays'},{label:'Choisir un continent'}]);
        geo.continentsFor('country').forEach(node=>hierarchy.appendChild(this.createGeoNode('continent',node,geo.mapsFor('country',{continentId:node.id}).length)));
      } else {
        const continent=geo.getContinent(continentId);
        this.renderGeoBreadcrumbs([
          {label:'Pays',action:()=>this.applyZoneFilter('country')},
          {label:continent?.name||continentId}
        ]);
        maps=geo.mapsFor('country',{continentId});
      }
    } else {
      const labels={paris:'Paris',continent:'Continents',world:'Monde',all:'Tous les terrains'};
      this.renderGeoBreadcrumbs([{label:labels[filter]||'Terrains'}]);
      maps=geo.mapsFor(filter);
    }

    if (!maps.length && !hierarchy.children.length) empty?.classList.remove('hidden');
    maps.forEach(meta=>grid.appendChild(this.createGeoMapCard(meta,false)));
    window.LostPinTheme?.refreshIcons?.();
  }

  setApiStatus(text, kind = '') {
    $('apiStatus').textContent = text;
    $('apiStatus').className = `statusPill ${kind}`.trim();
  }

  failApi(message) {
    this.apiReady = false;
    this.setApiStatus('Google Maps indisponible', 'error');
    $('startButton').disabled = true;
    $('startButton').textContent = 'Vérifier la configuration';
    $('helpError').textContent = message;
    $('helpError').classList.remove('hidden');
  }

  async loadGoogle() {
    const key = window.PG_CONFIG && String(window.PG_CONFIG.googleMapsApiKey || '').trim();
    if (!key || key.includes('PASTE_')) {
      this.failApi("Aucune clé n'est configurée. Ferme cette page puis relance start.bat : il te demandera la clé Google Maps.");
      return;
    }
    window.gm_authFailure = () => this.failApi("Google a refusé la clé. Vérifie les référents localhost/127.0.0.1, la restriction Maps JavaScript API et la facturation du projet.");
    try {
      await new Promise((resolve, reject) => {
        const callbackName = '__guessrGoogleMapsReady';
        let finished = false;
        let timer = null;
        const finish = (error) => {
          if (finished) return;
          finished = true;
          if (timer) clearTimeout(timer);
          try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
          if (error) reject(error); else resolve();
        };

        window[callbackName] = () => finish();
        const script = document.createElement('script');
        const params = new URLSearchParams({
          key,
          v: 'weekly',
          loading: 'async',
          libraries: 'maps,streetView,marker',
          callback: callbackName
        });
        script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
        script.async = true;
        script.defer = true;
        script.onerror = () => finish(new Error('Impossible de charger maps.googleapis.com.'));
        document.head.appendChild(script);
        timer = setTimeout(() => finish(new Error("Google Maps n'a pas terminé son initialisation dans les 20 secondes.")), 20000);
      });

      if (!window.google?.maps?.Map || !window.google?.maps?.StreetViewService || !window.google?.maps?.StreetViewPanorama) {
        throw new Error("L'API s'est chargée mais les composants Maps/Street View ne sont pas disponibles.");
      }

      this.apiReady = true;
      this.setApiStatus('Google Maps prêt', 'ready');
      $('startButton').disabled = false;
      this.refreshPlayTypeUI();
      // Preload official Paris boundaries without blocking non-Paris maps.
      this.ensureOfficialParisContours().catch(() => {});
    } catch (error) {
      this.failApi(`Chargement de Google Maps impossible : ${error.message}`);
    }
  }

  hydrateOfficialParisContours(byArrondissement, source = 'Ville de Paris') {
    const arr = n => (byArrondissement[n] || byArrondissement[String(n)] || []).map(r => r.map(p => [Number(p[0]), Number(p[1])]));
    const all = Array.from({length:20}, (_, i) => i + 1).flatMap(arr);
    if (!all.length || !arr(5).length || !arr(6).length || !arr(7).length || !arr(13).length) {
      throw new Error('Les limites officielles requises sont absentes.');
    }
    ZONES.paris.polygons = all;
    ZONES.paris13.polygons = arr(13);
    ZONES.parisGroup.groups = [arr(5), arr(6), arr(7), arr(13)];
    ZONES.parisGroup.polygons = ZONES.parisGroup.groups.flat();
    this.parisContoursReady = true;
    this.parisContoursSource = source;
  }

  tryOfficialParisCache() {
    const cached = readJSON(PARIS_CONTOURS_CACHE_KEY, null);
    if (!cached || cached.version !== PARIS_CONTOURS_CACHE_VERSION || !cached.savedAt || Date.now() - cached.savedAt > PARIS_CONTOURS_MAX_AGE) return false;
    try {
      this.hydrateOfficialParisContours(cached.byArrondissement, 'cache Ville de Paris');
      return true;
    } catch (_) {
      try { localStorage.removeItem(PARIS_CONTOURS_CACHE_KEY); } catch (_) {}
      return false;
    }
  }

  async ensureOfficialParisContours() {
    if (this.parisContoursReady) return;
    if (this.tryOfficialParisCache()) return;
    if (this.parisContoursPromise) return this.parisContoursPromise;

    this.parisContoursPromise = (async () => {
      const params = new URLSearchParams({
        where:'1=1',
        outFields:'n_sq_ar,c_cainsee,l_cab,b_bois,l_bois',
        returnGeometry:'true',
        outSR:'4326',
        geometryPrecision:'6',
        f:'geojson'
      });
      let lastError = null;
      for (const endpoint of PARIS_CONTOURS_ENDPOINTS) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
          const response = await fetch(`${endpoint}?${params.toString()}`, {
            signal:controller.signal,
            credentials:'omit',
            headers:{Accept:'application/geo+json, application/json'}
          });
          if (!response.ok) throw new Error(`service Ville de Paris HTTP ${response.status}`);
          const geojson = await response.json();
          const byArrondissement = parseOfficialParisContours(geojson);
          this.hydrateOfficialParisContours(byArrondissement, PARIS_CONTOURS_SOURCE);
          writeJSON(PARIS_CONTOURS_CACHE_KEY, {
            version:PARIS_CONTOURS_CACHE_VERSION,
            savedAt:Date.now(),
            byArrondissement
          });
          return;
        } catch (error) {
          lastError = error?.name === 'AbortError' ? new Error('délai dépassé') : error;
        } finally {
          clearTimeout(timer);
        }
      }
      throw new Error(`le service des limites officielles de Paris ne répond pas${lastError?.message ? ` (${lastError.message})` : ''}`);
    })();

    try {
      await this.parisContoursPromise;
    } finally {
      this.parisContoursPromise = null;
    }
  }

  async prepareSelectedZone() {
    await this.prepareZone(this.zoneId);
  }

  normalizeSelection(selection) {
    const raw=selection && typeof selection==='object' ? selection : {};
    if (raw.type==='playlist') {
      const zoneIds=Array.from(new Set((Array.isArray(raw.zoneIds)?raw.zoneIds:[]).filter(id=>!!ZONES[id])));
      if (zoneIds.length>=2) {
        const id=String(raw.id||'playlist').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,40) || 'playlist';
        const name=String(raw.name||'Playlist').trim().slice(0,48) || 'Playlist';
        return {type:'playlist',id,name,zoneIds,builtIn:!!raw.builtIn};
      }
    }
    const zoneId=ZONES[raw.zoneId] ? raw.zoneId : (ZONES[this.zoneId] ? this.zoneId : 'paris');
    return {type:'zone',zoneId,name:ZONES[zoneId].name};
  }

  getSelectionDescriptor() {
    return this.normalizeSelection(this.selection);
  }

  getSelectionName(selection=this.selection) {
    const value=this.normalizeSelection(selection);
    return value.type==='playlist' ? value.name : (ZONES[value.zoneId]?.name || value.zoneId || 'Map');
  }

  getSelectionKey(selection=this.selection) {
    const value=this.normalizeSelection(selection);
    return value.type==='playlist' ? `playlist-${value.id}` : value.zoneId;
  }

  setSelection(selection, notify=true) {
    const normalized=this.normalizeSelection(selection);
    this.selection=normalized;
    this.roundZoneIds=[];
    if (normalized.type==='zone') this.zoneId=normalized.zoneId;
    else if (!normalized.zoneIds.includes(this.zoneId)) this.zoneId=normalized.zoneIds[0];
    if (normalized.type==='zone') this.showZoneInCatalog(normalized.zoneId);
    else this.renderGeographySelector();
    this.updateSelectionBanner();
    this.updateBest();
    if (notify) document.dispatchEvent(new CustomEvent('lostpin:selection-change',{detail:this.getSelectionDescriptor()}));
    return normalized;
  }

  updateSelectionBanner() {
    const box=$('selectionBanner'); if (!box) return;
    const selection=this.getSelectionDescriptor();
    const type=$('selectionType'), name=$('selectionName'), detail=$('selectionDetail');
    if (type) type.textContent=selection.type==='playlist'?'PLAYLIST':'MAP';
    if (name) name.textContent=this.getSelectionName(selection);
    if (detail) {
      if (this.playType==='exploration') detail.textContent=selection.type==='playlist' ? `${selection.zoneIds.length} maps · 3 missions · une map tirée par mission` : '3 missions sur ce terrain';
      else {
        const prefix=this.gameVariant==='blitz'?`Blitz ${this.blitzSeconds} s`:this.gameVariant==='precision'?'Précision':'Classique';
        detail.textContent=selection.type==='playlist' ? `${prefix} · ${selection.zoneIds.length} maps · une map tirée par manche` : `${prefix} · 5 manches sur le même terrain`;
      }
    }
    box.classList.toggle('playlistActive',selection.type==='playlist');
  }

  buildRoundZoneSequence(roundCount=this.roundCount||5, selection=this.selection) {
    const count=Math.max(1,Number(roundCount)||5);
    const value=this.normalizeSelection(selection);
    if (value.type!=='playlist') return Array.from({length:count},()=>value.zoneId);
    const zones=value.zoneIds.slice();
    const sequence=[];
    let bag=[];
    const refill=()=>{
      bag=zones.slice();
      for (let i=bag.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [bag[i],bag[j]]=[bag[j],bag[i]]; }
      if (sequence.length && bag.length>1 && bag[0]===sequence[sequence.length-1]) [bag[0],bag[1]]=[bag[1],bag[0]];
    };
    while (sequence.length<count) {
      if (!bag.length) refill();
      sequence.push(bag.shift());
    }
    return sequence;
  }

  async prepareZone(zoneId) {
    const zone=ZONES[zoneId];
    if (!zone) throw new Error('Map inconnue.');
    if (zone.officialParis && !this.parisContoursReady) await this.ensureOfficialParisContours();
  }

  updateBest() {
    if (this.playType === 'exploration') {
      const best=Number(readJSON(BEST_KEY,{})[`${this.getSelectionKey()}:exploration`])||0;
      if ($('bestLabel')) $('bestLabel').textContent = best ? `Meilleure exploration : ${best.toLocaleString('fr-FR')} / 15 000` : 'Exploration · 3 missions · chrono + déplacements + trajet';
      return;
    }
    const bests = readJSON(BEST_KEY, {});
    const perfects = readJSON(PERFECT_KEY, {});
    const key = this.variantRecordKey();
    const score = bests[key] || 0;
    const perfect = perfects[key];
    const parts = [];
    if (this.gameVariant!=='classic') parts.push(variantLabel(this.gameVariant));
    if (score) parts.push(`Meilleur score : ${score.toLocaleString('fr-FR')}`);
    if (perfect?.count) {
      parts.push(`25 000 depuis V3.6 : ${perfect.count}`);
      if (Number.isFinite(perfect.bestAvg)) parts.push(`record précision : ${formatDistance(perfect.bestAvg)}`);
    } else if (score === 25000) {
      // V3.5 stored the best score but not the number of perfect games nor their average.
      parts.push('25 000 déjà atteint · stats détaillées à partir de V3.6');
    }
    $('bestLabel').textContent = parts.join(' · ');
  }

  ensureGoogleObjects() {
    if (this.sv) return;
    this.sv = new google.maps.StreetViewService();
    this.panorama = new google.maps.StreetViewPanorama($('pano'), {
      addressControl:false,
      clickToGo:true,
      linksControl:true,
      panControl:false,
      zoomControl:false,
      fullscreenControl:false,
      showRoadLabels:false,
      imageDateControl:false,
      enableCloseButton:false,
      motionTracking:false,
      motionTrackingControl:false,
      visible:true
    });
    this.panorama.addListener('pano_changed', () => {
      const panoId = this.panorama.getPano();
      if (!panoId) return;
      if ((this.mode === 'nomove' || this.mode === 'nmpz') && this.startPano && panoId !== this.startPano && !this.restoringNoMove) {
        this.restoringNoMove = true;
        this.pendingNavReason = 'nomove-restore';
        this.panorama.setPano(this.startPano);
        setTimeout(() => { this.restoringNoMove = false; this.pendingNavReason = null; }, 250);
        return;
      }
      if (this.mode === 'explore' && this.startPano) {
        this.handlePanoChanged(panoId);
        if (this.playType === 'exploration' && this.explorationTargetPano && panoId === this.explorationTargetPano) setTimeout(()=>this.finishExplorationRound(),80);
      } else this.currentPano = panoId;
    });
    this.panorama.addListener('position_changed', () => {
      if (this.mode !== 'explore') return;
      const raw = this.panorama.getPosition();
      if (!raw) return;
      const pos = {lat:raw.lat(),lng:raw.lng()};
      if (this.playType === 'exploration' && this.explorationTarget) {
        if (this.lastTravelPosition) {
          const step = haversine(this.lastTravelPosition,pos);
          if (step > 1 && step < 1000) this.travelDistance += step;
        }
        this.lastTravelPosition = pos;
        const remaining = haversine(this.explorationTarget,pos);
        this.currentTravel = remaining;
        this.updateTravelUI();
        this.setBusy(false);
        if (remaining <= this.explorationSuccessRadius) this.finishExplorationRound();
        return;
      }
      if (!this.answer) return;
      const d = haversine(this.answer, pos);
      this.currentTravel = d;
      this.maxTravel = Math.max(this.maxTravel, d);
      this.updateTravelUI();
      this.setBusy(false);
    });
    this.panorama.addListener('pov_changed', () => {
      if (this.mode === 'nmpz' && this.startPov && !this.restoringNmpzView) {
        const pov = this.panorama.getPov() || {};
        const changed = headingDifference(pov.heading || 0, this.startPov.heading) > 0.2 || Math.abs((pov.pitch || 0) - (this.startPov.pitch || 0)) > 0.2;
        if (changed) {
          this.restoringNmpzView = true;
          this.panorama.setPov({heading:this.startPov.heading,pitch:this.startPov.pitch || 0});
          setTimeout(() => { this.restoringNmpzView = false; }, 0);
        }
      }
      this.updateCompass();
    });
    this.panorama.addListener('zoom_changed', () => {
      if (this.mode === 'nmpz' && this.startPov && !this.restoringNmpzView && Math.abs((this.panorama.getZoom() || 0) - (this.startPov.zoom || 0)) > 0.01) {
        this.restoringNmpzView = true;
        this.panorama.setZoom(this.startPov.zoom || 0);
        setTimeout(() => { this.restoringNmpzView = false; }, 0);
      }
    });
    this.panorama.addListener('links_changed', () => this.updateTravelUI());
    this.map = new google.maps.Map($('guessMap'), {
      center: ZONES.paris.center,
      zoom: ZONES.paris.zoom,
      mapTypeControl:false,
      streetViewControl:false,
      fullscreenControl:false,
      clickableIcons:false,
      gestureHandling:'greedy',
      styles:[
        {featureType:'poi',stylers:[{visibility:'off'}]},
        {featureType:'transit',elementType:'labels.icon',stylers:[{visibility:'off'}]}
      ]
    });
    this.map.addListener('click', e => {
      if (this.playType === 'exploration') return;
      if (!e.latLng || !$('resultPanel').classList.contains('hidden')) return;
      this.setGuess({lat:e.latLng.lat(),lng:e.latLng.lng()});
    });
  }

  applyInteractionMode() {
    const lock = $('panoInteractionLock');
    if (lock) lock.classList.toggle('hidden', this.mode !== 'nmpz' || $('gameScreen')?.classList.contains('hidden'));
  }

  openCompassPicker() {
    this.updateCompassPicker();
    $('compassModal')?.classList.remove('hidden');
  }

  setCompassStyle(style, persist = true) {
    if (!COMPASS_STYLES.includes(style)) style = 'band';
    this.compassStyle = style;
    if (persist) writeJSON(COMPASS_STYLE_KEY, style);
    if ($('compass')) $('compass').dataset.style = style;
    if ($('compassStartLabel')) $('compassStartLabel').textContent = `Boussole : ${COMPASS_STYLE_NAMES[style]}`;
    this.updateCompassPicker();
    this.updateCompass();
  }

  updateCompassPicker() {
    document.querySelectorAll('.compassChoice').forEach(card => card.classList.toggle('selected', card.dataset.compassStyle === this.compassStyle));
  }

  updateCompassTrack(trackId, heading, tickWidth) {
    const track = $(trackId);
    if (!track) return;
    const center = Math.round(heading / 45) * 45;
    const delta = heading - center;
    const ticks = Array.from(track.children);
    ticks.forEach((tick, i) => {
      const angle = center + (i - 3) * 45;
      const normalized = normalizeHeading(angle);
      tick.textContent = compassLabel(normalized);
      tick.classList.toggle('major', Math.round(normalized) % 90 === 0);
    });
    const offset = -(delta / 45) * tickWidth;
    track.style.transform = `translateX(calc(-50% + ${offset.toFixed(2)}px))`;
  }

  updateCompass() {
    if (!$('compass')) return;
    const pov = this.panorama?.getPov?.() || {heading:0};
    const h = normalizeHeading(pov.heading || 0);
    const deg = Math.round(h) % 360;
    const text = `${compassLabel(h)} · ${String(deg).padStart(3,'0')}°`;
    $('compass').dataset.style = this.compassStyle || 'band';
    this.updateCompassTrack('compassBandTrack', h, window.innerWidth <= 600 ? 52 : 64);
    this.updateCompassTrack('compassPanoTrack', h, 78);
    if ($('compassBandDegrees')) $('compassBandDegrees').textContent = `${String(deg).padStart(3,'0')}°`;
    if ($('compassPanoDegree')) $('compassPanoDegree').textContent = `${String(deg).padStart(3,'0')}°`;
    if ($('compassCircleNeedle')) $('compassCircleNeedle').style.transform = `rotate(${h}deg)`;
    if ($('compassCircleLabel')) $('compassCircleLabel').textContent = text;
    if ($('compassMinimalLabel')) $('compassMinimalLabel').textContent = text;
    if ($('compassRoseNeedle')) $('compassRoseNeedle').style.transform = `rotate(${h}deg)`;
    if ($('compassRoseDegree')) $('compassRoseDegree').textContent = `${String(deg).padStart(3,'0')}°`;
    if ($('compassHybridNeedle')) $('compassHybridNeedle').style.transform = `rotate(${h}deg)`;
    if ($('compassHybridLabel')) $('compassHybridLabel').textContent = text;
    // Real compass styles mimic a physical magnetic needle: north rotates opposite to the camera heading.
    if ($('compassRealNeedle')) $('compassRealNeedle').style.transform = `translate(-50%,-50%) rotate(${-h}deg)`;
    if ($('compassRealLabel')) $('compassRealLabel').textContent = text;
    if ($('compassVintageNeedle')) $('compassVintageNeedle').style.transform = `translate(-50%,-50%) rotate(${-h}deg)`;
    if ($('compassVintageLabel')) $('compassVintageLabel').textContent = text;
  }

  updateTravelUI() {
    if (!$('travelPanel')) return;
    const movable = this.mode === 'explore';
    const mission = movable && this.playType === 'exploration';
    $('travelPanel').classList.toggle('hidden', !movable);
    if (!movable) return;
    const count = this.moveCount;
    if (mission) {
      $('explorationObjective')?.classList.remove('hidden');
      if ($('explorationTargetName')) $('explorationTargetName').textContent = this.explorationTargetDescription || ZONES[this.zoneId]?.name || 'Cible Street View';
      if ($('travelHint')) $('travelHint').textContent = `Atteins C sur la carte. Validation automatique à ${this.explorationSuccessRadius} m.`;
      const seconds = this.startTime ? Math.max(0, Math.floor((Date.now() - this.startTime) / 1000)) : 0;
      const remaining = Number.isFinite(this.currentTravel) ? formatDistance(this.currentTravel) : '—';
      $('travelStats').textContent = `Cible ${remaining} · ${count} déplacement${count===1?'':'s'} · ${formatDistance(this.travelDistance)} parcourus · ${formatClock(seconds)}`;
    } else {
      $('explorationObjective')?.classList.add('hidden');
      if ($('travelHint')) $('travelHint').textContent = 'Explore librement puis place ta réponse sur la carte.';
      $('travelStats').textContent = `${count} déplacement${count === 1 ? '' : 's'} · ${formatDistance(this.currentTravel)} du départ`;
    }
    const links = this.panorama?.getLinks?.() || [];
    $('forwardButton').disabled = !this.startPano || !links.length;
    $('backButton').disabled = !this.navHistory.length;
    $('homeButton').disabled = !this.startPano || !this.currentPano || this.currentPano === this.startPano;
  }

  startExplorationClock() {
    this.stopExplorationClock();
    this.explorationClock=setInterval(()=>{
      if (this.playType !== 'exploration' || !$('resultPanel')?.classList.contains('hidden')) return;
      this.updateTravelUI();
    },500);
  }

  stopExplorationClock() {
    if (this.explorationClock) clearInterval(this.explorationClock);
    this.explorationClock=null;
  }

  setBusy(show, text = 'Chargement de la vue suivante...') {
    if (!$('busyBadge')) return;
    $('busyBadge').textContent = text;
    $('busyBadge').classList.toggle('hidden', !show);
  }

  showToast(text, duration = 2200) {
    if (!$('toast')) return;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    $('toast').textContent = text;
    $('toast').classList.remove('hidden');
    this.toastTimer = setTimeout(() => $('toast').classList.add('hidden'), duration);
  }

  handlePanoChanged(panoId) {
    if (!panoId) return;
    if (!this.currentPano) {
      this.currentPano = panoId;
      this.pendingNavReason = null;
      this.setBusy(false);
      this.updateTravelUI();
      return;
    }
    if (panoId === this.currentPano) return;
    const reason = this.pendingNavReason || 'native';
    if (reason === 'native' || reason === 'forward') {
      this.navHistory.push(this.currentPano);
      if (this.navHistory.length > 200) this.navHistory.shift();
      this.moveCount++;
    } else if (reason === 'back') {
      this.moveCount++;
    } else if (reason === 'home') {
      this.navHistory = [];
    }
    this.currentPano = panoId;
    this.pendingNavReason = null;
    const pendingPov = this.pendingPovAfterNav;
    this.pendingPovAfterNav = null;
    if (pendingPov) setTimeout(() => {
      if (!this.panorama) return;
      this.panorama.setPov({heading:pendingPov.heading,pitch:pendingPov.pitch ?? 0});
      if (Number.isFinite(pendingPov.zoom)) this.panorama.setZoom(pendingPov.zoom);
    }, 60);
    this.setBusy(false);
    this.updateTravelUI();
  }

  rotateView(delta) {
    if (!this.panorama) return;
    const pov = this.panorama.getPov() || {heading:0,pitch:0};
    this.panorama.setPov({heading:normalizeHeading(pov.heading + delta),pitch:pov.pitch || 0});
  }

  turnAround() {
    this.rotateView(180);
  }

  goForward() {
    if (this.mode !== 'explore' || !this.panorama || !$('resultPanel').classList.contains('hidden')) return;
    const links = (this.panorama.getLinks() || []).filter(x => x && x.pano);
    if (!links.length) { this.showToast('Aucune sortie Street View disponible depuis cette vue.'); return; }
    const heading = normalizeHeading((this.panorama.getPov() || {}).heading);
    const best = links.reduce((a,b) => headingDifference(b.heading, heading) < headingDifference(a.heading, heading) ? b : a);
    this.pendingNavReason = 'forward';
    this.pendingPovAfterNav = {heading:normalizeHeading(best.heading),pitch:0};
    this.setBusy(true);
    this.panorama.setPano(best.pano);
  }

  goBack() {
    if (this.mode !== 'explore' || !this.panorama || !$('resultPanel').classList.contains('hidden')) return;
    const target = this.navHistory.pop();
    if (!target) { this.showToast('Tu es déjà au début de ton historique.'); this.updateTravelUI(); return; }
    this.pendingNavReason = 'back';
    this.setBusy(true, 'Retour à la vue précédente...');
    this.panorama.setPano(target);
  }

  goHome() {
    if (this.mode !== 'explore' || !this.panorama || !this.startPano || !$('resultPanel').classList.contains('hidden')) return;
    this.navHistory = [];
    if (this.currentPano === this.startPano) {
      if (this.startPov) { this.panorama.setPov({heading:this.startPov.heading,pitch:this.startPov.pitch}); this.panorama.setZoom(this.startPov.zoom); }
      this.currentTravel = this.playType==='exploration' ? this.explorationDirectDistance : 0;
      if (this.playType==='exploration' && this.startPositionForTravel) this.lastTravelPosition={...this.startPositionForTravel};
      this.updateTravelUI();
      return;
    }
    this.pendingNavReason = 'home';
    this.pendingPovAfterNav = this.startPov ? {...this.startPov} : null;
    if (this.playType==='exploration' && this.startPositionForTravel) this.lastTravelPosition={...this.startPositionForTravel};
    this.setBusy(true, 'Retour au point de départ...');
    this.panorama.setPano(this.startPano);
  }

  clearMapObjects() {
    if (this.guessMarker) { this.guessMarker.setMap(null); this.guessMarker = null; }
    if (this.answerMarker) { this.answerMarker.setMap(null); this.answerMarker = null; }
    if (this.line) { this.line.setMap(null); this.line = null; }
    if (this.targetCircle) { this.targetCircle.setMap(null); this.targetCircle = null; }
    this.zoneOverlays.forEach(x => x.setMap(null));
    this.zoneOverlays = [];
  }

  configureGuessMap(zone) {
    this.clearMapObjects();
    this.map.setCenter(zone.center);
    this.map.setZoom(zone.zoom);
    $('mapZoneTitle').textContent = zone.name;
    if (zone.polygons && zone.polygons.length <= 24) {
      zone.polygons.forEach(poly => {
        const overlay = new google.maps.Polygon({
          map:this.map,
          paths:poly.map(([lng,lat]) => ({lat,lng})),
          strokeColor:'#ff4268',strokeOpacity:zone.polygons.length > 4 ? .28 : .55,strokeWeight:1,
          fillColor:'#ff4268',fillOpacity:zone.polygons.length > 4 ? .012 : .035,
          clickable:false
        });
        this.zoneOverlays.push(overlay);
      });
    }
  }

  setGuess(pos) {
    this.guess = pos;
    if (!this.guessMarker) {
      this.guessMarker = new google.maps.Marker({
        map:this.map, position:pos, title:'Ta réponse', zIndex:2,
        label:{text:'T',color:'#ffffff',fontWeight:'900',fontSize:'12px'},
        icon:{path:google.maps.SymbolPath.CIRCLE,scale:11,fillColor:'#2f80ed',fillOpacity:1,strokeColor:'#ffffff',strokeOpacity:1,strokeWeight:3}
      });
    } else this.guessMarker.setPosition(pos);
    $('guessButton').disabled = false;
    $('guessButton').textContent = 'Valider ma réponse';
  }

  randomCandidate(zone) {
    if (zone.areas) {
      const area = zone.areas[Math.floor(Math.random() * zone.areas.length)];
      return { point: randomInBounds(area), area };
    }
    if (!zone.polygons?.length) throw new Error('Les contours de cette map ne sont pas chargés.');
    let poly;
    let group = null;
    if (zone.groups?.length) {
      // Paris 5/6/7/13: choose the arrondissement first, then a ring inside it.
      // This gives each requested arrondissement the same chance per round.
      group = zone.groups[Math.floor(Math.random() * zone.groups.length)];
      poly = weightedPolygon(group);
    } else {
      // Other polygon maps: area-weighted draw, avoiding the bias of bounding-box area.
      poly = weightedPolygon(zone.polygons);
    }
    return { point: randomInPolygon(poly), poly, group };
  }

  containsZone(zone, pos) {
    if (zone.polygons?.length) return zone.polygons.some(poly => pointInPolygon(pos, poly));
    if (zone.areas?.length) return zone.areas.some(area => pos.lng>=area.west && pos.lng<=area.east && pos.lat>=area.south && pos.lat<=area.north);
    return true;
  }

  isTooRecent(pos, zone, relax = false) {
    if (relax) return false;
    const store = readJSON(RECENT_KEY, {});
    const list = store[this.zoneId] || [];
    return list.some(x => haversine(pos, x) < zone.recent);
  }

  rememberStart(pos) {
    const store = readJSON(RECENT_KEY, {});
    const list = store[this.zoneId] || [];
    list.unshift({lat:pos.lat,lng:pos.lng,t:Date.now()});
    store[this.zoneId] = list.slice(0, 40);
    writeJSON(RECENT_KEY, store);
  }

  async findStart(zone, token) {
    let lastError = null;
    for (let i = 0; i < zone.attempts; i++) {
      if (token !== this.currentRoundToken) throw new Error('Recherche annulée.');
      let candidate = this.randomCandidate(zone);
      if (this.avoidPoint) {
        for (let reroll = 0; reroll < 8 && haversine(candidate.point, this.avoidPoint) < Math.max(zone.recent * 2, zone.radius * 2); reroll++) candidate = this.randomCandidate(zone);
      }
      this.lastAttemptPoint = candidate.point;
      $('loadingText').textContent = `Essai ${i + 1}/${zone.attempts} - recherche d'une route Street View dans ${zone.name}.`;
      try {
        const response = await this.sv.getPanorama({
          location:candidate.point,
          radius:zone.radius,
          preference:google.maps.StreetViewPreference.NEAREST,
          sources:[google.maps.StreetViewSource.GOOGLE]
        });
        const data = response && response.data;
        const loc = data && data.location;
        if (!loc || !loc.latLng || !loc.pano) continue;
        const pos = {lat:loc.latLng.lat(),lng:loc.latLng.lng()};
        // For polygon maps, validate the panorama returned by Google, not only the random
        // search point. strictCandidate also forces it to stay in the exact sub-polygon
        // chosen for this attempt (important for arrondissement maps).
        if (!this.containsZone(zone, pos)) continue;
        if (zone.strictCandidate && candidate.poly && !pointInPolygon(pos, candidate.poly)) continue;
        const description = String(loc.description || '').toLowerCase();
        if (zone.rejectDescriptions && zone.rejectDescriptions.some(x => description.includes(x))) continue;
        const relax = i > Math.floor(zone.attempts * .72);
        if (this.isTooRecent(pos, zone, relax)) continue;
        if (this.mode === 'explore' && zone.requireLinks && (!data.links || data.links.length < 1)) continue;
        this.avoidPoint = null;
        return {data,pos};
      } catch (error) {
        lastError = error;
      }
    }
    const suffix = lastError && lastError.message ? ` (${lastError.message})` : '';
    throw new Error(`Aucun départ jouable trouvé dans ${zone.name}. Réessaie : le tirage est aléatoire et la couverture peut varier.${suffix}`);
  }

  async findExplorationTarget(zone, token) {
    let lastError=null;
    for (let i=0;i<8;i++) {
      if (token !== this.currentRoundToken) throw new Error('Recherche annulée.');
      try {
        const target=await this.findStart(zone,token);
        if ((target?.data?.links||[]).some(link=>link?.pano)) return target;
      } catch (error) {
        lastError=error;
      }
    }
    const suffix=lastError?.message?` (${lastError.message})`:'';
    throw new Error(`Impossible de trouver une cible Street View reliée au réseau dans ${zone.name}. Réessaie pour générer une nouvelle mission.${suffix}`);
  }

  async findExplorationStart(zone, target, token) {
    const maxDistance = clamp((Number(zone.scale) || 3000) * .22, 500, 1400);
    const minDistance = Math.max(180, maxDistance * .42);
    const searchRadius = clamp(Number(zone.radius) || 180, 100, 300);
    const targetLinks=(target?.data?.links||[]).filter(link=>Number.isFinite(Number(link?.heading)));
    let lastError=null;
    for (let i=0;i<30;i++) {
      if (token !== this.currentRoundToken) throw new Error('Recherche annulée.');
      const desired=minDistance + Math.random()*(maxDistance-minDistance);
      const baseBearing=targetLinks.length?Number(targetLinks[Math.floor(Math.random()*targetLinks.length)].heading):Math.random()*360;
      const candidate=offsetPoint(target.pos,desired,baseBearing+(Math.random()-.5)*50);
      if (!this.containsZone(zone,candidate)) continue;
      $('loadingText').textContent=`Mission ${this.round+1}/${this.roundCount} · recherche d'un départ à ${formatDistance(desired)} de la cible dans ${zone.name}.`;
      try {
        const response=await this.sv.getPanorama({
          location:candidate,
          radius:searchRadius,
          preference:google.maps.StreetViewPreference.NEAREST,
          sources:[google.maps.StreetViewSource.GOOGLE]
        });
        const data=response?.data, loc=data?.location;
        if (!loc?.latLng || !loc?.pano || loc.pano===target.data.location.pano) continue;
        const pos={lat:loc.latLng.lat(),lng:loc.latLng.lng()};
        if (!this.containsZone(zone,pos)) continue;
        const distance=haversine(target.pos,pos);
        if (distance < minDistance*.55 || distance > maxDistance*1.35) continue;
        if (!data.links || data.links.length<1) continue;
        return {data,pos,distance};
      } catch (error) { lastError=error; }
    }
    const suffix=lastError?.message?` (${lastError.message})`:'';
    throw new Error(`Impossible de créer une mission Exploration jouable dans ${zone.name}. Réessaie pour générer un autre couple départ/cible.${suffix}`);
  }

  setupExplorationMap(start, target) {
    this.clearMapObjects();
    const startPos=start.pos, targetPos=target.pos;
    this.guessMarker=new google.maps.Marker({
      map:this.map,position:startPos,title:'Départ',zIndex:2,
      label:{text:'D',color:'#ffffff',fontWeight:'900',fontSize:'12px'},
      icon:{path:google.maps.SymbolPath.CIRCLE,scale:11,fillColor:'#2f80ed',fillOpacity:1,strokeColor:'#ffffff',strokeOpacity:1,strokeWeight:3}
    });
    this.answerMarker=new google.maps.Marker({
      map:this.map,position:targetPos,title:'Cible',zIndex:3,
      label:{text:'C',color:'#ffffff',fontWeight:'900',fontSize:'12px'},
      icon:{path:google.maps.SymbolPath.CIRCLE,scale:12,fillColor:'#e53935',fillOpacity:1,strokeColor:'#ffffff',strokeOpacity:1,strokeWeight:3}
    });
    this.targetCircle=new google.maps.Circle({
      map:this.map,center:targetPos,radius:this.explorationSuccessRadius,
      strokeColor:'#e53935',strokeOpacity:.9,strokeWeight:2,fillColor:'#e53935',fillOpacity:.12,clickable:false
    });
    const bounds=new google.maps.LatLngBounds(); bounds.extend(startPos); bounds.extend(targetPos);
    this.map.fitBounds(bounds,70);
    $('mapZoneTitle').textContent=ZONES[this.zoneId]?.name || 'Exploration';
  }

  finishExplorationRound() {
    if (this.playType!=='exploration' || this.explorationCompleting || !$('resultPanel')?.classList.contains('hidden') || !this.explorationTarget) return;
    this.explorationCompleting=true;
    this.stopExplorationClock();
    this.panorama?.setOptions?.({clickToGo:false,linksControl:false});
    const seconds=Math.max(1,Math.round((Date.now()-this.startTime)/1000));
    const points=explorationScore(seconds,this.moveCount,this.explorationDirectDistance,this.travelDistance);
    this.total+=points;
    const zone=ZONES[this.zoneId];
    this.results.push({
      distance:null,points,description:this.explorationTargetDescription||'Cible Street View',seconds,
      travel:this.travelDistance,moves:this.moveCount,missionDistance:this.explorationDirectDistance,
      zoneId:this.zoneId,zoneName:zone.name,exploration:true
    });
    $('scoreLabel').textContent=this.total.toLocaleString('fr-FR');
    if ($('resultTitle')) $('resultTitle').textContent='CIBLE ATTEINTE';
    if ($('distanceStatLabel')) $('distanceStatLabel').textContent='Trajet';
    if ($('scoreStatLabel')) $('scoreStatLabel').textContent='Points';
    $('distanceLabel').textContent=formatDistance(this.travelDistance);
    $('roundScoreLabel').textContent=points.toLocaleString('fr-FR');
    $('resultPlace').textContent=this.explorationTargetDescription || `${zone.name} · cible atteinte`;
    $('travelInfo').textContent=`${formatClock(seconds)} · ${this.moveCount} déplacement${this.moveCount===1?'':'s'} · distance directe ${formatDistance(this.explorationDirectDistance)}.`;
    if ($('resultLegend')) $('resultLegend').innerHTML='<span class="legendItem"><span class="legendDot guess"></span><b>D</b> = départ</span><span class="legendItem"><span class="legendDot answer"></span><b>C</b> = cible</span>';
    const source=new URL('https://www.google.com/maps/@'); source.searchParams.set('api','1'); source.searchParams.set('map_action','pano'); source.searchParams.set('pano',this.startPano||'');
    if (this.startPov) source.searchParams.set('heading',String(Math.round(this.startPov.heading)));
    $('streetViewLink').href=source.toString(); $('streetViewLink').textContent='Voir le Street View de départ';
    $('placeLink').href=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${this.explorationTarget.lat},${this.explorationTarget.lng}`)}`;
    $('placeLink').textContent='Voir la cible dans Google Maps';
    this.setBusy(false); $('toast').classList.add('hidden'); $('gameScreen').classList.add('has-result'); $('resultPanel').classList.remove('hidden');
    $('nextButton').textContent=this.round===(this.roundCount||3)-1?'Voir le bilan de l’exploration':'Mission suivante';
  }

  async startGame() {
    if (!this.apiReady) return;
    this.stopSoloBlitzTimer(true);
    if (this.challengeConfig && this.playType === 'exploration') this.setPlayType('guess',{silent:true});
    if (this.challengeConfig?.variant) this.setGameVariant(this.challengeConfig.variant,{silent:true});
    if (this.challengeConfig?.variant==='blitz' && [15,20,30].includes(Number(this.challengeConfig.timerSeconds))) this.blitzSeconds=Number(this.challengeConfig.timerSeconds);
    const startButtonText = $('startButton').textContent;
    this.roundCount = this.challengeConfig?.roundCount || (this.playType === 'exploration' ? 3 : 5);
    this.roundZoneIds = this.challengeConfig?.rounds?.length
      ? this.challengeConfig.rounds.map(r=>ZONES[r?.zoneId] ? r.zoneId : null)
      : this.buildRoundZoneSequence(this.roundCount);
    const firstZoneId=this.roundZoneIds[0] || (this.getSelectionDescriptor().type==='zone' ? this.getSelectionDescriptor().zoneId : this.getSelectionDescriptor().zoneIds[0]);
    if (firstZoneId && ZONES[firstZoneId]) this.zoneId=firstZoneId;
    try {
      if (ZONES[this.zoneId]?.officialParis && !this.parisContoursReady) {
        $('startButton').disabled = true;
        $('startButton').textContent = 'Chargement des limites officielles...';
        await this.prepareSelectedZone();
      }
    } catch (error) {
      $('helpError').textContent = `Limites officielles de Paris indisponibles : ${error.message}. Le jeu refuse volontairement de revenir aux anciens contours approximatifs. Réessaie dans quelques instants.`;
      $('helpError').classList.remove('hidden');
      $('helpModal').classList.remove('hidden');
      return;
    } finally {
      $('startButton').disabled = false;
      $('startButton').textContent = startButtonText || 'Lancer la partie';
    }
    this.ensureGoogleObjects();
    this.avoidPoint = null;
    this.lastAttemptPoint = null;
    this.round = 0;
    this.total = 0;
    this.results = [];
    $('startScreen').classList.add('hidden');
    $('endScreen').classList.add('hidden');
    $('gameScreen').classList.remove('hidden');
    $('gameScreen').classList.toggle('exploration-mission',this.playType==='exploration');
    $('mapPanel').classList.remove('expanded');
    if ($('restartButton')) $('restartButton').textContent=this.playType==='exploration' ? 'Rejouer l’exploration' : 'Rejouer la même map';
    await this.loadRound();
  }

  async loadRound() {
    const challengeRound=this.challengeConfig?.rounds?.[this.round] || null;
    const roundZoneId=(challengeRound?.zoneId && ZONES[challengeRound.zoneId]) ? challengeRound.zoneId : (this.roundZoneIds?.[this.round] && ZONES[this.roundZoneIds[this.round]] ? this.roundZoneIds[this.round] : this.zoneId);
    if (roundZoneId && ZONES[roundZoneId]) this.zoneId=roundZoneId;
    const zone = ZONES[this.zoneId];
    const token = ++this.currentRoundToken;
    this.guess = null;
    this.answer = null;
    this.startPano = null;
    this.startDescription = '';
    this.stopExplorationClock();
    this.stopSoloBlitzTimer(false);
    this.maxTravel = 0;
    this.currentTravel = 0;
    this.travelDistance = 0;
    this.lastTravelPosition = null;
    this.explorationTarget = null;
    this.explorationTargetPano = null;
    this.explorationTargetDescription = '';
    this.explorationDirectDistance = 0;
    this.explorationCompleting = false;
    this.currentPano = null;
    this.navHistory = [];
    this.moveCount = 0;
    this.pendingNavReason = null;
    this.pendingPovAfterNav = null;
    this.startPov = null;
    this.startTime = Date.now();
    $('gameScreen').classList.remove('has-result');
    $('resultPanel').classList.add('hidden');
    $('loadingPanel').classList.remove('hidden');
    $('loadingSpinner').classList.remove('hidden');
    $('loadingActions').classList.add('hidden');
    this.setBusy(false);
    $('toast').classList.add('hidden');
    const mission=this.playType==='exploration';
    $('gameScreen').classList.toggle('exploration-mission',mission);
    $('loadingTitle').textContent = mission ? 'Préparation de la mission...' : 'Recherche d\'un panorama...';
    $('loadingText').textContent = mission
      ? `LostPin cherche une cible et un départ Street View jouables dans ${zone.name}.`
      : (zone.officialParis ? `Google Street View cherche un départ dans les limites officielles de ${zone.name}.` : `Google Street View cherche un départ dans ${zone.name}.`);
    $('roundLabel').textContent = `${this.round + 1} / ${this.roundCount || (mission?3:5)}`;
    $('scoreLabel').textContent = this.total.toLocaleString('fr-FR');
    $('zoneLabel').textContent = zone.name;
    $('guessButton').disabled = true;
    $('guessButton').textContent = 'Place ton marqueur';
    if ($('resultTitle')) $('resultTitle').textContent='Résultat';
    if ($('distanceStatLabel')) $('distanceStatLabel').textContent='Distance';
    if ($('scoreStatLabel')) $('scoreStatLabel').textContent='Points';
    if ($('resultLegend')) $('resultLegend').innerHTML='<span class="legendItem"><span class="legendDot guess"></span><b>T</b> = ta réponse</span><span class="legendItem"><span class="legendDot answer"></span><b>R</b> = lieu réel</span>';
    if ($('streetViewLink')) $('streetViewLink').textContent='Voir le Street View de départ';
    if ($('placeLink')) $('placeLink').textContent=mission?'Voir la cible dans Google Maps':"Voir l'endroit dans Google Maps";
    const mapHeader=$('mapPanel')?.querySelector('.mapHeader span');
    if (mapHeader) mapHeader.textContent=mission?'REJOINS LA CIBLE':'PLACE TON MARQUEUR';
    $('travelPanel').classList.toggle('hidden', this.mode !== 'explore');
    this.updateTravelUI();
    this.updateCompass();
    try {
      let start;
      let startHeading;
      await this.prepareZone(this.zoneId);
      this.configureGuessMap(zone);
      if (mission) {
        $('loadingTitle').textContent='Création de la mission...';
        $('loadingText').textContent=`Recherche de la cible ${this.round+1}/${this.roundCount} dans ${zone.name}.`;
        const target=await this.findExplorationTarget(zone,token);
        if (token !== this.currentRoundToken) return;
        start=await this.findExplorationStart(zone,target,token);
        startHeading=Math.floor(Math.random()*360);
        if (token !== this.currentRoundToken) return;
        this.answer=target.pos;
        this.explorationTarget=target.pos;
        this.explorationTargetPano=target.data.location.pano;
        this.explorationTargetDescription=target.data.location.description || `Cible dans ${zone.name}`;
        this.explorationDirectDistance=haversine(start.pos,target.pos);
        this.currentTravel=this.explorationDirectDistance;
        this.startPositionForTravel=start.pos;
        this.lastTravelPosition=start.pos;
        this.startPano=start.data.location.pano;
        this.startDescription=start.data.location.description || zone.name;
        this.rememberStart(start.pos);
        this.setupExplorationMap(start,target);
      } else if (challengeRound) {
        $('loadingTitle').textContent = 'Chargement du challenge...';
        $('loadingText').textContent = `Panorama ${this.round + 1}/${this.roundCount} · ${zone.name}`;
        const response = await this.sv.getPanorama({pano:challengeRound.pano});
        const data = response && response.data;
        const loc = data && data.location;
        if (!loc || !loc.latLng || !loc.pano) throw new Error('Ce panorama du challenge n’est plus disponible dans Google Street View.');
        start = {data,pos:{lat:loc.latLng.lat(),lng:loc.latLng.lng()}};
        startHeading = Number.isFinite(Number(challengeRound.heading)) ? Number(challengeRound.heading) : 0;
        this.answer = start.pos;
        this.startPano = start.data.location.pano;
        this.startDescription = start.data.location.description || zone.name;
      } else {
        start = await this.findStart(zone, token);
        startHeading = Math.floor(Math.random() * 360);
        if (token !== this.currentRoundToken) return;
        this.answer = start.pos;
        this.startPano = start.data.location.pano;
        this.startDescription = start.data.location.description || zone.name;
        this.rememberStart(start.pos);
      }
      if (token !== this.currentRoundToken) return;
      const noMove = !mission && (this.mode === 'nomove' || this.mode === 'nmpz');
      this.panorama.setOptions({
        addressControl:false,
        clickToGo:!noMove,
        linksControl:!noMove,
        panControl:false,
        zoomControl:false,
        fullscreenControl:false,
        showRoadLabels:false,
        imageDateControl:false,
        enableCloseButton:false,
        motionTracking:false,
        motionTrackingControl:false
      });
      this.startPov = {heading:startHeading,pitch:0,zoom:0};
      this.currentPano = this.startPano;
      this.panorama.setPano(this.startPano);
      this.panorama.setPov({heading:startHeading,pitch:0});
      this.panorama.setZoom(0);
      this.panorama.setVisible(true);
      this.applyInteractionMode();
      this.updateCompass();
      if (mission) {
        this.startTime=Date.now();
        this.currentTravel=this.explorationDirectDistance;
        this.lastTravelPosition=start.pos;
        this.startExplorationClock();
      }
      this.updateTravelUI();
      setTimeout(() => {
        if (token === this.currentRoundToken) {
          $('loadingPanel').classList.add('hidden');
          if (!mission) {
            if (window.lostPinChallenges?.current) window.lostPinChallenges.onRoundReady?.(this.round);
            else this.startSoloBlitzTimer();
          }
        }
      }, 450);
    } catch (error) {
      if (token !== this.currentRoundToken) return;
      $('loadingTitle').textContent = 'Pas de départ trouvé';
      $('loadingText').textContent = error.message;
      $('loadingSpinner').classList.add('hidden');
      $('loadingActions').classList.remove('hidden');
    }
  }

  submitGuess() {
    if (this.playType === 'exploration') return;
    if (!this.guess || !this.answer || !$('resultPanel').classList.contains('hidden')) return;
    this.stopSoloBlitzTimer(false);
    const zone = ZONES[this.zoneId];
    const distance = haversine(this.guess, this.answer);
    const points = this.scoreForCurrentVariant(distance, zone);
    this.total += points;
    const seconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
    this.results.push({distance,points,description:this.startDescription,seconds,travel:this.maxTravel,moves:this.moveCount,zoneId:this.zoneId,zoneName:zone.name,variant:this.gameVariant});
    $('scoreLabel').textContent = this.total.toLocaleString('fr-FR');
    $('distanceLabel').textContent = formatDistance(distance);
    $('roundScoreLabel').textContent = points.toLocaleString('fr-FR');
    $('resultPlace').textContent = this.startDescription || zone.name;
    const variantText=this.gameVariant==='precision'?' · Précision linéaire':this.gameVariant==='blitz'?` · Blitz ${this.blitzSeconds} s`:'';
    $('travelInfo').textContent = (this.mode === 'explore'
      ? `Move : ${this.moveCount} déplacement${this.moveCount === 1 ? '' : 's'}, jusqu'à ${formatDistance(this.maxTravel)} du départ - ${seconds} s`
      : `${this.mode === 'nmpz' ? 'No Move + No Pan/Zoom' : 'No Move'} - ${seconds} s`) + variantText;
    const source = new URL('https://www.google.com/maps/@');
    source.searchParams.set('api','1');
    source.searchParams.set('map_action','pano');
    source.searchParams.set('pano',this.startPano || '');
    if (this.startPov) source.searchParams.set('heading',String(Math.round(this.startPov.heading)));
    $('streetViewLink').href = source.toString();
    $('placeLink').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${this.answer.lat},${this.answer.lng}`)}`;
    this.setBusy(false);
    $('toast').classList.add('hidden');
    $('gameScreen').classList.add('has-result');
    $('resultPanel').classList.remove('hidden');
    $('guessButton').disabled = true;
    this.lockRoundNavigation();
    this.answerMarker = new google.maps.Marker({
      map:this.map, position:this.answer, title:'Lieu réel', zIndex:3,
      label:{text:'R',color:'#ffffff',fontWeight:'900',fontSize:'12px'},
      icon:{path:google.maps.SymbolPath.CIRCLE,scale:11,fillColor:'#e53935',fillOpacity:1,strokeColor:'#ffffff',strokeOpacity:1,strokeWeight:3}
    });
    this.line = new google.maps.Polyline({map:this.map,path:[this.guess,this.answer],geodesic:true,strokeColor:'#ffffff',strokeOpacity:.82,strokeWeight:3});
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(this.guess); bounds.extend(this.answer);
    this.map.fitBounds(bounds, 65);
    $('nextButton').textContent = this.round === (this.roundCount || 5) - 1 ? 'Voir le score final' : 'Manche suivante';
  }

  submitChallengeTimeout() {
    if (!this.answer || !$('resultPanel').classList.contains('hidden')) return;
    const zone = ZONES[this.zoneId];
    const seconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
    this.results.push({distance:null,points:0,description:this.startDescription,seconds,travel:this.maxTravel,moves:this.moveCount,timedOut:true,zoneId:this.zoneId,zoneName:zone.name,variant:this.gameVariant});
    $('scoreLabel').textContent = this.total.toLocaleString('fr-FR');
    $('distanceLabel').textContent = 'Aucune réponse';
    $('roundScoreLabel').textContent = '0';
    $('resultPlace').textContent = this.startDescription || zone.name;
    $('travelInfo').textContent = 'Temps écoulé · aucune réponse validée.';
    const source = new URL('https://www.google.com/maps/@');
    source.searchParams.set('api','1');
    source.searchParams.set('map_action','pano');
    source.searchParams.set('pano',this.startPano || '');
    if (this.startPov) source.searchParams.set('heading',String(Math.round(this.startPov.heading)));
    $('streetViewLink').href = source.toString();
    $('placeLink').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${this.answer.lat},${this.answer.lng}`)}`;
    this.setBusy(false);
    $('toast').classList.add('hidden');
    $('gameScreen').classList.add('has-result');
    $('resultPanel').classList.remove('hidden');
    $('guessButton').disabled = true;
    $('guessButton').textContent = 'Temps écoulé';
    this.lockRoundNavigation();
    this.answerMarker = new google.maps.Marker({
      map:this.map, position:this.answer, title:'Lieu réel', zIndex:3,
      label:{text:'R',color:'#ffffff',fontWeight:'900',fontSize:'12px'},
      icon:{path:google.maps.SymbolPath.CIRCLE,scale:11,fillColor:'#e53935',fillOpacity:1,strokeColor:'#ffffff',strokeOpacity:1,strokeWeight:3}
    });
    this.map.setCenter(this.answer);
    this.map.setZoom(Math.max(5, zone.zoom || 10));
    $('nextButton').textContent = this.round === (this.roundCount || 5) - 1 ? 'Voir le score final' : 'Manche suivante';
  }

  async nextRound() {
    if (this.results.length !== this.round + 1) return;
    this.stopSoloBlitzTimer(false);
    this.round++;
    if (this.round >= (this.roundCount || (this.playType==='exploration'?3:5))) this.endGame();
    else await this.loadRound();
  }

  endExplorationGame() {
    this.stopExplorationClock();
    this.currentRoundToken++;
    $('gameScreen').classList.add('hidden');
    $('endScreen').classList.remove('hidden');
    $('endScreen').classList.remove('perfectGame');
    $('finalScore').textContent=this.total.toLocaleString('fr-FR');
    const maxScore=(this.roundCount||3)*5000;
    if ($('finalMaxScore')) $('finalMaxScore').textContent=maxScore.toLocaleString('fr-FR');
    $('endEyebrow').textContent='EXPLORATION TERMINÉE';
    const totalSeconds=this.results.reduce((sum,r)=>sum+(Number(r.seconds)||0),0);
    const totalMoves=this.results.reduce((sum,r)=>sum+(Number(r.moves)||0),0);
    const totalTravel=this.results.reduce((sum,r)=>sum+(Number(r.travel)||0),0);
    const totalDirect=this.results.reduce((sum,r)=>sum+(Number(r.missionDistance)||0),0);
    const selection=this.getSelectionDescriptor();
    const selectionName=this.getSelectionName(selection);
    $('finalComment').textContent=`${selectionName} · ${this.results.length} cible${this.results.length>1?'s':''} atteinte${this.results.length>1?'s':''} en ${formatClock(totalSeconds)} · ${totalMoves} déplacements · ${formatDistance(totalTravel)} parcourus pour ${formatDistance(totalDirect)} en ligne directe.`;
    $('perfectStats').classList.add('hidden'); $('perfectStats').replaceChildren();
    $('breakdown').replaceChildren();
    this.results.forEach((r,i)=>{
      const row=document.createElement('div'); row.className='breakRow';
      const zoneName=r.zoneName||ZONES[r.zoneId]?.name||'Map';
      const label=selection.type==='playlist'?`${zoneName} · ${r.description||'Cible'}`:(r.description||`${zoneName} · cible`);
      row.innerHTML=`<span class="roundNum">${i+1}</span><span><strong>${this.escapeHTML(label)}</strong><small>${formatClock(r.seconds)} · ${r.moves||0} dépl. · ${formatDistance(r.travel||0)} parcourus · direct ${formatDistance(r.missionDistance||0)}</small></span><b>${Number(r.points||0).toLocaleString('fr-FR')} pts</b>`;
      $('breakdown').appendChild(row);
    });
    if ((this.roundCount||3)===3) {
      const bests=readJSON(BEST_KEY,{}), key=`${this.getSelectionKey(selection)}:exploration`;
      bests[key]=Math.max(Number(bests[key])||0,this.total); writeJSON(BEST_KEY,bests);
    }
    if ($('restartButton')) $('restartButton').textContent='Rejouer l’exploration';
  }

  endGame() {
    if (this.playType === 'exploration') return this.endExplorationGame();
    this.currentRoundToken++;
    $('gameScreen').classList.add('hidden');
    $('endScreen').classList.remove('hidden');
    $('finalScore').textContent = this.total.toLocaleString('fr-FR');
    const maxScore = (this.roundCount || 5) * 5000;
    if ($('finalMaxScore')) $('finalMaxScore').textContent = maxScore.toLocaleString('fr-FR');
    const zone = ZONES[this.zoneId];
    const selection=this.getSelectionDescriptor();
    const selectionName=this.getSelectionName(selection);
    const selectionLabel=selection.type==='playlist'?'Playlist':'Map';
    const validDistances = this.results.map(x => x.distance).filter(Number.isFinite);
    const avg = validDistances.reduce((s,x) => s + x,0) / Math.max(1,validDistances.length);
    const avgText = validDistances.length ? formatDistance(avg) : 'aucune réponse mesurée';
    const key = this.variantRecordKey(selection);
    const isPerfect = this.total === 25000 && this.results.length === 5 && this.results.every(r => r.points === 5000);

    const perfects = readJSON(PERFECT_KEY, {});
    let perfect = perfects[key] || null;
    let newPrecisionRecord = false;
    if (isPerfect) {
      const previousBestAvg = Number.isFinite(perfect?.bestAvg) ? perfect.bestAvg : null;
      newPrecisionRecord = previousBestAvg == null || avg < previousBestAvg;
      perfect = {
        count:(perfect?.count || 0) + 1,
        bestAvg:previousBestAvg == null ? avg : Math.min(previousBestAvg, avg),
        lastAvg:avg,
        updatedAt:Date.now()
      };
      perfects[key] = perfect;
      writeJSON(PERFECT_KEY, perfects);
    }

    $('endScreen').classList.toggle('perfectGame', isPerfect);
    $('endEyebrow').textContent = isPerfect ? 'PARTIE PARFAITE' : 'PARTIE TERMINÉE';

    let comment;
    if (isPerfect) {
      comment = `${selectionLabel} ${selectionName} - ${this.mode === 'nomove' ? 'No Move' : this.mode === 'nmpz' ? 'No Move + No Pan/Zoom' : 'Move'} · ${variantLabel(this.gameVariant)}. 25 000 / 25 000 : les 5 lieux sont dans le rayon parfait de 25 m. Distance moyenne : ${avgText}.`;
      if (newPrecisionRecord && perfect.count > 1) comment += ' Nouveau record de précision sur un 25 000 !';
    } else {
      comment = `${selectionLabel} ${selectionName} - ${this.mode === 'nomove' ? 'No Move' : this.mode === 'nmpz' ? 'No Move + No Pan/Zoom' : 'Move'} · ${variantLabel(this.gameVariant)}. Distance moyenne : ${avgText}.`;
      const ratio = maxScore > 0 ? this.total / maxScore : 0;
      if (ratio >= .92) comment += ' Très grosse partie.';
      else if (ratio >= .76) comment += ' Solide.';
      else if (ratio >= .56) comment += ' Tu commences à bien lire les lieux.';
      else comment += ' Il reste de la marge pour la revanche.';
    }
    $('finalComment').textContent = comment;

    const stats = perfect || perfects[key];
    const perfectStats = $('perfectStats');
    if (stats?.count) {
      perfectStats.classList.remove('hidden');
      perfectStats.replaceChildren();
      const count = document.createElement('div');
      count.className = 'perfectStat';
      count.innerHTML = `<small>25 000 sur cette sélection</small><b>${stats.count}</b>`;
      const precision = document.createElement('div');
      precision.className = 'perfectStat';
      precision.innerHTML = `<small>Meilleure moyenne sur un 25 000</small><b>${formatDistance(stats.bestAvg)}</b>`;
      perfectStats.append(count, precision);
    } else {
      perfectStats.classList.add('hidden');
      perfectStats.replaceChildren();
    }

    $('breakdown').replaceChildren();
    this.results.forEach((r,i) => {
      const row = document.createElement('div');
      row.className = 'breakRow';
      const extra = this.mode === 'explore' ? ` - ${r.moves || 0} dépl.` : '';
      const distanceText = r.timedOut ? 'Aucune réponse' : formatDistance(r.distance);
      const roundZoneName=r.zoneName || ZONES[r.zoneId]?.name || zone.name;
      const placeLabel=selection.type==='playlist' ? `${roundZoneName} · ${r.description || roundZoneName}` : (r.description || roundZoneName);
      row.innerHTML = `<span class="roundNum">${i+1}</span><span><strong>${this.escapeHTML(placeLabel)}</strong><small>${distanceText} - ${r.seconds} s${extra}${this.gameVariant==='precision'?' · précision':''}</small></span><b>${r.points.toLocaleString('fr-FR')} pts</b>`;
      $('breakdown').appendChild(row);
    });
    if ((this.roundCount || 5) === 5) {
      const bests = readJSON(BEST_KEY, {});
      bests[key] = Math.max(bests[key] || 0, this.total);
      writeJSON(BEST_KEY, bests);
    }
  }

  escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  showMenu() {
    this.currentRoundToken++;
    this.stopExplorationClock();
    this.stopSoloBlitzTimer(true);
    this.setBusy(false);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    $('toast')?.classList.add('hidden');
    $('gameScreen')?.classList.remove('has-result','challenge-active','exploration-mission');
    if (this.panorama) this.panorama.setVisible(false);
    $('panoInteractionLock')?.classList.add('hidden');
    $('gameScreen').classList.add('hidden');
    $('endScreen').classList.add('hidden');
    $('startScreen').classList.remove('hidden');
    const selection=this.getSelectionDescriptor();
    if (selection.type==='zone') this.zoneId=selection.zoneId;
    this.refreshPlayTypeUI();
    this.updateSelectionBanner();
    this.updateBest();
  }
}

window.GUESSR_INTERNALS = { ZONES, GEOGRAPHY:window.LOSTPIN_GEOGRAPHY, haversine, scoreFor, precisionScoreFor, variantLabel, formatDistance, normalizeHeading };
window.guessrGame = new GuessrGame();
})();
