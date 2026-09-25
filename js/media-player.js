// media-player.js
// Constrói a URL lowres somente a partir de Media ID validado e controla seek inicial.

const MediaPlayer = (() => {
  const BASE_URL = "http://lowres.tvcultura.com.br/";
  const PROXY_GLOBAL = "CATALOGO_VIDEO_PROXY_BASE_URL";

  function contextoSeguro() {
    return typeof window !== "undefined" && window.location?.protocol === "https:";
  }

  function normalizarProxyHttps(valorBruto) {
    const valor = String(valorBruto || "").trim();
    if (!valor || !/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(valor)) return "";

    if (typeof URL !== "undefined") {
      try {
        const base = new URL(valor);
        if (base.protocol !== "https:") return "";
        return base.href.endsWith("/") ? base.href : `${base.href}/`;
      } catch {
        return "";
      }
    }

    return valor.endsWith("/") ? valor : `${valor}/`;
  }

  function obterProxyBaseUrl() {
    const valor = typeof globalThis !== "undefined"
      ? globalThis[PROXY_GLOBAL]
      : "";
    return normalizarProxyHttps(valor);
  }

  function criarUrl(mediaId) {
    if (typeof MediaIdUtils === "undefined" || typeof MediaIdUtils.normalizar !== "function") return "";
    const id = MediaIdUtils.normalizar(mediaId);
    if (!id) return "";

    const proxy = obterProxyBaseUrl();
    if (proxy) return `${proxy}${id}.mp4`;
    if (contextoSeguro()) return "";
    return `${BASE_URL}${id}.mp4`;
  }

  function normalizarInicio(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 ? numero : 0;
  }

  function aplicarInicio(video, valor) {
    if (!video) return;
    const inicio = normalizarInicio(valor);
    if (inicio <= 0) return;

    const aplicar = () => {
      try {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          video.currentTime = Math.min(inicio, Math.max(0, video.duration - 0.1));
        } else {
          video.currentTime = inicio;
        }
      } catch (erro) {
        console.warn("Não foi possível aplicar o timecode inicial:", erro);
      }
    };

    if (video.readyState >= 1) aplicar();
    else video.addEventListener("loadedmetadata", aplicar, { once: true });
  }

  function montar(video, mediaId, inicio = 0, opcoes = {}) {
    const url = criarUrl(mediaId);
    if (!video || !url) return false;

    video.src = url;
    video.preload = "metadata";
    video.controls = true;
    aplicarInicio(video, inicio);

    if (typeof opcoes.onError === "function") {
      video.addEventListener("error", opcoes.onError, { once: true });
    }
    return true;
  }

  function irPara(video, segundos) {
    if (!video) return false;
    const inicio = normalizarInicio(segundos);
    try {
      video.currentTime = inicio;
      if (typeof video.play === "function") {
        const retorno = video.play();
        if (retorno && typeof retorno.catch === "function") retorno.catch(() => {});
      }
      return true;
    } catch (erro) {
      console.warn("Não foi possível navegar para o trecho:", erro);
      return false;
    }
  }

  return {
    BASE_URL,
    PROXY_GLOBAL,
    contextoSeguro,
    normalizarProxyHttps,
    obterProxyBaseUrl,
    criarUrl,
    normalizarInicio,
    aplicarInicio,
    montar,
    irPara
  };
})();
