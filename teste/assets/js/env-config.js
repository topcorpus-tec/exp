/* =========================================================================
   tpc32 — env-config.js

   O desenho original deste arquivo é ser um PLACEHOLDER: em produção ele
   seria SOBRESCRITO pelo build command de cada projeto Cloudflare Pages
   (somente branch main), a partir das variáveis SITE_KEY e GTM_ID do
   projeto — 1 deploy → 1 identidade → 1 container. Por isso o cabeçalho
   antigo dizia "NÃO colocar IDs reais aqui".

   Esse build command NÃO está configurado nos projetos exp-fb e exp-gg, e
   por isso nenhum container carregava (gtm-loader.js faz early return sem
   gtm_id). Com o ID fixado aqui, o GTM passa a carregar nos dois
   subdomínios — ambos com o MESMO container, que é o que foi pedido.

   Consequência a ter em mente: como o arquivo é um só no repo e serve os
   dois deploys, ele não consegue dar identidades diferentes por subdomínio.
   Ver o campo `key` abaixo.
   ========================================================================= */

/* key: vai no payload do lead como `landing_subdomain` (form-handler.js).
   Continua "dev" — para separar fb de gg aqui, é preciso o build command
   com SITE_KEY por projeto. */
window.SITE_CONFIG = { key: "dev", gtm_id: "GTM-P643DZLN", redirect: "" };
