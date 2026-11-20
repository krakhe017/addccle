"use strict";
const db = require("./db");

function mask(num) { return String(num).replace(/\s+/g, "").slice(-4); }
function luhn(num) {
  const s = String(num).replace(/\s+/g, "");
  if (!/^\d{12,19}$/.test(s)) return false;
  let sum = 0, alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let n = parseInt(s[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

async function add(userId, num, exp, cvc) {
  if (!luhn(num)) return { error: "Número de tarjeta inválido" };
  if (!/^\d{2}\/\d{2}$/.test(exp)) return { error: "Fecha inválida (MM/YY)" };
  if (!/^\d{3,4}$/.test(cvc)) return { error: "CVC inválido" };
  const digits = num.replace(/\s+/g, "");
  const brand = digits.startsWith("4") ? "Visa" : digits.startsWith("5") ? "Mastercard" : "Card";
  const level = "platinum";
  const bank = "—";
  const country = "—";
  const last4 = mask(digits);
  if (db.pool) {
    const r = await db.pool.query(
      "INSERT INTO cards (user_id, brand, last4, exp, level, bank, country) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [userId, brand, last4, exp, level, bank, country]
    );
    return { card: r.rows[0] };
  }
  const mem = db.loadMem();
  const c = { id: mem.cards.length + 1, user_id: userId, brand, last4, exp, level, bank, country, verified: false };
  mem.cards.push(c); db.saveMem(); return { card: c };
}

async function listMine(userId) {
  if (db.pool) {
    const r = await db.pool.query("SELECT * FROM cards WHERE user_id=$1 ORDER BY id DESC", [userId]);
    return r.rows;
  }
  return db.loadMem().cards.filter(c => c.user_id === userId).slice().reverse();
}

async function verify(userId, cardId) {
  if (db.pool) {
    const r = await db.pool.query("SELECT * FROM cards WHERE id=$1 AND user_id=$2", [cardId, userId]);
    const c = r.rows[0]; if (!c) return null;
    await db.pool.query("UPDATE cards SET verified=TRUE WHERE id=$1", [cardId]);
    return { ...c, verified: true };
  }
  const mem = db.loadMem();
  const c = mem.cards.find(x => x.id === cardId && x.user_id === userId);
  if (!c) return null; c.verified = true; db.saveMem(); return c;
}

module.exports = { add, listMine, verify };