window.API = (function(){
  "use strict";
  async function req(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    opts.credentials = "same-origin";
    const r = await fetch(path, opts);
    let data = null;
    try { data = await r.json(); } catch {}
    if (!r.ok) throw new Error((data && data.error) || ("HTTP " + r.status));
    return data;
  }
  return {
    get: (p) => req(p),
    post: (p, body) => req(p, { method: "POST", body: JSON.stringify(body || {}) }),
    captcha: () => req("/api/captcha"),
    login: (ident, pass, captchaToken, captchaInput) =>
      req("/api/login", { method: "POST", body: JSON.stringify({ ident, pass, captchaToken, captchaInput }) }),
    register: (ident, pass, captchaToken, captchaInput) =>
      req("/api/register", { method: "POST", body: JSON.stringify({ ident, pass, captchaToken, captchaInput }) }),
    logout: () => req("/api/logout", { method: "POST" }),
    me: () => req("/api/me"),
    wallet: (m) => req("/api/wallet/" + m),
    paymentMethods: () => req("/api/payment-methods"),
    depositsMine: () => req("/api/deposits/mine"),
    deposit: (method, amountCents, txid) => req("/api/deposits", { method:"POST", body: JSON.stringify({ method, amountCents, txid }) }),
    cards: () => req("/api/cards"),
    addCard: (num, exp, cvc) => req("/api/cards", { method:"POST", body: JSON.stringify({ num, exp, cvc }) }),
    verifyCard: (id) => req("/api/cards/" + id + "/verify", { method:"POST" }),
    ticket: (subject, body) => req("/api/tickets", { method:"POST", body: JSON.stringify({ subject, body }) }),
  };
})();