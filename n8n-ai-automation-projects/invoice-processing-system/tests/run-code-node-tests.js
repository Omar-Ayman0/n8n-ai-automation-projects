const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const w = JSON.parse(fs.readFileSync(path.join(__dirname,'../workflow.json'),'utf8'));
const node = name => w.nodes.find(n=>n.name===name);
const sample = require('../samples/example-extraction.json');
const run = (name,env) => new Function(...Object.keys(env),node(name).parameters.jsCode)(...Object.values(env));
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
const text='Supplier Demo Supplies Inc. Invoice DEMO-001 2017-11-01 USD Item A 20 10.00 200.00 Item B 10 30.00 300.00 Subtotal 500.00 Tax 38.00 Total 538.00';
const meta={request_id:'test',filename:'demo.png',extraction_method:'ocr',ocr_failed:false,raw_text:text,text_length:text.length};
const validate=(ai,sd={},m=meta)=>run('Validate & score',{$json:{output:ai},$:()=>({first:()=>({json:m})}),$getWorkflowStaticData:()=>sd}).json;
const build=(base,data)=>run('Build ledger row',{$:()=>({first:()=>({json:base})}),$input:{first:()=>({json:data})}}).json;
const router=node('Route ledger status');
function route(status){const rules=router.parameters.rules.values; for(const r of rules){const c=r.conditions;const checks=c.conditions.map(x=>x.rightValue===status);if(c.combinator==='or'?checks.some(Boolean):checks.every(Boolean))return r.outputKey;}return router.parameters.options.renameFallbackOutput;}
test('old invoice flagged',()=>assert.match(validate(sample).flags,/stale_date/));
test('incorrect total flagged despite high confidence',()=>assert.match(validate({...sample,total:580}).flags,/total_mismatch/));
test('clean current invoice auto approved',()=>{const date=new Date().toISOString().slice(0,10);assert.equal(validate({...sample,invoice_date:date}).status,'auto_approved');});
test('duplicate hint',()=>{const sd={};validate(sample,sd);assert.match(validate(sample,sd).flags,/possible_duplicate/);});
test('normalization converts Arabic digits',()=>{const r=run('Normalize & clean text',{$json:{text:'١٬٢٥٠٫٥٠'},$:()=>({first:()=>({binary:{file:{fileName:'demo.pdf'}}})}),$execution:{id:'test'}}).json;assert.equal(r.raw_text,'1,250.50');});
test('human approve',()=>assert.equal(build(validate(sample),{data:{Decision:'Approve'}}).status,'approved_by_human'));
test('human reject and comment',()=>{const r=build(validate(sample),{data:{Decision:'Reject','Reviewer comment':'Check date'}});assert.equal(r.status,'rejected_by_human');assert.equal(r.reviewer_comment,'Check date');});
test('both approved states route to Approved',()=>{assert.equal(route('auto_approved'),'Approved');assert.equal(route('approved_by_human'),'Approved');});
test('rejected and unknown separated',()=>{assert.equal(route('rejected_by_human'),'Rejected');assert.equal(route('pending_review'),'Pending or unknown');});
test('routing connections and ledger fields',()=>{assert.deepEqual(w.connections['Route ledger status'].main.map(a=>a[0].node),['Approved Ledgers','Rejected Ledgers','Pending or unknown status']);assert.equal(Object.keys(node('All Ledgers').parameters.columns.value).length,20);const names=new Set(w.nodes.map(n=>n.name));for(const [src,edges] of Object.entries(w.connections)){assert(names.has(src));for(const groups of Object.values(edges))for(const group of groups)for(const edge of group)assert(names.has(edge.node));}});
console.log(`${count} offline checks passed`);
