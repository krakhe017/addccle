"use strict";
const db = require("./db");

async function create(userId, subject, body) {
  if (!subject || !subject.trim()) return { error: "Asunto obligatorio" };
  if (!body || body.trim().length < 5) return { error: "Mensaje demasiado corto" };
  if (db.pool) {
    const r = await db.pool.query(
      "INSERT INTO tickets (user_id, subject, body) VALUES ($1,$2,$3) RETURNING *",
      [userId, subject.trim(), body.trim()]
    );
    return { ticket: r.rows[0] };
  }
  const mem = db.loadMem();
  const t = { id: mem.tickets.length + 1, user_id: userId, subject: subject.trim(), body: body.trim(), status: "open", created_at: new Date().toISOString() };
  mem.tickets.push(t); db.saveMem(); return { ticket: t };
}

module.exports = { create };