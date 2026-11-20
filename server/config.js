"use strict";
function req(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}
module.exports = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  sessionSecret: req("SESSION_SECRET", "dev-only-insecure-change-me"),
  databaseUrl: process.env.DATABASE_URL || "",
  pgSsl: process.env.PGSSL === "true",
  vipUser: process.env.VIP_USER || "",
  vipPassHash: process.env.VIP_PASS_HASH || "",
  adminUser: process.env.ADMIN_USER || "",
  adminPassHash: process.env.ADMIN_PASS_HASH || "",
  wallets: {
    usdt_bep20: process.env.WALLET_USDT_BEP20 || "",
    usdt_trc20: process.env.WALLET_USDT_TRC20 || "",
    ltc:         process.env.WALLET_LTC || "",
    btc:         process.env.WALLET_BTC || "",
  },
  planPriceUsd: parseFloat(process.env.PLAN_PRICE_USD || "34.99"),
  planDailyCc: parseInt(process.env.PLAN_DAILY_CC || "25", 10),
};