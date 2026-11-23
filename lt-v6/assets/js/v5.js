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

/* Dobra 2 no celular: um traço fino liga cada ponto do corpo ao seu item
   na legenda à direita (pedido de 23/11/2026). O traço sai do ponto, vai
   reto até a borda da figura e faz uma curva suave até o número do item.
   É um SVG dentro do .v6-corpo, depois da imagem e antes dos pontos (fica
   por cima do corpo e por baixo dos números). Redesenha quando a tela
   muda ou a imagem e as fontes terminam de carregar; no desktop (900px ou
   mais) não desenha nada, porque lá os balões já ficam ao lado. */
(function () {
  "use strict";
  var secao = document.querySelector("[data-v6-dores]");
  if (!secao || !window.matchMedia || !window.requestAnimationFrame) return;
  var corpo = secao.querySelector(".v6-corpo");
  var lista = secao.querySelector(".v6-dores__lista");
  var img = corpo && corpo.querySelector(".v6-corpo__img");
  if (!corpo || !lista || !img) return;

  var celular = matchMedia("(max-width: 899px)");
  var NS = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "v6-fios");
  svg.setAttribute("aria-hidden", "true");
  corpo.insertBefore(svg, img.nextSibling);

  var pedido = 0;
  function desenha() {
    pedido = 0;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!celular.matches) return;

    var base = corpo.getBoundingClientRect();
    var pontos = corpo.querySelectorAll(".v6-dor__ponto");
    var itens = lista.querySelectorAll("li");
    var borda = base.width + 6;

    [].forEach.call(pontos, function (p, i) {
      var li = itens[i];
      if (!li) return;
      var alvo = li.querySelector("span") || li;
      var a = p.getBoundingClientRect();
      var b = alvo.getBoundingClientRect();
      var x1 = a.left + a.width / 2 - base.left;
      var y1 = a.top + a.height / 2 - base.top;
      var x2 = b.left - 5 - base.left;
      var y2 = b.top + b.height / 2 - base.top;
      var xb = Math.min(Math.max(borda, x1 + 8), x2 - 10);
      var meio = xb + (x2 - xb) * 0.5;

      var linha = document.createElementNS(NS, "path");
      linha.setAttribute("d",
        "M" + x1 + " " + y1 + " H" + xb +
        " C" + meio + " " + y1 + " " + meio + " " + y2 + " " + x2 + " " + y2);
      linha.setAttribute("pathLength", "1");
      linha.style.setProperty("--i", i);
      svg.appendChild(linha);

      var ponta = document.createElementNS(NS, "circle");
      ponta.setAttribute("cx", x2);
      ponta.setAttribute("cy", y2);
      ponta.setAttribute("r", 1.8);
      ponta.style.setProperty("--i", i);
      svg.appendChild(ponta);
    });
  }
  function agenda() { if (!pedido) pedido = requestAnimationFrame(desenha); }

  window.addEventListener("resize", agenda);
  if (celular.addEventListener) celular.addEventListener("change", agenda);
  if (!img.complete) img.addEventListener("load", agenda, { once: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(agenda);
  agenda();
})();
