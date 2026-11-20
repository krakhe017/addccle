"use strict";
const db = require("./db");
const config = require("./config");

async function create(userId, method, amountCents, txid) {
  if (db.pool) {
    const r = await db.pool.query(
      "INSERT INTO deposits (user_id, method, amount_cents, txid) VALUES ($1,$2,$3,$4) RETURNING *",
      [userId, method, amountCents, txid]
    );
    return r.rows[0];
  }
  const mem = db.loadMem();
  const d = { id: mem.deposits.length + 1, user_id: userId, method, amount_cents: amountCents, txid, status: "pending", created_at: new Date().toISOString() };
  mem.deposits.push(d); db.saveMem(); return d;
}

async function listMine(userId) {
  if (db.pool) {
    const r = await db.pool.query("SELECT * FROM deposits WHERE user_id=$1 ORDER BY id DESC", [userId]);
    return r.rows;
  }
  return db.loadMem().deposits.filter(d => d.user_id === userId).slice().reverse();
}

async function listPending() {
  if (db.pool) {
    const r = await db.pool.query("SELECT * FROM deposits WHERE status='pending' ORDER BY id DESC");
    return r.rows;
  }
  return db.loadMem().deposits.filter(d => d.status === "pending");
}

async function decide(id, approve) {
  if (db.pool) {
    const r = await db.pool.query("SELECT * FROM deposits WHERE id=$1", [id]);
    const d = r.rows[0]; if (!d) return null;
    const status = approve ? "confirmed" : "rejected";
    await db.pool.query("UPDATE deposits SET status=$1 WHERE id=$2", [status, id]);
    if (approve) {
      await db.pool.query("UPDATE users SET balance_cents = balance_cents + $1 WHERE id=$2", [d.amount_cents, d.user_id]);
      if (d.amount_cents >= Math.round(config.planPriceUsd * 100)) {
        await db.pool.query("UPDATE users SET plan_id='lifetime' WHERE id=$1", [d.user_id]);
      }
    }
    return { ...d, status };
  }
  const mem = db.loadMem();
  const d = mem.deposits.find(x => x.id === id); if (!d) return null;
  d.status = approve ? "confirmed" : "rejected";
  if (approve) {
    const u = mem.users.find(x => x.id === d.user_id);
    if (u) {
      u.balance_cents = (u.balance_cents || 0) + d.amount_cents;
      if (d.amount_cents >= Math.round(config.planPriceUsd * 100)) u.plan_id = "lifetime";
    }
  }
  db.saveMem(); return d;
}

module.exports = { create, listMine, listPending, decide };