import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import w from './dist/server/index.js';
class Element {
  children=[]; dataset={};value='';textContent='';
  constructor(tag){this.tag=tag}
  createTHead(){return new Element('thead')}
  createTBody(){return new Element('tbody')}
  insertRow(){return new Element('tr')}
  append(...nodes){this.children.push(...nodes)}
  replaceChildren(...nodes){this.children=nodes}
  querySelectorAll(tag){if(tag==='input:checked')return this.querySelectorAll('input').filter(input=>input.checked);return this.children.flatMap(n=>(n.tag===tag?[n]:n.querySelectorAll(tag)))}
  add(n){this.append(n)} setAttribute(){} focus(){} scrollIntoView(){} reset(){elements.mode.value='all'}
}
const html=fs.readFileSync('src/index.html','utf8');
const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
elements.mode.value='all';
const ctx=vm.createContext({tr:text=>text,document:{getElementById:id=>elements[id],createElement:t=>new Element(t)}, Option:Element,window:{confirm:()=>true}});
vm.runInContext(fs.readFileSync('src/app.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
elements.example.onclick();
assert.equal(run('expenses.length'),3);assert.equal(run('validAccount({format:"a-medias-1",people,expenses})'),true);
assert.equal(run('personTotals()[0].consumed'),2400);assert.match(run('summaryText()'),/76,40/);
run('editExpense(expenses[0])');assert.equal(elements.mode.value,'exact');
elements.expense.onsubmit({preventDefault(){}});assert.equal(run('expenses.length'),3);
elements.mode.value='units';elements.mode.onchange();elements.concept.value='Raciones';elements.amount.value='10,01';elements.payer.value='Marta';
const inputs=elements.portions.querySelectorAll('input');inputs[0].value='2';inputs[1].value='1';
elements.expense.onsubmit({preventDefault(){}});assert.equal(run('expenses[3].shares[0].cents'),667);assert.equal(run('expenses[3].shares[1].cents'),334);
const backup=run('JSON.stringify({format:"a-medias-1",people,expenses})');
elements.restart.onclick();elements.file.files=[{size:backup.length,text:async()=>backup}];await elements.file.onchange();assert.equal(run('expenses.length'),4);
elements.file.files=[{size:10,text:async()=>'{}'}];await elements.file.onchange();assert.equal(run('expenses.length'),4);
const http=await w.fetch(new Request('http://example.com/'));assert.equal(http.status,308);
const page=await w.fetch(new Request('https://example.com/'));assert.ok(page.headers.get('Strict-Transport-Security'));assert.equal((await page.text()).includes('<aside class="sponsor"'), Boolean(JSON.parse(fs.readFileSync('sponsor.json','utf8'))));
console.log('Cena, edición, raciones, saldos, importación válida e inválida, HTTPS y ausencia de anuncios activos verificados.');
assert.deepEqual(JSON.parse(run('JSON.stringify(parseReceipt("Vino 21,00\\n2 menús 100,00\\nTOTAL 121,00"))')), {rows:[['Vino','21,00'],['2 menús','100,00']],total:'121,00'});
elements.restart.onclick();
run("people.push('Yo','Javi','Ana','Luz','Eva','Mar','Leo');render()");
elements['receipt-text'].value = 'Vino 21,00\n2 menús 100,00\nPostre 8,00\nTOTAL 129,00';
elements['parse-ticket'].onclick();
run("ticketRows.forEach((row,i)=>{const inputs=row.members.querySelectorAll('input');const checked=inputs.filter((x,j)=>i===0 || (i===1? j<2 : j===0 || j===2));row.members.querySelectorAll=()=>checked;});");
elements['ticket-payer'].value='Javi';
elements['ticket-total'].value='120,00';
elements['save-ticket'].onclick();
assert.equal(run('expenses.length'),0);
elements['ticket-total'].value='129,00';
elements['save-ticket'].onclick();
assert.equal(run('expenses.length'),3);
assert.equal(run('personTotals()[0].consumed'),5700);
assert.equal(run('personTotals()[1].consumed'),5300);
assert.equal(run('personTotals()[2].consumed'),700);

elements['receipt-text'].value = Array.from({length:10}, (_,i)=>'Línea '+(i+1)+' 1,00').join('\n');
elements['parse-ticket'].onclick();
function assign(numbers, names, button) {
  elements['batch-numbers'].value = numbers;
  elements['batch-people'].querySelectorAll('input').forEach(input => { input.checked = names.includes(input.value); });
  elements[button].onclick();
}
assign('1, 2 y 3',['Yo','Javi'],'batch-apply');
assign('4-5',['Ana','Luz'],'batch-apply');
assign('',['Mar'],'batch-rest');
assign('1,99',['Leo'],'batch-apply');
run("ticketRows[0].name.value=''");
elements['ticket-total'].value='10'; elements['ticket-payer'].value='Javi';
elements['save-ticket'].onclick();
assert.equal(run('expenses.length'),13);
assert.equal(run('expenses[3].concept'),'Producto 1');
assert.equal(run('expenses[3].shares[0].cents'),50);
assert.equal(run('expenses[6].shares[0].name'),'Ana');
assert.equal(run('expenses[12].shares[0].name'),'Mar');
