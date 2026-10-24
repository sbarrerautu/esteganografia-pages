import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { randomBytes, createHmac, timingSafeEqual, scryptSync } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Laboratorio educativo: las seis fallas señaladas son intencionales.
export function createLab() {
  const db = new DatabaseSync(':memory:'), salt = randomBytes(16);
  const hash = password => scryptSync(password, salt, 32).toString('hex');
  db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT)');
  const insert = db.prepare('INSERT INTO users (username,password,role) VALUES (?,?,?)');
  insert.run('admin', hash(randomBytes(24).toString('hex')), 'admin');
  insert.run('alumno', hash('burp123'), 'student');
  const secret = randomBytes(32), sessions = new Map();
  const challenges = [
  {
    "id": "backup",
    "title": "Un archivo fuera de lugar",
    "area": "Exploración",
    "level": "Inicial",
    "hint": "Algunos archivos indican a los buscadores qué rutas no deberían visitar. ¿Esas rutas están realmente protegidas?"
  },
  {
    "id": "certificado",
    "title": "Ese diploma no es tuyo",
    "area": "Mis certificados",
    "level": "Inicial",
    "hint": "Tu certificado tiene un identificador numérico. ¿El servidor comprueba a quién pertenece cada certificado?"
  },
  {
    "id": "precio",
    "title": "Una oferta demasiado buena",
    "area": "Inscripción a cursos",
    "level": "Inicial",
    "hint": "Observá la petición de inscripción. ¿Quién decide el precio final: el navegador o el servidor?"
  },
  {
    "id": "rol",
    "title": "De alumno a administrador",
    "area": "Administración",
    "level": "Intermedio",
    "hint": "Revisá qué información sobre permisos envía el navegador al pedir acceso al panel."
  },
  {
    "id": "acceso",
    "title": "La puerta de atrás",
    "area": "Inicio de sesión",
    "level": "Intermedio",
    "hint": "Una comilla puede darte una pista sobre cómo se procesa el usuario. Compará la respuesta HTTP con la de un intento normal."
  },
  {
    "id": "registro",
    "title": "La confirmación de adorno",
    "area": "Crear cuenta",
    "level": "Inicial",
    "hint": "¿El campo de confirmación cumple su función? Probá dos contraseñas distintas y observá los encabezados de la respuesta con Burp."
  }
];
  const courses = [
    { id: 'burp', title: 'Burp Suite desde cero', category: 'SEGURIDAD WEB', price: 49, lessons: 8, duration: '2 h 30 min', level: 'Inicial', art: 'proxy', color: 'mint', description: 'Del primer clic al primer hallazgo. Entendé qué viaja entre tu navegador y la web.' },
    { id: 'http', title: 'El idioma de la web', category: 'FUNDAMENTOS', price: 29, lessons: 6, duration: '1 h 45 min', level: 'Inicial', art: 'http', color: 'blue', description: 'Peticiones, respuestas, cookies y los detalles que marcan la diferencia.' },
    { id: 'security', title: 'Pensar como un auditor', category: 'PRÁCTICA GUIADA', price: 39, lessons: 5, duration: '2 h', level: 'Intermedio', art: 'audit', color: 'peach', description: 'Aprendé a hacer buenas preguntas y a comprobar lo que una aplicación da por hecho.' },
  ];
  const send = (res, status, value, type = 'application/json; charset=utf-8') => {
    // Las banderas viajan únicamente en encabezados HTTP, nunca en el contenido visible.
    if (value && typeof value === 'object' && !Array.isArray(value) && !Buffer.isBuffer(value)) {
      value = { ...value };
      for (const key of ['flag', 'verification']) {
        if (typeof value[key] === 'string' && value[key].startsWith('FLAG{')) {
          res.setHeader('X-Lab-Flag', value[key]); delete value[key];
        }
      }
    }
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(type.startsWith('application/json') ? JSON.stringify(value) : value);
  };
  const body = async req => {
    let data = '', length = 0;
    for await (const part of req) { length += part.length; if (length > 16384) throw Object.assign(new Error('Petición demasiado grande'), { status: 413 }); data += part; }
    try { const parsed = JSON.parse(data || '{}'); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error(); return parsed; }
    catch { throw Object.assign(new Error('Se esperaba un objeto JSON válido.'), { status: 400 }); }
  };
  const videoPath = new URL('./public/video/intro.mp4', import.meta.url);
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(v => v.trim().split('=')).filter(v => v.length === 2));
      let sid = cookies.sid;
      if (!sessions.has(sid)) {
        const now = Date.now();
        for (const [key, value] of sessions) if (now - value.touched > 21600000) sessions.delete(key);
        if (sessions.size >= 2000) return send(res, 503, { error: 'Laboratorio lleno. Probá más tarde.' });
        sid = randomBytes(24).toString('hex');
        sessions.set(sid, { solved: new Set(), user: 'alumno', enrolled: new Set(), touched: now });
        const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
        res.setHeader('Set-Cookie', [`sid=${sid}; HttpOnly; SameSite=Lax; Path=/${secure}`, `role=student; SameSite=Lax; Path=/${secure}`]);
      }
      const session = sessions.get(sid); session.touched = Date.now();
      const flag = id => `FLAG{${id}_${createHmac('sha256', secret).update(`${sid}:${id}`).digest('hex').slice(0, 18)}}`;
      if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, { challenges: challenges.map((c, index) => ({ id: `reto-${index + 1}`, title: c.title, area: c.area, level: c.level, points: 100, solved: session.solved.has(c.id) })), score: session.solved.size * 100, user: session.user, enrolled: [...session.enrolled] });
      if (req.method === 'GET' && url.pathname === '/api/courses') return send(res, 200, courses);
      if (req.method === 'GET' && url.pathname.startsWith('/api/hint/')) {
        const match = /^\/api\/hint\/reto-([1-6])$/.exec(url.pathname);
        const challenge = match ? challenges[Number(match[1]) - 1] : null;
        return send(res, challenge ? 200 : 404, challenge ? { hint: challenge.hint } : { error: 'Reto desconocido.' });
      }
      if (req.method === 'POST' && url.pathname === '/api/flags') {
        const data = await body(req), submitted = Buffer.from(String(data.flag || '').trim());
        const c = challenges.find(c => { const expected = Buffer.from(flag(c.id)); return expected.length === submitted.length && timingSafeEqual(expected, submitted); });
        if (!c) return send(res, 400, { error: 'Bandera incorrecta o de otra sesión. Copiá el valor completo: FLAG{…}.' });
        const duplicate = session.solved.has(c.id); session.solved.add(c.id);
        return send(res, 200, { message: duplicate ? 'Ya capturaste esta bandera.' : '¡Bandera capturada! +100 puntos.', score: session.solved.size * 100, id: `reto-${challenges.indexOf(c) + 1}` });
      }
      if (req.method === 'POST' && url.pathname === '/api/reset') { session.solved.clear(); session.enrolled.clear(); session.user = 'alumno'; res.setHeader('Set-Cookie', 'role=student; SameSite=Lax; Path=/'); return send(res, 200, { message: 'Tu progreso se reinició.' }); }
      if (req.method === 'POST' && url.pathname === '/api/login') {
        const data = await body(req);
        if (typeof data.username !== 'string' || typeof data.password !== 'string' || data.password.length > 128) return send(res, 400, { error: 'Usuario o contraseña inválidos.' });
        // RETO 5: interpolación SQL real, base efímera sin archivos.
        const query = `SELECT username, role FROM users WHERE username = '${data.username}' AND password = '${hash(data.password)}'`;
        try { const user = db.prepare(query).get(); if (!user) return send(res, 401, { error: 'Usuario o contraseña incorrectos.' }); session.user = user.username; return send(res, 200, { message: `Sesión iniciada: ${user.username}`, ...(user.role === 'admin' ? { flag: flag('acceso') } : {}) }); }
        catch { return send(res, 400, { error: 'SQLite: error en la consulta de autenticación.' }); }
      }
      if (req.method === 'POST' && url.pathname === '/api/register') {
        const data = await body(req);
        if (typeof data.username !== 'string' || !/^[a-zA-Z0-9_.-]{3,24}$/.test(data.username) || typeof data.password !== 'string' || data.password.length < 8 || data.password.length > 128 || typeof data.passwordConfirm !== 'string') return send(res, 400, { error: 'Usuario: 3 a 24 letras, números, puntos o guiones. Contraseña: 8 a 128 caracteres. Se requieren ambos campos.' });
        if (db.prepare('SELECT id FROM users WHERE username=?').get(data.username)) return send(res, 409, { error: 'Ese usuario ya existe. Elegí otro.' });
        if (db.prepare('SELECT count(*) AS n FROM users').get().n >= 2000) return send(res, 503, { error: 'Límite de cuentas alcanzado.' });
        // RETO 6: falta la comparación de passwordConfirm en el servidor.
        insert.run(data.username, hash(data.password), 'student'); session.user = data.username;
        return send(res, 201, { message: `Cuenta creada: ${data.username}. Podés entrar con la primera contraseña.`, ...(data.password !== data.passwordConfirm ? { flag: flag('registro') } : {}) });
      }
      if (req.method === 'GET' && /^\/api\/certificates\/\d+$/.test(url.pathname)) {
        // RETO 2: IDOR, falta autorización por objeto.
        const certificates = { '1001': { id: 1001, owner: 'alumno', course: 'El idioma de la web', date: 'Edición aula', status: 'Completado' }, '1002': { id: 1002, owner: 'lucia.demo', course: 'Burp Suite desde cero', date: 'Edición aula', status: 'Completado', verification: flag('certificado') } };
        const certificate = certificates[url.pathname.split('/').pop()]; return send(res, certificate ? 200 : 404, certificate || { error: 'Certificado inexistente.' });
      }
      if (req.method === 'POST' && url.pathname === '/api/enroll') {
        const data = await body(req), course = courses.find(c => c.id === data.courseId);
        if (!course || typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price < 0) return send(res, 400, { error: 'Curso o precio inválidos.' });
        // RETO 3: precio controlado por el cliente.
        session.enrolled.add(course.id);
        return send(res, 200, { message: 'Inscripción de práctica confirmada. No se realiza ningún cobro.', course: course.title, total: data.price, ...(data.price < course.price ? { flag: flag('precio') } : {}) });
      }
      if (req.method === 'GET' && url.pathname === '/api/admin') {
        // RETO 4: autorización basada en una cookie editable.
        if (cookies.role !== 'admin') return send(res, 403, { error: 'Acceso restringido: se requiere el rol admin.' });
        return send(res, 200, { message: 'Panel de administración de Aula Abierta', flag: flag('rol') });
      }
      if (req.method === 'GET' && url.pathname === '/robots.txt') return send(res, 200, 'User-agent: *\nDisallow: /backups/\n', 'text/plain; charset=utf-8');
      // RETO 1: copia de respaldo expuesta con datos ficticios.
      if (req.method === 'GET' && url.pathname === '/backups/') return send(res, 200, '<!doctype html><html lang="es"><meta charset="utf-8"><title>Backups</title><h1>Index of /backups/</h1><a href="/backups/campus-demo.bak">campus-demo.bak</a></html>', 'text/html; charset=utf-8');
      if (req.method === 'GET' && url.pathname === '/backups/campus-demo.bak') { res.setHeader('X-Lab-Flag', flag('backup')); return send(res, 200, `# Aula Abierta · respaldo de demostración\nENV=classroom\nCAMPUS=Aula Abierta\n`, 'text/plain; charset=utf-8'); }
      if (req.method === 'GET' && url.pathname === '/api/video') { const exists = await stat(videoPath).then(s => s.isFile()).catch(() => false); return send(res, 200, { available: exists, url: exists ? '/media/intro.mp4' : null }); }
      if (req.method === 'GET' && url.pathname === '/media/intro.mp4') {
        const info = await stat(videoPath).catch(() => null); if (!info) return send(res, 404, { error: 'Video pendiente de publicación.' });
        let start = 0, end = info.size - 1, partial = false;
        if (req.headers.range) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
          if (!match || (!match[1] && !match[2])) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); return res.end(); }
          start = match[1] ? Number(match[1]) : Math.max(0, info.size - Number(match[2]));
          end = match[1] && match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); return res.end(); } partial = true;
        }
        res.writeHead(partial ? 206 : 200, { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, ...(partial ? { 'Content-Range': `bytes ${start}-${end}/${info.size}` } : {}) });
        const stream = createReadStream(videoPath, { start, end }); stream.on('error', () => res.destroy()); res.on('close', () => stream.destroy()); stream.pipe(res); return;
      }
      const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'] };
      if (req.method === 'GET' && Object.hasOwn(files, url.pathname)) { const [name, mime] = files[url.pathname]; return send(res, 200, await readFile(new URL(`./public/${name}`, import.meta.url)), `${mime}; charset=utf-8`); }
      return send(res, 404, { error: 'Ruta no encontrada.' });
    } catch (e) { if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'Error del laboratorio.' }); else res.end(); }
  });
  server.on('close', () => db.close()); return server;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(pathToFileURL(process.argv[1]))) {
  const port = Number(process.env.PORT || 3000), host = process.env.HOST || '127.0.0.1';
  const server = createLab(); server.on('error', e => { console.error(`No se pudo iniciar: ${e.message}`); process.exitCode = 1; });
  server.listen(port, host, () => console.log(`Aula Abierta lista en http://${host}:${port}\nLaboratorio educativo · 6 retos · Ctrl+C para detener.`));
}


