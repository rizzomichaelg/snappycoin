import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/js/legacy-route-redirect.js',import.meta.url),'utf8');
test('old private email links preserve capability and tip focus only on legacy',()=>{
 for(const leaf of ['status/','recover/','claims/']){
 let actual;vm.runInNewContext(source,{URL,URLSearchParams,location:{origin:'https://snappycoinlaundry.com',pathname:'/pickup-delivery/'+leaf,hash:'#synthetic-private',search:'?focus=tip&email=remove-me',replace:x=>actual=x}});
 assert.equal(actual,'https://snappycoinlaundry.com/legacy/pickup-delivery/'+leaf+'?focus=tip#synthetic-private');
 }
});
test('normal old booking entry still moves to new system, old handoff fragments stay legacy',()=>{
 for(const hash of ['','#waitlistContinuation=synthetic']){let actual;vm.runInNewContext(source,{URL,URLSearchParams,location:{origin:'https://snappycoinlaundry.com',pathname:'/pickup-delivery/',hash,search:'',replace:x=>actual=x}});assert.equal(actual,hash?'https://snappycoinlaundry.com/legacy/pickup-delivery/'+hash:'https://book.snappycoinlaundry.com/');}
});
