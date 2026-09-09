// analytics-config.js
// Configure estes dois valores depois de criar o projeto no Supabase.
// A chave publishable/anon pode ser usada no navegador desde que as permissoes
// do banco estejam protegidas conforme supabase/analytics.sql.
window.CATALOGO_ANALYTICS_CONFIG = Object.freeze({
  enabled: false,
  supabaseUrl: "",
  supabasePublishableKey: "",
  windowDays: 30,
  requestTimeoutMs: 5000
});
