"use strict";
const bcrypt = require("bcryptjs");
const config = require("./config");
const db = require("./db");

function norm(s) { return String(s || "").trim().toLowerCase(); }

async function findUser(ident) {
  if (db.pool) {
    const r = await db.pool.query("SELECT * FROM users WHERE ident=$1", [ident]);
    return r.rows[0] || null;
  }
  return db.loadMem().users.find(u => u.ident === ident) || null;
}

async function createUser(ident, passHash, planId) {
  if (db.pool) {
    const r = await db.pool.query(
      "INSERT INTO users (ident, pass_hash, plan_id) VALUES ($1,$2,$3) ON CONFLICT (ident) DO UPDATE SET pass_hash=$2 RETURNING *",
      [ident, passHash, planId || null]
    );
    return r.rows[0];
  }
  const mem = db.loadMem();
  let u = mem.users.find(x => x.ident === ident);
  if (u) {
    u.pass_hash = passHash;
    if (planId) u.plan_id = planId;
  } else {
    u = { id: mem.users.length + 1, ident, pass_hash: passHash, plan_id: planId || null, balance_cents: 0 };
    mem.users.push(u);
  }
  db.saveMem();
  return u;
}

async function register(ident, pass) {
  ident = norm(ident);
  if (!ident || ident.length < 3) return { error: "Usuario inválido" };
  if (!pass || pass.length < 8) return { error: "Contraseña demasiado corta" };
  if (await findUser(ident)) return { error: "Ese usuario ya existe" };
  const hash = await bcrypt.hash(pass, 12);
  const u = await createUser(ident, hash, null);
  return { user: u };
}

async function login(ident, pass) {
  ident = norm(ident);

  // 1. USUARIO VIP
  if (config.vipUser && ident === norm(config.vipUser) && config.vipPassHash) {
    const isMatch = await bcrypt.compare(pass, config.vipPassHash);
    if (isMatch) {
      let u = await createUser(ident, config.vipPassHash, "lifetime");
      return { user: u, vip: true };
    }
  }

  // 2. USUARIO DEMO
  const demoUser = process.env.DEMO_USER;
  const demoPassHash = process.env.DEMO_PASS_HASH;
  if (demoUser && ident === norm(demoUser) && demoPassHash) {
    const isMatch = await bcrypt.compare(pass, demoPassHash);
    if (isMatch) {
      let u = await createUser(ident, demoPassHash, "demo");
      return { user: u, vip: false };
    }
  }

  // 3. USUARIOS NORMALES
  const u = await findUser(ident);
  if (!u) return { error: "Credenciales inválidas" };
  const ok = await bcrypt.compare(pass, u.pass_hash);
  if (!ok) return { error: "Credenciales inválidas" };
  return { user: u };
}

function publicUser(u) {
  return { id: u.id, ident: u.ident, planId: u.plan_id || null, balanceCents: u.balance_cents || 0 };
}

module.exports = { register, login, findUser, publicUser, norm };
