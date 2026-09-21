/* LostPin - pure geometry helpers shared by live results and the final recap. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory();
  else root.LostPinHudMath=factory();
})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const normalizeLongitude=x=>((x+180)%360+360)%360-180;
function position(value){
  if(!value) return null;
  const lat=typeof value.lat==='function'?value.lat():value.lat;
  const lng=typeof value.lng==='function'?value.lng():value.lng;
  if(lat==null||lng==null||!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng))||Math.abs(Number(lat))>90) return null;
  return {lat:Number(lat),lng:normalizeLongitude(Number(lng))};
}
// Choose the shortest longitudinal interval, including crossings of the date line.
function boundsFor(values){
  const points=values.map(position).filter(Boolean);
  if(!points.length) return null;
  const longitudes=points.map(p=>(p.lng+360)%360).sort((a,b)=>a-b);
  let maxGap=-1,gapAt=0;
  longitudes.forEach((v,i)=>{const gap=(i===longitudes.length-1?longitudes[0]+360:longitudes[i+1])-v;if(gap>maxGap){maxGap=gap;gapAt=i;}});
  const west=normalizeLongitude(longitudes[(gapAt+1)%longitudes.length]);
  const east=normalizeLongitude(longitudes[gapAt]);
  const south=clamp(Math.min(...points.map(p=>p.lat)),-85,85),north=clamp(Math.max(...points.map(p=>p.lat)),-85,85);
  return {south,north,west,east};
}
function interpolate(a,b,t){
  a=position(a);b=position(b);t=clamp(t,0,1);
  if(!a||!b)return b||a;
  if(t===0)return a;if(t===1)return b;
  const r=Math.PI/180;
  const vec=p=>[Math.cos(p.lat*r)*Math.cos(p.lng*r),Math.cos(p.lat*r)*Math.sin(p.lng*r),Math.sin(p.lat*r)];
  const u=vec(a),v=vec(b),angle=Math.acos(clamp(u.reduce((s,n,i)=>s+n*v[i],0),-1,1));
  if(Math.abs(Math.sin(angle))<1e-6)return {lat:a.lat+(b.lat-a.lat)*t,lng:normalizeLongitude(a.lng+normalizeLongitude(b.lng-a.lng)*t)};
  const x=Math.sin((1-t)*angle)/Math.sin(angle),y=Math.sin(t*angle)/Math.sin(angle);
  const w=u.map((n,i)=>n*x+v[i]*y);
  return {lat:Math.atan2(w[2],Math.hypot(w[0],w[1]))/r,lng:normalizeLongitude(Math.atan2(w[1],w[0])/r)};
}
function clock(seconds){const n=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
function overlap(a,b,gap=0){return a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;}
return {clamp,position,boundsFor,interpolate,clock,overlap};
});
