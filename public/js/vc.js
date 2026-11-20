(function(){
  "use strict";
  var cards = [];
  async function load(){
    try {
      const r = await API.cards();
      cards = r.cards || [];
      const wrap = document.getElementById("vcCards");
      wrap.innerHTML = "";
      if (!cards.length) { document.getElementById("vcEmpty").style.display = ""; return; }
      document.getElementById("vcEmpty").style.display = "none";
      cards.forEach(function(c){
        var row = document.createElement("div");
        row.className = "vc-card";
        row.innerHTML = '<div class="vc-card-info"><div class="vc-card-num">•••• ' + UI.esc(c.last4) + '</div><div class="vc-card-sub">' + UI.esc(c.brand || "") + ' · ' + UI.esc(c.exp || "") + (c.verified ? " · verificada" : "") + '</div></div><button class="vc-go" type="button">Verificar</button>';
        row.querySelector(".vc-go").addEventListener("click", function(){ run(c); });
        wrap.appendChild(row);
      });
    } catch(e){}
  }
  function stage(id){
    ["vcStageIdle","vcStageRun","vcStageDone"].forEach(function(s){
      document.getElementById(s).classList.toggle("on", s === id);
    });
  }
  async function run(card){
    stage("vcStageRun");
    var pct = 0, bar = document.getElementById("vcBar"), pctEl = document.getElementById("vcPct");
    var names = ["Localizando la tarjeta…","Solicitando el cargo…","Esperando respuesta…","Registrando…"];
    var list = document.querySelectorAll("#vcList li");
    var iv = setInterval(function(){
      pct += 10 + Math.random()*20;
      if (pct > 100) pct = 100;
      bar.style.width = pct + "%"; pctEl.textContent = Math.round(pct) + "%";
      var idx = Math.min(list.length-1, Math.floor(pct/25));
      list.forEach(function(li,i){ li.classList.toggle("act", i === idx); li.classList.toggle("done", i < idx); });
      document.getElementById("vcStepName").textContent = names[idx];
      if (pct === 100) {
        clearInterval(iv);
        API.verifyCard(card.id).then(function(r){
          document.getElementById("vcResultNum").textContent = "•••• " + r.card.last4;
          document.getElementById("vcResultSub").textContent = (r.card.brand||"") + " · " + (r.card.exp||"");
          stage("vcStageDone");
          load();
        }).catch(function(){ stage("vcStageIdle"); });
      }
    }, 220);
  }
  document.getElementById("vcAgain").addEventListener("click", function(){ stage("vcStageIdle"); });
  window.addEventListener("load", load);
})();