/* =========================================================================
   Manual Ilustrado — /lt-v5/ — v5.js

   Só a dobra 2 (as dores). O resto da página é o manual.js da v4 verde.

   A seção [data-v5-dores] é mais alta que a tela e o palco fica preso no
   topo (sticky). A posição da rolagem dentro dela vira um número p, de 0
   (o palco acabou de prender) a 1 (vai soltar), e o roteiro é:

     0,06 a 0,30   os quatro balões da frente, um de cada vez
     0,38 a 0,52   o corpo gira e mostra as costas
     0,58 a 0,90   os cinco balões das costas

   Voltar a rolagem desfaz o roteiro na ordem inversa. Sem JS (ou sem
   IntersectionObserver/requestAnimationFrame), a seção fica baixa e mostra
   a frente com os balões abertos, que é o que o CSS faz sozinho.

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

(function () {
  "use strict";

  var secao = document.querySelector("[data-v5-dores]");
  if (!secao || !window.requestAnimationFrame) return;

  var palco = secao.querySelector(".v5-dores__palco");
  var corpo = secao.querySelector("[data-v5-corpo]");
  var giro = secao.querySelector(".v5-corpo__giro");
  var baloes = [].slice.call(secao.querySelectorAll(".v5-balao"));
  var frente = baloes.filter(function (b) { return b.getAttribute("data-face") === "frente"; });
  var costas = baloes.filter(function (b) { return b.getAttribute("data-face") === "costas"; });

  var LIMIAR_FRENTE = [0.06, 0.14, 0.22, 0.30];
  var LIMIAR_COSTAS = [0.58, 0.66, 0.74, 0.82, 0.90];
  var GIRO_INI = 0.38, GIRO_FIM = 0.52;

  secao.classList.add("is-js");

  /* Para conferir o roteiro sem rolar (prints de revisão): ?v5p=0.3 trava
     o p nesse valor. Sem o parâmetro, nada muda. */
  var TESTE = (location.search.match(/[?&]v5p=([\d.]+)/) || [])[1];
  TESTE = TESTE ? Math.min(1, Math.max(0, parseFloat(TESTE))) : null;

  function suave(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }

  /* ---- No celular, o balão que não cabe do lado dele troca de lado ---- */
  var celular = window.matchMedia ? matchMedia("(max-width: 899px)") : null;
  function ajustaLados() {
    var vw = document.documentElement.clientWidth;
    var r = corpo.getBoundingClientRect();
    baloes.forEach(function (b) {
      b.removeAttribute("data-lado-cel");
      if (!celular || !celular.matches) return;
      var txt = b.querySelector(".v5-balao__txt");
      var x = parseFloat(b.style.getPropertyValue("--x")) / 100;
      var px = r.left + x * r.width;
      var w = txt.offsetWidth;
      var lado = b.getAttribute("data-lado");
      if (lado === "esq" && px - 8 - w < 8) b.setAttribute("data-lado-cel", "dir");
      if (lado === "dir" && px + 8 + w > vw - 8) b.setAttribute("data-lado-cel", "esq");
    });
  }

  /* ---- O roteiro ------------------------------------------------------ */
  var pedido = false;
  function quadro() {
    pedido = false;
    var r = secao.getBoundingClientRect();
    var vh = window.innerHeight;
    var curso = r.height - vh;
    var p = curso > 0 ? Math.min(1, Math.max(0, -r.top / curso)) : 1;
    if (TESTE !== null) p = TESTE;

    var g = suave((p - GIRO_INI) / (GIRO_FIM - GIRO_INI));
    giro.style.setProperty("--giro", g.toFixed(4));
    giro.style.setProperty("--zoom", (0.04 * p).toFixed(4));
    var deCostas = g >= 0.5;
    secao.classList.toggle("is-costas", deCostas);

    var atual = null;
    frente.forEach(function (b, i) {
      var on = !deCostas && g === 0 && p >= LIMIAR_FRENTE[i];
      b.classList.toggle("is-on", on);
      if (on) atual = b;
    });
    costas.forEach(function (b, i) {
      var on = deCostas && g === 1 && p >= LIMIAR_COSTAS[i];
      b.classList.toggle("is-on", on);
      if (on) atual = b;
    });
    baloes.forEach(function (b) { b.classList.toggle("is-atual", b === atual); });
  }
  function pede() {
    if (pedido) return;
    pedido = true;
    requestAnimationFrame(quadro);
  }

  window.addEventListener("scroll", pede, { passive: true });
  window.addEventListener("resize", function () { ajustaLados(); pede(); });
  [].slice.call(secao.querySelectorAll("img")).forEach(function (img) {
    if (!img.complete) img.addEventListener("load", function () { ajustaLados(); pede(); }, { once: true });
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustaLados);

  ajustaLados();
  quadro();

  if (TESTE !== null) {
    window.addEventListener("load", function () {
      var topo = secao.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo(0, topo + TESTE * (secao.offsetHeight - window.innerHeight));
    });
  }
})();
