(function(){
  "use strict";
  var $ = UI.$;
  var priceUsd = 34.99;
  var state = { method: null, address: "" };

  function stage(id){
    ["buyStageHome","buyStageMethod","buyStagePay","buyStageSent","buyStageAdmin"].forEach(function(s){
      document.getElementById(s).classList.toggle("on", s === id);
    });
  }
  function open(){ document.getElementById("buyPage").classList.add("on"); stage("buyStageHome"); refresh(); }
  function close(){ document.getElementById("buyPage").classList.remove("on"); }
  window.Buy = { open: open, close: close };

  document.getElementById("buyClose").addEventListener("click", close);
  document.getElementById("goRecharge").addEventListener("click", function(){ stage("buyStageMethod"); });
  document.getElementById("backToHome").addEventListener("click", function(){ stage("buyStageHome"); });
  document.getElementById("backToMethod").addEventListener("click", function(){ stage("buyStageMethod"); });
  document.getElementById("sentHome").addEventListener("click", function(){ stage("buyStageHome"); });

  document.querySelectorAll(".pay-opt").forEach(function(b){
    b.addEventListener("click", async function(){
      state.method = b.dataset.key;
      var names = { usdt_bep20:["USDT","BEP20 (BSC)"], usdt_trc20:["USDT","TRC20 (TRON)"], ltc:["Litecoin","LTC"], btc:["Bitcoin","BTC"] };
      document.getElementById("payDetailName").textContent = "Depositar " + names[state.method][0];
      document.getElementById("payDetailNet").textContent = names[state.method][1];
      document.getElementById("payAmount").textContent = priceUsd + " USD";
      try {
        var r = await API.wallet(state.method);
        state.address = r.address;
        document.getElementById("payAddr").textContent = r.address;
      } catch(e){
        document.getElementById("payAddr").textContent = "Método no configurado";
        state.address = "";
      }
      stage("buyStagePay");
    });
  });

  document.getElementById("payCopy").addEventListener("click", function(){
    if (!state.address) return;
    navigator.clipboard.writeText(state.address);
    var b = document.getElementById("payCopy"); b.textContent = "Copiado"; b.classList.add("done");
    setTimeout(function(){ b.textContent = "Copiar"; b.classList.remove("done"); }, 1400);
  });

  document.getElementById("paySubmit").addEventListener("click", async function(){
    var txid = document.getElementById("payTxid").value.trim();
    var err = document.getElementById("payTxidErr");
    err.textContent = "";
    if (txid.length < 10) { err.textContent = "TXID inválido"; return; }
    try {
      var amountCents = Math.round(priceUsd * 100);
      var r = await API.deposit(state.method, amountCents, txid);
      document.getElementById("sentRef").textContent = r.deposit.txid;
      document.getElementById("sentAmt").textContent = priceUsd + " USD";
      document.getElementById("sentNet").textContent = state.method;
      stage("buyStageSent");
    } catch(e){ err.textContent = e.message; }
  });

  async function refresh(){
    try {
      var r = await API.depositsMine();
      var list = r.deposits || [];
      var depBlock = document.getElementById("depBlock");
      var depList = document.getElementById("depList");
      if (!list.length) { depBlock.style.display = "none"; }
      else {
        depBlock.style.display = "";
        depList.innerHTML = "";
        list.forEach(function(d){
          var div = document.createElement("div");
          div.className = "dep-item " + d.status;
          div.innerHTML = '<div class="dep-meta"><span>#' + d.id + '</span><span>' + UI.esc(d.method) + '</span></div>' +
            '<div class="dep-amount"><b>$' + (d.amount_cents/100).toFixed(2) + '</b><i>' + UI.esc(d.status) + '</i></div>' +
            '<div class="dep-tx"><span>TXID</span><code>' + UI.esc(d.txid) + '</code></div>';
          depList.appendChild(div);
        });
      }
    } catch(e){}
  }
})();