// media-player.js - Constrói e controla a pré-visualização lowres da ficha.

const MediaPlayer = (() => {
  const BASE_URL = "http://lowres.tvcultura.com.br/";

  function criarUrl(mediaId) {
    if (typeof MediaIdUtils === "undefined") return "";
    const id = MediaIdUtils.normalizar(mediaId);
    return id ? `${BASE_URL}${id}.mp4` : "";
  }

  function normalizarInicio(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 ? numero : 0;
  }

  function aplicarInicio(video, inicio) {
    if (!video) return;
    const segundos = normalizarInicio(inicio);
    if (segundos <= 0) return;

    const aplicar = () => {
      try {
        video.currentTime = segundos;
      } catch (erro) {
        console.warn("Não foi possível posicionar o player no timecode solicitado:", erro);
      }
    };

    if (Number(video.readyState) >= 1) aplicar();
    else if (typeof video.addEventListener === "function") {
      video.addEventListener("loadedmetadata", aplicar, { once: true });
    }
  }

  function vincularErro(video, statusElement) {
    if (!video || typeof video.addEventListener !== "function") return;
    video.addEventListener("error", () => {
      if (!statusElement) return;
      statusElement.hidden = false;
      statusElement.textContent = "Pré-visualização indisponível para este Media ID.";
      statusElement.classList?.add("media-player-status--erro");
    });
  }

  function configurar(video, mediaId, inicio = 0, statusElement = null) {
    const url = criarUrl(mediaId);
    if (!video || !url) return false;

    video.src = url;
    video.preload = "metadata";
    aplicarInicio(video, inicio);
    vincularErro(video, statusElement);
    return true;
  }

  return {
    criarUrl,
    normalizarInicio,
    aplicarInicio,
    vincularErro,
    configurar
  };
})();
