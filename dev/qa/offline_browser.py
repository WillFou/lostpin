from pathlib import Path
from bs4 import BeautifulSoup
import base64,mimetypes,re,json
ROOT=Path(__file__).resolve().parents[2]
def uri(file):
 return 'data:'+str(mimetypes.guess_type(file)[0] or 'application/octet-stream')+';base64,'+base64.b64encode(file.read_bytes()).decode()
def css_data(css,base):
 css=re.sub(r'@import\s+[^;]+;','',css)
 def sub(m):
  u=m.group(1).strip('"\' ')
  f=(base/u).resolve()
  return 'url("'+uri(f)+'")' if f.is_file() else m.group(0)
 return re.sub(r'url\(([^)]+)\)',sub,css)
def load_page(page):
 soup=BeautifulSoup((ROOT/'index.html').read_text(),'html.parser')
 scripts=[]
 for s in soup.find_all('script'):
  src=s.get('src')
  if src and (ROOT/src).is_file():scripts.append((ROOT/src).read_text())
  elif not src and s.string:scripts.append(s.string)
  s.decompose()
 for l in list(soup.find_all('link')):
  file=ROOT/l.get('href','')
  if 'stylesheet' in l.get('rel',[]) and file.is_file():
   tag=soup.new_tag('style');tag.string=css_data(file.read_text(),file.parent);l.replace_with(tag)
  else:l.decompose()
 for img in soup.find_all('img'):
  file=ROOT/img.get('src','')
  if file.is_file():img['src']=uri(file)
 page.set_content(str(soup),wait_until='domcontentloaded')
 page.evaluate('''() => {
 const data={};const store={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k],clear:()=>Object.keys(data).forEach(k=>delete data[k])};
 Object.defineProperty(window,'localStorage',{value:store,configurable:true});
 window.PG_CONFIG={};window.fetch=async u=>new Response(JSON.stringify(String(u).includes('version.json')?{version:'6.2.1'}:{}),{status:200});
 }''')
 page.add_script_tag(content=(ROOT/'dev/qa/google-maps.stub.js').read_text())
 for s in scripts:page.add_script_tag(content=s)
 page.evaluate('(image)=>window.__qaPanorama=image',uri(ROOT/'assets/images/v6/hero-game.jpg'))
 page.evaluate('''() => {
  const g=window.guessrGame;g.apiReady=true;g.parisContoursReady=true;g.refreshPlayTypeUI();document.getElementById('startButton').disabled=false;
  g.findStart=async function(){const locs=[[48.86,2.35],[48.875,2.335],[48.891,2.342],[48.867,2.301],[48.843,2.363]];const a=locs[this.round%5];return{pos:{lat:a[0],lng:a[1]},data:{location:{pano:'qa-'+this.round,description:['Lieu de test 1','Lieu de test 2','Lieu de test 3','Lieu de test 4','Lieu de test 5'][this.round%5]},links:[{pano:'qa-neighbor'}]}}};g.prepareZone=async()=>{};
  window.guessrMusic.countdownTick=s=>window.__qaTicks.push(s);
 }''')

 # Theme initialization may set brand URLs again. Embed them in this offline fixture only.
 for img in page.locator('img').all():
  src=img.get_attribute('src') or ''
  file=ROOT/src
  if not src.startswith('data:') and file.is_file():img.evaluate('(el,src)=>el.src=src',uri(file))
