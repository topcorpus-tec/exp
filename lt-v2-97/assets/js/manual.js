/* =========================================================================
   Manual Ilustrado — manual.js (lt-v2)

   O mesmo arquivo da lt-v1, com os comentários ajustados à v2: a lógica
   não muda, só o que cada trecho encontra na página.

   Por que não reusar o taping.js: ele carrega coisas que são do produto
   dele — a URL de checkout do curso, um deadline vencido e as janelas
   agendadas do boleto e do bônus 2. Este arquivo repete só o que esta
   página usa:

     - destino do CTA da oferta      ([data-checkout])
     - FAQ, abrir uma fecha as demais (.tp-faq__item)
     - parada das âncoras da oferta   (a[href="#oferta"])
     - setas do carrossel de depoimentos ([data-carrossel])

   O contador de oferta e o botão flutuante saíram na revisão de 25/09 —
   por isso o código dos dois também saiu, em vez de ficar procurando
   elementos que não existem mais.

   A entrada com desfoque na rolagem também saiu: os blocos aparecem
   direto, sem o [data-reveal] no HTML e sem o observer que o animava.

   Carregar com defer.
   ========================================================================= */
(function () {
  "use strict";

  /* =======================================================================
     DESTINO DA COMPRA

     O doc traz três ofertas do mesmo produto na Hotmart, uma por página:

         ?off=u7qj2mgv  → R$97   ← esta página
         ?off=q86wzvlt  → R$67
         ?off=9z1ywsjs  → R$27

     Esta é a página do ticket de 97: "R$97 à vista, ou 12x de R$9,45".
     O que muda entre as três páginas são as duas caixas de preço (dobras
     7 e 9) e esta constante.

     As de 67 e 97 levam &checkoutMode=10, que é o modo de checkout que a
     Hotmart pediu. A de 27 ainda não: veio sem ele quando as URLs foram
     passadas, em 29/09/2026. Se for para valer nas três, é acrescentar o
     mesmo parâmetro lá — a diferença é conhecida, não descuido.

     Vazio aqui deixa todos os CTAs inertes de propósito (ver initCheckout).
     ======================================================================= */
  var CHECKOUT_URL = "https://pay.hotmart.com/W95360090D?off=u7qj2mgv&checkoutMode=10";

  /* =======================================================================
     DESTINO DO CTA DA OFERTA

     Dois botões saem da página: os das duas caixas de preço (a da oferta
     e a do fecho, depois da bio). O hero não tem mais botão; se um voltar,
     ele deve ser âncora para #oferta, e não checkout — quem clica ali
     ainda não viu o preço, e mandar essa pessoa direto para a Hotmart pula
     justamente a dobra que a faz comprar.

     Por isso este trecho continua procurando [data-checkout] no plural:
     se amanhã outro botão precisar ir para o checkout, basta marcá-lo.
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
     PARADA DAS ÂNCORAS DA OFERTA

     Sem JS o botão do hero para no topo da dobra 7, no "A condição de
     hoje", e o botão de compra fica bem abaixo — fora da tela em qualquer
     aparelho. Aqui a rolagem desce até o fim da caixa da oferta
     ficar no pé da tela, com uma folga: o preço e o botão aparecem
     inteiros, e a borda de baixo da caixa mostra que ali termina a oferta.
     Se a tela for alta o bastante para caber a dobra inteira, ela para no
     topo da dobra, como sem JS.
     ======================================================================= */
  function topoNaPagina(el) {
    var y = 0;
    for (; el; el = el.offsetParent) y += el.offsetTop;
    return y;
  }

  function alvoDaOferta() {
    var dobra = document.getElementById("oferta");
    var caixa = document.querySelector("#oferta .tp-offer__box");
    if (!dobra || !caixa) return null;

    var folga = 40;
    var topoDobra = topoNaPagina(dobra)
      - (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);
    var peCaixa = topoNaPagina(caixa) + caixa.offsetHeight;
    return Math.max(topoDobra, peCaixa + folga - window.innerHeight);
  }

  function initAncoras() {
    [].slice.call(document.querySelectorAll('a[href="#oferta"]')).forEach(function (a) {
      a.addEventListener("click", function (e) {
        var y = alvoDaOferta();
        if (y === null) return;
        e.preventDefault();
        var calmo = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: y, behavior: calmo ? "auto" : "smooth" });
        if (history.replaceState) history.replaceState(null, "", "#oferta");
      });
    });
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
     CARROSSEL DOS DEPOIMENTOS

     No desktop a fileira de depoimentos rola de lado, com encaixe em cada
     cartão (CSS). As setas andam um cartão por vez e se apagam nas pontas.
     No celular os cartões ficam empilhados e as setas nem aparecem; o
     código continua ligado, mas não tem o que mover.
     ======================================================================= */
  function initCarrossel() {
    var trilho = document.querySelector("[data-carrossel]");
    var ant = document.querySelector("[data-carrossel-ant]");
    var prox = document.querySelector("[data-carrossel-prox]");
    if (!trilho || !ant || !prox) return;

    function passo() {
      var card = trilho.firstElementChild;
      if (!card) return trilho.clientWidth;
      var gap = parseFloat(getComputedStyle(trilho).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    }

    // Cada seta apaga quando o cartão da sua ponta já está inteiro na
    // fileira. Pela posição da rolagem não dava: o encaixe para alguns
    // pixels antes do fim, por causa do respiro da fileira.
    function atualiza() {
      var caixa = trilho.getBoundingClientRect();
      var primeiro = trilho.firstElementChild;
      var ultimo = trilho.lastElementChild;
      if (!primeiro || !ultimo) return;
      ant.disabled = primeiro.getBoundingClientRect().left >= caixa.left - 2;
      prox.disabled = ultimo.getBoundingClientRect().right <= caixa.right + 2;
    }

    // Depois do clique as setas se reconferem quando a rolagem suave já
    // terminou, sem depender só do evento de scroll, que nem todo
    // navegador entrega a cada quadro.
    function anda(sentido) {
      trilho.scrollBy({ left: sentido * passo() });
      setTimeout(atualiza, 450);
    }

    ant.addEventListener("click", function () { anda(-1); });
    prox.addEventListener("click", function () { anda(1); });
    trilho.addEventListener("scroll", atualiza, { passive: true });
    trilho.addEventListener("scrollend", atualiza);
    window.addEventListener("resize", atualiza);
    atualiza();
  }

  /* =======================================================================
     BOOT
     ======================================================================= */
  function boot() {
    initCheckout();
    initAncoras();
    initFaq();
    initCarrossel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
