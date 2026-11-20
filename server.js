require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const SALT = process.env.SALT || 'market.v2$';
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin_secret';
const PLAN = {
  id: 'lifetime',
  name: process.env.PLAN_NAME || 'Esquele Lifetime',
  price: parseFloat(process.env.PLAN_PRICE) || 34.99,
  ccs: parseInt(process.env.PLAN_CCS) || 25
};

// ══════ MIDDLEWARE ══════
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Demasiadas peticiones. Intenta más tarde.' }
});
app.use('/api/', limiter);

// ══════ BASE DE DATOS ══════
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'esq.db');
try { fs.mkdirSync(path.dirname(DB_PATH), { recursive: true }); } catch (e) {}
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ident TEXT UNIQUE NOT NULL,
    hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    is_vip INTEGER DEFAULT 0,
    balance REAL DEFAULT 0.00,
    plan_id TEXT,
    plan_since INTEGER
  );
  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    brand TEXT, last4 TEXT, exp TEXT, holder TEXT,
    bank TEXT, level TEXT, country TEXT, type TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS deposits (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    coin TEXT, net TEXT, addr TEXT,
    amount TEXT, usd REAL, txid TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subject TEXT, body TEXT,
    status TEXT DEFAULT 'open',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS attempts (
    ip TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0,
    locked_until INTEGER DEFAULT 0
  );
`);

// ══════ CUENTAS PREDEFINIDAS ══════
function seedDefaults() {
  const demoUser = process.env.DEMO_USER || 'demo';
  const demoPass = process.env.DEMO_PASS || 'Market#2026';
  const vipUser = process.env.VIP_USER || 'esqvip';
  const vipPass = process.env.VIP_PASS || 'EsqueleVip2026!';
  const hashDemo = bcrypt.hashSync(SALT + demoPass + '$' + demoUser, 10);
  const hashVip = bcrypt.hashSync(SALT + vipPass + '$' + vipUser, 10);
  const insert = db.prepare('INSERT OR IGNORE INTO users (ident, hash, created_at, is_vip, plan_id, plan_since) VALUES (?, ?, ?, ?, ?, ?)');
  const now = Date.now();
  insert.run(demoUser, hashDemo, now, 0, null, null);
  insert.run(vipUser, hashVip, now, 1, PLAN.id, now);
}
seedDefaults();

// ══════ BASE BIN EXPANDIDA (acepta todos los rangos) ══════
const BIN_DB = {
  // Visa
  "400000":{bank:"Visa",country:"US",level:"Classic",type:"Debit"},
  "400001":{bank:"Visa",country:"US",level:"Classic",type:"Credit"},
  "400002":{bank:"Visa",country:"US",level:"Gold",type:"Credit"},
  "400003":{bank:"Visa",country:"US",level:"Platinum",type:"Credit"},
  "400004":{bank:"Visa",country:"US",level:"Signature",type:"Credit"},
  "400005":{bank:"Visa",country:"US",level:"Infinite",type:"Credit"},
  "411111":{bank:"Visa Test",country:"US",level:"Classic",type:"Credit"},
  "401288":{bank:"Visa Test",country:"US",level:"Classic",type:"Credit"},
  "422222":{bank:"Visa Test",country:"US",level:"Classic",type:"Credit"},
  "424242":{bank:"Demo Issuer",country:"US",level:"Platinum",type:"Credit"},
  "414720":{bank:"Chase",country:"US",level:"Signature",type:"Credit"},
  "414709":{bank:"Chase",country:"US",level:"Sapphire",type:"Credit"},
  "455660":{bank:"Chase",country:"US",level:"Freedom",type:"Credit"},
  "426398":{bank:"Bank of America",country:"US",level:"Classic",type:"Credit"},
  "476144":{bank:"Bank of America",country:"US",level:"Cash Rewards",type:"Credit"},
  "473104":{bank:"Capital One",country:"US",level:"Platinum",type:"Credit"},
  "448606":{bank:"Wells Fargo",country:"US",level:"Platinum",type:"Credit"},
  "453261":{bank:"Citibank",country:"US",level:"Platinum",type:"Credit"},
  "491644":{bank:"Barclays",country:"GB",level:"Platinum",type:"Credit"},
  "454638":{bank:"Santander",country:"ES",level:"Classic",type:"Debit"},
  "491801":{bank:"BBVA",country:"ES",level:"Classic",type:"Debit"},
  "402360":{bank:"ING",country:"ES",level:"Classic",type:"Debit"},
  "477216":{bank:"Banamex",country:"MX",level:"Classic",type:"Credit"},
  "455541":{bank:"Nubank",country:"BR",level:"Gold",type:"Credit"},
  "451761":{bank:"Banco Galicia",country:"AR",level:"Platinum",type:"Credit"},
  "450799":{bank:"RBC",country:"CA",level:"Classic",type:"Credit"},
  "452032":{bank:"TD Bank",country:"CA",level:"Platinum",type:"Credit"},
  "465858":{bank:"Commonwealth",country:"AU",level:"Platinum",type:"Credit"},
  "456443":{bank:"Westpac",country:"AU",level:"Classic",type:"Credit"},
  "497843":{bank:"BNP Paribas",country:"FR",level:"Platinum",type:"Credit"},
  "402310":{bank:"Intesa Sanpaolo",country:"IT",level:"Standard",type:"Credit"},
  "457998":{bank:"Sberbank",country:"RU",level:"Classic",type:"Credit"},
  "405250":{bank:"Garanti",country:"TR",level:"Bonus",type:"Credit"},
  "489342":{bank:"Halkbank",country:"TR",level:"Paraf",type:"Credit"},
  "458150":{bank:"ICICI",country:"IN",level:"Platinum",type:"Credit"},
  "485620":{bank:"Mizuho",country:"JP",level:"Classic",type:"Credit"},
  "403775":{bank:"OCBC",country:"SG",level:"Classic",type:"Credit"},
  "455036":{bank:"Standard Chartered",country:"HK",level:"Platinum",type:"Credit"},
  "451289":{bank:"First Abu Dhabi",country:"AE",level:"Platinum",type:"Credit"},
  "400770":{bank:"Absa",country:"ZA",level:"Classic",type:"Credit"},
  "432454":{bank:"Attijariwafa",country:"MA",level:"Classic",type:"Credit"},
  "421345":{bank:"Banque Misr",country:"EG",level:"Classic",type:"Credit"},
  "478773":{bank:"Banco Estado",country:"CL",level:"Classic",type:"Credit"},
  "451911":{bank:"Bancolombia",country:"CO",level:"Platinum",type:"Credit"},
  "491294":{bank:"BCP",country:"PE",level:"Classic",type:"Credit"},
  "451000":{bank:"Banco de Chile",country:"CL",level:"Classic",type:"Credit"},
  // Mastercard
  "510510":{bank:"Mastercard Test",country:"US",level:"Standard",type:"Credit"},
  "543111":{bank:"Mastercard Test",country:"US",level:"Standard",type:"Credit"},
  "555555":{bank:"Demo Issuer",country:"US",level:"World",type:"Credit"},
  "542523":{bank:"Citibank",country:"US",level:"Premier",type:"Credit"},
  "542418":{bank:"Bank of America",country:"US",level:"Rewards",type:"Credit"},
  "530343":{bank:"HSBC",country:"GB",level:"Premier",type:"Credit"},
  "520032":{bank:"Santander",country:"MX",level:"Platinum",type:"Credit"},
  "516292":{bank:"Itaú",country:"BR",level:"Platinum",type:"Credit"},
  "520474":{bank:"Scotiabank",country:"CA",level:"Gold",type:"Credit"},
  "512876":{bank:"ANZ",country:"AU",level:"Black",type:"Credit"},
  "510805":{bank:"Deutsche Bank",country:"DE",level:"Classic",type:"Credit"},
  "514879":{bank:"Commerzbank",country:"DE",level:"Gold",type:"Credit"},
  "513661":{bank:"Crédit Agricole",country:"FR",level:"Classic",type:"Credit"},
  "517082":{bank:"UniCredit",country:"IT",level:"Gold",type:"Credit"},
  "521178":{bank:"Tinkoff",country:"RU",level:"Black",type:"Credit"},
  "554960":{bank:"Akbank",country:"TR",level:"Axess",type:"Credit"},
  "517652":{bank:"HDFC",country:"IN",level:"Regalia",type:"Credit"},
  "525462":{bank:"DBS",country:"SG",level:"Black",type:"Credit"},
  "524178":{bank:"Hang Seng",country:"HK",level:"Classic",type:"Credit"},
  "518884":{bank:"BC Card",country:"KR",level:"Standard",type:"Credit"},
  "531077":{bank:"KB Kookmin",country:"KR",level:"Classic",type:"Credit"},
  "525345":{bank:"Emirates NBD",country:"AE",level:"Infinite",type:"Credit"},
  "523910":{bank:"Standard Bank",country:"ZA",level:"Platinum",type:"Credit"},
  "530060":{bank:"BMCE",country:"MA",level:"Gold",type:"Credit"},
  "524599":{bank:"QNB",country:"EG",level:"Platinum",type:"Credit"},
  "526741":{bank:"Interbank",country:"PE",level:"Platinum",type:"Credit"},
  // Amex
  "378282":{bank:"American Express",country:"US",level:"Gold",type:"Charge"},
  "371449":{bank:"American Express",country:"US",level:"Green",type:"Charge"},
  "378734":{bank:"American Express",country:"US",level:"Platinum",type:"Charge"},
  "374288":{bank:"American Express",country:"US",level:"Platinum",type:"Charge"},
  "375987":{bank:"American Express",country:"US",level:"Gold",type:"Charge"},
  // Discover
  "601111":{bank:"Discover",country:"US",level:"Standard",type:"Credit"},
  "601100":{bank:"Discover",country:"US",level:"Platinum",type:"Credit"},
  "601149":{bank:"Discover",country:"US",level:"Miles",type:"Credit"},
  // JCB
  "356600":{bank:"JCB",country:"JP",level:"Standard",type:"Credit"},
  "353011":{bank:"JCB",country:"JP",level:"Premium",type:"Credit"},
  "358818":{bank:"MUFJ",country:"JP",level:"Platinum",type:"Credit"},
  "354818":{bank:"Rakuten",country:"JP",level:"Gold",type:"Credit"},
  "356897":{bank:"Shinhan",country:"KR",level:"Platinum",type:"Credit"},
  // Diners
  "305693":{bank:"Diners Club",country:"US",level:"Standard",type:"Charge"},
  "362596":{bank:"Diners Club",country:"US",level:"Standard",type:"Charge"},
  // UnionPay
  "620000":{bank:"UnionPay",country:"CN",level:"Standard",type:"Credit"},
  "621000":{bank:"UnionPay",country:"CN",level:"Classic",type:"Debit"},
  "622000":{bank:"UnionPay",country:"CN",level:"Platinum",type:"Credit"},
  // Otros
  "123456":{bank:"Mi Banco",country:"ES",level:"Platinum",type:"Credit"},
  "589562":{bank:"Banco de la Nación",country:"AR",level:"Standard",type:"Debit"},
  "589458":{bank:"SBI",country:"IN",level:"Classic",type:"Debit"}
};

const COUNTRY_NAMES = {
  ES:"España",US:"Estados Unidos",GB:"Reino Unido",DE:"Alemania",FR:"Francia",IT:"Italia",
  MX:"México",BR:"Brasil",AR:"Argentina",CA:"Canadá",AU:"Australia",RU:"Rusia",TR:"Turquía",
  IN:"India",JP:"Japón",SG:"Singapur",HK:"Hong Kong",KR:"Corea del Sur",AE:"Emiratos Árabes",
  ZA:"Sudáfrica",MA:"Marruecos",EG:"Egipto",CL:"Chile",CO:"Colombia",PE:"Perú",CN:"China"
};

// ══════ HELPERS ══════
function norm(s){ return String(s||'').trim().toLowerCase(); }
function nickOf(ident){ return ident.indexOf('@')>-1 ? ident.split('@')[0] : ident; }
function getUserFromToken(req){
  const token = (req.cookies && req.cookies.esq_token) || (req.headers.authorization && req.headers.authorization.replace('Bearer ',''));
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id) || null;
  } catch { return null; }
}
function requireAuth(req,res,next){
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({error:'No autorizado'});
  req.user = user; next();
}
function requireAdmin(req,res,next){
  const key = req.headers['x-admin-key'] || req.query.admin_key;
  if (key !== ADMIN_KEY) return res.status(403).json({error:'Acceso admin denegado'});
  next();
}
function getLockInfo(ip){
  const row = db.prepare('SELECT * FROM attempts WHERE ip = ?').get(ip);
  return row ? {count:row.count, lockedUntil:row.locked_until} : {count:0, lockedUntil:0};
}
function recordAttempt(ip, failed){
  const upsert = db.prepare('INSERT INTO attempts (ip,count,locked_until) VALUES (?,?,?) ON CONFLICT(ip) DO UPDATE SET count=excluded.count, locked_until=excluded.locked_until');
  const cur = getLockInfo(ip);
  if (failed){
    const n = cur.count+1;
    upsert.run(ip, n, n>=5 ? Date.now()+30000 : cur.lockedUntil);
  } else upsert.run(ip, 0, 0);
}

// ══════ API: CONFIG ══════
app.get('/api/config', (req,res)=>{
  res.json({
    plan: PLAN,
    wallets: {
      usdt_bep20:{name:'USDT',net:'BEP20 (BSC)',sym:'USDT',dec:2,addr:process.env.WALLET_USDT_BEP20},
      usdt_trc20:{name:'USDT',net:'TRC20 (TRON)',sym:'USDT',dec:2,addr:process.env.WALLET_USDT_TRC20},
      ltc:{name:'Litecoin',net:'LTC',sym:'LTC',dec:6,addr:process.env.WALLET_LTC},
      btc:{name:'Bitcoin',net:'BTC',sym:'BTC',dec:8,addr:process.env.WALLET_BTC}
    }
  });
});

// ══════ API: BIN (acepta TODOS los BINs) ══════
app.get('/api/bin/:bin', (req,res)=>{
  const d = String(req.params.bin||'').replace(/\D/g,'');
  if (d.length < 6) return res.json(null);
  const bin = d.slice(0,6);
  // 1) Búsqueda exacta
  let rec = BIN_DB[bin];
  // 2) Búsqueda por prefijo
  if (!rec){
    for (const b in BIN_DB){ if (bin.indexOf(b)===0){ rec = BIN_DB[b]; break; } }
  }
  // 3) Si no existe → generar datos genéricos según marca (SIEMPRE verifica)
  if (!rec){
    let brand='CARD', country='XX', level='Standard', type='Credit', bank='Emisor internacional';
    if (/^4/.test(bin)){ brand='VISA'; bank='Visa'; }
    else if (/^5[1-5]/.test(bin)||/^2[2-7]/.test(bin)){ brand='MASTERCARD'; bank='Mastercard'; }
    else if (/^3[47]/.test(bin)){ brand='AMEX'; bank='American Express'; type='Charge'; }
    else if (/^6(?:011|5)/.test(bin)){ brand='DISCOVER'; bank='Discover'; }
    else if (/^62/.test(bin)){ brand='UNIONPAY'; bank='UnionPay'; country='CN'; }
    else if (/^35/.test(bin)){ brand='JCB'; bank='JCB'; country='JP'; }
    else if (/^3(?:0[0-5]|[68])/.test(bin)){ brand='DINERS'; bank='Diners Club'; type='Charge'; }
    rec = {bank, country, level, type, brand};
  }
  res.json({
    bank: rec.bank,
    brand: rec.brand || null,
    country: rec.country,
    countryName: COUNTRY_NAMES[rec.country] || rec.country || 'Internacional',
    level: rec.level,
    type: rec.type,
    bin
  });
});

// ══════ API: CAPTCHA ══════
const captchaStore = new Map();
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
app.get('/api/captcha', (req,res)=>{
  let out='';
  for (let i=0;i<5;i++) out += CAPTCHA_CHARS.charAt(Math.floor(Math.random()*CAPTCHA_CHARS.length));
  const id = crypto.randomBytes(8).toString('hex');
  captchaStore.set(id, {code:out, ts:Date.now()});
  for (const [k,v] of captchaStore) if (Date.now()-v.ts > 300000) captchaStore.delete(k);
  res.json({id, code:out});
});
function verifyCaptcha(id, code){
  const cap = captchaStore.get(id);
  if (!cap || String(code||'').toUpperCase() !== cap.code) return false;
  captchaStore.delete(id);
  return true;
}

// ══════ API: AUTH ══════
app.post('/api/auth/register', (req,res)=>{
  const ip = req.ip;
  const lock = getLockInfo(ip);
  if (lock.lockedUntil > Date.now()) return res.status(429).json({error:'Bloqueado', lockedUntil:lock.lockedUntil});
  const {ident,password,captchaId,captchaCode} = req.body||{};
  const identN = norm(ident);
  if (!/^[a-z0-9_.-]{3,24}$/.test(identN)) return res.status(400).json({error:'Nickname inválido (3-24 caracteres)'});
  if (!password || password.length < 10) return res.status(400).json({error:'Contraseña mínima 10 caracteres'});
  if (!verifyCaptcha(captchaId, captchaCode)){ recordAttempt(ip,true); return res.status(400).json({error:'Captcha incorrecto'}); }
  if (db.prepare('SELECT id FROM users WHERE ident = ?').get(identN)) return res.status(400).json({error:'Ese nickname ya existe'});
  const hash = bcrypt.hashSync(SALT+password+'$'+identN, 10);
  db.prepare('INSERT INTO users (ident,hash,created_at) VALUES (?,?,?)').run(identN, hash, Date.now());
  res.json({ok:true, message:'Cuenta creada'});
});

app.post('/api/auth/login', (req,res)=>{
  const ip = req.ip;
  const lock = getLockInfo(ip);
  if (lock.lockedUntil > Date.now()) return res.status(429).json({error:'Bloqueado', lockedUntil:lock.lockedUntil, left:Math.ceil((lock.lockedUntil-Date.now())/1000)});
  const {ident,password,captchaId,captchaCode} = req.body||{};
  const identN = norm(ident);
  if (!verifyCaptcha(captchaId, captchaCode)){ recordAttempt(ip,true); return res.status(400).json({error:'Captcha incorrecto'}); }
  const user = db.prepare('SELECT * FROM users WHERE ident = ?').get(identN);
  if (!user || !bcrypt.compareSync(SALT+password+'$'+identN, user.hash)){
    recordAttempt(ip,true);
    const nl = getLockInfo(ip);
    return res.status(401).json({error:'Credenciales inválidas', attemptsLeft:Math.max(0,5-nl.count), lockedUntil:nl.lockedUntil});
  }
  recordAttempt(ip,false);
  const token = jwt.sign({id:user.id, ident:user.ident, vip:!!user.is_vip}, JWT_SECRET, {expiresIn:'5h'});
  res.cookie('esq_token', token, {httpOnly:true, sameSite:'lax', maxAge:5*60*60*1000});
  res.json({
    ok:true, token,
    user:{
      id:user.id, ident:user.ident, nickname:nickOf(user.ident),
      is_vip:!!user.is_vip, balance:user.balance,
      plan:user.plan_id ? {id:user.plan_id, name:PLAN.name, ccs:PLAN.ccs, since:user.plan_since} : null
    }
  });
});

app.post('/api/auth/logout', requireAuth, (req,res)=>{ res.clearCookie('esq_token'); res.json({ok:true}); });

app.get('/api/me', requireAuth, (req,res)=>{
  const u = req.user;
  res.json({
    id:u.id, ident:u.ident, nickname:nickOf(u.ident),
    is_vip:!!u.is_vip, balance:u.balance,
    plan:u.plan_id ? {id:u.plan_id, name:PLAN.name, ccs:PLAN.ccs, since:u.plan_since} : null
  });
});

// ══════ API: CARDS ══════
app.get('/api/cards', requireAuth, (req,res)=>{
  res.json(db.prepare('SELECT * FROM cards WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(req.user.id));
});
app.post('/api/cards', requireAuth, (req,res)=>{
  const {brand,last4,exp,holder,bank,level,country,type} = req.body||{};
  if (!last4 || !exp) return res.status(400).json({error:'Datos incompletos'});
  const count = db.prepare('SELECT COUNT(*) as c FROM cards WHERE user_id = ?').get(req.user.id).c;
  if (count >= 5) db.prepare('DELETE FROM cards WHERE id = (SELECT id FROM cards WHERE user_id = ? ORDER BY created_at ASC LIMIT 1)').run(req.user.id);
  const r = db.prepare('INSERT INTO cards (user_id,brand,last4,exp,holder,bank,level,country,type) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(req.user.id, brand, last4, exp, holder, bank||'', level||'', country||'', type||'');
  res.json({ok:true, id:r.lastInsertRowid});
});
app.delete('/api/cards/:id', requireAuth, (req,res)=>{
  db.prepare('DELETE FROM cards WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ok:true});
});

// ══════ API: DEPOSITS ══════
app.post('/api/deposits', requireAuth, (req,res)=>{
  const {coin,net,addr,amount,usd,txid} = req.body||{};
  if (!txid || txid.length < 8) return res.status(400).json({error:'TXID inválido'});
  if (db.prepare('SELECT id FROM deposits WHERE txid = ?').get(txid)) return res.status(400).json({error:'TXID ya registrado'});
  const id = 'dep-'+Date.now()+'-'+crypto.randomBytes(4).toString('hex');
  db.prepare('INSERT INTO deposits (id,user_id,coin,net,addr,amount,usd,txid) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, req.user.id, coin, net, addr, amount, usd, txid);
  res.json({ok:true, id, txid});
});
app.get('/api/deposits', requireAuth, (req,res)=>{
  res.json(db.prepare('SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id));
});

// ══════ API: PLAN ══════
app.post('/api/plan/activate', requireAuth, (req,res)=>{
  const u = req.user;
  if (u.plan_id === PLAN.id) return res.json({ok:true, message:'Ya tienes el plan'});
  if (u.balance < PLAN.price) return res.status(400).json({error:'Saldo insuficiente'});
  db.prepare('UPDATE users SET balance = balance - ?, plan_id = ?, plan_since = ? WHERE id = ?')
    .run(PLAN.price, PLAN.id, Date.now(), u.id);
  res.json({ok:true, plan:{id:PLAN.id, name:PLAN.name, ccs:PLAN.ccs, since:Date.now()}});
});

// ══════ API: TICKETS ══════
app.post('/api/tickets', requireAuth, (req,res)=>{
  const {subject,body} = req.body||{};
  if (!subject || subject.length < 3) return res.status(400).json({error:'Asunto muy corto'});
  if (!body || body.length < 5) return res.status(400).json({error:'Mensaje muy corto'});
  db.prepare('INSERT INTO tickets (user_id,subject,body) VALUES (?,?,?)').run(req.user.id, subject, body);
  res.json({ok:true});
});

// ══════ API: ADMIN ══════
app.get('/api/admin/deposits', requireAdmin, (req,res)=>{
  res.json(db.prepare('SELECT d.*, u.ident FROM deposits d JOIN users u ON d.user_id=u.id WHERE d.status=? ORDER BY d.created_at DESC').all('pending'));
});
app.post('/api/admin/deposits/:id/confirm', requireAdmin, (req,res)=>{
  const dep = db.prepare('SELECT * FROM deposits WHERE id = ?').get(req.params.id);
  if (!dep || dep.status !== 'pending') return res.status(400).json({error:'Depósito no válido'});
  const txn = db.transaction(()=>{
    db.prepare('UPDATE deposits SET status=? WHERE id=?').run('confirmed', dep.id);
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(dep.usd, dep.user_id);
  });
  txn();
  res.json({ok:true});
});
app.post('/api/admin/deposits/:id/reject', requireAdmin, (req,res)=>{
  db.prepare('UPDATE deposits SET status=? WHERE id=?').run('rejected', req.params.id);
  res.json({ok:true});
});

// ══════ FALLBACK SPA ══════
app.get('*', (req,res)=>{ res.sendFile(path.join(__dirname,'public','index.html')); });

app.listen(PORT, ()=>{
  console.log('🚀 ESQ BYPASS corriendo en puerto ' + PORT);
});