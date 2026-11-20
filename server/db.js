"use strict";
const fs = require("fs");
const path = require("path");
const config = require("./config");

let pool = null;
if (config.databaseUrl) {
  const { Pool } = require("pg");
  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.pgSsl ? { rejectUnauthorized: false } : false,
  });
}

const JSON_PATH = path.join(__dirname, "..", "data", "db.json");
let mem = null;
function loadMem() {
  if (mem) return mem;
  try { mem = JSON.parse(fs.readFileSync(JSON_PATH, "utf8")); }
  catch { mem = { users: [], deposits: [], cards: [], tickets: [] }; }
  return mem;
}
function saveMem() {
  fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
  fs.writeFileSync(JSON_PATH, JSON.stringify(mem, null, 2));
}

async function init() {
  if (pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        ident TEXT UNIQUE NOT NULL,
        pass_hash TEXT NOT NULL,
        plan_id TEXT,
        balance_cents INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS deposits (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        method TEXT NOT NULL,
        amount_cents INT NOT NULL,
        txid TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        brand TEXT, last4 TEXT, exp TEXT, level TEXT, bank TEXT, country TEXT,
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        subject TEXT, body TEXT, status TEXT DEFAULT 'open',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } else {
    loadMem();
    saveMem();
  }
}

module.exports = { pool, init, loadMem, saveMem };