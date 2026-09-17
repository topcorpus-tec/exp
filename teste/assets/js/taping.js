/* =========================================================================
   tap09 — taping.js
   Comportamentos da página de vendas do curso TopTaping (/taping/):
     - Contagem regressiva (topbar + card de bônus)
     - Modal de captura em 2 etapas (qualificação → formulário)
     - CTA fixo no mobile, revelado após o hero
     - Acordeão do FAQ com abertura exclusiva

   O envio do formulário NÃO acontece aqui: o <form data-ac-form> do modal é
   inicializado por form-handler.js, que valida, posta no Worker e redireciona
   usando window.SITE_CONFIG.redirect (definido no build de cada projeto).

   Carregar com defer no final do <body>, DEPOIS de form-handler.js.
   ========================================================================= */
(function () {
  "use strict";

  /* =======================================================================
     CONTAGEM REGRESSIVA

     Prazo da campanha: 15/09 às 23h59 (horário de Brasília) — prorrogado de
     11/09. Sendo data FIXA, o relógio não se renova: ao chegar em 15/09
     23h59 ele zera e fica zerado, e prorrogar de novo é trocar a data aqui.
     Trocar a data mexe no arquivo, então a marca ?v= das páginas que o
     carregam tem de subir junto, senão quem tem cache quente segue com o
     prazo velho por até 4h.

     DEADLINE vazio volta ao comportamento anterior (23h59 de hoje, renovando
     a cada virada de dia). Também dá para sobrescrever por elemento com o
     atributo data-deadline no [data-countdown].
     ======================================================================= */
  var DEADLINE = "2026-09-15T23:59:00-03:00";

  var BRT_OFFSET = -3 * 60 * 60 * 1000;   // Brasília = UTC-3, sem horário de verão

  /* =======================================================================
     DESTINO APÓS O CADASTRO (checkout)

     São dois, e quem manda é o botão que abriu o modal: os CTAs comuns levam
     ao checkout normal (Hotmart) e os [data-boleto] ao parcelado (Lia). O
     form-handler lê window.SITE_CONFIG.redirect na hora de enviar, então o
     initModal troca esse valor a cada abertura — inclusive de volta para o
     normal, senão quem clicasse no boleto, fechasse e clicasse no botão
     principal continuaria indo para o parcelado.

     O build command dos projetos Cloudflare Pages grava redirect:"" fixo
     (ver docs/deploy-3-fontes.md); estas constantes é que destravam a compra.
     Vazio nas duas volta ao comportamento de só capturar o lead.
     ======================================================================= */
  var CHECKOUT_URL        = "https://pay.hotmart.com/T95069591E?off=ys2cvshi";
  var CHECKOUT_URL_BOLETO = "https://pague.lia.com.br/topcorpus/oferta?offer_id=00a2a8c6-ec93-444a-b17e-cfd080c6bc56";

  // O que o env-config trouxe, para não perder o destino das outras fontes
  // caso as constantes acima voltem a ficar vazias.
  var REDIRECT_PADRAO = (window.SITE_CONFIG && window.SITE_CONFIG.redirect) || "";

  function aplicarCheckout(ehBoleto) {
    var url = ehBoleto
      ? (CHECKOUT_URL_BOLETO || CHECKOUT_URL || REDIRECT_PADRAO)
      : (CHECKOUT_URL || REDIRECT_PADRAO);
    window.SITE_CONFIG = window.SITE_CONFIG || {};
    window.SITE_CONFIG.redirect = url;
  }

  aplicarCheckout(false);

  /* A /formulario-taping/ é a mesma captura sem a página de vendas em volta:
     lá não há CTA clicado para dizer qual checkout usar, então a escolha vira
     um passo da própria página. Expor o aplicador é o que evita copiar as
     duas URLs para lá — elas continuam morando aqui, num lugar só. Quem
     consome é o formulario-taping.js; na /taping/ ninguém chama. */
  window.TAPING_CHECKOUT = { aplicar: aplicarCheckout };

  /* =======================================================================
     JANELAS AGENDADAS

     Dois grupos aparecem na pagina em horas marcadas, e os dois nascem com o
     atributo hidden no HTML:

       [data-boleto]  botoes de boleto parcelado — ja liberados, sem prazo
       [data-bonus2]  bloco "2 anos de acesso"   — 03/09 00h00 as 23h59

     Cada grupo tem duas datas. Abertura vazia quer dizer liberado agora; com
     data, reagenda. Fechamento vazio quer dizer que fica no ar sem prazo;
     com data, o bloco se recolhe sozinho na hora marcada. Fora da janela o
     elemento nao existe nem para o leitor de tela. Quem carrega a pagina
     depois da virada ja recebe o estado certo, e quem estiver com a aba
     aberta na hora tambem ve, porque agendamos um timer para o instante.

     Previa, so para revisao: ?boleto=1 e ?bonus=1 mostram na marra, e =0
     esconde. Nao muda nada para quem chega organico.
     ======================================================================= */
  var BOLETO_START = "";                              // liberado
  var BOLETO_END   = "";                              // sem prazo
  var BONUS2_START = "2026-09-03T00:00:00-03:00";     // quarta, 00h00 de Brasilia
  var BONUS2_END   = "2026-09-03T23:59:00-03:00";     // quarta, 23h59 de Brasilia

  function previaForcada(nome) {
    try {
      var q = new URLSearchParams(window.location.search).get(nome);
      if (q === "1" || q === "true")  return true;
      if (q === "0" || q === "false") return false;
    } catch (e) { /* navegador sem URLSearchParams: segue pela data */ }
    return null;
  }

  function agendarJanela(seletor, abertura, fechamento, previa) {
    var els = [].slice.call(document.querySelectorAll(seletor));
    if (!els.length) return;

    function aplicar(visivel) {
      els.forEach(function (e) { e.hidden = !visivel; });
    }

    var forcado = previaForcada(previa);
    if (forcado !== null) { aplicar(forcado); return; }

    // Data em branco ou escrita errada nao pode derrubar a oferta: abertura
    // sem data vale como "ja aberto", fechamento sem data como "sem prazo".
    var abre  = abertura   ? Date.parse(abertura)   : NaN;
    var fecha = fechamento ? Date.parse(fechamento) : NaN;
    if (isNaN(abre))  abre  = -Infinity;
    if (isNaN(fecha)) fecha = Infinity;

    var timer = null;

    // Uma funcao so decide tudo: dentro da janela mostra, fora esconde, e
    // reagenda para a proxima virada — o fechamento se esta no ar, a
    // abertura se ainda nao chegou, nada se a janela ja passou. Chamada na
    // carga, quando o timer estoura e sempre que a aba volta.
    function conferir() {
      var agora = Date.now();
      var dentro = agora >= abre && agora < fecha;
      aplicar(dentro);

      if (timer) { window.clearTimeout(timer); timer = null; }

      var proxima = dentro ? fecha : (agora < abre ? abre : Infinity);
      if (proxima === Infinity) return;               // acabou: nada a reagendar
      // setTimeout satura acima de ~24,8 dias (limite de 32 bits): acima disso
      // agenda o maximo e reavalia quando aquele prazo vencer.
      timer = window.setTimeout(conferir, Math.min(proxima - agora, 2147483000));
    }

    conferir();

    // O navegador congela os timers de aba em segundo plano — no celular, uma
    // aba esquecida pode acordar minutos depois da hora. Reconferir na volta
    // ao primeiro plano fecha esse buraco. O pageshow cobre o botao Voltar,
    // que restaura a pagina do cache sem reexecutar o script.
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) conferir();
    });
    window.addEventListener("pageshow", conferir);
    window.addEventListener("focus", conferir);
  }

  function initAgendados() {
    agendarJanela("[data-boleto]", BOLETO_START, BOLETO_END, "boleto");
    agendarJanela("[data-bonus2]", BONUS2_START, BONUS2_END, "bonus");
  }

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

    function render(c, ms) {
      var total = Math.max(0, Math.floor(ms / 1000));
      var d = Math.floor(total / 86400);
      var h = Math.floor((total % 86400) / 3600);
      var m = Math.floor((total % 3600) / 60);
      var s = total % 60;
      if (c.out.days)    c.out.days.textContent    = pad(d);
      if (c.out.hours)   c.out.hours.textContent   = pad(h);
      if (c.out.minutes) c.out.minutes.textContent = pad(m);
      if (c.out.seconds) c.out.seconds.textContent = pad(s);
    }

    function tick() {
      var now = Date.now();
      clocks.forEach(function (c) {
        var left = c.target - now;
        // Prazo diário: ao zerar, renova para as 23h59 do dia seguinte.
        if (left <= 0 && !c.fixed) {
          c.target = endOfDayBrasilia();
          left = c.target - now;
        }
        render(c, left);
      });
    }

    tick();
    setInterval(tick, 1000);
  }

  /* =======================================================================
     MODAL DE CAPTURA — duas etapas no mesmo painel

     Na página original são dois popups encadeados: o de qualificação
     ("Você é massoterapeura?", SIM/NÃO) e o de dados ("Ótimo, mulher!…").
     Aqui as duas telas moram no mesmo painel e a troca é instantânea.

     Etapa 1: a resposta vai para o AC no campo `phase` do payload
     (o form-handler lê form.dataset.phase).
     Etapa 2: primeiro nome / e-mail / whatsapp.

     A trilha do topo (1 Perfil · 2 Seus dados) e o rótulo acessível do
     diálogo acompanham a etapa visível. O caminho é só de ida: quem quiser
     rever a pergunta fecha e reabre o modal.

     A etapa de qualificação está DESLIGADA (QUIZ_ATIVO abaixo): o modal abre
     direto no formulário. A marcação da pergunta continua no HTML — voltar a
     flag para true devolve as duas etapas, sem mais nenhuma alteração.
     ======================================================================= */

  /* Etapa 1 (SIM/NÃO) ligada ou desligada. Desligada a pedido do cliente em
     26/08/2026. Com ela em false todo lead vai para o AC com phase="lead",
     que é o padrão já declarado no data-phase do <form>; ligada, a resposta
     sobrescreve com lead-massoterapeuta ou lead-outros. */
  var QUIZ_ATIVO = false;

  function initModal() {
    var modal = document.getElementById("tp-modal");
    if (!modal) return;

    var panel      = modal.querySelector(".tp-modal__panel");
    var stepQuiz   = modal.querySelector('[data-step="quiz"]');
    var stepForm   = modal.querySelector('[data-step="form"]');
    var form       = modal.querySelector("form");
    var firstInput = modal.querySelector("#tp-field-name");
    var progress   = [].slice.call(modal.querySelectorAll("[data-modal-progress] li"));
    var lastFocus  = null;

    var STEPS = ["quiz", "form"];

    // Com uma etapa só, a trilha "1 Perfil · 2 Seus dados" não descreve nada.
    if (!QUIZ_ATIVO) {
      var track = modal.querySelector("[data-modal-progress]");
      if (track) track.hidden = true;
    }

    var SELECTOR_FOCUSABLE =
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

    function showStep(name) {
      var index = STEPS.indexOf(name);
      if (index < 0) index = 0;

      if (stepQuiz) stepQuiz.hidden = name !== "quiz";
      if (stepForm) stepForm.hidden = name !== "form";

      // Reinicia a animação de entrada da etapa que passa a aparecer —
      // sem isso ela só rodaria na primeira vez que o modal abre.
      var visible = name === "form" ? stepForm : stepQuiz;
      if (visible) {
        visible.style.animation = "none";
        void visible.offsetWidth;          // força o reflow antes de devolver
        visible.style.animation = "";
      }

      progress.forEach(function (li, i) {
        li.classList.toggle("is-active", i === index);
        li.classList.toggle("is-done", i < index);
      });

      // aria-labelledby precisa apontar para um título que esteja visível.
      modal.setAttribute("aria-labelledby",
        name === "form" ? "tp-modal-title-form" : "tp-modal-title");
    }

    function open(trigger) {
      // Olha so o botao clicado, nunca o bloco em volta: dentro do card do
      // segundo bonus convivem um CTA normal e um de boleto, e cada um tem
      // de manter o seu destino.
      aplicarCheckout(!!(trigger && trigger.hasAttribute && trigger.hasAttribute("data-boleto")));

      lastFocus = trigger || document.activeElement;
      modal.classList.add("is-open");
      modal.removeAttribute("aria-hidden");
      document.body.style.overflow = "hidden";
      showStep(QUIZ_ATIVO ? "quiz" : "form");
      var target = QUIZ_ATIVO ? modal.querySelector(".tp-quiz__btn") : firstInput;
      if (target) target.focus();
    }

    function close() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }

    // Abertura por qualquer CTA marcado
    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-open-modal]");
      if (!trigger) return;
      e.preventDefault();
      open(trigger);
    });

    // Fechamento: botão, clique no fundo, Esc
    modal.addEventListener("click", function (e) {
      if (e.target.closest("[data-close-modal]") || e.target === modal) close();
    });
    document.addEventListener("keydown", function (e) {
      if (!modal.classList.contains("is-open")) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab" || !panel) return;

      // Laço de foco dentro do painel
      var items = [].slice.call(panel.querySelectorAll(SELECTOR_FOCUSABLE))
        .filter(function (el) { return el.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0];
      var last  = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });

    // Etapa 1 → etapa 2, guardando a resposta em data-phase
    modal.querySelectorAll("[data-quiz]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (form) form.dataset.phase = btn.getAttribute("data-quiz");
        showStep("form");
        if (firstInput) firstInput.focus();
      });
    });
  }

  /* =======================================================================
     CTA FIXO NO MOBILE — aparece depois que o hero sai da tela
     ======================================================================= */
  function initStickyCta() {
    var bar  = document.querySelector(".tp-sticky");
    var hero = document.querySelector(".tp-hero");
    if (!bar || !hero || !("IntersectionObserver" in window)) return;

    var io = new IntersectionObserver(function (entries) {
      bar.classList.toggle("is-visible", !entries[0].isIntersecting);
    }, { rootMargin: "-120px 0px 0px 0px" });
    io.observe(hero);
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
     ENTRADA COM DESFOQUE — limpeza pós-animação

     Quem adiciona .is-revealed é o IntersectionObserver do form-handler.js.
     Aqui só marcamos .is-settled quando a transição do filtro termina, para o
     CSS poder trocar blur(0) por none e dispensar a camada de composição que
     cada um dos elementos revelados manteria viva até o fim da sessão.
     ======================================================================= */
  // 760ms de transição + até 180ms de atraso do escalonamento + folga.
  var SETTLE_MS = 1100;

  function initRevealCleanup() {
    var els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;

    function settleLater(el) {
      if (el.__settle) return;
      el.__settle = setTimeout(function () { el.classList.add("is-settled"); }, SETTLE_MS);
    }

    // transitionend seria o gatilho natural, mas não dispara quando a transição
    // é interrompida, quando o elemento não chega a ser pintado ou quando o
    // sistema pede movimento reduzido — e aí o filtro ficaria para sempre.
    // Observar a classe cobre todos esses casos.
    if (!("MutationObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-settled"); });
      return;
    }

    var mo = new MutationObserver(function (records) {
      records.forEach(function (r) {
        var el = r.target;
        if (el.classList.contains("is-revealed")) settleLater(el);
      });
    });

    els.forEach(function (el) {
      mo.observe(el, { attributes: true, attributeFilter: ["class"] });
      if (el.classList.contains("is-revealed")) settleLater(el);  // revelado antes daqui
    });
  }

  /* =======================================================================
     SCROLL SUAVE (inércia leve)

     Interpola a posição da rolagem em vez de saltar direto para ela. Usa
     window.scrollTo, e não transform no conteúdo: a posição real de rolagem
     continua sendo a do navegador, então position:sticky (topbar), o
     IntersectionObserver dos reveals e o CTA fixo seguem funcionando.

     Fica DESLIGADO em touch (o momentum nativo do celular já é melhor) e sob
     prefers-reduced-motion. Para voltar ao scroll nativo no desktop, basta
     trocar SMOOTH_SCROLL para false.
     ======================================================================= */
  var SMOOTH_SCROLL = true;
  var SMOOTH_EASE   = 0.16;   // 0–1: quanto maior, mais curto o deslize

  function initSmoothScroll() {
    if (!SMOOTH_SCROLL) return;
    if (!window.matchMedia) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // A suavidade passa a ser nossa; a nativa do CSS brigaria com cada
    // window.scrollTo do laço, deixando a rolagem elástica e lenta.
    document.documentElement.style.scrollBehavior = "auto";

    var target  = window.scrollY;
    var current = target;
    var raf     = 0;

    function maxScroll() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }

    function step() {
      // Se a posição real divergiu do que escrevemos no frame anterior, quem
      // mexeu foi outra coisa (barra de rolagem, teclado, âncora, ou o próprio
      // navegador travando no fim da página). Devolve o controle em vez de
      // puxar a página de volta.
      if (Math.abs(window.scrollY - current) > 8) {
        current = target = window.scrollY;
        raf = 0;
        return;
      }

      var delta = target - current;
      if (Math.abs(delta) < 0.5) {
        current = target;
        window.scrollTo(0, current);
        raf = 0;
        return;
      }
      current += delta * SMOOTH_EASE;
      window.scrollTo(0, current);
      raf = requestAnimationFrame(step);
    }

    // Não sequestra a roda dentro de algo que o usuário rola sozinho — o
    // trilho de depoimentos e o painel do modal, por exemplo.
    // O teste de overflow é obrigatório nos DOIS eixos: sem ele, qualquer
    // elemento com overflow:hidden e conteúdo largo entra aqui por engano.
    // Era o caso da faixa corrida (trilho de ~5500px dentro da viewport) e,
    // ao passar o cursor por ela, a rolagem trocava de suave para nativa.
    function hasOwnScroll(node) {
      while (node && node !== document.body && node.nodeType === 1) {
        var cs = getComputedStyle(node);
        if (node.scrollWidth  > node.clientWidth  + 2 && /auto|scroll/.test(cs.overflowX)) return true;
        if (node.scrollHeight > node.clientHeight + 2 && /auto|scroll/.test(cs.overflowY)) return true;
        node = node.parentElement;
      }
      return false;
    }

    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey || e.metaKey) return;                        // zoom do navegador
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;       // gesto horizontal
      if (document.body.style.overflow === "hidden") return;     // modal aberto
      if (hasOwnScroll(e.target)) return;

      e.preventDefault();

      var px = e.deltaY;
      if (e.deltaMode === 1) px *= 16;                           // linhas
      else if (e.deltaMode === 2) px *= window.innerHeight;      // páginas

      // Parado: reassume dos DOIS lados. Sincronizar só o `current` deixava o
      // `target` velho — quem arrastasse a barra e girasse a roda antes do
      // evento scroll chegar via a página saltar de volta para a posição antiga.
      if (!raf) current = target = window.scrollY;

      target = Math.min(Math.max(0, target + px), maxScroll());

      // Trava o quanto o alvo pode correr à frente. O momentum do trackpad
      // despeja dezenas de eventos de uma vez; sem isso o alvo acumula muito
      // além da tela e a página segue deslizando sozinha depois que o dedo
      // parou, dando a sensação de rolagem solta.
      var ahead = window.innerHeight * 1.2;
      if (target - current >  ahead) target = current + ahead;
      if (current - target >  ahead) target = current - ahead;

      if (!raf) raf = requestAnimationFrame(step);
    }, { passive: false });

    // Rolagem vinda de outro lugar (teclado, barra, âncora) reassume o controle.
    window.addEventListener("scroll", function () {
      if (!raf) { target = current = window.scrollY; }
    }, { passive: true });

    window.addEventListener("resize", function () {
      target = current = window.scrollY;
    }, { passive: true });
  }

  /* ---- Boot ---- */
  initAgendados();       // primeiro: nenhum outro modulo pode atrasa-lo
  initCountdowns();
  initModal();
  initStickyCta();
  initFaq();
  initRevealCleanup();
  initSmoothScroll();
})();
