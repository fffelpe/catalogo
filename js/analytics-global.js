// analytics-global.js
// Registra buscas de forma global no Supabase e consulta rankings agregados.
// Sem configuracao, o modulo permanece inativo e o catalogo continua funcionando.

const AnalyticsGlobal = (() => {
  const CHAVE_SESSAO = "catalogoAnalyticsSessaoV1";
  const DURACAO_BUCKET_MS = 10 * 60 * 1000; // 10 minutos para deduplicacao

  function config() {
    return window.CATALOGO_ANALYTICS_CONFIG || {};
  }

  function estaConfigurado() {
    const c = config();
    return Boolean(
      c.enabled &&
      /^https:\/\/[a-z0-9.-]+$/i.test(String(c.supabaseUrl || "").replace(/\/$/, "")) &&
      String(c.supabasePublishableKey || "").trim().length > 20
    );
  }

  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function pareceMediaId(termo) {
    if (typeof MediaIdUtils !== "undefined" && MediaIdUtils.EXATO) {
      return MediaIdUtils.EXATO.test(String(termo || "").trim());
    }
    return /^\d{4}[A-Z]\d{5,6}$/i.test(String(termo || "").trim());
  }

  function obterSessaoLocal() {
    try {
      let valor = sessionStorage.getItem(CHAVE_SESSAO);
      if (valor) return valor;

      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      valor = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
      sessionStorage.setItem(CHAVE_SESSAO, valor);
      return valor;
    } catch (_) {
      return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }

  async function sha256(texto) {
    try {
      if (!crypto?.subtle) return btoa(unescape(encodeURIComponent(texto))).slice(0, 64);
      const bytes = new TextEncoder().encode(texto);
      const hash = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (_) {
      return btoa(unescape(encodeURIComponent(texto))).slice(0, 64);
    }
  }

  function abortControllerComTimeout() {
    const controller = new AbortController();
    const timeout = Number(config().requestTimeoutMs) || 5000;
    const timer = window.setTimeout(() => controller.abort(), timeout);
    return { controller, timer };
  }

  async function rpc(nome, payload = {}) {
    if (!estaConfigurado()) return null;

    const c = config();
    const base = String(c.supabaseUrl).replace(/\/$/, "");
    const chave = String(c.supabasePublishableKey).trim();
    const { controller, timer } = abortControllerComTimeout();

    try {
      const resposta = await fetch(`${base}/rest/v1/rpc/${encodeURIComponent(nome)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: chave,
          Authorization: `Bearer ${chave}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!resposta.ok) {
        const detalhe = await resposta.text().catch(() => "");
        throw new Error(`Analytics RPC ${nome}: HTTP ${resposta.status} ${detalhe}`.trim());
      }

      if (resposta.status === 204) return null;
      const texto = await resposta.text();
      return texto ? JSON.parse(texto) : null;
    } catch (erro) {
      if (erro?.name !== "AbortError") console.warn("Analytics global indisponivel:", erro);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async function registrarBusca(termo, programa = "", resultados = 0) {
    const texto = String(termo || "").trim();
    if (!estaConfigurado() || texto.length < 2 || pareceMediaId(texto)) return false;

    const termoNormalizado = normalizar(texto);
    if (!termoNormalizado) return false;

    const programaLimpo = String(programa || "").trim();
    const bucket = Math.floor(Date.now() / DURACAO_BUCKET_MS);
    const sessao = obterSessaoLocal();
    const token = await sha256(`${sessao}|${termoNormalizado}|${normalizar(programaLimpo)}|${bucket}`);

    const retorno = await rpc("registrar_busca_catalogo", {
      p_termo: texto.slice(0, 120),
      p_programa: programaLimpo.slice(0, 120) || null,
      p_resultados: Math.max(0, Math.min(Number(resultados) || 0, 1000000)),
      p_dedupe_token: token
    });

    return retorno !== null;
  }

  async function obterPopularesGerais(limite = 6, dias) {
    const dados = await rpc("catalogo_populares_geral", {
      p_dias: Number(dias) || Number(config().windowDays) || 30,
      p_limite: Math.max(1, Math.min(Number(limite) || 6, 20))
    });
    return Array.isArray(dados) ? dados : [];
  }

  async function obterPopularesPrograma(programa, limite = 5, dias) {
    const nome = String(programa || "").trim();
    if (!nome) return [];

    const dados = await rpc("catalogo_populares_programa", {
      p_programa: nome,
      p_dias: Number(dias) || Number(config().windowDays) || 30,
      p_limite: Math.max(1, Math.min(Number(limite) || 5, 20))
    });
    return Array.isArray(dados) ? dados : [];
  }

  async function obterBuscasSemResultado(limite = 20, dias) {
    const dados = await rpc("catalogo_buscas_sem_resultado", {
      p_dias: Number(dias) || Number(config().windowDays) || 30,
      p_limite: Math.max(1, Math.min(Number(limite) || 20, 100))
    });
    return Array.isArray(dados) ? dados : [];
  }

  async function obterProgramasMaisConsultados(limite = 20, dias) {
    const dados = await rpc("catalogo_programas_mais_consultados", {
      p_dias: Number(dias) || Number(config().windowDays) || 30,
      p_limite: Math.max(1, Math.min(Number(limite) || 20, 100))
    });
    return Array.isArray(dados) ? dados : [];
  }

  return {
    estaConfigurado,
    registrarBusca,
    obterPopularesGerais,
    obterPopularesPrograma,
    obterBuscasSemResultado,
    obterProgramasMaisConsultados
  };
})();
