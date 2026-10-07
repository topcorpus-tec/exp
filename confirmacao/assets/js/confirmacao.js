/* =========================================================================
   Confirmação de compra — confirmacao.js

   Página de obrigado do Manual Ilustrado. Não há checkout aqui: a compra
   já aconteceu. O que roda:

     - link de download do e-book   (um lugar só para trocar a URL)
     - entrada com desfoque         ([data-reveal])
     - sanfona do FAQ               (uma pergunta aberta por vez)

   Atenção: no taping o observer do [data-reveal] mora no form-handler.js,
   que esta página não carrega. Sem ele o CSS deixaria tudo em opacity:0 —
   por isso o observer está aqui.

   Carregar com defer.
   ========================================================================= */
(function () {
  "use strict";

  /* =======================================================================
     DOWNLOAD DO E-BOOK

     O arquivo mora no Drive. Este é o endereço de download direto, não o
     da página de visualização: com ele o clique baixa o PDF na hora, em
     vez de abrir o leitor do Drive e pedir mais um clique de quem acabou
     de pagar.

     O arquivo tem 9,6 MB — abaixo dos 25 MB em que o Drive passa a
     interpor o aviso de "não foi possível verificar o vírus". Se ele for
     trocado por uma versão maior, o download volta a ter essa tela no
     meio, e aí a página de visualização vira a opção menos ruim.

     A pasta precisa continuar compartilhada como "qualquer pessoa com o
     link". Fechar isso quebra o botão sem aviso nenhum.

     É o único lugar da página que precisa ser editado: todos os botões de
     download apontam para cá através do [data-ebook].
     ======================================================================= */
  var EBOOK_URL = "https://drive.google.com/uc?export=download&id=1lHPYh3z6lt_Lxg-NyafG3fpfQRq-kw5Q";

  function initDownload() {
    var botoes = [].slice.call(document.querySelectorAll("[data-ebook]"));
    if (!botoes.length) return;

    if (EBOOK_URL) {
      botoes.forEach(function (a) {
        a.href = EBOOK_URL;
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      });
      return;
    }

    botoes.forEach(function (a) {
      a.classList.add("is-pending");
      a.setAttribute("aria-disabled", "true");
      // href="#" saltaria para o topo e daria a impressão de que algo
      // aconteceu; sem destino o clique não faz nada.
      a.removeAttribute("href");
    });

    if (window.console && console.warn) {
      console.warn(
        "[confirmacao] EBOOK_URL está vazia em assets/js/confirmacao.js: o " +
        "botão de download não leva a lugar nenhum."
      );
    }
  }

  /* =======================================================================
     CONFETES

     Saem do selo de compra aprovada assim que a página abre.

     Não são uma animação em keyframes: cada peça é simulada quadro a
     quadro, com velocidade inicial, gravidade, arrasto do ar e um
     bamboleio lateral. O motivo é que keyframes dão a todas as peças a
     mesma trajetória, e confete com trajetória repetida lê como gráfico.
     Aqui cada uma cai do seu jeito, desacelera quando sobe, ganha
     velocidade quando desce e nunca repete o caminho da vizinha.

     O detalhe que mais pesa no realismo é o giro nos eixos X e Y: a peça
     vira, afina até quase sumir de perfil e volta a abrir. O brilho
     acompanha esse giro — escurece de lado, clareia de frente —, que é o
     que faz um retângulo chapado parecer papel com dois lados.
     ======================================================================= */
  var CONFETE_CORES = [
    "#0285D3", "#14528F", "#01337C", "#7FC4EC",
    "#12854A", "#35D177", "#5AE78F", "#0A5C9E"
  ];

  var GRAVIDADE  = .28;    // px por quadro², a 60Hz
  var ARRASTO_X  = .985;   // o avanço lateral morre devagar
  var ARRASTO_Y  = .965;   // no eixo da queda ele é maior: é o que dá
                           // velocidade terminal, em vez de despencar

  function sorteia(min, max) { return min + Math.random() * (max - min); }

  function initConfete() {
    var camada = document.querySelector("[data-confete]");
    if (!camada) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // A camada nasce dentro do hero só para saber de onde partir. Ficando
    // ali, o recorte do hero comeria as peças poucos décimos depois do
    // baque — confete que some antes de cair não parece confete. Então ela
    // muda para a viewport, ancorada no centro do selo, e a chuva
    // atravessa a tela inteira.
    var selo = document.querySelector(".cf-badge") || camada.parentNode;
    var caixa = selo.getBoundingClientRect();

    document.body.appendChild(camada);
    camada.style.position = "fixed";
    camada.style.left = (caixa.left + caixa.width / 2).toFixed(0) + "px";
    camada.style.top  = (caixa.top + caixa.height / 2).toFixed(0) + "px";
    camada.style.zIndex = "60";

    // Menos peças na tela pequena: o baque é o mesmo e o aparelho é que
    // costuma ser mais fraco.
    var total = window.innerWidth < 640 ? 48 : 76;
    var pecas = [];

    for (var i = 0; i < total; i++) {
      var el = document.createElement("i");

      // Três feitios, em proporções diferentes: fita comprida, retângulo
      // curto (o mais comum) e disco.
      var feitio = Math.random(), larg, alt, raio;
      if (feitio < .18)      { larg = sorteia(3.5, 5.5); alt = sorteia(14, 24); raio = "1px"; }
      else if (feitio < .84) { larg = sorteia(7, 11);    alt = sorteia(9, 15);  raio = "1.5px"; }
      else                   { larg = alt = sorteia(6, 9);                      raio = "50%"; }

      var cor = CONFETE_CORES[(Math.random() * CONFETE_CORES.length) | 0];

      el.style.width  = larg.toFixed(1) + "px";
      el.style.height = alt.toFixed(1) + "px";
      el.style.borderRadius = raio;
      // Um fio de luz numa das pontas: papel brilhante pega a luz de um
      // lado só, e é esse degradê curto que sugere isso.
      el.style.background =
        "linear-gradient(135deg, rgba(255,255,255,.5) 0%, " + cor + " 45%, " + cor + " 100%)";

      // O leque abre para cima e para os lados, como um baque de canhão.
      var ang = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.05;
      var vel = sorteia(6.5, 17);

      pecas.push({
        el: el,
        x: 0, y: 0,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel,
        rz:  sorteia(0, 360), vrz: sorteia(-9, 9),    // giro no plano
        fx:  sorteia(0, 360), vfx: sorteia(-14, 14),  // é este que vira a peça
        fy:  sorteia(0, 360), vfy: sorteia(-8, 8),
        freq: sorteia(.05, .13),      // bamboleio: frequência
        ampl: sorteia(.3, 1.1),       //            e largura
        fase: sorteia(0, Math.PI * 2),
        espera: sorteia(0, 13),       // em quadros — espalha a saída do baque
        vida: 0,
        fim: sorteia(210, 330)
      });

      camada.appendChild(el);
    }

    var anterior = 0;
    var SUMICO = 45;   // quadros de desaparecimento no fim da vida

    function quadro(agora) {
      if (!anterior) anterior = agora;
      // Normaliza pelo tempo real: a 120Hz o intervalo é metade do de
      // 60Hz, e sem isso a mesma física correria ao dobro da velocidade.
      // O teto evita que uma aba voltando do segundo plano dê um salto.
      var passo = Math.min((agora - anterior) / 16.667, 2.5);
      anterior = agora;

      var vivas = 0;

      for (var i = 0; i < pecas.length; i++) {
        var p = pecas[i];

        if (p.espera > 0) { p.espera -= passo; vivas++; continue; }
        if (p.vida >= p.fim) continue;

        p.vida += passo;

        p.vy += GRAVIDADE * passo;
        p.vx *= Math.pow(ARRASTO_X, passo);
        p.vy *= Math.pow(ARRASTO_Y, passo);

        p.x += (p.vx + Math.sin(p.vida * p.freq + p.fase) * p.ampl) * passo;
        p.y += p.vy * passo;

        // O giro perde força junto com o resto do movimento.
        p.vrz *= Math.pow(.995, passo);
        p.vfx *= Math.pow(.997, passo);

        p.rz += p.vrz * passo;
        p.fx += p.vfx * passo;
        p.fy += p.vfy * passo;

        // De perfil a peça escurece; de frente, clareia.
        var face = Math.abs(Math.cos(p.fx * Math.PI / 180));
        var restante = p.fim - p.vida;
        var opac = restante < SUMICO ? Math.max(0, restante / SUMICO) : 1;

        p.el.style.opacity = opac.toFixed(2);
        p.el.style.filter  = "brightness(" + (.6 + .4 * face).toFixed(2) + ")";
        p.el.style.transform =
          "translate3d(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px,0)" +
          " rotateZ(" + p.rz.toFixed(0) + "deg)" +
          " rotateX(" + p.fx.toFixed(0) + "deg)" +
          " rotateY(" + p.fy.toFixed(0) + "deg)";

        vivas++;
      }

      if (vivas) {
        requestAnimationFrame(quadro);
      } else if (camada.parentNode) {
        // Acabada a festa as peças não têm mais função: saem do DOM em vez
        // de ficarem como 76 elementos invisíveis no meio do hero.
        camada.parentNode.removeChild(camada);
      }
    }

    requestAnimationFrame(quadro);
  }

  /* =======================================================================
     ENTRADA COM DESFOQUE

     O CSS deixa [data-reveal] em opacity:0 até a classe .is-revealed. O
     .is-settled, depois, tira o filtro de cena para não manter uma camada
     de composição viva em cada elemento revelado.
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
      els.forEach(function (el) { el.classList.add("is-revealed", "is-settled"); });
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
     FAQ

     Os <details> funcionam sozinhos; isto só fecha os outros quando um
     abre, para a lista não crescer sem parar.
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
     BOOT
     ======================================================================= */
  function boot() {
    initConfete();
    initDownload();
    initReveal();
    initFaq();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
