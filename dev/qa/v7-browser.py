"""Frontend configuration-message checks with Google stubbed, not an ASP.NET integration test."""
import json, os, shutil
from playwright.sync_api import sync_playwright
from offline_browser import load_page, ROOT
checks=[]
def check(name,ok):
 checks.append({'name':name,'passed':bool(ok)});print(('PASS ' if ok else 'FAIL ')+name)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('LOSTPIN_CHROMIUM') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1366,'height':768});context.route('**/*',lambda r:r.abort())
 page=context.new_page();load_page(page)
 for available,message in [(False,'Google Maps non configure par administrateur.'),(False,'Maintenance du service.')]:
  page.evaluate("async message => { window.PG_CONFIG={hosting:'aspnet-core',googleMapsApiKey:'',serviceAvailable:false,serviceMessage:message}; await guessrGame.loadGoogle(); }",message)
  check('Hosted error message: '+message,page.locator('#helpError').inner_text()==message)
  check('Hosted mode does not ask player for a key','start.bat' not in page.locator('#helpError').inner_text())
  check('No game start without configured Google',page.locator('#startButton').is_disabled() and not page.evaluate('guessrGame.apiReady'))
 page.evaluate("async () => { window.PG_CONFIG={}; await guessrGame.loadGoogle(); }")
 check('Portable error remains unchanged','start.bat' in page.locator('#helpError').inner_text())
 check('Help distinguishes Online and portable','LostPin Online (V7)' in page.locator('#helpModal').inner_text())
 browser.close()
report={'total':len(checks),'passed':sum(x['passed'] for x in checks),'checks':checks,'limits':'Browser and Google stub only; no .NET process.'}
out=ROOT/'dev/qa/artifacts/v7';out.mkdir(parents=True,exist_ok=True);(out/'browser-report.json').write_text(json.dumps(report,indent=2))
print('SUMMARY',report['passed'],'/',report['total'])
raise SystemExit(0 if report['passed']==report['total'] else 1)
