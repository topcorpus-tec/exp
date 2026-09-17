/* =========================================================================
   tpc32 — intl-phone-init.js
   Inicializa o seletor de país (DDI) com bandeira no campo de telefone dos
   formulários marcados com data-intl-phone, usando a biblioteca
   intl-tel-input (self-hosted em assets/vendor/intl-tel-input).

   - Brasil como país padrão; principais no topo da lista (countryOrder).
   - Máscara que se adapta ao país enquanto digita (formatAsYouType).
   - A instância é guardada em input.__iti; o form-handler.js lê dela para
     validar (isValidNumber) e gravar o número em formato E.164 (getNumber).
   - Não altera nenhum redirect: apenas o campo de telefone.

   Carregar com defer, DEPOIS de intlTelInputWithUtils.min.js e ANTES (ou em
   qualquer ordem) do form-handler.js — o form-handler só lê input.__iti no
   submit, quando o init já rodou.
   ========================================================================= */
(function () {
  "use strict";

  // Brasil (padrão) + países principais no topo, nesta ordem.
  var COUNTRY_ORDER = ["br", "pt", "us", "it", "es", "jp", "fr", "gb", "ca", "be", "mx", "ch", "au", "de", "ie"];

  // Nomes em português dos países em destaque (os demais ficam em inglês).
  var COUNTRY_NAMES = {
    br: "Brasil", pt: "Portugal", us: "Estados Unidos", it: "Itália",
    es: "Espanha", jp: "Japão", fr: "França", gb: "Reino Unido",
    ca: "Canadá", be: "Bélgica", mx: "México", ch: "Suíça",
    au: "Austrália", de: "Alemanha", ie: "Irlanda"
  };

  function initForm(form) {
    if (!window.intlTelInput || typeof window.intlTelInput !== "function") return;
    var input = form.querySelector('input[name="phone"]');
    if (!input || input.__iti) return;   // sem campo, ou já inicializado
    var iti = window.intlTelInput(input, {
      initialCountry: "br",
      countryOrder: COUNTRY_ORDER,
      separateDialCode: true,          // mostra +DDI ao lado da bandeira
      formatAsYouType: true,           // máscara que se adapta ao país
      strictMode: true,                // impede dígitos/caracteres fora do formato
      countrySearch: true,             // campo de busca no dropdown
      dropdownParent: document.body,   // dropdown no <body>: fica acima das seções seguintes
      uiTranslations: {
        searchPlaceholder: "Procurar país",
        noCountrySelected: "Selecione o país",
        searchEmptyState: "Nenhum país encontrado",
        countryNames: COUNTRY_NAMES
      }
    });
    // Exposto para o form-handler (validação + número em formato E.164).
    input.__iti = iti;
  }

  function init() {
    var forms = document.querySelectorAll("form[data-intl-phone]");
    for (var i = 0; i < forms.length; i++) initForm(forms[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
