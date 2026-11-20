(function(){
  "use strict";
  var modal = document.getElementById("ticketModal");
  function open(){ modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); }
  function close(){ modal.classList.remove("open"); modal.setAttribute("aria-hidden","true"); }
  window.Tickets = { open: open, close: close };

  document.getElementById("ticketCancel").addEventListener("click", close);
  document.getElementById("ticketSend").addEventListener("click", async function(){
    var subject = document.getElementById("ticketSubject").value.trim();
    var body = document.getElementById("ticketBody").value.trim();
    var msg = document.getElementById("ticketMsg");
    msg.textContent = ""; msg.className = "ticket-msg";
    try {
      await API.ticket(subject, body);
      msg.textContent = "Ticket enviado."; msg.classList.add("ok");
      setTimeout(close, 1200);
    } catch(e){
      msg.textContent = e.message; msg.classList.add("bad");
    }
  });
})();