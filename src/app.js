'use strict';
const el = id => document.getElementById(id);
const people = [];
const expenses = [];
let editing = null;
const euros = cents => (cents/100).toLocaleString(document.documentElement?.lang || 'es',{style:'currency',currency:'EUR'});
function node(tag, value, cls) {
  const n = document.createElement(tag);
  n.textContent = value;
  if(cls) n.className = cls;
  return n;
}
function removeButton(label, action, compact) {
  const b = node('button',compact ? '×' : tr('Eliminar'),'remove');
  b.type='button';
  b.setAttribute('aria-label',label);
  b.onclick=action;
  return b;
}
function equalShares(names, cents) {
  return names.map((name, index) => ({
    name, cents: Math.floor(cents / names.length) + Number(index < cents % names.length)
  }));
}
function splitUnits(rows, cents) {
  const total = rows.reduce((sum, row) => sum + row.units, 0);
  const parts = rows.filter(row => row.units > 0).map(row => {
    const numerator = row.units * cents;
    return {name:row.name, cents:Math.floor(numerator / total), remainder:numerator % total};
  });
  const extra = cents - parts.reduce((sum, row) => sum + row.cents, 0);
  const ranked = [...parts].sort((a,b) => b.remainder - a.remainder);
  for (let i = 0; i < extra; i++) ranked[i].cents++;
  return parts.map(({name,cents}) => ({name,cents}));
}
function readCents(value) {
  const raw = value.trim().replace(',', '.');
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ''] = raw.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
function settle(members, entries) {
  const nets = new Map(members.map(name => [name, 0]));
  for (const entry of entries) {
    nets.set(entry.payer, nets.get(entry.payer) + entry.cents);
    for (const share of entry.shares) nets.set(share.name, nets.get(share.name) - share.cents);
  }
  const debtors=[], creditors=[];
  for (const [name, net] of nets) {
    if (net) (net > 0 ? creditors : debtors).push({name, amount: Math.abs(net)});
  }
  const transfers=[];
  let i=0,j=0;
  while(i<debtors.length && j<creditors.length){
    const d=debtors[i],c=creditors[j],amount=Math.min(d.amount,c.amount);
    transfers.push([d.name,c.name,amount]);
    d.amount-=amount;c.amount-=amount;
    if(!d.amount)i++;
    if(!c.amount)j++;
  }
  return transfers;
}
function portionInputs() {
  return Array.from(el('portions').querySelectorAll('input'));
}
function updateRemainder() {
  el('left').textContent = '';
  if (el('mode').value !== 'exact') return;
  const total = readCents(el('amount').value);
  const amounts = portionInputs().map(input => readCents(input.value || '0'));
  if (amounts.includes(null)) { el('left').textContent = tr('Usa importes con hasta dos decimales.'); return; }
  if (total === null) return;
  const difference = total - amounts.reduce((a,b) => a+b, 0);
  el('left').textContent = difference === 0 ? tr('El reparto coincide con el total.') :
    (difference > 0 ? tr('Pendiente de asignar: ') : tr('Asignado de más: ')) + euros(Math.abs(difference));
}
function renderPortions() {
  const mode = el('mode').value;
  const box = el('portions');
  const previous = new Map(portionInputs().map(input => [input.dataset.person, input]));
  const sameMode = box.dataset.mode === mode;
  box.dataset.mode = mode;
  box.replaceChildren();
  el('split').hidden = mode === 'all';
  el('split-title').textContent = mode === 'some' ? tr('¿Quién lo compartió?') : mode === 'units' ? tr('Unidades consumidas por persona') : tr('Consumo por persona (€)');
  if (mode !== 'all') for (const name of people) {
    const input = document.createElement('input');
    input.dataset.person = name;
    if (mode === 'some') {
      input.type = 'checkbox';
      input.checked = sameMode && Boolean(previous.get(name)?.checked);
    } else {
      input.inputMode = mode === 'units' ? 'numeric' : 'decimal';
      input.maxLength = mode === 'units' ? 4 : 12; input.placeholder = mode === 'units' ? '0' : tr('0,00');
      input.value = sameMode ? previous.get(name)?.value || '' : '';
    }
    const label = node('label',name,'portion');
    label.append(input); box.append(label);
  }
  updateRemainder();
}
el('mode').onchange = renderPortions;
el('amount').oninput = updateRemainder;
el('portions').oninput = updateRemainder;
function render() {
  el('share-fallback').hidden = true;
  el('share-status').textContent = '';
  el('restart').hidden = !people.length;
  const selected=el('payer').value;
  el('people').replaceChildren(); el('payer').replaceChildren();
  if(!people.length)el('payer').add(new Option(tr('Añade participantes'),''));
  people.forEach(name=>{
    el('payer').add(new Option(name,name));
    const item=node('li',name);
    item.append(removeButton(tr('Quitar a ')+name,()=>{
      if(expenses.some(e=>e.payer===name || e.shares.some(share=>share.name===name))){el('message').textContent=tr('Elimina primero los gastos en los que aparece esta persona.');return;}
      people.splice(people.indexOf(name),1);render();el('message').textContent=tr('Participante eliminado.');
    },true));
    el('people').append(item);
  });
  if(people.includes(selected))el('payer').value=selected;
  refreshTicketPeople();
  renderPortions();
  el('total').textContent=euros(expenses.reduce((s,e)=>s+e.cents,0));
  el('stats').textContent=people.length+tr(' participante')+(people.length===1?'':'s')+' · '+expenses.length+tr(' gasto')+(expenses.length===1?'':'s');
  el('expenses').replaceChildren();
  expenses.forEach(e=>{
    const li=node('li',e.concept+' · '+e.payer,'line');
    const edit = node('button',tr('Editar'),'remove');
    edit.setAttribute('aria-label',tr('Editar gasto ')+e.concept);
    edit.onclick = () => editExpense(e);
    li.append(node('strong',euros(e.cents)),edit,removeButton(tr('Eliminar gasto ')+e.concept,()=>{if (editing === e) resetExpense();expenses.splice(expenses.indexOf(e),1);render();el('message').textContent=tr('Gasto eliminado.');}));
    li.append(node('p', tr('Consumo: ') + e.shares.map(s => s.name + ' ' + euros(s.cents)).join(' · '), 'muted'));
    el('expenses').append(li);
  });
  if(!expenses.length)el('expenses').append(node('li',tr('Todavía no hay gastos.'),'muted'));
  el('send-actions').hidden = el('personal').hidden = !expenses.length;
  el('download').disabled = !people.length;
  el('example').hidden = people.length > 0;
  const table = node('table','', 'ledger');
  const header = table.createTHead().insertRow();
  for (const title of [tr('Persona'),tr('Consumió'),tr('Adelantó')]) header.append(node('th',title));
  const body = table.createTBody();
  for (const person of personTotals()) {
    const row = body.insertRow();
    row.append(node('th',person.name),node('td',euros(person.consumed)),node('td',euros(person.paid)));
  }
  el('breakdown').replaceChildren(table);
  const transfers=settle(people,expenses);
  el('balances').replaceChildren(...transfers.map(([from,to,n])=>node('p',from+tr(' paga ')+euros(n)+tr(' a ')+to+'.','line')));
  if(!transfers.length)el('balances').append(node('p',expenses.length?tr('Las cuentas están saldadas.'):tr('Añade participantes y un gasto para ver el reparto.'),'muted'));
}
el('person').onsubmit=event=>{
  event.preventDefault();
  const name=el('name').value.trim();
  if(!name || people.some(p=>p.toLocaleLowerCase('es')===name.toLocaleLowerCase('es'))){el('message').textContent=tr('Introduce un nombre distinto para cada persona.');return;}
  if (people.length >= 100) { el('message').textContent = tr('El máximo por cuenta es de 100 participantes.'); return; }
  people.push(name);el('person').reset();render();el('message').textContent=name+tr(' se ha añadido al grupo.');el('name').focus();
};
el('expense').onsubmit=event=>{
  event.preventDefault();
  const raw=el('amount').value.trim(),concept=el('concept').value.trim(),payer=el('payer').value;
  if(people.length<2){el('message').textContent=tr('Añade al menos dos participantes.');return;}
  const cents = readCents(raw);
  if (!concept || cents === null || cents < 1) {
    el('message').textContent = tr('Introduce un concepto y un importe positivo con hasta dos decimales.'); return;
  }
  const mode = el('mode').value;
  let shares;
  if (mode === 'units') {
    const inputs = portionInputs();
    if (inputs.some(input => !/^\d{0,4}$/.test(input.value)) || !inputs.some(input => Number(input.value) > 0)) {
      el('message').textContent = tr('Introduce unidades enteras de 0 a 9999 y al menos una unidad en total.'); return;
    }
    shares = splitUnits(inputs.map(input => ({name:input.dataset.person,units:Number(input.value)})), cents);
  } else if (mode === 'exact') {
    const amounts = portionInputs().map(input => ({name:input.dataset.person, cents:readCents(input.value || '0')}));
    if (amounts.some(s => s.cents === null) || amounts.reduce((sum,s) => sum+s.cents,0) !== cents) {
      el('message').textContent = tr('Revisa los importes individuales. La suma debe coincidir con el total del gasto.'); return;
    }
    shares = amounts.filter(s => s.cents > 0);
  } else {
    const names = mode === 'some' ? portionInputs().filter(input => input.checked).map(input => input.dataset.person) : people;
    if (!names.length) { el('message').textContent = tr('Marca al menos a una persona que haya participado en el gasto.'); return; }
    shares = equalShares(names,cents);
  }
  const entry = {payer,concept,cents,shares};
  if (editing) expenses[expenses.indexOf(editing)] = entry;
  else {
    if (expenses.length >= 1000) { el('message').textContent = tr('La cuenta admite hasta 1000 gastos.'); return; }
    expenses.push(entry);
  }
  resetExpense();render();el('message').textContent=tr('Gasto guardado. Reparto actualizado.');
};
function resetExpense() {
  editing = null;
  el('expense').reset();
  el('expense-title').textContent = tr('Añadir un gasto');
  el('save-expense').textContent = tr('+ Añadir gasto');
  el('cancel-edit').hidden = true;
}
function editExpense(entry) {
  editing = entry;
  el('expense-title').textContent = tr('Editar gasto');
  el('save-expense').textContent = tr('Guardar cambios');
  el('cancel-edit').hidden = false;
  el('concept').value = entry.concept;
  el('amount').value = (entry.cents / 100).toFixed(2).replace('.',',');
  el('payer').value = entry.payer;
  el('mode').value = 'exact';
  renderPortions();
  for (const input of portionInputs()) {
    const share = entry.shares.find(row => row.name === input.dataset.person);
    input.value = share ? (share.cents / 100).toFixed(2).replace('.',',') : '';
  }
  updateRemainder();
  el('concept').focus();
}
el('cancel-edit').onclick = () => { resetExpense();render(); };
function personTotals() {
  const totals = new Map(people.map(name => [name,{name,consumed:0,paid:0}]));
  for (const expense of expenses) {
    totals.get(expense.payer).paid += expense.cents;
    for (const row of expense.shares) totals.get(row.name).consumed += row.cents;
  }
  return Array.from(totals.values());
}
function summaryText() {
  const lines = [tr('A Medias · Resumen del grupo'), tr('Total: ') + el('total').textContent, '', tr('Consumo y adelantos')];
  for (const row of personTotals()) lines.push(row.name + tr(': consumió ') + euros(row.consumed) + tr(' y adelantó ') + euros(row.paid));
  lines.push('', tr('Para saldar las cuentas'));
  const transfers = settle(people,expenses);
  if (!transfers.length) lines.push(tr('Las cuentas están saldadas.'));
  for (const [from,to,cents] of transfers) lines.push(from + tr(' paga ') + euros(cents) + tr(' a ') + to + '.');
  return lines.join('\n');
}
el('share').onclick = async () => {
  const text = summaryText();
  const status = el('share-status');
  if (navigator.share) {
    try { await navigator.share({text}); return; }
    catch (error) { if (error.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = tr('Resumen copiado. Ya puedes pegarlo en el chat del grupo.');
  } catch {
    const field = el('share-fallback');
    field.hidden = false; field.value = text; field.select();
    status.textContent = tr('Selecciona y copia el resumen para compartirlo.');
  }
};
el('restart').onclick = () => {
  if (!window.confirm(tr('¿Empezar otra cuenta y borrar la actual de esta pestaña? Puedes guardar una copia antes.'))) return;
  clearTicket(); people.length = 0; expenses.length = 0; resetExpense(); render();
  el('file-status').textContent = ''; el('message').textContent = tr('Nueva cuenta lista.'); el('name').focus();
};
el('print').onclick = () => window.print();
el('example').onclick = () => {
  if (people.length) return;
  people.push('Ana','Luis','Marta');
  expenses.push(
    {concept:tr('Entrantes para compartir'),payer:'Ana',cents:1800,shares:equalShares(people,1800)},
    {concept:tr('Platos principales'),payer:'Ana',cents:5300,shares:[{name:'Ana',cents:1800},{name:'Luis',cents:2100},{name:'Marta',cents:1400}]},
    {concept:tr('Tres cafés'),payer:'Luis',cents:540,shares:splitUnits([{name:'Luis',units:2},{name:'Marta',units:1}],540)}
  );
  render();
  el('cuentas').scrollIntoView();
  el('message').textContent = tr('Cena de ejemplo cargada. Puedes editar sus gastos.');
};
function validAccount(data) {
  if (data?.format !== 'a-medias-1' || !Array.isArray(data.people) || !Array.isArray(data.expenses)) return false;
  const {people:names,expenses:entries} = data;
  const shortText = (s,max) => typeof s === 'string' && s.trim() === s && s.length > 0 && s.length <= max && !/[\x00-\x1f]/.test(s);
  if (!names.length || names.length > 100 || entries.length > 1000 || !names.every(s => shortText(s,32))) return false;
  if (new Set(names.map(s => s.toLocaleLowerCase('es'))).size !== names.length) return false;
  return entries.every(e => e && names.includes(e.payer) && shortText(e.concept,70) &&
    Number.isInteger(e.cents) && e.cents > 0 && e.cents <= 9999999999 &&
    Array.isArray(e.shares) && e.shares.length > 0 && e.shares.length <= names.length &&
    e.shares.every(s => s && names.includes(s.name) && Number.isInteger(s.cents) && s.cents >= 0 && s.cents <= e.cents) &&
    new Set(e.shares.map(s => s.name)).size === e.shares.length &&
    e.shares.reduce((sum,s) => sum + s.cents,0) === e.cents);
}
el('download').onclick = () => {
  const data = JSON.stringify({format:'a-medias-1',people,expenses});
  const url = URL.createObjectURL(new Blob([data],{type:'application/json'}));
  const link = document.createElement('a');
  link.href = url; link.download = 'a-medias-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.append(link);link.click();link.remove();
  setTimeout(() => URL.revokeObjectURL(url),30000);
  el('file-status').textContent = tr('Copia preparada. Contiene los nombres y gastos del grupo.');
};
el('open-file').onclick = () => el('file').click();
el('file').onchange = async () => {
  const file = el('file').files[0];
  if (!file) return;
  try {
    if (file.size > 25000000) throw new Error();
    const data = JSON.parse(await file.text());
    if (!validAccount(data)) throw new Error();
    if (people.length && !window.confirm(tr('¿Sustituir la cuenta abierta por la del archivo?'))) return;
    clearTicket(); resetExpense();
    people.splice(0,people.length,...data.people);
    expenses.splice(0,expenses.length,...data.expenses.map(e => ({
      concept:e.concept,payer:e.payer,cents:e.cents,shares:e.shares.map(({name,cents}) => ({name,cents}))
    })));
    render();
    el('file-status').textContent = tr('Cuenta recuperada.');
  } catch {
    el('file-status').textContent = tr('No se ha podido abrir esta copia de A Medias. La cuenta actual se conserva.');
  } finally { el('file').value = ''; }
};
const ticketRows = [];
let photoRevision = 0;
function numberedRows(value, count) {
  const indexes = new Set();
  for (const token of value.trim().split(/\s*(?:,|;|\b(?:y|and|et)\b)\s*/i)) {
    const match = token.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (!match) return null;
    const first = Number(match[1]), last = Number(match[2] || first);
    if (first < 1 || last > count || last < first) return null;
    for (let n = first; n <= last; n++) indexes.add(n - 1);
  }
  return [...indexes];
}
function assignBatch(remaining) {
  const status = el('batch-status');
  const peopleBox = el('batch-people');
  const names = Array.from(peopleBox.querySelectorAll('input:checked'), input => input.value);
  if (!names.length) { status.textContent = tr('Marca primero a los comensales de este grupo.'); return; }
  const indexes = remaining
    ? ticketRows.map((row,i) => row.members.querySelectorAll('input:checked').length ? -1 : i).filter(i => i >= 0)
    : numberedRows(el('batch-numbers').value, ticketRows.length);
  if (!indexes) { status.textContent = tr('Escribe números del 1 al ') + ticketRows.length + tr(', por ejemplo 1, 2 o 1-2.'); return; }
  if (!indexes.length) { status.textContent = tr('Todos los productos ya tienen comensales.'); return; }
  const changed = indexes.some(i => {
    const checked = ticketRows[i].members.querySelectorAll('input:checked');
    return checked.length && (checked.length !== names.length || Array.from(checked).some(input => !names.includes(input.value)));
  });
  if (changed && !window.confirm(tr('¿Cambiar los comensales de los productos seleccionados?'))) return;
  for (const index of indexes) {
    for (const input of ticketRows[index].members.querySelectorAll('input')) input.checked = names.includes(input.value);
  }
  status.textContent = tr('Productos ') + indexes.map(i => i + 1).join(', ') + tr(' asignados a ') + names.join(tr(' y ')) + '.';
  el('batch-numbers').value = '';
  for (const input of peopleBox.querySelectorAll('input')) input.checked = false;
}
el('batch-apply').onclick = () => assignBatch(false);
el('batch-rest').onclick = () => assignBatch(true);
function refreshTicketPeople() {
  const payer = el('ticket-payer');
  const previous = payer.value;
  payer.replaceChildren();
  people.forEach(name => payer.add(new Option(name,name)));
  if (people.includes(previous)) payer.value = previous;
  el('batch-panel').hidden = !ticketRows.length;
  const group = el('batch-people');
  const selectedPeople = Array.from(group.querySelectorAll('input:checked'), input => input.value);
  group.replaceChildren();
  for (const name of people) {
    const label = node('label',name);
    const input = document.createElement('input');
    input.type = 'checkbox'; input.value = name; input.checked = selectedPeople.includes(name);
    label.append(input); group.append(label);
  }
  ticketRows.forEach((row,index) => {
    row.legend.textContent = tr('Producto ') + (index + 1);
    const selected = new Set(row.members.querySelectorAll('input:checked'));
    const names = new Set([...selected].map(input => input.value));
    row.members.replaceChildren();
    for (const name of people) {
      const label = node('label',name);
      const input = document.createElement('input');
      input.type = 'checkbox'; input.value = name; input.checked = names.has(name);
      label.append(input); row.members.append(label);
    }
  });
}
function ticketSum() {
  const total = ticketRows.reduce((sum,row) => sum + (readCents(row.amount.value) || 0),0);
  el('ticket-sum').textContent = tr('Suma de las líneas: ') + euros(total);
  return total;
}
function addTicketLine(concept='',amount='') {
  const box = node('fieldset','','ticket-line');
  const legend = node('legend','');
  const name = document.createElement('input');
  name.value = concept.slice(0,70); name.maxLength = 70;
  const price = document.createElement('input');
  price.inputMode = 'decimal'; price.value = amount; price.oninput = ticketSum;
  const members = node('div','','ticket-members');
  const row = {legend,name,amount:price,members};
  const product = node('label',tr('Nombre (opcional)')); product.append(name);
  const cost = node('label',tr('Importe de la línea (€)')); cost.append(price);
  const all = node('button',tr('Marcar a todos'));
  all.onclick = () => members.querySelectorAll('input').forEach(input => {input.checked = true;});
  box.append(legend,product,cost,all,members,removeButton(tr('Quitar línea'),() => {
    clearBatch(); ticketRows.splice(ticketRows.indexOf(row),1); box.remove(); refreshTicketPeople(); ticketSum();
  }));
  Object.assign(row,{product,cost,all,remove:box.lastElementChild});
  ticketRows.push(row); el('ticket-lines').append(box);
}
function parseReceipt(text) {
  const rows = [];
  let total = '';
  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^(.+?)\s+([0-9]+[.,][0-9]{2})\s*€?$/);
    if (!match) continue;
    const [,name,amount] = match;
    if (/^(?:importe\s+total|grand\s+total|montant\s+total|total)(?:\s+(?:a\s+pagar|due|ttc|à\s+payer|eur))?\s*[:€]?$/i.test(name)) total = amount;
    else if (!/\b(total|subtotal|iva|base imponible|vat|tax|tva|cash|card|change|carte|espèces|sous-total|discount|remise|tarjeta|efectivo|cambio|entregado|descuento)\b/i.test(name)) rows.push([name,amount]);
  }
  return {rows,total};
}
function loadTicketText() {
  const {rows,total} = parseReceipt(el('receipt-text').value);
  if (!rows.length || rows.length > 150) {
    el('ticket-status').textContent = tr('Escribe un producto y su importe por línea, o usa «Añadir línea». Máximo 150 líneas.'); return;
  }
  if (ticketRows.length && !window.confirm(tr('¿Sustituir las líneas y asignaciones de este borrador?'))) return;
  clearBatch(); ticketRows.length = 0; el('ticket-lines').replaceChildren();
  rows.forEach(([name,amount]) => addTicketLine(name,amount));
  el('ticket-total').value = total;
  refreshTicketPeople(); ticketSum();
  el('ticket-status').textContent = tr('Comprueba las líneas con el original y marca a los comensales.');
}
function clearBatch() {
  el('batch-panel').hidden = true;
  el('batch-numbers').value = ''; el('batch-status').textContent = '';
  el('batch-people').replaceChildren();
}
function clearTicket() {
  el('sample-photo').hidden = true;
  clearBatch();
  photoRevision++; ticketRows.length = 0; el('ticket-lines').replaceChildren();
  for (const id of ['receipt-photo','receipt-text','ticket-total']) el(id).value = '';
  const canvas = el('receipt-preview'); canvas.hidden = true; canvas.width = 0;
  for (const id of ['ticket-status','scan-status','ticket-sum']) el(id).textContent = '';
}
el('parse-ticket').onclick = loadTicketText;
el('add-line').onclick = () => {
  if (ticketRows.length >= 150) return;
  addTicketLine(); refreshTicketPeople(); ticketSum(); ticketRows.at(-1).name.focus();
};
el('receipt-photo').onchange = async () => {
  const revision = ++photoRevision;
  el('sample-photo').hidden = true;
  const file = el('receipt-photo').files[0];
  const canvas = el('receipt-preview');
  canvas.hidden = true;
  const status = el('scan-status');
  if (!file) return;
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error();
    const bitmap = await createImageBitmap(file);
    if (revision !== photoRevision) { bitmap.close(); return; }
    const scale = Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width*scale));
    canvas.height = Math.max(1, Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    bitmap.close(); canvas.hidden = false;
  } catch {
    status.textContent = tr('No se pudo abrir la foto. Prueba un JPG o PNG de menos de 20 MB, o pega el texto.'); return;
  }
  status.textContent = tr('Puedes copiar texto desde la foto en la galería del móvil y pegarlo aquí, o añadir líneas mirando la imagen.');
  if (typeof TextDetector !== 'function') return;
  try {
    const items = await new TextDetector().detect(canvas);
    if (revision !== photoRevision || !items.length) return;
    el('receipt-text').value = items.map(item => item.rawValue).join('\n').slice(0,25000);
    status.textContent = tr('Revisa el texto detectado y pulsa «Leer líneas del texto».');
  } catch { /* The photo remains available for manual entry. */ }
};
el('save-ticket').onclick = () => {
  const status = el('ticket-status');
  const payer = el('ticket-payer').value;
  if (people.length < 2 || !people.includes(payer)) { status.textContent = tr('Añade los comensales y selecciona quién adelantó el ticket.'); return; }
  if (!ticketRows.length || expenses.length + ticketRows.length > 1000) { status.textContent = tr('Añade líneas sin superar los 1000 gastos por cuenta.'); return; }
  const entries = [];
  for (const [index,row] of ticketRows.entries()) {
    const names = Array.from(row.members.querySelectorAll('input:checked'),input => input.value);
    const concept = row.name.value.trim() || tr('Producto ') + (index + 1), cents = readCents(row.amount.value);
    if (!cents || !names.length) { status.textContent = tr('Revisa el producto ')+(index+1)+tr(': necesita importe y al menos un comensal.'); return; }
    entries.push({payer,concept,cents,shares:equalShares(names,cents)});
  }
  if (readCents(el('ticket-total').value) !== ticketSum()) {status.textContent = tr('Comprueba el total impreso. Debe coincidir con la suma de las líneas.'); return;}
  expenses.push(...entries); clearTicket(); render(); status.textContent = tr('Ticket añadido. El resumen incluye todos sus productos.');
};
render();

if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('mesa') === '8') {
  people.push('Javi','Luz','Eva','Mar','Leo','Pau','Sol','Ana');
  render();
  const groups = [
    ['Dos menús','100,00',['Ana','Javi']], ['Croquetas','12,00',['Ana','Javi']],
    ['Tres pizzas','39,00',['Luz','Eva','Mar']], ['Ensalada','9,01',['Luz','Eva','Mar']],
    ['Tres hamburguesas','45,00',['Leo','Pau','Sol']], ['Vino','24,00',people], ['Pan','8,00',people]
  ];
  for (const [name,amount] of groups) {
    addTicketLine(tr(name),amount);
    Object.assign(ticketRows.at(-1),{sample:name,lastSample:tr(name)});
  }
  refreshTicketPeople();
  groups.forEach((group,i) => {
    for (const input of ticketRows[i].members.querySelectorAll('input')) input.checked = group[2].includes(input.value);
  });
  el('ticket-payer').value = 'Ana';
  el('ticket-total').value = '237,01';
  el('receipt').open = true;
  el('sample-photo').hidden = false;
  el('scan-status').textContent = tr('Ejemplo con imagen y siete líneas precargadas. Puedes cambiar sus comensales antes de confirmar.');
  ticketSum();
}

function updateAppLanguage() {
  render();
  el('expense-title').textContent = tr(editing ? 'Editar gasto' : 'Añadir un gasto');
  el('save-expense').textContent = tr(editing ? 'Guardar cambios' : '+ Añadir gasto');
  for (const row of ticketRows) {
    row.product.firstChild.textContent = tr('Nombre (opcional)');
    row.cost.firstChild.textContent = tr('Importe de la línea (€)');
    row.all.textContent = tr('Marcar a todos');
    row.remove.textContent = tr('Eliminar');
    row.remove.setAttribute('aria-label',tr('Quitar línea'));
    if (row.sample && row.name.value === row.lastSample) {
      row.name.value = row.lastSample = tr(row.sample);
    }
  }
  for (const id of ['message','batch-status','ticket-status','file-status','scan-status']) el(id).textContent = '';
  if (!el('sample-photo').hidden) el('scan-status').textContent = tr('Ejemplo con imagen y siete líneas precargadas. Puedes cambiar sus comensales antes de confirmar.');
  if (ticketRows.length) ticketSum();
}
