(() => {
'use strict';

// LostPin geographic catalogue.
// Keep gameplay geometry in app.js; this file describes how playable maps are
// organised, browsed and searched. Zone IDs are stable because Challenges,
// playlists, statistics and multiplayer already persist them.

const CONTINENTS = Object.freeze({
  europe: { id:'europe', name:'Europe', aliases:['europe'] },
  northAmerica: { id:'northAmerica', name:'Amérique du Nord', aliases:['amerique du nord','north america'] },
  southAmerica: { id:'southAmerica', name:'Amérique du Sud', aliases:['amerique du sud','south america'] },
  asia: { id:'asia', name:'Asie', aliases:['asie','asia'] },
  africa: { id:'africa', name:'Afrique', aliases:['afrique','africa'] },
  oceania: { id:'oceania', name:'Océanie', aliases:['oceanie','oceania'] }
});

const COUNTRIES = Object.freeze({
  france: { id:'france', name:'France', continentId:'europe', aliases:['france','fr'] },
  usa: { id:'usa', name:'États-Unis', continentId:'northAmerica', aliases:['etats unis','états-unis','usa','us','united states','united states of america'] }
});

const REGIONS = Object.freeze({
  ileDeFrance: { id:'ileDeFrance', name:'Île-de-France', countryId:'france', aliases:['ile de france','île-de-france','idf'] },
  grandEst: { id:'grandEst', name:'Grand Est', countryId:'france', aliases:['grand est'] },
  districtOfColumbia: { id:'districtOfColumbia', name:'District of Columbia', countryId:'usa', aliases:['district of columbia','dc','washington dc'] }
});

const DEPARTMENTS = Object.freeze({
  paris: { id:'paris', name:'Paris (75)', regionId:'ileDeFrance', aliases:['paris 75','75'] },
  aube: { id:'aube', name:'Aube (10)', regionId:'grandEst', aliases:['aube','10'] }
});

const MAPS = Object.freeze({
  paris: {
    zoneId:'paris', name:'Paris', kind:'city', continentId:'europe', countryId:'france', regionId:'ileDeFrance', departmentId:'paris', cityId:'paris',
    parisFeatured:true, icon:'paris', order:10,
    description:'Limites officielles de Paris, grands bois exclus.',
    aliases:['paris france','capitale france','ville de paris']
  },
  paris13: {
    zoneId:'paris13', name:'Paris 13e', kind:'district', continentId:'europe', countryId:'france', regionId:'ileDeFrance', departmentId:'paris', cityId:'paris',
    parisFeatured:true, icon:'arr13', order:20,
    description:'Limite administrative officielle du 13e arrondissement.',
    aliases:['paris 13','paris 13e','13e arrondissement','13eme arrondissement','13ème arrondissement']
  },
  parisGroup: {
    zoneId:'parisGroup', name:'Paris 5e / 6e / 7e / 13e', kind:'districtCollection', continentId:'europe', countryId:'france', regionId:'ileDeFrance', departmentId:'paris', cityId:'paris',
    parisFeatured:true, icon:'quarters', order:30,
    description:'Un des quatre arrondissements officiels à chaque manche.',
    aliases:['paris arrondissements','paris 5 6 7 13','5e 6e 7e 13e']
  },
  bagneux: {
    zoneId:'bagneux', name:'Bagneux-la-Fosse', kind:'city', continentId:'europe', countryId:'france', regionId:'grandEst', departmentId:'aube', cityId:'bagneuxLaFosse',
    icon:'village', order:40,
    description:'Village et proches alentours (~1,5 km autour du bourg).',
    aliases:['bagneux la fosse','bagneux-la-fosse','aube bagneux','village bagneux']
  },
  washington: {
    zoneId:'washington', name:'Washington DC', kind:'city', continentId:'northAmerica', countryId:'usa', regionId:'districtOfColumbia', cityId:'washingtonDc',
    icon:'washington', order:50,
    description:'Le District of Columbia.',
    aliases:['washington','washington dc','district of columbia','dc']
  },
  france: {
    zoneId:'france', name:'France', kind:'country', continentId:'europe', countryId:'france',
    icon:'france', order:60,
    description:'Métropole et Corse.',
    aliases:['france métropolitaine','france metropolitaine','hexagone']
  },
  europe: {
    zoneId:'europe', name:'Europe', kind:'continent', continentId:'europe', icon:'world', order:70,
    description:'Zones Street View européennes prises en charge.', aliases:['europe']
  },
  northAmerica: {
    zoneId:'northAmerica', name:'Amérique du Nord', kind:'continent', continentId:'northAmerica', icon:'world', order:80,
    description:'États-Unis, Canada et Mexique dans les zones prises en charge.', aliases:['amerique du nord','north america']
  },
  southAmerica: {
    zoneId:'southAmerica', name:'Amérique du Sud', kind:'continent', continentId:'southAmerica', icon:'world', order:90,
    description:'Zones Street View sud-américaines prises en charge.', aliases:['amerique du sud','south america']
  },
  asia: {
    zoneId:'asia', name:'Asie', kind:'continent', continentId:'asia', icon:'world', order:100,
    description:'Japon, Corée, Taïwan et Asie du Sud-Est prises en charge.', aliases:['asie','asia']
  },
  africa: {
    zoneId:'africa', name:'Afrique', kind:'continent', continentId:'africa', icon:'world', order:110,
    description:'Zones Street View africaines prises en charge.', aliases:['afrique','africa']
  },
  oceania: {
    zoneId:'oceania', name:'Océanie', kind:'continent', continentId:'oceania', icon:'world', order:120,
    description:'Australie et Nouvelle-Zélande dans les zones prises en charge.', aliases:['oceanie','oceania']
  },
  world: {
    zoneId:'world', name:'Monde', kind:'world', icon:'world', order:130,
    description:'Tirage mondial dans les zones couvertes par Street View.', aliases:['monde','world','mondial']
  }
});

const KIND_LABELS = Object.freeze({
  city:'Ville', district:'Arrondissement', districtCollection:'Collection parisienne', country:'Pays', continent:'Continent', world:'Monde'
});

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[’']/g,' ')
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
}

function mapValues() { return Object.values(MAPS).slice().sort((a,b)=>(a.order||0)-(b.order||0)); }
function getMap(zoneId) { return MAPS[zoneId] || null; }
function getContinent(id) { return CONTINENTS[id] || null; }
function getCountry(id) { return COUNTRIES[id] || null; }
function getRegion(id) { return REGIONS[id] || null; }
function getDepartment(id) { return DEPARTMENTS[id] || null; }

function pathParts(map, options={}) {
  if (!map) return [];
  const parts=[];
  const continent=getContinent(map.continentId);
  const country=getCountry(map.countryId);
  const region=getRegion(map.regionId);
  const department=getDepartment(map.departmentId);
  if (continent) parts.push(continent.name);
  if (country) parts.push(country.name);
  if (options.includeRegion && region) parts.push(region.name);
  if (options.includeDepartment && department) parts.push(department.name);
  if (map.kind==='district' || map.kind==='districtCollection') parts.push('Paris');
  return parts;
}

function pathLabel(map, options={}) { return pathParts(map,options).join(' › '); }

function matchesType(map, selectorType) {
  if (selectorType==='paris') return !!map.parisFeatured;
  if (selectorType==='city') return map.kind==='city';
  if (selectorType==='country') return map.kind==='country';
  if (selectorType==='continent') return map.kind==='continent';
  if (selectorType==='world') return map.kind==='world';
  if (selectorType==='all') return true;
  return false;
}

function mapsFor(selectorType, filters={}) {
  return mapValues().filter(map => {
    if (!matchesType(map,selectorType)) return false;
    if (filters.continentId && map.continentId!==filters.continentId) return false;
    if (filters.countryId && map.countryId!==filters.countryId) return false;
    return true;
  });
}

function continentsFor(selectorType) {
  const ids=[];
  for (const map of mapsFor(selectorType)) if (map.continentId && !ids.includes(map.continentId)) ids.push(map.continentId);
  return ids.map(getContinent).filter(Boolean);
}

function countriesFor(selectorType, continentId) {
  const ids=[];
  for (const map of mapsFor(selectorType,{continentId})) if (map.countryId && !ids.includes(map.countryId)) ids.push(map.countryId);
  return ids.map(getCountry).filter(Boolean);
}

function searchableText(map) {
  const chunks=[map.name, KIND_LABELS[map.kind] || map.kind, ...(map.aliases||[])];
  const continent=getContinent(map.continentId); if (continent) chunks.push(continent.name,...(continent.aliases||[]));
  const country=getCountry(map.countryId); if (country) chunks.push(country.name,...(country.aliases||[]));
  const region=getRegion(map.regionId); if (region) chunks.push(region.name,...(region.aliases||[]));
  const department=getDepartment(map.departmentId); if (department) chunks.push(department.name,...(department.aliases||[]));
  return normalizeText(chunks.join(' '));
}

function search(query) {
  const q=normalizeText(query);
  if (!q) return [];
  return mapValues().map(map => {
    const name=normalizeText(map.name);
    const aliases=(map.aliases||[]).map(normalizeText);
    const haystack=searchableText(map);
    if (!haystack.includes(q)) return null;
    let rank=50;
    if (name===q) rank=0;
    else if (name.startsWith(q)) rank=5;
    else if (aliases.some(x=>x===q)) rank=8;
    else if (aliases.some(x=>x.startsWith(q))) rank=12;
    else if (normalizeText(pathLabel(map,{includeRegion:true,includeDepartment:true})).includes(q)) rank=20;
    return {map,rank};
  }).filter(Boolean).sort((a,b)=>a.rank-b.rank || (a.map.order||0)-(b.map.order||0)).map(x=>x.map);
}

function categoryForZone(zoneId) {
  const map=getMap(zoneId);
  if (!map) return 'paris';
  if (map.parisFeatured) return 'paris';
  if (map.kind==='city') return 'city';
  if (map.kind==='country') return 'country';
  if (map.kind==='continent') return 'continent';
  if (map.kind==='world') return 'world';
  return 'all';
}

function playlistSections(zoneIds) {
  const ids=Array.isArray(zoneIds) ? zoneIds : Object.keys(MAPS);
  const selected=ids.map(getMap).filter(Boolean);
  const groups=[
    ['Paris', selected.filter(x=>x.parisFeatured)],
    ['Villes', selected.filter(x=>x.kind==='city' && !x.parisFeatured)],
    ['Pays', selected.filter(x=>x.kind==='country')],
    ['Continents', selected.filter(x=>x.kind==='continent')],
    ['Monde', selected.filter(x=>x.kind==='world')]
  ];
  return groups.filter(([,items])=>items.length);
}

window.LOSTPIN_GEOGRAPHY = Object.freeze({
  CONTINENTS, COUNTRIES, REGIONS, DEPARTMENTS, MAPS, KIND_LABELS,
  normalizeText, getMap, getContinent, getCountry, getRegion, getDepartment,
  pathParts, pathLabel, mapsFor, continentsFor, countriesFor, search,
  categoryForZone, playlistSections
});
})();
