"use strict";
const crypto = require("crypto");
const config = require("./config");

const store = new Map(); // token -> { code, exp }
const TTL = 5 * 60 * 1000;

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[crypto.randomInt(chars.length)];
  return s;
}

function signToken() {
  return crypto.randomBytes(18).toString("base64url");
}

function svgFor(code) {
  const w = 216, h = 62;
  let noise = "";
  for (let i = 0; i < 26; i++) {
    const x1 = crypto.randomInt(w), y1 = crypto.randomInt(h);
    const x2 = crypto.randomInt(w), y2 = crypto.randomInt(h);
    noise += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(150,160,175,${(0.08 + Math.random()*0.15).toFixed(2)})" stroke-width="1"/>`;
  }
  let letters = "";
  const wl = w / (code.length + 1);
  for (let i = 0; i < code.length; i++) {
    const x = wl * (i + 1);
    const y = h / 2 + 8 + (Math.random() * 6 - 3);
    const rot = (Math.random() * 20 - 10).toFixed(1);
    letters += `<text x="${x}" y="${y}" font-family="ui-monospace, Menlo, monospace" font-size="26" font-weight="600" fill="#dfe4ea" text-anchor="middle" transform="rotate(${rot} ${x} ${y})">${code[i]}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#0a0b0e"/>${noise}${letters}</svg>`;
}

function issue() {
  const code = makeCode();
  const token = signToken();
  store.set(token, { code, exp: Date.now() + TTL });
  return { token, svg: svgFor(code) };
}

function verify(token, input) {
  const e = store.get(token);
  if (!e) return false;
  store.delete(token);
  if (e.exp < Date.now()) return false;
  return String(input || "").trim().toUpperCase() === e.code;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) if (v.exp < now) store.delete(k);
}, 60 * 1000).unref();

module.exports = { issue, verify };