import express from 'express';
import multer from 'multer';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '80kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

const SEED_PROJECTS = [
  { slug: 'hallaym-edu', title: 'HALLAYM edu', category: 'Platforma', label: 'Masofaviy ta’lim', summary: 'Darslar, jadval va o‘quv jarayonini yagona raqamli muhitga jamlaydigan ta’lim platformasi.', description: 'Qarshi davlat texnika universiteti uchun masofaviy ta’lim tizimi. Jonli dars, videodars, davomat va o‘quv jarayoni modullari bilan ishlanmoqda.', audience: 'Qarshi davlat texnika universiteti', authors: 'Qoryog‘diyev Abdurahmon', stack: ['Node.js', 'MongoDB', 'PWA'], demoUrl: 'https://hallaym.kstu.uz', sourceUrl: 'https://github.com/hallaymstore/masofaviy2', coverUrl: '', theme: 'education', featured: true },
  { slug: 'marketuz', title: 'MarketUZ', category: 'Veb-sayt', label: 'Onlayn savdo', summary: 'Katalog, mahsulot sahifalari va savdo jarayoniga mo‘ljallangan marketplace loyihasi.', description: 'Onlayn do‘kon tajribasini mobil va kompyuter ekranlariga mos qilib ishlab chiqilgan savdo loyihasi.', audience: 'Onlayn savdo loyihasi', authors: 'Qoryog‘diyev Abdurahmon', stack: ['Node.js', 'Responsive UI'], demoUrl: 'https://marketuz-dsph.onrender.com', sourceUrl: 'https://github.com/hallaymstore/marketuz', coverUrl: '', theme: 'market', featured: true },
  { slug: 'tabrikuz', title: 'TabrikUZ', category: 'Veb-sayt', label: 'Taklifnomalar', summary: 'Bayram va marosimlar uchun animatsiyali raqamli taklifnomalar.', description: 'Tug‘ilgan kun va to‘y uchun shaxsiylashtiriladigan animatsion taklifnomalar va buyurtma sahifalari.', audience: 'Raqamli taklifnoma buyurtmachilari', authors: 'Qoryog‘diyev Abdurahmon', stack: ['Node.js', 'Animatsiya', 'Responsive UI'], demoUrl: 'https://tabrikuz-invite.onrender.com', sourceUrl: 'https://github.com/hallaymstore/tabrikuz', coverUrl: '', theme: 'invite', featured: true },
  { slug: 'omad-studio', title: 'Omad Studio', category: 'Veb-sayt', label: 'Jonli efir vositasi', summary: 'Jonli efirdagi o‘yinlar uchun baraban va vizual sahna.', description: 'Efir ko‘rsatuvlari uchun lotereya barabani va sahna ko‘rinishlarini boshqarishga mo‘ljallangan brauzer vositasi.', audience: 'Kontent yaratuvchilar', authors: 'Qoryog‘diyev Abdurahmon', stack: ['JavaScript', 'CSS animatsiya'], demoUrl: 'https://omad-studio-lotto.onrender.com', sourceUrl: 'https://github.com/hallaymstore/lotto', coverUrl: '', theme: 'studio', featured: false },
  { slug: 'forensix', title: 'ForensiX', category: 'Platforma', label: 'Kiberxavfsizlik', summary: 'Raqamli xavfsizlik yo‘nalishidagi tahlil va ko‘rgazmali loyiha.', description: 'Kiberxavfsizlik mavzusida tahlil va taqdimotga mo‘ljallangan loyiha. Ommaviy demo manzili hali kiritilmagan.', audience: 'HALLAYM ichki loyiha', authors: 'Qoryog‘diyev Abdurahmon', stack: ['Xavfsizlik', 'Tahlil'], demoUrl: '', sourceUrl: '', coverUrl: '', theme: 'security', featured: false },
  { slug: 'factory-bot', title: 'Factory Bot', category: 'Telegram bot', label: 'Kontent avtomatlashtirish', summary: 'Telegram kanallari uchun kontent bilan ishlashni avtomatlashtiruvchi bot.', description: 'Kanal postlari, manbalar va yuborish jarayonini boshqarishga oid Telegram bot loyihasi. Ishlaydigan bot havolasini admin paneldan qo‘shish mumkin.', audience: 'Telegram kanal administratorlari', authors: 'Qoryog‘diyev Abdurahmon', stack: ['Node.js', 'Telegram Bot API'], demoUrl: '', sourceUrl: 'https://github.com/hallaymstore/gift', coverUrl: '', theme: 'bot', featured: false }
];

const SEED_TEAM = [
  { name: 'Qoryog‘diyev Abdurahmon', role: 'Full stack dasturchi', bio: 'Veb-platformalar, Telegram botlar va mahsulot interfeyslari ustida ishlaydi.', initials: 'QA', profileUrl: 'https://github.com/hallaymstore', photoUrl: '', order: 0 }
];

const mongoUri = process.env.MONGO_URI?.trim();
const mongoDbName = process.env.MONGO_DB?.trim() || 'hallaym_portfolio';
const password = process.env.ADMIN_PASSWORD || '';
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
let client, db, bucket, connecting;

async function connectDatabase() {
  if (!mongoUri || db || connecting) return connecting;
  connecting = (async () => {
    const candidate = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 7000, maxPoolSize: 5 });
    try {
      await candidate.connect();
      await candidate.db(mongoDbName).command({ ping: 1 });
      client = candidate;
      db = candidate.db(mongoDbName);
      bucket = new GridFSBucket(db, { bucketName: 'portfolio_images' });
      await db.collection('projects').createIndex({ slug: 1 }, { unique: true });
      await db.collection('team').createIndex({ order: 1 });
      const marker = await db.collection('metadata').findOne({ key: 'initial_seed' });
      if (!marker) {
        if (await db.collection('projects').countDocuments() === 0) await db.collection('projects').insertMany(SEED_PROJECTS.map((p, index) => ({ ...p, order: index, createdAt: new Date() })));
        if (await db.collection('team').countDocuments() === 0) await db.collection('team').insertMany(SEED_TEAM.map(p => ({ ...p, createdAt: new Date() })));
        await db.collection('metadata').updateOne({ key: 'initial_seed' }, { $set: { key: 'initial_seed', at: new Date() } }, { upsert: true });
      }
      console.info('Portfolio database connected.');
    } catch (err) {
      await candidate.close().catch(() => {});
      console.error('Portfolio database unavailable:', err.message);
    } finally { connecting = undefined; }
  })();
  return connecting;
}
connectDatabase();
if (mongoUri) setInterval(() => { if (!db) connectDatabase(); }, 30000).unref();

const serialize = p => ({ ...p, _id: p._id?.toString() });
const cleanText = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const cleanUrl = value => {
  const s = cleanText(value, 1800);
  if (!s) return '';
  if (/^\/api\/media\/[0-9a-f]{24}$/.test(s)) return s;
  const u = new URL(s);
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Havola http yoki https bo‘lishi kerak.');
  return u.toString();
};
const cleanProject = (input) => {
  const title = cleanText(input.title, 90);
  if (!title) throw new Error('Loyiha nomi shart.');
  const category = cleanText(input.category, 32);
  if (!['Platforma', 'Veb-sayt', 'Telegram bot', 'Ilova'].includes(category)) throw new Error('Kategoriya noto‘g‘ri.');
  const stack = Array.isArray(input.stack) ? input.stack : String(input.stack ?? '').split(',');
  return {
    title, category, label: cleanText(input.label, 60), summary: cleanText(input.summary, 260),
    description: cleanText(input.description, 3000), audience: cleanText(input.audience, 160),
    authors: cleanText(input.authors, 200), stack: stack.slice(0, 10).map(x => cleanText(x, 35)).filter(Boolean),
    demoUrl: cleanUrl(input.demoUrl), sourceUrl: cleanUrl(input.sourceUrl), coverUrl: cleanUrl(input.coverUrl),
    theme: ['education', 'market', 'invite', 'studio', 'security', 'bot'].includes(input.theme) ? input.theme : 'education',
    featured: input.featured === true || input.featured === 'true'
  };
};
const cleanMember = input => {
  const name = cleanText(input.name, 100);
  if (!name) throw new Error('Ism shart.');
  return { name, role: cleanText(input.role, 90), bio: cleanText(input.bio, 400), initials: cleanText(input.initials, 4), profileUrl: cleanUrl(input.profileUrl), photoUrl: cleanUrl(input.photoUrl), order: Math.max(0, Math.min(999, Number(input.order) || 0)) };
};
const isId = id => ObjectId.isValid(id) && String(new ObjectId(id)) === id;
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

app.get('/api/healthz', (req, res) => res.json({ ok: true, database: db ? 'connected' : 'offline' }));
app.get('/api/status', (req, res) => res.json({ editable: Boolean(db && password), database: db ? 'connected' : 'offline' }));
app.get('/api/projects', wrap(async (req, res) => {
  const items = db ? await db.collection('projects').find({}).sort({ order: 1, createdAt: -1 }).toArray() : SEED_PROJECTS;
  res.set('Cache-Control', 'no-store').json(items.map(serialize));
}));
app.get('/api/team', wrap(async (req, res) => {
  const items = db ? await db.collection('team').find({}).sort({ order: 1, createdAt: 1 }).toArray() : SEED_TEAM;
  res.set('Cache-Control', 'no-store').json(items.map(serialize));
}));
app.get('/api/media/:id', wrap(async (req, res) => {
  if (!db || !isId(req.params.id)) return res.sendStatus(404);
  const file = await db.collection('portfolio_images.files').findOne({ _id: new ObjectId(req.params.id) });
  if (!file) return res.sendStatus(404);
  res.set({ 'Content-Type': file.contentType || 'image/webp', 'Cache-Control': 'public, max-age=86400', 'Content-Security-Policy': "default-src 'none'; sandbox" });
  bucket.openDownloadStream(file._id).on('error', () => { if (!res.headersSent) res.sendStatus(404); else res.destroy(); }).pipe(res);
}));

const loginAttempts = new Map();
const makeToken = () => {
  const body = Buffer.from(JSON.stringify({ until: Date.now() + 12 * 3600_000, nonce: crypto.randomBytes(12).toString('hex') })).toString('base64url');
  const mac = crypto.createHmac('sha256', sessionSecret).update(body).digest('base64url');
  return `${body}.${mac}`;
};
const authenticated = req => {
  const token = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('hallaym_admin='))?.slice('hallaym_admin='.length);
  if (!token) return false;
  const [body, mac] = token.split('.');
  if (!body || !mac) return false;
  const expected = crypto.createHmac('sha256', sessionSecret).update(body).digest();
  let received;
  try { received = Buffer.from(mac, 'base64url'); } catch { return false; }
  if (received.length !== expected.length || !crypto.timingSafeEqual(expected, received)) return false;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()).until > Date.now(); } catch { return false; }
};
const cookie = (req, value, maxAge) => `hallaym_admin=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${req.secure ? '; Secure' : ''}`;
app.post('/api/admin/login', (req, res) => {
  if (!password || !db) return res.status(503).json({ error: 'Boshqaruvni yoqish uchun MongoDB va admin paroli kerak.' });
  const key = req.ip;
  const now = Date.now();
  const entry = loginAttempts.get(key) || { count: 0, until: now + 15 * 60_000 };
  if (now > entry.until) { entry.count = 0; entry.until = now + 15 * 60_000; }
  if (entry.count >= 8) return res.status(429).json({ error: 'Urinishlar ko‘p. Birozdan keyin urinib ko‘ring.' });
  const supplied = String(req.body?.password || '');
  const hash = x => crypto.createHash('sha256').update(x).digest();
  if (!crypto.timingSafeEqual(hash(supplied), hash(password))) {
    entry.count++; loginAttempts.set(key, entry);
    return res.status(401).json({ error: 'Parol noto‘g‘ri.' });
  }
  loginAttempts.delete(key);
  res.set('Set-Cookie', cookie(req, makeToken(), 12 * 3600)).json({ ok: true });
});
app.post('/api/admin/logout', (req, res) => res.set('Set-Cookie', cookie(req, '', 0)).json({ ok: true }));
app.get('/api/admin/session', (req, res) => res.json({ authenticated: authenticated(req), editable: Boolean(db && password) }));
const admin = (req, res, next) => {
  if (!authenticated(req)) return res.status(401).json({ error: 'Avval admin sifatida kiring.' });
  if (!db) return res.status(503).json({ error: 'MongoDB ulanmagan.' });
  if (req.method !== 'GET' && req.get('X-Requested-With') !== 'hallaym-admin') return res.sendStatus(403);
  next();
};

app.post('/api/admin/projects', admin, wrap(async (req, res) => {
  const data = cleanProject(req.body);
  const slugBase = data.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'loyiha';
  const slug = `${slugBase}-${crypto.randomBytes(3).toString('hex')}`;
  const result = await db.collection('projects').insertOne({ ...data, slug, order: Date.now(), createdAt: new Date() });
  res.status(201).json({ _id: String(result.insertedId), ...data, slug });
}));
app.put('/api/admin/projects/:id', admin, wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.sendStatus(404);
  const data = cleanProject(req.body);
  const result = await db.collection('projects').findOneAndUpdate({ _id: new ObjectId(req.params.id) }, { $set: { ...data, updatedAt: new Date() } }, { returnDocument: 'after' });
  if (!result) return res.sendStatus(404);
  res.json(serialize(result));
}));
app.delete('/api/admin/projects/:id', admin, wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.sendStatus(404);
  const result = await db.collection('projects').deleteOne({ _id: new ObjectId(req.params.id) });
  res.status(result.deletedCount ? 204 : 404).end();
}));
app.post('/api/admin/team', admin, wrap(async (req, res) => {
  const data = cleanMember(req.body);
  const result = await db.collection('team').insertOne({ ...data, createdAt: new Date() });
  res.status(201).json({ _id: String(result.insertedId), ...data });
}));
app.put('/api/admin/team/:id', admin, wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.sendStatus(404);
  const result = await db.collection('team').findOneAndUpdate({ _id: new ObjectId(req.params.id) }, { $set: { ...cleanMember(req.body), updatedAt: new Date() } }, { returnDocument: 'after' });
  if (!result) return res.sendStatus(404);
  res.json(serialize(result));
}));
app.delete('/api/admin/team/:id', admin, wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.sendStatus(404);
  const result = await db.collection('team').deleteOne({ _id: new ObjectId(req.params.id) });
  res.status(result.deletedCount ? 204 : 404).end();
}));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) });
app.post('/api/admin/media', admin, upload.single('image'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'PNG, JPG yoki WEBP rasm yuklang (5 MB gacha).' });
  const stream = bucket.openUploadStream(`portfolio-${Date.now()}`, { contentType: req.file.mimetype });
  await new Promise((resolve, reject) => { stream.once('finish', resolve); stream.once('error', reject); stream.end(req.file.buffer); });
  res.status(201).json({ url: `/api/media/${stream.id}` });
}));

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
app.use(express.static(publicDir, { maxAge: '1h', index: 'index.html' }));
app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof multer.MulterError) return res.status(400).json({ error: 'Rasm 5 MB dan katta.' });
  if (err instanceof TypeError || err?.message?.includes('Havola') || err?.message?.includes('shart') || err?.message?.includes('noto‘g‘ri')) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
});

const cliPort = process.argv.indexOf('--port');
const port = Number(cliPort >= 0 ? process.argv[cliPort + 1] : process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => console.info(`HALLAYM Studio listening on ${port}`));
process.on('SIGTERM', async () => { await client?.close(); process.exit(0); });
