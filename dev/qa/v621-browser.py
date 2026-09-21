"""Offline production UI/controller regression tests. Needs Playwright + BeautifulSoup.
No Google API request, key, or PeerJS network connection is used.
Run: python dev/qa/v621-browser.py
"""
from pathlib import Path
import json,os,shutil
from playwright.sync_api import sync_playwright
from offline_browser import load_page,ROOT
OUT=ROOT/'dev/qa/artifacts/v621';OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'passed':bool(ok),'detail':detail})
 print(('PASS ' if ok else 'FAIL ')+name,detail if not ok else '')

def start(page,timer=0,variant='classic',mode='explore'):
 page.evaluate('''async x=>{
  const g=guessrGame;
  if(guessrMultiplayer.active)guessrMultiplayer.cleanup(true);
  if(lostPinChallenges.current){lostPinChallenges.stopTimer(true);lostPinChallenges.current=null;g.challengeConfig=null;}
  g.showMenu();g.setGameVariant(x.variant);g.mode=x.mode;g.lastGuessMode=x.mode;g.setClassicTimerSeconds(x.timer);
  await g.startGame();
 }''',{'timer':timer,'variant':variant,'mode':mode})
 page.wait_for_timeout(510)

with sync_playwright() as pw:
 exe=os.environ.get('LOSTPIN_CHROMIUM') or shutil.which('chromium') or shutil.which('google-chrome')
 browser=pw.chromium.launch(**({'executable_path':exe} if exe else {}),headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1920,'height':1080},reduced_motion='reduce')
 context.route('**/*',lambda r:r.abort())
 page=context.new_page();page.set_default_timeout(8000);page.on('pageerror',lambda e:errors.append(str(e)))
 load_page(page)
 check('Page and production controllers initialize',page.evaluate('!!guessrGame && !!lostPinHUD && !!guessrMultiplayer && !!lostPinChallenges'))
 check('Classic settings offer exactly Off / 60 / 120 / 180',page.locator('#classicSeconds option').evaluate_all('(els)=>els.map(e=>e.value)')==['0','60','120','180'])
 for value in [0,60,120,180]:
  start(page,timer=value)
  check(f'Classic {value}: timer visibility',page.locator('#multiTimer').is_visible()==bool(value))
  check(f'Classic {value}: active duration',page.evaluate('guessrGame.activeSoloTimerSeconds')==value)
  check(f'Classic {value}: preference persisted',page.evaluate("localStorage.getItem('lostpin-classic-timer-v1')")==str(value))
  if value:
   text=page.locator('#multiTimerValue').inner_text();check(f'Classic {value}: stylized time text',text==f'{value//60}:00',text)
 page.evaluate('guessrGame.setClassicTimerSeconds(999)')
 check('Invalid timer falls back to Off',page.evaluate('guessrGame.classicTimerSeconds')==0)

 start(page,timer=60)
 page.mouse.move(100,500);page.wait_for_timeout(70)
 check('Reduced map actually translucent over transparent parent',page.locator('#guessMap').evaluate("e=>getComputedStyle(e).opacity==='0.9' && getComputedStyle(e.parentElement).backgroundColor==='rgba(0, 0, 0, 0)'") )
 before=page.locator('#mapPanel').bounding_box()
 page.locator('#guessMap').hover();page.wait_for_timeout(70)
 after=page.locator('#mapPanel').bounding_box()
 check('Hover never enlarges map',abs(before['width']-after['width'])<1 and abs(before['height']-after['height'])<1)
 check('Map opaque on interaction',page.locator('#guessMap').evaluate("e=>getComputedStyle(e).opacity==='1'"))
 page.mouse.move(100,500);page.wait_for_timeout(70)
 None # Captures are produced by the separate visual probe.
 page.locator('#expandMap').click();page.mouse.move(100,500);page.wait_for_timeout(70)
 for w,h in [(1366,768),(1920,1080),(2560,1600),(3200,2000),(3840,2160),(1024,768),(768,1024),(390,844)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(80)
  m=page.locator('#mapPanel').bounding_box();c=page.locator('#compass').bounding_box()
  tools=page.locator('.mapBottomTools').bounding_box();canvas=page.locator('#guessMap').bounding_box()
  check(f'Expanded map inside {w}x{h}',m['x']>=-1 and m['y']>=-1 and m['x']+m['width']<=w+1 and m['y']+m['height']<=h+1,m)
  check(f'Expanded map clear of compass at {w}x{h}',m['y']>=c['y']+c['height']+7,(m,c))
  if w>=1180:check(f'Expanded map substantial width at {w}',.5<=m['width']/w<=.60,m['width']/w)
  check(f'Controls below map and left-aligned at {w}',tools['y']>=canvas['y']+canvas['height']-1 and tools['x']<m['x']+25,(tools,canvas))
 page.set_viewport_size({'width':1920,'height':1080});page.wait_for_timeout(70)
 None
 page.locator('#expandMap').click();page.mouse.move(100,500);page.wait_for_timeout(70)
 check('Mouse focus left on reduce does not keep map opaque',page.locator('#guessMap').evaluate("e=>getComputedStyle(e).opacity==='0.9'"))
 page.keyboard.press('m');page.wait_for_timeout(70)
 check('M expands deliberately',page.locator('#mapPanel').evaluate("e=>e.classList.contains('expanded')"))
 page.keyboard.press('Escape');page.wait_for_timeout(70)
 check('Escape reduces map',not page.locator('#mapPanel').evaluate("e=>e.classList.contains('expanded')"))
 check('Return at bottom left retains accessible label',page.locator('.mapBottomTools #returnStartButton').get_attribute('aria-label')=='Revenir au point de d\u00e9part')
 page.evaluate('guessrGame.panorama.setPano("qa-detour")');page.locator('#returnStartButton').click()
 check('Return button returns to start panorama',page.evaluate('guessrGame.panorama.getPano()===guessrGame.startPano'))

 # Countdown using the real interval/deadline, shortened only in this test.
 for value in [60,120,180]:
  start(page,timer=value)
  page.evaluate('guessrGame.soloDeadline=Date.now()-1');page.wait_for_timeout(300)
  r=page.evaluate('guessrGame.results[0]')
  check(f'Classic {value}: timeout without point is exactly one zero',page.evaluate('guessrGame.results.length')==1 and r['points']==0 and r['timedOut'])
  check(f'Classic {value}: recorded duration correct',r['seconds']==value,r['seconds'])
  check(f'Classic {value}: timer cleared and panorama locked',page.evaluate('guessrGame.soloTimerInterval===null && guessrGame.roundLocked'))
  page.evaluate('guessrGame.submitSoloTimeout()')
  check(f'Classic {value}: duplicate timeout ignored',page.evaluate('guessrGame.results.length')==1)
 start(page,timer=120)
 page.evaluate('''()=>{const g=guessrGame;g.setGuess(g.answer);g.startTime=Date.now()-190000;g.soloDeadline=Date.now()-1;}''');page.wait_for_timeout(300)
 r=page.evaluate('guessrGame.results[0]')
 check('Timeout with a placed point scores it automatically',r['points']==5000 and not r.get('timedOut',False))
 check('Late background callback cannot inflate recorded time',r['seconds']==120)
 check('Result fills map and is fully opaque',page.locator('#guessMap').evaluate("e=>getComputedStyle(e).opacity==='1'") and page.locator('#mapPanel').bounding_box()['width']>1900)
 None
 start(page,timer=60)
 page.evaluate('''()=>{__qaTicks.length=0;guessrGame.soloDeadline=Date.now()+9200;}''');page.wait_for_timeout(300)
 check('Classic final ten seconds use existing audio callback',page.evaluate('__qaTicks.some(x=>x>0&&x<=10)'))
 page.evaluate('''()=>{guessrGame.setGuess(guessrGame.answer);guessrGame.submitGuess();guessrGame.submitGuess();}''')
 check('Early answer stops timer and prevents duplicate scoring',page.evaluate('guessrGame.soloTimerInterval===null&&guessrGame.results.length===1'))
 start(page,timer=0)
 check('Off leaves no solo interval',page.evaluate('guessrGame.soloTimerInterval===null'))
 for mode in ['nomove','nmpz']:
  start(page,timer=60,mode=mode)
  check(f'{mode}: Classic clock works',page.locator('#multiTimer').is_visible())
  check(f'{mode}: no panorama movement option',page.evaluate('guessrGame.panorama.opts.clickToGo===false'))
  check(f'{mode}: return command hidden',not page.locator('#returnStartButton').is_visible())
  if mode=='nmpz':check('NMPZ overlay remains locked',page.locator('#panoInteractionLock').is_visible())
 start(page,timer=180,variant='blitz')
 check('Blitz retains independent 20-second setting',page.evaluate('guessrGame.activeSoloTimerSeconds')==20)
 start(page,timer=180,variant='precision')
 check('Precision rules/timer remain unchanged',not page.locator('#multiTimer').is_visible())

 # Independent clock owners must never inherit the solo timer preference.
 page.evaluate('''()=>{guessrGame.stopSoloBlitzTimer(true);guessrGame.setGameVariant('classic');guessrGame.setClassicTimerSeconds(180);guessrGame.challengeConfig={timerSeconds:60};}''')
 check('Challenge clock remains independent',page.evaluate('guessrGame.getSoloTimerSeconds()')==0)
 page.evaluate('''()=>{guessrGame.challengeConfig=null;guessrMultiplayer.active=true;}''')
 check('Multiplayer clock remains independent',page.evaluate('guessrGame.getSoloTimerSeconds()')==0)
 page.evaluate('guessrMultiplayer.active=false')
 # No scoring changes. Computed examples are also used by release notes.
 scores=page.evaluate('''()=>{const a=GUESSR_INTERNALS;return [25,1000,3000,4225].map(d=>({distance:d,classic:a.scoreFor(d,a.ZONES.paris.scale),precision:a.precisionScoreFor(d,a.ZONES.paris.scale)}))}''')
 check('Precision remains linear, Classic exponential',scores[0]['precision']==5000 and scores[-1]['precision']==0 and scores[-1]['classic']>0,scores)

 start(page,timer=60)
 for i in range(5):
  page.evaluate('''()=>{const g=guessrGame;g.setGuess({lat:g.answer.lat+.007*(g.round+1),lng:g.answer.lng+.002});g.submitGuess();}''')
  page.wait_for_timeout(35);page.locator('#nextButton').click();page.wait_for_timeout(510)
 check('Five-round completion shows all details',page.locator('#breakdown .breakRow').count()==5)
 check('Same Google Map instance reused throughout',page.evaluate('__qaMapCount')==1)
 check('Final results equal sum of rounds',page.evaluate('guessrGame.total===guessrGame.results.reduce((s,r)=>s+r.points,0)'))
 for w,h in [(1366,768),(1920,1080),(2560,1600),(3200,2000),(3840,2160),(1024,768),(768,1024),(390,844)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100)
  page.locator('#endScreen').evaluate('e=>e.scrollTo(0,0)')
  shell=page.locator('.v6EndShell').bounding_box();board=page.locator('#finalMapBoard').bounding_box()
  check(f'Recap uses full width at {w}x{h}',shell['width']>=w*.97,shell)
  check(f'Recap no horizontal overflow at {w}x{h}',page.locator('#endScreen').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
  if w>=1180:
   check(f'Recap map dominant at {w}',board['width']>=w*.6,board)
   if h>900:check(f'Recap uses available vertical space at {w}',board['height']>h*.5,board)
  if w==1920:pass
  if w==3200:pass
  if w==390:pass
 page.set_viewport_size({'width':1920,'height':1080});page.wait_for_timeout(100)
 page.locator('#breakdown .breakRow').nth(2).click();page.wait_for_timeout(50)
 check('Click round focuses recap',page.evaluate('lostPinHUD.selectedFinal')==2)
 page.locator('#finalMapAll').click();check('All rounds restores overview',page.evaluate('lostPinHUD.selectedFinal')==-1)
 page.locator('#restartButton').click();page.wait_for_timeout(510)
 check('Replay restores map to gameplay panel',page.evaluate("document.getElementById('guessMap').parentElement.id==='mapPanel'"))
 check('Replay keeps configured Classic timer',page.evaluate('guessrGame.activeSoloTimerSeconds')==60)
 check('No uncaught JavaScript errors',not errors,errors)
 report={'checks':checks,'total':len(checks),'passed':sum(x['passed'] for x in checks),'errors':errors,'precision_examples':scores,'environment':'Chromium; production UI/controllers; Google Maps/Street View and transport not connected'}
 (OUT/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
 browser.close()
 print('SUMMARY',report['passed'],'/',report['total'])
 if report['passed']!=report['total']:raise SystemExit(1)
