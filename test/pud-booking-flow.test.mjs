import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../assets/js/pud-booking.js', import.meta.url), 'utf8');
function fn(name) {
  const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, 'm'));
  const tail = source.slice(start);
  const next = tail.slice(1).search(/^(?:async )?function /m);
  return next < 0 ? tail : tail.slice(0, next + 1);
}
function detailsContext(phone, proofExpiry) {
  const fields = new Map(Object.entries({routeId:'pickup',deliveryRouteId:'delivery',firstName:'Alex',lastName:'Test',email:'alex@example.test',phone,estimatedBags:'2',terms:'yes'}));
  const calls = {sms:0,review:0};
  const state = {routes:[{id:'pickup'}],deliveryRoutes:[{id:'delivery'}],config:{},phoneProof:'proof',verifiedPhone:'+13145550123',phoneProofExpiresAt:proofExpiry};
  const context = {state, Date, FormData:class {get(key){return fields.get(key);}}, eligibleDeliveryRoutes:(routes)=>routes, normalizeUsPhone:v=>v, $:()=>({}),trackFunnel:()=>{},go:()=>{}, beginPhoneVerification:async()=>{calls.sms++;return {verificationId:'new'};},openReview:async()=>{calls.review++;}};
  runInNewContext(fn('canReusePhoneVerification') + fn('submitDetails') + '\nglobalThis.submit = submitDetails;',context);
  return {context,calls,state};
}
test('editing a booking reuses only an unexpired proof for the unchanged phone', async()=>{
  const same = detailsContext('+13145550123',new Date(Date.now()+300000).toISOString());
  await same.context.submit({});
  assert.deepEqual(same.calls,{sms:0,review:1});
  for (const [phone, expiry] of [['+13145550124',Date.now()+300000],['+13145550123',Date.now()-1]]) {
    const changed = detailsContext(phone,new Date(expiry).toISOString());
    await changed.context.submit({});
    assert.deepEqual(changed.calls,{sms:1,review:0});
    assert.equal(changed.state.phoneProof,'');
  }
});
test('step navigation hides panels without hiding Back and Edit controls',()=>{
  const panels = ['address','details','phone','review'].map(step=>({dataset:{step},hidden:false}));
  const edit = {dataset:{step:'details'},hidden:false};
  const root = {dataset:{},querySelector:()=>null,querySelectorAll:selector=>selector==='section[data-step]'?panels:selector==='[data-step]'?[...panels,edit]:[]};
  const context = {root,state:{},$:()=>({}),translateText:x=>x,canReusePhoneVerification:()=>false,activeBookingSteps:()=>['address','details','phone','review'],ensureTurnstile:()=>{}};
  runInNewContext(fn('showStep')+'\nshowStep("review");',context);
  assert.equal(panels[3].hidden,false);
  assert.equal(panels[1].hidden,true);
  assert.equal(edit.hidden,false);
});
test('card loading failure preserves details and supports a successful retry',async()=>{
  const nodes = new Map();
  const $ = key=>{if(!nodes.has(key))nodes.set(key,{hidden:false,disabled:false,replaceChildren(){}});return nodes.get(key);};
  const state={paymentReady:false,paymentLoading:false,customer:{email:'alex@example.test'},config:{}};
  let attempts=0;
  const context={state,$,translateText:x=>x,prepareSquareCard:async()=>{if(++attempts===1)throw new Error('offline');}};
  runInNewContext(fn('loadBookingPayment')+'\nglobalThis.load=loadBookingPayment;',context);
  await context.load();
  assert.equal(state.paymentReady,false);
  assert.equal($('[data-action="retry-payment"]').hidden,false);
  assert.equal($('#pud-review-form button[type="submit"]').disabled,true);
  await context.load();
  assert.equal(state.paymentReady,true);
  assert.equal($('#pud-review-form button[type="submit"]').disabled,false);
  assert.equal(state.customer.email,'alex@example.test');
});
test('a failed payment SDK load can be retried without a hanging script', async()=>{
  const payment = readFileSync(new URL('../assets/js/pud-payment.js',import.meta.url),'utf8');
  const loader = payment.slice(payment.indexOf('const scriptLoads'),payment.indexOf('function squareScript'));
  let script;
  let ready=false;
  let appends=0;
  const document={querySelector:()=>script,createElement:()=>{
    const listeners=new Map();
    return {addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name)=>listeners.delete(name),remove:()=>{script=undefined;},fire:name=>listeners.get(name)?.()};
  },head:{append:node=>{script=node;appends++;}}};
  const context={document,setTimeout,clearTimeout};
  runInNewContext(loader+'\nglobalThis.load=loadScript;',context);
  const first=context.load('https://example.test/sdk.js',()=>ready);
  const rejected=assert.rejects(first,/could not load/);
  script.fire('error');
  await rejected;
  const retry=context.load('https://example.test/sdk.js',()=>ready);
  ready=true;
  script.fire('load');
  await retry;
  assert.equal(appends,2);
});
