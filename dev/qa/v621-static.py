"""Static resource checks + real Git ignore/index regression (no remote operations)."""
from pathlib import Path
from collections import Counter
from urllib.parse import unquote
import json, re, subprocess, tempfile, os
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[2]
checks=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'passed':bool(ok),'detail':detail})
 print(('PASS ' if ok else 'FAIL ')+name)
 return bool(ok)
def run(args,cwd=ROOT):
 return subprocess.run(args,cwd=cwd,capture_output=True,text=True,encoding='utf-8',errors='replace',env={**os.environ,'GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':os.devnull})
html=(ROOT/'index.html').read_text(encoding='utf-8')
soup=BeautifulSoup(html,'html.parser')
ids=Counter(t['id'] for t in soup.find_all(id=True))
check('HTML identifiers unique',all(n==1 for n in ids.values()),[k for k,n in ids.items() if n>1])
active=list((ROOT/'src/js').rglob('*.js'))
refs=set()
for path in active:
 text=path.read_text(encoding='utf-8')
 refs.update(re.findall(r"(?:getElementById\s*\(|\$\(\s*)['\"]([^'\"]+)['\"]",text))
missing=sorted(x for x in refs if x not in ids)
check('Static DOM identifiers exist',not missing,missing)
for p in active+list((ROOT/'dev/qa').glob('*.js')):
 result=run(['node','--check',str(p)])
 check('JS syntax '+p.relative_to(ROOT).as_posix(),result.returncode==0,result.stderr if result.returncode else None)
resources=[]; absent=[]
for tag in soup.select('[src],link[href]'):
 val=tag.get('src') or tag.get('href')
 if not val or val.startswith(('http:','https:','data:','//','#')):continue
 val=unquote(val.split('?')[0].split('#')[0]);resources.append(val)
 if val!='config/config.js' and not (ROOT/val).is_file():absent.append(val)
check('HTML resources exist (config generated locally)',not absent,absent)
css_urls=[]
for p in (ROOT/'src/css').glob('*.css'):
 for val in re.findall(r'url\(\s*[\'"]?([^\)\'\"]+)',p.read_text()):
  if val.startswith(('http:','https:','data:','//','#')):continue
  f=p.parent/unquote(val.split('?')[0].split('#')[0]);css_urls.append(str(f))
  if not f.is_file():absent.append(str(f))
check('CSS asset references resolve',not absent,absent)
for rel in ['scripts/runtime/server.ps1','scripts/dev/build-updater.bat','scripts/dev/setup-updater.bat','scripts/dev/publish-release.bat','scripts/dev/publish-release.ps1','scripts/dev/Test-Release.ps1','scripts/dev/Test-Package.ps1','.githooks/pre-commit']:
 check('Tool present '+rel,(ROOT/rel).is_file())
check('Only config example supplied',not (ROOT/'config/config.js').exists() and (ROOT/'config/config.example.js').is_file())
with tempfile.TemporaryDirectory(prefix='lostpin-git-qa-') as name:
 d=Path(name);run(['git','init','-q'],d);(d/'.gitignore').write_text((ROOT/'.gitignore').read_text())
 for rel in ['config.js','config/config.js','config/config.local.js','.env','.env.local','benchmark guessers/recording.txt','config/config.example.js','.env.example','src/kept.js']:
  p=d/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('// dummy QA; no credential\n')
 for rel in ['config.js','config/config.js','config/config.local.js','.env','.env.local','benchmark guessers/recording.txt']:
  check('Git ignores '+rel,run(['git','check-ignore','-q','--',rel],d).returncode==0)
 run(['git','add','.'],d)
 tracked=run(['git','ls-files'],d).stdout.splitlines()
 check('Git keeps example configurations',all(x in tracked for x in ['config/config.example.js','.env.example']))
 check('git add . excludes local configs and benchmark',not any(x in tracked for x in ['config.js','config/config.js','.env','benchmark guessers/recording.txt']),tracked)
 # Demonstrate that ignore rules cannot untrack an indexed file.
 run(['git','add','-f','--','config/config.js'],d)
 check('Existing tracked config stays tracked despite ignore',run(['git','ls-files','--','config/config.js'],d).stdout.strip()=='config/config.js')
 removed=run(['git','rm','--cached','--ignore-unmatch','--','config.js','config/config.js'],d)
 check('git rm --cached removes tracking, keeps local file',removed.returncode==0 and (d/'config/config.js').is_file() and not run(['git','ls-files','--','config/config.js'],d).stdout.strip())
# Scan source text without displaying matching values. Avoid ignored artifact/build folders.
key_pattern=re.compile('AIza'+r'[0-9A-Za-z_-]{35}')
key_files=[]
for p in ROOT.rglob('*'):
 if not p.is_file() or any(x in p.parts for x in ['dist','artifacts','__pycache__','.git','backups']):continue
 if p.suffix.lower() not in ['.js','.mjs','.cjs','.py','.html','.css','.json','.ps1','.bat','.yml','.yaml','.md','.txt','.cs','.xml','.config']:continue
 if key_pattern.search(p.read_text(encoding='utf-8',errors='replace')):key_files.append(p.relative_to(ROOT).as_posix())
check('No Google API key pattern in source text',not key_files,key_files)
report={'total':len(checks),'passed':sum(c['passed'] for c in checks),'checks':checks,'unique_ids':len(ids),'dom_refs':len(refs),'html_resources':len(resources),'css_resource_refs':len(css_urls),'limits':'PowerShell/.NET unavailable: publication scripts not executed; no remote operations'}
out=ROOT/'dev/qa/artifacts/v621';out.mkdir(parents=True,exist_ok=True);(out/'static-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
print(json.dumps({k:v for k,v in report.items() if k!='checks'},indent=2))
raise SystemExit(0 if report['total']==report['passed'] else 1)
