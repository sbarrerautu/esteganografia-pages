import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { laws, cases, exercises } from './public/data.js';
import { lawDocuments } from './public/law-documents.js';
import { video } from './public/config.js';
import vm from 'node:vm';
const ids = new Set(laws.map(l=>l.id));
assert.equal(ids.size,laws.length,'IDs de normas duplicados');
assert.equal(laws.length,15,'La biblioteca debe tener las 15 fichas previstas');
assert.equal(new Set(cases.map(c=>c.id)).size,cases.length,'IDs de casos duplicados');
for(const l of laws){
  const printable = lawDocuments[l.id];
  assert.ok(printable,`Falta documento legal para ${l.id}`);
  assert.ok(l.id === '44018' || printable.links.length > 0,`Falta acceso al texto completo de ${l.id}`);
  for (const [,url] of printable.links) assert.equal(new URL(url).protocol,'https:');
  for(const key of ['short','title','region','group','lead','articles','example','caution','source']) assert.ok(l[key],`Falta ${key}: ${l.id}`);
  assert.ok(l.points.length>=3,`Ficha incompleta: ${l.id}`);
  assert.equal(new URL(l.url).protocol,'https:');
  for(const id of l.related) assert.ok(ids.has(id),`Enlace de norma roto: ${id}`);
}
for(const c of cases){assert.equal(new URL(c.url).protocol,'https:');for(const id of c.related)assert.ok(ids.has(id));}
for(const e of exercises){assert.ok(e.questions.length&&e.answer);for(const id of e.laws)assert.ok(ids.has(id));}
const app=await readFile(new URL('./public/app.js',import.meta.url),'utf8');
assert.ok(!app.includes('window.print('),'No imprimir la ficha en lugar del texto legal');
assert.ok(app.includes('${lawPrintSection(l)}'),'Debe mostrarse el acceso al documento legal en cada ficha');
for(const match of app.matchAll(/#\/normas\/([a-z0-9]+)/g))assert.ok(ids.has(match[1]),`Enlace fijo roto: ${match[1]}`);
for(const asset of ['index.html','styles.css','app.js','data.js','config.js','assets/favicon.svg'])await access(new URL('./public/'+asset,import.meta.url));
const slides = JSON.parse(await readFile(new URL('./public/presentacion/slides.json',import.meta.url),'utf8'));
assert.equal(slides.length,39,'La presentación debe conservar sus 39 páginas');
assert.ok((await readFile(new URL('./public/presentacion/presentacion.pdf',import.meta.url))).subarray(0,5).toString()==='%PDF-','El original debe ser un PDF válido');
for (const [index,slide] of slides.entries()) {
  assert.equal(slide.number,index+1,'Orden de diapositivas incorrecto');
  assert.ok(slide.title && slide.text,'Diapositiva sin contenido accesible');
  assert.match(slide.image,/^presentacion\/diapositiva-\d{2}\.webp$/);
  await access(new URL('./public/'+slide.image,import.meta.url));
}
assert.ok(!app.includes('LA PREGUNTA QUE CONECTA TODA LA EXPOSICIÓN') && !app.includes('HOJA DE RUTA / 60 MINUTOS'),'No mostrar etiquetas internas del plan');
console.log(`Presentación verificada: ${slides.length} diapositivas y PDF original.`);
console.log(`Verificado: ${laws.length} fichas, ${cases.length} casos, ${exercises.length} ejercicios; fuentes HTTPS y relaciones internas válidas.`);
if (video.interactiveSrc) {
  await access(new URL('./public/'+video.interactiveSrc,import.meta.url));
  const context = { window: {} };
  vm.runInNewContext(await readFile(new URL('./public/un-clic/story.js',import.meta.url),'utf8'), context, {timeout:1000});
  const story = context.window.STORY;
  for (const file of [...Object.values(story.clips), ...Object.values(story.music)]) {
    assert.ok(/^(clips|music)\/[\w.-]+\.(mp4|mp3)$/.test(file),`Ruta de medio no válida: ${file}`);
    await access(new URL('./public/un-clic/'+file,import.meta.url));
  }
  for (const chapter of story.chapters) assert.ok(story.nodes[chapter.start],`Inicio de capítulo inexistente: ${chapter.id}`);
  for (const node of Object.values(story.nodes)) {
    assert.ok(story.clips[node.id],`Falta video para ${node.id}`);
    for (const next of node.choices ? node.choices.map(c=>c.next) : [node.next]) {
      assert.ok(next.startsWith('ficha:') ? story.fichas[next.slice(6)] : story.nodes[next],`Destino inexistente: ${next}`);
    }
  }
  console.log(`Experiencia verificada: ${story.chapters.length} capítulos y ${Object.keys(story.clips).length} clips, con archivos y destinos completos.`);
}
