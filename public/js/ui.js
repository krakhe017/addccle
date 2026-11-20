window.UI = (function(){
  "use strict";
  var $ = function(s){ return document.querySelector(s); };
  var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function esc(s){ var d=document.createElement("div"); d.textContent = s==null?"":String(s); return d.innerHTML; }
  function clock(){
    var el = document.getElementById("clockChip"); if(!el) return;
    setInterval(function(){
      var d = new Date();
      el.textContent = [d.getHours(),d.getMinutes(),d.getSeconds()]
        .map(function(n){ return String(n).padStart(2,"0"); }).join(":");
    }, 1000);
  }
  function bindBlackout(){
    var t = document.getElementById("blackoutToggle"); if(!t) return;
    t.addEventListener("click", function(){
      document.body.classList.toggle("pure");
      t.classList.toggle("on");
    });
  }
  function typeText(el, text, speed){
    if (!el) return; var i=0; speed=speed||55;
    (function tick(){ el.textContent = text.slice(0,i++); if(i<=text.length) setTimeout(tick,speed); })();
  }
  return { $:$, $$:$$, esc:esc, clock:clock, bindBlackout:bindBlackout, typeText:typeText };
})();