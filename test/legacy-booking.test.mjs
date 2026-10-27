import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const root=resolve(new URL('../',import.meta.url).pathname);
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);out.push(...e.isDirectory()?await walk(p):[p]);}return out;}
test('legacy pages retain working assets, isolated navigation and noindex',async()=>{
 for(const suffix of ['', 'status/','recover/','claims/','privacy/','terms/']){
  const html=await readFile(resolve(root,'legacy/pickup-delivery',suffix,'index.html'),'utf8');
  assert.match(html,/name="robots" content="noindex,\s*nofollow(?:,noarchive)?"/);
  assert.doesNotMatch(html,/http-equiv="refresh"|src="\/assets\/js\/|href="\/pickup-delivery\//);
  assert.doesNotMatch(html,/pud-site-analytics\.js/);
  for(const m of html.matchAll(/(?:src|href)="(\/[^"?#]+)(?:[?#][^"]*)?"/g)){
   if(m[1]==='/')continue;
   const p=resolve(root,'.'+m[1]); await access(m[1].endsWith('/')?resolve(p,'index.html'):p);
  }
 }
});
test('legacy module imports resolve and production API stays separate from navigation',async()=>{
 for(const path of (await walk(resolve(root,'legacy/assets/js'))).filter(p=>p.endsWith('.js'))){
  const s=await readFile(path,'utf8');
  for(const m of s.matchAll(/from\s+["'](\.\.?\/[^"']+)["']/g))await access(resolve(dirname(path),m[1]));
 }
 const config=await readFile(resolve(root,'legacy/assets/js/pud-config.js'),'utf8');
 assert.match(config,/https:\/\/api\.snappycoinlaundry\.com/);
 for(const key of ['bookingPath','statusPath','recoveryPath','claimPath'])assert.match(config,new RegExp(key+': "/legacy/pickup-delivery/'));
 const api=await readFile(resolve(root,'legacy/assets/js/pud-api.js'),'utf8');
 assert.match(api,/\/api\/pud\/public-config/);
 assert.doesNotMatch(api,/\/api\/legacy/);
});
