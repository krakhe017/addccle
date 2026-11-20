"use strict";
const bcrypt = require("bcryptjs");
const config = require("./config");
const deposits = require("./deposits");

function isAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(403).json({ error: "No autorizado" });
}

function routes(app) {
  app.post("/api/admin/login", async (req, res) => {
    const { user, pass } = req.body || {};
    if (!config.adminUser || !config.adminPassHash) return res.status(503).json({ error: "Admin no configurado" });
    if (String(user || "").toLowerCase() !== config.adminUser.toLowerCase()) return res.status(401).json({ error: "Credenciales inválidas" });
    const ok = await bcrypt.compare(String(pass || ""), config.adminPassHash);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });
    req.session.isAdmin = true;
    res.json({ ok: true });
  });

  app.get("/api/admin/deposits", isAdmin, async (req, res) => {
    res.json({ deposits: await deposits.listPending() });
  });

  app.post("/api/admin/deposits/:id", isAdmin, async (req, res) => {
    const approve = !!req.body.approve;
    const d = await deposits.decide(parseInt(req.params.id, 10), approve);
    if (!d) return res.status(404).json({ error: "No encontrado" });
    res.json({ deposit: d });
  });
}

module.exports = { routes, isAdmin };