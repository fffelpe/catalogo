// analytics-config.js
// Configuração pública do analytics global do Catálogo de Mídias.
// A publishable key pode ficar no navegador; a segurança real está nos grants/RLS do banco.
window.CATALOGO_ANALYTICS_CONFIG = Object.freeze({
  enabled: true,
  supabaseUrl: "https://ckusrqrktummrxtayrcd.supabase.co",
  supabasePublishableKey: "sb_publishable_lXYd0ZJFgd6kSlMHzMm49g_vX3Cgllf",
  windowDays: 30,
  requestTimeoutMs: 5000
});
