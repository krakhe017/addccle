(function(){
  "use strict";
  var $ = UI.$, esc = UI.esc;
  UI.clock(); UI.bindBlackout();
  UI.typeText(document.getElementById("storeType"), "ESQ BYPASS", 60);

  // Cargar usuario
  API.me().then(function(r){
    document.getElementById("nickname").textContent = r.user.ident;
    window.ACC = r.user;
  }).catch(function(){ window.location.href = "/"; });

  document.getElementById("logoutBtn").addEventListener("click", function(){
    API.logout().finally(function(){ window.location.href = "/"; });
  });

  // Navegación
  var storeBody = document.getElementById("storeBody");
  var ccPage = document.getElementById("ccPage");
  var vcPage = document.getElementById("vcPage");
  var buyPage = document.getElementById("buyPage");
  function showStore(){ storeBody.style.display=""; ccPage.classList.remove("on"); vcPage.classList.remove("on"); }
  function showCC(){ storeBody.style.display="none"; ccPage.classList.add("on"); vcPage.classList.remove("on"); }
  function showVC(){ storeBody.style.display="none"; vcPage.classList.add("on"); ccPage.classList.remove("on"); }

  document.getElementById("navAddCC").addEventListener("click", showCC);
  document.getElementById("navVerify").addEventListener("click", showVC);
  document.getElementById("navVerifyBtn").addEventListener("click", function(e){ e.stopPropagation(); showVC(); });
  document.getElementById("navBuyNow").addEventListener("click", function(){
    if (window.Buy) window.Buy.open();
  });
  document.getElementById("navSupport").addEventListener("click", function(){
    if (window.Tickets) window.Tickets.open();
  });
  document.getElementById("ticketBtn").addEventListener("click", function(){
    if (window.Tickets) window.Tickets.open();
  });
  document.getElementById("ccBack").addEventListener("click", showStore);
  document.getElementById("vcBack").addEventListener("click", showStore);
})();