/* =========================================================================
   Manual Ilustrado — manual.js

   Por que não reusar o taping.js: ele carrega coisas que são do produto dele
   — a URL de checkout do curso, o deadline 15/09 e as janelas agendadas do
   boleto e do bônus 2. Rodar aquele arquivo aqui deixaria o contador
   vencido e os botões apontando para o curso de taping. Então este arquivo
   repete só os comportamentos que esta página usa, com a mesma mecânica:

     - contador da oferta            ([data-countdown])
     - entrada com desfoque          ([data-reveal])
     - FAQ, abrir uma fecha as demais (.tp-faq__item)
     - botão flutuante               (.tp-sticky)
     - destino dos CTAs              ([data-checkout])

   Atenção: no taping o observer do [data-reveal] mora no form-handler.js,
   que esta página não carrega (não tem formulário). Sem ele o CSS deixaria
   tudo em opacity:0 — por isso o observer está aqui.

   Carregar com defer, no fim do <head> ou no <body>.
   ========================================================================= */
(function () {
  "use strict";

  /* =======================================================================
     DESTINO DA COMPRA

     O doc traz três ofertas do mesmo produto na Hotmart, uma por página:

         ?off=u7qj2mgv  → R$97
         ?off=q86wzvlt  → R$67
         ?off=9z1ywsjs  → R$27   ← esta página

     Esta é a "Página de Vendas #1", cuja dobra 5 fecha em 9x de R$3,39 ou
     R$27 à vista — então o off é o de 27. As dobras 5.1 e 5.2 do doc são as
     ancoragens das outras duas páginas; se um dia elas nascerem, é esta
     constante que muda, e mais nada.

     Vazio aqui deixa todos os CTAs inertes de propósito (ver initCheckout).
     ======================================================================= */
  var CHECKOUT_URL = "https://pay.hotmart.com/W95360090D?off=9z1ywsjs";

  /* =======================================================================
     PENDÊNCIA — FIM DA OFERTA

     A copy diz "até xx/xx às 23h59" sem a data. Vazio aqui mantém o
     comportamento de 23h59 do dia corrente, renovando todo dia — que é o
     mesmo fallback documentado no taping.js. Para fixar a data, preencher
     no formato ISO com fuso de Brasília:
         var DEADLINE = "2026-10-03T23:59:00-03:00";
     ======================================================================= */
  var DEADLINE = "";

  var BRT_OFFSET = -3 * 60 * 60 * 1000;   // Brasília = UTC-3, sem horário de verão

  /* =======================================================================
     DESTINO DOS CTAs
     ======================================================================= */
  function initCheckout() {
    var links = [].slice.call(document.querySelectorAll("[data-checkout]"));
    if (!links.length) return;

    if (!CHECKOUT_URL) {
      links.forEach(function (a) {
        a.setAttribute("aria-disabled", "true");
        a.addEventListener("click", function (ev) { ev.preventDefault(); });
      });
      if (window.console && console.warn) {
        console.warn(
          "[manual] CHECKOUT_URL vazio: " + links.length +
          " CTA(s) inertes. Preencher em assets/js/manual.js."
        );
      }
      return;
    }

    links.forEach(function (a) {
      a.setAttribute("href", CHECKOUT_URL);
      a.removeAttribute("aria-disabled");
    });
  }

  /* =======================================================================
     CONTADOR
     ======================================================================= */
  function endOfDayBrasilia() {
    // Deslocando o epoch, os componentes UTC do objeto passam a ler como Brasília.
    var brt = new Date(Date.now() + BRT_OFFSET);
    var eod = Date.UTC(
      brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate(),
      23, 59, 59, 999
    );
    return eod - BRT_OFFSET;              // de volta ao epoch real
  }

  function resolveTarget(el) {
    var raw = el.getAttribute("data-deadline") || DEADLINE;
    if (raw) {
      var t = Date.parse(raw);
      if (!isNaN(t)) return t;
    }
    return endOfDayBrasilia();
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function initCountdowns() {
    var nodes = [].slice.call(document.querySelectorAll("[data-countdown]"));
    if (!nodes.length) return;

    var clocks = nodes.map(function (el) {
      return {
        el: el,
        fixed: !!(el.getAttribute("data-deadline") || DEADLINE),
        target: resolveTarget(el),
        out: {
          days:    el.querySelector('[data-count="days"]'),
          hours:   el.querySelector('[data-count="hours"]'),
          minutes: el.querySelector('[data-count="minutes"]'),
          seconds: el.querySelector('[data-count="seconds"]')
        }
      };
    });

    function tick() {
      var now = Date.now();

      clocks.forEach(function (c) {
        // Sem data fixa o alvo é o fim do dia: passada a virada, renova.
        if (!c.fixed && now >= c.target) c.target = endOfDayBrasilia();

        var left = Math.max(0, c.target - now);
        var s = Math.floor(left / 1000);

        var d = Math.floor(s / 86400); s -= d * 86400;
        var h = Math.floor(s / 3600);  s -= h * 3600;
        var m = Math.floor(s / 60);    s -= m * 60;

        if (c.out.days)    c.out.days.textContent    = pad(d);
        if (c.out.hours)   c.out.hours.textContent   = pad(h);
        if (c.out.minutes) c.out.minutes.textContent = pad(m);
        if (c.out.seconds) c.out.seconds.textContent = pad(s);
      });
    }

    tick();
    setInterval(tick, 1000);
  }

  /* =======================================================================
     ENTRADA COM DESFOQUE

     O CSS deixa [data-reveal] em opacity:0 até a classe .is-revealed. O
     .is-settled, depois, tira o filtro de cena para não manter uma camada de
     composição viva em cada elemento revelado.
     ======================================================================= */
  var SETTLE_MS = 1100;   // 760ms de transição + 180ms de escalonamento + folga

  function initReveal() {
    var els = [].slice.call(document.querySelectorAll("[data-reveal]"));
    if (!els.length) return;

    function settle(el) {
      if (el.__settle) return;
      el.__settle = setTimeout(function () { el.classList.add("is-settled"); }, SETTLE_MS);
    }

    // Navegador sem IntersectionObserver: mostra tudo de uma vez, sem animar.
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) {
        el.classList.add("is-revealed", "is-settled");
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-revealed");
        settle(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    els.forEach(function (el) { io.observe(el); });
  }

  /* =======================================================================
     FAQ — abrir uma pergunta fecha as demais
     ======================================================================= */
  function initFaq() {
    var items = [].slice.call(document.querySelectorAll(".tp-faq__item"));
    items.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (!item.open) return;
        items.forEach(function (other) { if (other !== item) other.open = false; });
      });
    });
  }

  /* =======================================================================
     BOTÃO FLUTUANTE — aparece quando o hero sai de vista
     ======================================================================= */
  function initStickyCta() {
    var bar  = document.querySelector(".tp-sticky");
    var hero = document.querySelector(".tp-hero");
    if (!bar || !hero) return;

    // Sem IntersectionObserver, deixa a barra visível: melhor sempre do que nunca.
    if (!("IntersectionObserver" in window)) {
      bar.classList.add("is-visible");
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      bar.classList.toggle("is-visible", !entries[0].isIntersecting);
    }, { rootMargin: "-120px 0px 0px 0px" });
    io.observe(hero);
  }

  /* =======================================================================
     BOOT
     ======================================================================= */
  function boot() {
    initCheckout();
    initCountdowns();
    initReveal();
    initFaq();
    initStickyCta();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
