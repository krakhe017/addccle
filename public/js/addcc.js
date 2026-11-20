(function(){
  "use strict";
  var $ = UI.$;
  var mode = "token";
  var tokenLen = 153;

  var tokenEl = document.getElementById("ccToken");
  var hint = document.getElementById("ccTokenHint");
  function updHint(){
    var n = (tokenEl.value || "").length;
    hint.textContent = n + " / " + tokenLen + " caracteres";
    hint.className = "cc-token-hint " + (n === tokenLen ? "ok" : (n > tokenLen ? "bad" : ""));
  }
  tokenEl.addEventListener("input", updHint);
  updHint();

  document.querySelectorAll(".cc-mode").forEach(function(b){
    b.addEventListener("click", function(){
      document.querySelectorAll(".cc-mode").forEach(x=>x.classList.remove("on"));
      b.classList.add("on"); mode = b.dataset.m;
      document.getElementById("ccMailRow").classList.toggle("on", mode === "mail");
      document.getElementById("ccNext").textContent = mode === "mail" ? "Continuar con correo + token" : "Continuar con token";
    });
  });

  function step(n){
    document.querySelectorAll(".cc-pane").forEach(function(p,i){
      p.classList.toggle("on", i === n-1);
    });
    document.querySelectorAll("#ccSteps i").forEach(function(el){
      var s = parseInt(el.dataset.s,10);
      el.classList.toggle("on", s === n);
      el.classList.toggle("done", s < n);
    });
  }

  document.getElementById("ccNext").addEventListener("click", function(){
    var err = document.getElementById("ccErr1");
    err.textContent = "";
    if ((tokenEl.value || "").length !== tokenLen) { err.textContent = "El token debe tener " + tokenLen + " caracteres."; return; }
    if (mode === "mail") {
      var mail = document.getElementById("ccName").value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { err.textContent = "Correo inválido."; return; }
    }
    step(2);
    var pct = 0, bar = document.getElementById("ccBar2"), pctEl = document.getElementById("ccPct2");
    var txt = document.getElementById("ccVerifyTxt");
    var names = ["Negociando TLS 1.3…","Verificando token…","Sincronizando sesión…","Listo"];
    var iv = setInterval(function(){
      pct += 12 + Math.random()*18;
      if (pct >= 100) { pct = 100; clearInterval(iv); setTimeout(function(){ step(3); }, 400); }
      bar.style.width = pct + "%"; pctEl.textContent = Math.round(pct) + "%";
      txt.textContent = names[Math.min(names.length-1, Math.floor(pct/30))];
    }, 220);
  });

  // Formato tarjeta
  var num = document.getElementById("ccNum");
  num.addEventListener("input", function(){
    var v = num.value.replace(/\D/g,"").slice(0,19);
    num.value = v.replace(/(.{4})/g, "$1 ").trim();
    document.getElementById("ccPvNum").textContent = num.value || "•••• •••• •••• ••••";
  });
  var exp = document.getElementById("ccExp");
  exp.addEventListener("input", function(){
    var v = exp.value.replace(/\D/g,"").slice(0,4);
    if (v.length >= 3) v = v.slice(0,2) + "/" + v.slice(2);
    exp.value = v;
    document.getElementById("ccPvExp").textContent = v || "MM/YY";
  });
  document.getElementById("ccCvc").addEventListener("input", function(e){
    e.target.value = e.target.value.replace(/\D/g,"").slice(0,4);
  });

  document.getElementById("ccAdd").addEventListener("click", async function(){
    var err = document.getElementById("ccErr");
    err.textContent = "";
    try {
      await API.addCard(num.value, exp.value, document.getElementById("ccCvc").value);
      step(4);
    } catch(e){ err.textContent = e.message; }
  });
  document.getElementById("ccDone").addEventListener("click", function(){ step(1); });
})();