import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=resolve(new URL('../',import.meta.url).pathname);
const output=resolve(process.env.CUTOVER_AUDIT_OUTPUT || '/tmp/snappy-cutover-audit');
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
 try{
  let path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(path!==root&&!path.startsWith(root+'/'))throw Error('Invalid path');
  if(path.endsWith('/')||!extname(path))path+='/index.html';
  const content=await readFile(path);
  const type={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png'}[extname(path)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type});res.end(content);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const report={origin,realGoogleLibrary:true,measurementRequestsIntercepted:true,customerMutationsBlocked:true,pages:[],redirects:[],errors:[],passed:false};
const browser=await chromium.launch({headless:true});
async function allHtml(dir=root){const result=[];for(const e of await readdir(dir,{withFileTypes:true})){if(e.name.startsWith('.'))continue;const p=resolve(dir,e.name);if(e.isDirectory())result.push(...await allHtml(p));else if(p.endsWith('.html'))result.push(p);}return result;}
const all=await allHtml();
const redirects=[];
for(const path of all){const html=await readFile(path,'utf8');if(html.includes('http-equiv="refresh"'))redirects.push('/'+path.slice(root.length+1).replace(/index.html$/,''));}
let context;
try{
for(const [path,choice] of [['/','declined'],['/privacy.html','accepted'],['/cookies.html',''],['/terms.html','declined']]){
 context=await browser.newContext({viewport:{width:1512,height:777}});
 await context.addInitScript(choice=>{
  if(choice){localStorage.setItem('snappyCookieConsent:v1',choice);sessionStorage.setItem('snappyCookieConsent:v1',choice);}
  window.__storageAccess=[];window.__cookieAccess=[];
  for(const name of ['getItem','setItem','removeItem']){
   const original=Storage.prototype[name];Storage.prototype[name]=function(key,...args){window.__storageAccess.push({name,key});return original.call(this,key,...args);};
  }
  const cookie=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');
  Object.defineProperty(document,'cookie',{get(){window.__cookieAccess.push({operation:'read',stack:new Error().stack});return cookie.get.call(document);},set(value){window.__cookieAccess.push({operation:'write',value,stack:new Error().stack});cookie.set.call(document,value);}});
 },choice);
 const loaders=[],views=[],requests=[],errors=[];
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());requests.push(url.href);
  if(url.origin===origin)return route.continue();
  if(/\/g\/collect|\/collect/.test(url.pathname)){
   const bodies=(req.postData()||'').split('\n');
   for(const body of bodies){const params=new URLSearchParams(url.search);for(const [k,v]of new URLSearchParams(body))params.set(k,v);if(params.get('tid')==='G-7RE3YVW1DR'&&params.get('en')==='page_view')views.push({url:url.origin+url.pathname,params:Object.fromEntries(params)});}
   return route.fulfill({status:204,body:''});
  }
  if(url.hostname==='www.googletagmanager.com'&&url.pathname==='/gtag/js')loaders.push(url.href);
  if(url.hostname==='www.googletagmanager.com'&&req.resourceType()==='script')return route.continue();
  if(['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))return route.continue();
  if(url.pathname.endsWith('/public'))return route.fulfill({json:{active:true,offerLabel:'Fixture-only active offer',turnstileSiteKey:'fixture'}});
  if(url.hostname==='dexterlive-status.snappycoinlaundry.workers.dev')return route.fulfill({json:{fetchedAtMs:Date.now(),stale:false,washers:{available:17,total:22,inUse:5},dryers:{available:25,total:28,inUse:3}}});
  if(url.hostname==='challenges.cloudflare.com')return route.fulfill({contentType:'application/javascript',body:'window.turnstile={render:()=>"test",getResponse:()=>"",reset:()=>{}}'});
  if(req.resourceType()==='script')return route.fulfill({contentType:'application/javascript',body:''});
  return route.fulfill({status:200,contentType:'text/html',body:''});
 });
 await page.goto(origin+path,{waitUntil:'load'});
 for(let tries=0;tries<30&&views.length===0;tries++)await page.waitForTimeout(500);
 await page.waitForTimeout(2000);
 // The Google library can fetch its own Ads destination loader. The site authors only the GA loader.
 assert.deepEqual(loaders.filter(u=>new URL(u).searchParams.get('id')==='G-7RE3YVW1DR'),['https://www.googletagmanager.com/gtag/js?id=G-7RE3YVW1DR']);
 assert.equal(views.length,1,`${path} must issue exactly one real-library GA4 page view`);
 assert.doesNotMatch(requests.join('\n'),/firebase|firebaseio|G-W0E4/i);
 const runtime=await page.evaluate(()=>({
  commands:window.dataLayer.filter(c=>c&&typeof c[0]==='string').map(c=>Array.from(c)),
  meta:window.fbq?.queue?.map(c=>Array.from(c))||[],
  consentAccess:window.__storageAccess.filter(c=>/consent/i.test(c.key)),
  applicationCookieAccess:window.__cookieAccess.filter(c=>c.stack.includes('/assets/js/')),
  consentWrites:window.__cookieAccess.filter(c=>c.operation==='write'&&/consent/i.test(c.value)),
  banners:document.querySelectorAll('.cookie-consent-banner,[data-cookie-consent]').length,
  overflow:document.documentElement.scrollWidth>innerWidth
 }));
 assert.equal(runtime.banners,0);assert.deepEqual(runtime.consentAccess,[]);assert.deepEqual(runtime.consentWrites,[]);
 assert.deepEqual(runtime.applicationCookieAccess,[]);
 assert.equal(runtime.overflow,false);
 assert.equal(runtime.commands.filter(c=>c[0]==='js').length,1);
 assert.equal(runtime.commands.filter(c=>c[0]==='consent').length,0);
 assert.equal(runtime.commands.filter(c=>c[0]==='event'&&c[1]==='page_view').length,0);
 for(const id of ['G-7RE3YVW1DR','AW-18256973572']){
  const configs=runtime.commands.filter(c=>c[0]==='config'&&c[1]===id);assert.equal(configs.length,1);
  assert.equal(configs[0][2].allow_ad_personalization_signals,false);
  assert.ok(!('send_page_view' in configs[0][2]));
  if(id.startsWith('G-'))assert.equal(configs[0][2].allow_google_signals,false);
 }
 assert.equal(runtime.meta.filter(c=>c[0]==='track'&&c[1]==='PageView').length,1);
 if(path==='/'){
  assert.ok(await page.locator('#free-weekday-wash').isHidden());
  assert.ok(await page.locator('#promo-nav-item').isHidden());
  assert.ok(await page.locator('#newsletter-signup-form').isVisible());
  const bookingLinks=await page.locator('a[href="https://book.snappycoinlaundry.com"]').count();assert.ok(bookingLinks>=9);
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1600);
  await page.screenshot({path:output+'/home-laptop.png'});
  // Mobile navigation uses the same root and never exposes the retired offer.
  await page.setViewportSize({width:390,height:844});
  await page.locator('.hamburger').click();
  assert.ok(await page.locator('.nav-booking').isVisible());
  assert.ok(await page.locator('#promo-nav-item').isHidden());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:output+'/home-mobile.png'});
  await page.locator('.hamburger').click();
  await page.locator('.hero-ctas a[href="https://book.snappycoinlaundry.com"]').click();
  await page.waitForURL('https://book.snappycoinlaundry.com/');
 }
 assert.deepEqual(errors,[]);
 report.pages.push({path,priorChoice:choice||'fresh',loaders,views:views.length,pageView:views[0],runtime,errors});
 await context.close();context=null;
}
// The ad alias is transient: only its final marketing landing page is measured.
context=await browser.newContext();
await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.fulfill({status:200,contentType:r.request().resourceType()==='script'?'application/javascript':'text/html',body:''}));
const aliasPage=await context.newPage();await aliasPage.goto(origin+'/promos/free-weekday-wash/?utm_source=test');await aliasPage.waitForURL(origin+'/?utm_source=test#hero');
report.adAlias={destination:aliasPage.url()};await context.close();context=null;
// Static redirects work with scripts disabled, drop old query/fragment capabilities,
// and never load the old wizard or its API. Test every route with and without index.html.
for(const path of redirects){
 for(const suffix of ['', 'index.html']){
  context=await browser.newContext({javaScriptEnabled:false});
  const outbound=[];await context.route('https://book.snappycoinlaundry.com/**',r=>{outbound.push(r.request().url());return r.fulfill({status:200,contentType:'text/html',body:'<h1>Booking destination intercepted</h1>'});});
  const page=await context.newPage();
  await page.goto(origin+path+suffix+'?token=DO_NOT_FORWARD#OLD-CAPABILITY');await page.waitForURL('https://book.snappycoinlaundry.com/');
  assert.deepEqual(outbound,['https://book.snappycoinlaundry.com/']);
  report.redirects.push({path:path+suffix,destination:page.url(),javascript:false});
  await context.close();context=null;
 }
}
report.passed=true;
}finally{
 if(context)await context.close();await browser.close();await new Promise(r=>server.close(r));
 await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');
}
console.log(`Passed: ${report.pages.length} marketing pages with exactly one real-library GA4 page view each, ${report.redirects.length} script-free redirects, phone layout and booking links. Evidence: ${output}`);
