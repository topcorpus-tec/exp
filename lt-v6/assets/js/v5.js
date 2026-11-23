/* =========================================================================
   Manual Ilustrado — /lt-v6/ — v5.js

   Duas animações de entrada, as duas disparadas quando o bloco aparece na
   tela (IntersectionObserver), sem mexer na rolagem:

     - bônus 2: as mensagens do WhatsApp entram uma a uma;
     - dobra 2: os pontos e os balões das dores entram na ordem dos números.

   Na v5 a dobra 2 prendia o palco na tela e girava o corpo com a rolagem;
   a v6 tirou isso (pedido de 23/11/2026: só a frente, sem travar o scroll).
   Sem IntersectionObserver, nada fica escondido.

   Carregar com defer.
   ========================================================================= */
/* Bônus 2: as mensagens do WhatsApp entram quando o celular aparece. */
(function () {
  "use strict";
  var zap = document.querySelector(".v5-zap");
  if (!zap || !("IntersectionObserver" in window)) return;
  zap.classList.add("is-js");
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { zap.classList.add("is-vista"); io.disconnect(); }
    });
  }, { threshold: 0.4 });
  io.observe(zap);
})();

/* Dobra 2: as dores entram quando a figura aparece. O CSS esconde os
   pontos só depois que o JS marca .is-js, e o atraso de cada um vem do
   --i no HTML. */
(function () {
  "use strict";
  var secao = document.querySelector("[data-v6-dores]");
  if (!secao || !("IntersectionObserver" in window)) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  secao.classList.add("is-js");
  var alvo = secao.querySelector(".v6-corpo") || secao;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { secao.classList.add("is-vista"); io.disconnect(); }
    });
  }, { threshold: 0.25 });
  io.observe(alvo);
})();
