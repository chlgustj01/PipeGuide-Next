import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
async function walk(dir){return (await Promise.all((await readdir(dir,{withFileTypes:true})).filter(e=>e.name!=='.git').map(e=>e.isDirectory()?walk(path.join(dir,e.name)):path.join(dir,e.name)))).flat();}
const files=await walk(root),js=files.filter(f=>/\.(js|mjs)$/.test(f));
for(const file of js){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);}
const html=await readFile(path.join(root,'index.html'),'utf8');
if(/<script[^>]*>\s*[^<\s]/i.test(html)||/<style\b/i.test(html))throw Error('HTML에 인라인 코드가 있습니다');
if(/https?:\/\//.test(html))throw Error('외부 HTML 리소스가 있습니다');
const functional=files.filter(f=>f.startsWith(path.join(root,'src')));
for(const file of functional){const text=await readFile(file,'utf8');if(/\bSHIP\s*[.\[=]|\b(?:PidNet|GA_BUNDLE|View3D|W3)\b/.test(text))throw Error(`레거시 참조: ${file}`);}
console.log(`PASS: ${js.length} JavaScript files; split HTML/CSS/JS; no external HTML resources or legacy globals.`);
