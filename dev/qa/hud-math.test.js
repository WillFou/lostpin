// Run from the repository root: node --test dev/qa/hud-math.test.js
const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../../src/js/ui/hud-math.js');
const close=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
test('coordinate normalization and Google LatLng accessors',()=>{
 assert.deepEqual(M.position({lat:12,lng:190}),{lat:12,lng:-170});
 assert.deepEqual(M.position({lat:()=>48,lng:()=>2}),{lat:48,lng:2});
});
test('invalid coordinates never create map positions',()=>{
 [null,{}, {lat:91,lng:0},{lat:0,lng:NaN},{lat:null,lng:3},{lat:0,lng:undefined},{lat:Infinity,lng:0}].forEach(p=>assert.equal(M.position(p),null));
});
test('ordinary European bounds',()=>assert.deepEqual(M.boundsFor([{lat:48,lng:2},{lat:50,lng:4}]),{south:48,north:50,west:2,east:4}));
test('dateline crossings choose the narrow interval, not the whole globe',()=>{
 const b=M.boundsFor([{lat:-17,lng:179},{lat:-16,lng:-179}]);
 assert.equal(b.west,179);assert.equal(b.east,-179);assert.equal((b.east-b.west+360)%360,2);
});
test('all round bounds include every point on their shortest longitude interval',()=>{
 const points=[{lat:0,lng:170},{lat:20,lng:-175},{lat:-15,lng:-160},{lat:8,lng:176}];
 const b=M.boundsFor(points),span=(b.east-b.west+360)%360;
 assert.equal(span,30);points.forEach(p=>assert.ok((p.lng-b.west+360)%360<=span));
});
test('single point and empty data',()=>{
 assert.equal(M.boundsFor([]),null);assert.deepEqual(M.boundsFor([{lat:3,lng:4}]),{south:3,north:3,west:4,east:4});
});
test('polar bounds kept inside map display range',()=>assert.deepEqual(M.boundsFor([{lat:90,lng:0},{lat:-90,lng:1}]),{south:-85,north:85,west:0,east:1}));
test('geodesic interpolation has exact endpoints',()=>{
 const a={lat:48.8,lng:2.3},b={lat:40,lng:-73};assert.deepEqual(M.interpolate(a,b,0),M.position(a));assert.deepEqual(M.interpolate(a,b,1),M.position(b));
});
test('geodesic animation crosses the date line without crossing Greenwich',()=>{
 const p=M.interpolate({lat:0,lng:179},{lat:0,lng:-179},.5);close(p.lat,0);close(Math.abs(p.lng),180);
});
test('identical and antipodal points do not produce NaN',()=>{
 for(let i=0;i<=20;i++)for(const [a,b] of [[{lat:48,lng:2},{lat:48,lng:2}],[{lat:0,lng:0},{lat:0,lng:180}]]){
 const p=M.interpolate(a,b,i/20);assert.ok(Number.isFinite(p.lat)&&Number.isFinite(p.lng));
 }
});
test('clock uses elapsed seconds with safe fallback',()=>{
 assert.equal(M.clock(0),'0:00');assert.equal(M.clock(61.9),'1:01');assert.equal(M.clock(-3),'0:00');assert.equal(M.clock(null),'0:00');assert.equal(M.clock(600),'10:00');
});
test('reserved HUD rectangles support margins',()=>{
 const a={left:0,right:10,top:0,bottom:10},b={left:12,right:22,top:0,bottom:10};
 assert.equal(M.overlap(a,b),false);assert.equal(M.overlap(a,b,3),true);assert.equal(M.overlap(a,a),true);
});
