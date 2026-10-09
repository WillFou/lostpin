"""Source and baseline checks only. Does not pretend to compile C# or serve HTTP."""
from pathlib import Path
import hashlib, json, re, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[2]
checks=[]
def check(name,ok):
 checks.append({"name":name,"passed":bool(ok)})
 print(("PASS " if ok else "FAIL ")+name)
manifest=json.loads((ROOT/'docs/v7/baseline-v6.2.3.sha256.json').read_text())
allowed={'index.html','src/js/core/app.js','.githooks/pre-commit','.githooks/pre-push','.gitignore','sync-to-repo.bat','scripts/dev/sync-to-repo.ps1','scripts/dev/Test-Release.ps1'}
missing=[r for r in manifest if not (ROOT/r).is_file()]
changed=[r for r,h in manifest.items() if (ROOT/r).is_file() and hashlib.sha256((ROOT/r).read_bytes()).hexdigest()!=h]
check('All V6.2.3 baseline files retained',not missing)
check('Only declared baseline files changed',set(changed)<=allowed)
check('All CSS unchanged',all(hashlib.sha256((ROOT/r).read_bytes()).hexdigest()==h for r,h in manifest.items() if r.startswith('src/css/')))
check('All gameplay and feature JS unchanged except configuration messages',all(hashlib.sha256((ROOT/r).read_bytes()).hexdigest()==h for r,h in manifest.items() if r.startswith('src/js/') and r!='src/js/core/app.js'))
check('Portable baseline version retained',json.loads((ROOT/'version.json').read_text())['version']=='6.2.3')
check('No accelerated navigation controller added',set(p.relative_to(ROOT).as_posix() for p in (ROOT/'src/js').rglob('*.js'))==set(r for r in manifest if r.startswith('src/js/') and r.endswith('.js')))
csproj=ET.parse(ROOT/'server/LostPin.Web/LostPin.Web.csproj').getroot()
check('Server targets net10.0',csproj.findtext('./PropertyGroup/TargetFramework')=='net10.0')
check('Server alpha version is explicit',csproj.findtext('./PropertyGroup/Version')=='7.0.0-alpha.1')
check('No external server PackageReference',not csproj.findall('.//PackageReference'))
items=[e.attrib['Include'] for e in csproj.findall('.//Content')]
check('No full repository wildcard in public assets',not any(i in ('../../**/*','../../**') for i in items))
check('No config.js or version.json physical copy',not any('config/config' in i or 'version.json' in i for i in items))
check('No private directories in public assets',not any(any(t in i for t in ('../../scripts','../../docs','../../dev','../../server','../../tests')) for i in items))
config=json.loads((ROOT/'server/LostPin.Web/appsettings.json').read_text())
check('No browser key in appsettings',config['GoogleMaps']['BrowserApiKey']=='')
check('Host filter local by default',set(config['AllowedHosts'].split(';'))=={'localhost','127.0.0.1','[::1]'})
check('SDK restricted to stable .NET 10',json.loads((ROOT/'global.json').read_text())['sdk']=={'version':'10.0.100','rollForward':'latestFeature','allowPrerelease':False})
for hook in ('pre-commit','pre-push'):
 raw=(ROOT/'.githooks'/hook).read_bytes()
 check(hook+' LF and process execution policy',b'\r' not in raw and b'exec pwsh -NoProfile -ExecutionPolicy Bypass -File' in raw)
check('Corrected source path in BAT','-Source "%CD%"' in (ROOT/'sync-to-repo.bat').read_text())
check('No executable JS import in launch script','Invoke-Expression' not in (ROOT/'scripts/runtime/start-v7.ps1').read_text())
report={'total':len(checks),'passed':sum(x['passed'] for x in checks),'checks':checks,'changed_baseline_files':changed,'missing_baseline_files':missing,'limits':'Source checks only. C# build, PowerShell execution and HTTP runtime tests not run here.'}
out=ROOT/'dev/qa/artifacts/v7';out.mkdir(parents=True,exist_ok=True)
(out/'static-report.json').write_text(json.dumps(report,indent=2))
print('SUMMARY',report['passed'],'/',report['total'])
raise SystemExit(0 if report['passed']==report['total'] else 1)
