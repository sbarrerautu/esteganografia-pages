import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { laws, cases, exercises } from './public/data.js';
const ids = new Set(laws.map(l=>l.id));
assert.equal(ids.size,laws.length,'IDs de normas duplicados');
assert.equal(laws.length,15,'La biblioteca debe tener las 15 fichas previstas');
assert.equal(new Set(cases.map(c=>c.id)).size,cases.length,'IDs de casos duplicados');
for(const l of laws){
  for(const key of ['short','title','region','group','lead','articles','example','caution','source']) assert.ok(l[key],`Falta ${key}: ${l.id}`);
  assert.ok(l.points.length>=3,`Ficha incompleta: ${l.id}`);
  assert.equal(new URL(l.url).protocol,'https:');
  for(const id of l.related) assert.ok(ids.has(id),`Enlace de norma roto: ${id}`);
}
for(const c of cases){assert.equal(new URL(c.url).protocol,'https:');for(const id of c.related)assert.ok(ids.has(id));}
for(const e of exercises){assert.ok(e.questions.length&&e.answer);for(const id of e.laws)assert.ok(ids.has(id));}
const app=await readFile(new URL('./public/app.js',import.meta.url),'utf8');
for(const match of app.matchAll(/#\/normas\/([a-z0-9]+)/g))assert.ok(ids.has(match[1]),`Enlace fijo roto: ${match[1]}`);
for(const asset of ['index.html','styles.css','app.js','data.js','config.js','assets/favicon.svg'])await access(new URL('./public/'+asset,import.meta.url));
console.log(`Verificado: ${laws.length} fichas, ${cases.length} casos, ${exercises.length} ejercicios; fuentes HTTPS y relaciones internas válidas.`);
