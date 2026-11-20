"use strict";
const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const db = require("./db");
const captcha = require("./captcha");
const auth = require("./auth");
const deposits = require("./deposits");
const cards = require("./cards");
const tickets = require("./tickets");
const admin = require("./admin");

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "32kb" }));

let sessionStore;
if (db.pool) {
  const PgStore = require("connect-pg-simple")(session);
  sessionStore = new PgStore({ pool: db.pool, createTableIfMissing: true });
}
app.use(session({
  store: sessionStore,
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    maxAge: 1000 * 60 * 60 * 2,
  },
}));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
app.use("/api/", limiter);

// ── Captcha ────────────────────────────────────────
app.get("/api/captcha", (req, res) => {
  const { token, svg } = captcha.issue();
  res.json({ token, svg });
});

// ── Auth ───────────────────────────────────────────
app.post("/api/register", async (req, res) => {
  const { ident, pass, captchaToken, captchaInput } = req.body || {};
  if (!captcha.verify(captchaToken, captchaInput)) return res.status(400).json({ error: "Captcha incorrecto" });
  const r = await auth.register(ident, pass);
  if (r.error) return res.status(400).json({ error: r.error });
  req.session.userId = r.user.id;
  res.json({ user: auth.publicUser(r.user) });
});

app.post("/api/login", async (req, res) => {
  const { ident, pass, captchaToken, captchaInput } = req.body || {};
  if (!captcha.verify(captchaToken, captchaInput)) return res.status(400).json({ error: "Captcha incorrecto" });
  const r = await auth.login(ident, pass);
  if (r.error) return res.status(401).json({ error: r.error });
  req.session.userId = r.user.id;
  req.session.save(() => {
    res.json({ user: auth.publicUser(r.user) });
  });
});

app.post("/api/logout", (req, res) => { req.session.destroy(() => res.json({ ok: true })); });

// ── Middleware sesión de usuario ──────────────────
async function requireUser(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "No autenticado" });
  }
  try {
    if (db.pool) {
      const r = await db.pool.query("SELECT * FROM users WHERE id=$1", [req.session.userId]);
      if (!r.rows[0]) return res.status(401).json({ error: "Usuario no encontrado" });
      req.user = r.rows[0];
    } else {
      const mem = db.loadMem();
      const u = mem.users.find(x => x.id === req.session.userId);
      if (!u) return res.status(401).json({ error: "Usuario no encontrado" });
      req.user = u;
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Error de servidor" });
  }
}

app.get("/api/me", requireUser, (req, res) => res.json({ user: auth.publicUser(req.user) }));

// ── Depósitos ─────────────────────────────────────
app.get("/api/deposits/mine", requireUser, async (req, res) => {
  res.json({ deposits: await deposits.listMine(req.user.id) });
});

app.post("/api/deposits", requireUser, async (req, res) => {
  const { method, amountCents, txid } = req.body || {};
  if (!["usdt_bep20", "usdt_trc20", "ltc", "btc"].includes(method)) return res.status(400).json({ error: "Método inválido" });
  const cents = parseInt(amountCents, 10);
  if (!cents || cents < 100) return res.status(400).json({ error: "Monto inválido" });
  if (!txid || String(txid).trim().length < 10) return res.status(400).json({ error: "TXID inválido" });
  const d = await deposits.create(req.user.id, method, cents, String(txid).trim());
  res.json({ deposit: d });
});

app.get("/api/payment-methods", requireUser, (req, res) => {
  const out = {};
  for (const [k, v] of Object.entries(config.wallets)) out[k] = !!v;
  res.json({ methods: out, planPriceUsd: config.planPriceUsd });
});

app.get("/api/wallet/:method", requireUser, (req, res) => {
  const m = req.params.method;
  if (!(m in config.wallets)) return res.status(400).json({ error: "Método inválido" });
  if (!config.wallets[m]) return res.status(503).json({ error: "Método no configurado" });
  res.json({ address: config.wallets[m] });
});

// ── Cards ─────────────────────────────────────────
app.get("/api/cards", requireUser, async (req, res) => {
  res.json({ cards: await cards.listMine(req.user.id) });
});
app.post("/api/cards", requireUser, async (req, res) => {
  const { num, exp, cvc } = req.body || {};
  const r = await cards.add(req.user.id, num, exp, cvc);
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({ card: r.card });
});
app.post("/api/cards/:id/verify", requireUser, async (req, res) => {
  const c = await cards.verify(req.user.id, parseInt(req.params.id, 10));
  if (!c) return res.status(404).json({ error: "No encontrada" });
  res.json({ card: c });
});

// ── Tickets ───────────────────────────────────────
app.post("/api/tickets", requireUser, async (req, res) => {
  const { subject, body } = req.body || {};
  const r = await tickets.create(req.user.id, subject, body);
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({ ticket: r.ticket });
});

// ── Admin ─────────────────────────────────────────
admin.routes(app);

// ── Estáticos ─────────────────────────────────────
const PUB = path.join(__dirname, "..", "public");
app.use(express.static(PUB, { extensions: ["html"] }));
app.get("/store", (req, res) => res.sendFile(path.join(PUB, "store.html")));
app.get("*", (req, res) => res.sendFile(path.join(PUB, "index.html")));

db.init().then(() => {
  app.listen(config.port, () => console.log(`ESQ BYPASS en :${config.port}`));
}).catch(err => { console.error("DB init failed", err); process.exit(1); });
