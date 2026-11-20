(function(){
  "use strict";
  var $ = UI.$, $$ = UI.$$, esc = UI.esc;
  UI.clock(); UI.bindBlackout();
  UI.typeText(document.getElementById("typeText"), "ESQ BYPASS", 60);

  var state = { mode: "login", captchaToken: "", busy: false, attempts: 0 };
  var tabs = $$("#tabs .tab");
  var tabline = document.getElementById("tabline");
  function moveTabline(){
    var active = document.querySelector("#tabs .tab.active"); if(!active||!tabline) return;
    var r = active.getBoundingClientRect(), pr = active.parentElement.getBoundingClientRect();
    tabline.style.width = r.width + "px";
    tabline.style.transform = "translateX(" + (r.left - pr.left) + "px)";
  }
  tabs.forEach(function(t){
    t.addEventListener("click", function(){ setMode(t.dataset.mode); });
  });
  function setMode(m){
    state.mode = m;
    tabs.forEach(function(t){ t.classList.toggle("active", t.dataset.mode === m); });
    document.getElementById("rowPass2").style.display = m === "register" ? "" : "none";
    document.getElementById("meter").style.display = m === "register" ? "" : "none";
    document.getElementById("rowTerms").style.display = m === "register" ? "" : "none";
    document.getElementById("identLabel").textContent = m === "register" ? "Usuario (3+ chars)" : "Usuario";
    document.getElementById("submitTxt").textContent = m === "register" ? "crear cuenta" : "entrar";
    document.getElementById("altLine").innerHTML = m === "register"
      ? '¿Ya tienes cuenta? <a id="altLink" role="button" tabindex="0">Entrar</a>'
      : '¿Aún sin cuenta? <a id="altLink" role="button" tabindex="0">Crear una cuenta</a>';
    bindAlt();
    moveTabline();
    updateSubmitState();
  }
  function bindAlt(){
    var a = document.getElementById("altLink");
    if (a) a.addEventListener("click", function(){ setMode(state.mode === "login" ? "register" : "login"); });
  }
  bindAlt();
  setTimeout(moveTabline, 30);
  window.addEventListener("resize", moveTabline);

  // Eye
  var pass = document.getElementById("pass"), eye = document.getElementById("eye");
  eye.addEventListener("click", function(){
    var t = pass.type === "password" ? "text" : "password";
    pass.type = t; eye.textContent = t === "text" ? "ocultar" : "mostrar";
  });

  // Caps
  var caps = document.getElementById("capsWarn");
  function capsCheck(e){ if(!caps) return; caps.classList.toggle("show", e.getModifierState && e.getModifierState("CapsLock")); }
  pass.addEventListener("keyup", capsCheck);
  pass.addEventListener("keydown", capsCheck);

  // Strength
  var bars = $$("#bars span");
  function score(p){
    var s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }
  function entropy(p){
    var set = 0;
    if (/[a-z]/.test(p)) set += 26;
    if (/[A-Z]/.test(p)) set += 26;
    if (/\d/.test(p)) set += 10;
    if (/[^A-Za-z0-9]/.test(p)) set += 32;
    return set ? Math.round(p.length * Math.log2(set)) : 0;
  }
  function updateStrength(){
    var p = pass.value || "";
    var s = score(p);
    var colors = ["#2b3037","#b57170","#b8a06a","#9aa4b0","#7fa88a"];
    bars.forEach(function(b,i){ b.style.background = i < s ? colors[s] : "#1b1f24"; });
    document.getElementById("strengthTxt").textContent = "fuerza · " + ["—","muy baja","baja","media","alta","muy alta"][s];
    document.getElementById("entropyTxt").textContent = entropy(p) + " bits";
  }
  pass.addEventListener("input", updateStrength);

  // Captcha
  var captchaBox = document.getElementById("captchaCanvas");
  function loadCaptcha(){
    API.captcha().then(function(r){
      captchaBox.innerHTML = r.svg;
      state.captchaToken = r.token;
      document.getElementById("captchaInput").value = "";
      updateSubmitState();
    }).catch(function(){ document.getElementById("errCaptcha").textContent = "No se pudo cargar el captcha"; });
  }
  document.getElementById("captchaRefresh").addEventListener("click", loadCaptcha);
  loadCaptcha();

  // Submit state
  var submit = document.getElementById("submitBtn");
  function updateSubmitState(){
    var ok = state.captchaToken &&
      document.getElementById("ident").value.trim().length >= 3 &&
      pass.value.length >= 8 &&
      (!state.mode.startsWith("reg") || document.getElementById("terms").checked) &&
      (state.mode !== "register" || pass.value === document.getElementById("pass2").value) &&
      !state.busy;
    submit.disabled = !ok;
  }
  ["ident","pass","pass2","terms","captchaInput"].forEach(function(id){
    var el = document.getElementById(id); if (el) el.addEventListener("input", updateSubmitState);
    if (el) el.addEventListener("change", updateSubmitState);
  });

  // Submit
  var form = document.getElementById("authForm");
  form.addEventListener("submit", async function(e){
    e.preventDefault();
    if (state.busy) return;
    state.busy = true; submit.classList.add("loading"); submit.disabled = true;
    var msg = document.getElementById("formMsg"); msg.textContent = ""; msg.className = "msg";
    var ident = document.getElementById("ident").value.trim();
    var p = pass.value;
    var cap = document.getElementById("captchaInput").value.trim();
    try {
      var r;
      if (state.mode === "register") {
        r = await API.register(ident, p, state.captchaToken, cap);
      } else {
        r = await API.login(ident, p, state.captchaToken, cap);
      }
      msg.textContent = "OK. Redirigiendo…"; msg.classList.add("ok");
      window.location.href = "/store";
    } catch(err) {
      state.attempts++;
      msg.textContent = err.message || "Error"; msg.classList.add("bad");
      loadCaptcha();
      if (state.attempts >= 3) {
        submit.disabled = true;
        setTimeout(function(){ state.attempts = 0; updateSubmitState(); }, 5000);
      }
    } finally {
      state.busy = false; submit.classList.remove("loading"); updateSubmitState();
    }
  });

  // Auto-redirect si ya hay sesión
  API.me().then(function(){ window.location.href = "/store"; }).catch(function(){});
})();