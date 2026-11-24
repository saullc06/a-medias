import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const routes={};
for(const [path,file,type] of [['/','index.html','text/html'],['/informacion','info.html','text/html'],['/languages.js','languages.js','text/javascript'],['/preferences.js','preferences.js','text/javascript'],['/app.js','app.js','text/javascript'],['/app.css','app.css','text/css']]){
  routes[path]=[type+'; charset=utf-8',readFileSync('src/'+file,'utf8')];
}
routes['/ticket-mesa-8.png'] = ['image/png',readFileSync('src/ticket-mesa-8.png').toString('base64')];
// Set sponsor.json to {advertiser, message, url} for an agreed direct campaign.
const sponsor = JSON.parse(readFileSync('sponsor.json', 'utf8'));
if (sponsor !== null) {
  const {advertiser,message,url} = sponsor;
  if (![advertiser,message,url].every(value => typeof value === 'string' && value.trim()) ||
      new URL(url).protocol !== 'https:') throw new Error('Patrocinio incompleto o URL no segura.');
  const escape = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const ad = '<aside class="sponsor" aria-label="Publicidad"><div><small>PUBLICIDAD</small><strong>' +
    escape(advertiser) + '</strong><p>' + escape(message) + '</p></div><a rel="sponsored noreferrer" href="' +
    escape(url) + '">Visitar anunciante</a></aside>';
  routes['/'][1] = routes['/'][1].replace('<!-- sponsor -->', () => ad);
}
mkdirSync('dist/server',{recursive:true});
writeFileSync('dist/server/index.js','const routes = new Map(Object.entries('+JSON.stringify(routes)+'));\n'+readFileSync('handler.js','utf8'));
