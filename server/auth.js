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
      "INSERT INTO users (ident, pass_hash, plan_id) VALUES ($1,$2,$3) RETURNING *",
      [ident, passHash, planId || null]
    );
    return r.rows[0];
  }
  const mem = db.loadMem();
  const u = { id: mem.users.length + 1, ident, pass_hash: passHash, plan_id: planId || null, balance_cents: 0 };
  mem.users.push(u);
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
  // VIP: solo por backend
  if (config.vipUser && ident === norm(config.vipUser) && config.vipPassHash) {
    if (await bcrypt.compare(pass, config.vipPassHash)) {
      let u = await findUser(ident);
      if (!u) u = await createUser(ident, config.vipPassHash, "lifetime");
      if (db.pool && u.plan_id !== "lifetime") {
        await db.pool.query("UPDATE users SET plan_id='lifetime' WHERE id=$1", [u.id]);
        u.plan_id = "lifetime";
      }
      return { user: u, vip: true };
    }
  }
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